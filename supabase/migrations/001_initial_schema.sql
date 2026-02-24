-- ============================================================
-- MANIKÚRA PWA – Inicializační schéma pro Supabase
-- Role: admin (manikérka), client (klientka)
-- ============================================================

-- Rozšíření
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================== ENUM TYPY =====================
CREATE TYPE app_role AS ENUM ('admin', 'client');
CREATE TYPE appointment_status AS ENUM (
  'pending',      -- čeká na potvrzení
  'confirmed',
  'completed',
  'cancelled',
  'no_show'      -- nedostavila se bez omluvy
);
CREATE TYPE restriction_type AS ENUM ('sick', 'vacation', 'other');
CREATE TYPE warning_type AS ENUM ('warning', 'ban');

-- ===================== PROFILY (napojené na auth.users) =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'client',
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  -- Klientka: zda mají být nové fotky ve výchozím stavu veřejné
  photos_public_by_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles jsou čitelné pro přihlášené"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vlastník může updatovat svůj profil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Při registraci lze vložit vlastní profil (trigger)"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin může číst a měnit role (pro správu)"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger: při registraci vytvořit profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role app_role := 'client';
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'admin' THEN
    user_role := 'admin';
  END IF;
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== POMOCNÁ FUNKCE: je aktuální uživatel admin? =====================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===================== PRACOVNÍ DOBA (šablona týdne) =====================
CREATE TABLE public.working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = neděle
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_of_week)
);

ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Working hours: čtení pro všechny přihlášené, zápis jen admin"
  ON public.working_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "Working hours: insert/update/delete jen admin"
  ON public.working_hours FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===================== OMEZENÍ DOSTUPNOSTI (nemoc, dovolená) =====================
CREATE TABLE public.availability_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restriction_date DATE NOT NULL,
  restriction_type restriction_type NOT NULL DEFAULT 'other',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.availability_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restrictions: čtení pro přihlášené, zápis jen admin"
  ON public.availability_restrictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restrictions: insert/update/delete jen admin"
  ON public.availability_restrictions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===================== LAST MINUTE NABÍDKY (volný slot s akční cenou) =====================
CREATE TABLE public.last_minute_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_czk DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.last_minute_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Last minute: čtení pro přihlášené, zápis jen admin"
  ON public.last_minute_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Last minute: insert/update/delete jen admin"
  ON public.last_minute_offers FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===================== REZERVACE / TERMÍNY =====================
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  is_last_minute BOOLEAN NOT NULL DEFAULT false,
  last_minute_price DECIMAL(10,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  CONSTRAINT end_after_start CHECK (end_at > start_at)
);

CREATE INDEX idx_appointments_client ON public.appointments(client_id);
CREATE INDEX idx_appointments_start ON public.appointments(start_at);
CREATE INDEX idx_appointments_status ON public.appointments(status);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Klientka vidí jen své termíny, admin vidí vše
CREATE POLICY "Appointments: client sees own, admin sees all"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    client_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY "Appointments: client can insert own (new booking)"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Appointments: update pouze admin nebo vlastník (zrušení)"
  ON public.appointments FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR public.is_admin())
  WITH CHECK (client_id = auth.uid() OR public.is_admin());

CREATE POLICY "Appointments: delete jen admin"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===================== NÁVŠTĚVY (karta návštěvy – fotky, poznámky) =====================
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_id)
);

CREATE INDEX idx_visits_client ON public.visits(client_id);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visits: klientka své, admin všechny"
  ON public.visits FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.is_admin());

CREATE POLICY "Visits: insert/update jen admin (nebo systém po dokončení termínu)"
  ON public.visits FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===================== FOTKY NÁVŠTĚVY (Supabase Storage path) =====================
CREATE TABLE public.visit_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visit_photos_visit ON public.visit_photos(visit_id);
CREATE INDEX idx_visit_photos_client ON public.visit_photos(client_id);
CREATE INDEX idx_visit_photos_public ON public.visit_photos(public) WHERE public = true;

ALTER TABLE public.visit_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visit photos: klientka své, admin všechny; veřejné fotky čitelné pro všechny"
  ON public.visit_photos FOR SELECT TO authenticated
  USING (
    public = true OR client_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY "Visit photos: insert jen admin"
  ON public.visit_photos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Visit photos: update (public toggle) klientka u svých, admin vše"
  ON public.visit_photos FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR public.is_admin())
  WITH CHECK (client_id = auth.uid() OR public.is_admin());

