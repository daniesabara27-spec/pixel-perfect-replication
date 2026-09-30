import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/audit-rak/$gudang")({
  head: ({ params }) => ({
    meta: [
      { title: `Audit Rak ${params.gudang} — LOGISTIK KCC` },
      { name: "description", content: `Audit rak gudang ${params.gudang}.` },
      { property: "og:title", content: `Audit Rak ${params.gudang} — LOGISTIK KCC` },
      { property: "og:description", content: `Audit rak gudang ${params.gudang}.` },
    ],
  }),
  component: Page,
});

function Page() {
  const { gudang } = Route.useParams();
  return <PageShell title={`Audit Rak ${gudang}`} description={`Audit rak gudang ${gudang}.`} />;
}
