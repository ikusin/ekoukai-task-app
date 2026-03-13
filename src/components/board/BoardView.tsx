"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import ListColumn from "./ListColumn";
import AddListButton from "./AddListButton";
import CardItem from "./CardItem";
import CalendarView from "./CalendarView";
import GanttView from "./GanttView";
import BoardBackgroundPicker from "./BoardBackgroundPicker";
import BoardExportButton from "./BoardExportButton";
import { CardModalProvider } from "@/context/CardModalContext";
import CardModal from "@/components/card-modal/CardModal";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import type { BoardState, List, CardWithLabels } from "@/types/app.types";

type CardUpdate = Partial<
  Pick<CardWithLabels, "due_date" | "card_labels" | "card_members" | "checklists">
> & { id: string };

type Props = {
  boardId: string;
  boardTitle: string;
  initialState: BoardState;
  initialBackground: string | null;
};

export default function BoardView({ boardId, boardTitle, initialState, initialBackground }: Props) {
  const [boardState, setBoardState] = useState<BoardState>(initialState);

  // Collapsed state: load from localStorage, persist on change
  const storageKey = `collapsed-lists-${boardId}`;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {
      return {};
    }
  });
  const [view, setView] = useState<"kanban" | "calendar" | "gantt">("kanban");
  const [background, setBackground] = useState<string | null>(initialBackground);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync boardState when server re-fetches (e.g. after router.refresh())
  useEffect(() => {
    setBoardState(initialState);
  }, [initialState]);

  const { activeCard, activeList, handleDragStart, handleDragOver, handleDragEnd } =
    useDragAndDrop(boardState, setBoardState, boardId);

  function handleListCreated(list: List) {
    setBoardState((prev) => ({
      lists: [...prev.lists, list],
      cardsByList: { ...prev.cardsByList, [list.id]: [] },
    }));
  }

  function handleListDeleted(listId: string) {
    setBoardState((prev) => {
      const { [listId]: _, ...rest } = prev.cardsByList;
      return {
        lists: prev.lists.filter((l) => l.id !== listId),
        cardsByList: rest,
      };
    });
  }

  function handleCardCreated(listId: string, card: CardWithLabels) {
    setBoardState((prev) => ({
      ...prev,
      cardsByList: {
        ...prev.cardsByList,
        [listId]: [...(prev.cardsByList[listId] ?? []), card],
      },
    }));
  }

  function handleListColorChanged(listId: string, color: string) {
    setBoardState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => (l.id === listId ? { ...l, color } : l)),
    }));
  }

  function handleToggleCollapse(listId: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [listId]: !prev[listId] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function handleCardUpdated(update: CardUpdate) {
    setBoardState((prev) => ({
      ...prev,
      cardsByList: Object.fromEntries(
        Object.entries(prev.cardsByList).map(([listId, cards]) => [
          listId,
          cards.map((c) => (c.id === update.id ? { ...c, ...update } : c)),
        ])
      ),
    }));
  }

  function handleCardDeleted(cardId: string) {
    setBoardState((prev) => ({
      ...prev,
      cardsByList: Object.fromEntries(
        Object.entries(prev.cardsByList).map(([listId, cards]) => [
          listId,
          cards.filter((c) => c.id !== cardId),
        ])
      ),
    }));
  }

  // Build background style for the kanban/calendar area
  const bgStyle: React.CSSProperties = background
    ? { background, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: "rgb(226 232 240 / 0.6)" };

  return (
    <CardModalProvider boardId={boardId} onCardUpdated={handleCardUpdated} onCardDeleted={handleCardDeleted}>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 py-2 bg-white border-b border-slate-200 flex-shrink-0">
          {/* Left buttons */}
          <div className="flex items-center gap-2">
            <BoardBackgroundPicker
              boardId={boardId}
              current={background}
              onChange={setBackground}
            />
            <BoardExportButton boardId={boardId} boardTitle={boardTitle} />
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs md:text-sm">
            <button
              onClick={() => setView("kanban")}
              className={`px-2.5 md:px-3 py-1.5 transition-colors ${
                view === "kanban"
                  ? "bg-sky-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              リスト
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-2.5 md:px-3 py-1.5 border-l border-slate-300 transition-colors ${
                view === "calendar"
                  ? "bg-sky-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              カレンダー
            </button>
            <button
              onClick={() => setView("gantt")}
              className={`px-2.5 md:px-3 py-1.5 border-l border-slate-300 transition-colors ${
                view === "gantt"
                  ? "bg-sky-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              ガント
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === "kanban" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={boardState.lists.map((l) => l.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div
                  className="flex gap-3 md:gap-4 p-3 md:p-4 h-full overflow-x-auto kanban-scroll items-start"
                  style={bgStyle}
                >
                  {boardState.lists.map((list) => (
                    <ListColumn
                      key={list.id}
                      list={list}
                      cards={boardState.cardsByList[list.id] ?? []}
                      collapsed={!!collapsed[list.id]}
                      onCardCreated={(card) => handleCardCreated(list.id, card)}
                      onListDeleted={handleListDeleted}
                      onListColorChanged={handleListColorChanged}
                      onToggleCollapse={handleToggleCollapse}
                    />
                  ))}

                  <AddListButton boardId={boardId} onListCreated={handleListCreated} />
                </div>
              </SortableContext>

              <DragOverlay>
                {activeCard ? (
                  <CardItem card={activeCard} isOverlay />
                ) : activeList ? (
                  <div
                    className="w-[85vw] md:w-72 rounded-xl border border-slate-300 shadow-xl opacity-90 overflow-hidden"
                    style={{ backgroundColor: activeList.color ?? "#e2e8f0" }}
                  >
                    <div className="px-3 py-3">
                      <span className="text-sm font-semibold text-slate-800">
                        {activeList.title}
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : view === "calendar" ? (
            <div style={bgStyle} className="h-full overflow-auto">
              <CalendarView boardState={boardState} />
            </div>
          ) : (
            <div className="h-full bg-white">
              <GanttView boardState={boardState} />
            </div>
          )}
        </div>
      </div>

      <CardModal />
    </CardModalProvider>
  );
}