CREATE POLICY "Visit photos: delete jen admin nebo vlastník fotky"
  ON public.visit_photos FOR DELETE TO authenticated
  USING (client_id = auth.uid() OR public.is_admin());

-- ===================== SRDÍČKA (lajky u veřejných fotek) =====================
CREATE TABLE public.photo_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES public.visit_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (photo_id, user_id)
);

CREATE INDEX idx_photo_likes_photo ON public.photo_likes(photo_id);

ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photo likes: čtení pro přihlášené"
  ON public.photo_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Photo likes: insert/delete vlastní"
  ON public.photo_likes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ===================== HODNOCENÍ KLIENTEK (manikérka hodnotí 1–5) =====================
CREATE TABLE public.client_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_client_ratings_client ON public.client_ratings(client_id);

ALTER TABLE public.client_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client ratings: klientka své hodnocení, admin vše"
  ON public.client_ratings FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.is_admin());
CREATE POLICY "Client ratings: insert/update/delete jen admin"
  ON public.client_ratings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===================== VÝSTRAHY A BAN =====================
CREATE TABLE public.client_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warning_type warning_type NOT NULL,
  reason TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_client_warnings_client ON public.client_warnings(client_id);

ALTER TABLE public.client_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Warnings: klientka své, admin vše"
  ON public.client_warnings FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.is_admin());
CREATE POLICY "Warnings: insert/update/delete jen admin"
  ON public.client_warnings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Automatické přidání výstrahy při označení termínu jako no_show
CREATE OR REPLACE FUNCTION public.auto_warning_on_no_show()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'no_show' AND (OLD.status IS NULL OR OLD.status <> 'no_show') THEN
    INSERT INTO public.client_warnings (client_id, warning_type, reason, appointment_id, created_by)
    VALUES (
      NEW.client_id,
      'warning',
      'Nedostavila se bez omluvy (termín ' || to_char(NEW.start_at, 'DD.MM.YYYY HH24:MI') || ')',
      NEW.id,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_appointment_no_show
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.auto_warning_on_no_show();

-- ===================== NOTIFIKACE =====================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications: uživatel jen své"
  ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger: při zrušení termínu vytvořit notifikaci pro admina
CREATE OR REPLACE FUNCTION public.notify_admin_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  admin_ids UUID[];
  aid UUID;
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status <> 'cancelled') THEN
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

CREATE TRIGGER on_appointment_cancelled
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_cancellation();

-- ===================== ÚPRAVA PROFILU – updated_at =====================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER visits_updated_at BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== STORAGE BUCKET (spravuje se v Dashboardu nebo API)
-- Bucket: visit-photos, private; přístup přes RLS / signed URLs
-- Pro nahrávání z aplikace vytvořte bucket "visit-photos" v Supabase Storage
-- a nastavte politiky dle dokumentace (např. authenticated upload, public read jen u veřejných fotek lze řešit přes app)

COMMENT ON TABLE public.profiles IS 'Uživatelé (manikérka/admin a klientky) napojení na auth.users';
COMMENT ON TABLE public.working_hours IS 'Pracovní doba – šablona po dnech v týdnu';
COMMENT ON TABLE public.availability_restrictions IS 'Omezení (nemoc, dovolená) na konkrétní dny';
COMMENT ON TABLE public.last_minute_offers IS 'Last minute nabídky volných slotů s akční cenou';
COMMENT ON TABLE public.appointments IS 'Rezervace termínů';
COMMENT ON TABLE public.visits IS 'Karta návštěvy – propojení termínu s poznámkami a fotkami';
COMMENT ON TABLE public.visit_photos IS 'Fotky návštěv, cesta do Storage; public = zobrazení v galerii';
COMMENT ON TABLE public.photo_likes IS 'Srdíčka u veřejných fotek';
COMMENT ON TABLE public.client_ratings IS 'Hodnocení klientek 1–5 od manikérky';
COMMENT ON TABLE public.client_warnings IS 'Výstrahy a BAN u klientek';
COMMENT ON TABLE public.notifications IS 'Interní notifikace v aplikaci';
