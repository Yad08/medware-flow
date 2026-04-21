-- Items table
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('box', 'unit')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  weight NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (weight >= 0),
  is_hazmat BOOLEAN NOT NULL DEFAULT false,
  pallet_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pallets table
CREATE TABLE public.pallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_weight NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Containers table
CREATE TABLE public.containers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'shipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pallet-Container junction
CREATE TABLE public.pallet_container (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  container_id UUID NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pallet_id, container_id)
);

-- Reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('pallet', 'container')),
  reference_id UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK from items to pallets (added after pallets table exists)
ALTER TABLE public.items
  ADD CONSTRAINT items_pallet_id_fkey
  FOREIGN KEY (pallet_id) REFERENCES public.pallets(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_items_pallet_id ON public.items(pallet_id);
CREATE INDEX idx_pallet_container_pallet ON public.pallet_container(pallet_id);
CREATE INDEX idx_pallet_container_container ON public.pallet_container(container_id);
CREATE INDEX idx_reports_reference ON public.reports(type, reference_id);

-- Updated-at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pallets_updated_at BEFORE UPDATE ON public.pallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_containers_updated_at BEFORE UPDATE ON public.containers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-recalculate pallet total_weight when items change
CREATE OR REPLACE FUNCTION public.recalc_pallet_weight()
RETURNS TRIGGER AS $$
DECLARE
  affected_pallets UUID[];
  pid UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_pallets := ARRAY[OLD.pallet_id];
  ELSIF TG_OP = 'INSERT' THEN
    affected_pallets := ARRAY[NEW.pallet_id];
  ELSE
    affected_pallets := ARRAY[NEW.pallet_id, OLD.pallet_id];
  END IF;

  FOREACH pid IN ARRAY affected_pallets LOOP
    IF pid IS NOT NULL THEN
      UPDATE public.pallets
      SET total_weight = COALESCE((
        SELECT SUM(weight * quantity) FROM public.items WHERE pallet_id = pid
      ), 0)
      WHERE id = pid;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_items_recalc_weight
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_pallet_weight();

-- Enforce max 42 pallets per container
CREATE OR REPLACE FUNCTION public.check_container_pallet_limit()
RETURNS TRIGGER AS $$
DECLARE
  pallet_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pallet_count
  FROM public.pallet_container
  WHERE container_id = NEW.container_id;

  IF pallet_count >= 42 THEN
    RAISE EXCEPTION 'A container cannot hold more than 42 pallets';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_check_pallet_limit
  BEFORE INSERT ON public.pallet_container
  FOR EACH ROW EXECUTE FUNCTION public.check_container_pallet_limit();

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallet_container ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Public access policies (v1 - no auth)
CREATE POLICY "Public full access" ON public.items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.pallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.containers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.pallet_container FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.reports FOR ALL USING (true) WITH CHECK (true);