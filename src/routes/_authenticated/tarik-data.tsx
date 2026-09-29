import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/tarik-data")({
  head: () => ({
    meta: [
      { title: "Tarik Data — LOGISTIK KCC" },
      { name: "description", content: "Ambil dan unduh data sesuai rentang tanggal." },
      { property: "og:title", content: "Tarik Data — LOGISTIK KCC" },
      { property: "og:description", content: "Ambil dan unduh data sesuai rentang tanggal." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Tarik Data" description="Ambil dan unduh data sesuai rentang tanggal." />;
}
