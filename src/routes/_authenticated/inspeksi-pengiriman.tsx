import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ScanLine, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, FormPage, Scanner, ShiftSelect, SubmitButton, inputClass, useMasterMap, usePicShift } from "@/components/form-kit";
import { FotoInput, uploadFoto } from "@/components/foto-input";

export const Route = createFileRoute("/_authenticated/inspeksi-pengiriman")({
  head: () => ({
    meta: [
      { title: "Inspeksi Pengiriman — LOGISTIK KCC" },
      { name: "description", content: "Checklist kelengkapan barang sebelum dikirim." },
      { property: "og:title", content: "Inspeksi Pengiriman — LOGISTIK KCC" },
      { property: "og:description", content: "Checklist kelengkapan barang sebelum dikirim." },
    ],
  }),
  component: Page,
});

const CEK = [
  { key: "packing", label: "Packing" },
  { key: "barcode_label", label: "Barcode & Label" },
  { key: "steelband", label: "Steelband" },
  { key: "vinyl", label: "Vinyl" },
  { key: "moisture", label: "Moisture" },
  { key: "silica", label: "Silica" },
  { key: "stopper_steelband", label: "Stopper & Steelband" },
] as const;
type CekKey = (typeof CEK)[number]["key"];
type Baris = { key: number; barcode: string; description: string; status?: "cari" | "tidak" | "ok" | undefined; cek: Record<CekKey, boolean> };

let seq = 1;
const baru = (): Baris => ({ key: seq++, barcode: "", description: "", cek: Object.fromEntries(CEK.map((c) => [c.key, false])) as Record<CekKey, boolean> });

function Page() {
  const master = useMasterMap();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [kontainer, setKontainer] = useState("");
  const [rows, setRows] = useState<Baris[]>([baru()]);
  const [foto, setFoto] = useState<File | null>(null);
  const [scanKey, setScanKey] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (k: number, p: Partial<Baris>) => setRows((r) => r.map((x) => (x.key === k ? { ...x, ...p } : x)));

  async function lookup(k: number, raw: string) {
    const code = raw.trim();
    if (!code) return update(k, { status: undefined });
    let m = master.data?.get(code.toLowerCase());
    if (!m) {
      update(k, { status: "cari" });
      const { data } = await supabase.from("master_data").select("barcode, product_name, thickness, stock").ilike("barcode", code).maybeSingle();
      m = data ?? undefined;
    }
    if (m) update(k, { barcode: m.barcode, description: m.product_name ?? "", status: "ok" });
    else update(k, { status: "tidak" });
  }

  const terisi = rows.filter((r) => r.barcode.trim());
  const valid = kontainer.trim() !== "" && terisi.length > 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const path = await uploadFoto(foto, "inspeksi-pengiriman");
      const payload = terisi.map((r) => ({
        no_kontainer: kontainer.trim(),
        no_barcode: r.barcode.trim(),
        description: r.description.trim() || null,
        ...r.cek,
        foto: path,
        pic: pic.trim() || null,
        shift,
      }));
      const { error } = await supabase.from("inspeksi_pengiriman").insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} baris inspeksi tersimpan.`);
      setKontainer(""); setRows([baru()]); setFoto(null);
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormPage title="Inspeksi Pengiriman">
      <form onSubmit={submit} className="glass flex flex-col gap-4 p-4 sm:p-5">
        <Field label="No Kontainer">
          <input value={kontainer} onChange={(e) => setKontainer(e.target.value)} className={inputClass} placeholder="Nomor kontainer" />
        </Field>
        <span className="text-sm font-semibold text-slate-700">Data Barang</span>
        {rows.map((r, i) => (
          <div key={r.key} className="glass flex flex-col gap-3 p-3">
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
              <input
                value={r.barcode}
                onChange={(e) => update(r.key, { barcode: e.target.value, status: undefined })}
                onBlur={(e) => lookup(r.key, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(r.key, r.barcode); } }}
                placeholder="No Barcode"
                className={inputClass}
              />
              <button type="button" onClick={() => setScanKey(r.key)} aria-label="Scan barcode" className="btn-gradient grid size-12 shrink-0 place-items-center rounded-full"><ScanLine className="size-5" /></button>
              {rows.length > 1 ? (
                <button type="button" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label="Hapus baris" className="grid size-12 shrink-0 place-items-center rounded-full text-destructive hover:bg-white/60"><Trash2 className="size-5" /></button>
              ) : null}
            </div>
            {r.status === "cari" ? <span className="flex items-center gap-1 pl-8 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Mencari…</span> : null}
            {r.status === "tidak" ? <span className="pl-8 text-xs font-semibold text-destructive">Barcode tidak ada di master data — isi manual.</span> : null}
            <input value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} placeholder="Description" className={inputClass + " ml-8 w-[calc(100%-2rem)]"} />
            <div className="grid grid-cols-2 gap-2 pl-8 sm:grid-cols-4">
              {CEK.map((c) => (
                <label key={c.key} className="flex min-h-11 items-center gap-2 rounded-2xl bg-white/50 px-3 text-sm font-medium">
                  <input type="checkbox" checked={r.cek[c.key]} onChange={(e) => update(r.key, { cek: { ...r.cek, [c.key]: e.target.checked } })} className="size-5 accent-[var(--color-primary)]" />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setRows((x) => [...x, baru()])} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary">
          <Plus className="size-5" /> Tambah Data
        </button>
        <FotoInput label="Foto" file={foto} onChange={setFoto} />
        <Field label="PIC"><input value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>
        <SubmitButton disabled={!valid} loading={loading} />
      </form>
      {scanKey != null ? (
        <Scanner onClose={() => setScanKey(null)} onResult={(v) => { const k = scanKey; setScanKey(null); update(k, { barcode: v }); lookup(k, v); }} />
      ) : null}
    </FormPage>
  );
}
