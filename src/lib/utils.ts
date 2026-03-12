import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

/**
 * 名前の中に "X" 形式でアイコン文字が指定されている場合はそれを使用する。
 * 例: 宮田"田" → "田", "原"宮原 → "原"
 * 指定がなければ先頭文字を使用。
 */
export function getMemberInitials(name: string): string {
  const match = name.match(/"([^"]+)"/);
  if (match) return match[1].slice(0, 2);
  return name.replace(/"[^"]*"/g, "").trim().slice(0, 1) || name.slice(0, 1);
}

/**
 * 名前から "..." のアイコン指定部分を除いた表示用の名前を返す。
 * 例: 宮田"田" → 宮田
 */
export function getMemberDisplayName(name: string): string {
  return name.replace(/"[^"]*"/g, "").trim() || name;
}
