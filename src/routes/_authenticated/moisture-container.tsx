import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/moisture-container")({
  head: () => ({
    meta: [
      { title: "Moisture Container — LOGISTIK KCC" },
      { name: "description", content: "Catat pengukuran kelembapan kontainer." },
      { property: "og:title", content: "Moisture Container — LOGISTIK KCC" },
      { property: "og:description", content: "Catat pengukuran kelembapan kontainer." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Moisture Container" description="Catat pengukuran kelembapan kontainer." />;
}
