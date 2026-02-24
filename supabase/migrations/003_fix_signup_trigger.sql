-- Oprava: Database error saving new user při registraci
-- Spusť v Supabase SQL Editoru (jeden dotaz).

-- 1) Bezpečný trigger – role jen 'admin' nebo 'client', žádný pád na neplatném enum
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

-- 2) Politika umožňující vložení vlastního profilu (pro trigger při registraci)
DROP POLICY IF EXISTS "Při registraci lze vložit vlastní profil (trigger)" ON public.profiles;
CREATE POLICY "Při registraci lze vložit vlastní profil (trigger)"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
