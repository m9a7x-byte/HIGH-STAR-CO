CREATE FUNCTION private.agent_production_queue()
RETURNS TABLE (
    id integer,
    agent_name text,
    is_own_order boolean,
    has_special_request boolean,
    created_at timestamptz,
    production_at timestamptz,
    production_status public.production_status
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT queue.id, queue.agent_name, queue.agent_id = viewer.id,
           queue.agent_id = viewer.id AND queue.has_special_request,
           queue.created_at, coalesce(queue.moved_to_production_at, queue.paid_at),
           queue.production_status
    FROM public.profiles AS viewer
    JOIN public.agent_details AS details ON details.id = viewer.id
    CROSS JOIN public.orders AS queue
    WHERE viewer.id = (SELECT auth.uid())
      AND viewer.role = 'AGENT'
      AND viewer.deleted_at IS NULL
      AND coalesce(viewer.status, 'active') = 'active'
      AND details.is_frozen IS NOT TRUE
      AND details.permissions -> 'showProductionQueue' = 'true'::jsonb
      AND coalesce((
          SELECT settings.value -> 'showProductionQueueToAgents'
          FROM public.system_settings AS settings
          WHERE settings.key = 'vehicle_config'
      ), 'true'::jsonb) = 'true'::jsonb
      AND queue.production_status IN ('WAITING', 'IN_PROGRESS')
    ORDER BY queue.created_at, queue.id;
$$;

REVOKE ALL ON FUNCTION private.agent_production_queue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.agent_production_queue() TO authenticated;

CREATE FUNCTION public.get_agent_production_queue()
RETURNS TABLE (
    id integer,
    agent_name text,
    is_own_order boolean,
    has_special_request boolean,
    created_at timestamptz,
    production_at timestamptz,
    production_status public.production_status
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
    SELECT * FROM private.agent_production_queue();
$$;

REVOKE ALL ON FUNCTION public.get_agent_production_queue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_production_queue() TO authenticated;
