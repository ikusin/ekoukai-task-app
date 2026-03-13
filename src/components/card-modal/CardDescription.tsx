"use client";

import { useState } from "react";
import { AlignLeft } from "lucide-react";
import { updateCard } from "@/actions/card.actions";
import LinkifiedText from "@/components/ui/LinkifiedText";

type Props = {
  cardId: string;
  description: string | null;
  onUpdate: (desc: string | null) => void;
};

export default function CardDescription({
  cardId,
  description,
  onUpdate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description ?? "");

  async function handleSave() {
    const newDesc = value.trim() || null;
    if (newDesc === description) {
      setEditing(false);
      return;
    }
    await updateCard({ id: cardId, description: newDesc });
    onUpdate(newDesc);
    setEditing(false);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
        <AlignLeft size={15} className="text-slate-500 dark:text-slate-400" /> 説明
      </h3>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            rows={4}
            placeholder="説明を追加..."
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded-lg transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => {
                setValue(description ?? "");
                setEditing(false);
              }}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm rounded-lg transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className={`w-full min-h-[60px] px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-pre-wrap break-words ${
            description ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {description
            ? <LinkifiedText text={description} />
            : "説明を追加するにはクリックしてください..."}
        </div>
      )}
    </div>
  );
}
