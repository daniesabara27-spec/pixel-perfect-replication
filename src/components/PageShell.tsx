import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="glass animate-in fade-in slide-in-from-bottom-2 min-h-[220px] p-5 duration-200 sm:p-7">
        {children ?? (
          <p className="text-sm text-muted-foreground">
            Halaman ini masih kosong. Isi dan formulirnya akan ditambahkan berikutnya.
          </p>
        )}
      </div>
    </div>
  );
}
