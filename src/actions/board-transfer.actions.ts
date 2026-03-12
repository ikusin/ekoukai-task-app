"use server";

import { createClient } from "@/lib/supabase/server";

export interface BoardExportData {
  version: 1;
  exportedAt: string;
  board: { title: string; color: string; background_image: string | null };
  labels: Array<{ ref: number; name: string; color: string }>;
  members: Array<{ ref: number; name: string; color: string }>;
  lists: Array<{
    title: string;
    color: string | null;
    order: number;
    cards: Array<{
      title: string;
      description: string | null;
      due_date: string | null;
      start_date: string | null;
      show_in_calendar: boolean;
      order: number;
      label_refs: number[];
      member_refs: number[];
      checklists: Array<{
        title: string;
        items: Array<{
          text: string;
          is_done: boolean;
          due_date: string | null;
          order: number;
        }>;
      }>;
    }>;
  }>;
}

export async function exportBoard(
  boardId: string
): Promise<{ data?: BoardExportData; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch board
  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .eq("user_id", user.id)
    .single();
  if (!board) return { error: "Board not found" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = board as any;

  // Fetch labels
  const { data: labels } = await supabase
    .from("labels")
    .select("*")
    .eq("board_id", boardId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelRows = (labels ?? []) as any[];
  const labelRefMap: Record<string, number> = {};
  labelRows.forEach((l, i) => { labelRefMap[l.id] = i; });

  // Fetch members
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("board_id", boardId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberRows = (members ?? []) as any[];
  const memberRefMap: Record<string, number> = {};
  memberRows.forEach((m, i) => { memberRefMap[m.id] = i; });

  // Fetch lists with cards, card_labels, card_members, checklists, checklist_items
  const { data: lists } = await supabase
    .from("lists")
    .select(`
      *,
      cards (
        *,
        card_labels ( label_id ),
        card_members ( member_id ),
        checklists (
          id, title,
          checklist_items ( text, is_done, due_date, order )
        )
      )
    `)
    .eq("board_id", boardId)
    .order("order", { ascending: true })
    .order("order", { ascending: true, foreignTable: "cards" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRows = (lists ?? []) as any[];

  const exportData: BoardExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    board: {
      title: b.title,
      color: b.color,
      background_image: b.background_image ?? null,
    },
    labels: labelRows.map((l, i) => ({ ref: i, name: l.name, color: l.color })),
    members: memberRows.map((m, i) => ({ ref: i, name: m.name, color: m.color })),
    lists: listRows.map((list) => ({
      title: list.title,
      color: list.color ?? null,
      order: list.order,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cards: (list.cards ?? []).map((card: any) => ({
        title: card.title,
        description: card.description ?? null,
        due_date: card.due_date ?? null,
        start_date: card.start_date ?? null,
        show_in_calendar: card.show_in_calendar ?? true,
        order: card.order,
        label_refs: (card.card_labels ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((cl: any) => labelRefMap[cl.label_id])
          .filter((r: number | undefined) => r !== undefined),
        member_refs: (card.card_members ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((cm: any) => memberRefMap[cm.member_id])
          .filter((r: number | undefined) => r !== undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checklists: (card.checklists ?? []).map((cl: any) => ({
          title: cl.title,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: (cl.checklist_items ?? []).map((item: any) => ({
            text: item.text,
            is_done: item.is_done,
            due_date: item.due_date ?? null,
            order: item.order,
          })),
        })),
      })),
    })),
  };

  return { data: exportData };
}

export async function importBoard(
  exportData: BoardExportData
): Promise<{ data?: { id: string; title: string }; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 1. Create board
  const { data: newBoard, error: boardErr } = await supabase
    .from("boards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      user_id: user.id,
      title: exportData.board.title,
      color: exportData.board.color,
      background_image: exportData.board.background_image,
      order: 9999,
    } as any)
    .select()
    .single();
  if (boardErr) return { error: boardErr.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const board = newBoard as any;

  // 2. Create labels → build ref→id map
  const labelIdMap: Record<number, string> = {};
  for (const label of exportData.labels) {
    const { data: l } = await supabase
      .from("labels")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ board_id: board.id, name: label.name, color: label.color } as any)
      .select()
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (l) labelIdMap[label.ref] = (l as any).id;
  }

  // 3. Create members → build ref→id map
  const memberIdMap: Record<number, string> = {};
  for (const member of exportData.members) {
    const { data: m } = await supabase
      .from("members")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ board_id: board.id, name: member.name, color: member.color } as any)
      .select()
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (m) memberIdMap[member.ref] = (m as any).id;
  }

  // 4. Create lists + cards
  for (const list of exportData.lists) {
    const { data: newList } = await supabase
      .from("lists")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        board_id: board.id,
        title: list.title,
        color: list.color,
        order: list.order,
      } as any)
      .select()
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!newList) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newListId = (newList as any).id;

    for (const card of list.cards) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!newCard) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newCardId = (newCard as any).id;

      // card_labels
      if (card.label_refs.length > 0) {
        const labelInserts = card.label_refs
          .filter((ref) => labelIdMap[ref])
          .map((ref) => ({ card_id: newCardId, label_id: labelIdMap[ref] }));
        if (labelInserts.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from("card_labels").insert(labelInserts as any);
        }
      }

      // card_members
      if (card.member_refs.length > 0) {
        const memberInserts = card.member_refs
          .filter((ref) => memberIdMap[ref])
          .map((ref) => ({ card_id: newCardId, member_id: memberIdMap[ref] }));
        if (memberInserts.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from("card_members").insert(memberInserts as any);
        }
      }

      // checklists + items
      for (const checklist of card.checklists) {
        const { data: newCl } = await supabase
          .from("checklists")
          .insert({ card_id: newCardId, title: checklist.title })
          .select()
          .single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!newCl || checklist.items.length === 0) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newClId = (newCl as any).id;
        const itemInserts = checklist.items.map((item) => ({
          checklist_id: newClId,
          text: item.text,
          is_done: item.is_done,
          due_date: item.due_date,
          order: item.order,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("checklist_items").insert(itemInserts as any);
      }
    }
  }

  return { data: { id: board.id, title: exportData.board.title } };
}
