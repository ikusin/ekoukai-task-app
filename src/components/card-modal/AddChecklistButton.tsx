"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Plus } from "lucide-react";
import { createChecklist } from "@/actions/checklist.actions";
import type { ChecklistWithItems, ChecklistTemplateWithItems } from "@/types/app.types";

type Props = {
  cardId: string;
  templates: ChecklistTemplateWithItems[];
  onCreated: (checklist: ChecklistWithItems) => void;
  onOpenManager: () => void;
};

export default function AddChecklistButton({
  cardId,
  templates,
  onCreated,
  onOpenManager,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleNew() {
    setOpen(false);
    setLoading(true);
    const result = await createChecklist({ cardId });
    setLoading(false);
    if (result.data) onCreated(result.data);
  }

  async function handleTemplate(templateId: string) {
    setOpen(false);
    setLoading(true);
    const result = await createChecklist({ cardId, templateId });
    setLoading(false);
    if (result.data) onCreated(result.data);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          disabled={loading}
          className="text-sm text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-3 py-2 rounded-lg transition-colors border border-dashed border-sky-300 w-full disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? "追加中..." : <><Plus size={14} className="mr-1" />チェックリストを追加</>}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={4}
          className="z-[60] w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2"
        >
          {/* New empty checklist */}
          <button
            onClick={handleNew}
            className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
          >
            新規作成（空白）
          </button>

          {/* Templates */}
          {templates.length > 0 && (
            <>
              <div className="text-xs text-slate-400 px-3 pt-2 pb-1">
                テンプレートから作成
              </div>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplate(t.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-sky-50 transition-colors"
                >
                  <div className="text-sm text-slate-700">{t.title}</div>
                  <div className="text-xs text-slate-400">
                    {t.checklist_template_items.length}項目
                  </div>
                </button>
              ))}
            </>
          )}

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                onOpenManager();
              }}
              className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            >
              テンプレートを管理 →
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
