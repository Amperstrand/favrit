import { FavritError } from "./error.js";
import { getJson } from "./http.js";
import { menuFromLocation, venueFromLocation, type RawLocationEnvelope } from "./menu.js";
import { publicId as parseId, type Menu, type PublicId, type Venue } from "./types.js";

export const FAVRIT_ORIGIN = "https://favrit.com";

export interface ClientOptions {
  readonly fetchImpl?: typeof fetch;
}

/**
 * Read-only Favrit client. Every read is ONE cookieless GET against
 * `/public/v3/locations/simple/<id>` (guest routes must keep the
 * `/public/` prefix — the gateway 403s without it). A thrown
 * FavritError (reason "network") means unreachable; null means the
 * platform answered: absent (RFC 7807 problem+json 404).
 */
export class FavritClient {
  constructor(private readonly options: ClientOptions = {}) {}

  async venue(idOrUrl: string, language = "en"): Promise<Venue | null> {
    const location = await this.location(idOrUrl, language);
    return location === null ? null : venueFromLocation(location.id, location.payload);
  }

  async menu(idOrUrl: string, language = "en"): Promise<Menu | null> {
    const location = await this.location(idOrUrl, language);
    return location === null ? null : menuFromLocation(location.id, location.payload, language);
  }

  private async location(
    idOrUrl: string,
    language: string,
  ): Promise<{ readonly id: PublicId; readonly payload: NonNullable<RawLocationEnvelope["location"]> } | null> {
    const id = parseId(idOrUrl);
    const url = `${FAVRIT_ORIGIN}/ws/ordr-service/public/v3/locations/simple/${id}?caller=GUEST_APP&language=${language}`;
    const result = await getJson<RawLocationEnvelope>(url, this.options.fetchImpl);
    if (!result.ok) {
      if (result.kind === "network") throw new FavritError("network", `location fetch failed: ${result.body}`);
      return null;
    }
    if (result.value.location === undefined) return null;
    return { id, payload: result.value.location };
  }
}
