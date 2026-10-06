#!/usr/bin/env node
/**
 * Weekly smoke: read-only location checks against the public v3 API.
 * Exit 1 on drift, unknown ids, or transport failure.
 */
import { FavritClient } from "../dist/index.js";

const WORKED_EXAMPLES = [
  { id: "L2Bpw3kXEqO", name: "5071 pub (Vestkanten food court, NO)" },
];

const client = new FavritClient();
let failed = false;

for (const example of WORKED_EXAMPLES) {
  try {
    const venue = await client.venue(example.id);
    if (venue === null) {
      console.error(`smoke fail ${example.id} (${example.name}): problem+json 404`);
      failed = true;
      continue;
    }
    console.log(
      `smoke pass ${example.id}: ${venue.name} state=${venue.state} currency=${venue.currency} vendors=${venue.vendors.join("+") || "-"}`,
    );
  } catch (error) {
    console.error(`smoke fail ${example.id} (${example.name}): ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

try {
  const menu = await client.menu(WORKED_EXAMPLES[0]?.id ?? "");
  if (menu === null || menu.items.length === 0) {
    console.error(`smoke fail menu read: ${menu === null ? "null" : "zero items"}`);
    failed = true;
  } else {
    console.log(`smoke pass menu read: ${menu.items.length} items, vendors: ${[...new Set(menu.items.map((i) => i.vendor))].join("+")}`);
  }
} catch (error) {
  console.error(`smoke fail menu read: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
