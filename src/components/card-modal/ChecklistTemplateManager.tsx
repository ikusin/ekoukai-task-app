"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { deleteTemplate } from "@/actions/checklist.actions";
import type { ChecklistTemplateWithItems } from "@/types/app.types";

type Props = {
  templates: ChecklistTemplateWithItems[];
  onDeleted: (id: string) => void;
  onClose: () => void;
};

export default function ChecklistTemplateManager({
  templates,
  onDeleted,
  onClose,
}: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`「${title}」を削除しますか？`)) return;
    setDeleting(id);
    await deleteTemplate(id);
    setDeleting(null);
    onDeleted(id);
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <ClipboardList size={15} className="text-slate-500" /> テンプレート管理
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          閉じる
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-slate-400">
          テンプレートがありません。チェックリストの「テンプレ保存」ボタンから保存できます。
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-700 truncate">
                  {t.title}
                </div>
                <div className="text-xs text-slate-400">
                  {t.checklist_template_items.length}項目
                </div>
              </div>
              <button
                onClick={() => handleDelete(t.id, t.title)}
                disabled={deleting === t.id}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-3 flex-shrink-0 disabled:opacity-50"
              >
                {deleting === t.id ? "削除中..." : "削除"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
