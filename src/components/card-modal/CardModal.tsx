"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { createClient } from "@/lib/supabase/client";
import { useCardModal } from "@/context/CardModalContext";
import { deleteCard } from "@/actions/card.actions";
import { getTemplates } from "@/actions/checklist.actions";
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
  const { activeCardId, closeCard, notifyCardChange, notifyCardDeleted } = useCardModal();
  const [card, setCard] = useState<CardWithDetails | null>(null);
  const [boardLabels, setBoardLabels] = useState<Label[]>([]);
  const [boardMembers, setBoardMembers] = useState<Member[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplateWithItems[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [boardId, setBoardId] = useState<string | undefined>();

  useEffect(() => {
    if (!activeCardId) {
      setCard(null);
      setBoardId(undefined);
      setComments([]);
      setShowTemplateManager(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    async function fetchCard() {
      const { data } = await supabase
        .from("cards")
        .select(
          `
          *,
          card_labels ( label_id, labels ( id, board_id, name, color ) ),
          card_members ( member_id, members ( id, board_id, name, color ) ),
          checklists (
            id, card_id, title,
            checklist_items ( id, checklist_id, text, is_done, order, due_date )
          )
        `
        )
        .eq("id", activeCardId!)
        .single();

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData = data as any;
        const normalized: CardWithDetails = {
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
          checklists: (rawData.checklists ?? []).map(
            (c: ChecklistWithItems) => ({
              ...c,
              checklist_items: c.checklist_items ?? [],
            })
          ),
        };
        setCard(normalized);

        // Fetch board labels, members, comments, and templates
        const listData = await supabase
          .from("lists")
          .select("board_id")
          .eq("id", data.list_id)
          .single();

        if (listData.data) {
          const bId = (listData.data as { board_id: string }).board_id;
          setBoardId(bId);

          const [labelsData, membersData, commentsData] = await Promise.all([
            supabase.from("labels").select("*").eq("board_id", bId),
            supabase.from("members").select("*").eq("board_id", bId),
            supabase
              .from("card_comments")
              .select("*")
              .eq("card_id", activeCardId!)
              .order("created_at", { ascending: true }),
          ]);
          setBoardLabels((labelsData.data as Label[]) ?? []);
          setBoardMembers((membersData.data as Member[]) ?? []);
          setComments((commentsData.data as Comment[]) ?? []);
        }

        // Fetch templates (user-scoped, not board-scoped)
        const tplResult = await getTemplates();
        if (tplResult.data) setTemplates(tplResult.data);
      }
      setLoading(false);
    }

    fetchCard();
  }, [activeCardId]);

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
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : card ? (
            <div className="flex h-full max-h-[90vh]">
              {/* Left: card details */}
              <div className="flex-1 overflow-y-auto p-6 min-w-0">
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CardDuplicateButton cardId={card.id} />
                    <button
                      onClick={handleDeleteCard}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      削除
                    </button>
                    <Dialog.Close asChild>
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        ✕
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
                  {boardId && (
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
                  )}

                  {/* Labels */}
                  {boardId && (
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
                  )}

                  {/* Checklists */}
                  {card.checklists.map((checklist) => (
                    <CardChecklist
                      key={checklist.id}
                      checklist={checklist}
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
              <div className="w-80 border-l border-slate-200 overflow-y-auto p-4 bg-slate-50 flex-shrink-0">
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
