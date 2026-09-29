import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/inspeksi-outdoor")({
  head: () => ({
    meta: [
      { title: "Inspeksi Penyimpanan Outdoor — LOGISTIK KCC" },
      { name: "description", content: "Checklist kondisi penyimpanan barang di area luar." },
      { property: "og:title", content: "Inspeksi Penyimpanan Outdoor — LOGISTIK KCC" },
      { property: "og:description", content: "Checklist kondisi penyimpanan barang di area luar." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Inspeksi Penyimpanan Outdoor" description="Checklist kondisi penyimpanan barang di area luar." />;
}
