#!/usr/bin/env bash
# Create the scripts venv and install dependencies. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

python3 -m venv .venv
./.venv/bin/pip install --quiet --upgrade pip
./.venv/bin/pip install --quiet -r requirements.txt

echo "scripts/.venv ready — $(./.venv/bin/python --version)"
echo "next: ./install_launchd.sh   (schedules capture ingest + the morning briefs)"
