import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Unggah foto ke bucket privat "foto", kembalikan path-nya. */
export async function uploadFoto(file: File | null, folder: string): Promise<string | null> {
  if (!file) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("foto").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (error) throw error;
  return path;
}

export function FotoInput({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  const cam = useRef<HTMLInputElement>(null);
  const up = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
    e.target.value = "";
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {url ? (
        <div className="relative">
          <img src={url} alt={label} className="h-36 w-full rounded-2xl object-cover" />
          <button type="button" onClick={() => onChange(null)} aria-label="Hapus foto" className="glass-strong absolute right-2 top-2 grid size-9 place-items-center rounded-full">
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => cam.current?.click()} className="btn-gradient flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold">
          <Camera className="size-4" /> Foto
        </button>
        <button type="button" onClick={() => up.current?.click()} className="glass flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary">
          <Upload className="size-4" /> Upload
        </button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={up} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}
