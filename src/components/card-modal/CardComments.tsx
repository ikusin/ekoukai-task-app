"use client";

import { useState } from "react";
import { createComment, deleteComment } from "@/actions/comment.actions";
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

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">💬 コメント</h3>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group flex gap-2">
              <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 border border-slate-200 whitespace-pre-wrap break-words">
                {comment.text}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-slate-400">
                  {formatDateTime(comment.created_at)}
                </span>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-red-500 transition-all"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="コメントを追加..."
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-sm rounded-lg transition-colors"
        >
          送信
        </button>
      </div>
    </div>
  );
}
