import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";

export default function PersonalPage() {
  return (
    <PageShell page="Personal" title="Personal" subtitle="health · habits · money">
      <section>
        <SectionBanner accent="personal" title="Coming in Stage 2" caption="habits · health cards · bills · spending" />
        <p className="mt-4 text-sm text-muted">
          This page is built in Stage 2 — the next session. The schema behind it already exists.
        </p>
      </section>
    </PageShell>
  );
}
