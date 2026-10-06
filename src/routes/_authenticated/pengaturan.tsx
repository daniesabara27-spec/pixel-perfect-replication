import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Loader2, Plus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { usePilihanRows, type JenisPilihan } from "@/hooks/use-pilihan";
import { GUDANG } from "@/lib/nav";
import { inputClass } from "@/components/form-kit";
import { daftarUser, tambahUser, resetPassword } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — LOGISTIK KCC" },
      { name: "description", content: "Kelola pengguna, daftar pilihan, dan impor data." },
      { property: "og:title", content: "Pengaturan — LOGISTIK KCC" },
      { property: "og:description", content: "Kelola pengguna, daftar pilihan, dan impor data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Row = Record<string, unknown>;
const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

async function bacaMentah(file: File): Promise<Row[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]!]!, { defval: null });
}
async function bacaFile(file: File): Promise<Row[]> {
  return (await bacaMentah(file)).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [norm(k), v])));
}
const teks = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const angka = (v: unknown) => {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

export function ekstrakThickness(nama: string | null): string | null {
  if (!nama) return null;
  const mm = nama.match(/(\d+(?:[.,]\d+)?)\s*MM/i);
  if (mm) return mm[1]!.replace(",", ".");
  const x = nama.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*[xX×*]\s*\d/);
  return x ? x[1]! : null;
}

function tanggal(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(+v) ? null : v.toISOString();
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const d = new Date(`${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}T${(m[4] ?? "0").padStart(2, "0")}:${m[5] ?? "00"}:${m[6] ?? "00"}+07:00`);
    return isNaN(+d) ? null : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(+d) ? null : d.toISOString();
}

async function kirim<T>(rows: T[], fn: (chunk: T[]) => PromiseLike<{ error: { message: string } | null }>, progres?: (n: number) => void) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await fn(rows.slice(i, i + 500));
    if (error) throw new Error(`Baris ${i + 1}–${i + 500}: ${error.message}`);
    progres?.(Math.min(i + 500, rows.length));
  }
}

function Page() {
  const profil = useProfile();
  if (profil.isLoading) return <div className="p-6 text-sm text-muted-foreground">Memuat…</div>;
  if (profil.data?.role !== "admin")
    return <div className="mx-auto max-w-5xl p-6"><div className="glass p-6 text-sm text-muted-foreground">Halaman ini hanya untuk admin.</div></div>;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Pengaturan</h1>
      <div className="grid gap-4">
        <KelolaUser />
        <ImporMaster />
        <ImporRak />
        <ImporHistoris />
        <DaftarPilihan />
      </div>
    </div>
  );
}

function Progres({ n, total }: { n: number; total: number }) {
  if (!total) return null;
  return (
    <div className="mt-3">
      <div className="h-2 overflow-hidden rounded-full bg-white/60"><div className="h-full bg-primary transition-all" style={{ width: `${(100 * n) / total}%` }} /></div>
      <p className="mt-1 text-xs text-muted-foreground">{n.toLocaleString("id-ID")} / {total.toLocaleString("id-ID")} baris</p>
    </div>
  );
}

