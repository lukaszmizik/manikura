# Doporučení: Potvrzení návštěvy, editace po potvrzení, uvolnění termínu

## Přehled požadavků

1. **Admin** má výpis rezervací → tlačítko **„Potvrdit“** → návštěva je potvrzena; klientka ji vidí **zeleně**.
2. **Klientka** může i po potvrzení editovat, ale s **upozorněním** a povinným **zdůvodněním** v textovém poli.
3. **Admin** u takových rezervací vidí **řádek se žlutým podsvícením** a tlačítko **„Uvolnit termín“**; po stisknutí se termín uvolní (slot je volný).

---

## 1. Datový model

**Tabulka `appointments`** už má sloupec `status` (`pending` | `confirmed` | …). Doplňte dva sloupce:

- **`client_change_reason`** (TEXT, nullable) – zdůvodnění, když klientka edituje již potvrzenou návštěvu.
- **`client_change_requested_at`** (TIMESTAMPTZ, nullable) – kdy klientka požádala o změnu (admin pak vidí „žluté“ řádky).

**Migrace:** nový soubor např. `012_appointments_client_change_request.sql`:

- `ALTER TABLE appointments ADD COLUMN client_change_reason TEXT;`
- `ALTER TABLE appointments ADD COLUMN client_change_requested_at TIMESTAMPTZ;`

**Logika:**

- Admin klikne **„Potvrdit“** → `status = 'confirmed'`, volitelně vynulovat `client_change_reason` a `client_change_requested_at`.
- Klientka u **potvrzené** návštěvy změní údaje (poznámka / čas) a odešle **zdůvodnění** → uložíme změnu a nastavíme `client_change_reason` a `client_change_requested_at = now()`.
- Admin klikne **„Uvolnit termín“** → `status = 'cancelled'` (termín se uvolní díky stávajícímu exclusion constraint), volitelně vynulovat `client_change_*`.

---

## 2. Admin – výpis rezervací a „Potvrdit“

**Kde admin vidí rezervace:** kalendář (mřížka týdne) a po kliknutí na blok **AppointmentDetailModal**.

**Doporučené kroky:**

1. **Server action** v `app/dashboard/calendar/actions.ts`:
   - **`confirmAppointment(id: string)`** – pro řádek daného `id` nastaví `status = 'confirmed'` a `client_change_reason = null`, `client_change_requested_at = null`. RLS: jen admin. Po úspěchu `revalidatePath` pro kalendář.

2. **AppointmentDetailModal** (admin):
   - Do typu `AppointmentForGrid` (nebo props) přidat `status` a volitelně `client_change_reason`, `client_change_requested_at`.
   - Načítat tyto sloupce v kalendářové stránce v dotazu na `appointments`.
   - V modalu:
     - Pokud `status === 'pending'`: zobrazit tlačítko **„Potvrdit“**; při kliknutí volat `confirmAppointment(appointment.id)` a po úspěchu zavřít modal / obnovit data.
     - Pokud `status === 'confirmed'` a `client_change_requested_at != null`: zobrazit výrazné upozornění (žlutý pruh / box), zobrazit text `client_change_reason` a tlačítko **„Uvolnit termín“** (volá `releaseAppointment(id)`).
     - Stávající tlačítka (Upravit čas, Smazat) ponechat dle stávající logiky.

3. **Mřížka kalendáře (bloky termínů):**
   - Barva bloku podle stavu: např. `confirmed` → zelený odstín (`bg-emerald-500` nebo podobně), má-li `client_change_requested_at` → žlutý odstín (`bg-amber-500`). `pending` → stávající (např. `bg-primary-500`).

4. **Server action „Uvolnit termín“:**
   - **`releaseAppointment(id: string)`** – `UPDATE appointments SET status = 'cancelled', cancelled_at = now(), client_change_reason = null, client_change_requested_at = null WHERE id = $1`. Jen admin. Revalidace.

---

## 3. Klientka – zelené zobrazení potvrzené návštěvy

**Kde klientka vidí termíny:** stránka Rezervace (týdenní přehled) a stránka **Termíny** (`/dashboard/calendar/terms`).

**Kroky:**

