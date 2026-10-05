CREATE TABLE public.pilihan (
  id bigint generated always as identity primary key,
  jenis text not null check (jenis in ('penempatan','team','alat')),
  nilai text not null,
  urutan int not null default 0,
  unique (jenis, nilai)
);
GRANT SELECT ON public.pilihan TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pilihan TO authenticated;
GRANT ALL ON public.pilihan TO service_role;
ALTER TABLE public.pilihan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pilihan read" ON public.pilihan FOR SELECT TO authenticated USING (true);
CREATE POLICY "pilihan insert admin" ON public.pilihan FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pilihan update admin" ON public.pilihan FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pilihan delete admin" ON public.pilihan FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.pilihan (jenis, nilai, urutan) VALUES
 ('penempatan','KCC',1),('penempatan','WANXINDA 1',2),('penempatan','WANXINDA 2',3),('penempatan','WANXINDA 3',4),('penempatan','WANXINDA TEMP',5),
 ('alat','Tensioner',1),('alat','Sealer',2),('alat','PDA',3);