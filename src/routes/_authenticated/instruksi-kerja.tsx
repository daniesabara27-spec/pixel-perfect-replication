import { useMemo, useRef, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileUp, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, FormPage, SubmitButton, inputClass } from "@/components/form-kit";
import { bukaFile } from "@/lib/laporan-pdf";

export const Route = createFileRoute("/_authenticated/instruksi-kerja")({
  head: () => ({
    meta: [
      { title: "Instruksi Kerja — LOGISTIK KCC" },
      { name: "description", content: "Unggah dan buka dokumen instruksi kerja PDF." },
      { property: "og:title", content: "Instruksi Kerja — LOGISTIK KCC" },
      { property: "og:description", content: "Unggah dan buka dokumen instruksi kerja PDF." },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [judul, setJudul] = useState("");
  const [ket, setKet] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(false);

  const daftar = useQuery({
    queryKey: ["instruksi-kerja"],
    queryFn: async () => {
      const { data, error } = await supabase.from("instruksi_kerja").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const fmt = useMemo(() => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }), []);
  const hasil = (daftar.data ?? []).filter((d) => (d.judul + " " + (d.keterangan ?? "")).toLowerCase().includes(cari.trim().toLowerCase()));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!judul.trim() || !file) return;
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.pdf`;
      const up = await supabase.storage.from("instruksi-kerja").upload(path, file, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      const { error } = await supabase.from("instruksi_kerja").insert({ judul: judul.trim(), keterangan: ket.trim() || null, pdf_path: path, nama_file: file.name, uploaded_by: u.user?.id ?? null });
      if (error) throw error;
      toast.success("Instruksi kerja diunggah.");
      setJudul(""); setKet(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["instruksi-kerja"] });
    } catch (err) {
      toast.error("Gagal mengunggah: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const buka = (path: string, dl?: string) => bukaFile("instruksi-kerja", path, dl).catch((e) => toast.error("Gagal membuka: " + e.message));

  return (
    <FormPage title="Instruksi Kerja">
      <form onSubmit={submit} className="glass flex flex-col gap-4 p-4 sm:p-5">
        <Field label="Judul"><input value={judul} onChange={(e) => setJudul(e.target.value)} className={inputClass} /></Field>
        <Field label="Keterangan (opsional)"><input value={ket} onChange={(e) => setKet(e.target.value)} className={inputClass} /></Field>
        <button type="button" onClick={() => fileRef.current?.click()} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-primary">
          <FileUp className="size-5" /> <span className="truncate">{file ? file.name : "Pilih file PDF"}</span>
        </button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return void toast.error("File harus PDF.");
          if (f.size > 20 * 1024 * 1024) return void toast.error("Ukuran file maksimal 20 MB.");
          setFile(f);
        }} />
        <SubmitButton disabled={!judul.trim() || !file} loading={loading}>Upload</SubmitButton>
      </form>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Daftar Instruksi Kerja</h2>
        <div className="glass mb-3 flex items-center gap-2 px-3">
          <Search className="size-5 text-muted-foreground" />
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari judul atau keterangan" className="min-h-12 flex-1 bg-transparent outline-none" />
        </div>
        {daftar.isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p> : daftar.error ? <p className="text-sm text-destructive">Daftar gagal dimuat.</p> : !hasil.length ? <p className="text-sm text-muted-foreground">Belum ada instruksi kerja.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {hasil.map((d) => (
              <article key={d.id} className="glass flex flex-col gap-2 p-4">
                <h3 className="font-bold leading-snug">{d.judul}</h3>
                {d.keterangan ? <p className="text-sm text-muted-foreground">{d.keterangan}</p> : null}
                <p className="text-xs text-muted-foreground">Diunggah {fmt.format(new Date(d.created_at))}</p>
                {d.pdf_path ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => buka(d.pdf_path!)} className="btn-gradient flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"><Eye className="size-4" /> Buka</button>
                    <button type="button" onClick={() => buka(d.pdf_path!, d.nama_file ?? "instruksi-kerja.pdf")} className="glass flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary"><Download className="size-4" /> Download</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </FormPage>
  );
}
