import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, ScanLine, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, shiftSekarang } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-12 w-full rounded-2xl border border-white/70 bg-white/65 px-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-70";

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string | null }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-sm font-semibold text-destructive">{error}</span> : null}
    </label>
  );
}

export function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function ShiftSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {["1", "2", "3"].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn("min-h-12 rounded-2xl text-base font-semibold transition", value === s ? "btn-gradient" : "glass text-slate-600")}
        >
          Shift {s}
        </button>
      ))}
    </div>
  );
}

/** PIC dari profil (tetap bisa diedit) + shift dari jam sekarang. */
export function usePicShift() {
  const { data: profil } = useProfile();
  const [pic, setPic] = useState("");
  const [shift, setShift] = useState<string>(shiftSekarang());
  useEffect(() => {
    if (profil?.nama && !pic) setPic(profil.nama);
  }, [profil?.nama]); // eslint-disable-line react-hooks/exhaustive-deps
  return { pic, setPic, shift, setShift };
}

type Master = { barcode: string; product_name: string | null; thickness: string | null; stock: number | null };

/** Seluruh master_data dimuat sekali ke memori agar lookup instan. */
export function useMasterMap() {
  return useQuery({
    queryKey: ["master-map"],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const map = new Map<string, Master>();
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("master_data")
          .select("barcode, product_name, thickness, stock")
          .range(from, from + 999);
        if (error) throw error;
        data.forEach((m) => map.set(m.barcode.toLowerCase(), m));
        if (data.length < 1000) break;
      }
      return map;
    },
  });
}

export type BarisBarcode = { key: number; barcode: string; description: string; thickness: string; isi: string; status?: "ok" | "tidak" | "cari" | undefined };

let seq = 1;
export const barisBaru = (): BarisBarcode => ({ key: seq++, barcode: "", description: "", thickness: "", isi: "" });

