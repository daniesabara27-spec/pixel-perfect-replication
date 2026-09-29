import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/instruksi-kerja")({
  head: () => ({
    meta: [
      { title: "Instruksi Kerja — LOGISTIK KCC" },
      { name: "description", content: "Kumpulan dokumen instruksi kerja gudang." },
      { property: "og:title", content: "Instruksi Kerja — LOGISTIK KCC" },
      { property: "og:description", content: "Kumpulan dokumen instruksi kerja gudang." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Instruksi Kerja" description="Kumpulan dokumen instruksi kerja gudang." />;
}
