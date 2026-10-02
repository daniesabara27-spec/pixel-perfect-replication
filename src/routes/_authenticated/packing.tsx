import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeList, Field, FormPage, Riwayat, ShiftSelect, SubmitButton, barisBaru, barisTerisi, inputClass, toNum, usePicShift } from "@/components/form-kit";

export const Route = createFileRoute("/_authenticated/packing")({
  head: () => ({
    meta: [
      { title: "Input Packing — LOGISTIK KCC" },
      { name: "description", content: "Catat hasil packing per rak dan barcode." },
      { property: "og:title", content: "Input Packing — LOGISTIK KCC" },
      { property: "og:description", content: "Catat hasil packing per rak dan barcode." },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [noRak, setNoRak] = useState("");
  const [rows, setRows] = useState([barisBaru()]);
  const [loading, setLoading] = useState(false);
  const isi = barisTerisi(rows);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("packing").insert(
      isi.map((r) => ({ no_rak: noRak.trim(), pic: pic.trim(), shift, barcode: r.barcode.trim(), description: r.description, thickness: r.thickness, isi: toNum(r.isi) })),
    );
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${isi.length} barcode tersimpan`);
    setNoRak("");
    setRows([barisBaru()]);
    qc.invalidateQueries({ queryKey: ["riwayat", "packing"] });
  }

  return (
    <FormPage title="Input Packing">
      <form onSubmit={submit} className="glass-strong flex flex-col gap-4 p-4 sm:p-6">
        <Field label="No Rak"><input required value={noRak} onChange={(e) => setNoRak(e.target.value)} className={inputClass} placeholder="mis. A12" /></Field>
        <Field label="PIC"><input required value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>
        <BarcodeList rows={rows} setRows={setRows} />
        <SubmitButton loading={loading} disabled={!isi.length} />
      </form>
      <Riwayat table="packing" cols={[{ key: "no_rak", label: "No Rak" }, { key: "barcode", label: "Barcode" }, { key: "description", label: "Description" }, { key: "isi", label: "Isi" }, { key: "pic", label: "PIC" }, { key: "shift", label: "Shift" }]} />
    </FormPage>
  );
}
