-- Doplní profily pro testovací účty (auth.users → public.profiles).
-- Spusť v SQL Editoru, pokud se seed účty neobjevují v seznamu klientek.
-- Pokud jste použili TEST_EMAIL_DOMAIN (jiná doména než example123.cz), nahraďte v WHERE níže doménu.

INSERT INTO public.profiles (id, email, display_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  'client'
FROM auth.users u
WHERE u.email IN (
  'anna.novakova.test@example123.cz',
  'maria.ivanova.test@example123.cz',
  'elena.petrova.test@example123.cz',
  'jana.svobodova.test@example123.cz',
  'olga.sokolova.test@example123.cz'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  role = 'client',
  updated_at = now();
