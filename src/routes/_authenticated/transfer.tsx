import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeList, Field, FormPage, Riwayat, SelectInput, ShiftSelect, SubmitButton, barisBaru, barisTerisi, barisValid, inputClass, toNum, usePicShift } from "@/components/form-kit";
import { GUDANG } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/transfer")({
  head: () => ({
    meta: [
      { title: "Input Transfer — LOGISTIK KCC" },
      { name: "description", content: "Catat transfer barang antara KCC dan Wanxinda." },
      { property: "og:title", content: "Input Transfer — LOGISTIK KCC" },
      { property: "og:description", content: "Catat transfer barang antara KCC dan Wanxinda." },
    ],
  }),
  component: Page,
});

const JENIS = ["KCC → WANXINDA", "WANXINDA → KCC"] as const;
const WAREHOUSE = GUDANG.map((g) => g.label);

function Page() {
  const qc = useQueryClient();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [jenis, setJenis] = useState<string>(JENIS[0]);
  const [kontainer, setKontainer] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [warehouse, setWarehouse] = useState<string>(WAREHOUSE[0] ?? "KCC");
  const [sj, setSj] = useState("");
  const [rows, setRows] = useState([barisBaru()]);
  const [loading, setLoading] = useState(false);
  const isi = barisTerisi(rows);
  const sjKosong = !sj.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sjKosong || !barisValid(rows)) { if (!sjKosong) toast.error("Isi wajib berupa angka nol atau lebih."); return; }
    setLoading(true);
    const { error } = await supabase.from("transfer").insert(
      isi.map((r) => ({ jenis, kontainer: kontainer.trim(), tujuan: tujuan.trim(), warehouse, no_surat_jalan: sj.trim(), shift, pic: pic.trim(), barcode: r.barcode.trim(), description: r.description, thickness: r.thickness, isi: toNum(r.isi) })),
    );
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${isi.length} barcode tersimpan`);
    setKontainer(""); setTujuan(""); setSj(""); setRows([barisBaru()]);
    qc.invalidateQueries({ queryKey: ["riwayat", "transfer"] });
  }

  return (
    <FormPage title="Input Transfer">
      <form onSubmit={submit} className="glass-strong flex flex-col gap-4 p-4 sm:p-6">
        <Field label="Jenis"><SelectInput value={jenis} onChange={setJenis} options={JENIS} /></Field>
        <Field label="Nomor Kontainer / Truck"><input required value={kontainer} onChange={(e) => setKontainer(e.target.value)} className={inputClass} /></Field>
        <Field label="Tujuan"><input value={tujuan} onChange={(e) => setTujuan(e.target.value)} className={inputClass} /></Field>
        <Field label="Warehouse"><SelectInput value={warehouse} onChange={setWarehouse} options={WAREHOUSE} /></Field>
        <Field label="No Surat Jalan" error={sjKosong ? "⚠ No Surat Jalan wajib diisi" : null}>
          <input value={sj} onChange={(e) => setSj(e.target.value)} className={inputClass} />
        </Field>
        <Field label="PIC"><input required value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>
        <BarcodeList rows={rows} setRows={setRows} />
        <SubmitButton loading={loading} disabled={sjKosong || !barisValid(rows)} />
      </form>
      <Riwayat table="transfer" cols={[{ key: "jenis", label: "Jenis" }, { key: "kontainer", label: "Kontainer" }, { key: "warehouse", label: "Warehouse" }, { key: "no_surat_jalan", label: "Surat Jalan" }, { key: "barcode", label: "Barcode" }, { key: "isi", label: "Isi" }]} />
    </FormPage>
  );
}
