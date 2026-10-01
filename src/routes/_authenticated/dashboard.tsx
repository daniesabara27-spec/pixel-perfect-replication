import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Boxes, ArrowDownToLine, ArrowUpFromLine, Target, Hash, CalendarDays, TrendingUp, Layers } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — LOGISTIK KCC" },
      { name: "description", content: "Ringkasan stok, packing, inbound, outbound dan transfer gudang." },
      { property: "og:title", content: "Dashboard — LOGISTIK KCC" },
      { property: "og:description", content: "Ringkasan stok, packing, inbound, outbound dan transfer gudang." },
    ],
  }),
  component: Page,
});

type Jenis = "ringkasan" | "packing" | "inbound" | "outbound" | "transfer";
type Periode = "7" | "14" | "30" | "bulan";

const fmt = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("id-ID").format(Number(n)));
const iso = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const tglPendek = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

function rentang(p: Periode) {
  const now = new Date();
  const sampai = iso(now);
  if (p === "bulan") return { dari: sampai.slice(0, 8) + "01", sampai };
  const d = new Date(now.getTime() - (Number(p) - 1) * 86400000);
  return { dari: iso(d), sampai };
}

const selectCls = "glass min-h-11 rounded-2xl px-3 text-sm font-semibold text-foreground outline-none";

function Page() {
  const [jenis, setJenis] = useState<Jenis>("ringkasan");
  const [periode, setPeriode] = useState<Periode>("7");
  const { dari, sampai } = useMemo(() => rentang(periode), [periode]);

  const q = useQuery({
    queryKey: ["dashboard", jenis, dari, sampai],
    queryFn: async () => {
      if (jenis === "ringkasan") {
        const { data, error } = await supabase.rpc("dashboard_ringkasan", { _dari: dari, _sampai: sampai });
        if (error) throw error;
        return data as any;
      }
      const { data, error } = await supabase.rpc("dashboard_detail", { _jenis: jenis, _dari: dari, _sampai: sampai });
      if (error) throw error;
      return data as any;
    },
  });

  const hariIni = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{hariIni}</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Pilih dashboard" className={selectCls} value={jenis} onChange={(e) => setJenis(e.target.value as Jenis)}>
            <option value="ringkasan">Ringkasan</option>
            <option value="packing">Packing</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="transfer">Transfer</option>
          </select>
          <select aria-label="Periode" className={selectCls} value={periode} onChange={(e) => setPeriode(e.target.value as Periode)}>
            <option value="7">7 hari</option>
            <option value="14">14 hari</option>
            <option value="30">30 hari</option>
            <option value="bulan">Bulan ini</option>
          </select>
          <button onClick={() => q.refetch()} className="btn-gradient flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold" aria-label="Muat ulang">
            <RefreshCw className={cn("size-4", q.isFetching && "animate-spin")} /> Refresh
          </button>
        </div>
      </header>

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <div className="glass p-6 text-sm text-destructive">Gagal memuat data: {(q.error as Error).message}</div>
      ) : jenis === "ringkasan" ? (
        <Ringkasan d={q.data} />
      ) : (
        <Detail d={q.data} />
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl bg-white/50" />)}
      </div>
      <Skeleton className="h-72 rounded-3xl bg-white/50" />
      <Skeleton className="h-72 rounded-3xl bg-white/50" />
    </div>
  );
}

function Kpi({ label, value, icon: Icon, sub }: { label: string; value: string; icon: typeof Boxes; sub?: string | undefined }) {
  return (
    <div className="glass animate-in fade-in p-4 duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="grid size-8 place-items-center rounded-xl bg-white/60 text-primary"><Icon className="size-4" /></span>
      </div>
      <p className="mt-2 truncate text-2xl font-extrabold tracking-tight">{value}</p>
      {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tip = { contentStyle: { borderRadius: 16, border: "1px solid var(--glass-border)", background: "var(--glass-bg-strong)" } };

function Ringkasan({ d }: { d: any }) {
  const gudang = (d.akurasi_gudang ?? []).map((g: any) => ({ ...g, gudang: g.gudang === "WXTEMP" ? "WX Temp" : g.gudang, akurasi: g.akurasi ?? 0 }));
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total Stock" value={fmt(d.total_stock)} icon={Boxes} sub="Semua gudang" />
        <Kpi label="Inbound hari ini" value={fmt(d.inbound_hari_ini)} icon={ArrowDownToLine} sub="Dari Packing" />
        <Kpi label="Outbound hari ini" value={fmt(d.outbound_hari_ini)} icon={ArrowUpFromLine} sub="Shipment" />
        <Kpi label="Akurasi Stock" value={d.akurasi == null ? "—" : `${d.akurasi}%`} icon={Target} sub="Rata-rata audit rak" />
      </div>
      <Panel title="Tren Packing vs Shipment">
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={d.tren}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="tanggal" tickFormatter={tglPendek} tick={axis} />
              <YAxis tick={axis} width={40} />
              <Tooltip {...tip} labelFormatter={tglPendek} />
              <Legend />
              <Line type="monotone" dataKey="packing" name="Packing" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="shipment" name="Shipment" stroke="var(--chart-2, #2563EB)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Akurasi Stock per Gudang (%)">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={gudang}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="gudang" tick={axis} />
              <YAxis domain={[0, 100]} tick={axis} width={40} />
              <Tooltip {...tip} />
              <Bar dataKey="akurasi" name="Akurasi" fill="var(--primary)" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function Detail({ d }: { d: any }) {
  const rata = d.hari_aktif ? Math.round(Number(d.total_qty) / d.hari_aktif) : 0;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Total Qty" value={fmt(d.total_qty)} icon={Boxes} />
        <Kpi label="Jumlah Entri" value={fmt(d.entri)} icon={Hash} />
        <Kpi label="Rata-rata / hari aktif" value={fmt(rata)} icon={TrendingUp} sub={`${d.hari_aktif} hari aktif`} />
        <Kpi label="Hari Puncak" value={d.puncak ? tglPendek(d.puncak.tanggal) : "—"} icon={CalendarDays} sub={d.puncak ? `${fmt(d.puncak.qty)} qty` : undefined} />
        <Kpi label={d.extra?.label ?? "-"} value={fmt(d.extra?.nilai)} icon={Layers} />
      </div>
      <Panel title="Tren Harian (Qty)">
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={d.tren}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="tanggal" tickFormatter={tglPendek} tick={axis} />
              <YAxis tick={axis} width={40} />
              <Tooltip {...tip} labelFormatter={tglPendek} />
              <Line type="monotone" dataKey="qty" name="Qty" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        {(d.breakdown ?? []).map((b: any) => <Breakdown key={b.judul} judul={b.judul} data={b.data} />)}
      </div>
    </div>
  );
}

function Breakdown({ judul, data }: { judul: string; data: { label: string; qty: number }[] }) {
  const max = Math.max(1, ...data.map((x) => Number(x.qty)));
  return (
    <Panel title={judul}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data di periode ini.</p>
      ) : (
        <ul className="grid gap-2">
          {data.map((x) => (
            <li key={x.label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{x.label}</span>
                <span className="shrink-0 font-bold">{fmt(x.qty)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/60">
                <div className="btn-gradient h-2 rounded-full" style={{ width: `${(Number(x.qty) / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
