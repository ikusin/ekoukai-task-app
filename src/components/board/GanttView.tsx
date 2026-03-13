"use client";

import { useState, useEffect } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown } from "lucide-react";
import { useCardModal } from "@/context/CardModalContext";
import type { BoardState, CardWithLabels } from "@/types/app.types";

const ROW_H = 38;
const HDR_H = 52;

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

type Props = { boardState: BoardState };

export default function GanttView({ boardState }: Props) {
  const { openCard } = useCardModal();
  const today = startOfDay(new Date());
  const [offset, setOffset] = useState(-14);
  const [collapsedLists, setCollapsedLists] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const DAY_W = isMobile ? 28 : 40;
  const LEFT_W = isMobile ? 140 : 220;
  const VIEW_DAYS = isMobile ? 28 : 42;

  const viewStart = startOfDay(new Date(today));
  viewStart.setDate(today.getDate() + offset);

  const days: Date[] = Array.from({ length: VIEW_DAYS }, (_, i) => {
    const d = new Date(viewStart);
    d.setDate(viewStart.getDate() + i);
    return d;
  });

  const todayCol = dayDiff(viewStart, today);

  type MonthSpan = { label: string; start: number; count: number };
  const months: MonthSpan[] = [];
  days.forEach((day, i) => {
    const label = isMobile
      ? `${day.getMonth() + 1}月`
      : `${day.getFullYear()}年${day.getMonth() + 1}月`;
    if (!months.length || months[months.length - 1].label !== label) {
      months.push({ label, start: i, count: 1 });
    } else {
      months[months.length - 1].count++;
    }
  });

  function getBar(card: CardWithLabels) {
    const s = parseDate(card.start_date);
    const e = parseDate(card.due_date);
    if (!s && !e) return null;
    const barStart = s ?? e!;
    const barEnd = e ?? s!;
    const si = dayDiff(viewStart, barStart);
    const ei = dayDiff(viewStart, barEnd);
    const vs = Math.max(0, si);
    const ve = Math.min(VIEW_DAYS - 1, ei);
    if (vs > ve) return null;
    const overdue = !!e && e < today;
    return { left: vs * DAY_W + 2, width: (ve - vs + 1) * DAY_W - 4, overdue };
  }

  function toggleList(listId: string) {
    setCollapsedLists((prev) => ({ ...prev, [listId]: !prev[listId] }));
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center gap-1 px-3 md:px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
        <button
          onClick={() => setOffset((v) => v - 14)}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
          title="2週間前"
        ><ChevronsLeft size={15} /></button>
        <button
          onClick={() => setOffset((v) => v - 7)}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
          title="1週間前"
        ><ChevronLeft size={15} /></button>
        <button
          onClick={() => setOffset(-14)}
          className="px-2.5 py-1 text-xs bg-sky-50 text-sky-600 hover:bg-sky-100 rounded font-medium"
        >
          今日
        </button>
        <button
          onClick={() => setOffset((v) => v + 7)}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
          title="1週間後"
        ><ChevronRight size={15} /></button>
        <button
          onClick={() => setOffset((v) => v + 14)}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
          title="2週間後"
        ><ChevronsRight size={15} /></button>

        <span className="ml-2 text-xs text-slate-400 hidden md:inline">
          {viewStart.getFullYear()}年{viewStart.getMonth() + 1}月{viewStart.getDate()}日
          〜
          {days[VIEW_DAYS - 1].getFullYear()}年{days[VIEW_DAYS - 1].getMonth() + 1}月{days[VIEW_DAYS - 1].getDate()}日
        </span>
        <span className="ml-2 text-xs text-slate-400 md:hidden">
          {viewStart.getMonth() + 1}/{viewStart.getDate()}
          〜
          {days[VIEW_DAYS - 1].getMonth() + 1}/{days[VIEW_DAYS - 1].getDate()}
        </span>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: LEFT_W + DAY_W * VIEW_DAYS }}>

          {/* ── Date header ── */}
          <div
            className="flex sticky top-0 z-20 bg-white border-b border-slate-200"
            style={{ height: HDR_H }}
          >
            <div
              className="sticky left-0 z-30 bg-white border-r border-slate-200 flex-shrink-0"
              style={{ width: LEFT_W }}
            />
            <div
              className="relative flex-shrink-0"
              style={{ width: DAY_W * VIEW_DAYS }}
            >
              {months.map((m) => (
                <div
                  key={m.start}
                  className="absolute top-0 text-xs font-semibold text-slate-600 px-1.5 flex items-center border-r border-slate-200 truncate"
                  style={{ left: m.start * DAY_W, width: m.count * DAY_W, height: HDR_H / 2 }}
                >
                  {m.label}
                </div>
              ))}
              {days.map((day, i) => {
                const isToday = i === todayCol;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`absolute flex items-center justify-center text-xs border-r border-slate-100 ${
                      isToday
                        ? "bg-sky-500 text-white font-bold"
                        : isWeekend
                        ? "bg-slate-50 text-slate-400"
                        : "text-slate-500"
                    }`}
                    style={{
                      left: i * DAY_W,
                      width: DAY_W,
                      top: HDR_H / 2,
                      height: HDR_H / 2,
                      fontSize: isMobile ? 10 : 12,
                    }}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Lists ── */}
          {boardState.lists.map((list) => {
            const allCards = boardState.cardsByList[list.id] ?? [];
            const scheduled = allCards.filter((c) => c.start_date || c.due_date);
            const listColor = list.color ?? "#94a3b8";
            const isCollapsed = !!collapsedLists[list.id];

            return (
              <div key={list.id}>
                {/* List header row */}
                <div
                  className="flex border-b border-slate-300 bg-slate-100 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                  style={{ height: ROW_H }}
                  onClick={() => toggleList(list.id)}
                >
                  <div
                    className="sticky left-0 z-10 bg-slate-100 hover:bg-slate-200/70 border-r border-slate-300 flex-shrink-0 flex items-center gap-1.5 px-2"
                    style={{ width: LEFT_W }}
                  >
                    <ChevronDown size={13} className={isCollapsed ? "rotate-[-90deg] transition-transform flex-shrink-0" : "transition-transform flex-shrink-0"} />
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: listColor }}
                    />
                    <span className="text-xs font-semibold text-slate-700 truncate flex-1">
                      {list.title}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:inline">
                      {scheduled.length}/{allCards.length}件
                    </span>
                  </div>
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: DAY_W * VIEW_DAYS }}
                  >
                    {todayCol >= 0 && todayCol < VIEW_DAYS && (
                      <div
                        className="absolute inset-y-0 bg-sky-100/40"
                        style={{ left: todayCol * DAY_W, width: DAY_W }}
                      />
                    )}
                  </div>
                </div>

                {/* Card rows */}
                {!isCollapsed && allCards.map((card) => {
                  const bar = getBar(card);
                  const unscheduled = !card.start_date && !card.due_date;
                  return (
                    <div
                      key={card.id}
                      className={`flex border-b border-slate-100 group ${unscheduled ? "bg-slate-50/40 hover:bg-slate-50/80" : "hover:bg-slate-50/70"}`}
                      style={{ height: ROW_H }}
                    >
                      <div
                        className={`sticky left-0 z-10 border-r border-slate-200 flex-shrink-0 flex items-center cursor-pointer ${isMobile ? "pl-5 px-2" : "pl-8 px-3"} ${unscheduled ? "bg-slate-50/40 group-hover:bg-slate-50/80" : "bg-white group-hover:bg-slate-50/70"}`}
                        style={{ width: LEFT_W }}
                        onClick={() => openCard(card.id)}
                      >
                        <span className={`text-xs truncate hover:text-sky-600 transition-colors ${unscheduled ? "text-slate-400 italic" : "text-slate-600"}`}>
                          {card.title}
                        </span>
                      </div>

                      <div
                        className="relative flex-shrink-0"
                        style={{ width: DAY_W * VIEW_DAYS }}
                      >
                        {days.map((day, i) => {
                          const isToday = i === todayCol;
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          if (!isToday && !isWeekend) return null;
                          return (
                            <div
                              key={i}
                              className={`absolute inset-y-0 ${isToday ? "bg-sky-50/50" : "bg-slate-50"}`}
                              style={{ left: i * DAY_W, width: DAY_W }}
                            />
                          );
                        })}

                        {todayCol >= 0 && todayCol < VIEW_DAYS && (
                          <div
                            className="absolute inset-y-0 w-px bg-sky-400/50"
                            style={{ left: todayCol * DAY_W + DAY_W / 2 }}
                          />
                        )}

                        {bar ? (
                          <div
                            className="absolute rounded cursor-pointer flex items-center px-1.5 text-white text-xs font-medium overflow-hidden hover:brightness-110 transition-all shadow-sm"
                            style={{
                              left: bar.left,
                              width: Math.max(bar.width, 8),
                              top: "50%",
                              transform: "translateY(-50%)",
                              height: 22,
                              backgroundColor: bar.overdue ? "#f87171" : listColor,
                            }}
                            onClick={() => openCard(card.id)}
                            title={`${card.title}${card.start_date ? `\n開始: ${card.start_date}` : ""}${card.due_date ? `\n期日: ${card.due_date}` : ""}`}
                          >
                            {bar.width >= (isMobile ? 32 : 44) && (
                              <span className="truncate drop-shadow-sm">{card.title}</span>
                            )}
                          </div>
                        ) : (
                          <div
                            className="absolute inset-y-0 flex items-center cursor-pointer"
                            style={{ left: 4, right: 4 }}
                            onClick={() => openCard(card.id)}
                            title="期日未設定 — クリックして設定"
                          >
                            <div
                              className="w-full h-px"
                              style={{ borderTop: `1.5px dashed ${listColor}40` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
