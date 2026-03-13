import { useState } from "react";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { moveCard } from "@/actions/card.actions";
import { reorderLists } from "@/actions/list.actions";
import type { BoardState, CardWithLabels, List } from "@/types/app.types";

export function useDragAndDrop(
  boardState: BoardState,
  setBoardState: React.Dispatch<React.SetStateAction<BoardState>>,
  boardId: string,
  collapsedLists: Record<string, boolean>
) {
  const [activeCard, setActiveCard] = useState<CardWithLabels | null>(null);
  const [activeList, setActiveList] = useState<List | null>(null);

  function findListIdForCard(cardId: string): string | null {
    for (const [listId, cards] of Object.entries(boardState.cardsByList)) {
      if (cards.some((c) => c.id === cardId)) return listId;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type as string | undefined;
    const id = event.active.id as string;

    if (type === "list") {
      const list = boardState.lists.find((l) => l.id === id);
      setActiveList(list ?? null);
    } else {
      const listId = findListIdForCard(id);
      if (!listId) return;
      const card = boardState.cardsByList[listId]?.find((c) => c.id === id);
      setActiveCard(card ?? null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const type = active.data.current?.type as string | undefined;

    // List reordering — optimistic preview
    if (type === "list") {
      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      setBoardState((prev) => {
        const oldIndex = prev.lists.findIndex((l) => l.id === activeId);
        const newIndex = prev.lists.findIndex((l) => l.id === overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return { ...prev, lists: arrayMove(prev.lists, oldIndex, newIndex) };
      });
      return;
    }

    // Card cross-list move
    const activeCardId = active.id as string;
    const overId = over.id as string;

    const activeListId = findListIdForCard(activeCardId);
    if (!activeListId) return;

    // overId may be a card id, a list id, or "drop-{listId}"
    const resolvedOverId = overId.startsWith("drop-")
      ? overId.slice(5)
      : overId;
    const overListId =
      boardState.cardsByList[resolvedOverId] !== undefined
        ? resolvedOverId
        : findListIdForCard(resolvedOverId);

    if (!overListId || activeListId === overListId) return;

    // Skip optimistic move for collapsed lists:
    // collapsed lists have no SortableContext, so moving a card there would
    // unmount the CardItem during an active drag and confuse dnd-kit.
    if (collapsedLists[overListId]) return;

    setBoardState((prev) => {
      const activeCards = [...(prev.cardsByList[activeListId] ?? [])];
      const overCards = [...(prev.cardsByList[overListId] ?? [])];

      const cardIndex = activeCards.findIndex((c) => c.id === activeCardId);
      if (cardIndex === -1) return prev;

      const [movedCard] = activeCards.splice(cardIndex, 1);
      const overCardIndex = overCards.findIndex((c) => c.id === overId);
      const insertIndex =
        overCardIndex === -1 ? overCards.length : overCardIndex;
      overCards.splice(insertIndex, 0, movedCard);

      return {
        ...prev,
        cardsByList: {
          ...prev.cardsByList,
          [activeListId]: activeCards,
          [overListId]: overCards,
        },
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const type = active.data.current?.type as string | undefined;

    if (type === "list") {
      setActiveList(null);
      // State already updated optimistically in handleDragOver; persist to DB
      reorderLists(
        boardState.lists.map((l) => l.id),
        boardId
      ).catch(() => window.location.reload());
      return;
    }

    setActiveCard(null);
    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    // Where is the card right now in state?
    const currentListId = findListIdForCard(activeCardId);
    if (!currentListId) return;

    const resolvedId = overId.startsWith("drop-") ? overId.slice(5) : overId;
    const targetListId =
      boardState.cardsByList[resolvedId] !== undefined
        ? resolvedId
        : currentListId;

    // Reorder within same list (expanded lists only — card is already there
    // due to optimistic handleDragOver update)
    if (currentListId === targetListId && activeCardId !== overId) {
      setBoardState((prev) => {
        const listCards = [...(prev.cardsByList[currentListId] ?? [])];
        const oldIndex = listCards.findIndex((c) => c.id === activeCardId);
        const newIndex = listCards.findIndex((c) => c.id === overId);

        if (oldIndex === -1 || newIndex === -1) return prev;

        return {
          ...prev,
          cardsByList: {
            ...prev.cardsByList,
            [currentListId]: arrayMove(listCards, oldIndex, newIndex),
          },
        };
      });
    }

    // Dropped on a collapsed list: handleDragOver skipped the optimistic move,
    // so we apply the state change here at drop time.
    if (currentListId !== targetListId && collapsedLists[targetListId]) {
      setBoardState((prev) => {
        const from = [...(prev.cardsByList[currentListId] ?? [])];
        const to = [...(prev.cardsByList[targetListId] ?? [])];
        const idx = from.findIndex((c) => c.id === activeCardId);
        if (idx === -1) return prev;
        const [movedCard] = from.splice(idx, 1);
        to.push(movedCard);
        return {
          ...prev,
          cardsByList: {
            ...prev.cardsByList,
            [currentListId]: from,
            [targetListId]: to,
          },
        };
      });
    }

    const targetCards = boardState.cardsByList[targetListId] ?? [];
    const newIndex = targetCards.findIndex((c) => c.id === activeCardId);
    const finalIndex = newIndex === -1 ? targetCards.length : newIndex;

    moveCard(activeCardId, targetListId, finalIndex).catch(() => {
      window.location.reload();
    });
  }

  return {
    activeCard,
    activeList,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
