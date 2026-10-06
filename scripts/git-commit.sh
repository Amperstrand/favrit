#!/bin/sh
# Commit only after the leak scan passes.
set -eu
root=$(git rev-parse --show-toplevel)
cd "$root"
node scripts/leak-scan.mjs . --staged
exec git \
  -c user.name="${GIT_AUTHOR_NAME:-Amperstrand}" \
  -c user.email="${GIT_AUTHOR_EMAIL:-141745238+Amperstrand@users.noreply.github.com}" \
  commit "$@"
