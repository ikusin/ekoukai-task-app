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
