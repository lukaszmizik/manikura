-- Vypnutí triggeru – profil se bude vytvářet v aplikaci po registraci (spolehlivější).
-- Spusť v Supabase SQL Editoru.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
