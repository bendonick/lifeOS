#!/usr/bin/env bash
# Install (or remove) the LifeOS launchd jobs: capture ingest every 15 minutes,
# and the three morning briefs at 07:00 on weekdays.
#
#   ./install_launchd.sh            install / reinstall
#   ./install_launchd.sh --remove   unload and delete
#
# launchd only fires while the Mac is awake — a missed run is visible as a stale
# badge on the hub, which is the honest behaviour (docs/01-architecture.md).
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPTS_DIR")"
AGENTS_DIR="$HOME/Library/LaunchAgents"
PYTHON="$SCRIPTS_DIR/.venv/bin/python"
LOG_DIR="$REPO_DIR/data/logs"

# Labels are namespaced under com.lifeos.* — note com.lifeos.sync already exists
# on this machine from an unrelated project, so nothing here reuses that label.
LABELS=(com.lifeos.capture com.lifeos.brief.world com.lifeos.brief.ai_research com.lifeos.brief.german_word)

unload_all() {
  for label in "${LABELS[@]}"; do
    launchctl bootout "gui/$UID/$label" 2>/dev/null || true
  done
}

if [[ "${1:-}" == "--remove" ]]; then
  unload_all
  for label in "${LABELS[@]}"; do rm -f "$AGENTS_DIR/$label.plist"; done
  echo "removed ${#LABELS[@]} LifeOS jobs"
  exit 0
fi

[[ -x "$PYTHON" ]] || { echo "missing $PYTHON — run ./setup.sh first" >&2; exit 1; }
mkdir -p "$AGENTS_DIR" "$LOG_DIR"

# Weekday mornings at 07:0X. launchd's Weekday is 1=Mon … 5=Fri (0 and 7 are Sunday).
# The three briefs are staggered rather than fired together: they are the same model
# with the same rate limit, and three large web-search requests in one minute throttle
# each other for no gain — nobody is waiting at 07:05.
weekday_mornings() {
  local minute="$1"
  for day in 1 2 3 4 5; do
    printf '        <dict><key>Weekday</key><integer>%s</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>%s</integer></dict>\n' "$day" "$minute"
  done
}

calendar_xml() {
  printf '    <key>StartCalendarInterval</key>\n    <array>\n%s    </array>' "$(weekday_mornings "$1")"
}

write_plist() {
  local label="$1" script="$2" schedule_xml="$3" args="${4:-}"
  cat > "$AGENTS_DIR/$label.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>$label</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PYTHON</string>
        <string>$SCRIPTS_DIR/$script</string>
${args}    </array>
    <key>WorkingDirectory</key><string>$SCRIPTS_DIR</string>
    <key>StandardOutPath</key><string>$LOG_DIR/$label.log</string>
    <key>StandardErrorPath</key><string>$LOG_DIR/$label.log</string>
$schedule_xml
</dict>
</plist>
PLIST
}

write_plist com.lifeos.capture capture_ingest.py \
  "    <key>StartInterval</key><integer>900</integer>
    <key>RunAtLoad</key><true/>" \
  "        <string>--quiet</string>
"
write_plist com.lifeos.brief.world       brief_world.py       "$(calendar_xml 0)"
write_plist com.lifeos.brief.ai_research  brief_ai_research.py "$(calendar_xml 5)"
write_plist com.lifeos.brief.german_word  brief_german.py      "$(calendar_xml 10)"

unload_all
for label in "${LABELS[@]}"; do
  launchctl bootstrap "gui/$UID" "$AGENTS_DIR/$label.plist"
done

echo "installed:"
launchctl list | grep -E '^\S+\s+\S+\s+com\.lifeos\.(capture|brief)' || true
echo "logs: $LOG_DIR"

# --- macOS privacy (TCC) check ------------------------------------------------
# A launchd agent is not your shell: it inherits none of the Files-and-Folders
# consent your terminal has, and both ~/Desktop and iCloud Drive are protected.
# Denied, the job doesn't error usefully — the interpreter hangs during startup
# reading its own venv config, writes an empty log, and never exits. Probe for it
# now, because the alternative is silence at 07:00 and an inbox that never fills.
CAPTURE_DIR=""
if command -v sqlite3 >/dev/null && [[ -f "$REPO_DIR/data/lifeos.db" ]]; then
  capture_path=$(sqlite3 "$REPO_DIR/data/lifeos.db" \
    "SELECT value FROM config WHERE key = 'capture.file_path';" 2>/dev/null || true)
  [[ -n "$capture_path" ]] && CAPTURE_DIR="$(dirname "$capture_path")"
fi

PROBE_LABEL=com.lifeos.tccprobe
PROBE_PLIST="/tmp/$PROBE_LABEL.plist"
PROBE_LOG="/tmp/$PROBE_LABEL.log"
rm -f "$PROBE_LOG"
cat > "$PROBE_PLIST" <<PROBE
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>$PROBE_LABEL</string>
    <key>ProgramArguments</key>
    <array>
      <string>/bin/sh</string><string>-c</string>
      <string>ls "$SCRIPTS_DIR" >/dev/null 2>&amp;1 || echo "repo denied"; [ -n "$CAPTURE_DIR" ] &amp;&amp; { ls "$CAPTURE_DIR" >/dev/null 2>&amp;1 || echo "capture denied"; }; echo done</string>
    </array>
    <key>StandardOutPath</key><string>$PROBE_LOG</string>
    <key>StandardErrorPath</key><string>$PROBE_LOG</string>
</dict>
</plist>
PROBE

launchctl bootout "gui/$UID/$PROBE_LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PROBE_PLIST" 2>/dev/null || true
launchctl kickstart -p "gui/$UID/$PROBE_LABEL" >/dev/null 2>&1 || true
for _ in $(seq 1 15); do grep -q done "$PROBE_LOG" 2>/dev/null && break; sleep 1; done
launchctl bootout "gui/$UID/$PROBE_LABEL" 2>/dev/null || true

if grep -q denied "$PROBE_LOG" 2>/dev/null; then
  PYTHON_REAL="$(python3 -c 'import os,sys;print(os.path.realpath(sys.argv[1]))' "$PYTHON" 2>/dev/null || echo "$PYTHON")"
  cat <<MSG

⚠️  macOS is blocking these jobs from reading their own files.

$(grep denied "$PROBE_LOG" | sed 's/^/    /')

    launchd agents get no Files-and-Folders consent, and both ~/Desktop and
    iCloud Drive are protected. Until this is granted, the jobs will hang at
    startup and write empty logs — they will not error.

    Fix: System Settings → Privacy & Security → Full Disk Access → + →
    press ⌘⇧G and paste:

        $PYTHON_REAL

    Then re-run this script. Verify with:
        launchctl kickstart -p gui/$UID/com.lifeos.capture
        cat $LOG_DIR/com.lifeos.capture.log
MSG
else
  echo "macOS privacy check: launchd can read the repo and the capture folder."
fi
rm -f "$PROBE_PLIST"
