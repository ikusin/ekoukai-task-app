"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TRELLO_COLOR_MAP: Record<string, string> = {
  green: "#22c55e",
  yellow: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  purple: "#8b5cf6",
  blue: "#0ea5e9",
  sky: "#7dd3fc",
  lime: "#86efac",
  pink: "#f9a8d4",
  black: "#1e293b",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importTrello(data: any, router: ReturnType<typeof useRouter>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  // 1. ボード作成
  const { data: boardsData } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", user.id)
    .order("order", { ascending: false })
    .limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextOrder = ((boardsData as any)?.[0]?.order ?? -1) + 1;

  const { data: board, error: boardError } = await supabase
    .from("boards")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: user.id, title: data.name ?? "インポートボード", color: "#6366f1", order: nextOrder } as any)
    .select()
    .single();
  if (boardError || !board) throw new Error("ボード作成失敗");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boardId = (board as any).id as string;

  // 2. ラベル作成
  const trelloLabelToOurId: Record<string, string> = {};
  for (const label of data.labels ?? []) {
    if (!label.name && !label.color) continue;
    const { data: newLabel } = await supabase
      .from("labels")
      .insert({
        board_id: boardId,
        name: label.name || label.color,
        color: TRELLO_COLOR_MAP[label.color] ?? "#6366f1",
      })
      .select()
      .single();
    if (newLabel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trelloLabelToOurId[label.id] = (newLabel as any).id;
    }
  }

  // 3. リスト作成（アーカイブ除外、pos順）
  const activeLists = (data.lists ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => !l.closed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.pos - b.pos);

  const trelloListToOurId: Record<string, string> = {};
  for (let i = 0; i < activeLists.length; i++) {
    const tList = activeLists[i];
    const { data: newList } = await supabase
      .from("lists")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ board_id: boardId, title: tList.name, order: i } as any)
      .select()
      .single();
    if (newList) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trelloListToOurId[tList.id] = (newList as any).id;
    }
  }

  // 4. チェックリストのマップ作成
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checklistMap: Record<string, any> = {};
  for (const cl of data.checklists ?? []) {
    checklistMap[cl.id] = cl;
  }

  // 5. カード作成（アーカイブ除外、pos順）
  const activeCards = (data.cards ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => !c.closed && trelloListToOurId[c.idList])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.pos - b.pos);

  const cardOrderByList: Record<string, number> = {};

  for (const tCard of activeCards) {
    const listId = trelloListToOurId[tCard.idList];
    if (!listId) continue;

    const order = cardOrderByList[tCard.idList] ?? 0;
    cardOrderByList[tCard.idList] = order + 1;

    const dueDate = tCard.due ? (tCard.due as string).split("T")[0] : null;

    const { data: newCard } = await supabase
      .from("cards")
      .insert({
        list_id: listId,
        title: tCard.name || "（無題）",
        description: tCard.desc || null,
        due_date: dueDate,
        order,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      .single();
    if (!newCard) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardId = (newCard as any).id as string;

    // ラベル付与
    for (const labelId of tCard.idLabels ?? []) {
      const ourLabelId = trelloLabelToOurId[labelId];
      if (ourLabelId) {
        await supabase
          .from("card_labels")
          .insert({ card_id: cardId, label_id: ourLabelId });
      }
    }

    // チェックリスト
    for (const checklistId of tCard.idChecklists ?? []) {
      const tChecklist = checklistMap[checklistId];
      if (!tChecklist) continue;

      const { data: newChecklist } = await supabase
        .from("checklists")
        .insert({ card_id: cardId, title: tChecklist.name })
        .select()
        .single();
      if (!newChecklist) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checklistId2 = (newChecklist as any).id as string;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (tChecklist.checkItems ?? []).sort((a: any, b: any) => a.pos - b.pos);
      for (let i = 0; i < items.length; i++) {
        await supabase.from("checklist_items").insert({
          checklist_id: checklistId2,
          text: items[i].name,
          is_done: items[i].state === "complete",
          order: i,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
    }
  }

  router.push(`/boards/${boardId}`);
  router.refresh();
}

export default function ImportTrelloButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importTrello(data, router);
    } catch {
      setError("インポートに失敗しました。Trelloのエクスポートファイルか確認してください。");
    }
    setImporting(false);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {importing ? "⏳ インポート中..." : "📥 Trelloからインポート"}
      </button>
      {error && (
        <p className="text-xs text-red-500 px-3 py-1">{error}</p>
      )}
    </>
  );
}
