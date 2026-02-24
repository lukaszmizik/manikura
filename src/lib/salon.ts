/** Id jediného řádku v tabulce salon_info (singleton). */
export const SALON_INFO_ID = "00000000-0000-0000-0000-000000000001";

export function googleMapsUrl(address: string): string {
  const encoded = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
