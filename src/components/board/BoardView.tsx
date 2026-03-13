"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Calendar, CheckSquare, ArrowRightLeft, X } from "lucide-react";
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
import AddCardButton from "./AddCardButton";
import CardItem from "./CardItem";
import CalendarView from "./CalendarView";
import GanttView from "./GanttView";
import BoardBackgroundPicker from "./BoardBackgroundPicker";
import BoardExportButton from "./BoardExportButton";
import { CardModalProvider, useCardModal } from "@/context/CardModalContext";
import CardModal from "@/components/card-modal/CardModal";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { moveCard } from "@/actions/card.actions";
import { formatDate, isOverdue, getMemberInitials } from "@/lib/utils";
import type { BoardState, List, CardWithLabels } from "@/types/app.types";

type CardUpdate = Partial<
  Pick<CardWithLabels, "due_date" | "card_labels" | "card_members" | "checklists">
> & { id: string };

// ── Mobile: list picker bottom sheet ─────────────────────────────────────────
type MobileListPickerProps = {
  lists: List[];
  currentListId: string;
  onSelect: (listId: string) => void;
  onClose: () => void;
};

function MobileListPicker({ lists, currentListId, onSelect, onClose }: MobileListPickerProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl pb-safe">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800">移動先リストを選択</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-64 py-2 px-2">
          {lists
            .filter((l) => l.id !== currentListId)
            .map((list) => (
              <button
                key={list.id}
                onClick={() => onSelect(list.id)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: list.color ?? "#e2e8f0" }}
                />
                {list.title}
              </button>
            ))}
        </div>
      </div>
    </>
  );
}

// ── Mobile: card row (tap to open modal, no drag) ────────────────────────────
type MobileCardRowProps = {
  card: CardWithLabels;
  currentListId: string;
  allLists: List[];
  onMoveCard: (cardId: string, targetListId: string) => void;
};

