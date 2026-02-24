# Oddělení menu pro admina a klientku

Navigace v hlavičce dashboardu je rozdělená na **dvě nezávislé komponenty**, aby admin vždy viděl správné položky a ikony a nedocházelo k záměně s menu klientky.

## Struktura

- **`DashboardNav`** – obalová komponenta. Podle `role` vykreslí buď admin, nebo klientské menu. Rozhraní (props) zůstává stejné pro layout.

- **`AdminDashboardNav`** – pouze pro administrátora:
  - Úvod (Home)
  - **Kalendář** (Calendar) – odkaz na `/dashboard/calendar`
  - Termíny (List) – `/dashboard/calendar/terms`
  - Klientky (User) – `/dashboard/clients`
  - Upozornění (Bell, badge) – `/dashboard/notifications`
  - Nastavení (Settings) – `/dashboard/admin/settings`  
  Konfigurace: `ADMIN_NAV_ITEMS` v souboru, překlady přes `labelKey` (např. `calendarAdmin` → „Kalendář“).

- **`ClientDashboardNav`** – pouze pro klientku:
  - Úvod (Home)
  - **Rezervace** (Calendar) – `/dashboard/calendar`
  - Termíny (List) – `/dashboard/calendar/terms`
  - Zprávy (Bell, badge) – `/dashboard/messages`
  - Fotky (ImageIcon) – `/dashboard/my-photos`
  - Nastavení (Settings) – `/dashboard/settings`  
  Konfigurace: `CLIENT_NAV_ITEMS`, překlady např. `bookings` → „Rezervace“.

## Výhody

- Admin má vždy položku **„Kalendář“** (ikona kalendáře), klientka **„Rezervace“** – žádná sdílená logika podle `href`.
- Přidání/změna položky u jedné role neovlivní druhou.
- Každé menu má vlastní `aria-label` („Hlavní navigace (manikérka)“ / „Hlavní navigace (klientka)“).
- Konfigurace položek (href, labelKey, ikona, badge) je na jednom místě v příslušné komponentě.

## Úpravy

- **Admin menu:** upravit `ADMIN_NAV_ITEMS` v `AdminDashboardNav.tsx` a překlady v `messages/*.json` pod `nav` (např. `calendarAdmin`, `terms`).
- **Klientské menu:** upravit `CLIENT_NAV_ITEMS` v `ClientDashboardNav.tsx` a odpovídající klíče v `nav`.
