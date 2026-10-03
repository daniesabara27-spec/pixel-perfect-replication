CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

CREATE POLICY "users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'supervisor')
  )
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'hanya admin yang dapat mengubah role';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, NEW.role);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_role_before_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_ringkasan(_dari date, _sampai date)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH hari AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date t),
  p AS (
    SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::date tgl, sum(coalesce(isi,0)) q
    FROM packing
    WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN _dari AND _sampai
    GROUP BY 1
  ),
  s AS (
    SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::date tgl, sum(coalesce(isi,0)) q
    FROM outbound
    WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN _dari AND _sampai
      AND coalesce(jenis,'SHIPMENT') ILIKE 'SHIPMENT%'
    GROUP BY 1
  ),
  a AS (
    SELECT g.w gudang, r.aktual, r.erp
    FROM unnest(array['KCC','WX1','WX2','WX3','WXTEMP']) g(w)
    LEFT JOIN LATERAL rak_list(g.w) r ON true
  ),
  ag AS (
    SELECT gudang,
      CASE WHEN count(aktual)=0 THEN null
      ELSE round(100.0*count(*) FILTER (WHERE aktual = erp)/count(aktual),1) END akurasi
    FROM a GROUP BY gudang
  )
  SELECT jsonb_build_object(
    'total_stock', (SELECT coalesce(sum(stock),0) FROM master_data),
    'inbound_hari_ini', (SELECT coalesce(sum(isi),0) FROM packing, hari WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = hari.t),
    'outbound_hari_ini', (SELECT coalesce(sum(isi),0) FROM outbound, hari WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = hari.t AND coalesce(jenis,'SHIPMENT') ILIKE 'SHIPMENT%'),
    'akurasi', (SELECT round(avg(akurasi),1) FROM ag),
    'akurasi_gudang', (SELECT jsonb_agg(jsonb_build_object('gudang',gudang,'akurasi',akurasi) ORDER BY array_position(array['KCC','WX1','WX2','WX3','WXTEMP'],gudang)) FROM ag),
    'tren', (SELECT coalesce(jsonb_agg(jsonb_build_object('tanggal',g::date,'packing',coalesce(p.q,0),'shipment',coalesce(s.q,0)) ORDER BY g),'[]'::jsonb)
      FROM generate_series(_dari::timestamp,_sampai::timestamp,interval '1 day') g
      LEFT JOIN p ON p.tgl=g::date LEFT JOIN s ON s.tgl=g::date)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.dashboard_ringkasan(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_ringkasan(date,date) TO authenticated;