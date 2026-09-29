import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/nearmiss")({
  head: () => ({
    meta: [
      { title: "Nearmiss Accident — LOGISTIK KCC" },
      { name: "description", content: "Laporan kejadian hampir celaka di area kerja." },
      { property: "og:title", content: "Nearmiss Accident — LOGISTIK KCC" },
      { property: "og:description", content: "Laporan kejadian hampir celaka di area kerja." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Nearmiss Accident" description="Laporan kejadian hampir celaka di area kerja." />;
}
