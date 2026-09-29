import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/inbound")({
  head: () => ({
    meta: [
      { title: "Input Inbound — LOGISTIK KCC" },
      { name: "description", content: "Catat penerimaan barang dari KCC atau Wanxinda." },
      { property: "og:title", content: "Input Inbound — LOGISTIK KCC" },
      { property: "og:description", content: "Catat penerimaan barang dari KCC atau Wanxinda." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Input Inbound" description="Catat penerimaan barang dari KCC atau Wanxinda." />;
}
