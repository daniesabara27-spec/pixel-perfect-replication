import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ScanLine, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { GUDANG } from "@/lib/nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pencarian-barang")({
  head: () => ({
    meta: [
      { title: "Pencarian Barang — LOGISTIK KCC" },
      { name: "description", content: "Cari barang berdasarkan barcode, kode atau nama produk." },
      { property: "og:title", content: "Pencarian Barang — LOGISTIK KCC" },
      { property: "og:description", content: "Cari barang berdasarkan barcode, kode atau nama produk." },
    ],
  }),
  component: Page,
});

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function Page() {
  const [teks, setTeks] = useState("");
  const [gudang, setGudang] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const q = useDebounced(teks.trim());

  const hasil = useQuery({
    queryKey: ["cari-barang", q, gudang],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("cari_barang", gudang ? { _q: q, _warehouse: gudang } : { _q: q });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Pencarian Barang</h1>
      <div className="glass flex items-center gap-2 p-2">
        <Search className="ml-2 size-5 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder="Barcode, product code, atau nama produk"
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        <button onClick={() => setScan(true)} className="btn-gradient flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold">
          <ScanLine className="size-4" /> <span className="hidden sm:inline">Scan</span>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[{ label: "Semua", gudang: null as string | null }, ...GUDANG].map((g) => (
          <button
            key={g.label}
            onClick={() => setGudang(g.gudang)}
            className={cn("min-h-10 rounded-full px-4 text-sm font-semibold transition-colors", gudang === g.gudang ? "btn-gradient" : "glass")}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {q.length < 2 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">Ketik minimal 2 huruf untuk mencari.</p>
        ) : hasil.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl bg-white/50" />)
        ) : hasil.error ? (
          <p className="text-sm text-destructive">Gagal mencari: {(hasil.error as Error).message}</p>
        ) : hasil.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">Barang tidak ditemukan.</p>
        ) : (
          hasil.data?.map((b) => (
            <article key={b.barcode} className="glass animate-in fade-in p-4 duration-200">
              <p className="font-mono text-xs text-muted-foreground">{b.barcode}</p>
              <h2 className="mt-1 font-bold leading-snug">{b.product_name ?? "-"}</h2>
              <p className="text-xs text-muted-foreground">{b.product_code}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Thickness</p><p className="font-semibold">{b.thickness ?? "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Stock</p><p className="font-semibold">{b.stock ?? 0}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground">Lokasi</p>
                  <p className="flex items-center gap-1 font-semibold"><MapPin className="size-3.5 text-primary" />{b.keeping_no ?? "-"}</p>
                  {b.warehouse ? <p className="text-xs text-muted-foreground">{b.warehouse}</p> : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {scan ? <Scanner onClose={() => setScan(false)} onResult={(v) => { setTeks(v); setScan(false); }} /> : null}
    </div>
  );
}

function Scanner({ onClose, onResult }: { onClose: () => void; onResult: (v: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      toast.error("Browser ini belum mendukung scan kamera. Ketik barcode secara manual.");
      onClose();
      return;
    }
    let stream: MediaStream | null = null;
    let stop = false;
    const detector = new BD();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]?.rawValue) { onResult(codes[0].rawValue); break; }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        toast.error("Kamera tidak dapat dibuka.");
        onClose();
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/60 p-4">
      <div className="glass-strong w-full max-w-md p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold">Arahkan kamera ke barcode</span>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-white/60" aria-label="Tutup"><X className="size-5" /></button>
        </div>
        <video ref={video} playsInline muted className="aspect-[4/3] w-full rounded-2xl object-cover" />
      </div>
    </div>
  );
}
