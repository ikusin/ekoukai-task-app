"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SidebarBoardItem from "./SidebarBoardItem";
import CreateBoardModal from "./CreateBoardModal";
import type { Board } from "@/types/app.types";

export default function Sidebar({ boards }: { boards: Board[] }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-5 flex-shrink-0">
        <Link href="/boards" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            恵
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white leading-tight">恵佼会</div>
            <div className="text-xs text-slate-500 leading-tight">タスク管理</div>
          </div>
        </Link>
      </div>

      <div className="h-px bg-slate-800 mx-3 flex-shrink-0" />

      {/* Board list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 sidebar-scroll">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          ボード
        </p>
        <div className="space-y-0.5">
          {boards.map((board) => (
            <SidebarBoardItem key={board.id} board={board} />
          ))}
        </div>
        <div className="mt-1">
          <CreateBoardModal />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0">
        <div className="h-px bg-slate-800 mx-3" />
        <div className="p-3">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 p-2 bg-slate-900 rounded-lg shadow-md text-slate-300"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-60 bg-slate-900 flex-shrink-0
          transform transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {content}
      </aside>
    </>
  );
}
