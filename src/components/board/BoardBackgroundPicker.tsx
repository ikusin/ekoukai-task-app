"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { updateBoardBackground } from "@/actions/board.actions";

const SOLID_COLORS = [
  { label: "デフォルト", value: null },
  { label: "スレート", value: "#e2e8f0" },
  { label: "ブルー", value: "#bfdbfe" },
  { label: "バイオレット", value: "#ddd6fe" },
  { label: "ピンク", value: "#fce7f3" },
  { label: "グリーン", value: "#bbf7d0" },
  { label: "アンバー", value: "#fef3c7" },
  { label: "ローズ", value: "#fecdd3" },
  { label: "ダーク", value: "#1e293b" },
];

const GRADIENTS = [
  { label: "オーシャン", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { label: "パープル", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { label: "サンセット", value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { label: "ミント", value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { label: "ラベンダー", value: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { label: "スカイ", value: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)" },
  { label: "ピーチ", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
  { label: "エメラルド", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { label: "ミッドナイト", value: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  { label: "ローズ", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
];

type Props = {
  boardId: string;
  current: string | null;
  onChange: (value: string | null) => void;
};

export default function BoardBackgroundPicker({ boardId, current, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [applying, setApplying] = useState(false);

  async function apply(value: string | null) {
    setApplying(true);
    await updateBoardBackground(boardId, value);
    setApplying(false);
    onChange(value);
    setOpen(false);
  }

  async function applyUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const cssValue = `url("${url}") center/cover no-repeat`;
    await apply(cssValue);
    setUrlInput("");
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          title="背景を変更"
        >
          🎨 背景
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-[60] w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-4"
        >
          {/* Solid colors */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              単色
            </p>
            <div className="flex flex-wrap gap-2">
              {SOLID_COLORS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => apply(c.value)}
                  disabled={applying}
                  title={c.label}
                  className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 disabled:opacity-50"
                  style={{
                    background: c.value ?? "#f8fafc",
                    borderColor: current === c.value ? "#0ea5e9" : "#e2e8f0",
                  }}
                >
                  {c.value === null && (
                    <span className="text-xs text-slate-400 flex items-center justify-center h-full">×</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Gradients */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              グラデーション
            </p>
            <div className="flex flex-wrap gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => apply(g.value)}
                  disabled={applying}
                  title={g.label}
                  className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 disabled:opacity-50"
                  style={{
                    background: g.value,
                    borderColor: current === g.value ? "#0ea5e9" : "#e2e8f0",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Image URL */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              画像URL
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400"
                onKeyDown={(e) => e.key === "Enter" && applyUrl()}
              />
              <button
                onClick={applyUrl}
                disabled={!urlInput.trim() || applying}
                className="px-2.5 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg transition-colors"
              >
                適用
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Unsplashなどの画像URLを貼り付け
            </p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
