import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/outbound")({
  head: () => ({
    meta: [
      { title: "Input Outbound — LOGISTIK KCC" },
      { name: "description", content: "Catat pengiriman barang dan nomor kontainer." },
      { property: "og:title", content: "Input Outbound — LOGISTIK KCC" },
      { property: "og:description", content: "Catat pengiriman barang dan nomor kontainer." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Input Outbound" description="Catat pengiriman barang dan nomor kontainer." />;
}
