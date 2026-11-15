SET LOCAL lock_timeout = '5s';

CREATE FUNCTION private.check_inventory_movement_lock() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
    changes_lock boolean;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF current_user = 'authenticated' AND OLD.category = 'INVENTORY' AND OLD.is_locked IS TRUE THEN
            RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'inventory_movement_locked';
        END IF;
        RETURN OLD;
    END IF;

    IF current_user <> 'authenticated' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        changes_lock := NEW.category = 'INVENTORY' AND NEW.is_locked IS TRUE;
    ELSE
        IF OLD.category = 'INVENTORY' AND OLD.is_locked IS TRUE
            AND (to_jsonb(NEW) - 'is_locked') IS DISTINCT FROM (to_jsonb(OLD) - 'is_locked') THEN
            RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'inventory_movement_locked';
        END IF;

        changes_lock := (
            OLD.category = 'INVENTORY' AND OLD.is_locked IS TRUE AND NEW.is_locked IS NOT TRUE
        ) OR (
            NEW.category = 'INVENTORY' AND NEW.is_locked IS TRUE
                AND (OLD.category IS DISTINCT FROM NEW.category OR OLD.is_locked IS NOT TRUE)
        );
    END IF;

    IF changes_lock AND NOT private.has_factory_inventory_permission('LOCK_FACTORY_INV') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'inventory_movement_lock_permission_required';
    END IF;
    RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.check_inventory_movement_lock() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER check_inventory_movement_lock BEFORE INSERT OR UPDATE OR DELETE ON public.factory_transactions
    FOR EACH ROW EXECUTE FUNCTION private.check_inventory_movement_lock();
