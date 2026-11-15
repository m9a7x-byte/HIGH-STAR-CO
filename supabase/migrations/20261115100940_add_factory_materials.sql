SET LOCAL lock_timeout = '5s';
LOCK TABLE public.factory_transactions IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE public.factory_materials (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name text CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 120),
    unit text NOT NULL DEFAULT 'unit'
        CHECK (unit IN ('unit', 'ton', 'kg', 'carton', 'bag', 'piece', 'liter', 'meter')),
    sort_order integer NOT NULL DEFAULT 100,
    archived_at timestamptz
);

-- Keep the IDs used by existing inventory, supplier and logistics records.
INSERT INTO public.factory_materials (id, unit, sort_order) VALUES
    ('SAND_ADHESIVE', 'ton', 1),
    ('SAND', 'ton', 2),
    ('SILICON_COLD', 'ton', 3),
    ('SILICON_HOT', 'ton', 4),
    ('CEMENT_BLACK', 'ton', 5),
    ('CEMENT_WHITE', 'ton', 6),
    ('EPS_RAW', 'ton', 7),
    ('POLYMER_ADHESIVE', 'ton', 8),
    ('SILOSH_ADHESIVE', 'ton', 9),
    ('SHASTA_ADHESIVE', 'ton', 10),
    ('CARTON_FOAM', 'carton', 11),
    ('BAGS_1051', 'bag', 12),
    ('BAGS_1052', 'bag', 13),
    ('BAGS_1053', 'bag', 14),
    ('BAGS_1054', 'bag', 15),
    ('BAGS_1059', 'bag', 16);

INSERT INTO public.factory_materials (id)
SELECT DISTINCT material_type::text FROM public.factory_transactions
WHERE nullif(btrim(material_type::text), '') IS NOT NULL
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_factory_transactions_inventory_material
    ON public.factory_transactions (material_type) WHERE category = 'INVENTORY';

CREATE FUNCTION private.has_factory_inventory_permission(permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT coalesce((
        SELECT role::text IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR')
            AND to_jsonb(permissions) ? permission
        FROM public.profiles
        WHERE id = auth.uid() AND deleted_at IS NULL AND coalesce(status, 'active') = 'active'
    ), false)
$$;
REVOKE ALL ON FUNCTION private.has_factory_inventory_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_factory_inventory_permission(text) TO authenticated;

ALTER TABLE public.factory_materials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.factory_materials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT (name, unit), UPDATE (name, unit, archived_at)
    ON public.factory_materials TO authenticated;
GRANT ALL ON public.factory_materials TO service_role;

CREATE POLICY factory_materials_read ON public.factory_materials FOR SELECT TO authenticated
    USING ((SELECT public.is_staff_v5()));
CREATE POLICY factory_materials_add ON public.factory_materials FOR INSERT TO authenticated
    WITH CHECK (name IS NOT NULL AND (SELECT private.has_factory_inventory_permission('ADD_FACTORY_INV')));
CREATE POLICY factory_materials_update ON public.factory_materials FOR UPDATE TO authenticated
    USING ((SELECT private.has_factory_inventory_permission('EDIT_FACTORY_INV'))
        OR (SELECT private.has_factory_inventory_permission('DELETE_FACTORY_INV')))
    WITH CHECK ((SELECT private.has_factory_inventory_permission('EDIT_FACTORY_INV'))
        OR (SELECT private.has_factory_inventory_permission('DELETE_FACTORY_INV')));

CREATE FUNCTION private.check_factory_material_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
    IF current_user = 'authenticated' THEN
        IF NEW.archived_at IS DISTINCT FROM OLD.archived_at
            AND NOT private.has_factory_inventory_permission('DELETE_FACTORY_INV') THEN
            RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Inventory delete permission required';
        END IF;
        IF (NEW.name IS DISTINCT FROM OLD.name OR NEW.unit IS DISTINCT FROM OLD.unit)
            AND NOT private.has_factory_inventory_permission('EDIT_FACTORY_INV') THEN
            RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Inventory edit permission required';
        END IF;
    END IF;
    IF NEW.unit IS DISTINCT FROM OLD.unit AND EXISTS (
        SELECT FROM public.factory_transactions WHERE category = 'INVENTORY' AND material_type = OLD.id
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'factory_material_unit_in_use';
    END IF;
    RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.check_factory_material_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER check_factory_material_update BEFORE UPDATE ON public.factory_materials
    FOR EACH ROW EXECUTE FUNCTION private.check_factory_material_update();

CREATE FUNCTION private.check_inventory_movement_material() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NEW.category <> 'INVENTORY' THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.category = 'INVENTORY' AND OLD.material_type IS NOT DISTINCT FROM NEW.material_type THEN
            RETURN NEW;
        END IF;
    END IF;
    PERFORM 1 FROM public.factory_materials
        WHERE id = NEW.material_type AND archived_at IS NULL FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'factory_material_unavailable';
    END IF;
    RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.check_inventory_movement_material() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER check_inventory_movement_material BEFORE INSERT OR UPDATE OF material_type, category
    ON public.factory_transactions FOR EACH ROW EXECUTE FUNCTION private.check_inventory_movement_material();

ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_materials;
