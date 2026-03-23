"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Tag, Check, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Label } from "@/types/app.types";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
];

type Props = {
  cardId: string;
  boardId: string;
  activeLabels: Label[];
  boardLabels: Label[];
  onUpdate: (labels: Label[]) => void;
};

export default function CardLabels({
  cardId,
  boardId,
  activeLabels,
  boardLabels,
  onUpdate,
}: Props) {
  const [labels, setLabels] = useState<Label[]>(boardLabels);
  const [active, setActive] = useState<Label[]>(activeLabels);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function toggleLabel(label: Label) {
    const supabase = createClient();
    const isActive = active.some((l) => l.id === label.id);

    if (isActive) {
      await supabase
        .from("card_labels")
        .delete()
        .eq("card_id", cardId)
        .eq("label_id", label.id);
      const updated = active.filter((l) => l.id !== label.id);
      setActive(updated);
      onUpdate(updated);
    } else {
      await supabase
        .from("card_labels")
        .insert({ card_id: cardId, label_id: label.id });
      const updated = [...active, label];
      setActive(updated);
      onUpdate(updated);
    }
  }

  async function deleteLabel(label: Label, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`「${label.name}」を削除しますか？`)) return;
    setDeletingId(label.id);
    const supabase = createClient();
    await supabase.from("labels").delete().eq("id", label.id);
    setLabels((prev) => prev.filter((l) => l.id !== label.id));
    const updatedActive = active.filter((l) => l.id !== label.id);
    setActive(updatedActive);
    onUpdate(updatedActive);
    setDeletingId(null);
  }

  async function createLabel() {
    if (!newName.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("labels")
      .insert({ board_id: boardId, name: newName.trim(), color: newColor })
      .select()
      .single();

    if (!error && data) {
      setLabels((prev) => [...prev, data]);
      setNewName("");
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5"><Tag size={15} className="text-slate-500 dark:text-slate-400" /> ラベル</h3>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {active.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-medium"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </span>
        ))}
        {active.length === 0 && (
          <span className="text-xs text-slate-400">ラベルなし</span>
        )}
      </div>

      <Popover.Root>
        <Popover.Trigger asChild>
          <button className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-2 py-1 rounded-lg transition-colors">
            ラベルを編集
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-64 z-[100]"
            sideOffset={5}
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              ラベル
            </p>

            {/* Existing labels */}
            <div className="space-y-1 mb-3">
              {labels.map((label) => {
                const isActive = active.some((l) => l.id === label.id);
                return (
                  <div key={label.id} className="flex items-center gap-1 group">
                    <button
                      onClick={() => toggleLabel(label)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-w-0"
                    >
                      <span
                        className="w-6 h-6 rounded flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-sm text-left text-slate-700 dark:text-slate-200 truncate">
                        {label.name}
                      </span>
                      {isActive && (
                        <Check size={14} className="text-sky-500 flex-shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={(e) => deleteLabel(label, e)}
                      disabled={deletingId === label.id}
                      className="opacity-40 hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-all disabled:opacity-30 flex-shrink-0"
                      title="ラベルを削除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Create label */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <p className="text-xs text-slate-500 mb-2">新しいラベルを作成</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ラベル名"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 mb-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              />
              <div className="flex flex-wrap gap-1 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-6 h-6 rounded transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {newColor === c && (
                      <span className="flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={createLabel}
                disabled={!newName.trim()}
                className="w-full py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-sm rounded-lg transition-colors"
              >
                作成
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
