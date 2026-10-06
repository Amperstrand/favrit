export type PublicId = string & { readonly __brand: "PublicId" };

/**
 * Parse a location publicId: bare id or any favrit.com menu URL form
 * (`/<lang>/menu/location/<id>`). Ids are short mixed-case alnum
 * (e.g. L2Bpw3kXEqO) — case is preserved; they are NOT slugs.
 */
export function publicId(value: string): PublicId {
  let candidate = value.trim();
  if (/^https?:\/\//i.test(candidate)) {
    const url = new URL(candidate);
    if (!/(^|\.)favrit\.com$/.test(url.hostname)) {
      throw new Error(`not a favrit.com URL: ${value}`);
    }
    const match = url.pathname.match(/\/menu\/location\/([A-Za-z0-9_-]+)/);
    if (match?.[1] === undefined) {
      throw new Error(`no location id in URL: ${value}`);
    }
    candidate = match[1];
  }
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(candidate)) {
    throw new Error(`invalid publicId: ${value}`);
  }
  return candidate as PublicId;
}

export interface Venue {
  readonly id: PublicId;
  readonly name: string;
  /** The platform's own state machine (e.g. "OPEN"); liveness truth. */
  readonly state: string;
  readonly active: boolean;
  readonly currency: string;
  readonly country: string | null;
  readonly timezone: string;
  readonly defaultLanguage: string;
  /** Food courts carry multiple vendors — one named section per brand. */
  readonly vendors: readonly string[];
}

export interface MenuItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  /** Major units as served (NOK menu prices are whole kroner — verified live: 35 NOK dressing). */
  readonly price: number;
  readonly currency: string;
  readonly available: boolean;
  readonly customizable: boolean;
  readonly vendor: string;
}

export interface Menu {
  readonly venue: Venue;
  readonly items: readonly MenuItem[];
  /** Sections carry their own opening hours at food courts (openingHoursUsed). */
  readonly sectionsUseOwnHours: boolean;
}
