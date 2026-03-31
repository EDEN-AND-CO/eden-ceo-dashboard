#!/bin/bash
# EDEN & CO. — Deploy to Netlify via GitHub push
# Run after any data rebuild. Commits changed cache files and pushes.
# Netlify auto-deploys on push to main.

set -e
REPO="/Users/jonwinter/Library/CloudStorage/OneDrive-Personal/eden-co-brain/data/ceo dashboard/build"
cd "$REPO"

CHANGED=$(git status --porcelain src/data/ src/index.html 2>/dev/null | wc -l | tr -d ' ')
if [ "$CHANGED" -eq "0" ]; then
  echo "[deploy] No changes to push."
  exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git add src/data/*.js src/index.html 2>/dev/null || true
git commit -m "Data refresh: $TIMESTAMP [auto]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>" 2>/dev/null || true
git push origin main
echo "[deploy] Pushed at $TIMESTAMP — Netlify will redeploy in ~30 seconds."
