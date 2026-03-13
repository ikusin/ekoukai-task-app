"use client";

import { useState } from "react";
import { MessageSquare, Pencil, Check, X } from "lucide-react";
import { createComment, deleteComment, updateComment } from "@/actions/comment.actions";
import type { Comment } from "@/types/app.types";

type Props = {
  cardId: string;
  initialComments: Comment[];
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CardComments({ cardId, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    const result = await createComment({ cardId, text: text.trim() });
    if (result.data) {
      setComments((prev) => [...prev, result.data!]);
      setText("");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    await deleteComment(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditingText(comment.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }

  async function handleUpdate(id: string) {
    if (!editingText.trim()) return;
    const result = await updateComment(id, editingText.trim());
    if (result.data) {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, text: editingText.trim() } : c))
      );
      setEditingId(null);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
        <MessageSquare size={15} className="text-slate-500" /> コメント
      </h3>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              {/* Date + actions row */}
              <div className="flex items-center justify-between mb-0.5 px-1">
                <span className="text-xs text-slate-400">
                  {formatDateTime(comment.created_at)}
                </span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  {editingId !== comment.id && (
                    <button
                      onClick={() => startEdit(comment)}
                      className="text-xs text-slate-400 hover:text-sky-500 flex items-center gap-0.5 transition-colors"
                    >
                      <Pencil size={11} /> 編集
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>

              {/* Comment body */}
              {editingId === comment.id ? (
                <div className="space-y-1">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                    autoFocus
                    className="w-full px-3 py-2 border border-sky-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleUpdate(comment.id);
                      }
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => handleUpdate(comment.id)}
                      disabled={!editingText.trim()}
                      className="flex items-center gap-1 px-2.5 py-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-xs rounded-lg transition-colors"
                    >
                      <Check size={11} /> 保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:bg-slate-100 text-xs rounded-lg transition-colors"
                    >
                      <X size={11} /> キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg px-3 py-2 text-sm text-slate-700 border border-slate-200 whitespace-pre-wrap break-words">
                  {comment.text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="コメントを追加... (Enter で送信、Shift+Enter で改行)"
          rows={4}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[96px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-sm rounded-lg transition-colors"
          >
            {submitting ? "送信中..." : "送信"}
          </button>
        </div>
      </div>
    </div>
  );
}
