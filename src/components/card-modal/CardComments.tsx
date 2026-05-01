"use client";

import { useState } from "react";
import { MessageSquare, Pencil, Check, X } from "lucide-react";
import { createComment, deleteComment, updateComment } from "@/actions/comment.actions";
import LinkifiedText from "@/components/ui/LinkifiedText";
import { getMemberInitials, getMemberDisplayName } from "@/lib/utils";
import type { CommentWithMember, Member } from "@/types/app.types";

type Props = {
  cardId: string;
  initialComments: CommentWithMember[];
  boardMembers: Member[];
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

function MemberAvatar({ member }: { member: Member }) {
  const initials = getMemberInitials(member.name);
  const displayName = getMemberDisplayName(member.name);
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
      style={{ backgroundColor: member.color }}
      title={displayName}
    >
      {initials}
    </span>
  );
}

export default function CardComments({ cardId, initialComments, boardMembers }: Props) {
  const [comments, setComments] = useState<CommentWithMember[]>(initialComments);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    const result = await createComment({
      cardId,
      text: text.trim(),
      memberId: selectedMemberId ?? undefined,
    });
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

  function startEdit(comment: CommentWithMember) {
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
        prev.map((c) =>
          c.id === id ? { ...c, text: editingText.trim(), members: result.data!.members } : c
        )
      );
      setEditingId(null);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
        <MessageSquare size={15} className="text-slate-500 dark:text-slate-400" /> コメント
      </h3>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              {/* Member + date + actions row */}
              <div className="flex items-center justify-between mb-0.5 px-1">
                <div className="flex items-center gap-1.5">
                  {comment.members && <MemberAvatar member={comment.members} />}
                  {comment.members && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {getMemberDisplayName(comment.members.name)}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {formatDateTime(comment.created_at)}
                  </span>
                </div>
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
                    className="w-full px-3 py-2 border border-sky-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
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
                      className="flex items-center gap-1 px-2.5 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs rounded-lg transition-colors"
                    >
                      <X size={11} /> キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 whitespace-pre-wrap break-words">
                  <LinkifiedText text={comment.text} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="space-y-2">
        {/* Member selector */}
        {boardMembers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">投稿者:</span>
            {boardMembers.map((member) => {
              const isSelected = selectedMemberId === member.id;
              const initials = getMemberInitials(member.name);
              const displayName = getMemberDisplayName(member.name);
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                  title={displayName}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                    isSelected
                      ? "border-transparent text-white"
                      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                  }`}
                  style={isSelected ? { backgroundColor: member.color, borderColor: member.color } : {}}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-white text-[9px] flex-shrink-0"
                    style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : member.color }}
                  >
                    {initials}
                  </span>
                  {displayName}
                </button>
              );
            })}
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="コメントを追加... (Enter で送信、Shift+Enter で改行)"
          rows={4}
          className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[96px] bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
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
