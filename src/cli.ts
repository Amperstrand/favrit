#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { FavritClient } from "./client.js";
import type { Menu, Venue } from "./types.js";

/**
 * Read-only CLI: `favrit health <id>`, `favrit menu <id>`.
 * No order command by design — ordering rides bookings + Adyen/Vipps
 * hosted checkout (see README, "Payments lane").
 */
export interface CliPorts {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
  readonly fetchImpl?: typeof fetch;
}

const USAGE = `favrit — read-only Favrit (NO QR-ordering) client

commands:
  health <id>    venue identity + platform state (one cookieless GET)
  menu <id>      full menu, all vendors (food courts included)

<id> is the location publicId or any favrit.com menu URL.
No order command exists by design.`;

function processPorts(): CliPorts {
  return {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  };
}

function printVenue(venue: Venue, out: (line: string) => void): void {
  out(`${venue.name} (${venue.id})`);
  out(`  state:     ${venue.state || "?"} · ${venue.active ? "active" : "inactive"}`);
  out(`  country:   ${venue.country ?? "?"} · ${venue.currency} · ${venue.timezone}`);
  out(`  language:  ${venue.defaultLanguage}`);
  if (venue.vendors.length > 0) {
    out(`  vendors:   ${venue.vendors.join(" / ")}`);
  }
}

function printMenu(menu: Menu, out: (line: string) => void): void {
  const byVendor = new Map<string, typeof menu.items[number][]>();
  for (const item of menu.items) {
    const bucket = byVendor.get(item.vendor) ?? [];
    bucket.push(item);
    byVendor.set(item.vendor, bucket);
  }
  out(`${menu.venue.name} — ${menu.items.length} items across ${byVendor.size} vendor section(s)`);
  if (menu.sectionsUseOwnHours) {
    out(`  (sections carry their own opening hours — food-court mode)`);
  }
  for (const [vendor, items] of byVendor) {
    out(vendor);
    for (const item of items) {
      const flags = `${item.available ? "" : " (unavailable)"}${item.customizable ? " (customizable)" : ""}`;
      out(`  ${item.name}  ${item.price.toFixed(2)} ${item.currency}${flags}`);
    }
  }
}

export async function runCli(
  argv: readonly string[],
  ports: CliPorts = processPorts(),
): Promise<0 | 1> {
  const [command, target] = argv;
  if (command === undefined || command === "help" || command === "-h" || command === "--help") {
    ports.out(USAGE);
    return 0;
  }
  if (command !== "health" && command !== "menu") {
    ports.err(`unknown command: ${command}`);
    ports.err(USAGE);
    return 1;
  }
  if (target === undefined) {
    ports.err(`${command} needs a location publicId or favrit.com URL`);
    return 1;
  }
  const client = new FavritClient(ports.fetchImpl === undefined ? {} : { fetchImpl: ports.fetchImpl });
  try {
    if (command === "health") {
      const venue = await client.venue(target);
      if (venue === null) {
        ports.err(`no location for ${target} (problem+json 404)`);
        return 1;
      }
      printVenue(venue, ports.out);
      return venue.state === "OPEN" ? 0 : 1;
    }
    const menu = await client.menu(target);
    if (menu === null) {
      ports.err(`no menu for ${target} (problem+json 404)`);
      return 1;
    }
    printMenu(menu, ports.out);
    return 0;
  } catch (error) {
    ports.err(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

// npm installs the bin as a .bin symlink while Node realpaths the ESM
// entry — compare resolved paths or the CLI silently no-ops for consumers.
function invokedAsScript(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (invokedAsScript()) {
  process.exit(await runCli(process.argv.slice(2)));
}
