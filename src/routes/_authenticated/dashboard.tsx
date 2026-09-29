import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — LOGISTIK KCC" },
      { name: "description", content: "Ringkasan aktivitas gudang dan logistik." },
      { property: "og:title", content: "Dashboard — LOGISTIK KCC" },
      { property: "og:description", content: "Ringkasan aktivitas gudang dan logistik." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Dashboard" description="Ringkasan aktivitas gudang dan logistik." />;
}
