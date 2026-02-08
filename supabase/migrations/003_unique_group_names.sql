-- Prevent duplicate group names per account.
-- First, remove any existing duplicates (keep earliest).
DELETE FROM public.user_groups a
USING public.user_groups b
WHERE a.account_id = b.account_id
  AND a.name = b.name
  AND a.created_at > b.created_at;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_groups_unique_name
  ON public.user_groups (account_id, name);
