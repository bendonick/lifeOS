#!/usr/bin/env bash
# Create the scripts venv and install dependencies. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

# --copies, not the default symlinks: the interpreter is what macOS grants Full
# Disk Access to (these jobs read ~/Desktop and iCloud Drive, both protected), and
# a symlinked venv makes that grant point into /opt/homebrew/Cellar/python@3.13/
# 3.13.7/… — a path with a version in it, which the next `brew upgrade` changes.
# The grant then silently stops matching and the jobs hang again. A copied
# interpreter lives at a stable path this repo controls.
python3 -m venv --copies .venv
./.venv/bin/pip install --quiet --upgrade pip
./.venv/bin/pip install --quiet -r requirements.txt

echo "scripts/.venv ready — $(./.venv/bin/python --version)"
echo "Full Disk Access target (see README): $(cd .venv/bin && pwd)/python"
echo "next: ./install_launchd.sh   (schedules capture ingest + the morning briefs)"
