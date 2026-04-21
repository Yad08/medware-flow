-- Users table for simple PIN-based auth (demo/class project)
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('employee', 'volunteer')),
  display_name TEXT NOT NULL,
  pin_code TEXT NOT NULL UNIQUE CHECK (pin_code ~ '^[0-9]{4,6}$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Public can SELECT (needed for PIN lookup in this demo). Writes blocked from public.
CREATE POLICY "Public can read users"
  ON public.app_users FOR SELECT
  USING (true);

-- Seed default users
INSERT INTO public.app_users (role, display_name, pin_code) VALUES
  ('employee', 'Sarah Mitchell', '1234'),
  ('employee', 'James Carter', '5678'),
  ('volunteer', 'Maria Lopez', '1111'),
  ('volunteer', 'David Chen', '2222')
ON CONFLICT (pin_code) DO NOTHING;