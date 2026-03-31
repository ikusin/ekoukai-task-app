"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { List } from "@/types/app.types";

const createListSchema = z.object({
  boardId: z.string().uuid(),
  title: z.string().min(1).max(100),
});

const updateListSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
});

export async function createList(input: { boardId: string; title: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = createListSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { data: lists } = await supabase
    .from("lists")
    .select("*")
    .eq("board_id", parsed.data.boardId)
    .order("order", { ascending: false })
    .limit(1);
  const rows = lists as List[] | null;
  const nextOrder = (rows?.[0]?.order ?? -1) + 1;

  const { data, error } = await supabase
    .from("lists")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      board_id: parsed.data.boardId,
      title: parsed.data.title,
      order: nextOrder,
    } as any)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/boards/${parsed.data.boardId}`);
  return { data: data as unknown as List };
}

export async function updateList(input: {
  id: string;
  title?: string;
  color?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = updateListSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const updateData: { title?: string; color?: string } = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color;

  const { data, error } = await supabase
    .from("lists")
    .update(updateData)
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/boards", "layout");
  return { data: data as unknown as List };
}

export async function reorderLists(listIds: string[], boardId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await Promise.all(
    listIds.map((id, index) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("lists").update({ order: index } as any).eq("id", id)
    )
  );

  revalidatePath(`/boards/${boardId}`);
  return { success: true };
}

export async function copyListToBoard(
  listId: string,
  targetBoardId: string
): Promise<{ data?: { id: string }; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch source list with all cards and nested data
  const { data: srcList } = await supabase
    .from("lists")
    .select(
      `*, cards (*, card_labels (label_id), card_members (member_id), checklists (id, title, checklist_items (text, is_done, due_date, order)))`
    )
    .eq("id", listId)
    .order("order", { ascending: true, foreignTable: "cards" })
    .single();
  if (!srcList) return { error: "List not found" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const src = srcList as any;

  // Get source board's labels and members
  const srcBoardId = src.board_id as string;
  const { data: srcLabels } = await supabase.from("labels").select("*").eq("board_id", srcBoardId);
  const { data: srcMembers } = await supabase.from("members").select("*").eq("board_id", srcBoardId);

  // Get target board's existing labels and members
  const { data: targetLabels } = await supabase.from("labels").select("*").eq("board_id", targetBoardId);
  const { data: targetMembers } = await supabase.from("members").select("*").eq("board_id", targetBoardId);

  // Build label mapping: reuse existing by name, or create new
  const labelIdMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sl of (srcLabels ?? []) as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = (targetLabels ?? []).find((tl: any) => tl.name === sl.name);
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      labelIdMap[sl.id] = (existing as any).id;
    } else {
      const { data: nl } = await supabase
        .from("labels")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ board_id: targetBoardId, name: sl.name, color: sl.color } as any)
        .select()
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (nl) labelIdMap[sl.id] = (nl as any).id;
    }
  }

  // Build member mapping: reuse existing by name, or create new
  const memberIdMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sm of (srcMembers ?? []) as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = (targetMembers ?? []).find((tm: any) => tm.name === sm.name);
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberIdMap[sm.id] = (existing as any).id;
    } else {
      const { data: nm } = await supabase
        .from("members")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ board_id: targetBoardId, name: sm.name, color: sm.color } as any)
        .select()
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (nm) memberIdMap[sm.id] = (nm as any).id;
    }
  }

  // Get next list order in target board
  const { data: targetLists } = await supabase
    .from("lists")
    .select("*")
    .eq("board_id", targetBoardId)
    .order("order", { ascending: false })
    .limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextListOrder = ((targetLists as any[])?.[0]?.order ?? -1) + 1;

  // Create new list
  const { data: newList, error: listErr } = await supabase
    .from("lists")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ board_id: targetBoardId, title: src.title, color: src.color, order: nextListOrder } as any)
    .select()
    .single();
  if (listErr || !newList) return { error: listErr?.message ?? "Failed to create list" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newListId = (newList as any).id as string;

  // Copy cards with all relationships
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const card of (src.cards ?? []) as any[]) {
    const { data: newCard } = await supabase
      .from("cards")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        list_id: newListId,
        title: card.title,
        description: card.description,
        due_date: card.due_date,
        start_date: card.start_date,
        show_in_calendar: card.show_in_calendar,
        order: card.order,
      } as any)
      .select()
      .single();
    if (!newCard) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newCardId = (newCard as any).id as string;

    // Card labels
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labelInserts = (card.card_labels ?? [])
      .filter((cl: any) => labelIdMap[cl.label_id])
      .map((cl: any) => ({ card_id: newCardId, label_id: labelIdMap[cl.label_id] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (labelInserts.length) await supabase.from("card_labels").insert(labelInserts as any);

    // Card members
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberInserts = (card.card_members ?? [])
      .filter((cm: any) => memberIdMap[cm.member_id])
      .map((cm: any) => ({ card_id: newCardId, member_id: memberIdMap[cm.member_id] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (memberInserts.length) await supabase.from("card_members").insert(memberInserts as any);

    // Checklists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const cl of (card.checklists ?? []) as any[]) {
      const { data: newCl } = await supabase
        .from("checklists")
        .insert({ card_id: newCardId, title: cl.title })
        .select()
        .single();
      if (!newCl || !cl.checklist_items?.length) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("checklist_items").insert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cl.checklist_items.map((item: any) => ({
          checklist_id: (newCl as any).id,
          text: item.text,
          is_done: false,
          due_date: item.due_date,
          order: item.order,
        })) as any
      );
    }
  }

  revalidatePath("/boards", "layout");
  return { data: { id: newListId } };
}

export async function deleteList(id: string, boardId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/boards/${boardId}`);
  return { success: true };
}
