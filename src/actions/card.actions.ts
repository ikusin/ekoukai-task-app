"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Card } from "@/types/app.types";

const createCardSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1).max(200),
});

const updateCardSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  show_in_calendar: z.boolean().optional(),
});

export async function createCard(input: { listId: string; title: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = createCardSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("list_id", parsed.data.listId)
    .order("order", { ascending: false })
    .limit(1);
  const rows = cards as Card[] | null;
  const nextOrder = (rows?.[0]?.order ?? -1) + 1;

  const { data, error } = await supabase
    .from("cards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      list_id: parsed.data.listId,
      title: parsed.data.title,
      order: nextOrder,
    } as any)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/boards", "layout");
  return { data: data as unknown as Card };
}

export async function updateCard(input: {
  id: string;
  title?: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  show_in_calendar?: boolean;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { id, ...updates } = parsed.data;
  const { data, error } = await supabase
    .from("cards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/boards", "layout");
  return { data: data as unknown as Card };
}

export async function deleteCard(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/boards", "layout");
  return { success: true };
}

export async function duplicateCard(
  cardId: string,
  options: {
    description: boolean;
    dates: boolean;
    members: boolean;
    labels: boolean;
    checklists: boolean;
    comments: boolean;
  },
  targetListId?: string
): Promise<{ data?: Card; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch original card with all related data
  const { data: original } = await supabase
    .from("cards")
    .select(
      `*, card_labels ( label_id ), card_members ( member_id ),
       checklists ( id, title, checklist_items ( text, is_done, due_date, order ) )`
    )
    .eq("id", cardId)
    .single();
  if (!original) return { error: "Card not found" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orig = original as any;

  // Get next order in the target list (defaults to same list)
  const destListId = targetListId ?? orig.list_id;
  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("list_id", destListId)
    .order("order", { ascending: false })
    .limit(1);
  const rows = cards as Card[] | null;
  const nextOrder = (rows?.[0]?.order ?? -1) + 1;

  // Create duplicated card
  const { data: newCard, error } = await supabase
    .from("cards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      list_id: destListId,
      title: `${orig.title}（コピー）`,
      order: nextOrder,
      description: options.description ? orig.description : null,
      start_date: options.dates ? orig.start_date : null,
      due_date: options.dates ? orig.due_date : null,
      show_in_calendar: options.dates ? orig.show_in_calendar : true,
    } as any)
    .select()
    .single();
  if (error || !newCard) return { error: error?.message ?? "Failed to create card" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newCardId = (newCard as any).id;

  // Copy labels
  if (options.labels && orig.card_labels?.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("card_labels").insert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orig.card_labels.map((cl: any) => ({ card_id: newCardId, label_id: cl.label_id })) as any
    );
  }

  // Copy members
  if (options.members && orig.card_members?.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("card_members").insert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orig.card_members.map((cm: any) => ({ card_id: newCardId, member_id: cm.member_id })) as any
    );
  }

  // Copy checklists
  if (options.checklists && orig.checklists?.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const cl of orig.checklists as any[]) {
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

  // Copy comments
  if (options.comments) {
    const { data: origComments } = await supabase
      .from("card_comments")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });
    if (origComments?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("card_comments").insert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (origComments as any[]).map((c) => ({
          card_id: newCardId,
          user_id: user.id,
          text: c.text,
        })) as any
      );
    }
  }

  revalidatePath("/boards", "layout");
  return { data: newCard as unknown as Card };
}

export async function moveCard(
  cardId: string,
  newListId: string,
  newOrder: number
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("move_card", {
    p_card_id: cardId,
    p_new_list_id: newListId,
    p_new_order: newOrder,
  });

  if (error) return { error: (error as { message: string }).message };

  revalidatePath("/boards", "layout");
  return { success: true };
}
