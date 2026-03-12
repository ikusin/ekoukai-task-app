"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateBoard, deleteBoard, copyBoard } from "@/actions/board.actions";
import type { Board } from "@/types/app.types";

export default function SidebarBoardItem({ board }: { board: Board }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname === `/boards/${board.id}`;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(board.title);
  const [showMenu, setShowMenu] = useState(false);
  const [copying, setCopying] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function handleRename() {
    if (title.trim() === board.title || !title.trim()) {
      setTitle(board.title);
      setEditing(false);
      return;
    }
    await updateBoard({ id: board.id, title: title.trim() });
    setEditing(false);
  }

  async function handleCopy() {
    setShowMenu(false);
    setCopying(true);
    const result = await copyBoard(board.id);
    setCopying(false);
    if (result.error) {
      alert("コピーに失敗しました: " + result.error);
      return;
    }
    if (result.data) {
      router.push(`/boards/${result.data.id}`);
      router.refresh();
    }
  }

  async function handleDelete() {
    setShowMenu(false);
    if (!confirm(`「${board.title}」を削除しますか？`)) return;
    await deleteBoard(board.id);
    if (isActive) router.push("/boards");
    router.refresh();
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative group"
    >
      {copying && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-lg z-10">
          <span className="text-xs text-slate-300">コピー中...</span>
        </div>
      )}

      {editing ? (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setTitle(board.title);
              setEditing(false);
            }
          }}
          autoFocus
          className="w-full px-3 py-2 text-sm bg-slate-800 border border-sky-500 rounded-lg text-white focus:outline-none"
        />
      ) : (
        <div className="flex items-center">
          {/* Drag handle */}
          <div
            ref={setActivatorNodeRef}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 pl-1.5 py-2 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 flex-shrink-0 select-none transition-opacity"
            title="ドラッグして並び替え"
          >
            ⠿
          </div>
          <Link
            href={`/boards/${board.id}`}
            className={`flex-1 flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors min-w-0 ${
              isActive
                ? "bg-white/10 text-white font-medium"
                : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: board.color }}
            />
            <span className="flex-1 truncate">{board.title}</span>
          </Link>
        </div>
      )}

      {/* Kebab menu — always visible when open, hover-visible otherwise */}
      {!editing && (
        <div
          className={`absolute right-1 top-1/2 -translate-y-1/2 transition-opacity ${
            showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowMenu((v) => !v);
            }}
            className="p-1.5 text-slate-500 hover:text-slate-300 rounded transition-colors"
            title="メニュー"
          >
            ⋯
          </button>

          {showMenu && (
            <>
              {/* Click-away backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-20 min-w-[130px]">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setEditing(true);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  名前を変更
                </button>
                <button
                  onClick={handleCopy}
                  className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  コピーを作成
                </button>
                <div className="h-px bg-slate-700 my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                >
                  削除
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
