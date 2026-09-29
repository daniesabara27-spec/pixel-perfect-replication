-- ROLES
create type public.app_role as enum ('admin','supervisor','operator');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nama text not null,
  role public.app_role not null default 'operator',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and role in ('admin','supervisor'))
$$;

create policy "profiles select own or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "profiles insert own" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles update own or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles delete admin" on public.profiles for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nama)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- MASTER DATA
create table public.master_data (
  barcode text primary key,
  product_code text,
  product_name text,
  thickness text,
  stock numeric,
  keeping_no text
);
create index master_data_keeping_no_idx on public.master_data (keeping_no);
grant select, insert, update, delete on public.master_data to authenticated;
grant all on public.master_data to service_role;
alter table public.master_data enable row level security;
create policy "master read" on public.master_data for select to authenticated using (true);
create policy "master write admin" on public.master_data for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));
create policy "master update admin" on public.master_data for update to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "master delete admin" on public.master_data for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- AUDIT RAK
create table public.rak_audit (
  id bigint generated always as identity primary key,
  warehouse text not null check (warehouse in ('KCC','WX1','WX2','WX3','WXTEMP')),
  no_rak text not null,
  erp numeric default 0,
  aktual numeric,
  keterangan text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (warehouse, no_rak)
);

-- PACKING
create table public.packing (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  no_rak text, barcode text, description text, thickness text, isi numeric,
  pic text, shift text
);

-- INBOUND
create table public.inbound (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  jenis_penerimaan text,
  no_rak text, barcode text, description text, thickness text, isi numeric,
  no_surat_jalan text not null,
  penempatan_gudang text,
  pic text, shift text
);

-- OUTBOUND
create table public.outbound (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  jenis text default 'SHIPMENT',
  kontainer text,
  tujuan text check (tujuan in ('SHIPMENT 3RD','SHIPMENT KOREA','SHIPMENT DOMESTIK')),
  barcode text, description text, thickness text, isi numeric,
  pic text, no_surat_jalan text not null, shift text, team text
);

-- TRANSFER
create table public.transfer (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  jenis text, kontainer text, tujuan text,
  barcode text, description text, thickness text, isi numeric,
  warehouse text, no_surat_jalan text not null, shift text, pic text
);

-- MOISTURE CONTAINER
create table public.moisture_container (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  no_kontainer text,
  belakang_a numeric, foto_belakang_a text,
  belakang_b numeric, foto_belakang_b text,
  tengah_c numeric, foto_tengah_c text,
  depan_d numeric, foto_depan_d text,
  depan_e numeric, foto_depan_e text,
  foto_form text,
  rata_rata numeric,
  pic text, shift text
);

-- INSPEKSI PENGIRIMAN
create table public.inspeksi_pengiriman (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  no_kontainer text, no_barcode text, description text,
  packing boolean default false, barcode_label boolean default false,
  steelband boolean default false, vinyl boolean default false,
  moisture boolean default false, silica boolean default false,
  stopper_steelband boolean default false,
  foto text, pic text, shift text
);

-- INSPEKSI OUTDOOR
create table public.inspeksi_outdoor (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lokasi text,
  items jsonb,
  foto_depan text, foto_samping_kiri text, foto_samping_kanan text,
  foto_atas text, foto_belakang text,
  pic text, shift text
);

-- LAPORAN SHIFT
create table public.laporan_shift (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tanggal date, shift text, pic text,
  data jsonb, pdf_path text
);

-- NEARMISS
create table public.nearmiss (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tanggal date, jam time, shift text, pic text,
  no_barcode text, description text,
  manpower jsonb, kronologi text, foto jsonb, pdf_path text
);

-- INSTRUKSI KERJA
create table public.instruksi_kerja (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  judul text not null, keterangan text,
  pdf_path text, nama_file text, uploaded_by uuid references public.profiles(id)
);

-- Grants + RLS untuk tabel operasional
do $$
declare t text;
begin
  foreach t in array array['rak_audit','packing','inbound','outbound','transfer','moisture_container','inspeksi_pengiriman','inspeksi_outdoor','laporan_shift','nearmiss','instruksi_kerja']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s insert" on public.%I for insert to authenticated with check (true)', t, t);
    execute format('create policy "%s update staff" on public.%I for update to authenticated using (public.is_staff(auth.uid()))', t, t);
    execute format('create policy "%s delete staff" on public.%I for delete to authenticated using (public.is_staff(auth.uid()))', t, t);
  end loop;
end $$;

-- ERP count per rak
create or replace view public.rak_erp_count
with (security_invoker = true) as
  select keeping_no as no_rak, count(*)::numeric as erp
  from public.master_data
  where keeping_no is not null
  group by keeping_no;
grant select on public.rak_erp_count to authenticated;
grant select on public.rak_erp_count to service_role;
