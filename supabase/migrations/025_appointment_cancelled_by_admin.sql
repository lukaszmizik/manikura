-- Rozlišení zrušení termínu: klientka vs. admin (aby se adminům neposílala notifikace "Klientka zrušila termín" když zrušil admin).
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancelled_by_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.appointments.cancelled_by_admin IS 'True pokud termín zrušila manikérka (admin); pak se adminům neposílá notifikace „Klientka zrušila termín“.';

-- Trigger notifikuje adminy jen když zrušila klientka (ne admin).
CREATE OR REPLACE FUNCTION public.notify_admin_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  admin_ids UUID[];
  aid UUID;
BEGIN
  IF NEW.status = 'cancelled'
     AND (OLD.status IS NULL OR OLD.status <> 'cancelled')
     AND (NEW.cancelled_by_admin IS NULL OR NEW.cancelled_by_admin = false) THEN
    SELECT ARRAY_AGG(id) INTO admin_ids FROM public.profiles WHERE role = 'admin';
    IF admin_ids IS NOT NULL THEN
      FOREACH aid IN ARRAY admin_ids LOOP
        INSERT INTO public.notifications (user_id, type, title, body, meta)
        VALUES (
          aid,
          'appointment_cancelled',
          'Zrušený termín',
          'Klientka zrušila termín ' || to_char(NEW.start_at, 'DD.MM.YYYY HH24:MI') || '.',
          jsonb_build_object('appointment_id', NEW.id, 'client_id', NEW.client_id)
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
