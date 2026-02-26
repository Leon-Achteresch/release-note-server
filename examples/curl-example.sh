#!/usr/bin/env bash
# =============================================================================
# Lokales Skript – Release Notes via curl generieren
# =============================================================================
#
# Nutzung:
#   ./examples/curl-example.sh                    # Automatisch aus Git-Tags
#   ./examples/curl-example.sh v1.0.0 v1.1.0     # Manuelle Range
#
# Voraussetzungen: curl, jq, git
# =============================================================================

set -euo pipefail

SERVER_URL="https://rl-server.leon-achteresch.de"
FROM="${1:-}"
TO="${2:-}"

# --- Tag-Erkennung ---
if [ -z "$FROM" ] && [ -z "$TO" ]; then
  ALL_TAGS=$(git tag --sort=-v:refname 2>/dev/null || true)

  if [ -z "$ALL_TAGS" ]; then
    echo "Keine Tags gefunden. Nutze alle Commits bis HEAD." >&2
    TO="HEAD"
  else
    TO=$(git describe --tags --exact-match HEAD 2>/dev/null || echo "$ALL_TAGS" | head -n 1)
    FOUND=false
    while IFS= read -r tag; do
      if [ "$FOUND" = true ]; then
        FROM="$tag"
        break
      fi
      [ "$tag" = "$TO" ] && FOUND=true
    done <<< "$ALL_TAGS"
  fi
fi

VERSION="${TO#v}"

# --- Commits sammeln ---
if [ -n "$FROM" ]; then
  COMMITS=$(git log "${FROM}..${TO}" --format=%B)
else
  COMMITS=$(git log "${TO}" --format=%B)
fi

if [ -z "$COMMITS" ]; then
  echo "Keine Commits gefunden." >&2
  exit 1
fi

# --- Server aufrufen ---
RESPONSE=$(curl -sf \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg c "$COMMITS" --arg v "$VERSION" '{commits: $c, version: $v}')" \
  "${SERVER_URL}/api/release-notes")

# --- Ausgabe ---
echo "$RESPONSE" | jq -r '.markdown'

# Meta-Info auf stderr
echo "$RESPONSE" | jq '.meta' >&2
