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
