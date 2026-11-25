SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.protect_reversed_agent_movement() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
    -- A correction and its source form an immutable accounting pair, including their locks.
    IF OLD.payment_details->'reversal'->>'kind' = 'order_charge_reversal'
        OR EXISTS (SELECT 1 FROM public.wallet_transactions t
            WHERE t.agent_id = OLD.agent_id
                AND t.payment_details->'reversal'->>'kind' = 'order_charge_reversal'
                AND t.payment_details->'reversal'->>'transactionId' = OLD.id::text) THEN
        RAISE EXCEPTION 'هذه الحركة مرتبطة بقيد عكسي موثق ولا يمكن تعديلها أو حذفها';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.protect_reversed_agent_movement() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_reversed_agent_movement
BEFORE UPDATE OR DELETE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION private.protect_reversed_agent_movement();
