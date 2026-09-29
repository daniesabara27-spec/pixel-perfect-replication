import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/inspeksi-pengiriman")({
  head: () => ({
    meta: [
      { title: "Inspeksi Pengiriman — LOGISTIK KCC" },
      { name: "description", content: "Checklist kelengkapan barang sebelum dikirim." },
      { property: "og:title", content: "Inspeksi Pengiriman — LOGISTIK KCC" },
      { property: "og:description", content: "Checklist kelengkapan barang sebelum dikirim." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Inspeksi Pengiriman" description="Checklist kelengkapan barang sebelum dikirim." />;
}
