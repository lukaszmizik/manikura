# Testovací účty (klientky)

**Přihlašuji se pod admin e-mailem, ale jsem vedený/á jako klientka?** → Nejrychlejší: do **`.env.local`** přidejte `ADMIN_EMAILS=vas@email.cz` (váš přihlašovací e-mail), restartujte server a znovu se přihlaste. Viz [Nastavení role administrátora](../docs/set-admin-role.md).

---

Všechny mají **heslo: `Test1234!`**

**Chyba „User not allowed“:** V projektu máte zapnutý Auth Hook (Authentication → Hooks → **Before user created**), který blokuje vytvoření účtů. Buď v Supabase tento hook vypněte/upravte (povolte doménu), nebo do `.env.local` přidejte `TEST_EMAIL_DOMAIN=vase-domena.cz` (doména, kterou hook povoluje). E-maily testovacích účtů pak budou např. `anna.novakova.test@vase-domena.cz`.

**Pokud se účty neobjeví v seznamu klientek:** v Supabase Dashboard otevřete **SQL Editor**, spusťte soubor `supabase/migrations/007_sync_test_user_profiles.sql` (nebo zkopírujte jeho obsah). Tím se doplní záznamy v tabulce `profiles`.

| Jméno            | E-mail |
|------------------|--------|
| Anna Nováková    | anna.novakova.test@example123.cz |
| Maria Ivanova    | maria.ivanova.test@example123.cz |
| Elena Petrova    | elena.petrova.test@example123.cz |
| Jana Svobodová   | jana.svobodova.test@example123.cz |
| Olga Sokolova    | olga.sokolova.test@example123.cz |

Přihlášení: stránka přihlášení aplikace → e-mail + heslo `Test1234!`.
