"use client";

import { useState } from "react";
import { useDroppable, useDndMonitor } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, ArrowDown } from "lucide-react";
import ListHeader from "./ListHeader";
import CardItem from "./CardItem";
import AddCardButton from "./AddCardButton";
import type { List, CardWithLabels } from "@/types/app.types";

type Props = {
  list: List;
  cards: CardWithLabels[];
  collapsed: boolean;
  onCardCreated: (card: CardWithLabels) => void;
  onListDeleted: (listId: string) => void;
  onListColorChanged: (listId: string, color: string) => void;
  onToggleCollapse: (listId: string) => void;
  /** Mobile only: tap collapsed list to open fullscreen sheet */
  onMobileTap?: () => void;
};

export default function ListColumn({
  list,
  cards,
  collapsed,
  onCardCreated,
  onListDeleted,
  onListColorChanged,
  onToggleCollapse,
  onMobileTap,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id, data: { type: "list" } });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `drop-${list.id}`,
  });

  // Track card-drag-over for collapsed lists via monitor
  // (can't rely on useDroppable.isOver when sortable and droppable share same element)
  const [isCardOver, setIsCardOver] = useState(false);
  useDndMonitor({
    onDragOver({ active, over }) {
      if (!collapsed) return;
      const isCard = active.data.current?.type !== "list";
      const overId = String(over?.id ?? "");
      setIsCardOver(isCard && (overId === list.id || overId === `drop-${list.id}`));
    },
    onDragEnd() { setIsCardOver(false); },
    onDragCancel() { setIsCardOver(false); },
  });

  const accentColor = list.color ?? "#e2e8f0";

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const dragHandleProps = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
  };

  if (collapsed) {
    return (
      <div
        ref={(el) => {
          setSortableRef(el);
          setDroppableRef(el);
        }}
        style={{
          ...sortableStyle,
          backgroundColor: isCardOver ? undefined : accentColor,
        }}
        onClick={() => {
          if (isCardOver) return;
          if (onMobileTap) onMobileTap();
          else onToggleCollapse(list.id);
        }}
        className={`flex-shrink-0 flex flex-col items-center rounded-xl py-3 gap-2 border shadow-sm transition-all duration-200 ${
          isCardOver
            ? "w-16 bg-sky-100 border-sky-400 ring-2 ring-sky-400 ring-offset-2 shadow-xl shadow-sky-200 scale-105"
            : "w-10 border-black/10"
        } ${onMobileTap ? "cursor-pointer active:brightness-90" : ""}`}
      >
        {isCardOver ? (
          <>
            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shadow-md animate-bounce">
              <ArrowDown size={16} className="text-white" />
            </div>
            <span
              className="text-xs font-bold text-sky-700 leading-tight text-center px-1"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                maxHeight: "120px",
                overflow: "hidden",
              }}
            >
              {list.title}
            </span>
          </>
        ) : (
          <>
            {/* Desktop: button to toggle collapse; Mobile: whole div is tappable */}
            {!onMobileTap && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleCollapse(list.id); }}
                className="text-slate-700 hover:text-slate-900 text-xs mt-1 transition-colors"
                title="展開"
              >
                <ChevronRight size={16} />
              </button>
            )}
            <span
              className="text-xs font-semibold text-slate-700"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                maxHeight: "160px",
                overflow: "hidden",
              }}
            >
              {list.title}
            </span>
            <span className="text-xs text-slate-600">{cards.length}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setSortableRef}
      style={sortableStyle}
      className="flex-shrink-0 w-[85vw] md:w-72 flex flex-col rounded-xl max-h-full shadow-sm overflow-hidden border border-black/5"
    >
      <ListHeader
        list={list}
        cardCount={cards.length}
        collapsed={collapsed}
        dragHandleProps={dragHandleProps}
        onDeleted={() => onListDeleted(list.id)}
        onColorChange={(color) => onListColorChanged(list.id, color)}
        onToggleCollapse={() => onToggleCollapse(list.id)}
      />

      <div
        ref={setDroppableRef}
        className={`flex-1 overflow-y-auto px-2.5 pb-1 pt-2 space-y-2 min-h-[3rem] list-scroll transition-colors ${
          isOver ? "bg-sky-50/80" : "bg-slate-100/80"
        }`}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>

      <div className="px-2.5 pb-2.5 pt-1.5 bg-slate-100/80">
        <AddCardButton listId={list.id} onCardCreated={onCardCreated} />
      </div>
    </div>
  );
}
