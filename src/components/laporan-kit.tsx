import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inputClass } from "@/components/form-kit";
import { bukaFile, type Alat } from "@/lib/laporan-pdf";

export const alatAwal = (): Alat[] => ["Tensioner", "Sealer", "PDA"].map((nama) => ({ nama, jumlah: "", kondisi: "Baik", keterangan: "" }));

export function AlatEditor({ alat, setAlat }: { alat: Alat[]; setAlat: (a: Alat[]) => void }) {
  const upd = (i: number, p: Partial<Alat>) => setAlat(alat.map((a, j) => (j === i ? { ...a, ...p } : a)));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-primary">ALAT</span>
      {alat.map((a, i) => (
        <div key={i} className="glass grid grid-cols-2 gap-2 p-3 sm:grid-cols-[1.3fr_80px_110px_1.5fr_auto]">
          <input value={a.nama} readOnly={i < 3} onChange={(e) => upd(i, { nama: e.target.value })} placeholder="Nama alat" className={inputClass + (i < 3 ? " font-semibold" : "")} />
          <input value={a.jumlah} type="number" min="0" inputMode="numeric" onChange={(e) => upd(i, { jumlah: e.target.value })} placeholder="Jumlah" className={inputClass} />
          <select value={a.kondisi} onChange={(e) => upd(i, { kondisi: e.target.value })} className={inputClass}>
            <option>Baik</option><option>Rusak</option><option>Hilang</option>
          </select>
          <input value={a.keterangan} onChange={(e) => upd(i, { keterangan: e.target.value })} placeholder="Keterangan" className={inputClass} />
          {i >= 3 ? (
            <button type="button" aria-label="Hapus alat" onClick={() => setAlat(alat.filter((_, j) => j !== i))} className="grid size-12 place-items-center rounded-full text-destructive hover:bg-white/60"><Trash2 className="size-5" /></button>
          ) : <span className="hidden sm:block" />}
        </div>
      ))}
      <button type="button" onClick={() => setAlat([...alat, { nama: "", jumlah: "", kondisi: "Baik", keterangan: "" }])} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary">
        <Plus className="size-5" /> Tambah Alat
      </button>
    </div>
  );
}

export function TombolPdf({ path, nama, lihat = "Lihat Hasil Laporan" }: { path: string; nama: string; lihat?: string }) {
  const jalan = (dl?: string) => bukaFile("laporan", path, dl).catch((e) => toast.error("Gagal membuka PDF: " + e.message));
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => jalan()} className="btn-gradient flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"><Eye className="size-4" /> {lihat}</button>
      <button type="button" onClick={() => jalan(nama)} className="glass flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary"><Download className="size-4" /> Download</button>
    </div>
  );
}

export function RiwayatLaporan({ table, judul }: { table: "laporan_shift" | "nearmiss"; judul: string }) {
  const [buka, setBuka] = useState<number | null>(null);
  const q = useQuery({
    queryKey: ["riwayat-laporan", table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("id, tanggal, shift, pic, pdf_path").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });
  return (
    <section className="glass mt-6 p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-bold">{judul}</h2>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p> : q.error ? <p className="text-sm text-destructive">Riwayat gagal dimuat.</p> : !q.data?.length ? <p className="text-sm text-muted-foreground">Belum ada laporan.</p> : (
        <ul className="flex flex-col gap-2">
          {q.data.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-2xl bg-white/50 p-3">
              <button type="button" onClick={() => setBuka(buka === r.id ? null : r.id)} className="flex flex-wrap items-center justify-between gap-2 text-left text-sm">
                <span className="font-semibold">{r.tanggal ?? "-"} · Shift {r.shift ?? "-"}</span>
                <span className="text-muted-foreground">{r.pic ?? "-"}</span>
              </button>
              {r.pdf_path ? <TombolPdf path={r.pdf_path} nama={`${table}-${r.tanggal}-shift${r.shift}.pdf`} lihat="Lihat" /> : <span className="text-xs text-muted-foreground">PDF tidak tersedia</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
