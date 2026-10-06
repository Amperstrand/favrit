# favrit

Read-only client for [Favrit](https://favrit.com) (Norwegian QR-ordering
vendor). Every read is **one cookieless GET** against the public v3
location API — identity, opening hours, the full menu, and payment
methods come back in a single payload. No accounts, no bookings, no
orders, no payment.

```sh
npm install github:Amperstrand/favrit
```

```ts
import { FavritClient } from "favrit";

const client = new FavritClient();
const venue = await client.venue("L2Bpw3kXEqO");      // publicId or favrit.com URL
const menu = await client.menu("L2Bpw3kXEqO", "en");  // localized menu, all vendors
```

CLI (Node 22+):

```sh
npx favrit health L2Bpw3kXEqO     # exit 1 unless the platform says OPEN
npx favrit menu L2Bpw3kXEqO
```

## Error semantics

A thrown `FavritError` (reason `"network"`) means unreachable. A `null`
return always means the platform answered: absent — unknown ids get
RFC 7807 `application/problem+json` 404s ("Location not found").

## What the client encodes

- Guest routes must keep the `/public/` prefix — the gateway 403s
  without it (mirrored by the fake).
- Localization is proper `[{language, text}]` arrays: pick the
  requested language, fall back to the venue default, then first.
- Prices are JSON numbers in **main units** with explicit
  `{amount, currency, currencySymbol}` per price — NOK menus are whole
  kroner (verified live: a 35 NOK dressing and a 609 NOK combo; the
  opposite of Wolt's integer cents).
- Availability is per-**variant** (`"AVAILABLE"` / `"SOLD_OUT"` / …),
  not per item; inactive items are served and filtered.
- Food courts: `menuSections` are **vendors** (one location, many
  brands) with their own opening hours (`openingHoursUsed`); the
  deepest titled section owns its items when subsections nest.

## Payments lane (out of scope — documented, not implemented)

Favrit locations declare per-location `paymentMethods` (TABLE /
COUNTER / ONLINE; ONLINE = provider ADYEN incl. VIPPS at the worked
example). Ordering rides a bookings model
(`/v1/locations/<id>/bookings/<ref>/orders`) that would end at an
Adyen/Vipps hosted checkout — a person pays there; no card data ever
transits this client. The read-only package has no order command on
purpose.

## Verification (live, 2026-10-06)

- **5071 pub** (Vestkanten food court, Norway), `L2Bpw3kXEqO`:
  `venue` → state OPEN, NOK, Europe/Oslo, vendors Sabrura + Peppes
  Pizza; `menu` → 32 items (9 Sabrura + 23 Peppes), main-unit NOK
  prices (Liten Sushikombo 329, Stor Sushikombo 609). One GET per
  read; unknown ids verified to answer problem+json 404s; the
  non-public path verified to 403.

## Repo rules

Public repo — never commit captured payloads, cookies, or personal
data; fakes are synthetic with provenance comments. Commit via
`sh scripts/git-commit.sh`; CI runs the leak scan plus typecheck,
build, and the offline test suite. Quirk→lesson log:
[prompts/write-tests.md](prompts/write-tests.md). Generated from the
platform-recon scaffold (`scripts/new-client.ts`).
