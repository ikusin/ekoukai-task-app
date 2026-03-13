"use client";

import { useState } from "react";
import { GripVertical, ChevronDown, ChevronRight, MoreHorizontal, ArrowUpDown, Check } from "lucide-react";
import { updateList, deleteList } from "@/actions/list.actions";
import type { List } from "@/types/app.types";

export type SortMode = "default" | "due_asc" | "due_desc" | "title_asc";

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: "default", label: "デフォルト" },
  { mode: "due_asc", label: "期日が近い順" },
  { mode: "due_desc", label: "期日が遠い順" },
  { mode: "title_asc", label: "タイトル順（あいうえお）" },
];

const LIST_COLORS = [
  "#e2e8f0", // slate (default)
  "#fca5a5", // red
  "#fdba74", // orange
  "#fde68a", // amber
  "#86efac", // green
  "#7dd3fc", // sky
  "#c4b5fd", // violet
  "#f9a8d4", // pink
];

type DragHandleProps = {
  ref: (el: HTMLElement | null) => void;
} & React.HTMLAttributes<HTMLElement>;

type Props = {
  list: List;
  cardCount: number;
  collapsed: boolean;
  dragHandleProps: DragHandleProps;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  isDoneList: boolean;
  onToggleDoneList: () => void;
  onDeleted: () => void;
  onColorChange: (color: string) => void;
  onToggleCollapse: () => void;
};

export default function ListHeader({
  list,
  cardCount,
  collapsed,
  dragHandleProps,
  sortMode,
  onSortChange,
  isDoneList,
  onToggleDoneList,
  onDeleted,
  onColorChange,
  onToggleCollapse,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);

  async function handleRename() {
    if (title.trim() === list.title || !title.trim()) {
      setTitle(list.title);
      setEditing(false);
      return;
    }
    await updateList({ id: list.id, title: title.trim() });
    setEditing(false);
  }

  async function handleColorChange(color: string) {
    setShowMenu(false);
    await updateList({ id: list.id, color });
    onColorChange(color);
  }

  async function handleDelete() {
    setShowMenu(false);
    if (!confirm(`「${list.title}」とそのカードをすべて削除しますか？`)) return;
    await deleteList(list.id, list.board_id);
    onDeleted();
  }

  const accentColor = list.color ?? "#e2e8f0";

  return (
    <div
      className="flex items-center gap-2 px-3 pt-3 pb-2 rounded-t-xl"
      style={{ backgroundColor: accentColor }}
    >
      {/* Drag handle */}
      <button
        {...dragHandleProps}
        ref={dragHandleProps.ref as React.RefCallback<HTMLButtonElement>}
        className="text-slate-500 hover:text-slate-800 cursor-grab active:cursor-grabbing text-sm flex-shrink-0 px-0.5"
        title="ドラッグして並び替え"
      >
        <GripVertical size={16} />
      </button>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="text-slate-600 hover:text-slate-900 transition-colors text-xs flex-shrink-0"
        title={collapsed ? "展開" : "折りたたむ"}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
      </button>

      {editing ? (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setTitle(list.title);
              setEditing(false);
            }
          }}
          autoFocus
          className="flex-1 px-2 py-1 text-sm font-semibold border border-sky-400 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white/70"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-sm font-semibold text-slate-800 hover:text-slate-900 truncate flex items-center gap-1"
        >
          {list.title}
          {sortMode !== "default" && (
            <ArrowUpDown size={12} className="text-slate-500 flex-shrink-0" />
          )}
        </button>
      )}

      <span className="text-xs text-slate-600 flex-shrink-0">{cardCount}</span>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-black/10 rounded transition-colors text-xs"
        >
          <MoreHorizontal size={16} />
        </button>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 min-w-[180px]">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setEditing(true);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                名前を変更
              </button>

              {/* Done list toggle */}
              <button
                onClick={() => { setShowMenu(false); onToggleDoneList(); }}
                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span className="w-3 flex-shrink-0">
                  {isDoneList && <Check size={12} className="text-sky-500" />}
                </span>
                期限超過から除外
              </button>

              {/* Sort section */}
              <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">並び替え</p>
                <div className="space-y-0.5">
                  {SORT_OPTIONS.map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => { onSortChange(mode); setShowMenu(false); }}
                      className="w-full text-left flex items-center gap-2 px-2 py-1 rounded text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <span className="w-3 flex-shrink-0">
                        {sortMode === mode && <Check size={12} className="text-sky-500" />}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">リストの色</p>
                <div className="flex flex-wrap gap-1.5">
                  {LIST_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleColorChange(c)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor:
                          accentColor === c ? "#0ea5e9" : "#cbd5e1",
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 border-t border-slate-100 dark:border-slate-700"
              >
                リストを削除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
