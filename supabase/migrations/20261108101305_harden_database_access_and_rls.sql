SET lock_timeout='5s';
SET statement_timeout='30s';
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA private TO authenticated,service_role;

-- Resolve authorization from protected server data, never user-editable JWT metadata.
CREATE OR REPLACE FUNCTION private.current_profile_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT coalesce((SELECT role::text FROM public.profiles WHERE id=(select auth.uid()) AND deleted_at IS NULL AND coalesce(status,'active')='active'),'USER') $$;
REVOKE ALL ON FUNCTION private.current_profile_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.current_profile_role() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_auth_role() RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() $$;
CREATE OR REPLACE FUNCTION public.get_my_role_v4() RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() $$;
CREATE OR REPLACE FUNCTION public.get_my_role_v5() RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() $$;
CREATE OR REPLACE FUNCTION public.is_admin_level() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() IN ('SUPER_ADMIN','ADMIN') $$;
CREATE OR REPLACE FUNCTION public.is_editor() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() IN ('SUPER_ADMIN','ADMIN','SUPERVISOR') $$;
CREATE OR REPLACE FUNCTION public.is_editor_v4() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() IN ('SUPER_ADMIN','ADMIN','SUPERVISOR') $$;
CREATE OR REPLACE FUNCTION public.is_editor_v5() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() IN ('SUPER_ADMIN','ADMIN','SUPERVISOR') $$;
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() IN ('SUPER_ADMIN','ADMIN','SUPERVISOR','VIEWER') $$;
CREATE OR REPLACE FUNCTION public.is_staff_v4() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() IN ('SUPER_ADMIN','ADMIN','SUPERVISOR','VIEWER') $$;
CREATE OR REPLACE FUNCTION public.is_staff_v5() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.current_profile_role() IN ('SUPER_ADMIN','ADMIN','SUPERVISOR','VIEWER') $$;
ALTER FUNCTION public.delete_old_notifications() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.delete_old_notifications() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.notify_agent_on_order_status_change() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.notify_agent_on_order_status_change() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.notify_admins_of_new_order() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.notify_admins_of_new_order() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.sync_role_to_metadata() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.sync_role_to_metadata() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.lock_agent_order_edit_after_agent_update() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.lock_agent_order_edit_after_agent_update() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.touch_push_subscription_updated_at() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.touch_push_subscription_updated_at() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.enqueue_push_for_notification() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.enqueue_push_for_notification() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION private.touch_push_subscription_updated_at() SET search_path='';
CREATE OR REPLACE FUNCTION private.protect_profile_authorization() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(auth.role(),'') <> 'service_role'
    AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.permissions IS DISTINCT FROM OLD.permissions OR NEW.status IS DISTINCT FROM OLD.status OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
    AND private.current_profile_role() NOT IN ('SUPER_ADMIN','ADMIN') THEN
    RAISE EXCEPTION 'Only administrators can change account authorization' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.protect_profile_authorization() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_profile_authorization BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.protect_profile_authorization();
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.is_editor() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.is_admin_level() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_admin_level() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_auth_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_role_v4() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_role_v4() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.is_staff_v4() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_staff_v4() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.is_editor_v4() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_editor_v4() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_role_v5() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_role_v5() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.is_staff_v5() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_staff_v5() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.is_editor_v5() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_editor_v5() TO authenticated,service_role;
DROP POLICY "v5_agent_update_self" ON public."agent_details";
DROP POLICY "v5_agent_view_self" ON public."agent_details";
DROP POLICY "v5_editor_manage_agents" ON public."agent_details";
DROP POLICY "v5_staff_view_agents" ON public."agent_details";
DROP POLICY "v5_insert_logs" ON public."audit_logs";
DROP POLICY "v5_staff_view_logs" ON public."audit_logs";
DROP POLICY "v5_manage_categories" ON public."categories";
DROP POLICY "v5_view_categories" ON public."categories";
DROP POLICY "v5_staff_manage_factory" ON public."factory_transactions";
DROP POLICY "v5_staff_view_factory" ON public."factory_transactions";
DROP POLICY "Users can create notifications" ON public."notifications";
DROP POLICY "Users can update their own notifications" ON public."notifications";
DROP POLICY "Users can view their own notifications" ON public."notifications";
DROP POLICY "v5_agent_create_orders" ON public."orders";
DROP POLICY "v5_agent_update_unlocked_orders" ON public."orders";
DROP POLICY "v5_agent_view_orders" ON public."orders";
DROP POLICY "v5_staff_update_orders" ON public."orders";
DROP POLICY "v5_staff_view_orders" ON public."orders";
DROP POLICY "v5_manage_products" ON public."products";
DROP POLICY "v5_view_products" ON public."products";
DROP POLICY "v5_editor_update_all" ON public."profiles";
DROP POLICY "v5_staff_view_all" ON public."profiles";
DROP POLICY "v5_user_update_self" ON public."profiles";
DROP POLICY "v5_user_view_self" ON public."profiles";
DROP POLICY "Users can create own push subscriptions" ON public."push_subscriptions";
DROP POLICY "Users can delete own push subscriptions" ON public."push_subscriptions";
DROP POLICY "Users can update own push subscriptions" ON public."push_subscriptions";
DROP POLICY "Users can view own push subscriptions" ON public."push_subscriptions";
DROP POLICY "authenticated_full_access" ON public."supplier_transactions";
DROP POLICY "v5_manage_suppliers" ON public."suppliers";
DROP POLICY "v5_view_suppliers" ON public."suppliers";
DROP POLICY "v5_admin_manage_settings" ON public."system_settings";
DROP POLICY "v5_view_settings" ON public."system_settings";
DROP POLICY "v5_agent_insert_wallet" ON public."wallet_transactions";
DROP POLICY "v5_agent_view_wallet" ON public."wallet_transactions";
DROP POLICY "v5_staff_manage_wallet" ON public."wallet_transactions";
DROP POLICY "v5_staff_view_wallet" ON public."wallet_transactions";
CREATE POLICY "access_select" ON public."agent_details" FOR SELECT TO authenticated USING (((id = (select auth.uid()))) OR ((select public.is_editor_v5())) OR ((select public.is_staff_v5())));
CREATE POLICY "access_insert" ON public."agent_details" FOR INSERT TO authenticated WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_update" ON public."agent_details" FOR UPDATE TO authenticated USING (((id = (select auth.uid()))) OR ((select public.is_editor_v5()))) WITH CHECK (((id = (select auth.uid()))) OR ((select public.is_editor_v5())));
CREATE POLICY "access_delete" ON public."agent_details" FOR DELETE TO authenticated USING (((select public.is_editor_v5())));
CREATE POLICY "access_select" ON public."audit_logs" FOR SELECT TO authenticated USING (((select public.is_staff_v5())));
CREATE POLICY "access_insert" ON public."audit_logs" FOR INSERT TO authenticated WITH CHECK (((((select auth.uid()))::text = (user_id)::text)));
CREATE POLICY "access_select" ON public."categories" FOR SELECT TO authenticated USING (((select public.is_editor_v5())) OR (true));
CREATE POLICY "access_insert" ON public."categories" FOR INSERT TO authenticated WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_update" ON public."categories" FOR UPDATE TO authenticated USING (((select public.is_editor_v5()))) WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_delete" ON public."categories" FOR DELETE TO authenticated USING (((select public.is_editor_v5())));
CREATE POLICY "access_select" ON public."factory_transactions" FOR SELECT TO authenticated USING (((select public.is_editor_v5())) OR ((select public.is_staff_v5())));
CREATE POLICY "access_insert" ON public."factory_transactions" FOR INSERT TO authenticated WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_update" ON public."factory_transactions" FOR UPDATE TO authenticated USING (((select public.is_editor_v5()))) WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_delete" ON public."factory_transactions" FOR DELETE TO authenticated USING (((select public.is_editor_v5())));
CREATE POLICY "access_select" ON public."notifications" FOR SELECT TO authenticated USING ((((select auth.uid()) = user_id)));
CREATE POLICY "access_insert" ON public."notifications" FOR INSERT TO authenticated WITH CHECK ((((select auth.role()) = 'authenticated'::text)));
CREATE POLICY "access_update" ON public."notifications" FOR UPDATE TO authenticated USING ((((select auth.uid()) = user_id))) WITH CHECK ((((select auth.uid()) = user_id)));
CREATE POLICY "access_select" ON public."orders" FOR SELECT TO authenticated USING ((((select auth.uid()) = agent_id)) OR ((select public.is_editor_v5())) OR ((select public.is_staff_v5())));
CREATE POLICY "access_insert" ON public."orders" FOR INSERT TO authenticated WITH CHECK ((((select auth.uid()) = agent_id)) OR ((select public.is_editor_v5())));
CREATE POLICY "access_update" ON public."orders" FOR UPDATE TO authenticated USING (((((select auth.uid()) = agent_id) AND (agent_edit_unlocked = true) AND (production_status = ANY (ARRAY['PENDING_TRANSFER'::production_status, 'PENDING_PAYMENT'::production_status])))) OR ((select public.is_editor_v5()))) WITH CHECK (((((select auth.uid()) = agent_id) AND (production_status = ANY (ARRAY['PENDING_TRANSFER'::production_status, 'PENDING_PAYMENT'::production_status])))) OR ((select public.is_editor_v5())));
CREATE POLICY "access_delete" ON public."orders" FOR DELETE TO authenticated USING (((select public.is_editor_v5())));
CREATE POLICY "access_select" ON public."products" FOR SELECT TO authenticated USING (((select public.is_editor_v5())) OR (true));
CREATE POLICY "access_insert" ON public."products" FOR INSERT TO authenticated WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_update" ON public."products" FOR UPDATE TO authenticated USING (((select public.is_editor_v5()))) WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_delete" ON public."products" FOR DELETE TO authenticated USING (((select public.is_editor_v5())));
CREATE POLICY "access_select" ON public."profiles" FOR SELECT TO authenticated USING (((select public.is_staff_v5())) OR (((select auth.uid()) = id)));
CREATE POLICY "access_update" ON public."profiles" FOR UPDATE TO authenticated USING (((select public.is_editor_v5())) OR (((select auth.uid()) = id))) WITH CHECK (((select public.is_editor_v5())) OR (((select auth.uid()) = id)));
CREATE POLICY "access_select" ON public."push_subscriptions" FOR SELECT TO authenticated USING ((((select auth.uid()) = user_id)));
CREATE POLICY "access_insert" ON public."push_subscriptions" FOR INSERT TO authenticated WITH CHECK ((((select auth.uid()) = user_id)));
CREATE POLICY "access_update" ON public."push_subscriptions" FOR UPDATE TO authenticated USING ((((select auth.uid()) = user_id))) WITH CHECK ((((select auth.uid()) = user_id)));
CREATE POLICY "access_delete" ON public."push_subscriptions" FOR DELETE TO authenticated USING ((((select auth.uid()) = user_id)));
CREATE POLICY "access_select" ON public."supplier_transactions" FOR SELECT TO authenticated USING ((select public.is_editor_v5()));
CREATE POLICY "access_insert" ON public."supplier_transactions" FOR INSERT TO authenticated WITH CHECK ((select public.is_editor_v5()));
CREATE POLICY "access_update" ON public."supplier_transactions" FOR UPDATE TO authenticated USING ((select public.is_editor_v5())) WITH CHECK ((select public.is_editor_v5()));
CREATE POLICY "access_delete" ON public."supplier_transactions" FOR DELETE TO authenticated USING ((select public.is_editor_v5()));
CREATE POLICY "access_select" ON public."suppliers" FOR SELECT TO authenticated USING (((select public.is_editor_v5())) OR (true));
CREATE POLICY "access_insert" ON public."suppliers" FOR INSERT TO authenticated WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_update" ON public."suppliers" FOR UPDATE TO authenticated USING (((select public.is_editor_v5()))) WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_delete" ON public."suppliers" FOR DELETE TO authenticated USING (((select public.is_editor_v5())));
CREATE POLICY "access_select" ON public."system_settings" FOR SELECT TO authenticated USING (((upper((select public.get_my_role_v5())) = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text]))) OR (true));
CREATE POLICY "access_insert" ON public."system_settings" FOR INSERT TO authenticated WITH CHECK (((upper((select public.get_my_role_v5())) = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text]))));
CREATE POLICY "access_update" ON public."system_settings" FOR UPDATE TO authenticated USING (((upper((select public.get_my_role_v5())) = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text])))) WITH CHECK (((upper((select public.get_my_role_v5())) = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text]))));
CREATE POLICY "access_delete" ON public."system_settings" FOR DELETE TO authenticated USING (((upper((select public.get_my_role_v5())) = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text]))));
CREATE POLICY "access_select" ON public."wallet_transactions" FOR SELECT TO authenticated USING (((agent_id = (select auth.uid()))) OR ((select public.is_editor_v5())) OR ((select public.is_staff_v5())));
CREATE POLICY "access_insert" ON public."wallet_transactions" FOR INSERT TO authenticated WITH CHECK (((agent_id = (select auth.uid()))) OR ((select public.is_editor_v5())));
CREATE POLICY "access_update" ON public."wallet_transactions" FOR UPDATE TO authenticated USING (((select public.is_editor_v5()))) WITH CHECK (((select public.is_editor_v5())));
CREATE POLICY "access_delete" ON public."wallet_transactions" FOR DELETE TO authenticated USING (((select public.is_editor_v5())));
ALTER POLICY "Admin Delete Access" ON storage."objects" USING (((bucket_id = 'ProductImg'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['SUPER_ADMIN'::user_role, 'ADMIN'::user_role, 'SUPERVISOR'::user_role])))))));
ALTER POLICY "Admin Update Access" ON storage."objects" USING (((bucket_id = 'ProductImg'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['SUPER_ADMIN'::user_role, 'ADMIN'::user_role, 'SUPERVISOR'::user_role])))))));
ALTER POLICY "Admin Upload Access" ON storage."objects" WITH CHECK (((bucket_id = 'ProductImg'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['SUPER_ADMIN'::user_role, 'ADMIN'::user_role, 'SUPERVISOR'::user_role])))))));
ALTER POLICY "Admins can do everything on avatars" ON storage."objects" USING (((bucket_id = 'avatars'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['ADMIN'::user_role, 'SUPER_ADMIN'::user_role]))))))) WITH CHECK (((bucket_id = 'avatars'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['ADMIN'::user_role, 'SUPER_ADMIN'::user_role])))))));
ALTER POLICY "Allow authenticated view avatars" ON storage."objects" USING ((bucket_id = 'avatars'::text));
ALTER POLICY "Allow users to delete own avatar" ON storage."objects" USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));
ALTER POLICY "Allow users to update own avatar" ON storage."objects" USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));
ALTER POLICY "Allow users to upload own avatar" ON storage."objects" WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));
ALTER POLICY "Authenticated Read Access" ON storage."objects" USING ((bucket_id = 'ProductImg'::text));
ALTER POLICY "Authenticated users can update own avatar" ON storage."objects" USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));
ALTER POLICY "Authenticated users can upload own avatar" ON storage."objects" WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));
ALTER POLICY "Public Access" ON storage."objects" USING ((bucket_id = 'avatars'::text));
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON public."audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_factory_transactions_agent_id" ON public."factory_transactions" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_factory_transactions_supplier_id" ON public."factory_transactions" ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_orders_agent_id" ON public."orders" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_agent_id" ON public."wallet_transactions" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_linked_order_id" ON public."wallet_transactions" ("linked_order_id");
NOTIFY pgrst,'reload schema';
