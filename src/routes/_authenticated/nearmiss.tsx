import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, ScanLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, FormPage, Scanner, ShiftSelect, SubmitButton, inputClass, useMasterMap, usePicShift } from "@/components/form-kit";
import { FotoInput, uploadFoto } from "@/components/foto-input";
import { RiwayatLaporan, TombolPdf } from "@/components/laporan-kit";
import { hariIni, pdfNearmiss, simpanPdf } from "@/lib/laporan-pdf";

export const Route = createFileRoute("/_authenticated/nearmiss")({
  head: () => ({
    meta: [
      { title: "Nearmiss Accident — LOGISTIK KCC" },
      { name: "description", content: "Laporkan kejadian nearmiss dan buat berita acara PDF." },
      { property: "og:title", content: "Nearmiss Accident — LOGISTIK KCC" },
      { property: "og:description", content: "Laporkan kejadian nearmiss dan buat berita acara PDF." },
    ],
  }),
  component: Page,
});

const jamSekarang = () => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date());

function Page() {
  const qc = useQueryClient();
  const master = useMasterMap();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [tanggal, setTanggal] = useState(hariIni);
  const [jam, setJam] = useState(jamSekarang);
  const [barcode, setBarcode] = useState("");
  const [desc, setDesc] = useState("");
  const [tidakAda, setTidakAda] = useState(false);
  const [manpower, setManpower] = useState([{ nama: "", jabatan: "" }]);
  const [kronologi, setKronologi] = useState("");
  const [foto, setFoto] = useState<(File | null)[]>([null]);
  const [scan, setScan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<{ path: string; nama: string } | null>(null);

  async function lookup(raw: string) {
    const code = raw.trim();
    setTidakAda(false);
    if (!code) return;
    let m = master.data?.get(code.toLowerCase());
    if (!m) {
      const { data } = await supabase.from("master_data").select("barcode, product_name, thickness, stock").ilike("barcode", code).maybeSingle();
      m = data ?? undefined;
    }
    if (m) { setBarcode(m.barcode); setDesc(m.product_name ?? ""); } else setTidakAda(true);
  }

  const valid = !!tanggal && kronologi.trim() !== "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const files = foto.filter((f): f is File => !!f);
      const mp = manpower.filter((m) => m.nama.trim());
      const blob = await pdfNearmiss({ tanggal, jam, shift, pic, barcode, description: desc, manpower: mp, kronologi, foto: files });
      const path = await simpanPdf(blob, "nearmiss");
      const fotoPaths: string[] = [];
      for (const f of files) fotoPaths.push((await uploadFoto(f, "nearmiss"))!);
      const { error } = await supabase.from("nearmiss").insert({ tanggal, jam: jam || null, shift, pic: pic.trim() || null, no_barcode: barcode.trim() || null, description: desc.trim() || null, manpower: mp, kronologi: kronologi.trim(), foto: fotoPaths, pdf_path: path });
      if (error) throw error;
      toast.success("Laporan nearmiss tersimpan.");
      setHasil({ path, nama: `nearmiss-${tanggal}.pdf` });
      setBarcode(""); setDesc(""); setManpower([{ nama: "", jabatan: "" }]); setKronologi(""); setFoto([null]);
      qc.invalidateQueries({ queryKey: ["riwayat-laporan", "nearmiss"] });
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormPage title="Nearmiss Accident">
      <form onSubmit={submit} className="glass flex flex-col gap-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tanggal"><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} /></Field>
          <Field label="Jam"><input type="time" value={jam} onChange={(e) => setJam(e.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>
        <Field label="PIC"><input value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        <Field label="No Barcode" error={tidakAda ? "Barcode tidak ada di master data — isi manual." : null}>
          <div className="flex gap-2">
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} onBlur={(e) => lookup(e.target.value)} placeholder="Ketik / scan barcode" className={inputClass} />
            <button type="button" onClick={() => setScan(true)} aria-label="Scan barcode" className="btn-gradient grid size-12 shrink-0 place-items-center rounded-full"><ScanLine className="size-5" /></button>
          </div>
        </Field>
        <Field label="Description"><input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputClass} /></Field>
        <span className="text-sm font-semibold text-slate-700">Manpower Terlibat</span>
        {manpower.map((m, i) => (
          <div key={i} className="flex gap-2">
            <input value={m.nama} onChange={(e) => setManpower(manpower.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))} placeholder="Nama" className={inputClass} />
            <input value={m.jabatan} onChange={(e) => setManpower(manpower.map((x, j) => (j === i ? { ...x, jabatan: e.target.value } : x)))} placeholder="Jabatan" className={inputClass} />
            {manpower.length > 1 ? <button type="button" aria-label="Hapus" onClick={() => setManpower(manpower.filter((_, j) => j !== i))} className="grid size-12 shrink-0 place-items-center rounded-full text-destructive"><Trash2 className="size-5" /></button> : null}
          </div>
        ))}
        <button type="button" onClick={() => setManpower([...manpower, { nama: "", jabatan: "" }])} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary"><Plus className="size-5" /> Tambah Manpower</button>
        <Field label="Kronologi (wajib)">
          <textarea value={kronologi} onChange={(e) => setKronologi(e.target.value)} rows={5} className={inputClass + " h-auto py-3"} placeholder="Ceritakan kejadiannya" />
        </Field>
        <span className="text-sm font-semibold text-slate-700">Foto</span>
        <div className="grid gap-4 sm:grid-cols-2">
          {foto.map((f, i) => (
            <div key={i} className="glass p-3">
              <FotoInput label={`Foto ${i + 1}`} file={f} onChange={(v) => setFoto(foto.map((x, j) => (j === i ? v : x)))} />
              {foto.length > 1 ? <button type="button" onClick={() => setFoto(foto.filter((_, j) => j !== i))} className="mt-2 text-xs font-semibold text-destructive">Hapus slot</button> : null}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setFoto([...foto, null])} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary"><Plus className="size-5" /> Tambah Foto</button>
        <SubmitButton disabled={!valid} loading={loading}>Simpan & Buat PDF</SubmitButton>
        {hasil ? <TombolPdf path={hasil.path} nama={hasil.nama} lihat="Lihat Report Nearmiss Accident" /> : null}
      </form>
      <RiwayatLaporan table="nearmiss" judul="Riwayat Nearmiss Accident" />
      {scan ? <Scanner onClose={() => setScan(false)} onResult={(v) => { setScan(false); setBarcode(v); lookup(v); }} /> : null}
    </FormPage>
  );
}
