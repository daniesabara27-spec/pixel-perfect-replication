import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/laporan-shift")({
  head: () => ({
    meta: [
      { title: "Laporan Akhir Shift — LOGISTIK KCC" },
      { name: "description", content: "Rangkuman aktivitas dan laporan akhir setiap shift." },
      { property: "og:title", content: "Laporan Akhir Shift — LOGISTIK KCC" },
      { property: "og:description", content: "Rangkuman aktivitas dan laporan akhir setiap shift." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Laporan Akhir Shift" description="Rangkuman aktivitas dan laporan akhir setiap shift." />;
}