export function BarcodeList({ rows, setRows }: { rows: BarisBarcode[]; setRows: (fn: (r: BarisBarcode[]) => BarisBarcode[]) => void }) {
  const master = useMasterMap();
  const [scanKey, setScanKey] = useState<number | null>(null);

  const update = (key: number, patch: Partial<BarisBarcode>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function lookup(key: number, raw: string) {
    const code = raw.trim();
    if (!code) return update(key, { status: undefined });
    let m = master.data?.get(code.toLowerCase());
    if (!m) {
      update(key, { status: "cari" });
      const { data, error } = await supabase.from("master_data").select("barcode, product_name, thickness, stock").ilike("barcode", code).maybeSingle();
      if (error) {
        update(key, { status: "tidak" });
        toast.error("Pencarian barcode gagal. Coba lagi.");
        return;
      }
      m = data ?? undefined;
    }
    if (m) update(key, { barcode: m.barcode, description: m.product_name ?? "", thickness: m.thickness ?? "", isi: m.stock != null ? String(m.stock) : "", status: "ok" });
    else update(key, { status: "tidak" });
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-slate-700">Daftar Barcode</span>
      {rows.map((r, i) => (
        <div key={r.key} className="glass flex flex-col gap-2 p-3">
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
            <input
              value={r.barcode}
              onChange={(e) => update(r.key, { barcode: e.target.value, status: undefined })}
              onBlur={(e) => lookup(r.key, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(r.key, r.barcode); } }}
              placeholder="Ketik / scan barcode"
              className={inputClass}
            />
            <button type="button" onClick={() => setScanKey(r.key)} aria-label="Scan barcode" className="btn-gradient grid size-12 shrink-0 place-items-center rounded-full">
              <ScanLine className="size-5" />
            </button>
            {rows.length > 1 ? (
              <button type="button" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label="Hapus baris" className="grid size-12 shrink-0 place-items-center rounded-full text-destructive hover:bg-white/60">
                <Trash2 className="size-5" />
              </button>
            ) : null}
          </div>
          {r.status === "cari" ? <span className="flex items-center gap-1 pl-8 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Mencari…</span> : null}
          {r.status === "tidak" ? <span className="pl-8 text-xs font-semibold text-destructive">Barcode tidak ada di master data — isi manual.</span> : null}
          <div className="grid grid-cols-1 gap-2 pl-8 sm:grid-cols-[1fr_120px_100px]">
            <input value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} placeholder="Description" className={inputClass} />
            <input value={r.thickness} onChange={(e) => update(r.key, { thickness: e.target.value })} placeholder="Thickness" className={inputClass} />
            <input value={r.isi} inputMode="decimal" type="number" min="0" step="any" onChange={(e) => update(r.key, { isi: e.target.value })} placeholder="Isi" className={inputClass} />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setRows((x) => [...x, barisBaru()])} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary">
        <Plus className="size-5" /> Tambah Barcode
      </button>
      {scanKey != null ? (
        <Scanner
          onClose={() => setScanKey(null)}
          onResult={(v) => { const k = scanKey; setScanKey(null); update(k, { barcode: v }); lookup(k, v); }}
        />
      ) : null}
    </div>
  );
}

export const barisTerisi = (rows: BarisBarcode[]) => rows.filter((r) => r.barcode.trim());
export const barisValid = (rows: BarisBarcode[]) =>
  barisTerisi(rows).length > 0 &&
  barisTerisi(rows).every((r) => r.isi.trim() !== "" && Number.isFinite(Number(r.isi)) && Number(r.isi) >= 0);
export const toNum = (v: string) => (v.trim() === "" || isNaN(Number(v)) ? null : Number(v));

export function SubmitButton({ disabled, loading, children = "Simpan" }: { disabled?: boolean; loading?: boolean; children?: ReactNode }) {
  return (
    <button type="submit" disabled={disabled || loading} className="btn-gradient mt-2 flex min-h-12 items-center justify-center gap-2 rounded-full text-base font-bold disabled:cursor-not-allowed disabled:opacity-50">
      {loading ? <Loader2 className="size-5 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Riwayat({ table, cols }: { table: "packing" | "inbound" | "outbound" | "transfer"; cols: { key: string; label: string }[] }) {
  const q = useQuery({
    queryKey: ["riwayat", table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as Record<string, unknown>[];
    },
  });
  const fmt = useMemo(() => new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jakarta" }), []);
  return (
    <section className="glass mt-6 p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-bold">Riwayat 20 entri terakhir</h2>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p> : q.error ? <p className="text-sm text-destructive">Riwayat gagal dimuat. Coba muat ulang halaman.</p> : !q.data?.length ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="py-2 pr-3">Waktu</th>{cols.map((c) => <th key={c.key} className="py-2 pr-3">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={String(r["id"])} className="border-t border-white/60">
                  <td className="whitespace-nowrap py-2 pr-3">{fmt.format(new Date(String(r["created_at"])))}</td>
                  {cols.map((c) => <td key={c.key} className="py-2 pr-3">{r[c.key] == null ? "-" : String(r[c.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function FormPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {children}
    </div>
  );
}

export function Scanner({ onClose, onResult }: { onClose: () => void; onResult: (v: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      toast.error("Browser ini belum mendukung scan kamera. Ketik barcode secara manual.");
      onClose();
      return;
    }
    let stream: MediaStream | null = null;
    let stop = false;
    const detector = new BD();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]?.rawValue) { onResult(codes[0].rawValue); break; }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        toast.error("Kamera tidak dapat dibuka.");
        onClose();
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/60 p-4">
      <div className="glass-strong w-full max-w-md p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold">Arahkan kamera ke barcode</span>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-white/60" aria-label="Tutup"><X className="size-5" /></button>
        </div>
        <video ref={video} playsInline muted className="aspect-[4/3] w-full rounded-2xl object-cover" />
      </div>
    </div>
  );
}
