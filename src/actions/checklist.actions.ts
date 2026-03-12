"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type {
  Checklist,
  ChecklistItem,
  ChecklistWithItems,
  ChecklistTemplateWithItems,
} from "@/types/app.types";

export async function createChecklist(input: {
  cardId: string;
  title?: string;
  templateId?: string;
}): Promise<{ data?: ChecklistWithItems; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  let title = input.title ?? "チェックリスト";

  // If templateId provided, fetch template title
  if (input.templateId) {
    const { data: tpl } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("id", input.templateId)
      .eq("user_id", user.id)
      .single();
    if (tpl) title = (tpl as unknown as { title: string }).title;
  }

  const { data, error } = await supabase
    .from("checklists")
    .insert({ card_id: input.cardId, title })
    .select()
    .single();

  if (error) return { error: error.message };
  const checklist = data as unknown as Checklist;

  // If templateId provided, insert template items
  let items: ChecklistItem[] = [];
  if (input.templateId && checklist) {
    const { data: tplItems } = await supabase
      .from("checklist_template_items")
      .select("*")
      .eq("template_id", input.templateId)
      .order("order", { ascending: true });

    if (tplItems && tplItems.length > 0) {
      const insertRows = (
        tplItems as unknown as Array<{ text: string; order: number }>
      ).map((item) => ({
        checklist_id: checklist.id,
        text: item.text,
        order: item.order,
      }));
      const { data: inserted } = await supabase
        .from("checklist_items")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertRows as any)
        .select();
      items = (inserted as unknown as ChecklistItem[]) ?? [];
    }
  }

  revalidatePath("/boards", "layout");
  return { data: { ...checklist, checklist_items: items } };
}

export async function updateChecklist(id: string, title: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!title.trim()) return { error: "Title required" };

  const { data, error } = await supabase
    .from("checklists")
    .update({ title: title.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/boards", "layout");
  return { data: data as unknown as Checklist };
}

export async function deleteChecklist(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("checklists").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/boards", "layout");
  return { success: true };
}

export async function addChecklistItem(input: {
  checklistId: string;
  text: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const schema = z.object({
    checklistId: z.string().uuid(),
    text: z.string().min(1).max(300),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { data: items } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("checklist_id", parsed.data.checklistId)
    .order("order", { ascending: false })
    .limit(1);
  const rows = items as ChecklistItem[] | null;
  const nextOrder = (rows?.[0]?.order ?? -1) + 1;

  const { data, error } = await supabase
    .from("checklist_items")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      checklist_id: parsed.data.checklistId,
      text: parsed.data.text,
      order: nextOrder,
    } as any)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/boards", "layout");
  return { data: data as unknown as ChecklistItem };
}

export async function toggleChecklistItem(id: string, isDone: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("checklist_items")
    .update({ is_done: isDone })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/boards", "layout");
  return { data: data as unknown as ChecklistItem };
}

export async function updateChecklistItemDueDate(
  id: string,
  due_date: string | null
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("checklist_items")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ due_date } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as unknown as ChecklistItem };
}

export async function updateChecklistItemAssignee(
  id: string,
  assignee_id: string | null
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("checklist_items")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ assignee_id } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as unknown as ChecklistItem };
}

export async function deleteChecklistItem(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/boards", "layout");
  return { success: true };
}

export async function saveChecklistAsTemplate(
  checklistId: string
): Promise<{ data?: ChecklistTemplateWithItems; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch checklist and items
  const { data: checklist } = await supabase
    .from("checklists")
    .select("*, checklist_items ( id, text, order )")
    .eq("id", checklistId)
    .single();

  if (!checklist) return { error: "Checklist not found" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = checklist as any;

  // Insert template
  const { data: tpl, error: tplErr } = await supabase
    .from("checklist_templates")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: user.id, title: raw.title } as any)
    .select()
    .single();

  if (tplErr) return { error: tplErr.message };
  const template = tpl as unknown as {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
  };

  // Insert template items
  const itemRows = (raw.checklist_items ?? []).map(
    (i: { text: string; order: number }) => ({
      template_id: template.id,
      text: i.text,
      order: i.order,
    })
  );

  let tplItems: Array<{
    id: string;
    template_id: string;
    text: string;
    order: number;
  }> = [];
  if (itemRows.length > 0) {
    const { data: inserted } = await supabase
      .from("checklist_template_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(itemRows as any)
      .select();
    tplItems = (inserted as unknown as typeof tplItems) ?? [];
  }

  return {
    data: {
      ...template,
      checklist_template_items: tplItems,
    },
  };
}

export async function getTemplates(): Promise<{
  data?: ChecklistTemplateWithItems[];
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("checklist_templates")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("*, checklist_template_items ( id, template_id, text, order )" as any)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data as unknown as ChecklistTemplateWithItems[] };
}

export async function deleteTemplate(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("checklist_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
