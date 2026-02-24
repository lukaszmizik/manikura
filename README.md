# Manikúra PWA

Progressive Web App pro správu manikúry: rezervace termínů, karty klientek, fotogalerie a reporty.

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS**
- **Lucide React** (ikony)
- **Supabase** (Auth, Database, Storage)

## Nastavení

### 1. Supabase

1. Vytvořte projekt na [supabase.com](https://supabase.com).
2. V **SQL Editor** spusťte migraci ze složky `supabase/migrations/001_initial_schema.sql`.
3. V **Authentication → URL Configuration** nastavte:
   - Site URL: `http://localhost:3000` (dev) / vaše produkční URL
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://vase-domena.cz/auth/callback`
4. V **Storage** vytvořte bucket `visit-photos` (private) a nastavte politiky dle potřeby (upload pro authenticated, čtení přes RLS/app).
5. První admin účet: po registraci v aplikaci proveďte v SQL Editor:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE id = 'uuid-vasicho-uctu';
   ```

### 2. Projekt

```bash
cp .env.local.example .env.local
# Vyplňte NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

### 3. PWA ikony

Do `public/icons/` přidejte `icon-192.png` a `icon-512.png` (viz `public/icons/README.txt`). Bez nich bude PWA fungovat, ale „Přidat na plochu“ může zobrazit výchozí ikonu.

## Struktura

- `src/app` – App Router (auth, dashboard, inspirace)
- `src/components` – UI komponenty a dashboard navigace
- `src/lib/supabase` – klient pro prohlížeč, server a middleware
- `src/types` – TypeScript typy dle DB
- `supabase/migrations` – SQL schéma a RLS

## Role

- **admin** (manikérka): kalendář, pracovní doba, last minute, klientky, výstrahy/BAN, hodnocení, reporty, notifikace, nahrávání fotek k návštěvám.
- **client** (klientka): rezervace termínů, moje termíny, moje fotky, přepínač „Zveřejnit v galerii“, prohlížení Inspirace a srdíčkování.

## Funkce

- Registrace / přihlášení (email + heslo)
- Kalendář a rezervace (volné sloty, last minute s akční cenou)
- Omezení dostupnosti (nemoc, dovolená)
- Karty klientek: kontakty, historie, výstrahy, BAN, hodnocení 1–5; automatická výstraha při „nedostavila se bez omluvy“
- Karta návštěvy: fotky (Supabase Storage), poznámky; klientka určuje soukromí fotek
- Veřejná galerie Inspirace (veřejné fotky, srdíčka, řazení)
- Reporty: denní sestava, přehled absencí
- Notifikace v aplikaci (nová zrušení termínů)
- PWA: manifest, service worker, mobilní zobrazení
