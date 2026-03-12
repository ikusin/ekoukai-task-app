import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BoardView from "@/components/board/BoardView";
import type { ListWithCards, BoardState } from "@/types/app.types";

type Props = {
  params: { boardId: string };
};

export default async function BoardPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify board ownership
  const { data: board } = await supabase
    .from("boards")
    .select("id, title, color, background_image")
    .eq("id", params.boardId)
    .eq("user_id", user.id)
    .single();

  if (!board) notFound();

  // Fetch all lists with cards, labels, members, and checklist progress in one query
  const { data: lists } = await supabase
    .from("lists")
    .select(
      `
      *,
      cards (
        id, list_id, title, description, start_date, due_date, show_in_calendar, order, created_at, updated_at,
        card_labels (
          label_id,
          labels ( id, board_id, name, color )
        ),
        card_members (
          member_id,
          members ( id, board_id, name, color )
        ),
        checklists (
          id,
          checklist_items ( id, is_done )
        )
      )
    `
    )
    .eq("board_id", params.boardId)
    .order("order", { ascending: true })
    .order("order", { ascending: true, foreignTable: "cards" });

  // Build board state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedLists = (lists ?? []) as unknown as ListWithCards[];
  const initialState: BoardState = {
    lists: typedLists.map(({ cards: _, ...list }) => list),
    cardsByList: Object.fromEntries(
      typedLists.map((list) => [list.id, list.cards ?? []])
    ),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Board header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: board.color }}
        />
        <h1 className="text-base font-semibold text-slate-800">{board.title}</h1>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-hidden">
        <BoardView
          boardId={params.boardId}
          initialState={initialState}
          initialBackground={(board as unknown as { background_image: string | null }).background_image ?? null}
        />
      </div>
    </div>
  );
}