/* ---------- Kelola User ---------- */
type Role = "admin" | "supervisor" | "operator";
function KelolaUser() {
  const list = useServerFn(daftarUser);
  const tambah = useServerFn(tambahUser);
  const reset = useServerFn(resetPassword);
  const q = useQuery({ queryKey: ["users"], queryFn: () => list() });
  const [f, setF] = useState({ email: "", password: "", nama: "", role: "operator" as Role });
  const [busy, setBusy] = useState(false);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await tambah({ data: f }); toast.success("User ditambahkan"); setF({ email: "", password: "", nama: "", role: "operator" }); q.refetch(); }
    catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  }
  async function ubahRole(id: string, role: Role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Role diubah"); q.refetch(); }
  }
  async function resetPw(id: string, email: string) {
    const pw = window.prompt(`Password baru untuk ${email} (min. 6 karakter):`);
    if (!pw) return;
    if (pw.length < 6) return toast.error("Password minimal 6 karakter");
    try { await reset({ data: { id, password: pw } }); toast.success("Password direset"); }
    catch (err) { toast.error((err as Error).message); }
  }

  return (
    <section className="glass p-5">
      <h2 className="font-bold">Kelola User</h2>
      <form onSubmit={simpan} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_140px_auto]">
        <input required value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} placeholder="Nama" className={inputClass} />
        <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email" className={inputClass} />
        <input required minLength={6} type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="Password" className={inputClass} />
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} className={inputClass}>
          <option value="operator">Operator</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option>
        </select>
        <button disabled={busy} className="btn-gradient flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Tambah
        </button>
      </form>
      <div className="mt-4">
        {q.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p> : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : (
          <ul className="flex flex-col gap-2">
            {q.data?.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/50 p-3 text-sm">
                <div className="min-w-0 flex-1"><div className="font-semibold">{u.nama || "-"}</div><div className="truncate text-xs text-muted-foreground">{u.email}</div></div>
                <select value={u.role} onChange={(e) => ubahRole(u.id, e.target.value as Role)} aria-label="Role" className="min-h-11 rounded-xl border border-white/70 bg-white/70 px-3">
                  <option value="operator">Operator</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option>
                </select>
                <button type="button" onClick={() => resetPw(u.id, u.email)} className="glass flex min-h-11 items-center gap-1 rounded-full px-4 font-semibold text-primary"><KeyRound className="size-4" /> Reset Password</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ---------- Master Data ---------- */
type MasterRow = { barcode: string; product_code: string | null; product_name: string | null; thickness: string | null; stock: number | null; keeping_no: string | null };
function ImporMaster() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);

  async function baca(file: File) {
    try {
      const r = (await bacaFile(file)).map((r) => {
        const product_name = teks(r["productname"]);
        return {
          barcode: teks(r["barcode"]) ?? "",
          product_code: teks(r["productcode"]),
          product_name,
          thickness: teks(r["thickness"]) ?? ekstrakThickness(product_name),
          stock: angka(r["stock"]),
          keeping_no: teks(r["keepingno"]),
        };
      }).filter((r) => r.barcode);
      if (!r.length) throw new Error("Kolom 'Barcode' tidak ditemukan atau file kosong.");
      setRows(r); setN(0);
    } catch (e) { toast.error((e as Error).message); }
  }
  async function impor() {
    setBusy(true);
    try {
      const uniq = [...new Map(rows.map((r) => [r.barcode, r])).values()];
      await kirim(uniq, (c) => supabase.from("master_data").upsert(c, { onConflict: "barcode" }), setN);
      toast.success(`${uniq.length.toLocaleString("id-ID")} baris master data diimpor`);
      qc.invalidateQueries(); setRows([]);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }
  const upd = (i: number, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, thickness: v || null } : r)));

  return (
    <section className="glass p-5">
      <h2 className="font-bold">Impor Master Data</h2>
      <p className="mt-1 text-sm text-muted-foreground">Excel/CSV dengan kolom: Barcode, Product Code, Product Name, Stock, Keeping No. Thickness diambil otomatis dari Product Name dan bisa diubah sebelum impor.</p>
      <FilePick id="master" label={rows.length ? "Ganti file" : "Pilih file"} onFile={baca} />
      {rows.length > 0 && (
        <>
          <p className="mt-3 text-sm font-semibold">{rows.length.toLocaleString("id-ID")} baris siap · {rows.filter((r) => !r.thickness).length} tanpa thickness</p>
          <div className="mt-2 max-h-80 overflow-auto rounded-2xl bg-white/50">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="sticky top-0 bg-white/90 text-xs uppercase text-muted-foreground"><tr><th className="p-2">Barcode</th><th className="p-2">Product Name</th><th className="p-2">Thickness</th><th className="p-2">Stock</th><th className="p-2">Rak</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-t border-white/60">
                    <td className="p-2">{r.barcode}</td><td className="p-2">{r.product_name}</td>
                    <td className="p-2"><input value={r.thickness ?? ""} onChange={(e) => upd(i, e.target.value)} className="h-9 w-20 rounded-lg border border-white/70 bg-white/70 px-2" /></td>
                    <td className="p-2">{r.stock ?? "-"}</td><td className="p-2">{r.keeping_no ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && <p className="mt-1 text-xs text-muted-foreground">Menampilkan 200 baris pertama untuk diedit.</p>}
          <button type="button" disabled={busy} onClick={impor} className="btn-gradient mt-3 flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-50">
            {busy && <Loader2 className="size-4 animate-spin" />} Impor {rows.length.toLocaleString("id-ID")} baris
          </button>
          <Progres n={n} total={busy || n ? rows.length : 0} />
        </>
      )}
    </section>
  );
}

