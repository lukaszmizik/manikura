# Co vložit do Supabase (krok za krokem)

Projekt zatím v Supabase nic nemá. Postupuj takto:

---

## 1. Spusť hlavní schéma (tabulky, RLS, triggery)

1. Otevři **Supabase Dashboard** → svůj projekt.
2. V levém menu jdi na **SQL Editor**.
3. Klikni **New query**.
4. Zkopíruj **celý obsah** souboru `supabase/migrations/001_initial_schema.sql` (v projektu ve složce `supabase/migrations/`).
5. Vlož ho do editoru a klikni **Run** (nebo Ctrl+Enter).

Mělo by proběhnout bez chyby. Vytvoří se tabulky: `profiles`, `working_hours`, `availability_restrictions`, `last_minute_offers`, `appointments`, `visits`, `visit_photos`, `photo_likes`, `client_ratings`, `client_warnings`, `notifications`, plus funkce a triggery.

---

## 2. Spusť Storage (bucket + politiky pro fotky)

1. V SQL Editoru **znovu New query**.
2. Zkopíruj **celý obsah** souboru `supabase/migrations/002_storage_visit_photos.sql`.
3. Vlož do editoru a klikni **Run**.

Tím se vytvoří bucket `visit-photos` (veřejný pro čtení) a politiky pro nahrávání a čtení.

---

## 3. Nastavení Authentication (redirect URL)

1. V Supabase jdi na **Authentication** → **URL Configuration**.
2. Do **Site URL** zadej např. `http://localhost:3000` (pro vývoj) nebo svou produkční URL.
3. Do **Redirect URLs** přidej:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**`
   - a pro produkci např. `https://tvoje-domena.cz/auth/callback` a `https://tvoje-domena.cz/**`.
4. Ulož.

---

## 4. První účet jako admin (manikérka)

1. V aplikaci se **registruj** (email + heslo) – tím se vytvoří záznam v `auth.users` a trigger doplní řádek v `profiles` s rolí `client`.
2. V Supabase jdi do **SQL Editor** → New query a spusť (nahraď `UUID-TVÉHO-ÚČTU` skutečným id z Authentication → Users):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'UUID-TVÉHO-ÚČTU';
```

UUID zjistíš v Supabase v **Authentication** → **Users** → klik na svůj účet → zkopíruj **User UID**.

---

## 5. Pokud by SQL hlásilo chybu u triggeru

Starší Postgres může chtít `EXECUTE PROCEDURE` místo `EXECUTE FUNCTION`. Pokud u některého triggeru uvidíš chybu typu *syntax error near EXECUTE FUNCTION*, v tom konkrétním příkazu `CREATE TRIGGER` nahraď:

- `EXECUTE FUNCTION` → `EXECUTE PROCEDURE`

a příkaz spusť znovu.

---

---

## 6. Pokud registrace hlásí „Database error saving new user“

Spusť v SQL Editoru skript **`003_fix_signup_trigger.sql`** (bezpečný trigger + INSERT politika).

Pokud to nepomůže, **vypni trigger** a nech vytváření profilu na aplikaci – spusť **`004_disable_trigger_create_profile_in_app.sql`**. Po registraci se profil vytvoří v aplikaci (a při prvním přihlášení po potvrzení e-mailu v auth callbacku).

---

Shrnutí: do Supabase vložíš **dva** SQL skripty (001 a 002), nastavíš URL v Authentication a prvního admina nastavíš jedním `UPDATE` v SQL Editoru. Při potížích s registrací pak 003 a případně 004.
