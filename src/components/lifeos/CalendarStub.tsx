import { accentEvent, type Accent } from "@/components/ui/accents";
import { addDays, dayLabel, mondayOf, zurichToday } from "@/lib/dates";

// Stage 1 stub: fake events on the current week, tinted by domain (primary "Class"
// calendar in neutral). Replaced by real ICS data in Stage 3 (docs/03-pages/lifeos.md §4).
const FAKE_EVENTS: { day: number; start: number; end: number; title: string; accent: Accent }[] = [
  { day: 2, start: 8, end: 12, title: "Advanced Topics in AI", accent: "academic" },
  { day: 1, start: 9.5, end: 10, title: "Weekly 1:1", accent: "hub" },
  { day: 4, start: 14, end: 15, title: "Day job sync", accent: "professional" },
  { day: 3, start: 18, end: 19.5, title: "Training", accent: "personal" },
  { day: 5, start: 10, end: 11.5, title: "Long run", accent: "personal" },
];

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_PX = 40;

export function CalendarStub() {
  const today = zurichToday();
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <div className="grid min-w-175 grid-cols-[3rem_repeat(7,1fr)]">
        {/* header row */}
        <div className="border-b border-border" />
        {days.map((d) => (
          <div
            key={d}
            className={`border-b border-l border-border px-2 py-2 text-xs font-medium ${
              d === today ? "text-text" : "text-muted"
            }`}
          >
            {dayLabel(d)}
            {d === today && <span className="ml-1.5 text-[10px] text-faint">today</span>}
          </div>
        ))}

        {/* hour gutter */}
        <div className="relative" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-faint"
              style={{ top: i * HOUR_PX }}
            >
              {i > 0 && `${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* day columns */}
        {days.map((d, dayIdx) => (
          <div
            key={d}
            className={`relative border-l border-border ${d === today ? "bg-raised/40" : ""}`}
            style={{ height: hours.length * HOUR_PX }}
          >
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-border/50"
                style={{ top: i * HOUR_PX }}
              />
            ))}
            {FAKE_EVENTS.filter((e) => e.day === dayIdx).map((e) => (
              <div
                key={e.title}
                className={`absolute inset-x-1 overflow-hidden rounded border px-1.5 py-1 text-[11px] leading-tight ${accentEvent[e.accent]}`}
                style={{
                  top: (e.start - START_HOUR) * HOUR_PX + 1,
                  height: (e.end - e.start) * HOUR_PX - 2,
                }}
              >
                {e.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
