#!/usr/bin/env bash
# Keep index.html (what GitHub Pages serves at the bare URL) in sync with
# harmonics_calculator.html (the canonical filename used by docs, tests, and
# in-conversation references).
#
# Direction: harmonics_calculator.html → index.html (one-way).
# If you've been editing index.html directly, copy it back to
# harmonics_calculator.html FIRST before running this script.
#
# Usage:   ./sync.sh
# Exit:    0 = synced (or already in sync), non-zero = error

set -e
cd "$(dirname "$0")"

if [ ! -f harmonics_calculator.html ]; then
  echo "sync.sh: harmonics_calculator.html not found" >&2
  exit 1
fi

if cmp -s harmonics_calculator.html index.html; then
  echo "sync.sh: already in sync"
else
  cp harmonics_calculator.html index.html
  echo "sync.sh: index.html ← harmonics_calculator.html"
fi
