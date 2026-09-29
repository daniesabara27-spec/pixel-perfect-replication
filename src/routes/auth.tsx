import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Masuk — LOGISTIK KCC" },
      {
        name: "description",
        content: "Masuk ke LOGISTIK KCC, aplikasi gudang & logistik PT. KCC Glass Indonesia.",
      },
      { property: "og:title", content: "Masuk — LOGISTIK KCC" },
      {
        property: "og:description",
        content: "Masuk ke LOGISTIK KCC, aplikasi gudang & logistik PT. KCC Glass Indonesia.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "masuk") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Berhasil masuk");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nama },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Akun dibuat");
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Cek email Anda untuk konfirmasi akun");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-2xl border border-white/70 bg-white/65 px-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-strong w-full max-w-md p-7 sm:p-9">
        <div className="flex flex-col items-center text-center">
          <span className="btn-gradient grid size-14 place-items-center rounded-3xl">
            <Boxes className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">LOGISTIK KCC</h1>
          <p className="mt-1 text-sm text-muted-foreground">PT. KCC Glass Indonesia</p>
        </div>

        <div className="glass mt-6 grid grid-cols-2 gap-1 p-1">
          {(["masuk", "daftar"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                "min-h-10 rounded-2xl text-sm font-semibold transition " +
                (mode === m ? "btn-gradient" : "text-slate-600 hover:bg-white/60")
              }
            >
              {m === "masuk" ? "Masuk" : "Daftar"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          {mode === "daftar" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Nama lengkap</span>
              <input
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={inputClass}
                placeholder="Nama sesuai identitas"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="nama@kccglass.co.id"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              required
              type="password"
              autoComplete={mode === "masuk" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-gradient mt-2 flex min-h-12 items-center justify-center gap-2 rounded-full text-base font-bold disabled:opacity-70"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : null}
            {mode === "masuk" ? "Masuk" : "Daftar"}
          </button>
        </form>
      </div>
    </div>
  );
}
