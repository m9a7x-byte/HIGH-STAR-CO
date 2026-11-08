BEGIN;
DO $test$
DECLARE agent_id uuid; admin_id uuid; blocked boolean:=false; n integer; expected_products integer; expected_profiles integer;
BEGIN
SELECT count(*) INTO expected_products FROM public.products;
SELECT count(*) INTO expected_profiles FROM public.profiles;
SELECT id INTO agent_id FROM public.profiles WHERE role='AGENT' AND deleted_at IS NULL AND coalesce(status,'active')='active' LIMIT 1;
SELECT id INTO admin_id FROM public.profiles WHERE role IN ('SUPER_ADMIN','ADMIN') AND deleted_at IS NULL AND coalesce(status,'active')='active' LIMIT 1;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',agent_id,'role','authenticated','user_metadata',jsonb_build_object('role','SUPER_ADMIN'))::text,true);
EXECUTE 'SET LOCAL ROLE authenticated';
IF public.get_my_role_v5()<>'AGENT' THEN RAISE EXCEPTION 'Role spoofing regression'; END IF;
SELECT count(*) INTO n FROM public.profiles;
IF n<>1 THEN RAISE EXCEPTION 'Agent profile isolation failed: %',n; END IF;
SELECT count(*) INTO n FROM public.products;
IF n<>expected_products THEN RAISE EXCEPTION 'Agent catalog access failed: %',n; END IF;
BEGIN UPDATE public.profiles SET role='ADMIN' WHERE id=agent_id; EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
IF NOT blocked THEN RAISE EXCEPTION 'Agent could update role'; END IF;
UPDATE public.products SET code=code;
GET DIAGNOSTICS n=ROW_COUNT;
IF n<>0 THEN RAISE EXCEPTION 'Agent could edit catalog'; END IF;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
IF NOT public.is_admin_level() THEN RAISE EXCEPTION 'Admin role unavailable'; END IF;
SELECT count(*) INTO n FROM public.profiles;
IF n<>expected_profiles THEN RAISE EXCEPTION 'Admin access failed: %',n; END IF;
UPDATE public.products SET code=code WHERE id=(SELECT min(id) FROM public.products);
GET DIAGNOSTICS n=ROW_COUNT;
IF n<>1 THEN RAISE EXCEPTION 'Admin catalog update failed'; END IF;
END $test$;
ROLLBACK;
