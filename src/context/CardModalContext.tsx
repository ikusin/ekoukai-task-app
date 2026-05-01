"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTemplates } from "@/actions/checklist.actions";
import type {
  CardWithDetails,
  CardWithLabels,
  Label,
  List,
  Member,
  CommentWithMember,
  ChecklistWithItems,
  ChecklistTemplateWithItems,
} from "@/types/app.types";

type CardUpdate = Partial<
  Pick<CardWithLabels, "due_date" | "card_labels" | "card_members" | "checklists">
> & { id: string };

export type CachedCardData = {
  card: CardWithDetails;
  boardLabels: Label[];
  boardMembers: Member[];
  boardLists: List[];
  comments: CommentWithMember[];
  templates: ChecklistTemplateWithItems[];
};

type CardModalContextType = {
  boardId: string;
  activeCardId: string | null;
  activeCardData: CachedCardData | null;
  boardLists: List[];
  loading: boolean;
  openCard: (cardId: string) => void;
  closeCard: () => void;
  prefetchCard: (cardId: string) => void;
  notifyCardChange: (update: CardUpdate) => void;
  notifyCardDeleted: (cardId: string) => void;
};

const CardModalContext = createContext<CardModalContextType | null>(null);

type Props = {
  boardId: string;
  children: React.ReactNode;
  onCardUpdated?: (update: CardUpdate) => void;
  onCardDeleted?: (cardId: string) => void;
};

export function CardModalProvider({ boardId, children, onCardUpdated, onCardDeleted }: Props) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeCardData, setActiveCardData] = useState<CachedCardData | null>(null);
  const [loading, setLoading] = useState(false);

  const cardCache = useRef<Map<string, CachedCardData>>(new Map());
  const fetchPromises = useRef<Map<string, Promise<CachedCardData | null>>>(new Map());
  const prefetchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const openCardIdRef = useRef<string | null>(null);

  function doFetchAndCache(cardId: string): Promise<CachedCardData | null> {
    // Return in-flight promise if already fetching
    const existing = fetchPromises.current.get(cardId);
    if (existing) return existing;

    const supabase = createClient();
    const promise = Promise.all([
      supabase
        .from("cards")
        .select(
          `*, card_labels(label_id, labels(id,board_id,name,color)), card_members(member_id, members(id,board_id,name,color)), checklists(id,card_id,title, checklist_items(id,checklist_id,text,is_done,order,due_date,assignee_id))`
        )
        .eq("id", cardId)
        .single(),
      supabase.from("labels").select("*").eq("board_id", boardId),
      supabase.from("members").select("*").eq("board_id", boardId),
      supabase.from("lists").select("*").eq("board_id", boardId).order("order", { ascending: true }),
      supabase
        .from("card_comments")
        .select("*, members(*)")
        .eq("card_id", cardId)
        .order("created_at", { ascending: true }),
      getTemplates(),
    ]).then(([cardRes, labelsRes, membersRes, listsRes, commentsRes, tplResult]) => {
      fetchPromises.current.delete(cardId);
      if (!cardRes.data) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = cardRes.data as any;
      const card: CardWithDetails = {
        ...rawData,
        card_labels: (rawData.card_labels ?? []).map(
          (cl: { label_id: string; labels: Label | Label[] }) => ({
            label_id: cl.label_id,
            labels: Array.isArray(cl.labels) ? cl.labels[0] : cl.labels,
          })
        ),
        card_members: (rawData.card_members ?? []).map(
          (cm: { member_id: string; members: Member | Member[] }) => ({
            member_id: cm.member_id,
            members: Array.isArray(cm.members) ? cm.members[0] : cm.members,
          })
        ),
        checklists: (rawData.checklists ?? []).map((c: ChecklistWithItems) => ({
          ...c,
          checklist_items: c.checklist_items ?? [],
        })),
      };

      const data: CachedCardData = {
        card,
        boardLabels: (labelsRes.data as Label[]) ?? [],
        boardMembers: (membersRes.data as Member[]) ?? [],
        boardLists: (listsRes.data as List[]) ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comments: ((commentsRes.data ?? []) as any[]).map((c) => ({
          ...c,
          members: Array.isArray(c.members) ? (c.members[0] ?? null) : (c.members ?? null),
        })) as CommentWithMember[],
        templates: tplResult.data ?? [],
      };

      cardCache.current.set(cardId, data);
      return data;
    });

    fetchPromises.current.set(cardId, promise);
    return promise;
  }

  function prefetchCard(cardId: string) {
    if (cardCache.current.has(cardId) || fetchPromises.current.has(cardId)) return;
    if (prefetchTimers.current.has(cardId)) return;
    const timer = setTimeout(() => {
      prefetchTimers.current.delete(cardId);
      doFetchAndCache(cardId).catch(() => {
        // Prefetch failed silently — will retry on actual open
      });
    }, 200);
    prefetchTimers.current.set(cardId, timer);
  }

  function openCard(cardId: string) {
    // Cancel any pending prefetch timer — we're opening now
    const timer = prefetchTimers.current.get(cardId);
    if (timer) {
      clearTimeout(timer);
      prefetchTimers.current.delete(cardId);
    }

    openCardIdRef.current = cardId;
    setActiveCardId(cardId);

    // Cache hit → instant display, no spinner
    const cached = cardCache.current.get(cardId);
    if (cached) {
      setActiveCardData(cached);
      setLoading(false);
      return;
    }

    // Not cached → show spinner, fetch (or await in-flight prefetch)
    setActiveCardData(null);
    setLoading(true);
    doFetchAndCache(cardId)
      .then((data) => {
        if (openCardIdRef.current === cardId) {
          setActiveCardData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (openCardIdRef.current === cardId) {
          setLoading(false);
        }
      });
  }

  function closeCard() {
    openCardIdRef.current = null;
    setActiveCardId(null);
    setActiveCardData(null);
    setLoading(false);
  }

  const notifyCardChange = useCallback(
    (update: CardUpdate) => {
      cardCache.current.delete(update.id);
      onCardUpdated?.(update);
    },
    [onCardUpdated]
  );

  const notifyCardDeleted = useCallback(
    (cardId: string) => {
      cardCache.current.delete(cardId);
      onCardDeleted?.(cardId);
    },
    [onCardDeleted]
  );

  return (
    <CardModalContext.Provider
      value={{
        boardId,
        activeCardId,
        activeCardData,
        boardLists: activeCardData?.boardLists ?? [],
        loading,
        openCard,
        closeCard,
        prefetchCard,
        notifyCardChange,
        notifyCardDeleted,
      }}
    >
      {children}
    </CardModalContext.Provider>
  );
}

export function useCardModal() {
  const ctx = useContext(CardModalContext);
  if (!ctx) throw new Error("useCardModal must be inside CardModalProvider");
  return ctx;
}
