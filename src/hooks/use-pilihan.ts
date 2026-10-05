import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type JenisPilihan = "penempatan" | "team" | "alat";

export const PILIHAN_DEFAULT: Record<JenisPilihan, string[]> = {
  penempatan: ["KCC", "WANXINDA 1", "WANXINDA 2", "WANXINDA 3", "WANXINDA TEMP"],
  team: [],
  alat: ["Tensioner", "Sealer", "PDA"],
};

export function usePilihanRows() {
  return useQuery({
    queryKey: ["pilihan"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("pilihan").select("*").order("urutan").order("id");
      if (error) throw error;
      return data;
    },
  });
}

export function usePilihan(jenis: JenisPilihan): string[] {
  const q = usePilihanRows();
  if (!q.data) return PILIHAN_DEFAULT[jenis];
  return q.data.filter((r) => r.jenis === jenis).map((r) => r.nilai);
}
