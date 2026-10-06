import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { CLOSED_ID, fakeFavrit, LIVE_ID, UNKNOWN_ID } from "./favrit-fake.js";

function ports(lines: string[], errors: string[]) {
  return {
    out: (line: string) => lines.push(line),
    err: (line: string) => errors.push(line),
  };
}

describe("runCli", () => {
  it("health prints identity + state, exit 0 when OPEN", async () => {
    const transport = fakeFavrit();
    const lines: string[] = [];
    const code = await runCli(["health", LIVE_ID], { ...ports(lines, []), fetchImpl: transport.fetchImpl });
    expect(code).toBe(0);
    const text = lines.join("\n");
    expect(text).toContain("Synthetic Kantine (AbCd1234)");
    expect(text).toContain("state:     OPEN · active");
    expect(text).toContain("Syntetisk Sushi / Syntetisk Pizza");
  });

  it("health exits 1 when the platform says CLOSED", async () => {
    const transport = fakeFavrit();
    const lines: string[] = [];
    const code = await runCli(["health", CLOSED_ID], { ...ports(lines, []), fetchImpl: transport.fetchImpl });
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("CLOSED");
  });

  it("menu prints vendors, prices in NOK main units, availability flags", async () => {
    const transport = fakeFavrit();
    const lines: string[] = [];
    const code = await runCli(["menu", LIVE_ID], { ...ports(lines, []), fetchImpl: transport.fetchImpl });
    expect(code).toBe(0);
    const text = lines.join("\n");
    expect(text).toContain("Synthetic Combo Small  329.00 NOK (customizable)");
    expect(text).toContain("Syntetisk Poke  209.00 NOK (unavailable)");
    expect(text).toContain("food-court mode");
  });

  it("accepts favrit.com URLs and exits 1 on unknown ids / bad input / unknown commands", async () => {
    const transport = fakeFavrit();
    const lines: string[] = [];
    expect(
      await runCli(["menu", `https://favrit.com/en/menu/location/${LIVE_ID}`], {
        ...ports(lines, []),
        fetchImpl: transport.fetchImpl,
      }),
    ).toBe(0);
    expect(lines.join("\n")).toContain("Synthetic Kantine");

    const errors: string[] = [];
    expect(await runCli(["menu", UNKNOWN_ID], { ...ports([], errors), fetchImpl: transport.fetchImpl })).toBe(1);
    expect(errors[0]).toContain("problem+json 404");

    expect(await runCli(["menu", "!!"], ports([], errors))).toBe(1);
    expect(await runCli(["order", LIVE_ID], ports([], errors))).toBe(1);
    expect(errors.join("\n")).toContain("unknown command: order");
  });
});
