import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — LOGISTIK KCC" },
      { name: "description", content: "Kelola pengguna dan impor Master Data." },
      { property: "og:title", content: "Pengaturan — LOGISTIK KCC" },
      { property: "og:description", content: "Kelola pengguna dan impor Master Data." },
    ],
  }),
  component: Page,
});

function Page() {
  return <PageShell title="Pengaturan" description="Kelola pengguna dan impor Master Data." />;
}
