-- Keep emergencies.updated_at in sync on UPDATE (lesson-learned API also sets it explicitly).

CREATE OR REPLACE FUNCTION public.emergencies_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_emergencies_updated_at ON public.emergencies;
CREATE TRIGGER set_emergencies_updated_at
  BEFORE UPDATE ON public.emergencies
  FOR EACH ROW
  EXECUTE FUNCTION public.emergencies_set_updated_at();
