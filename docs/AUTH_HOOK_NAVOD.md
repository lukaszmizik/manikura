# Nastavení Auth Hooku „Before user created“

Pokud chcete povolit registraci jen z určitých e-mailových domén (např. `example123.cz` pro testovací účty), použijte Postgres hook.

## 1. Spusťte migraci s funkcí

V **Supabase Dashboard → SQL Editor** spusťte obsah souboru:

`supabase/migrations/008_before_user_created_hook.sql`

(Tím se vytvoří funkce `public.before_user_created_allow_domains`, která povolí doménu `example123.cz`. V souboru můžete do pole `allowed_domains` doplnit další domény.)

## 2. Nastavení hooku v Dashboardu

1. **Authentication** → **Hooks**
2. Sekce **Before user created** → **Add hook** (nebo upravte existující)
3. **Hook type:** zvolte **Postgres**
4. **Function:** vyberte nebo zadejte **`public.before_user_created_allow_domains`**
5. Uložte

Od té chvíle budou vytvořeni jen uživatelé s e-mailem z domény `example123.cz` (a dalších domén, které v migraci přidáte).

## Chcete povolit všechny registrace?

Hook v sekci **Before user created** jednoduše **odstraňte** (Delete / Remove). Pak neběží žádná kontrola a mohou se registrovat libovolné e-maily.
