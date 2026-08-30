-- ========== 025_attendance_reminder.sql ==========
-- Recordatorio de "pasar lista" por email antes de cada sesión.

-- Per-user opt-in for email reminders (all sessions, default OFF).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_email boolean NOT NULL DEFAULT false;

-- Marks when a session's reminder email was already sent (avoids duplicates).
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz NULL;

-- Non-club members (family) never need reminder emails; keep column simple.
-- RLS: profiles is readable by the owner via existing policies; nothing new needed
-- because reminders are sent by the Edge Function with the service role key.
