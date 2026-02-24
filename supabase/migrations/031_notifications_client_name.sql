-- Upozornění: přidat jméno klientky do textu notifikace o zrušení termínu.
-- Přepisuje funkci notify_admin_on_cancellation tak, aby do těla zprávy vložila display_name klientky.

CREATE OR REPLACE FUNCTION public.notify_admin_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  admin_ids UUID[];
  aid UUID;
  client_name TEXT;
BEGIN
  IF NEW.status = 'cancelled'
     AND (OLD.status IS NULL OR OLD.status <> 'cancelled')
     AND (NEW.cancelled_by_admin IS NULL OR NEW.cancelled_by_admin = false) THEN

    -- Jméno klientky (pokud existuje profil)
    SELECT COALESCE(display_name, 'Klientka') INTO client_name
    FROM public.profiles
    WHERE id = NEW.client_id;

    SELECT ARRAY_AGG(id) INTO admin_ids FROM public.profiles WHERE role = 'admin';
    IF admin_ids IS NOT NULL THEN
      FOREACH aid IN ARRAY admin_ids LOOP
        INSERT INTO public.notifications (user_id, type, title, body, meta)
        VALUES (
          aid,
          'appointment_cancelled',
          'Zrušený termín',
          coalesce(client_name, 'Klientka') || ' zrušila termín ' || to_char(NEW.start_at, 'DD.MM.YYYY HH24:MI') || '.',
          jsonb_build_object('appointment_id', NEW.id, 'client_id', NEW.client_id)
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

