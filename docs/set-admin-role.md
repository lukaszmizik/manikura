# Nastavení role administrátora

Pokud se **přihlašujete e-mailem, který má být administrátor**, ale aplikace vás zobrazuje jako **klientku** (v hlavičce „· Klientka“ a/nebo menu Rezervace/Termíny místo Kalendář/Klientky), je to proto, že při registraci přes stránku aplikace se role v databázi nastaví na `client`.

---

## Způsob 1: Proměnná prostředí (nejrychlejší)

V kořenu projektu vytvořte nebo upravte soubor **`.env.local`** a přidejte řádek s vaším přihlašovacím e-mailem:

```env
ADMIN_EMAILS=vas@email.cz
```

Pokud chcete více administrátorů, oddělte e-maily čárkou:

```env
ADMIN_EMAILS=admin1@email.cz,admin2@email.cz
```

**Restartujte vývojový server** (zastavte `npm run dev` a znovu spusťte). Po přihlášení pod uvedeným e-mailem vás aplikace považuje za administrátora bez ohledu na záznam v databázi. V hlavičce uvidíte „· Manikérka“ a menu Kalendář, Termíny, Klientky atd.

**Důležité:** Aby admin akce (Smazat termín, Potvrdit, Uvolnit termín, úprava času, nová rezervace) fungovaly i při použití `ADMIN_EMAILS`, musí být v `.env.local` také **`SUPABASE_SERVICE_ROLE_KEY`** (Supabase Dashboard → Settings → API → service_role). Bez něj by databázová oprávnění (RLS) blokovala mazání a úpravy.

---

## Způsob 2: Úprava v databázi

1. Otevřete **Supabase Dashboard** → **SQL Editor**.
2. Použijte **přesně ten e-mail**, kterým se v aplikaci přihlašujete (zkopírujte ho raději z Supabase → Authentication → Users, aby byl shodný včetně velikosti písmen).
3. V dotazu **nahraďte `vas@email.cz`** tímto e-mailem.
4. Klikněte na **Run**. Mělo by se aktualizovat 1 řádek.
5. **Úplně se odhlaste** v aplikaci (Odhlásit) a znovu se přihlaste. Pokud se stále zobrazuje „Klientka“, zkuste tvrdé obnovení stránky (Ctrl+F5) nebo prohlížeč v anonymním režimu.

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'vas@email.cz';
```

**Kontrola:** V Supabase → **Table Editor** → tabulka **profiles** ověřte, že u vašeho řádku je sloupec **role** = `admin`. Pokud tam máte více účtů, ujistěte se, že upravujete řádek s e-mailem, pod kterým se skutečně přihlašujete.

(Pouze jeden řádek by měl být aktualizován. Dotaz běží s oprávněním SQL Editoru, takže RLS nebrání změně.)
