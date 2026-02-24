# Doporučené další kroky – Manikúra PWA

## 1. Volba motivu (den / noc)

**Cíl:** Přepínač světlý / tmavý režim v nastavení nebo v hlavičce.

**Postup:**
- Použít CSS proměnné (už máte `prefers-color-scheme` v `globals.css`) a přidat třídu na `<html>`, např. `theme-dark` / `theme-light`.
- Uložit preferenci: **localStorage** (`theme`) + volitelně sloupec v `profiles` (např. `theme_preference`) pro synchronizaci mezi zařízeními.
- V layoutu načíst theme (client component `ThemeProvider`), aplikovat třídu na `html`, vykreslit přepínač (ikona Sun/Moon) v hlavičce dashboardu nebo na stránce Nastavení.
- V `tailwind.config` mít `dark:` varianty pro barvy; v `globals.css` pro `html.theme-dark` přepsat `:root` proměnné.

**Priorita:** střední (pohodlí, ne blokuje funkce).

---

## 2. Kalendář a pracovní doba

**Co už máte v DB:**
- `working_hours` – den v týdnu (0–6), `start_time`, `end_time`
- `availability_restrictions` – datum, typ (sick, vacation, other)
- `last_minute_offers` – datum, čas, cena
- `appointments` – rezervace

**Doporučený postup:**

### 2.1 Pracovní doba (admin)
- Stránka **Nastavení kalendáře** nebo **Pracovní doba** (např. `/dashboard/calendar/settings`).
- Formulář: pro každý den v týdnu (Po–Ne) volba „Pracuji“ ano/ne + čas Od–Do (nebo „Zavřeno“).
- Uložení: INSERT/UPDATE do `working_hours` (jeden řádek na den, UNIQUE(day_of_week)).
- Výchozí naplnění: pokud je tabulka prázdná, zobrazit výchozí šablonu (např. Po–Pá 9–17).

### 2.2 Omezení (nemoc, dovolená)
- Na stejné stránce nebo podsekce **Omezení**: výběr data, typ (nemoc / dovolená / jiné), poznámka.
- Seznam nadcházejících a minulých omezení s možností smazat.
- Uložení do `availability_restrictions`.

### 2.3 Zobrazení kalendáře
- **Pohled na týden nebo měsíc:** dny v mřížce, v každém dni sloty (např. po 30 min) odvozené z `working_hours` minus `availability_restrictions` minus již obsazené `appointments`.
- **Výpočet volných slotů:** server nebo client funkce: pro zvolené datum vrátit seznam časových intervalů, které jsou volné (v pracovní době, ne v omezení, ne v appointments).
- **Barvy:** volný slot, obsazený, last minute, váš termín (pro klientku).

### 2.4 Rezervace (klientka)
- Výběr data → načíst volné sloty → výběr času → vytvoření `appointments` (client_id = přihlášená, status = pending).
- Zobrazení „Moje termíny“ s možností zrušit (UPDATE status = cancelled).

### 2.5 Last minute (admin)
- V rozhraní kalendáře: u volného slotu tlačítko „Označit jako Last Minute“ + zadání ceny → INSERT do `last_minute_offers` (nebo zvláštní stránka).
- Při zobrazení volných slotů pro klientku zvýraznit sloty z `last_minute_offers` a zobrazit cenu.

**Priorita:** vysoká (jádro aplikace).

---

## 3. Další doporučené postupy

### 3.1 Reporty (admin)
- **Denní sestava:** stránka `/dashboard/reports/daily` – seznam termínů na vybraný den, tlačítko Tisk (už máte záložku na dashboardu).
- **Přehled absencí:** stránka `/dashboard/reports/absences` – filtrovat `appointments` kde status = cancelled nebo no_show, seznam s datumem, klientkou, důvodem.

### 3.2 Notifikace
- Označení přečteno: při kliknutí na notifikaci UPDATE `notifications SET read_at = now()`.
- Badge v navigaci s počtem nepřečtených (SELECT count WHERE read_at IS NULL).

### 3.3 Klientky a návštěvy
- V detailu klientky: doplnit telefon do profilu (pokud chybí), upravit poznámky.
- U návštěv: možnost editovat poznámky návštěvy (UPDATE `visits.notes`).
- Možnost smazat fotku z návštěvy (DELETE z `visit_photos` + odstranit soubor ze Storage).

### 3.4 Inspirace (veřejná galerie)
- Povolit čtení veřejných fotek i pro **anon** (nepřihlášené): v Supabase přidat RLS politiku na `visit_photos` pro role anon, USING (public = true). Pak klientky uvidí galerii bez přihlášení; srdíčko jen po přihlášení.

### 3.5 Klientka – Moje fotky
- Přepínač „Zveřejnit v galerii“ u každé fotky (UPDATE `visit_photos SET public = true/false`). Částečně máte v DB; doplnit UI na stránce `/dashboard/my-photos`.

### 3.6 PWA a výkon
- Doplnit ikony 192px a 512px do `public/icons/` (nyní jen README).
- Zvážit cache strategie ve `sw.js` pro API/obrázky (např. network-first pro data, cache-first pro statiku).

### 3.7 Bezpečnost a ověření e-mailu
- V Supabase mít zapnuté „Confirm email“, aby se do systému nedostaly falešné účty.
- Volitelně: rate limiting na přihlášení / registraci (Supabase má vlastní nastavení).

---

## Doporučené pořadí implementace

1. **Kalendář + pracovní doba + rezervace** – bez toho je aplikace pro klientky málo využitelná.
2. **Denní sestava a přehled absencí** – rychlé využití pro manikérku.
3. **Téma den/noc** – malá úprava, velký přínos pro komfort.
4. **Notifikace (přečteno, badge)** – lepší přehled.
5. **Moje fotky – přepínač Veřejná** a **Inspirace pro anon** – dokončení galerie.
6. Ostatní body dle potřeby.
