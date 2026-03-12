"use client";

import { useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { createCard } from "@/actions/card.actions";
import type { CardWithLabels } from "@/types/app.types";

type Props = {
  listId: string;
  onCardCreated: (card: CardWithLabels) => void;
};

export default function AddCardButton({ listId, onCardCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const result = await createCard({ listId, title: title.trim() });
    setLoading(false);

    if (result.data) {
      onCardCreated({ ...result.data, card_labels: [], card_members: [], checklists: [] });
      setTitle("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
      >
        <Plus size={14} /> カードを追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-1">
      <textarea
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="カードのタイトルを入力..."
        maxLength={200}
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-xs rounded-lg transition-colors"
        >
          {loading ? "追加中..." : "追加"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
          className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs rounded-lg transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </form>
  );
}
