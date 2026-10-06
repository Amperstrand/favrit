# AGENTS.md — contributing to favrit

Read-only client for Favrit (Norwegian QR-ordering vendor,
favrit.com): one cookieless GET per read against
`/ws/ordr-service/public/v3/locations/simple/<id>` — identity, hours,
full menu, payment methods inline. Surface notes: the private
platform-recon repo's `research/favrit/PLATFORM.md`.

Rules:
- READ-ONLY: no accounts, no bookings, no orders, no payment. The
  ordering surface (bookings + Adyen/Vipps hosted checkout) is
  documented in the README, never implemented here.
- This repository is public. Never commit card numbers, HAR/pcap/log
  files, cookies, session dumps, captured payloads, or personal data.
  Fakes are synthetic with provenance comments. Commit via
  `sh scripts/git-commit.sh`; CI runs the leak scan.
- Tests are offline against a synthetic fake that encodes the platform
  quirks (problem+json absence, /public/ prefix 403s, main-unit prices,
  variant availability, vendor sections); every quirk is a test + a
  Lessons line in prompts/write-tests.md.
