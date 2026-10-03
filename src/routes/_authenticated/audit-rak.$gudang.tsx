import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { GUDANG } from "@/lib/nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/audit-rak/$gudang")({
  head: ({ params }) => ({
    meta: [
      { title: `Audit Rak ${params.gudang} — LOGISTIK KCC` },
      { name: "description", content: `Stock opname rak gudang ${params.gudang}.` },
      { property: "og:title", content: `Audit Rak ${params.gudang} — LOGISTIK KCC` },
      { property: "og:description", content: `Stock opname rak gudang ${params.gudang}.` },
    ],
  }),
  component: Page,
});

type Rak = { id: number; no_rak: string; erp: number; aktual: number | null; keterangan: string | null };

const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
const blokDari = (no: string) => no.match(/^[A-Za-z]+/)?.[0]?.toUpperCase() ?? "Lainnya";

function Page() {
  const { gudang } = Route.useParams();
  const label = GUDANG.find((g) => g.gudang === gudang)?.label ?? gudang;
  const [cari, setCari] = useState("");
  const [hanyaSelisih, setHanyaSelisih] = useState(false);

  const q = useQuery({
    queryKey: ["rak", gudang],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rak_list", { _warehouse: gudang });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, erp: Number(r.erp), aktual: r.aktual == null ? null : Number(r.aktual) })) as Rak[];
    },
  });

  const rows = q.data ?? [];
  const terisi = rows.filter((r) => r.aktual != null);
  const cocok = terisi.filter((r) => r.aktual === r.erp).length;
  const opname = rows.length ? Math.round((terisi.length / rows.length) * 1000) / 10 : 0;
  const akurasi = terisi.length ? Math.round((cocok / terisi.length) * 1000) / 10 : 0;

  const grup = useMemo(() => {
    const f = rows
      .filter((r) => r.no_rak.toLowerCase().includes(cari.trim().toLowerCase()))
      .filter((r) => !hanyaSelisih || (r.aktual != null && r.aktual !== r.erp))
      .sort((a, b) => collator.compare(a.no_rak, b.no_rak));
    const m = new Map<string, Rak[]>();
    for (const r of f) {
      const k = blokDari(r.no_rak);
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()].sort((a, b) => collator.compare(a[0], b[0]));
  }, [rows, cari, hanyaSelisih]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Audit Rak {label}</h1>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Total rak" value={String(rows.length)} />
        <Stat label="Opname" value={`${opname}%`} sub={`${terisi.length} terisi`} />
        <Stat label="Akurasi" value={`${akurasi}%`} sub={`${cocok} cocok`} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="glass flex flex-1 items-center gap-2 px-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari no rak" className="min-h-11 min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <button
          onClick={() => setHanyaSelisih((v) => !v)}
          className={cn("min-h-11 rounded-full px-4 text-sm font-semibold", hanyaSelisih ? "btn-gradient" : "glass")}
        >
          Hanya yang selisih
        </button>
      </div>

      {q.isLoading ? (
        <div className="grid gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl bg-white/50" />)}</div>
      ) : q.error ? (
        <p className="text-sm text-destructive">Gagal memuat rak: {(q.error as Error).message}</p>
      ) : grup.length === 0 ? (
        <div className="glass p-6 text-sm text-muted-foreground">
          {rows.length === 0 ? "Belum ada data rak untuk gudang ini." : "Tidak ada rak yang cocok dengan filter."}
        </div>
      ) : (
        <div className="grid gap-5">
          {grup.map(([blok, list]) => (
            <section key={blok}>
              <h2 className="mb-2 px-1 text-sm font-bold text-muted-foreground">Blok {blok}</h2>
              <div className="glass divide-y divide-white/60 overflow-hidden">
                <div className="hidden grid-cols-[1fr_70px_110px_70px_1.5fr_24px] gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground sm:grid">
                  <span>No Rak</span><span className="text-right">ERP</span><span>Aktual</span><span className="text-right">Selisih</span><span>Keterangan</span><span />
                </div>
                {list.map((r) => <Baris key={r.id} rak={r} gudang={gudang} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="glass p-3 sm:p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-xl font-extrabold sm:text-2xl">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Baris({ rak, gudang }: { rak: Rak; gudang: string }) {
  const qc = useQueryClient();
  const [aktual, setAktual] = useState(rak.aktual == null ? "" : String(rak.aktual));
  const [ket, setKet] = useState(rak.keterangan ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (aktual.trim() !== "" && (!Number.isFinite(Number(aktual)) || Number(aktual) < 0)) {
      setStatus("error");
      return;
    }
    const t = setTimeout(async () => {
      setStatus("saving");
      const nilai = aktual.trim() === "" ? null : Number(aktual);
      const { error } = await supabase.rpc("set_rak_aktual", { _id: rak.id, _aktual: nilai as number, _keterangan: ket });
      if (error) { toast.error(`Gagal simpan ${rak.no_rak}`); setStatus("error"); return; }
      setStatus("saved");
      qc.setQueryData<Rak[]>(["rak", gudang], (old) => old?.map((x) => (x.id === rak.id ? { ...x, aktual: nilai, keterangan: ket } : x)));
    }, 700);
    return () => clearTimeout(t);
  }, [aktual, ket]);

  const nilai = aktual.trim() === "" ? null : Number(aktual);
  const selisih = nilai == null ? null : nilai - rak.erp;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_70px_110px_70px_1.5fr_24px]">
      <div className="font-bold">{rak.no_rak}<span className="ml-2 text-xs font-normal text-muted-foreground sm:hidden">ERP {rak.erp}</span></div>
      <div className="hidden text-right sm:block">{rak.erp}</div>
      <input
        inputMode="numeric"
        type="number"
        value={aktual}
        onChange={(e) => setAktual(e.target.value)}
        placeholder="Aktual"
        aria-label={`Aktual ${rak.no_rak}`}
        className="row-start-2 min-h-11 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-base outline-none focus:ring-2 focus:ring-primary sm:row-start-auto"
      />
      <div className={cn("text-right font-bold", selisih == null ? "text-muted-foreground" : selisih === 0 ? "text-success" : "text-destructive")}>
        {selisih == null ? "—" : selisih > 0 ? `+${selisih}` : selisih}
      </div>
      <input
        value={ket}
        onChange={(e) => setKet(e.target.value)}
        placeholder="Keterangan"
        aria-label={`Keterangan ${rak.no_rak}`}
        className="row-start-2 min-h-11 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-sm outline-none focus:ring-2 focus:ring-primary sm:row-start-auto"
      />
      <span aria-live="polite" className="text-xs sm:block">
        {status === "saving" ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : status === "saved" ? <Check className="size-4 text-success" /> : status === "error" ? <span className="font-semibold text-destructive">!</span> : null}
      </span>
    </div>
  );
}
