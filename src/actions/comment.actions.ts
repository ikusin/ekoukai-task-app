"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { CommentWithMember } from "@/types/app.types";

export async function createComment(input: {
  cardId: string;
  text: string;
  memberId?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const schema = z.object({
    cardId: z.string().uuid(),
    text: z.string().min(1).max(2000),
    memberId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { data, error } = await supabase
    .from("card_comments")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      card_id: parsed.data.cardId,
      user_id: user.id,
      member_id: parsed.data.memberId ?? null,
      text: parsed.data.text,
    } as any)
    .select("*, members(*)")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/boards", "layout");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  const comment: CommentWithMember = {
    ...raw,
    members: Array.isArray(raw.members) ? (raw.members[0] ?? null) : (raw.members ?? null),
  };
  return { data: comment };
}

export async function updateComment(id: string, text: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!text.trim()) return { error: "Text required" };

  const { data, error } = await supabase
    .from("card_comments")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ text: text.trim() } as any)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, members(*)")
    .single();

  if (error) return { error: error.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  const comment: CommentWithMember = {
    ...raw,
    members: Array.isArray(raw.members) ? (raw.members[0] ?? null) : (raw.members ?? null),
  };
  return { data: comment };
}

export async function deleteComment(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("card_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/boards", "layout");
  return { success: true };
}
