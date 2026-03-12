"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Board } from "@/types/app.types";

const createBoardSchema = z.object({
  title: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const updateBoardSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function createBoard(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = createBoardSchema.safeParse({
    title: formData.get("title"),
    color: formData.get("color") ?? "#0ea5e9",
  });
  if (!parsed.success) return { error: "Invalid input" };

  // Get current max order using *
  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", user.id)
    .order("order", { ascending: false })
    .limit(1);
  const rows = boards as Board[] | null;
  const nextOrder = (rows?.[0]?.order ?? -1) + 1;

  const { data, error } = await supabase
    .from("boards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      color: parsed.data.color,
      order: nextOrder,
    } as any)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/boards", "layout");
  return { data: data as unknown as Board };
}

export async function updateBoard(input: {
  id: string;
  title?: string;
  color?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = updateBoardSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { id, ...updates } = parsed.data;
  const { data, error } = await supabase
    .from("boards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/boards", "layout");
  return { data: data as unknown as Board };
}

export async function updateBoardBackground(
  id: string,
  background: string | null
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("boards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ background_image: background } as any)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function copyBoard(
  boardId: string
): Promise<{ data?: { id: string }; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch source board
  const { data: srcBoard } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .eq("user_id", user.id)
    .single();
  if (!srcBoard) return { error: "Board not found" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = srcBoard as any;

  // Get next order
  const { data: allBoards } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", user.id)
    .order("order", { ascending: false })
    .limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextOrder = ((allBoards as any[])?.[0]?.order ?? -1) + 1;

  // Create new board
  const { data: newBoard, error: boardErr } = await supabase
    .from("boards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      user_id: user.id,
      title: `${b.title}（コピー）`,
      color: b.color,
      background_image: b.background_image,
      order: nextOrder,
    } as any)
    .select()
    .single();
  if (boardErr || !newBoard) return { error: boardErr?.message ?? "Failed" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newBoardId = (newBoard as any).id;

  // Copy labels → build old-id → new-id map
  const { data: labels } = await supabase.from("labels").select("*").eq("board_id", boardId);
  const labelIdMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const label of (labels ?? []) as any[]) {
    const { data: nl } = await supabase
      .from("labels")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ board_id: newBoardId, name: label.name, color: label.color } as any)
      .select()
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (nl) labelIdMap[label.id] = (nl as any).id;
  }

  // Copy members → build old-id → new-id map
  const { data: members } = await supabase.from("members").select("*").eq("board_id", boardId);
  const memberIdMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const member of (members ?? []) as any[]) {
    const { data: nm } = await supabase
      .from("members")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ board_id: newBoardId, name: member.name, color: member.color } as any)
      .select()
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (nm) memberIdMap[member.id] = (nm as any).id;
  }

  // Fetch lists with cards
  const { data: lists } = await supabase
    .from("lists")
    .select(`*, cards (*, card_labels (label_id), card_members (member_id), checklists (id, title, checklist_items (text, is_done, due_date, order)))`)
    .eq("board_id", boardId)
    .order("order", { ascending: true })
    .order("order", { ascending: true, foreignTable: "cards" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const list of (lists ?? []) as any[]) {
    const { data: newList } = await supabase
      .from("lists")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ board_id: newBoardId, title: list.title, color: list.color, order: list.order } as any)
      .select()
      .single();
    if (!newList) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newListId = (newList as any).id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const card of (list.cards ?? []) as any[]) {
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
      const newCardId = (newCard as any).id;

      // Card labels
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const labelInserts = (card.card_labels ?? []).filter((cl: any) => labelIdMap[cl.label_id])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((cl: any) => ({ card_id: newCardId, label_id: labelIdMap[cl.label_id] }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (labelInserts.length) await supabase.from("card_labels").insert(labelInserts as any);

      // Card members
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberInserts = (card.card_members ?? []).filter((cm: any) => memberIdMap[cm.member_id])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            checklist_id: (newCl as any).id,
            text: item.text,
            is_done: false,
            due_date: item.due_date,
            order: item.order,
          })) as any
        );
      }
    }
  }

  revalidatePath("/boards", "layout");
  return { data: { id: newBoardId } };
}

export async function reorderBoards(orderedIds: string[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("boards")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ order: i } as any)
      .eq("id", orderedIds[i])
      .eq("user_id", user.id);
  }

  revalidatePath("/boards", "layout");
  return { success: true };
}

export async function deleteBoard(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("boards").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/boards", "layout");
  return { success: true };
}