/* ---------- Rak ---------- */
function ImporRak() {
  const qc = useQueryClient();
  const [gudang, setGudang] = useState<string>("KCC");
  const [busy, setBusy] = useState(false);
  async function imporRak(file: File) {
    setBusy(true);
    try {
      const nos = [...new Set((await bacaFile(file)).map((r) => teks(r["norak"] ?? r["rak"] ?? r["keepingno"])).filter(Boolean) as string[])];
      if (!nos.length) throw new Error("Kolom 'no_rak' tidak ditemukan atau file kosong.");
      await kirim(nos.map((no_rak) => ({ warehouse: gudang, no_rak })), (c) =>
        supabase.from("rak_audit").upsert(c, { onConflict: "warehouse,no_rak", ignoreDuplicates: true }));
      toast.success(`${nos.length} rak diimpor ke ${gudang}`);
      qc.invalidateQueries({ queryKey: ["rak", gudang] });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }
  return (
    <section className="glass p-5">
      <h2 className="font-bold">Impor Daftar Rak</h2>
      <p className="mt-1 text-sm text-muted-foreground">File Excel/CSV dengan kolom no_rak. Rak yang sudah ada tidak diubah.</p>
      <select value={gudang} onChange={(e) => setGudang(e.target.value)} aria-label="Gudang" className="mt-3 min-h-11 rounded-xl border border-white/70 bg-white/70 px-3">
        {GUDANG.map((g) => <option key={g.gudang} value={g.gudang}>{g.label}</option>)}
      </select>
      <FilePick id="rak" busy={busy} onFile={imporRak} />
    </section>
  );
}

/* ---------- Historis ---------- */
type Tabel = "packing" | "inbound" | "outbound" | "transfer";
const KOLOM: Record<Tabel, string[]> = {
  packing: ["created_at", "no_rak", "barcode", "description", "thickness", "isi", "pic", "shift"],
  inbound: ["created_at", "jenis_penerimaan", "no_rak", "barcode", "description", "thickness", "isi", "no_surat_jalan", "penempatan_gudang", "pic", "shift"],
  outbound: ["created_at", "jenis", "kontainer", "tujuan", "barcode", "description", "thickness", "isi", "no_surat_jalan", "pic", "shift", "team"],
  transfer: ["created_at", "jenis", "kontainer", "tujuan", "barcode", "description", "thickness", "isi", "warehouse", "no_surat_jalan", "pic", "shift"],
};
const ALIAS: Record<string, string[]> = {
  created_at: ["createdat", "timestamp", "tanggal", "date", "waktu", "tgl", "tanggalinput"],
  no_rak: ["norak", "rak", "nomorrak", "keepingno"],
  barcode: ["barcode", "nobarcode", "kodebarcode"],
  description: ["description", "desc", "deskripsi", "productname", "namaproduk"],
  thickness: ["thickness", "tebal", "ketebalan"],
  isi: ["isi", "qty", "jumlah", "quantity", "total", "pcs"],
  pic: ["pic", "nama", "operator"],
  shift: ["shift"],
  jenis_penerimaan: ["jenispenerimaan", "asal", "dari", "asalpenerimaan"],
  no_surat_jalan: ["nosuratjalan", "suratjalan", "sj", "nosj", "nomorsuratjalan"],
  penempatan_gudang: ["penempatangudang", "penempatan", "gudang"],
  jenis: ["jenis", "arah", "jenistransfer", "type"],
  kontainer: ["kontainer", "nokontainer", "nomorkontainer", "nomorkontainertruck", "kontainertruck", "truck", "container"],
  tujuan: ["tujuan", "destination", "tujuanshipment"],
  team: ["team", "tim"],
  warehouse: ["warehouse", "gudang"],
};
const NUM = new Set(["isi"]);

function ImporHistoris() {
  const qc = useQueryClient();
  const [tabel, setTabel] = useState<Tabel>("packing");
  const [data, setData] = useState<Row[]>([]);
  const [header, setHeader] = useState<string[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);

  function autoMap(h: string[], t: Tabel) {
    const m: Record<string, string> = {};
    for (const k of KOLOM[t]) {
      const found = h.find((x) => (ALIAS[k] ?? [k]).includes(norm(x)));
      if (found) m[k] = found;
    }
    setMap(m);
  }
  async function baca(file: File) {
    try {
      const r = await bacaMentah(file);
      if (!r.length) throw new Error("File kosong.");
      const h = Object.keys(r[0]!);
      setData(r); setHeader(h); setN(0); autoMap(h, tabel);
    } catch (e) { toast.error((e as Error).message); }
  }
  const ubah = (r: Row) => {
    const o: Record<string, unknown> = {};
    for (const k of KOLOM[tabel]) {
      const src = map[k];
      const v = src ? r[src] : null;
      o[k] = k === "created_at" ? tanggal(v) : NUM.has(k) ? angka(v) : teks(v);
    }
    if (!o["created_at"]) delete o["created_at"];
    if ("no_surat_jalan" in o && !o["no_surat_jalan"]) o["no_surat_jalan"] = "-";
    return o;
  };
  async function impor() {
    setBusy(true);
    try {
      const rows = data.map(ubah).filter((r) => r["barcode"] || r["description"]);
      if (!rows.length) throw new Error("Tidak ada baris dengan barcode/description.");
      await kirim(rows, (c) => supabase.from(tabel).insert(c as never), setN);
      toast.success(`${rows.length.toLocaleString("id-ID")} baris diimpor ke ${tabel}`);
      qc.invalidateQueries(); setData([]);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }

  return (
    <section className="glass p-5">
      <h2 className="font-bold">Impor Data Historis</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upload CSV/Excel dari Google Sheets lama. Kolom dipetakan otomatis dari header — periksa dan ubah bila perlu sebelum impor. Data dikirim per 500 baris.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(KOLOM) as Tabel[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTabel(t); if (header.length) autoMap(header, t); }}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold capitalize ${tabel === t ? "btn-gradient" : "glass text-primary"}`}>{t}</button>
        ))}
      </div>
      <FilePick id="historis" label={data.length ? "Ganti file" : "Pilih file"} onFile={baca} />
      {data.length > 0 && (
        <>
          <p className="mt-3 text-sm font-semibold">{data.length.toLocaleString("id-ID")} baris di file</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {KOLOM[tabel].map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <span className="w-36 shrink-0 font-semibold">{k}</span>
                <select value={map[k] ?? ""} onChange={(e) => setMap({ ...map, [k]: e.target.value })} className="min-h-10 flex-1 rounded-xl border border-white/70 bg-white/70 px-2">
                  <option value="">— kosong —</option>
                  {header.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">Pratinjau 5 baris</p>
          <div className="mt-1 overflow-auto rounded-2xl bg-white/50">
            <table className="w-full text-left text-xs">
              <thead><tr>{KOLOM[tabel].map((k) => <th key={k} className="whitespace-nowrap p-2">{k}</th>)}</tr></thead>
              <tbody>{data.slice(0, 5).map(ubah).map((r, i) => (
                <tr key={i} className="border-t border-white/60">{KOLOM[tabel].map((k) => <td key={k} className="whitespace-nowrap p-2">{r[k] == null ? "-" : String(r[k])}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <button type="button" disabled={busy} onClick={impor} className="btn-gradient mt-3 flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-50">
            {busy && <Loader2 className="size-4 animate-spin" />} Impor ke {tabel}
          </button>
          <Progres n={n} total={busy || n ? data.length : 0} />
        </>
      )}
    </section>
  );
}

/* ---------- Daftar Pilihan ---------- */
const JENIS: { jenis: JenisPilihan; judul: string }[] = [
  { jenis: "penempatan", judul: "Penempatan Gudang" },
  { jenis: "team", judul: "Team" },
  { jenis: "alat", judul: "Alat Default" },
];
function DaftarPilihan() {
  const q = usePilihanRows();
  const qc = useQueryClient();
  const [baru, setBaru] = useState<Record<string, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["pilihan"] });
  async function tambah(jenis: JenisPilihan) {
    const nilai = (baru[jenis] ?? "").trim();
    if (!nilai) return;
    const urutan = (q.data?.filter((r) => r.jenis === jenis).length ?? 0) + 1;
    const { error } = await supabase.from("pilihan").insert({ jenis, nilai, urutan });
    if (error) return toast.error(error.message.includes("duplicate") ? "Sudah ada" : error.message);
    setBaru({ ...baru, [jenis]: "" }); refresh();
  }
  async function hapus(id: number) {
    const { error } = await supabase.from("pilihan").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  return (
    <section className="glass p-5">
      <h2 className="font-bold">Daftar Pilihan</h2>
      <p className="mt-1 text-sm text-muted-foreground">Dipakai di dropdown formulir Inbound, Outbound, dan Laporan Akhir Shift.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {JENIS.map(({ jenis, judul }) => (
          <div key={jenis} className="rounded-2xl bg-white/50 p-3">
            <h3 className="mb-2 text-sm font-bold text-primary">{judul}</h3>
            <ul className="flex flex-col gap-1">
              {q.data?.filter((r) => r.jenis === jenis).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-1.5 text-sm">
                  {r.nilai}
                  <button type="button" aria-label="Hapus" onClick={() => hapus(r.id)} className="grid size-9 place-items-center rounded-full text-destructive hover:bg-white"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input value={baru[jenis] ?? ""} onChange={(e) => setBaru({ ...baru, [jenis]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && tambah(jenis)} placeholder="Tambah…" className="h-11 min-w-0 flex-1 rounded-xl border border-white/70 bg-white/70 px-3 text-sm" />
              <button type="button" onClick={() => tambah(jenis)} aria-label="Tambah" className="btn-gradient grid size-11 place-items-center rounded-full"><Plus className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FilePick({ id, busy, onFile, label = "Pilih file" }: { id: string; busy?: boolean; onFile: (f: File) => void; label?: string }) {
  return (
    <label className="btn-gradient mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
      {busy ? "Mengimpor…" : label}
      <input id={`file-${id}`} type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
    </label>
  );
}

