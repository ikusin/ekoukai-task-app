import type { Database } from "./database.types";

// Base row types
export type Board = Database["public"]["Tables"]["boards"]["Row"];
export type List = Database["public"]["Tables"]["lists"]["Row"];
export type Card = Database["public"]["Tables"]["cards"]["Row"];
export type Label = Database["public"]["Tables"]["labels"]["Row"];
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Checklist = Database["public"]["Tables"]["checklists"]["Row"];
export type ChecklistItem =
  Database["public"]["Tables"]["checklist_items"]["Row"];
export type CardLabel = Database["public"]["Tables"]["card_labels"]["Row"];
export type Comment = Database["public"]["Tables"]["card_comments"]["Row"];
export type CommentWithMember = Comment & {
  members: Member | null;
};
export type ChecklistTemplate =
  Database["public"]["Tables"]["checklist_templates"]["Row"];
export type ChecklistTemplateItem =
  Database["public"]["Tables"]["checklist_template_items"]["Row"];

// Composed types for UI
export type CardWithLabels = Card & {
  card_labels: Array<{
    label_id: string;
    labels: Label;
  }>;
  card_members: Array<{
    member_id: string;
    members: Member;
  }>;
  checklists: Array<{
    id: string;
    checklist_items: Array<{ id: string; is_done: boolean }>;
  }>;
};

export type ListWithCards = List & {
  cards: CardWithLabels[];
};

export type ChecklistWithItems = Checklist & {
  checklist_items: ChecklistItem[];
};

export type CardWithDetails = Card & {
  card_labels: Array<{
    label_id: string;
    labels: Label;
  }>;
  card_members: Array<{
    member_id: string;
    members: Member;
  }>;
  checklists: ChecklistWithItems[];
};

export type ChecklistTemplateWithItems = ChecklistTemplate & {
  checklist_template_items: ChecklistTemplateItem[];
};

// Board state used in BoardView
export type BoardState = {
  lists: List[];
  cardsByList: Record<string, CardWithLabels[]>;
};
