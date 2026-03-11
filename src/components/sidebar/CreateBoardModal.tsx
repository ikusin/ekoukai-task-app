"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { createBoard } from "@/actions/board.actions";

const PRESET_COLORS = [
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export default function CreateBoardModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData();
    fd.set("title", title);
    fd.set("color", color);

    const result = await createBoard(fd);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setTitle("");
    setColor(PRESET_COLORS[0]);
    if (result.data) {
      router.push(`/boards/${result.data.id}`);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors">
          <span className="text-base leading-none">+</span>
          ボードを作成
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-full max-w-sm z-50">
          <Dialog.Title className="text-lg font-semibold text-slate-900 mb-4">
            新しいボードを作成
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ボード名
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
                autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="例: プロジェクト管理"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                カラー
              </label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                    title={c}
                  >
                    {color === c && (
                      <span className="flex items-center justify-center text-white text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="px-4 py-2 text-sm bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg transition-colors"
              >
                {loading ? "作成中..." : "作成"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
