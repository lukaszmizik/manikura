# Doporučení: Kalendář klientky + Nastavení

## 1. Přepínání týdnů v kalendáři klientky

**Stav:** Kalendář klientky zobrazuje vždy „týden“ od dneška (7 dní) a nemá přepínání.

**Postup:**
- V `app/[locale]/dashboard/calendar/page.tsx` u větve pro klientku:
  - Číst `searchParams.week` (stejně jako u admina).
  - Pokud je `week` platné datum, použít ho jako pondělí; jinak pondělí aktuálního týdne.
  - Načíst termíny klientky v rozsahu tohoto týdne (pondělí 00:00 – neděle 23:59).
- Přidat **komponentu pro navigaci týdnem** (šipky „← předchozí / následující →“), která mění URL: `?week=YYYY-MM-DD` (datum pondělí). Lze využít stejnou logiku jako v `AdminCalendarGrid` (router.push s locale).
- Zobrazovat nadpis týdne ve tvaru např. „17. 2. – 23. 2. 2025“.

**Sdílená logika:** Funkce `getMonday()`, `toDateKey()` a výpočet rozsahu týdne už na stránce jsou; stačí je použít i pro klientku a napojit na `week` parametr.

---

## 2. Editace termínu (klientka)

**Stav:** Klientka vidí jen seznam termínů bez možnosti úpravy.

**Postup:**
- U každého termínu v seznamu přidat tlačítko **„Upravit“** (nebo klik na řádek).
- Po kliku otevřít **modal** (nebo jednoduchou stránku) s:
  - datum a čas termínu (zobrazení, popř. úprava – viz níže),
  - pole **Poznámka** (textarea) → ukládá se do `appointments.note` (sloupec už existuje).
- **Server action** pro klientku, např. v `app/dashboard/calendar/actions.ts`:
  - `updateAppointmentNoteByClient(appointmentId, note)` – pouze update `note` u vlastního termínu.
  - Případně `updateAppointmentByClient(appointmentId, { note?, start_at?, end_at? })` – pokud chcete umožnit i změnu času (RLS klientce UPDATE na vlastní řádky povoluje).
- V UI zobrazit aktuální poznámku a po uložení revalidovat stránku / zavřít modal.

**Poznámka k úpravě času:** Pokud má klientka měnit i čas termínu, je vhodné kontrolovat volné sloty (working_hours, ostatní appointments), aby nedošlo k přepsání. Pro první verzi stačí „jen poznámka“, změnu času lze přidat později.

---

## 3. Možnost vložit poznámku k termínu

- **Poznámka k termínu** = pole `appointments.note` (již v DB).
- Implementace je součástí bodu 2: v modalu editace termínu textarea „Poznámka“, ukládání přes `updateAppointmentNoteByClient` (nebo společnou `updateAppointmentByClient`).

---

## 4. Sekce „Nastavení“ pro klientku

**Stav:** V navigaci má klientka jen Domů, Termíny, Fotky. Chybí Nastavení pro údaje a kontakty.

**Postup:**
- **Navigace:** V `DashboardNav` přidat pro klientku položku „Nastavení“ s odkazem na `/dashboard/settings` (nebo `/dashboard/my/settings`, aby se nepletla s admin stránkou; v projektu už je `admin/settings` pro salon).
- **Stránka:** Vytvořit `app/[locale]/dashboard/settings/page.tsx` (nebo `dashboard/my/settings/page.tsx`):
  - Přístupná pouze pro přihlášeného uživatele; u klientky zobrazit formulář, u admina lze přesměrovat na `/dashboard/admin/settings` nebo zobrazit jiný obsah.
- **Formulář „Moje údaje“:**
  - Pole z tabulky `profiles`: **display_name**, **phone**, **email** (email lze zobrazit jen pro čtení, protože se často spravuje přes Auth).
  - Volitelně: **photos_public_by_default** (checkbox) – už v DB.
  - Uložení: server action `updateMyProfile({ display_name, phone, … })` – update `profiles` kde `id = auth.uid()`. RLS už umožňuje uživateli updatovat vlastní profil.

**Kde ukládat:** Nový soubor např. `app/dashboard/settings/actions.ts` s funkcí `updateMyProfile`. Použít `createClient()` ze serveru a po úspěchu `revalidatePath("/dashboard/settings")` a příslušné cesty.

---

## Shrnutí úkolů

| Úkol | Kde | Hlavní změny |
|------|-----|---------------|
| Přepínání týdnů (klientka) | `calendar/page.tsx` + malá komponenta nebo inline šipky | `searchParams.week`, výpočet týdne, odkazy předchozí/následující týden |
| Editace termínu + poznámka | `calendar/page.tsx` (seznam), nový modal, actions | Tlačítko Upravit, modal s poznámkou, `updateAppointmentNoteByClient` |
| Nastavení klientky | `DashboardNav`, nová stránka `dashboard/settings`, action | Položka Nastavení, formulář profilu, `updateMyProfile` |

Pokud chcete, můžu podle tohoto plánu navrhnout konkrétní změny v kódu (soubory a diff).
