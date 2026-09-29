import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/packing")({
  head: () => ({
    meta: [
      { title: "Input Packing — LOGISTIK KCC" },
      { name: "description", content: "Catat hasil packing per rak dan barcode." },
      { property: "og:title", content: "Input Packing — LOGISTIK KCC" },
      { property: "og:description", content: "Catat hasil packing per rak dan barcode." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Input Packing" description="Catat hasil packing per rak dan barcode." />;
}
