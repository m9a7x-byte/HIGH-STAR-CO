SET lock_timeout = '5s';
SET statement_timeout = '30s';

ALTER TABLE public.wallet_transactions ADD COLUMN payment_details jsonb;

-- Invoker rights retain the existing RLS policies. All accounting writes either commit together or roll back.
CREATE FUNCTION public.save_agent_movement(
    p_agent_id uuid,
    p_expected_balance numeric,
    p_expected_transaction jsonb,
    p_next_transaction jsonb,
    p_order_changes jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_transaction public.wallet_transactions%ROWTYPE;
    v_order public.orders%ROWTYPE;
    v_change jsonb;
    v_balance numeric;
    v_old_amount numeric := 0;
    v_new_amount numeric := 0;
    v_history_delta numeric;
    v_paid numeric;
    v_id text;
BEGIN
    SELECT * INTO v_profile FROM public.profiles
    WHERE id = auth.uid() AND deleted_at IS NULL AND coalesce(status, 'active') = 'active';
    IF NOT FOUND OR v_profile.role::text NOT IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR')
        OR NOT (coalesce(to_jsonb(v_profile.permissions), '[]'::jsonb) ? 'EDIT_AGENTS') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'لا تملك صلاحية تعديل حركات الوكيل';
    END IF;
    IF p_expected_transaction IS NULL AND p_next_transaction IS NULL THEN
        RAISE EXCEPTION 'الحركة غير موجودة';
    END IF;
    SELECT current_balance INTO v_balance FROM public.agent_details WHERE id = p_agent_id FOR UPDATE;
    IF NOT FOUND OR v_balance IS DISTINCT FROM p_expected_balance THEN
        RAISE EXCEPTION 'تغيّر رصيد الوكيل. حدّث الصفحة ثم حاول مجدداً.';
    END IF;
    IF p_expected_transaction IS NOT NULL THEN
        SELECT * INTO v_transaction FROM public.wallet_transactions
        WHERE id = (jsonb_populate_record(NULL::public.wallet_transactions, p_expected_transaction)).id
            AND agent_id = p_agent_id FOR UPDATE;
        IF NOT FOUND OR to_jsonb(v_transaction) IS DISTINCT FROM to_jsonb(jsonb_populate_record(NULL::public.wallet_transactions, p_expected_transaction)) THEN
            RAISE EXCEPTION 'تغيّرت الحركة. حدّث الصفحة ثم حاول مجدداً.';
        END IF;
        IF coalesce(v_transaction.locked, false) OR (v_transaction.amount <= 0 AND v_transaction.linked_order_id IS NOT NULL)
            OR v_transaction.description ~ '^(شراء طلبية|تعديل قيمة الطلب|تعديل دفعات الطلب).*#' THEN
            RAISE EXCEPTION 'هذه الحركة مقفلة أو مرتبطة بقيمة فاتورة';
        END IF;
        v_old_amount := v_transaction.amount;
        v_id := v_transaction.id::text;
    END IF;
    IF p_next_transaction IS NOT NULL THEN
        v_new_amount := (p_next_transaction->>'amount')::numeric;
        IF v_new_amount IS NULL OR v_new_amount = 0 OR v_new_amount::text IN ('NaN', 'Infinity', '-Infinity')
            OR v_new_amount <> round(v_new_amount, 2)
            OR nullif(btrim(p_next_transaction->>'description'), '') IS NULL
            OR coalesce(p_next_transaction->>'type', '') NOT IN ('DEPOSIT', 'PAYMENT', 'ADJUSTMENT') THEN
            RAISE EXCEPTION 'بيانات الحركة غير صحيحة';
        END IF;
        IF p_expected_transaction IS NOT NULL AND sign(v_new_amount) <> sign(v_old_amount) THEN
            RAISE EXCEPTION 'لا يمكن تغيير نوع الحركة';
        END IF;
    END IF;
    IF jsonb_typeof(p_order_changes) IS DISTINCT FROM 'array' OR (
        SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(p_order_changes)
    ) THEN RAISE EXCEPTION 'بيانات الفواتير غير صحيحة'; END IF;
    FOR v_change IN SELECT value FROM jsonb_array_elements(p_order_changes) ORDER BY value->>'id' LOOP
        SELECT * INTO v_order FROM public.orders
        WHERE id = (jsonb_populate_record(NULL::public.orders, v_change)).id
            AND agent_id = p_agent_id FOR UPDATE;
        IF NOT FOUND OR jsonb_build_object(
            'paid_amount', v_order.paid_amount, 'total_amount', v_order.total_amount,
            'payment_history', coalesce(v_order.payment_history, '[]'::jsonb),
            'payment_status', v_order.payment_status
        ) IS DISTINCT FROM ((v_change->'expected') - 'paid_at')
            OR v_order.paid_at IS DISTINCT FROM (v_change->'expected'->>'paid_at')::timestamptz THEN
            RAISE EXCEPTION 'تغيّرت دفعات الفاتورة. حدّث الصفحة ثم حاول مجدداً.';
        END IF;
        v_paid := (v_change->>'paid_amount')::numeric;
        IF v_paid IS NULL OR v_paid < 0 OR v_paid > v_order.total_amount OR v_paid::text IN ('NaN', 'Infinity', '-Infinity')
            OR jsonb_typeof(v_change->'payment_history') IS DISTINCT FROM 'array' THEN
            RAISE EXCEPTION 'مجموع دفعات الفاتورة غير صحيح';
        END IF;
        SELECT coalesce(sum((value->>'amountAdded')::numeric), 0) INTO v_history_delta
            FROM jsonb_array_elements(v_change->'payment_history');
        SELECT v_history_delta - coalesce(sum((value->>'amountAdded')::numeric), 0) INTO v_history_delta
            FROM jsonb_array_elements(coalesce(v_order.payment_history, '[]'::jsonb));
        IF v_paid - v_order.paid_amount <> v_history_delta THEN
            RAISE EXCEPTION 'رصيد دفعات الفاتورة غير متطابق';
        END IF;
        UPDATE public.orders SET paid_amount = v_paid, payment_history = v_change->'payment_history',
            payment_status = CASE WHEN payment_status = 'CANCELLED' THEN payment_status
                WHEN v_paid >= total_amount AND total_amount > 0 THEN 'PAID'
                WHEN v_paid > 0 THEN 'PARTIALLY_PAID' ELSE 'PENDING' END,
            paid_at = CASE WHEN v_paid >= total_amount AND total_amount > 0 THEN coalesce(paid_at, now()) ELSE NULL END
        WHERE id = v_order.id;
        IF NOT FOUND THEN RAISE EXCEPTION 'تعذر تعديل الفاتورة'; END IF;
    END LOOP;
    IF p_next_transaction IS NULL THEN
        DELETE FROM public.wallet_transactions WHERE id = v_transaction.id;
    ELSIF p_expected_transaction IS NULL THEN
        INSERT INTO public.wallet_transactions (agent_id, amount, type, description, payment_details)
        VALUES (p_agent_id, v_new_amount, (jsonb_populate_record(NULL::public.wallet_transactions, p_next_transaction)).type, p_next_transaction->>'description', p_next_transaction->'payment_details')
        RETURNING id::text INTO v_id;
    ELSE
        UPDATE public.wallet_transactions SET amount = v_new_amount,
            description = p_next_transaction->>'description', payment_details = p_next_transaction->'payment_details'
        WHERE id = v_transaction.id;
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'تعذر حفظ الحركة'; END IF;
    UPDATE public.agent_details SET current_balance = current_balance + v_new_amount - v_old_amount WHERE id = p_agent_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'تعذر تحديث رصيد الوكيل'; END IF;
    INSERT INTO public.audit_logs (user_id, user_name, action, context, details, previous_value, new_value)
    VALUES (auth.uid(), v_profile.full_name, CASE WHEN p_next_transaction IS NULL THEN 'حذف حركة' WHEN p_expected_transaction IS NULL THEN 'إضافة حركة' ELSE 'تعديل حركة' END,
        'AGENTS', 'حركة الوكيل #' || v_id, p_expected_transaction::text, p_next_transaction::text);
END
$$;
REVOKE ALL ON FUNCTION public.save_agent_movement(uuid, numeric, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_agent_movement(uuid, numeric, jsonb, jsonb, jsonb) TO authenticated;

CREATE FUNCTION public.set_agent_movement_locked(p_transaction_id text, p_locked boolean) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_profile FROM public.profiles
    WHERE id = auth.uid() AND deleted_at IS NULL AND coalesce(status, 'active') = 'active';
    IF NOT FOUND OR v_profile.role::text NOT IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR')
        OR NOT (coalesce(to_jsonb(v_profile.permissions), '[]'::jsonb) ? 'EDIT_AGENTS')
        OR p_locked IS NULL OR (NOT p_locked AND v_profile.role::text <> 'SUPER_ADMIN') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'لا تملك صلاحية تغيير قفل الحركة';
    END IF;
    UPDATE public.wallet_transactions SET locked = p_locked
    WHERE id = (jsonb_populate_record(NULL::public.wallet_transactions, jsonb_build_object('id', p_transaction_id))).id;
    IF NOT FOUND THEN RAISE EXCEPTION 'الحركة غير موجودة'; END IF;
END
$$;
REVOKE ALL ON FUNCTION public.set_agent_movement_locked(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_agent_movement_locked(text, boolean) TO authenticated;
