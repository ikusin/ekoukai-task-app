"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Member } from "@/types/app.types";

const createMemberSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().default("#6366f1"),
});

export async function createMember(input: {
  boardId: string;
  name: string;
  color?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { data, error } = await supabase
    .from("members")
    .insert({
      board_id: parsed.data.boardId,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/boards", "layout");
  return { data: data as Member };
}

export async function deleteMember(id: string, boardId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/boards/${boardId}`);
  return { success: true };
}
