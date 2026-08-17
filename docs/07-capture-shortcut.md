# 07 — The capture Shortcut (phone → LifeOS)

Decision #33 replaced the Notion relay with an iOS Shortcut that appends one JSON line
to a file in iCloud Drive. This document is that Shortcut written down, so it can be
rebuilt from scratch on a new phone without reverse-engineering anything.

**Nothing on the phone parses, classifies or thinks.** It writes the words you said and
a timestamp. Everything else happens on the Mac at ingest (decision #34).

## The contract

One JSON object per line, appended to:

```
iCloud Drive / LifeOS / capture.jsonl
= ~/Library/Mobile Documents/com~apple~CloudDocs/LifeOS/capture.jsonl
```

```json
{"id": "20260817T093913-472913", "text": "email prof meier about the exam by friday", "at": "2026-08-17T09:39:13+02:00"}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Any string unique per capture. Ingest dedupes on it — a line without one is skipped rather than re-ingested on every run. |
| `text` | yes | The raw capture. Quotes and backslashes must be escaped (step 2–3 below) or the line is unparseable. |
| `at` | no | ISO 8601 with offset. Missing or unparseable → ingest stamps the time it read the line. |

The path is not hardcoded — it is the `capture.file_path` row in `config`. Point it
somewhere else with:

```sh
sqlite3 data/lifeos.db "UPDATE config SET value = '/new/path/capture.jsonl' WHERE key = 'capture.file_path';"
```

## Building it

Shortcuts app → **+** → name it **LifeOS** (the name is what Siri listens for, so
"Hey Siri, LifeOS" runs it). Then add these actions in order:

1. **Dictate Text** — *Language: English*, *Stop Listening: After Pause*.
   Swap for **Ask for Input → Text** if you would rather type than speak.
2. **Replace Text** — Find `\` , Replace with `\\`, in *Dictated Text*.
   (Backslash first. Doing it after step 3 would double-escape the quotes it just added.)
3. **Replace Text** — Find `"` , Replace with `\"`, in the result of step 2.
4. **Format Date** — *Date: Current Date*, *Format: ISO 8601*, **Include Time: on**.
5. **Random Number** — between `100000` and `999999`. This plus the timestamp is the
   capture id; a UUID would be tidier but Shortcuts has no UUID action.
6. **Get File** — *Service: iCloud Drive*, path `LifeOS/capture.jsonl`,
   **Error If Not Found: off** (the first ever capture has no file to read).
7. **Text** — one line, no wrapping:
   ```
   [File][{"id":"[Formatted Date]-[Random Number]","text":"[Updated Text]","at":"[Formatted Date]"}]
   ```
   with a newline at the end. `[File]` is the existing contents from step 6 — this is a
   read-modify-write, because Shortcuts cannot append to a file.
8. **Save File** — *Service: iCloud Drive*, path `LifeOS/`, filename `capture.jsonl`,
   **Ask Where To Save: off**, **Overwrite If File Exists: on**.
9. *(optional)* **Show Notification** — "captured", so a silent failure isn't invisible.

Then: Shortcut settings → **Add to Home Screen** and/or **Back Tap** (Settings →
Accessibility → Touch → Back Tap → Double Tap → LifeOS) for a capture that needs no
voice at all.

## Verifying it

1. Run it once on the phone, say something.
2. On the Mac: `cat ~/Library/Mobile\ Documents/com~apple~CloudDocs/LifeOS/capture.jsonl`
   — the line should be there within seconds (iCloud, so occasionally a minute).
3. Press **Sync phone** in the LifeOS Inbox, or wait for the 15-minute launchd job.
4. The capture appears in the Inbox with a proposal chip under it.

## When it misbehaves

| Symptom | Cause |
|---|---|
| `"malformed": 1` in the sync summary | An unescaped quote in the text — steps 2–3 are missing or in the wrong order. |
| The same capture ingests repeatedly | The `id` field is empty. Check step 7 references *Random Number* and *Formatted Date*. |
| Nothing arrives on the Mac | iCloud hasn't synced yet, or the Shortcut wrote to *On My iPhone* instead of iCloud Drive (step 8's service). |
| The file grows but the Inbox stays empty | `capture.file_path` in `config` points somewhere else, or the launchd job isn't loaded — `launchctl list \| grep lifeos`. |
| Old captures reappear after deleting rows | Deleting an `inbox` row deletes the dedupe record with it. Trim the `.jsonl` file too, or the next sync re-ingests. |

## Alternatives, if this ever annoys

Recorded in decision #33 and BACKLOG: Apple Reminders read via AppleScript/EventKit
(Siri-native, needs a macOS automation grant), a Telegram bot, or the original Notion
relay (decision #7, superseded but recoverable from the ledger).
