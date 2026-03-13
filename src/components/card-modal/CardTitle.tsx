"use client";

import { useState } from "react";
import { updateCard } from "@/actions/card.actions";

type Props = {
  cardId: string;
  title: string;
  onUpdate: (title: string) => void;
};

export default function CardTitle({ cardId, title, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  async function handleSave() {
    if (!value.trim() || value.trim() === title) {
      setValue(title);
      setEditing(false);
      return;
    }
    await updateCard({ id: cardId, title: value.trim() });
    onUpdate(value.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        autoFocus
        rows={2}
        className="w-full text-xl font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 resize-none border border-sky-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    );
  }

  return (
    <h2
      onClick={() => setEditing(true)}
      className="text-xl font-semibold text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg px-2 py-1 -mx-2 -my-1"
    >
      {title}
    </h2>
  );
}
