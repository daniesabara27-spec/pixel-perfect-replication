import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeList, Field, FormPage, Riwayat, SelectInput, ShiftSelect, SubmitButton, barisBaru, barisTerisi, barisValid, inputClass, toNum, usePicShift } from "@/components/form-kit";

export const Route = createFileRoute("/_authenticated/outbound")({
  head: () => ({
    meta: [
      { title: "Input Outbound — LOGISTIK KCC" },
      { name: "description", content: "Catat pengiriman barang keluar per kontainer atau truk." },
      { property: "og:title", content: "Input Outbound — LOGISTIK KCC" },
      { property: "og:description", content: "Catat pengiriman barang keluar per kontainer atau truk." },
    ],
  }),
  component: Page,
});

const TUJUAN = ["SHIPMENT 3RD", "SHIPMENT KOREA", "SHIPMENT DOMESTIK"] as const;

function Page() {
  const qc = useQueryClient();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [kontainer, setKontainer] = useState("");
  const [tujuan, setTujuan] = useState<string>(TUJUAN[0]);
  const [sj, setSj] = useState("");
  const [team, setTeam] = useState("");
  const [rows, setRows] = useState([barisBaru()]);
  const [loading, setLoading] = useState(false);
  const isi = barisTerisi(rows);
  const sjKosong = !sj.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sjKosong || !barisValid(rows)) { if (!sjKosong) toast.error("Isi wajib berupa angka nol atau lebih."); return; }
    setLoading(true);
    const { error } = await supabase.from("outbound").insert(
      isi.map((r) => ({ jenis: "SHIPMENT", kontainer: kontainer.trim(), tujuan, no_surat_jalan: sj.trim(), pic: pic.trim(), shift, team: team.trim(), barcode: r.barcode.trim(), description: r.description, thickness: r.thickness, isi: toNum(r.isi) })),
    );
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${isi.length} barcode tersimpan`);
    setKontainer(""); setSj(""); setRows([barisBaru()]);
    qc.invalidateQueries({ queryKey: ["riwayat", "outbound"] });
  }

  return (
    <FormPage title="Input Outbound">
      <form onSubmit={submit} className="glass-strong flex flex-col gap-4 p-4 sm:p-6">
        <Field label="Nomor Kontainer / Truck"><input required value={kontainer} onChange={(e) => setKontainer(e.target.value)} className={inputClass} /></Field>
        <Field label="Tujuan"><SelectInput value={tujuan} onChange={setTujuan} options={TUJUAN} /></Field>
        <Field label="No Surat Jalan" error={sjKosong ? "⚠ No Surat Jalan wajib diisi" : null}>
          <input value={sj} onChange={(e) => setSj(e.target.value)} className={inputClass} />
        </Field>
        <Field label="PIC"><input required value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>
        <Field label="Team"><input value={team} onChange={(e) => setTeam(e.target.value)} className={inputClass} /></Field>
        <BarcodeList rows={rows} setRows={setRows} />
        <SubmitButton loading={loading} disabled={sjKosong || !barisValid(rows)} />
      </form>
      <Riwayat table="outbound" cols={[{ key: "kontainer", label: "Kontainer" }, { key: "tujuan", label: "Tujuan" }, { key: "no_surat_jalan", label: "Surat Jalan" }, { key: "barcode", label: "Barcode" }, { key: "isi", label: "Isi" }, { key: "pic", label: "PIC" }]} />
    </FormPage>
  );
}
