-- Zabránit dvěma rezervacím na stejný čas (překrývající se intervaly).
-- Zrušené termíny (cancelled) se neúčastní – slot lze znovu obsadit.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (tstzrange(start_at, end_at) WITH &&)
  WHERE (status <> 'cancelled');

COMMENT ON CONSTRAINT appointments_no_overlap ON public.appointments IS 'Žádné dva aktivní termíny se nesmí překrývat.';
