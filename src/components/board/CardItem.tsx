"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCardModal } from "@/context/CardModalContext";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import type { CardWithLabels } from "@/types/app.types";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Props = {
  card: CardWithLabels;
  isOverlay?: boolean;
};

export default function CardItem({ card, isOverlay = false }: Props) {
  const { openCard } = useCardModal();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue = isOverdue(card.due_date);
  const hasDueDate = !!card.due_date;

  const totalItems = card.checklists.reduce(
    (sum, cl) => sum + cl.checklist_items.length,
    0
  );
  const doneItems = card.checklists.reduce(
    (sum, cl) => sum + cl.checklist_items.filter((i) => i.is_done).length,
    0
  );
  const hasChecklist = totalItems > 0;
  const checklistDone = hasChecklist && doneItems === totalItems;

  const hasMembers = card.card_members.length > 0;
  const hasFooter = hasDueDate || hasChecklist || hasMembers;

  return (
    <div
      ref={setNodeRef}
      style={isOverlay ? undefined : style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          openCard(card.id);
        }
      }}
      className={cn(
        "bg-white rounded-xl p-3 border border-slate-200/80 cursor-grab active:cursor-grabbing",
        "shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150",
        isOverlay && "rotate-1 shadow-xl cursor-grabbing",
        isDragging && "border-sky-300"
      )}
    >
      {/* Label bars */}
      {card.card_labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {card.card_labels.map(({ labels }) => (
            <span
              key={labels.id}
              className="inline-block w-8 h-1.5 rounded-full"
              style={{ backgroundColor: labels.color }}
              title={labels.name}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-slate-800 leading-snug">{card.title}</p>

      {/* Metadata footer */}
      {hasFooter && (
        <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
          {hasDueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                overdue
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : "bg-slate-50 text-slate-500 border border-slate-100"
              )}
            >
              📅 {formatDate(card.due_date)}
            </span>
          )}

          {hasChecklist && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                checklistDone
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-slate-50 text-slate-500 border border-slate-100"
              )}
            >
              ☑ {doneItems}/{totalItems}
            </span>
          )}

          {hasMembers && (
            <div className="flex -space-x-1.5 ml-auto">
              {card.card_members.slice(0, 4).map(({ members }) => (
                <span
                  key={members.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm"
                  style={{ backgroundColor: members.color }}
                  title={members.name}
                >
                  {getInitials(members.name)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
