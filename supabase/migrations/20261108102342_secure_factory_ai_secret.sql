CREATE TABLE private.factory_ai_rate_limits (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 last_requested_at timestamptz NOT NULL
);
ALTER TABLE private.factory_ai_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.factory_ai_rate_limits FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.read_factory_ai_secret() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path=''
AS $$ SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='factory_gemini_api_key' $$;
REVOKE ALL ON FUNCTION private.read_factory_ai_secret() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_factory_ai_secret() TO service_role;
CREATE FUNCTION public.read_factory_ai_secret() RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT private.read_factory_ai_secret() $$;
REVOKE ALL ON FUNCTION public.read_factory_ai_secret() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_factory_ai_secret() TO service_role;
CREATE FUNCTION private.reserve_factory_ai_request(p_user_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=''
AS $$ WITH reserved AS (
 INSERT INTO private.factory_ai_rate_limits(user_id,last_requested_at) VALUES (p_user_id,now())
 ON CONFLICT (user_id) DO UPDATE SET last_requested_at=excluded.last_requested_at
 WHERE private.factory_ai_rate_limits.last_requested_at < now()-interval '1 minute'
 RETURNING user_id
) SELECT EXISTS(SELECT 1 FROM reserved) $$;
REVOKE ALL ON FUNCTION private.reserve_factory_ai_request(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.reserve_factory_ai_request(uuid) TO service_role;
CREATE FUNCTION public.reserve_factory_ai_request(p_user_id uuid) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT private.reserve_factory_ai_request(p_user_id) $$;
REVOKE ALL ON FUNCTION public.reserve_factory_ai_request(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_factory_ai_request(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
