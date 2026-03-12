"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Users, Check, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createMember, deleteMember } from "@/actions/member.actions";
import { getMemberInitials, getMemberDisplayName } from "@/lib/utils";
import type { Member } from "@/types/app.types";

const MEMBER_COLORS = [
  "#6366f1", // indigo
  "#ef4444", // red
  "#f97316", // orange
  "#22c55e", // green
  "#0ea5e9", // sky
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
];

type Props = {
  cardId: string;
  boardId: string;
  activeMembers: Member[];
  boardMembers: Member[];
  onUpdate: (members: Member[]) => void;
};

export default function CardMembers({
  cardId,
  boardId,
  activeMembers,
  boardMembers,
  onUpdate,
}: Props) {
  const [members, setMembers] = useState<Member[]>(boardMembers);
  const [active, setActive] = useState<Member[]>(activeMembers);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(MEMBER_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function toggleMember(member: Member) {
    const supabase = createClient();
    const isActive = active.some((m) => m.id === member.id);

    if (isActive) {
      await supabase
        .from("card_members")
        .delete()
        .eq("card_id", cardId)
        .eq("member_id", member.id);
      const updated = active.filter((m) => m.id !== member.id);
      setActive(updated);
      onUpdate(updated);
    } else {
      await supabase
        .from("card_members")
        .insert({ card_id: cardId, member_id: member.id });
      const updated = [...active, member];
      setActive(updated);
      onUpdate(updated);
    }
  }

  async function handleCreateMember() {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createMember({
      boardId,
      name: newName.trim(),
      color: newColor,
    });
    if (result.data) {
      setMembers((prev) => [...prev, result.data!]);
      setNewName("");
    }
    setCreating(false);
  }

  async function handleDeleteMember(member: Member, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(member.id);
    await deleteMember(member.id, boardId);
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    const updatedActive = active.filter((m) => m.id !== member.id);
    setActive(updatedActive);
    onUpdate(updatedActive);
    setDeletingId(null);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <Users size={15} className="text-slate-500" /> メンバー
      </h3>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {active.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-xs font-medium"
            style={{ backgroundColor: member.color }}
          >
            <span>{getMemberDisplayName(member.name)}</span>
          </div>
        ))}
        {active.length === 0 && (
          <span className="text-xs text-slate-400">メンバーなし</span>
        )}
      </div>

      <Popover.Root>
        <Popover.Trigger asChild>
          <button className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-2 py-1 rounded-lg transition-colors">
            メンバーを編集
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-72 z-[100]"
            sideOffset={5}
          >
            <p className="text-sm font-semibold text-slate-700 mb-3">
              メンバー
            </p>

            {/* Existing members — 2 columns */}
            <div className="grid grid-cols-2 gap-1 mb-3 max-h-48 overflow-y-auto">
              {members.length === 0 && (
                <p className="text-xs text-slate-400 py-2 col-span-2">
                  まだメンバーがいません
                </p>
              )}
              {members.map((member) => {
                const isActive = active.some((m) => m.id === member.id);
                return (
                  <div
                    key={member.id}
                    className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <button
                      onClick={() => toggleMember(member)}
                      className="flex items-center gap-1.5 flex-1 min-w-0"
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: member.color }}
                      >
                        {getMemberInitials(member.name)}
                      </span>
                      <span className="flex-1 text-xs text-left text-slate-700 truncate">
                        {getMemberDisplayName(member.name)}
                      </span>
                      {isActive && (
                        <Check size={12} className="text-sky-500 flex-shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteMember(member, e)}
                      disabled={deletingId === member.id}
                      className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all disabled:opacity-50"
                      title="メンバーを削除"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Create member */}
            <div className="border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-500 mb-2">
                新しいメンバーを追加
              </p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateMember()}
                placeholder="名前（例: 宮田&quot;田&quot;）"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 mb-1"
              />
              <p className="text-xs text-slate-400 mb-2">
                アイコン文字を指定: <span className="font-mono">宮田&quot;田&quot;</span> → アイコンに「田」
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: newColor === c ? "#0ea5e9" : "transparent",
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleCreateMember}
                disabled={!newName.trim() || creating}
                className="w-full py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-sm rounded-lg transition-colors"
              >
                追加
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
