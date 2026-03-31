"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, ChevronLeft, ChevronRight, Moon, Sun, Download, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import SidebarBoardItem from "./SidebarBoardItem";
import CreateBoardModal from "./CreateBoardModal";
import ImportBoardButton from "./ImportBoardButton";
import ImportTrelloButton from "./ImportTrelloButton";
import * as Popover from "@radix-ui/react-popover";
import { reorderBoards } from "@/actions/board.actions";
import type { Board } from "@/types/app.types";

export default function Sidebar({ boards: initialBoards }: { boards: Board[] }) {
  const router = useRouter();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [boards, setBoards] = useState(initialBoards);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Sync when server re-fetches (after router.refresh())
  useEffect(() => {
    setBoards(initialBoards);
  }, [initialBoards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = boards.findIndex((b) => b.id === active.id);
    const newIndex = boards.findIndex((b) => b.id === over.id);
    const newBoards = arrayMove(boards, oldIndex, newIndex);
    setBoards(newBoards);
    reorderBoards(newBoards.map((b) => b.id));
  }

  const content = (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="px-4 py-5 flex-shrink-0 flex items-center justify-between">
        <Link href="/boards" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            恵
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white leading-tight">恵佼会</div>
            <div className="text-xs text-slate-500 leading-tight">タスク管理</div>
          </div>
        </Link>
        {/* Desktop collapse button */}
        <button
          onClick={() => setCollapsed(true)}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          title="サイドバーを閉じる"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="h-px bg-slate-800 mx-3 flex-shrink-0" />

      {/* Board list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 sidebar-scroll">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          ボード
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={boards.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {boards.map((board) => (
                <SidebarBoardItem key={board.id} board={board} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className="mt-1 space-y-0.5">
          <CreateBoardModal />
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors">
                <Download size={16} />
                <span className="flex-1">インポート</span>
                <ChevronDown size={14} className="opacity-60" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="right"
                align="start"
                sideOffset={8}
                className="z-[300] w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1"
              >
                <ImportBoardButton />
                <ImportTrelloButton />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0">
        <div className="h-px bg-slate-800 mx-3" />
        <div className="p-3 space-y-0.5">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? "ライトモード" : "ダークモード"}
          </button>
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
        className="md:hidden fixed top-3 right-3 z-30 p-2 bg-slate-900 rounded-lg shadow-md text-slate-300"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop expand tab (shown when collapsed) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 items-center justify-center w-5 h-12 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-r-lg shadow-md transition-colors"
          title="サイドバーを開く"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Sidebar — slides from right on mobile, fixed left on desktop */}
      <aside
        className={`
          fixed md:relative inset-y-0 right-0 md:right-auto md:left-0 z-50
          bg-slate-900 flex-shrink-0
          transition-all duration-200 ease-in-out overflow-hidden
          ${collapsed ? "md:w-0" : "w-72 md:w-60"}
          ${mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
      >
        {content}
      </aside>
    </>
  );
}
