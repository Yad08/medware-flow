-- Clean up orphaned reports first (defensive)
DELETE FROM public.reports r
WHERE (r.type = 'pallet' AND NOT EXISTS (SELECT 1 FROM public.pallets p WHERE p.id = r.reference_id))
   OR (r.type = 'container' AND NOT EXISTS (SELECT 1 FROM public.containers c WHERE c.id = r.reference_id));

-- Tie reports to parents via a trigger (polymorphic FK isn't possible directly).
-- When a pallet or container is deleted, remove its reports.
CREATE OR REPLACE FUNCTION public.cleanup_reports_on_pallet_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  DELETE FROM public.reports WHERE type = 'pallet' AND reference_id = OLD.id;
  RETURN OLD;
END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_reports_on_container_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  DELETE FROM public.reports WHERE type = 'container' AND reference_id = OLD.id;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS trg_cleanup_reports_pallet ON public.pallets;
CREATE TRIGGER trg_cleanup_reports_pallet
  BEFORE DELETE ON public.pallets
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_reports_on_pallet_delete();

DROP TRIGGER IF EXISTS trg_cleanup_reports_container ON public.containers;
CREATE TRIGGER trg_cleanup_reports_container
  BEFORE DELETE ON public.containers
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_reports_on_container_delete();

-- Validate report references on insert
CREATE OR REPLACE FUNCTION public.validate_report_reference()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.type = 'pallet' THEN
    IF NOT EXISTS (SELECT 1 FROM public.pallets WHERE id = NEW.reference_id) THEN
      RAISE EXCEPTION 'Report references a pallet that does not exist';
    END IF;
  ELSIF NEW.type = 'container' THEN
    IF NOT EXISTS (SELECT 1 FROM public.containers WHERE id = NEW.reference_id) THEN
      RAISE EXCEPTION 'Report references a container that does not exist';
    END IF;
  ELSE
    RAISE EXCEPTION 'Report type must be pallet or container';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_report_reference ON public.reports;
CREATE TRIGGER trg_validate_report_reference
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_report_reference();

-- Make sure the recalc + container limit triggers are actually attached
-- (db-triggers report shows none — they may have been dropped).
DROP TRIGGER IF EXISTS trg_recalc_pallet_weight ON public.items;
CREATE TRIGGER trg_recalc_pallet_weight
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_pallet_weight();

DROP TRIGGER IF EXISTS trg_check_container_pallet_limit ON public.pallet_container;
CREATE TRIGGER trg_check_container_pallet_limit
  BEFORE INSERT ON public.pallet_container
  FOR EACH ROW EXECUTE FUNCTION public.check_container_pallet_limit();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_items_updated_at ON public.items;
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pallets_updated_at ON public.pallets;
CREATE TRIGGER trg_pallets_updated_at BEFORE UPDATE ON public.pallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_containers_updated_at ON public.containers;
CREATE TRIGGER trg_containers_updated_at BEFORE UPDATE ON public.containers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live weight/count updates
ALTER TABLE public.items REPLICA IDENTITY FULL;
ALTER TABLE public.pallets REPLICA IDENTITY FULL;
ALTER TABLE public.pallet_container REPLICA IDENTITY FULL;
ALTER TABLE public.containers REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pallets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pallet_container; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.containers; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;