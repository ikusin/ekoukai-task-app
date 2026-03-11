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
