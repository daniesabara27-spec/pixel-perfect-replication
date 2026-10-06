import { usePilihan } from "@/hooks/use-pilihan";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, FormPage, ShiftSelect, inputClass, usePicShift } from "@/components/form-kit";
import { AlatEditor, TombolPdf, alatAwal } from "@/components/laporan-kit";
import { hariIni, pdfLaporanShift, simpanPdf, type Alat } from "@/lib/laporan-pdf";
import { GUDANG } from "@/lib/nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tarik-data")({
  head: () => ({
    meta: [
      { title: "Tarik Data — LOGISTIK KCC" },
      { name: "description", content: "Ringkasan SKU per tanggal, shift, gudang dan kategori." },
      { property: "og:title", content: "Tarik Data — LOGISTIK KCC" },
      { property: "og:description", content: "Ringkasan SKU per tanggal, shift, gudang dan kategori." },
    ],
  }),
  component: Page,
});

const KAT = ["Packing", "Inbound", "Outbound"] as const;
type Kat = (typeof KAT)[number];
const TABEL: Record<Kat, "packing" | "inbound" | "outbound"> = { Packing: "packing", Inbound: "inbound", Outbound: "outbound" };
/** Kode gudang → nilai penempatan_gudang di Inbound. */
const PENEMPATAN: Record<string, string> = { KCC: "KCC", WX1: "WANXINDA 1", WX2: "WANXINDA 2", WX3: "WANXINDA 3", WXTEMP: "WANXINDA TEMP" };
type Hasil = { kat: Kat; rows: { sku: string; total: number }[] };

