"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
};

export default function ListColumn({
  list,
  cards,
  collapsed,
  onCardCreated,
  onListDeleted,
  onListColorChanged,
  onToggleCollapse,
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
        ref={setSortableRef}
        style={{ ...sortableStyle, backgroundColor: accentColor }}
        className="flex-shrink-0 w-10 flex flex-col items-center rounded-xl py-3 gap-2 border border-black/10 shadow-sm"
      >
        <button
          onClick={() => onToggleCollapse(list.id)}
          className="text-slate-700 hover:text-slate-900 text-xs mt-1 transition-colors"
          title="展開"
        >
          ▶
        </button>
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
      </div>
    );
  }

  return (
    <div
      ref={setSortableRef}
      style={sortableStyle}
      className="flex-shrink-0 w-72 flex flex-col rounded-xl max-h-full shadow-sm overflow-hidden border border-black/5"
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
