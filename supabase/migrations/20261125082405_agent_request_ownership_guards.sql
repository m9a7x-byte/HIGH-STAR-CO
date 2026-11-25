SET lock_timeout='5s';
SET statement_timeout='30s';
CREATE FUNCTION private.normalize_agent_request_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
    IF auth.uid() IS NULL OR (SELECT public.is_editor_v5()) THEN RETURN NEW; END IF;
    IF TG_OP='INSERT' THEN
        -- The customer cannot impersonate another display name, create a manual order or unlock their own edit.
        SELECT full_name,coalesce(province,'') INTO NEW.agent_name,NEW.agent_province
        FROM public.profiles WHERE id=auth.uid();
        NEW.agent_edit_unlocked:=false;
        NEW.is_manual:=false;
        NEW.manual_by:=NULL;
        NEW.seen_by_admin:=false;
    ELSE
        NEW.agent_name:=OLD.agent_name;
        NEW.agent_province:=OLD.agent_province;
        NEW.is_manual:=OLD.is_manual;
        NEW.manual_by:=OLD.manual_by;
        NEW.seen_by_admin:=OLD.seen_by_admin;
    END IF;
    RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.normalize_agent_request_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER normalize_agent_request_identity BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.normalize_agent_request_identity();
