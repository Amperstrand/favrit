---
description: Write the client test suite. Fake the transport, encode the quirks, feed the lessons back.
---

Principles and the fleet-wide Lessons live in the private platform-recon
repo (research/LESSONS.md); this file keeps the per-quirk detail.

## Lessons (append-only)

- One cookieless GET answers everything — the absence contract shows up
  as RFC 7807 `application/problem+json` 404s, not HTML or JSON errors:
  the fake must serve the problem+json content type or the null
  contract is untested.
- The `/public/` prefix IS the auth here: without it the gateway 403s
  cleanly. Encode that in the fake — a client that drops the prefix
  fails the test, not production.
- Favrit prices are MAIN-unit JSON numbers (NOK whole kroner) — the
  inverse of Wolt's cents. Units were settled empirically (min 35 /
  max 609 across the real card) before the model was written; expose
  the number as served plus the per-price currency object.
- Availability lives on VARIANTS (`"AVAILABLE"`/`"SOLD_OUT"`), and
  inactive items are SERVED — two separate filters, two separate tests.
- Food courts make sections into vendors: one location id, many brands
  (Sabrura + Peppes Pizza at the worked example), each with its own
  hours flag. The deepest titled section owns nested items.
- Localization is real `[{language, text}]` arrays (contrast
  OrderMonkey's stringified maps): the fixture needs a no/en pair or
  language picking is untested; no-only rows exercise the fallback.
