-- ─── Role Configs Table ──────────────────────────────────────────────────────
-- Stores display configuration (label, color) for each user role value.
-- Run this in the Supabase SQL Editor.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.role_configs (
  value       TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT 'bg-muted text-muted-foreground',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed with default roles
INSERT INTO public.role_configs (value, label, color) VALUES
  ('admin',         'Admin',         'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'),
  ('leadership',    'Leadership',    'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400'),
  ('practice_lead', 'Practice Lead', 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'),
  ('project_lead',  'Project Lead',  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'),
  ('sales',         'Sales',         'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'),
  ('hr',            'HR',            'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400'),
  ('user',          'IT Support',    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400')
ON CONFLICT (value) DO NOTHING;

-- 3. Drop the role check constraint so any role value can be stored
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 4. Enable Row Level Security
ALTER TABLE public.role_configs ENABLE ROW LEVEL SECURITY;

-- 5. Allow authenticated users to read role configs
DROP POLICY IF EXISTS "role_configs_authenticated_read" ON public.role_configs;
CREATE POLICY "role_configs_authenticated_read"
  ON public.role_configs FOR SELECT
  TO authenticated
  USING (true);

-- Writes are handled server-side via the service role key (API routes).
