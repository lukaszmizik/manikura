-- Nastavení role administrátora podle e-mailu
-- Použití: Přihlášení pod admin e-mailem vás zobrazuje jako klientku, protože
-- při registraci přes aplikaci se výchozí role nastaví na 'client'.
--
-- 1. Otevřete v Supabase: SQL Editor
-- 2. Nahraďte níže 'vas@email.cz' PŘESNĚ tím e-mailem, kterým se přihlašujete
--    (ideálně zkopírujte z Supabase → Authentication → Users)
-- 3. Spusťte dotaz (Run). Mělo by se aktualizovat 1 řádek.
-- 4. V aplikaci se odhlaste a znovu přihlaste.

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'vas@email.cz';

-- Ověření: před dalším přihlášením zkontrolujte, že role je admin
-- SELECT id, email, display_name, role FROM public.profiles WHERE email = 'vas@email.cz';
