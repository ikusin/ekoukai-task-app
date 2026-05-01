ALTER TABLE card_comments
  ADD COLUMN member_id UUID REFERENCES members(id) ON DELETE SET NULL;