const besok = (t: string) => { const d = new Date(t + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

async function ambil(tabel: "packing" | "inbound" | "outbound", tanggal: string, shift: string) {
  const out: Record<string, any>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(tabel).select("*")
      .gte("created_at", `${tanggal}T00:00:00+07:00`).lt("created_at", `${besok(tanggal)}T00:00:00+07:00`)
      .eq("shift", shift).order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function Page() {
  const qc = useQueryClient();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [tanggal, setTanggal] = useState(hariIni);
  const [gudang, setGudang] = useState<string[]>(GUDANG.map((g) => g.gudang));
  const [kat, setKat] = useState<Kat[]>([...KAT]);
  const [hasil, setHasil] = useState<Hasil[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [jadikan, setJadikan] = useState(false);
  const alatDefault = usePilihan("alat");
  const [alat, setAlat] = useState<Alat[]>(() => alatAwal());
  const alatKey = alatDefault.join("|");
  useEffect(() => { setAlat((a) => (a.every((x) => !x.jumlah && !x.keterangan) ? alatAwal(alatDefault) : a)); }, [alatKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [saving, setSaving] = useState(false);
  const [pdf, setPdf] = useState<{ path: string; nama: string } | null>(null);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const semuaGudang = gudang.length === GUDANG.length;

  async function tarik() {
    if (!kat.length || !gudang.length) { toast.error("Pilih minimal satu kategori dan satu gudang."); return; }
    setLoading(true); setPdf(null);
    try {
      let rakSet: Set<string> | null = null;
      if (!semuaGudang && kat.includes("Packing")) {
        const { data, error } = await supabase.from("rak_audit").select("no_rak").in("warehouse", gudang).limit(10000);
        if (error) throw error;
        rakSet = new Set(data.map((r) => r.no_rak.trim().toUpperCase()));
      }
      const res: Hasil[] = [];
      for (const k of KAT.filter((x) => kat.includes(x))) {
        let rows = await ambil(TABEL[k], tanggal, shift);
        if (!semuaGudang) {
          if (k === "Packing") rows = rows.filter((r) => rakSet!.has(String(r["no_rak"] ?? "").trim().toUpperCase()));
          if (k === "Inbound") { const p = gudang.map((g) => PENEMPATAN[g]); rows = rows.filter((r) => p.includes(String(r["penempatan_gudang"] ?? ""))); }
        }
        const map = new Map<string, number>();
        rows.forEach((r) => { const s = String(r["description"] ?? "").trim() || "(tanpa description)"; map.set(s, (map.get(s) ?? 0) + Number(r["isi"] ?? 0)); });
        res.push({ kat: k, rows: [...map].map(([sku, total]) => ({ sku, total })).sort((a, b) => b.total - a.total) });
      }
      setHasil(res);
    } catch (e) {
      toast.error("Gagal menarik data: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function buatLaporan() {
    if (!hasil) return;
    setSaving(true);
    try {
      const seksi = hasil.map((h) => ({ judul: h.kat.toUpperCase(), head: ["No", "SKU (Description)", "Total"], body: [...h.rows.map((r, i) => [i + 1, r.sku, r.total]), ["", "TOTAL", h.rows.reduce((a, b) => a + b.total, 0)]] }));
      const alatIsi = alat.filter((a) => a.nama.trim());
      const blob = await pdfLaporanShift({ tanggal, shift, pic, seksi, alat: alatIsi });
      const path = await simpanPdf(blob, "laporan-shift");
      const { error } = await supabase.from("laporan_shift").insert({ tanggal, shift, pic: pic.trim() || null, data: { sumber: "tarik-data", gudang, kategori: kat, ringkasan: hasil, alat: alatIsi }, pdf_path: path });
      if (error) throw error;
      toast.success("Laporan Akhir Shift tersimpan.");
      setPdf({ path, nama: `laporan-shift-${tanggal}-shift${shift}.pdf` });
      qc.invalidateQueries({ queryKey: ["riwayat-laporan", "laporan_shift"] });
    } catch (e) {
      toast.error("Gagal membuat laporan: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const chip = (aktif: boolean) => cn("min-h-11 rounded-full px-4 text-sm font-semibold transition", aktif ? "btn-gradient" : "glass text-slate-600");

  return (
    <FormPage title="Tarik Data">
      <div className="glass flex flex-col gap-4 p-4 sm:p-5">
        <Field label="Tanggal"><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} /></Field>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">Warehouse</span>
          <div className="flex flex-wrap gap-2">
            {GUDANG.map((g) => <button key={g.gudang} type="button" onClick={() => setGudang(toggle(gudang, g.gudang))} className={chip(gudang.includes(g.gudang))}>{g.label}</button>)}
          </div>
          <span className="text-xs text-muted-foreground">Outbound tidak difilter per gudang. Semua dicentang = tanpa filter.</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">Kategori</span>
          <div className="flex flex-wrap gap-2">
            {KAT.map((k) => <button key={k} type="button" onClick={() => setKat(toggle(kat, k))} className={chip(kat.includes(k))}>{k}</button>)}
            <button type="button" onClick={() => setKat(kat.length === KAT.length ? [] : [...KAT])} className={chip(kat.length === KAT.length)}>Semua</button>
          </div>
        </div>
        <button type="button" onClick={tarik} disabled={loading} className="btn-gradient flex min-h-12 items-center justify-center gap-2 rounded-full text-base font-bold disabled:opacity-50">
          <Download className="size-5" /> {loading ? "Menarik…" : "Tarik Data"}
        </button>
      </div>

      {hasil ? (
        <>
          {hasil.map((h) => (
            <section key={h.kat} className="glass mt-4 p-4 sm:p-5">
              <h2 className="mb-2 text-lg font-bold">{h.kat}</h2>
              {!h.rows.length ? <p className="text-sm text-muted-foreground">Tidak ada data.</p> : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">SKU (Description)</th><th className="py-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {h.rows.map((r) => <tr key={r.sku} className="border-t border-white/60"><td className="py-2 pr-2">{r.sku}</td><td className="py-2 text-right font-semibold">{r.total.toLocaleString("id-ID")}</td></tr>)}
                    <tr className="border-t-2 border-primary/40 font-bold"><td className="py-2">TOTAL</td><td className="py-2 text-right">{h.rows.reduce((a, b) => a + b.total, 0).toLocaleString("id-ID")}</td></tr>
                  </tbody>
                </table>
              )}
            </section>
          ))}
          <section className="glass mt-4 flex flex-col gap-4 p-4 sm:p-5">
            <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
              Jadikan Laporan Akhir Shift
              <input type="checkbox" checked={jadikan} onChange={(e) => setJadikan(e.target.checked)} className="size-6 accent-[var(--color-primary)]" />
            </label>
            {jadikan ? (
              <>
                <Field label="PIC"><input value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
                <AlatEditor alat={alat} setAlat={setAlat} />
                <button type="button" onClick={buatLaporan} disabled={saving} className="btn-gradient flex min-h-12 items-center justify-center rounded-full text-base font-bold disabled:opacity-50">{saving ? "Menyimpan…" : "Simpan & Buat PDF"}</button>
                {pdf ? <TombolPdf path={pdf.path} nama={pdf.nama} /> : null}
              </>
            ) : null}
          </section>
        </>
      ) : null}
    </FormPage>
  );
}
