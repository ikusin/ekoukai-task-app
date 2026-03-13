"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Trash2 } from "lucide-react";
import { useCardModal } from "@/context/CardModalContext";
import { deleteCard } from "@/actions/card.actions";
import CardDuplicateButton from "./CardDuplicateButton";
import CardTitle from "./CardTitle";
import CardDescription from "./CardDescription";
import CardDueDate from "./CardDueDate";
import CardLabels from "./CardLabels";
import CardChecklist from "./CardChecklist";
import CardMembers from "./CardMembers";
import CardComments from "./CardComments";
import AddChecklistButton from "./AddChecklistButton";
import ChecklistTemplateManager from "./ChecklistTemplateManager";
import type {
  CardWithDetails,
  Label,
  Member,
  ChecklistWithItems,
  Comment,
  ChecklistTemplateWithItems,
} from "@/types/app.types";

export default function CardModal() {
  const {
    boardId,
    activeCardId,
    activeCardData,
    loading,
    closeCard,
    notifyCardChange,
    notifyCardDeleted,
  } = useCardModal();

  const [card, setCard] = useState<CardWithDetails | null>(null);
  const [boardLabels, setBoardLabels] = useState<Label[]>([]);
  const [boardMembers, setBoardMembers] = useState<Member[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplateWithItems[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Initialize local state from context cache whenever the active card data changes
  useEffect(() => {
    if (!activeCardData) {
      setCard(null);
      setBoardLabels([]);
      setBoardMembers([]);
      setComments([]);
      setTemplates([]);
      setShowTemplateManager(false);
      return;
    }
    setCard(activeCardData.card);
    setBoardLabels(activeCardData.boardLabels);
    setBoardMembers(activeCardData.boardMembers);
    setComments(activeCardData.comments);
    setTemplates(activeCardData.templates);
  }, [activeCardData]);

  async function handleDeleteCard() {
    if (!card) return;
    if (!confirm(`「${card.title}」を削除しますか？`)) return;
    notifyCardDeleted(card.id);
    closeCard();
    await deleteCard(card.id);
  }

  function handleChecklistCreated(checklist: ChecklistWithItems) {
    setCard((prev) =>
      prev
        ? { ...prev, checklists: [...prev.checklists, checklist] }
        : prev
    );
  }

  return (
    <Dialog.Root
      open={!!activeCardId}
      onOpenChange={(open) => !open && closeCard()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[96vw] max-w-6xl max-h-[92vh] z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : card ? (
            <div className="flex flex-col md:flex-row h-full max-h-[92vh]">
              {/* Left: card details */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <CardTitle
                      cardId={card.id}
                      title={card.title}
                      onUpdate={(title) =>
                        setCard((prev) => (prev ? { ...prev, title } : prev))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <CardDuplicateButton cardId={card.id} />
                    <button
                      onClick={handleDeleteCard}
                      className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                    <Dialog.Close asChild>
                      <button className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors">
                        <X size={18} />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-6">
                  {/* Description */}
                  <CardDescription
                    cardId={card.id}
                    description={card.description}
                    onUpdate={(desc) =>
                      setCard((prev) =>
                        prev ? { ...prev, description: desc } : prev
                      )
                    }
                  />

                  {/* Dates */}
                  <CardDueDate
                    cardId={card.id}
                    startDate={card.start_date ?? null}
                    dueDate={card.due_date}
                    showInCalendar={card.show_in_calendar ?? true}
                    onUpdateStart={(date) => {
                      setCard((prev) =>
                        prev ? { ...prev, start_date: date } : prev
                      );
                    }}
                    onUpdateDue={(date) => {
                      setCard((prev) =>
                        prev ? { ...prev, due_date: date } : prev
                      );
                      notifyCardChange({ id: card.id, due_date: date });
                    }}
                    onToggleCalendar={(v) => {
                      setCard((prev) =>
                        prev ? { ...prev, show_in_calendar: v } : prev
                      );
                    }}
                  />

                  {/* Members */}
                  <CardMembers
                    cardId={card.id}
                    boardId={boardId}
                    activeMembers={card.card_members.map((cm) => cm.members)}
                    boardMembers={boardMembers}
                    onUpdate={(members) => {
                      const card_members = members.map((m) => ({
                        member_id: m.id,
                        members: m,
                      }));
                      setCard((prev) =>
                        prev ? { ...prev, card_members } : prev
                      );
                      notifyCardChange({ id: card.id, card_members });
                    }}
                  />

                  {/* Labels */}
                  <CardLabels
                    cardId={card.id}
                    boardId={boardId}
                    activeLabels={card.card_labels.map((cl) => cl.labels)}
                    boardLabels={boardLabels}
                    onUpdate={(labels) => {
                      const card_labels = labels.map((l) => ({
                        label_id: l.id,
                        labels: l,
                      }));
                      setCard((prev) =>
                        prev ? { ...prev, card_labels } : prev
                      );
                      notifyCardChange({ id: card.id, card_labels });
                    }}
                  />

                  {/* Checklists */}
                  {card.checklists.map((checklist) => (
                    <CardChecklist
                      key={checklist.id}
                      checklist={checklist}
                      boardMembers={boardMembers}
                      onTemplateSaved={(tpl) =>
                        setTemplates((prev) => [tpl, ...prev])
                      }
                      onDeleted={(id) => {
                        const newChecklists = card.checklists.filter(
                          (c) => c.id !== id
                        );
                        setCard((prev) =>
                          prev ? { ...prev, checklists: newChecklists } : prev
                        );
                        notifyCardChange({
                          id: card.id,
                          checklists: newChecklists.map((c) => ({
                            id: c.id,
                            checklist_items: c.checklist_items.map((i) => ({
                              id: i.id,
                              is_done: i.is_done,
                            })),
                          })),
                        });
                      }}
                      onUpdated={(updated: ChecklistWithItems) => {
                        const newChecklists = card.checklists.map((c) =>
                          c.id === updated.id ? updated : c
                        );
                        setCard((prev) =>
                          prev ? { ...prev, checklists: newChecklists } : prev
                        );
                        notifyCardChange({
                          id: card.id,
                          checklists: newChecklists.map((c) => ({
                            id: c.id,
                            checklist_items: c.checklist_items.map((i) => ({
                              id: i.id,
                              is_done: i.is_done,
                            })),
                          })),
                        });
                      }}
                    />
                  ))}

                  {/* Add checklist */}
                  <AddChecklistButton
                    cardId={card.id}
                    templates={templates}
                    onCreated={handleChecklistCreated}
                    onOpenManager={() => setShowTemplateManager(true)}
                  />

                  {/* Template manager (inline) */}
                  {showTemplateManager && (
                    <ChecklistTemplateManager
                      templates={templates}
                      onDeleted={(id) =>
                        setTemplates((prev) => prev.filter((t) => t.id !== id))
                      }
                      onClose={() => setShowTemplateManager(false)}
                    />
                  )}
                </div>
              </div>

              {/* Right: comments panel */}
              <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 overflow-y-auto p-4 md:p-5 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                <CardComments
                  cardId={card.id}
                  initialComments={comments}
                />
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
