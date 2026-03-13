"use client";

import { useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { createList } from "@/actions/list.actions";
import type { List } from "@/types/app.types";

type Props = {
  boardId: string;
  onListCreated: (list: List) => void;
};

export default function AddListButton({ boardId, onListCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const result = await createList({ boardId, title: title.trim() });
    setLoading(false);

    if (result.data) {
      onListCreated(result.data);
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
        className="flex-shrink-0 w-[85vw] md:w-72 flex items-center gap-2 px-4 py-3 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors border border-dashed border-slate-300 dark:border-slate-600"
      >
        <Plus size={16} />
        リストを追加
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-[85vw] md:w-72 bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="リスト名を入力..."
          maxLength={100}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          onKeyDown={(e) => {
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
            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? "追加中..." : "追加"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setTitle("");
            }}
            className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
