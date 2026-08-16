import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";

export default function ProfessionalPage() {
  return (
    <PageShell page="Professional" title="Professional" subtitle="Day job · learning · network">
      <section>
        <SectionBanner accent="professional" title="Coming in Stage 4" caption="Day job tasks · learning · projects · network CRM" />
        <p className="mt-4 text-sm text-muted">
          This page is built in Stage 4. Day job, SousChef and golf-AI are already seeded as projects.
        </p>
      </section>
    </PageShell>
  );
}
