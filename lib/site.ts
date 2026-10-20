/** Company facts used across the site. Values marked CONFIRM in the requirements checklist stay null until supplied. */
export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fuertetechnologies.com",
  phoneDisplay: "+974 7125 8588",
  phoneHref: "tel:+97471258588",
  whatsappNumber: "97471258588",
  legalName: null as string | null, // [CONFIRM]: legal name exactly as on the CR
  // Domain confirmed 19 Oct 2026; "contact@" is the brochure's mailbox on the corrected domain. Privacy/security/support addresses still [CONFIRM].
  email: "contact@fuertetechnologies.com" as string | null,
  crNumber: null as string | null, // [CR NUMBER]
  hours: null as string | null, // [CONFIRM]: office hours
  geo: { latitude: 25.2685, longitude: 51.5323 }, // Umm Ghuwailina, approximate until the office pin is confirmed
} as const;

export function whatsappHref(message?: string) {
  return `https://wa.me/${SITE.whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/** Last path segment, used as the service key passed to the RFQ form. */
export function serviceKey(slug: string) {
  return slug.split("/").filter(Boolean).pop() ?? "";
}
