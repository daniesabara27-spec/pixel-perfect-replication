import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  nama: string;
  role: "admin" | "supervisor" | "operator";
};

/** Profil pengguna yang sedang login — dipakai untuk mengisi field PIC otomatis. */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nama, role")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile) ?? null;
    },
  });
}

/** Shift default dari jam sekarang (07–15 = 1, 15–23 = 2, 23–07 = 3). */
export function shiftSekarang(date = new Date()): "1" | "2" | "3" {
  const jam = Number(
    new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(date),
  );
  if (jam >= 7 && jam < 15) return "1";
  if (jam >= 15 && jam < 23) return "2";
  return "3";
}
