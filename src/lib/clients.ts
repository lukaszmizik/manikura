/** E-mailová doména host účtů („Uložit jméno“ v kalendáři). */
export const GUEST_EMAIL_SUFFIX = "@manikura.local";

/** Je profil host (vytvořen přes „Uložit jméno“)? */
export function isGuestProfile(email: string | null | undefined): boolean {
  return !!email && email.endsWith(GUEST_EMAIL_SUFFIX);
}
