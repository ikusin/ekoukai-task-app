"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { exportBoard } from "@/actions/board-transfer.actions";

type Props = {
  boardId: string;
  boardTitle: string;
};

export default function BoardExportButton({ boardId, boardTitle }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const result = await exportBoard(boardId);
    setLoading(false);

    if (result.error || !result.data) {
      alert("エクスポートに失敗しました: " + result.error);
      return;
    }

    // JSONファイルとしてダウンロード
    const json = JSON.stringify(result.data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${boardTitle}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-700 dark:border-slate-600 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
      title="ボードをエクスポート"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} エクスポート
    </button>
  );
}
