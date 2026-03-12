// Auto-generate with: npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
// This file is manually maintained until the Supabase CLI is set up.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      boards: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          color: string;
          background_image: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          color?: string;
          background_image?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          color?: string;
          background_image?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      lists: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          color: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          color?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          title?: string;
          color?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      labels: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          color: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          name: string;
          color?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          name?: string;
          color?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          list_id: string;
          title: string;
          description: string | null;
          start_date: string | null;
          due_date: string | null;
          show_in_calendar: boolean;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          title: string;
          description?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          show_in_calendar?: boolean;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          title?: string;
          description?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          show_in_calendar?: boolean;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      card_labels: {
        Row: {
          card_id: string;
          label_id: string;
        };
        Insert: {
          card_id: string;
          label_id: string;
        };
        Update: {
          card_id?: string;
          label_id?: string;
        };
      };
      members: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
      };
      card_members: {
        Row: {
          card_id: string;
          member_id: string;
        };
        Insert: {
          card_id: string;
          member_id: string;
        };
        Update: {
          card_id?: string;
          member_id?: string;
        };
      };
      checklists: {
        Row: {
          id: string;
          card_id: string;
          title: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          title?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          title?: string;
        };
      };
      checklist_items: {
        Row: {
          id: string;
          checklist_id: string;
          text: string;
          is_done: boolean;
          order: number;
          due_date: string | null;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          text: string;
          is_done?: boolean;
          order?: number;
          due_date?: string | null;
        };
        Update: {
          id?: string;
          checklist_id?: string;
          text?: string;
          is_done?: boolean;
          order?: number;
          due_date?: string | null;
        };
      };
      checklist_templates: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
        };
      };
      checklist_template_items: {
        Row: {
          id: string;
          template_id: string;
          text: string;
          order: number;
        };
        Insert: {
          id?: string;
          template_id: string;
          text: string;
          order?: number;
        };
        Update: {
          id?: string;
          template_id?: string;
          text?: string;
          order?: number;
        };
      };
      card_comments: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          text?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      move_card: {
        Args: {
          p_card_id: string;
          p_new_list_id: string;
          p_new_order: number;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
