import { describe, expect, it } from "vitest";
import { FavritClient, FavritError } from "../src/index.js";
import { publicId } from "../src/types.js";
import { CLOSED_ID, fakeFavrit, LIVE_ID, UNKNOWN_ID } from "./favrit-fake.js";

function client(fetchImpl: typeof fetch): FavritClient {
  return new FavritClient({ fetchImpl });
}

describe("publicId", () => {
  it("accepts bare ids and favrit.com menu URLs, preserving case", () => {
    expect(publicId("L2Bpw3kXEqO")).toBe("L2Bpw3kXEqO");
    expect(publicId("https://favrit.com/en/menu/location/L2Bpw3kXEqO")).toBe("L2Bpw3kXEqO");
    expect(() => publicId("https://example.test/menu/location/x")).toThrow(/favrit\.com/);
    expect(() => publicId("https://favrit.com/en/menu/group/123")).toThrow(/location id/);
    expect(() => publicId("short")).toThrow(/invalid publicId/);
  });
});

describe("venue", () => {
  it("reads identity + platform state from the single cookieless GET", async () => {
    const { fetchImpl } = fakeFavrit();
    const venue = await client(fetchImpl).venue(LIVE_ID);
    expect(venue).toMatchObject({
      name: "Synthetic Kantine",
      state: "OPEN",
      active: true,
      currency: "NOK",
      country: "NO",
      timezone: "Europe/Oslo",
      defaultLanguage: "no",
    });
    expect(venue?.vendors).toEqual(["Syntetisk Sushi", "Syntetisk Pizza"]);
  });

  it("returns null for an unknown id (problem+json 404 is absence)", async () => {
    const { fetchImpl } = fakeFavrit();
    expect(await client(fetchImpl).venue(UNKNOWN_ID)).toBeNull();
  });

  it("throws a typed network error when the transport dies", async () => {
    const dead: typeof fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(client(dead).venue(LIVE_ID)).rejects.toMatchObject({
      name: "FavritError",
      reason: "network",
    });
  });
});

describe("menu", () => {
  it("flattens vendors and nested subSections with localized name picking", async () => {
    const { fetchImpl } = fakeFavrit();
    const menu = await client(fetchImpl).menu(LIVE_ID, "en");
    expect(menu?.items).toHaveLength(4);
    const combo = menu?.items.find((item) => item.name === "Synthetic Combo Small");
    expect(combo).toMatchObject({
      vendor: "Synthetic Sushi",
      price: 329,
      currency: "NOK",
      available: true,
      customizable: true,
      description: "Invented platter",
    });
    // no-only items keep their text under an en request (fallback)
    const poke = menu?.items.find((item) => item.name === "Syntetisk Poke");
    expect(poke).toMatchObject({ vendor: "Synthetic Sushi", available: false });
    const drink = menu?.items.find((item) => item.name === "Syntetisk Leko");
    expect(drink?.vendor).toBe("Drikke");
    expect(menu?.sectionsUseOwnHours).toBe(true);
  });

  it("filters inactive items and surfaces the closed state as data", async () => {
    const { fetchImpl } = fakeFavrit();
    const closed = await client(fetchImpl).menu(CLOSED_ID);
    expect(closed?.venue.state).toBe("CLOSED");
    expect(closed?.items).toHaveLength(0);
    const live = await client(fetchImpl).menu(LIVE_ID);
    expect(live?.items.some((item) => item.id === "item-syn-inactive")).toBe(false);
  });

  it("keeps the /public/ prefix — the gateway 403s without it (fake mirrors)", async () => {
    const { fetchImpl, requests } = fakeFavrit();
    await client(fetchImpl).menu(LIVE_ID);
    const call = requests[0];
    expect(call?.url).toContain("/ws/ordr-service/public/v3/locations/simple/");
    expect(call?.url).toContain("caller=GUEST_APP");
  });

  it("one GET per read — venue and menu never fan out", async () => {
    const { fetchImpl, requests } = fakeFavrit();
    const c = client(fetchImpl);
    await c.venue(LIVE_ID);
    await c.menu(LIVE_ID);
    expect(requests).toHaveLength(2);
  });
});
