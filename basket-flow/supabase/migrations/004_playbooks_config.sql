-- ============================================
-- BasketFlow - Playbooks extra config
-- ============================================

ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;
