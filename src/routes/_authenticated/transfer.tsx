import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/transfer")({
  head: () => ({
    meta: [
      { title: "Input Transfer — LOGISTIK KCC" },
      { name: "description", content: "Catat transfer barang antar gudang." },
      { property: "og:title", content: "Input Transfer — LOGISTIK KCC" },
      { property: "og:description", content: "Catat transfer barang antar gudang." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Input Transfer" description="Catat transfer barang antar gudang." />;
}
