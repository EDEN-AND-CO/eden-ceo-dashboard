#!/bin/bash
# EDEN & CO. — Daily data rebuild + deploy
# Runs all build scripts and pushes to GitHub (triggers Netlify redeploy)
# Schedule: crontab -e → 0 9 * * * /path/to/daily-rebuild.sh
#
# TO INSTALL: Run this in terminal:
#   chmod +x "/Users/jonwinter/Library/CloudStorage/OneDrive-Personal/eden-co-brain/data/ceo dashboard/build/scripts/daily-rebuild.sh"
#   crontab -e
#   Add this line:
#   0 9 * * * "/Users/jonwinter/Library/CloudStorage/OneDrive-Personal/eden-co-brain/data/ceo dashboard/build/scripts/daily-rebuild.sh"

set -e
REPO="/Users/jonwinter/Library/CloudStorage/OneDrive-Personal/eden-co-brain/data/ceo dashboard/build"
LOG="$REPO/scripts/sync.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting daily rebuild..." >> "$LOG"

cd "$REPO"

run_script() {
  echo "[$TIMESTAMP] Running $1..." >> "$LOG"
  python3 "scripts/$1" >> "$LOG" 2>&1 && echo "[$TIMESTAMP] OK: $1" >> "$LOG" || echo "[$TIMESTAMP] FAILED: $1" >> "$LOG"
}

run_script build-cache.py
run_script build-stock-cache.py
run_script build-team-pulse.py
run_script build-bom-cache.py
run_script build-adspend-cache.py
run_script build-marketing-cache.py

echo "[$TIMESTAMP] All scripts complete. Deploying..." >> "$LOG"
bash scripts/deploy.sh >> "$LOG" 2>&1

echo "[$TIMESTAMP] Done." >> "$LOG"

# Copy sync log to src/data so it can be served by the dashboard
cp "$LOG" "$REPO/src/data/sync.log"
