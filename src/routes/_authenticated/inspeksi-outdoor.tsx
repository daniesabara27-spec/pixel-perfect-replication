import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, FormPage, ShiftSelect, SubmitButton, inputClass, usePicShift } from "@/components/form-kit";
import { FotoInput, uploadFoto } from "@/components/foto-input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inspeksi-outdoor")({
  head: () => ({
    meta: [
      { title: "Inspeksi Penyimpanan Outdoor — LOGISTIK KCC" },
      { name: "description", content: "Checklist kondisi penyimpanan barang di area luar." },
      { property: "og:title", content: "Inspeksi Penyimpanan Outdoor — LOGISTIK KCC" },
      { property: "og:description", content: "Checklist kondisi penyimpanan barang di area luar." },
    ],
  }),
  component: Page,
});

const KATEGORI = [
  { nama: "Alas & Dasar", items: ["Kondisi Palet", "Proteksi Bawah"] },
  { nama: "Kondisi Terpal", items: ["Fisik Terpal", "Ukuran", "Proteksi Ganda"] },
  { nama: "Pemasangan", items: ["Ketegangan Terpal", "Pencegahan Genangan", "Tumpang Tindih (Overlap)"] },
  { nama: "Tali & Ikatan", items: ["Kondisi Tali", "Kekencangan Ikatan", "Distribusi Ikatan"] },
  { nama: "Lingkungan", items: ["Drainase Area"] },
];
const STATUS = ["OK", "TIDAK OK", "N/A"] as const;
const FOTO = [
  { key: "foto_depan", label: "Depan" },
  { key: "foto_samping_kiri", label: "Samping Kiri" },
  { key: "foto_samping_kanan", label: "Samping Kanan" },
  { key: "foto_atas", label: "Atas" },
  { key: "foto_belakang", label: "Belakang" },
] as const;
type FotoKey = (typeof FOTO)[number]["key"];
type Isi = { status: string; keterangan: string };

const kosongCek = () => Object.fromEntries(KATEGORI.flatMap((k) => k.items).map((i) => [i, { status: "", keterangan: "" }])) as Record<string, Isi>;
const kosongFoto = () => Object.fromEntries(FOTO.map((f) => [f.key, null])) as Record<FotoKey, File | null>;

function Page() {
  const { pic, setPic, shift, setShift } = usePicShift();
  const [lokasi, setLokasi] = useState("");
  const [cek, setCek] = useState(kosongCek);
  const [foto, setFoto] = useState(kosongFoto);
  const [loading, setLoading] = useState(false);

  const belum = Object.values(cek).filter((c) => !c.status).length;
  const valid = lokasi.trim() !== "" && belum === 0 && !!shift;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const paths: Record<string, string | null> = {};
      for (const f of FOTO) paths[f.key] = await uploadFoto(foto[f.key], "inspeksi-outdoor");
      const items = KATEGORI.flatMap((k) => k.items.map((i) => ({ kategori: k.nama, item: i, status: cek[i]!.status, keterangan: cek[i]!.keterangan.trim() || null })));
      const { error } = await supabase.from("inspeksi_outdoor").insert({ lokasi: lokasi.trim(), items, ...paths, pic: pic.trim() || null, shift });
      if (error) throw error;
      toast.success("Inspeksi outdoor tersimpan.");
      setLokasi(""); setCek(kosongCek()); setFoto(kosongFoto());
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormPage title="Inspeksi Penyimpanan Outdoor">
      <form onSubmit={submit} className="glass flex flex-col gap-4 p-4 sm:p-5">
        <Field label="Lokasi / Area">
          <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} className={inputClass} placeholder="Contoh: Area Outdoor Timur" />
        </Field>
        {KATEGORI.map((k) => (
          <section key={k.nama} className="flex flex-col gap-2">
            <h2 className="text-base font-bold text-primary">{k.nama}</h2>
            {k.items.map((i) => (
              <div key={i} className="glass flex flex-col gap-2 p-3">
                <span className="text-sm font-semibold">{i}</span>
                <div className="grid grid-cols-3 gap-1 rounded-full bg-white/50 p-1">
                  {STATUS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCek((c) => ({ ...c, [i]: { ...c[i]!, status: s } }))}
                      className={cn(
                        "min-h-10 rounded-full text-xs font-bold transition sm:text-sm",
                        cek[i]!.status === s
                          ? s === "OK" ? "bg-success text-success-foreground" : s === "TIDAK OK" ? "bg-destructive text-destructive-foreground" : "bg-slate-500 text-white"
                          : "text-slate-600",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <input value={cek[i]!.keterangan} onChange={(e) => setCek((c) => ({ ...c, [i]: { ...c[i]!, keterangan: e.target.value } }))} placeholder="Keterangan (opsional)" className={inputClass} />
              </div>
            ))}
          </section>
        ))}
        <h2 className="text-base font-bold text-primary">Foto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FOTO.map((f) => (
            <FotoInput key={f.key} label={f.label} file={foto[f.key]} onChange={(v) => setFoto((x) => ({ ...x, [f.key]: v }))} />
          ))}
        </div>
        <Field label="PIC"><input value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        <Field label="Shift (wajib)"><ShiftSelect value={shift} onChange={setShift} /></Field>
        {belum > 0 ? <p className="text-sm font-semibold text-destructive">Masih ada {belum} item checklist yang belum dipilih statusnya.</p> : null}
        <SubmitButton disabled={!valid} loading={loading} />
      </form>
    </FormPage>
  );
}
