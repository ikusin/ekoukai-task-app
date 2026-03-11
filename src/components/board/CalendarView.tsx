"use client";

import { useState } from "react";
import { useCardModal } from "@/context/CardModalContext";
import { isOverdue } from "@/lib/utils";
import type { BoardState, CardWithLabels } from "@/types/app.types";

type Props = {
  boardState: BoardState;
};

const DAY_HEADERS = ["日", "月", "火", "水", "木", "金", "土"];

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${padTwo(month + 1)}-${padTwo(day)}`;
}

type CardEntry = {
  card: CardWithLabels;
  position: "single" | "start" | "middle" | "end";
};

export default function CalendarView({ boardState }: Props) {
  const { openCard } = useCardModal();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showRange, setShowRange] = useState(false);

  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const allCards = Object.values(boardState.cardsByList)
    .flat()
    .filter((c) => c.show_in_calendar !== false);

  // Build per-date card list
  function getCardsForDate(dateKey: string): CardEntry[] {
    if (!showRange) {
      // Due-date only mode
      return allCards
        .filter((c) => c.due_date === dateKey)
        .map((card) => ({ card, position: "single" as const }));
    }

    // Range mode: show card on every day between start_date and due_date
    const result: CardEntry[] = [];
    for (const card of allCards) {
      if (!card.due_date) continue;
      const startKey = card.start_date ?? card.due_date;
      const endKey = card.due_date;
      if (dateKey < startKey || dateKey > endKey) continue;

      let position: CardEntry["position"];
      if (startKey === endKey) position = "single";
      else if (dateKey === startKey) position = "start";
      else if (dateKey === endKey) position = "end";
      else position = "middle";
      result.push({ card, position });
    }
    return result;
  }

  // Calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-slate-200/60 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-600 transition-colors"
        >
          ◀
        </button>
        <h2 className="text-base font-semibold text-slate-800 min-w-[120px] text-center">
          {year}年{month + 1}月
        </h2>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-600 transition-colors"
        >
          ▶
        </button>
        <button
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
          className="px-3 py-1 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
        >
          今月
        </button>

        {/* Range toggle */}
        <button
          onClick={() => setShowRange((v) => !v)}
          className={`ml-auto px-3 py-1 text-sm rounded-lg border transition-colors ${
            showRange
              ? "bg-sky-500 text-white border-sky-500"
              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
          }`}
        >
          {showRange ? "📅 範囲表示: ON" : "📅 範囲表示: OFF"}
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-1 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="min-h-[80px]" />;

          const dateKey = toDateKey(year, month, day);
          const entries = getCardsForDate(dateKey);
          const isToday = dateKey === todayKey;
          const dayOfWeek = i % 7;

          return (
            <div
              key={dateKey}
              className={`min-h-[80px] bg-white rounded-lg p-1.5 border transition-colors ${
                isToday ? "border-sky-500 ring-1 ring-sky-300" : "border-slate-200"
              }`}
            >
              {/* Day number */}
              <div className="mb-1">
                <span
                  className={`text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full ${
                    isToday
                      ? "bg-sky-500 text-white"
                      : dayOfWeek === 0
                      ? "text-red-500"
                      : dayOfWeek === 6
                      ? "text-blue-500"
                      : "text-slate-600"
                  }`}
                >
                  {day}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-0.5">
                {entries.map(({ card, position }) => {
                  const overdue = isOverdue(card.due_date);
                  const labelColor = card.card_labels?.[0]?.labels?.color ?? null;

                  // Color and prefix by position
                  const bgClass =
                    position === "start"
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : position === "middle"
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : overdue
                      ? "bg-red-100 text-red-800 hover:bg-red-200"
                      : "bg-sky-100 text-sky-800 hover:bg-sky-200";

                  const prefix =
                    position === "start"
                      ? "▶ "
                      : position === "middle"
                      ? "─ "
                      : position === "end"
                      ? "◀ "
                      : "";

                  return (
                    <button
                      key={card.id}
                      onClick={() => openCard(card.id)}
                      className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate transition-colors ${bgClass}`}
                    >
                      {labelColor && (
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1 flex-shrink-0 align-middle"
                          style={{ backgroundColor: labelColor }}
                        />
                      )}
                      {prefix}{card.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
