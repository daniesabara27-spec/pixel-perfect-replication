import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeList, Field, FormPage, Riwayat, SelectInput, ShiftSelect, SubmitButton, barisBaru, barisTerisi, inputClass, toNum, usePicShift } from "@/components/form-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inbound")({
  head: () => ({
    meta: [
      { title: "Input Inbound — LOGISTIK KCC" },
      { name: "description", content: "Catat penerimaan barang dari KCC atau Wanxinda." },
      { property: "og:title", content: "Input Inbound — LOGISTIK KCC" },
      { property: "og:description", content: "Catat penerimaan barang dari KCC atau Wanxinda." },
    ],
  }),
  component: Page,
});

const TAB = ["Dari KCC", "Dari Wanxinda"] as const;
const PENEMPATAN = ["KCC", "WANXINDA 1", "WANXINDA 2", "WANXINDA 3", "WANXINDA TEMP"] as const;

type ItemTransfer = { id: number; barcode: string | null; description: string | null; thickness: string | null; isi: number | null; sudah: boolean };

function Page() {
  const qc = useQueryClient();
  const { pic, setPic, shift, setShift } = usePicShift();
  const [tab, setTab] = useState<(typeof TAB)[number]>(TAB[0]);
  const [mode, setMode] = useState<"manual" | "transfer">("manual");
  const [noRak, setNoRak] = useState("");
  const [sj, setSj] = useState("");
  const [penempatan, setPenempatan] = useState<string>(PENEMPATAN[0]);
  const [rows, setRows] = useState([barisBaru()]);
  const [items, setItems] = useState<ItemTransfer[] | null>(null);
  const [pilih, setPilih] = useState<Set<number>>(new Set());
  const [cari, setCari] = useState(false);
  const [loading, setLoading] = useState(false);
  const sjKosong = !sj.trim();

  async function ambilTransfer() {
    if (sjKosong) return;
    setCari(true);
    setItems(null);
    setPilih(new Set());
    const no = sj.trim();
    const { data, error } = await supabase.from("transfer").select("id, barcode, description, thickness, isi").ilike("no_surat_jalan", no);
    if (error) { setCari(false); { toast.error(error.message); return; } }
    if (!data.length) { setCari(false); { toast.error("No Surat Jalan tidak ditemukan pada Data Transfer"); return; } }
    const { data: masuk } = await supabase.from("inbound").select("barcode").ilike("no_surat_jalan", no);
    const sudah = new Set((masuk ?? []).map((m) => (m.barcode ?? "").toLowerCase()));
    const list = data.map((d) => ({ ...d, sudah: sudah.has((d.barcode ?? "").toLowerCase()) }));
    setItems(list);
    setPilih(new Set(list.filter((x) => !x.sudah).map((x) => x.id)));
    setCari(false);
  }

  const payload =
    mode === "manual"
      ? barisTerisi(rows).map((r) => ({ barcode: r.barcode.trim(), description: r.description, thickness: r.thickness, isi: toNum(r.isi) }))
      : (items ?? []).filter((i) => pilih.has(i.id)).map((i) => ({ barcode: i.barcode, description: i.description, thickness: i.thickness, isi: i.isi }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sjKosong || !payload.length) return;
    setLoading(true);
    const { error } = await supabase.from("inbound").insert(
      payload.map((p) => ({ ...p, jenis_penerimaan: tab === "Dari KCC" ? "KCC" : "WANXINDA", no_rak: noRak.trim(), no_surat_jalan: sj.trim(), penempatan_gudang: penempatan, pic: pic.trim(), shift })),
    );
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${payload.length} barcode tersimpan`);
    setNoRak(""); setSj(""); setRows([barisBaru()]); setItems(null); setPilih(new Set());
    qc.invalidateQueries({ queryKey: ["riwayat", "inbound"] });
  }

  const tabBtn = (aktif: boolean) => cn("min-h-11 rounded-2xl text-sm font-semibold transition", aktif ? "btn-gradient" : "text-slate-600 hover:bg-white/60");

  return (
    <FormPage title="Input Inbound">
      <div className="glass mb-4 grid grid-cols-2 gap-1 p-1">
        {TAB.map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={tabBtn(tab === t)}>{t}</button>)}
      </div>
      <form onSubmit={submit} className="glass-strong flex flex-col gap-4 p-4 sm:p-6">
        <Field label="No Rak"><input value={noRak} onChange={(e) => setNoRak(e.target.value)} className={inputClass} /></Field>
        <Field label="No Surat Jalan" error={sjKosong ? "⚠ No Surat Jalan wajib diisi" : null}>
          <input value={sj} onChange={(e) => { setSj(e.target.value); setItems(null); }} className={inputClass} />
        </Field>
        <Field label="Penempatan Gudang"><SelectInput value={penempatan} onChange={setPenempatan} options={PENEMPATAN} /></Field>
        <Field label="PIC"><input required value={pic} onChange={(e) => setPic(e.target.value)} className={inputClass} /></Field>
        <Field label="Shift"><ShiftSelect value={shift} onChange={setShift} /></Field>

        <div className="glass grid grid-cols-2 gap-1 p-1">
          <button type="button" onClick={() => setMode("manual")} className={tabBtn(mode === "manual")}>Input Barcode</button>
          <button type="button" onClick={() => setMode("transfer")} className={tabBtn(mode === "transfer")}>Ambil dari Transfer</button>
        </div>

        {mode === "manual" ? (
          <BarcodeList rows={rows} setRows={setRows} />
        ) : (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={ambilTransfer} disabled={sjKosong || cari} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary disabled:opacity-50">
              {cari ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />} Cari item dari Surat Jalan
            </button>
            {items?.map((i) => (
              <label key={i.id} className={cn("glass flex items-center gap-3 p-3", i.sudah && "opacity-60")}>
                <input
                  type="checkbox"
                  disabled={i.sudah}
                  checked={pilih.has(i.id)}
                  onChange={(e) => setPilih((s) => { const n = new Set(s); e.target.checked ? n.add(i.id) : n.delete(i.id); return n; })}
                  className="size-5 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{i.barcode}</div>
                  <div className="truncate text-sm text-muted-foreground">{i.description ?? "-"} · Isi {i.isi ?? "-"}</div>
                </div>
                {i.sudah ? <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">sudah masuk</span> : null}
              </label>
            ))}
            {items ? <p className="text-sm text-muted-foreground">{pilih.size} item dipilih</p> : null}
          </div>
        )}

        <SubmitButton loading={loading} disabled={sjKosong || !payload.length} />
      </form>
      <Riwayat table="inbound" cols={[{ key: "jenis_penerimaan", label: "Dari" }, { key: "no_rak", label: "No Rak" }, { key: "no_surat_jalan", label: "Surat Jalan" }, { key: "penempatan_gudang", label: "Gudang" }, { key: "barcode", label: "Barcode" }, { key: "isi", label: "Isi" }]} />
    </FormPage>
  );
}
