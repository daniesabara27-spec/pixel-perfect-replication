import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/pencarian-barang")({
  head: () => ({
    meta: [
      { title: "Pencarian Barang — LOGISTIK KCC" },
      { name: "description", content: "Cari barang berdasarkan barcode atau lokasi rak." },
      { property: "og:title", content: "Pencarian Barang — LOGISTIK KCC" },
      { property: "og:description", content: "Cari barang berdasarkan barcode atau lokasi rak." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Pencarian Barang" description="Cari barang berdasarkan barcode atau lokasi rak." />;
}
