-- ============================================================
-- Kanban Task Manager - Initial Schema
-- Run this in the Supabase SQL editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- BOARDS
-- ============================================================
create table public.boards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  color      text not null default '#0ea5e9',
  "order"    integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boards_user_id_idx on public.boards(user_id);

-- ============================================================
-- LISTS
-- ============================================================
create table public.lists (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  title      text not null,
  "order"    integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lists_board_id_idx on public.lists(board_id);

-- ============================================================
-- LABELS (board-scoped)
-- ============================================================
create table public.labels (
  id       uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name     text not null,
  color    text not null default '#22c55e'
);

create index labels_board_id_idx on public.labels(board_id);

-- ============================================================
-- CARDS
-- ============================================================
create table public.cards (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists(id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index cards_list_id_idx on public.cards(list_id);

-- ============================================================
-- CARD_LABELS (junction)
-- ============================================================
create table public.card_labels (
  card_id  uuid not null references public.cards(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (card_id, label_id)
);

-- ============================================================
-- CHECKLISTS
-- ============================================================
create table public.checklists (
  id      uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  title   text not null default 'Checklist'
);

create index checklists_card_id_idx on public.checklists(card_id);

-- ============================================================
-- CHECKLIST_ITEMS
-- ============================================================
create table public.checklist_items (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  text         text not null,
  is_done      boolean not null default false,
  "order"      integer not null default 0
);

create index checklist_items_checklist_id_idx on public.checklist_items(checklist_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger boards_updated_at before update on public.boards
  for each row execute function public.set_updated_at();
create trigger lists_updated_at before update on public.lists
  for each row execute function public.set_updated_at();
create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.boards          enable row level security;
alter table public.lists           enable row level security;
alter table public.labels          enable row level security;
alter table public.cards           enable row level security;
alter table public.card_labels     enable row level security;
alter table public.checklists      enable row level security;
alter table public.checklist_items enable row level security;

-- BOARDS
create policy "boards: own rows" on public.boards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- LISTS
create policy "lists: via board ownership" on public.lists
  for all
  using (
    exists (
      select 1 from public.boards
      where boards.id = lists.board_id and boards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.boards
      where boards.id = lists.board_id and boards.user_id = auth.uid()
    )
  );

-- LABELS
create policy "labels: via board ownership" on public.labels
  for all
  using (
    exists (
      select 1 from public.boards
      where boards.id = labels.board_id and boards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.boards
      where boards.id = labels.board_id and boards.user_id = auth.uid()
    )
  );

-- CARDS
create policy "cards: via board ownership" on public.cards
  for all
  using (
    exists (
      select 1 from public.lists
      join public.boards on boards.id = lists.board_id
      where lists.id = cards.list_id and boards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists
      join public.boards on boards.id = lists.board_id
      where lists.id = cards.list_id and boards.user_id = auth.uid()
    )
  );

-- CARD_LABELS
create policy "card_labels: via board ownership" on public.card_labels
  for all
  using (
    exists (
      select 1 from public.cards
      join public.lists on lists.id = cards.list_id
      join public.boards on boards.id = lists.board_id
      where cards.id = card_labels.card_id and boards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cards
      join public.lists on lists.id = cards.list_id
      join public.boards on boards.id = lists.board_id
      where cards.id = card_labels.card_id and boards.user_id = auth.uid()
    )
  );

-- CHECKLISTS
create policy "checklists: via board ownership" on public.checklists
  for all
  using (
    exists (
      select 1 from public.cards
      join public.lists on lists.id = cards.list_id
      join public.boards on boards.id = lists.board_id
      where cards.id = checklists.card_id and boards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cards
      join public.lists on lists.id = cards.list_id
      join public.boards on boards.id = lists.board_id
      where cards.id = checklists.card_id and boards.user_id = auth.uid()
    )
  );

-- CHECKLIST_ITEMS
create policy "checklist_items: via board ownership" on public.checklist_items
  for all
  using (
    exists (
      select 1 from public.checklists
      join public.cards on cards.id = checklists.card_id
      join public.lists on lists.id = cards.list_id
      join public.boards on boards.id = lists.board_id
      where checklists.id = checklist_items.checklist_id
        and boards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.checklists
      join public.cards on cards.id = checklists.card_id
      join public.lists on lists.id = cards.list_id
      join public.boards on boards.id = lists.board_id
      where checklists.id = checklist_items.checklist_id
        and boards.user_id = auth.uid()
    )
  );

-- ============================================================
-- move_card RPC (atomic card reorder across lists)
-- ============================================================
create or replace function public.move_card(
  p_card_id    uuid,
  p_new_list_id uuid,
  p_new_order  integer
)
returns void
language plpgsql
security definer
as $$
declare
  v_old_list_id uuid;
begin
  -- Get old list
  select list_id into v_old_list_id from public.cards where id = p_card_id;

  -- Move card to new list
  update public.cards
    set list_id = p_new_list_id,
        "order" = p_new_order,
        updated_at = now()
  where id = p_card_id;

  -- Compact old list orders (skip moved card)
  update public.cards
    set "order" = sub.new_order
  from (
    select id,
           row_number() over (order by "order") - 1 as new_order
    from public.cards
    where list_id = v_old_list_id
      and id != p_card_id
  ) sub
  where public.cards.id = sub.id
    and list_id = v_old_list_id;

  -- Shift up cards in new list that are at or after the new position
  update public.cards
    set "order" = "order" + 1
  where list_id = p_new_list_id
    and id != p_card_id
    and "order" >= p_new_order;
end;
$$;
