"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { copyListToBoard } from "@/actions/list.actions";
import type { Board } from "@/types/app.types";

type Props = {
  listId: string;
  listTitle: string;
  currentBoardId: string;
  onClose: () => void;
};

export default function CopyListModal({
  listId,
  listTitle,
  currentBoardId,
  onClose,
}: Props) {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    async function fetchBoards() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user.id)
        .order("order", { ascending: true });

      const allBoards = (data as unknown as Board[]) ?? [];
      setBoards(allBoards.filter((b) => b.id !== currentBoardId));
      setLoading(false);
    }
    fetchBoards();
  }, [currentBoardId]);

  async function handleCopy() {
    if (!selectedBoardId) return;
    setCopying(true);
    const result = await copyListToBoard(listId, selectedBoardId);
    setCopying(false);
    if (result.error) {
      alert("コピーに失敗しました: " + result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              「{listTitle}」を別のボードにコピー
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : boards.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                コピー先のボードがありません
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  コピー先のボードを選択
                </p>
                {boards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => setSelectedBoardId(board.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedBoardId === board.id
                        ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-700"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: board.color }}
                    />
                    <span className="truncate">{board.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleCopy}
              disabled={!selectedBoardId || copying}
              className="px-4 py-1.5 text-sm bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copying ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  コピー中...
                </>
              ) : (
                "コピー"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
