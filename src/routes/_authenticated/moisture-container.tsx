import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, FormPage, ShiftSelect, SubmitButton, inputClass, toNum, usePicShift } from "@/components/form-kit";
import { FotoInput, uploadFoto } from "@/components/foto-input";

export const Route = createFileRoute("/_authenticated/moisture-container")({
  head: () => ({
    meta: [
      { title: "Moisture Container — LOGISTIK KCC" },
      { name: "description", content: "Catat pengukuran kelembapan kontainer." },
      { property: "og:title", content: "Moisture Container — LOGISTIK KCC" },
      { property: "og:description", content: "Catat pengukuran kelembapan kontainer." },
    ],
  }),
  component: Page,
});

const TITIK = [
  { key: "belakang_a", label: "Belakang A" },
  { key: "belakang_b", label: "Belakang B" },
  { key: "tengah_c", label: "Tengah C" },
  { key: "depan_d", label: "Depan D" },
  { key: "depan_e", label: "Depan E" },
] as const;
type Key = (typeof TITIK)[number]["key"];

const kosongNilai = () => Object.fromEntries(TITIK.map((t) => [t.key, ""])) as Record<Key, string>;
const kosongFoto = () => Object.fromEntries(TITIK.map((t) => [t.key, null])) as Record<Key, File | null>;

function Page() {
  const qc = useQueryClient();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [kontainer, setKontainer] = useState("");
  const [nilai, setNilai] = useState(kosongNilai);
  const [foto, setFoto] = useState(kosongFoto);
  const [fotoForm, setFotoForm] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const angka = TITIK.map((t) => toNum(nilai[t.key])).filter((n): n is number => n != null);
  const rata = angka.length ? Math.round((angka.reduce((a, b) => a + b, 0) / angka.length) * 100) / 100 : null;
  const valid = kontainer.trim() !== "" && angka.length === 5 && angka.every((n) => n >= 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const paths: Record<string, string | null> = {};
      for (const t of TITIK) paths[`foto_${t.key}`] = await uploadFoto(foto[t.key], "moisture");
      const row = {
        no_kontainer: kontainer.trim(),
        ...Object.fromEntries(TITIK.map((t) => [t.key, toNum(nilai[t.key])])),
        ...paths,
        foto_form: await uploadFoto(fotoForm, "moisture"),
        rata_rata: rata,
        pic: pic.trim() || null,
        shift,
      };
      const { error } = await supabase.from("moisture_container").insert(row);
      if (error) throw error;
      toast.success("Data moisture tersimpan.");
      setKontainer(""); setNilai(kosongNilai()); setFoto(kosongFoto()); setFotoForm(null);
      qc.invalidateQueries({ queryKey: ["riwayat-moisture"] });
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormPage title="Moisture Container">
      <form onSubmit={submit} className="glass flex flex-col gap-4 p-4 sm:p-5">
        <Field label="No Kontainer">
          <input value={kontainer} onChange={(e) => setKontainer(e.target.value)} className={inputClass} placeholder="Nomor kontainer" />
        </Field>
        {TITIK.map((t) => (
          <div key={t.key} className="glass flex flex-col gap-3 p-3">
            <Field label={`${t.label} (%)`}>
              <input type="number" inputMode="decimal" min="0" step="any" value={nilai[t.key]} onChange={(e) => setNilai((v) => ({ ...v, [t.key]: e.target.value }))} className={inputClass} placeholder="Nilai" />
            </Field>
            <FotoInput label={`Foto ${t.label}`} file={foto[t.key]} onChange={(f) => setFoto((v) => ({ ...v, [t.key]: f }))} />
          </div>
        ))}
        <FotoInput label="Upload Form" file={fotoForm} onChange={setFotoForm} />
        <Field label="Rata-rata (otomatis)">
          <input readOnly value={rata ?? ""} placeholder="-" className={inputClass + " bg-white/40 font-bold"} />
        </Field>
        <Field label="PIC"><input value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>
        {!valid ? <p className="text-sm text-muted-foreground">Isi No Kontainer dan kelima nilai titik ukur.</p> : null}
        <SubmitButton disabled={!valid} loading={loading} />
      </form>
    </FormPage>
  );
}
