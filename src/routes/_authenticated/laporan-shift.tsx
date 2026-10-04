import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, FormPage, ShiftSelect, SubmitButton, inputClass, usePicShift } from "@/components/form-kit";
import { AlatEditor, RiwayatLaporan, TombolPdf, alatAwal } from "@/components/laporan-kit";
import { hariIni, pdfLaporanShift, simpanPdf, type Alat } from "@/lib/laporan-pdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/laporan-shift")({
  head: () => ({
    meta: [
      { title: "Laporan Akhir Shift — LOGISTIK KCC" },
      { name: "description", content: "Buat laporan akhir shift logistik dalam bentuk PDF." },
      { property: "og:title", content: "Laporan Akhir Shift — LOGISTIK KCC" },
      { property: "og:description", content: "Buat laporan akhir shift logistik dalam bentuk PDF." },
    ],
  }),
  component: Page,
});

const KATEGORI = ["KOREA", "3RD", "DOMESTIK"] as const;
type Baris = { panjang: string; lebar: string; thickness: string; lokasi: string; total: string; kategori: string };
const kosong = (kategori = ""): Baris => ({ panjang: "", lebar: "", thickness: "", lokasi: "", total: "", kategori });
const isi = (b: Baris) => b.panjang || b.lebar || b.thickness || b.lokasi || b.total;

function Daftar({ judul, rows, setRows, lokasiLabel, kategori }: { judul: string; rows: Baris[]; setRows: (r: Baris[]) => void; lokasiLabel: string; kategori?: string }) {
  const upd = (i: number, p: Partial<Baris>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const tampil = rows.map((r, i) => ({ r, i })).filter(({ r }) => !kategori || r.kategori === kategori);
  return (
    <div className="flex flex-col gap-2">
      {tampil.map(({ r, i }, n) => (
        <div key={i} className="glass grid grid-cols-2 gap-2 p-3 sm:grid-cols-[repeat(5,1fr)_auto]">
          <span className="col-span-2 text-xs font-bold text-muted-foreground sm:hidden">{judul} #{n + 1}</span>
          <input value={r.panjang} onChange={(e) => upd(i, { panjang: e.target.value })} placeholder="Panjang" inputMode="decimal" className={inputClass} />
          <input value={r.lebar} onChange={(e) => upd(i, { lebar: e.target.value })} placeholder="Lebar" inputMode="decimal" className={inputClass} />
          <input value={r.thickness} onChange={(e) => upd(i, { thickness: e.target.value })} placeholder="Thickness" className={inputClass} />
          <input value={r.lokasi} onChange={(e) => upd(i, { lokasi: e.target.value })} placeholder={lokasiLabel} className={inputClass} />
          <input value={r.total} onChange={(e) => upd(i, { total: e.target.value })} placeholder="Total Pack" type="number" min="0" inputMode="numeric" className={inputClass} />
          <button type="button" aria-label="Hapus baris" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="grid size-12 place-items-center justify-self-end rounded-full text-destructive hover:bg-white/60"><Trash2 className="size-5" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, kosong(kategori)])} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary">
        <Plus className="size-5" /> Tambah {judul}{kategori ? ` ${kategori}` : ""}
      </button>
    </div>
  );
}

function Page() {
  const qc = useQueryClient();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [tanggal, setTanggal] = useState(hariIni);
  const [inbound, setInbound] = useState<Baris[]>([kosong()]);
  const [outbound, setOutbound] = useState<Baris[]>([kosong("KOREA")]);
  const [tab, setTab] = useState<string>("KOREA");
  const [alat, setAlat] = useState<Alat[]>(alatAwal);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<{ path: string; nama: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!tanggal) return;
    setLoading(true);
    try {
      const inb = inbound.filter(isi), out = outbound.filter(isi);
      const seksi = [
        { judul: "INBOUND", head: ["No", "Panjang", "Lebar", "Thickness", "No Rak", "Total Pack"], body: inb.map((r, i) => [i + 1, r.panjang, r.lebar, r.thickness, r.lokasi, r.total]) },
        { judul: "OUTBOUND", head: ["No", "Kategori", "Panjang", "Lebar", "Thickness", "No Kontainer", "Total Pack"], body: out.map((r, i) => [i + 1, r.kategori, r.panjang, r.lebar, r.thickness, r.lokasi, r.total]) },
      ];
      const alatIsi = alat.filter((a) => a.nama.trim());
      const blob = await pdfLaporanShift({ tanggal, shift, pic, seksi, alat: alatIsi });
      const path = await simpanPdf(blob, "laporan-shift");
      const { error } = await supabase.from("laporan_shift").insert({ tanggal, shift, pic: pic.trim() || null, data: { sumber: "manual", inbound: inb, outbound: out, alat: alatIsi }, pdf_path: path });
      if (error) throw error;
      toast.success("Laporan tersimpan.");
      setHasil({ path, nama: `laporan-shift-${tanggal}-shift${shift}.pdf` });
      setInbound([kosong()]); setOutbound([kosong("KOREA")]); setAlat(alatAwal());
      qc.invalidateQueries({ queryKey: ["riwayat-laporan", "laporan_shift"] });
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormPage title="Laporan Akhir Shift">
      <form onSubmit={submit} className="glass flex flex-col gap-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal"><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} /></Field>
          <Field label="PIC"><input value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>
        <span className="text-sm font-bold text-primary">INBOUND</span>
        <Daftar judul="Inbound" rows={inbound} setRows={setInbound} lokasiLabel="No Rak" />
        <span className="text-sm font-bold text-primary">OUTBOUND</span>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-white/50 p-1">
          {KATEGORI.map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("min-h-10 rounded-full text-sm font-bold", tab === k ? "btn-gradient" : "text-slate-600")}>
              {k} ({outbound.filter((r) => r.kategori === k && isi(r)).length})
            </button>
          ))}
        </div>
        <Daftar judul="Outbound" rows={outbound} setRows={setOutbound} lokasiLabel="No Kontainer" kategori={tab} />
        <AlatEditor alat={alat} setAlat={setAlat} />
        <SubmitButton disabled={!tanggal} loading={loading}>Simpan & Buat PDF</SubmitButton>
        {hasil ? <TombolPdf path={hasil.path} nama={hasil.nama} /> : null}
      </form>
      <RiwayatLaporan table="laporan_shift" judul="Riwayat Laporan Akhir Shift" />
    </FormPage>
  );
}
