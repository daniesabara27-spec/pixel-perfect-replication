import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, LogOut, ChevronDown, Boxes, Settings as SettingsIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { NAV_ITEMS, AUDIT_RAK, GUDANG } from "@/lib/nav";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="btn-gradient grid size-10 shrink-0 place-items-center rounded-2xl">
        <Boxes className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-extrabold tracking-tight">
          LOGISTIK KCC
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          PT. KCC Glass Indonesia
        </span>
      </span>
    </div>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rakOpenDefault = pathname.startsWith("/audit-rak");
  const [rakOpen, setRakOpen] = useState(rakOpenDefault);

  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors duration-150",
      active
        ? "btn-gradient"
        : "text-slate-700 hover:bg-white/60 hover:text-slate-900",
    );

  return (
    <nav className="flex flex-col gap-1 pb-6">
      {NAV_ITEMS.slice(0, 13).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={linkClass(pathname === item.to)}
        >
          <item.icon className="size-[18px] shrink-0" />
          <span className="min-w-0 truncate">{item.label}</span>
        </Link>
      ))}

      <button
        type="button"
        onClick={() => setRakOpen((v) => !v)}
        className={linkClass(false)}
      >
        <AUDIT_RAK.icon className="size-[18px] shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{AUDIT_RAK.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-200", rakOpen && "rotate-180")}
        />
      </button>
      {rakOpen ? (
        <div className="animate-in fade-in slide-in-from-top-1 ml-6 flex flex-col gap-1 duration-200">
          {GUDANG.map((g) => (
            <Link
              key={g.gudang}
              to="/audit-rak/$gudang"
              params={{ gudang: g.gudang }}
              onClick={onNavigate}
              className={linkClass(pathname === `/audit-rak/${g.gudang}`)}
            >
              <span className="min-w-0 truncate">{g.label}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <Link
        to="/pengaturan"
        onClick={onNavigate}
        className={linkClass(pathname === "/pengaturan")}
      >
        <SettingsIcon className="size-[18px] shrink-0" />
        <span className="min-w-0 truncate">Pengaturan</span>
      </Link>
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function keluar() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar desktop */}
      <aside className="glass-strong sticky top-0 hidden h-screen w-72 shrink-0 flex-col rounded-none rounded-r-3xl border-l-0 px-3 py-5 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          <NavContent />
        </div>
        <button
          onClick={keluar}
          className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-white/60"
        >
          <LogOut className="size-[18px]" />
          Keluar
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* App bar mobile */}
        <header className="glass-strong sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none rounded-b-3xl px-3 py-2.5 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="grid size-11 shrink-0 place-items-center rounded-2xl text-slate-700 hover:bg-white/60">
              <Menu className="size-5" />
              <span className="sr-only">Buka menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="glass-strong w-[86vw] max-w-80 overflow-y-auto border-0 px-3 py-5">
              <SheetTitle className="px-2 text-left">
                <Brand />
              </SheetTitle>
              <div className="mt-4">
                <NavContent onNavigate={() => setOpen(false)} />
              </div>
              <button
                onClick={keluar}
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium text-slate-700 hover:bg-white/60"
              >
                <LogOut className="size-[18px]" />
                Keluar
              </button>
            </SheetContent>
          </Sheet>
          <span className="min-w-0 truncate text-center text-sm font-bold tracking-tight">
            LOGISTIK KCC
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/60 text-xs font-bold text-slate-600">
            {(profile?.nama ?? "?").slice(0, 2).toUpperCase()}
          </span>
        </header>

        <div className="hidden items-center justify-end gap-3 px-6 pt-5 lg:flex">
          <span className="glass px-4 py-2 text-xs font-semibold text-slate-600">
            {profile?.nama ?? "Memuat..."}
            {profile ? ` · ${profile.role}` : ""}
          </span>
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
