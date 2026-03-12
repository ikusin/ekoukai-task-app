"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { duplicateCard } from "@/actions/card.actions";

type Options = {
  description: boolean;
  dates: boolean;
  members: boolean;
  labels: boolean;
  checklists: boolean;
  comments: boolean;
};

const OPTION_LABELS: { key: keyof Options; label: string }[] = [
  { key: "description", label: "説明" },
  { key: "dates", label: "日程（開始日・期日）" },
  { key: "members", label: "メンバー" },
  { key: "labels", label: "ラベル" },
  { key: "checklists", label: "チェックリスト" },
  { key: "comments", label: "コメント" },
];

type Props = {
  cardId: string;
  onDuplicated?: () => void;
};

export default function CardDuplicateButton({ cardId, onDuplicated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Options>({
    description: true,
    dates: true,
    members: true,
    labels: true,
    checklists: true,
    comments: false,
  });

  function toggle(key: keyof Options) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleDuplicate() {
    setLoading(true);
    const result = await duplicateCard(cardId, options);
    setLoading(false);

    if (result.error) {
      alert("複製に失敗しました: " + result.error);
      return;
    }

    setOpen(false);
    onDuplicated?.();
    router.refresh();
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          複製
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64 z-[60]"
        >
          <p className="text-sm font-semibold text-slate-800 mb-3">複製する項目を選択</p>
          <div className="space-y-2 mb-4">
            {OPTION_LABELS.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={() => toggle(key)}
                  className="w-4 h-4 rounded border-slate-300 text-sky-500 accent-sky-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                  {label}
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={handleDuplicate}
            disabled={loading}
            className="w-full px-3 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "複製中..." : "カードを複製"}
          </button>
          <Popover.Arrow className="fill-white stroke-slate-200" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
