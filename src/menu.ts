import type { Menu, MenuItem, PublicId, Venue } from "./types.js";

/**
 * Wire shape of `/public/v3/locations/simple/<id>` — one cookieless GET
 * returning identity + hours + full menu + payment methods inline
 * (platform-recon research/favrit/PLATFORM.md). Quirks encoded (each a
 * test + a Lessons line):
 *  - localization is proper `[{language, text}]` arrays; pick the
 *    requested language with defaultLanguage fallback, then first.
 *  - prices are JSON numbers in MAIN units with explicit
 *    {amount, currency, currencySymbol} per price (NOK menus are whole
 *    kroner — verified live, unlike Wolt's cents).
 *  - availability is per-VARIANT ("AVAILABLE"/…), not per item.
 *  - food courts: menuSections[] are VENDORS with their own hours;
 *    subSections nest recursively.
 *  - unknown ids answer RFC 7807 problem+json 404s (absence contract).
 */
export interface RawLocalized {
  readonly language?: string;
  readonly text?: string;
}

export interface RawPrice {
  readonly amount?: number;
  readonly currency?: string;
  readonly currencySymbol?: string;
}

export interface RawVariant {
  readonly price?: RawPrice;
  readonly availability?: string;
}

export interface RawMenuItem {
  readonly id?: string;
  readonly names?: readonly RawLocalized[];
  readonly descriptions?: readonly RawLocalized[];
  readonly price?: RawPrice;
  readonly active?: boolean;
  readonly customizable?: boolean;
  readonly variants?: readonly RawVariant[];
}

export interface RawMenuSection {
  readonly titles?: readonly RawLocalized[];
  readonly menuItems?: readonly RawMenuItem[];
  readonly subSections?: readonly RawMenuSection[];
  readonly openingHoursUsed?: boolean;
}

export interface RawLocation {
  readonly name?: string;
  readonly state?: string;
  readonly active?: boolean;
  readonly currency?: string;
  readonly country?: string | null;
  readonly zoneId?: string;
  readonly defaultLanguage?: string;
  readonly menus?: readonly {
    readonly menuSections?: readonly RawMenuSection[];
  }[];
}

export interface RawLocationEnvelope {
  readonly location?: RawLocation;
}

/** Pick the requested language, then the venue default, then first. */
export function localized(
  entries: readonly RawLocalized[] | undefined,
  language: string,
  fallbackLanguage: string,
): string | null {
  if (entries === undefined || entries.length === 0) return null;
  const pick =
    entries.find((entry) => entry.language === language)?.text ??
    entries.find((entry) => entry.language === fallbackLanguage)?.text ??
    entries[0]?.text;
  return pick ?? null;
}

export function venueFromLocation(id: PublicId, location: RawLocation): Venue {
  const sections = location.menus?.[0]?.menuSections ?? [];
  const vendors = sections
    .map((section) => localized(section.titles, location.defaultLanguage ?? "no", location.defaultLanguage ?? "no"))
    .filter((name): name is string => name !== null);
  return {
    id,
    name: location.name ?? "",
    state: location.state ?? "",
    active: location.active === true,
    currency: location.currency ?? "",
    country: location.country ?? null,
    timezone: location.zoneId ?? "",
    defaultLanguage: location.defaultLanguage ?? "",
    vendors,
  };
}

export function menuFromLocation(id: PublicId, location: RawLocation, language: string): Menu {
  const venue = venueFromLocation(id, location);
  const fallback = location.defaultLanguage ?? "no";
  const items: MenuItem[] = [];
  let sectionsUseOwnHours = false;

  const walk = (section: RawMenuSection, vendorFallback: string): void => {
    if (section.openingHoursUsed === true) sectionsUseOwnHours = true;
    const vendor = localized(section.titles, language, fallback) ?? vendorFallback;
    for (const raw of section.menuItems ?? []) {
      if (raw.id === undefined || raw.active === false) continue;
      const variant = raw.variants?.find((candidate) => candidate.price?.amount !== undefined) ?? raw.variants?.[0];
      const price = variant?.price ?? raw.price;
      items.push({
        id: raw.id,
        name: localized(raw.names, language, fallback) ?? "",
        description: localized(raw.descriptions, language, fallback),
        price: price?.amount ?? 0,
        currency: price?.currency ?? venue.currency,
        available: variant?.availability !== undefined ? variant.availability === "AVAILABLE" : true,
        customizable: raw.customizable === true,
        vendor,
      });
    }
    for (const sub of section.subSections ?? []) walk(sub, vendor);
  };

  for (const section of location.menus?.[0]?.menuSections ?? []) {
    walk(section, venue.name);
  }

  return { venue, items, sectionsUseOwnHours };
}
