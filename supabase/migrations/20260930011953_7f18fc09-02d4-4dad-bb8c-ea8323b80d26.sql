create or replace function public._agg_by(_tbl text, _col text, _dari date, _sampai date, _lim int default 50)
returns jsonb language plpgsql stable set search_path = public as $$
declare r jsonb;
begin
  if _tbl not in ('packing','inbound','outbound','transfer') then raise exception 'tabel tidak valid'; end if;
  execute format(
    'select coalesce(jsonb_agg(jsonb_build_object(''label'',label,''qty'',qty) order by qty desc),''[]''::jsonb) from (
       select coalesce(nullif(trim(%I::text),''''),''(kosong)'') label, sum(coalesce(isi,0)) qty
       from public.%I where (created_at at time zone ''Asia/Jakarta'')::date between $1 and $2
       group by 1 order by 2 desc limit %s) s', _col, _tbl, _lim)
  into r using _dari, _sampai;
  return r;
end $$;

create or replace function public.dashboard_detail(_jenis text, _dari date, _sampai date)
returns jsonb language plpgsql stable set search_path = public as $$
declare base jsonb; tren jsonb; extra jsonb; bd jsonb;
begin
  if _jenis not in ('packing','inbound','outbound','transfer') then raise exception 'jenis tidak valid'; end if;
  execute format(
    'with d as (select (created_at at time zone ''Asia/Jakarta'')::date tgl, coalesce(isi,0) isi from public.%I
       where (created_at at time zone ''Asia/Jakarta'')::date between $1 and $2),
     h as (select tgl, sum(isi) qty, count(*) n from d group by tgl)
     select jsonb_build_object(
       ''total_qty'', coalesce((select sum(isi) from d),0),
       ''entri'', (select count(*) from d),
       ''hari_aktif'', (select count(*) from h),
       ''puncak'', (select jsonb_build_object(''tanggal'',tgl,''qty'',qty) from h order by qty desc limit 1)),
     coalesce((select jsonb_agg(jsonb_build_object(''tanggal'',g::date,''qty'',coalesce(h.qty,0),''entri'',coalesce(h.n,0)) order by g)
       from generate_series($1::timestamp,$2::timestamp,interval ''1 day'') g left join h on h.tgl=g::date),''[]''::jsonb)', _jenis)
  into base, tren using _dari, _sampai;

  if _jenis = 'packing' then
    select jsonb_build_object('label','Rak terisi','nilai',count(distinct no_rak)) into extra from packing where (created_at at time zone 'Asia/Jakarta')::date between _dari and _sampai;
    bd := jsonb_build_array(
      jsonb_build_object('judul','Qty per Shift','data',_agg_by('packing','shift',_dari,_sampai)),
      jsonb_build_object('judul','Qty per Thickness','data',_agg_by('packing','thickness',_dari,_sampai)),
      jsonb_build_object('judul','Top 10 No Rak','data',_agg_by('packing','no_rak',_dari,_sampai,10)),
      jsonb_build_object('judul','Top 10 SKU','data',_agg_by('packing','description',_dari,_sampai,10)));
  elsif _jenis = 'inbound' then
    select jsonb_build_object('label','Surat jalan unik','nilai',count(distinct no_surat_jalan)) into extra from inbound where (created_at at time zone 'Asia/Jakarta')::date between _dari and _sampai;
    bd := jsonb_build_array(
      jsonb_build_object('judul','Asal Penerimaan','data',_agg_by('inbound','jenis_penerimaan',_dari,_sampai)),
      jsonb_build_object('judul','Penempatan Gudang','data',_agg_by('inbound','penempatan_gudang',_dari,_sampai)),
      jsonb_build_object('judul','Qty per Shift','data',_agg_by('inbound','shift',_dari,_sampai)),
      jsonb_build_object('judul','Top 10 No Rak','data',_agg_by('inbound','no_rak',_dari,_sampai,10)));
  elsif _jenis = 'outbound' then
    select jsonb_build_object('label','Kontainer/truck unik','nilai',count(distinct kontainer)) into extra from outbound where (created_at at time zone 'Asia/Jakarta')::date between _dari and _sampai;
    bd := jsonb_build_array(
      jsonb_build_object('judul','Tujuan Shipment','data',_agg_by('outbound','tujuan',_dari,_sampai)),
      jsonb_build_object('judul','Qty per Shift','data',_agg_by('outbound','shift',_dari,_sampai)),
      jsonb_build_object('judul','Qty per Team','data',_agg_by('outbound','team',_dari,_sampai)));
  else
    select jsonb_build_object('label','Kontainer unik','nilai',count(distinct kontainer)) into extra from transfer where (created_at at time zone 'Asia/Jakarta')::date between _dari and _sampai;
    bd := jsonb_build_array(
      jsonb_build_object('judul','Arah Transfer','data',_agg_by('transfer','jenis',_dari,_sampai)),
      jsonb_build_object('judul','Warehouse','data',_agg_by('transfer','warehouse',_dari,_sampai)),
      jsonb_build_object('judul','Qty per Shift','data',_agg_by('transfer','shift',_dari,_sampai)));
  end if;
  return base || jsonb_build_object('extra',extra,'tren',tren,'breakdown',bd);
end $$;

create or replace function public.rak_list(_warehouse text)
returns table(id bigint, no_rak text, erp bigint, aktual numeric, keterangan text, updated_at timestamptz)
language sql stable set search_path = public as $$
  select r.id, r.no_rak, coalesce((select count(*) from master_data m where m.keeping_no = r.no_rak),0), r.aktual, r.keterangan, r.updated_at
  from rak_audit r where r.warehouse = _warehouse
$$;

create or replace function public.dashboard_ringkasan(_dari date, _sampai date)
returns jsonb language sql stable set search_path = public as $$
  with hari as (select (now() at time zone 'Asia/Jakarta')::date t),
  p as (select (created_at at time zone 'Asia/Jakarta')::date tgl, sum(coalesce(isi,0)) q from packing where (created_at at time zone 'Asia/Jakarta')::date between _dari and _sampai group by 1),
  s as (select (created_at at time zone 'Asia/Jakarta')::date tgl, sum(coalesce(isi,0)) q from outbound where (created_at at time zone 'Asia/Jakarta')::date between _dari and _sampai group by 1),
  a as (select g.w gudang, r.aktual, r.erp from unnest(array['KCC','WX1','WX2','WX3','WXTEMP']) g(w) left join lateral rak_list(g.w) r on true),
  ag as (select gudang, case when count(aktual)=0 then null else round(100.0*count(*) filter (where aktual = erp)/count(aktual),1) end akurasi from a group by gudang)
  select jsonb_build_object(
    'total_stock', (select coalesce(sum(stock),0) from master_data),
    'inbound_hari_ini', (select coalesce(sum(isi),0) from packing, hari where (created_at at time zone 'Asia/Jakarta')::date = hari.t),
    'outbound_hari_ini', (select coalesce(sum(isi),0) from outbound, hari where (created_at at time zone 'Asia/Jakarta')::date = hari.t and coalesce(jenis,'SHIPMENT') ilike 'SHIPMENT%'),
    'akurasi', (select round(avg(akurasi),1) from ag),
    'akurasi_gudang', (select jsonb_agg(jsonb_build_object('gudang',gudang,'akurasi',akurasi) order by array_position(array['KCC','WX1','WX2','WX3','WXTEMP'],gudang)) from ag),
    'tren', (select coalesce(jsonb_agg(jsonb_build_object('tanggal',g::date,'packing',coalesce(p.q,0),'shipment',coalesce(s.q,0)) order by g),'[]'::jsonb)
      from generate_series(_dari::timestamp,_sampai::timestamp,interval '1 day') g left join p on p.tgl=g::date left join s on s.tgl=g::date));
$$;

create or replace function public.cari_barang(_q text, _warehouse text default null)
returns table(barcode text, product_code text, product_name text, thickness text, stock numeric, keeping_no text, warehouse text)
language sql stable set search_path = public as $$
  select m.barcode, m.product_code, m.product_name, m.thickness, m.stock, m.keeping_no,
    (select r.warehouse from rak_audit r where r.no_rak = m.keeping_no limit 1)
  from master_data m
  where (m.barcode ilike '%'||_q||'%' or m.product_code ilike '%'||_q||'%' or m.product_name ilike '%'||_q||'%')
    and (_warehouse is null or exists (select 1 from rak_audit r where r.no_rak = m.keeping_no and r.warehouse = _warehouse))
  order by m.barcode limit 100
$$;

create or replace function public.set_rak_aktual(_id bigint, _aktual numeric, _keterangan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'harus login'; end if;
  update rak_audit set aktual = _aktual, keterangan = _keterangan, updated_by = auth.uid(), updated_at = now() where id = _id;
end $$;

revoke execute on function public._agg_by(text,text,date,date,int), public.dashboard_detail(text,date,date), public.rak_list(text), public.dashboard_ringkasan(date,date), public.cari_barang(text,text), public.set_rak_aktual(bigint,numeric,text) from public, anon;
grant execute on function public._agg_by(text,text,date,date,int), public.dashboard_detail(text,date,date), public.rak_list(text), public.dashboard_ringkasan(date,date), public.cari_barang(text,text), public.set_rak_aktual(bigint,numeric,text) to authenticated;