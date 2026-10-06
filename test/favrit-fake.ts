/**
 * SYNTHETIC Favrit API. Every id, price and vendor below is invented —
 * nothing is a captured payload. The fixture mirrors the SHAPE of the
 * public v3 location API (platform-recon research/favrit/PLATFORM.md)
 * so the tests exercise the documented quirks as behavior:
 *
 *  - ONE cookieless GET answers everything; guest routes MUST keep the
 *    /public/ prefix — the fake 403s without it, like the gateway.
 *  - unknown ids answer RFC 7807 problem+json 404s (absence contract).
 *  - localization is [{language, text}] arrays; the fake serves a no/en
 *    pair so language picking is testable.
 *  - prices are MAIN-unit JSON numbers with {amount, currency,
 *    currencySymbol}; availability is per-VARIANT.
 *  - food courts: sections are vendors with ownHours; subSections nest.
 *  - inactive items are served (client filters).
 */
import { bodyOf, headerRecord, jsonResponse, type RecordedRequest } from "./transport-fake.js";

export const ORIGIN = "https://favrit.com";
export const LIVE_ID = "AbCd1234";
export const CLOSED_ID = "ZzYy9876";
export const UNKNOWN_ID = "NoPe4242";

interface Fixture {
  readonly state: string;
  readonly active: boolean;
  readonly sections: unknown[];
}

const LIVE: Fixture = {
  state: "OPEN",
  active: true,
  sections: [
    {
      titles: [
        { language: "no", text: "Syntetisk Sushi" },
        { language: "en", text: "Synthetic Sushi" },
      ],
      openingHoursUsed: true,
      menuItems: [
        {
          id: "item-syn-1",
          names: [
            { language: "no", text: "Syntetisk Kombo Liten" },
            { language: "en", text: "Synthetic Combo Small" },
          ],
          descriptions: [{ language: "en", text: "Invented platter" }],
          price: { amount: 329, currency: "NOK", currencySymbol: "kr" },
          active: true,
          customizable: true,
          variants: [{ id: "item-syn-1", price: { amount: 329, currency: "NOK", currencySymbol: "kr" }, availability: "AVAILABLE" }],
        },
        {
          id: "item-syn-2",
          names: [{ language: "no", text: "Syntetisk Poke" }],
          descriptions: [],
          price: { amount: 209, currency: "NOK", currencySymbol: "kr" },
          active: true,
          variants: [{ id: "item-syn-2", price: { amount: 209, currency: "NOK", currencySymbol: "kr" }, availability: "SOLD_OUT" }],
        },
        {
          id: "item-syn-inactive",
          names: [{ language: "no", text: "Borte" }],
          price: { amount: 1, currency: "NOK", currencySymbol: "kr" },
          active: false,
          variants: [],
        },
      ],
      subSections: [
        {
          titles: [{ language: "no", text: "Drikke" }],
          menuItems: [
            {
              id: "item-syn-3",
              names: [{ language: "no", text: "Syntetisk Leko" }],
              price: { amount: 45, currency: "NOK", currencySymbol: "kr" },
              active: true,
              variants: [{ id: "item-syn-3", price: { amount: 45, currency: "NOK", currencySymbol: "kr" }, availability: "AVAILABLE" }],
            },
          ],
        },
      ],
    },
    {
      titles: [{ language: "no", text: "Syntetisk Pizza" }],
      menuItems: [
        {
          id: "item-syn-4",
          names: [{ language: "no", text: "Syntetisk Margherita" }],
          price: { amount: 189, currency: "NOK", currencySymbol: "kr" },
          active: true,
          variants: [{ id: "item-syn-4", price: { amount: 189, currency: "NOK", currencySymbol: "kr" }, availability: "AVAILABLE" }],
        },
      ],
    },
  ],
};

const CLOSED: Fixture = {
  state: "CLOSED",
  active: false,
  sections: [],
};

function payload(id: string, fixture: Fixture): Record<string, unknown> {
  return {
    location: {
      name: id === CLOSED_ID ? "Synthetic Stengt Pub" : "Synthetic Kantine",
      state: fixture.state,
      active: fixture.active,
      currency: "NOK",
      country: "NO",
      zoneId: "Europe/Oslo",
      defaultLanguage: "no",
      menus: [{ menuSections: fixture.sections, availableMenus: [{}], menuExternalId: "synthetic-menu-uuid" }],
      paymentMethods: [],
      dailyOpeningHours: [],
    },
  };
}

export function fakeFavrit(): {
  readonly fetchImpl: typeof fetch;
  readonly requests: readonly RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = (init?.method ?? "GET").toUpperCase();
    requests.push({ method, url: url.toString(), headers: headerRecord(init), body: bodyOf(init) });

    if (url.pathname.startsWith("/ws/ordr-service/v3/")) {
      // Guest routes must keep the /public/ prefix — the gateway 403s.
      return jsonResponse(
        { timestamp: "2026-10-06T20:25:50.556Z", status: 403, error: "Forbidden", path: url.pathname },
        {},
        403,
      );
    }

    const match = url.pathname.match(/^\/ws\/ordr-service\/public\/v3\/locations\/simple\/([A-Za-z0-9_-]+)$/);
    if (match?.[1] !== undefined) {
      const id = match[1];
      if (id === UNKNOWN_ID) {
        return jsonResponse(
          { detail: `Location not found: ${id}`, instance: `/ws/public/v3/locations/simple/${id}`, message: `Location not found: ${id}`, status: 404, title: "Not found" },
          { "content-type": "application/problem+json" },
          404,
        );
      }
      return jsonResponse(payload(id, id === CLOSED_ID ? CLOSED : LIVE));
    }

    return jsonResponse({ title: "Unrouted", status: 404 }, { "content-type": "application/problem+json" }, 404);
  };
  return { fetchImpl, requests };
}
