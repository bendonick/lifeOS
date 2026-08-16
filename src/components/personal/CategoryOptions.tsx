import type { CategoryGroup } from "@/lib/db/money";

// Shared <option> set for category pickers, in budget order. Multi-leaf lines
// (Food & drink, Additional expenses) get an optgroup; a line with exactly one
// leaf collapses to a single option labelled by the budget line itself — the
// picker speaks the budget's language without repeating every name twice.

export function CategoryOptions({ groups }: { groups: CategoryGroup[] }) {
  return (
    <>
      {groups.map((g) =>
        g.categories.length === 1 && g.line !== "Not budgeted" ? (
          <option key={g.line} value={g.categories[0]}>
            {g.line}
          </option>
        ) : (
          <optgroup key={g.line} label={g.line}>
            {g.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </optgroup>
        )
      )}
    </>
  );
}
