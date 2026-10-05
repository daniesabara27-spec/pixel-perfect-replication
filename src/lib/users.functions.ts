import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function pastikanAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Hanya admin yang boleh melakukan ini.");
}

export const daftarUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await pastikanAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const { data: prof } = await supabaseAdmin.from("profiles").select("id, nama, role");
    const m = new Map((prof ?? []).map((p) => [p.id, p]));
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      nama: m.get(u.id)?.nama ?? "",
      role: (m.get(u.id)?.role ?? "operator") as "admin" | "supervisor" | "operator",
    }));
  });

export const tambahUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    email: z.string().email(),
    password: z.string().min(6),
    nama: z.string().min(1).max(100),
    role: z.enum(["admin", "supervisor", "operator"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await pastikanAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { nama: data.nama },
    });
    if (error) throw new Error(error.message);
    if (data.role !== "operator") {
      const { error: e2 } = await context.supabase.from("profiles").update({ role: data.role }).eq("id", u.user.id);
      if (e2) throw new Error(e2.message);
    }
    return { ok: true };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), password: z.string().min(6) }).parse(d))
  .handler(async ({ data, context }) => {
    await pastikanAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
