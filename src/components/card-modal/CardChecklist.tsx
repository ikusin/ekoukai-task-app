"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CheckSquare, X, Plus, UserPlus } from "lucide-react";
import {
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  deleteChecklist,
  updateChecklist,
  updateChecklistItemDueDate,
  updateChecklistItemAssignee,
  saveChecklistAsTemplate,
} from "@/actions/checklist.actions";
import { isOverdue, formatDate, getMemberInitials, getMemberDisplayName } from "@/lib/utils";
import type { ChecklistWithItems, ChecklistTemplateWithItems } from "@/types/app.types";
import type { Member } from "@/types/app.types";

type Props = {
  checklist: ChecklistWithItems;
  boardMembers?: Member[];
  onDeleted: (checklistId: string) => void;
  onUpdated: (checklist: ChecklistWithItems) => void;
  onTemplateSaved?: (template: ChecklistTemplateWithItems) => void;
};

export default function CardChecklist({
  checklist,
  boardMembers = [],
  onDeleted,
  onUpdated,
  onTemplateSaved,
}: Props) {
  const [items, setItems] = useState(checklist.checklist_items);
  const [newText, setNewText] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(checklist.title);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const doneCount = items.filter((i) => i.is_done).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  async function handleToggle(itemId: string, isDone: boolean) {
    await toggleChecklistItem(itemId, isDone);
    const updated = items.map((i) =>
      i.id === itemId ? { ...i, is_done: isDone } : i
    );
    setItems(updated);
    onUpdated({ ...checklist, checklist_items: updated });
  }

  async function handleAddItem() {
    if (!newText.trim()) return;
    const result = await addChecklistItem({
      checklistId: checklist.id,
      text: newText.trim(),
    });
    if (result.data) {
      const updated = [...items, result.data];
      setItems(updated);
      onUpdated({ ...checklist, checklist_items: updated });
      setNewText("");
    }
  }

  async function handleDeleteItem(itemId: string) {
    await deleteChecklistItem(itemId);
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    onUpdated({ ...checklist, checklist_items: updated });
  }

  async function handleItemDueDateChange(itemId: string, value: string) {
    const newDate = value || null;
    const result = await updateChecklistItemDueDate(itemId, newDate);
    if (result.data) {
      const updated = items.map((i) =>
        i.id === itemId ? { ...i, due_date: newDate } : i
      );
      setItems(updated);
      onUpdated({ ...checklist, checklist_items: updated });
    }
  }

  async function handleAssignee(itemId: string, assigneeId: string | null) {
    const result = await updateChecklistItemAssignee(itemId, assigneeId);
    if (result.data) {
      const updated = items.map((i) =>
        i.id === itemId ? { ...i, assignee_id: assigneeId } : i
      );
      setItems(updated);
      onUpdated({ ...checklist, checklist_items: updated });
    }
  }

  async function handleRenameChecklist() {
    if (!titleValue.trim() || titleValue.trim() === checklist.title) {
      setTitleValue(checklist.title);
      setEditingTitle(false);
      return;
    }
    await updateChecklist(checklist.id, titleValue.trim());
    onUpdated({ ...checklist, title: titleValue.trim(), checklist_items: items });
    setEditingTitle(false);
  }

  async function handleDeleteChecklist() {
    if (!confirm(`「${titleValue}」を削除しますか？`)) return;
    await deleteChecklist(checklist.id);
    onDeleted(checklist.id);
  }

  async function handleSaveAsTemplate() {
    setSavingTemplate(true);
    const result = await saveChecklistAsTemplate(checklist.id);
    setSavingTemplate(false);
    if (result.data && onTemplateSaved) {
      onTemplateSaved(result.data);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        {editingTitle ? (
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleRenameChecklist}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameChecklist();
              if (e.key === "Escape") {
                setTitleValue(checklist.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
            className="flex-1 px-2 py-1 text-sm font-semibold border border-sky-400 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 mr-2"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-sm font-semibold text-slate-700 flex items-center gap-2 hover:text-slate-900 text-left flex-1 min-w-0"
            title="クリックして名前を変更"
          >
            <CheckSquare size={15} className="text-slate-500 flex-shrink-0" /> {titleValue}
          </button>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate}
            className="text-xs text-slate-400 hover:text-sky-600 transition-colors disabled:opacity-50"
            title="テンプレートとして保存"
          >
            {savingTemplate ? "保存中..." : "テンプレ保存"}
          </button>
          <button
            onClick={handleDeleteChecklist}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            削除
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-500 w-8">{progress}%</span>
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">
            {doneCount}/{total}
          </span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-1.5 mb-3">
        {items.map((item) => {
          const overdue = isOverdue(item.due_date ?? null);
          const assignee = boardMembers.find((m) => m.id === item.assignee_id) ?? null;

          return (
            <div key={item.id} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={item.is_done}
                onChange={(e) => handleToggle(item.id, e.target.checked)}
                className="flex-shrink-0 accent-sky-500 w-4 h-4 cursor-pointer"
              />
              <span
                className={`flex-1 text-sm min-w-0 ${
                  item.is_done ? "line-through text-slate-400" : "text-slate-700"
                }`}
              >
                {item.text}
              </span>

              {/* Assignee badge (always visible when set) */}
              {assignee && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0 flex items-center gap-1"
                  title={getMemberDisplayName(assignee.name)}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: assignee.color }}
                  >
                    {getMemberInitials(assignee.name)}
                  </span>
                  {getMemberDisplayName(assignee.name)}
                </span>
              )}

              {/* Due date badge (always visible when set) */}
              {item.due_date && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    overdue
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {overdue ? "期限切れ" : formatDate(item.due_date)}
                </span>
              )}

              {/* Assignee picker (hover) */}
              {boardMembers.length > 0 && (
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                      title="担当者を設定"
                    >
                      <UserPlus size={13} className="text-slate-400 hover:text-sky-500" />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      side="top"
                      align="end"
                      sideOffset={4}
                      className="z-[110] w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1"
                    >
                      <p className="text-xs text-slate-400 px-2 py-1">担当者</p>
                      {assignee && (
                        <button
                          onClick={() => handleAssignee(item.id, null)}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
                        >
                          解除
                        </button>
                      )}
                      {boardMembers.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleAssignee(item.id, m.id)}
                          className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                            m.id === item.assignee_id
                              ? "bg-sky-50 text-sky-700"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: m.color }}
                          >
                            {getMemberInitials(m.name)}
                          </span>
                          <span className="truncate">{getMemberDisplayName(m.name)}</span>
                        </button>
                      ))}
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              )}

              {/* Date input (hover) */}
              <input
                type="date"
                value={item.due_date ?? ""}
                onChange={(e) => handleItemDueDateChange(item.id, e.target.value)}
                className="opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 border border-slate-200 rounded focus:outline-none focus:border-sky-400 w-28 flex-shrink-0 transition-opacity"
                title="期日を設定"
              />

              <button
                onClick={() => handleDeleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add item */}
      {addingItem ? (
        <div className="space-y-2">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="アイテムを追加..."
            rows={2}
            autoFocus
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddItem();
              }
              if (e.key === "Escape") {
                setAddingItem(false);
                setNewText("");
              }
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddItem}
              disabled={!newText.trim()}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-sm rounded-lg transition-colors"
            >
              追加
            </button>
            <button
              onClick={() => {
                setAddingItem(false);
                setNewText("");
              }}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 text-sm rounded-lg transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingItem(true)}
          className="text-sm text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-2 py-1 rounded-lg transition-colors flex items-center"
        >
          <Plus size={14} className="mr-1" /> アイテムを追加
        </button>
      )}
    </div>
  );
}
