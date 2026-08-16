import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";

export default function AcademicPage() {
  return (
    <PageShell page="Academic" title="Academic" subtitle="Courses · MSc project">
      <section>
        <SectionBanner accent="academic" title="Coming in Stage 3" caption="courses · assignments · exams · timetable" />
        <p className="mt-4 text-sm text-muted">
          This page is built in Stage 3, together with the real Google Calendar (ICS) integration.
        </p>
      </section>
    </PageShell>
  );
}