function MobileCardRow({ card, currentListId, allLists, onMoveCard }: MobileCardRowProps) {
  const { openCard } = useCardModal();
  const [showPicker, setShowPicker] = useState(false);
  const overdue = isOverdue(card.due_date);
  const totalItems = card.checklists.reduce((s, cl) => s + cl.checklist_items.length, 0);
  const doneItems = card.checklists.reduce(
    (s, cl) => s + cl.checklist_items.filter((i) => i.is_done).length,
    0
  );

  return (
    <>
      <div className="relative w-full bg-white rounded-xl border border-slate-200/80 shadow-sm active:scale-[0.98] transition-transform">
        {/* Move button */}
        <button
          onClick={() => setShowPicker(true)}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-slate-300 hover:text-sky-500 hover:bg-sky-50 active:bg-sky-100 transition-colors z-10"
          title="別リストに移動"
        >
          <ArrowRightLeft size={13} />
        </button>

        {/* Tap area to open modal */}
        <button
          onClick={() => openCard(card.id)}
          className="w-full text-left p-3 pr-9"
        >
          {card.card_labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.card_labels.map(({ labels }) => (
                <span
                  key={labels.id}
                  className="inline-block w-8 h-1.5 rounded-full"
                  style={{ backgroundColor: labels.color }}
                />
              ))}
            </div>
          )}
          <p className="text-sm text-slate-800 leading-snug">{card.title}</p>
          {(card.due_date || totalItems > 0 || card.card_members.length > 0) && (
            <div className="mt-2 flex items-center flex-wrap gap-1.5">
              {card.due_date && (
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    overdue
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-slate-50 text-slate-500 border border-slate-100"
                  }`}
                >
                  <Calendar size={11} />
                  {formatDate(card.due_date)}
                </span>
              )}
              {totalItems > 0 && (
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    doneItems === totalItems
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-slate-50 text-slate-500 border border-slate-100"
                  }`}
                >
                  <CheckSquare size={11} />
                  {doneItems}/{totalItems}
                </span>
              )}
              {card.card_members.length > 0 && (
                <div className="flex -space-x-1.5 ml-auto">
                  {card.card_members.slice(0, 4).map(({ members }) => (
                    <span
                      key={members.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm"
                      style={{ backgroundColor: members.color }}
                      title={members.name}
                    >
                      {getMemberInitials(members.name)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </button>
      </div>

      {showPicker && (
        <MobileListPicker
          lists={allLists}
          currentListId={currentListId}
          onSelect={(targetListId) => {
            setShowPicker(false);
            onMoveCard(card.id, targetListId);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

// ── Mobile: fullscreen list sheet ────────────────────────────────────────────
type MobileListSheetProps = {
  list: List;
  allLists: List[];
  cards: CardWithLabels[];
  onClose: () => void;
  onCardCreated: (card: CardWithLabels) => void;
  onMoveCard: (cardId: string, targetListId: string) => void;
};

function MobileListSheet({ list, allLists, cards, onClose, onCardCreated, onMoveCard }: MobileListSheetProps) {
  const accentColor = list.color ?? "#e2e8f0";
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />
      {/* Sheet */}
      <div
        className="fixed inset-0 z-50 md:hidden flex flex-col bg-slate-100"
        style={{ animation: "mobileSheetIn 0.22s ease-out" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-black/10 active:bg-black/20 transition-colors flex-shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="flex-1 text-sm font-semibold text-slate-800 truncate">
            {list.title}
          </span>
          <span className="text-xs text-slate-600 font-medium bg-black/10 px-2 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {cards.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">カードがありません</p>
          ) : (
            cards.map((card) => (
              <MobileCardRow
                key={card.id}
                card={card}
                currentListId={list.id}
                allLists={allLists}
                onMoveCard={onMoveCard}
              />
            ))
          )}
        </div>

        {/* Add card */}
        <div className="px-3 py-3 bg-white border-t border-slate-200 flex-shrink-0">
          <AddCardButton listId={list.id} onCardCreated={onCardCreated} />
        </div>
      </div>
    </>
  );
}

// ── Main BoardView ────────────────────────────────────────────────────────────
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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mobileExpandedListId, setMobileExpandedListId] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close sheet when switching to desktop
  useEffect(() => {
    if (!isMobile) setMobileExpandedListId(null);
  }, [isMobile]);

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
    useDragAndDrop(boardState, setBoardState, boardId, collapsed);

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

  // Mobile: move card to another list
  async function handleMobileCardMove(cardId: string, targetListId: string) {
    // Optimistic update: remove from current list, append to target
    let movedCard: CardWithLabels | undefined;
    setBoardState((prev) => {
      const newCardsByList = Object.fromEntries(
        Object.entries(prev.cardsByList).map(([lid, cards]) => {
          const filtered = cards.filter((c) => {
            if (c.id === cardId) { movedCard = c; return false; }
            return true;
          });
          return [lid, filtered];
        })
      );
      if (movedCard) {
        newCardsByList[targetListId] = [...(newCardsByList[targetListId] ?? []), movedCard];
      }
      return { ...prev, cardsByList: newCardsByList };
    });

    // Persist: place at end of target list
    const targetCards = boardState.cardsByList[targetListId] ?? [];
    await moveCard(cardId, targetListId, (targetCards.length + 1) * 1000).catch(() => {});
  }

  // Build background style for the kanban/calendar area
  const bgStyle: React.CSSProperties = background
    ? { background, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: "rgb(226 232 240 / 0.6)" };

  // Mobile expanded list data
  const mobileExpandedList = mobileExpandedListId
    ? boardState.lists.find((l) => l.id === mobileExpandedListId)
    : null;

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
                      collapsed={isMobile ? true : !!collapsed[list.id]}
                      onCardCreated={(card) => handleCardCreated(list.id, card)}
                      onListDeleted={handleListDeleted}
                      onListColorChanged={handleListColorChanged}
                      onToggleCollapse={handleToggleCollapse}
                      onMobileTap={isMobile ? () => setMobileExpandedListId(list.id) : undefined}
                    />
                  ))}

                  {/* AddListButton hidden on mobile (use sheet instead) */}
                  {!isMobile && (
                    <AddListButton boardId={boardId} onListCreated={handleListCreated} />
                  )}
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

      {/* Mobile fullscreen list sheet */}
      {isMobile && mobileExpandedList && (
        <MobileListSheet
          list={mobileExpandedList}
          allLists={boardState.lists}
          cards={boardState.cardsByList[mobileExpandedList.id] ?? []}
          onClose={() => setMobileExpandedListId(null)}
          onCardCreated={(card) => handleCardCreated(mobileExpandedList.id, card)}
          onMoveCard={handleMobileCardMove}
        />
      )}

      <CardModal />
    </CardModalProvider>
  );
}
