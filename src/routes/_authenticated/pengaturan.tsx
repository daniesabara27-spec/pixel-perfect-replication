import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { GUDANG } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — LOGISTIK KCC" },
      { name: "description", content: "Kelola pengguna dan impor Master Data." },
      { property: "og:title", content: "Pengaturan — LOGISTIK KCC" },
      { property: "og:description", content: "Kelola pengguna dan impor Master Data." },
    ],
  }),
  component: Page,
});

type Row = Record<string, unknown>;
const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

async function bacaFile(file: File): Promise<Row[]> {
  const wb = XLSX.read(await file.arrayBuffer());
  const raw = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]!]!, { defval: null });
  return raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [norm(k), v])));
}
const teks = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const angka = (v: unknown) => (v == null || String(v).trim() === "" ? null : Number(v));

async function kirim<T>(rows: T[], fn: (chunk: T[]) => PromiseLike<{ error: { message: string } | null }>) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await fn(rows.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
}

function Page() {
  const profil = useProfile();
  const qc = useQueryClient();
  const [gudang, setGudang] = useState<string>("KCC");
  const [busy, setBusy] = useState<string | null>(null);

  if (profil.isLoading) return <div className="p-6 text-sm text-muted-foreground">Memuat…</div>;
  if (profil.data?.role !== "admin")
    return <div className="mx-auto max-w-5xl p-6"><div className="glass p-6 text-sm text-muted-foreground">Halaman ini hanya untuk admin.</div></div>;

  async function imporMaster(file: File) {
    setBusy("master");
    try {
      const rows = (await bacaFile(file))
        .map((r) => ({
          barcode: teks(r.barcode),
          product_code: teks(r.productcode),
          product_name: teks(r.productname),
          thickness: teks(r.thickness),
          stock: angka(r.stock),
          keeping_no: teks(r.keepingno),
        }))
        .filter((r): r is typeof r & { barcode: string } => !!r.barcode);
      if (!rows.length) throw new Error("Kolom 'barcode' tidak ditemukan atau file kosong.");
      await kirim(rows, (c) => supabase.from("master_data").upsert(c, { onConflict: "barcode" }));
      toast.success(`${rows.length} baris master data diimpor`);
      qc.invalidateQueries();
    } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
  }

  async function imporRak(file: File) {
    setBusy("rak");
    try {
      const nos = [...new Set((await bacaFile(file)).map((r) => teks(r.norak ?? r.rak ?? r.keepingno)).filter(Boolean) as string[])];
      if (!nos.length) throw new Error("Kolom 'no_rak' tidak ditemukan atau file kosong.");
      await kirim(nos.map((no_rak) => ({ warehouse: gudang, no_rak })), (c) =>
        supabase.from("rak_audit").upsert(c, { onConflict: "warehouse,no_rak", ignoreDuplicates: true }));
      toast.success(`${nos.length} rak diimpor ke ${gudang}`);
      qc.invalidateQueries({ queryKey: ["rak", gudang] });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Pengaturan</h1>
      <div className="grid gap-4">
        <section className="glass p-5">
          <h2 className="font-bold">Impor Master Data</h2>
          <p className="mt-1 text-sm text-muted-foreground">File Excel/CSV dengan kolom: barcode, product_code, product_name, thickness, stock, keeping_no. Barcode yang sudah ada akan diperbarui.</p>
          <FilePick id="master" busy={busy === "master"} onFile={imporMaster} />
        </section>
        <section className="glass p-5">
          <h2 className="font-bold">Impor Daftar Rak</h2>
          <p className="mt-1 text-sm text-muted-foreground">File Excel/CSV dengan kolom no_rak. Rak yang sudah ada tidak diubah.</p>
          <select value={gudang} onChange={(e) => setGudang(e.target.value)} aria-label="Gudang" className="mt-3 min-h-11 rounded-xl border border-white/70 bg-white/70 px-3">
            {GUDANG.map((g) => <option key={g.gudang} value={g.gudang}>{g.label}</option>)}
          </select>
          <FilePick id="rak" busy={busy === "rak"} onFile={imporRak} />
        </section>
      </div>
    </div>
  );
}

function FilePick({ id, busy, onFile }: { id: string; busy: boolean; onFile: (f: File) => void }) {
  return (
    <label className="btn-gradient mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
      {busy ? "Mengimpor…" : "Pilih file"}
      <input id={`file-${id}`} type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
    </label>
  );
}
