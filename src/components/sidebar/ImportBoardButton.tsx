"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Download } from "lucide-react";
import { importBoard } from "@/actions/board-transfer.actions";
import type { BoardExportData } from "@/actions/board-transfer.actions";

export default function ImportBoardButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // JSONを読み込む
    const text = await file.text();
    let data: BoardExportData;
    try {
      data = JSON.parse(text);
    } catch {
      alert("JSONファイルが壊れています");
      return;
    }

    if (data.version !== 1) {
      alert("対応していないファイル形式です");
      return;
    }

    setLoading(true);
    const result = await importBoard(data);
    setLoading(false);

    // inputをリセット
    if (inputRef.current) inputRef.current.value = "";

    if (result.error || !result.data) {
      alert("インポートに失敗しました: " + result.error);
      return;
    }

    router.push(`/boards/${result.data.id}`);
    router.refresh();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            インポート中...
          </>
        ) : (
          <>
            <Download size={16} />
            ボードをインポート
          </>
        )}
      </button>
    </>
  );
}