1. V **calendar/page.tsx** (větev pro klientku): u každého bloku/řádku termínu podle `status` přidat třídu – např. `status === 'confirmed'` → zelený border nebo pozadí (`border-emerald-400 bg-emerald-50`).
2. Na stránce **Termíny** (`calendar/terms/page.tsx`): u každého termínu v seznamu podle `status` stejně – pro `confirmed` zelené zvýraznění; volitelně vedle času malý štítek „Potvrzeno“.

---

## 4. Klientka – editace s upozorněním a zdůvodněním

**Kde klientka edituje:** odkaz „Upravit“ u termínu vede na `/dashboard/calendar/terms?edit=id` (zvýraznění), zatím bez vlastního formuláře editace. Je potřeba **místo nebo doplnění** skutečné editace (poznámka, případně čas).

**Doporučené kroky:**

1. **Stránka nebo modal pro editaci termínu (klientka):**
   - Varianta A: na stránce Termíny při `?edit=id` zobrazit rozbalený blok s formulářem (poznámka, volitelně čas) a tlačítko „Odeslat“.
   - Varianta B: nová stránka `/dashboard/calendar/terms/[id]/edit` s formulářem.
   - Pokud je `appointment.status === 'confirmed'`:
     - Zobrazit **upozornění**: „Vaše návštěva je již potvrzena. Pokud měníte údaje, prosím napište krátké zdůvodnění.“
     - Pole **„Zdůvodnění změny“** (textarea) **povinné** při uložení (pokud je status confirmed).
   - Při odeslání volat server action (viz níže).

2. **Server action pro klientku – úprava termínu:**
   - **`updateAppointmentByClient(appointmentId, { note?, start_at?, end_at?, change_reason? })`**
   - Ověřit, že řádek patří přihlášenému uživateli (`client_id = auth.uid()`).
   - Pokud je aktuální `status === 'confirmed'` a klientka něco mění, vyžadovat `change_reason` (ne prázdný řetězec); jinak vrátit chybu.
   - UPDATE: nastavit `note`, popř. `start_at`/`end_at` (pokud chcete povolit změnu času), a pokud byl status confirmed a byl předán `change_reason`, nastavit `client_change_reason = change_reason`, `client_change_requested_at = now()`.
   - Revalidace příslušných cest.

3. **Překlady:** klíče pro „Potvrzeno“, „Potvrdit“, „Uvolnit termín“, „Vaše návštěva je již potvrzena…“, „Zdůvodnění změny“, „Termín byl uvolněn.“ atd. (cs/ru).

---

## 5. Shrnutí úkolů (checklist)

| # | Úkol | Kde |
|---|------|-----|
| 1 | Migrace: sloupce `client_change_reason`, `client_change_requested_at` | `supabase/migrations/012_...` |
| 2 | Server actions: `confirmAppointment`, `releaseAppointment`, `updateAppointmentByClient` | `app/dashboard/calendar/actions.ts` |
| 3 | Admin modal: tlačítko „Potvrdit“ (pending), žlutý box + „Uvolnit termín“ (change requested) | `AppointmentDetailModal` + rozšíření typu / dotazu |
| 4 | Admin mřížka: barva bloků (zelená confirmed, žlutá change requested) | `AdminCalendarGrid` |
| 5 | Klientka: zelené zobrazení potvrzených v týdnu a v Termínech | `calendar/page.tsx`, `calendar/terms/page.tsx` |
| 6 | Klientka: formulář editace s upozorněním a povinným zdůvodněním (confirmed) | Nová stránka nebo rozšíření Termínů + volání `updateAppointmentByClient` |
| 7 | Překlady (cs/ru) | `messages/cs.json`, `messages/ru.json` |

---

## 6. Volby k dořešení

- **Co přesně klientka u „editace“ mění:** jen poznámku (`note`), nebo i čas (`start_at`/`end_at`)? Pokud i čas, na backendu zkontrolovat překryvy (exclusion constraint to už vynucuje) a v UI zobrazit případnou chybu „Termín byl mezitím obsazen.“.
- **„Uvolnit termín“:** zda jen `status = 'cancelled'`, nebo také vyplnit `cancelled_reason` (např. „Na žádost klientky – změna po potvrzení“) pro reporty.
- **Notifikace:** zda po potvrzení adminem poslat klientce notifikaci (např. do stávající tabulky `notifications`) – lze doplnět později.

Po odsouhlasení těchto kroků lze implementovat nejdřív migraci a server actions, pak admin UI (modal + barvy), pak klientka (zelené + editace s zdůvodněním).
