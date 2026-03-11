"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { CardWithLabels } from "@/types/app.types";

type CardUpdate = Partial<
  Pick<CardWithLabels, "due_date" | "card_labels" | "card_members" | "checklists">
> & { id: string };

type CardModalContextType = {
  activeCardId: string | null;
  openCard: (cardId: string) => void;
  closeCard: () => void;
  notifyCardChange: (update: CardUpdate) => void;
};

const CardModalContext = createContext<CardModalContextType | null>(null);

type Props = {
  children: React.ReactNode;
  onCardUpdated?: (update: CardUpdate) => void;
};

export function CardModalProvider({ children, onCardUpdated }: Props) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const notifyCardChange = useCallback(
    (update: CardUpdate) => {
      onCardUpdated?.(update);
    },
    [onCardUpdated]
  );

  return (
    <CardModalContext.Provider
      value={{
        activeCardId,
        openCard: (id) => setActiveCardId(id),
        closeCard: () => setActiveCardId(null),
        notifyCardChange,
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
