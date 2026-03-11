"use client";

import { updateCard } from "@/actions/card.actions";
import { cn, isOverdue, formatDate } from "@/lib/utils";

type Props = {
  cardId: string;
  startDate: string | null;
  dueDate: string | null;
  showInCalendar: boolean;
  onUpdateStart: (date: string | null) => void;
  onUpdateDue: (date: string | null) => void;
  onToggleCalendar: (v: boolean) => void;
};

export default function CardDueDate({
  cardId,
  startDate,
  dueDate,
  showInCalendar,
  onUpdateStart,
  onUpdateDue,
  onToggleCalendar,
}: Props) {
  const overdue = isOverdue(dueDate);

  async function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value || null;
    await updateCard({ id: cardId, start_date: newDate });
    onUpdateStart(newDate);
  }

  async function handleDueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value || null;
    await updateCard({ id: cardId, due_date: newDate });
    onUpdateDue(newDate);
  }

  async function handleToggleCalendar() {
    const newVal = !showInCalendar;
    await updateCard({ id: cardId, show_in_calendar: newVal });
    onToggleCalendar(newVal);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">📅 日程</h3>
        {/* Calendar toggle */}
        <button
          onClick={handleToggleCalendar}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
            showInCalendar
              ? "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200"
              : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
          )}
          title="カレンダーへの表示をON/OFFする"
        >
          <span>{showInCalendar ? "🗓️" : "🚫"}</span>
          <span>カレンダー: {showInCalendar ? "表示" : "非表示"}</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Start date */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-14 flex-shrink-0">開始日</span>
          <input
            type="date"
            defaultValue={startDate ?? ""}
            onChange={handleStartChange}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {startDate && (
            <button
              onClick={async () => {
                await updateCard({ id: cardId, start_date: null });
                onUpdateStart(null);
              }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              削除
            </button>
          )}
        </div>

        {/* Due date */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-14 flex-shrink-0">期日</span>
          <input
            type="date"
            defaultValue={dueDate ?? ""}
            onChange={handleDueChange}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {dueDate && (
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full",
                overdue
                  ? "bg-red-100 text-red-700 font-medium"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {overdue ? "期限切れ" : formatDate(dueDate)}
            </span>
          )}
          {dueDate && (
            <button
              onClick={async () => {
                await updateCard({ id: cardId, due_date: null });
                onUpdateDue(null);
              }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
