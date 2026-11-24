SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- Only status and its derived purchase charge are changed; deposits remain intact.
CREATE FUNCTION public.change_order_production_status(
  p_order_id integer, p_expected_status text, p_expected_total numeric, p_new_status text
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_agent_id uuid;
  v_charge_ids integer[];
  v_charge_total numeric;
  v_charge_count integer;
  v_updated integer;
BEGIN
  SELECT * INTO v_profile FROM public.profiles
  WHERE id = auth.uid() AND deleted_at IS NULL AND coalesce(status, 'active') = 'active';
  IF NOT FOUND OR v_profile.role::text NOT IN ('SUPER_ADMIN','ADMIN','SUPERVISOR')
    OR NOT (coalesce(to_jsonb(v_profile.permissions), '[]'::jsonb) ? 'EDIT_PRODUCTION') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'لا تملك صلاحية تغيير حالة الطلب';
  END IF;
  IF p_new_status IS NULL OR p_new_status NOT IN ('PENDING_PAYMENT','PENDING_TRANSFER','WAITING','IN_PROGRESS','COMPLETED') THEN
    RAISE EXCEPTION 'الحالة المطلوبة غير صحيحة';
  END IF;

  SELECT agent_id INTO v_agent_id FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير موجود أو غير متاح'; END IF;
  -- Use the same agent -> order lock order as movement corrections.
  PERFORM 1 FROM public.agent_details WHERE id = v_agent_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'بيانات حساب الوكيل غير متاحة'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.agent_id IS DISTINCT FROM v_agent_id
    OR v_order.production_status::text IS DISTINCT FROM p_expected_status
    OR v_order.total_amount IS DISTINCT FROM p_expected_total THEN
    RAISE EXCEPTION 'تغيّرت حالة أو قيمة الطلب. حدّث الصفحة ثم حاول مجدداً.';
  END IF;
  IF v_order.total_amount IS NULL OR v_order.total_amount < 0 THEN
    RAISE EXCEPTION 'قيمة الطلب غير صحيحة';
  END IF;
  IF v_order.production_status::text = p_new_status THEN RETURN; END IF;

  SELECT coalesce(array_agg(t.id), '{}'::integer[]), coalesce(sum(t.amount), 0), count(*)
  INTO v_charge_ids, v_charge_total, v_charge_count
  FROM (
    SELECT id,amount FROM public.wallet_transactions
    WHERE agent_id = v_agent_id AND (
      (type::text = 'PAYMENT' AND description = 'شراء طلبية #' || p_order_id::text)
      OR (type::text = 'ADJUSTMENT' AND description ~ ('^تعديل قيمة الطلب #' || p_order_id::text || '([[:space:](]|$)'))
    ) ORDER BY id FOR UPDATE
  ) t;

  IF v_order.production_status::text = 'COMPLETED' THEN
    IF v_charge_count = 0 OR round(v_charge_total, 2) <> -round(v_order.total_amount, 2) THEN
      RAISE EXCEPTION 'حركة احتساب الطلب لا تطابق قيمته. راجع كشف الحساب قبل تغيير الحالة.';
    END IF;
    UPDATE public.agent_details SET current_balance = current_balance + v_order.total_amount WHERE id = v_agent_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 1 THEN RAISE EXCEPTION 'تعذر تعديل رصيد الوكيل'; END IF;
    DELETE FROM public.wallet_transactions WHERE id = ANY(v_charge_ids);
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> v_charge_count THEN RAISE EXCEPTION 'تعذر إلغاء حركة احتساب الطلب'; END IF;
  ELSIF p_new_status = 'COMPLETED' THEN
    IF v_charge_count <> 0 THEN RAISE EXCEPTION 'توجد حركة احتساب سابقة لهذا الطلب. راجع كشف الحساب.'; END IF;
    UPDATE public.agent_details SET current_balance = current_balance - v_order.total_amount WHERE id = v_agent_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 1 THEN RAISE EXCEPTION 'تعذر تعديل رصيد الوكيل'; END IF;
    INSERT INTO public.wallet_transactions(agent_id,amount,type,description,linked_order_id)
    VALUES (v_agent_id,-v_order.total_amount,'PAYMENT','شراء طلبية #' || p_order_id::text,p_order_id);
  END IF;

  UPDATE public.orders SET
    production_status = p_new_status::public.production_status,
    agent_edit_unlocked = false,
    moved_to_production_at = CASE
      WHEN p_new_status IN ('PENDING_PAYMENT','PENDING_TRANSFER') THEN NULL
      WHEN v_order.production_status::text IN ('PENDING_PAYMENT','PENDING_TRANSFER') THEN now()
      ELSE moved_to_production_at
    END
  WHERE id = p_order_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'تعذر تغيير حالة الطلب'; END IF;
  INSERT INTO public.audit_logs(user_id,user_name,action,context,details,previous_value,new_value)
  VALUES (v_profile.id,v_profile.full_name,'تغيير حالة الطلب','ORDERS',
    'تغيير حالة الطلب #' || p_order_id::text || CASE
      WHEN v_order.production_status::text = 'COMPLETED' THEN ' وإلغاء احتساب قيمته من حساب الوكيل'
      WHEN p_new_status = 'COMPLETED' THEN ' واحتساب قيمته على حساب الوكيل' ELSE '' END,
    v_order.production_status::text,p_new_status);
END;
$$;
REVOKE ALL ON FUNCTION public.change_order_production_status(integer,text,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_order_production_status(integer,text,numeric,text) TO authenticated;

-- Protect advanced orders even when an older application still shows a Delete button.
CREATE FUNCTION private.protect_accounted_order_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF OLD.production_status::text NOT IN ('PENDING_PAYMENT','PENDING_TRANSFER')
    OR coalesce(OLD.paid_amount,0) <> 0 OR coalesce(OLD.payment_history,'[]'::jsonb) <> '[]'::jsonb
    OR EXISTS (SELECT 1 FROM public.wallet_transactions WHERE linked_order_id = OLD.id
      OR (agent_id = OLD.agent_id AND (description = 'شراء طلبية #' || OLD.id::text
        OR description ~ ('^تعديل قيمة الطلب #' || OLD.id::text || '([[:space:](]|$)')))) THEN
    RAISE EXCEPTION 'لا يمكن حذف طلب مرحّل للإنتاج أو مرتبط بحركة مالية. استخدم تغيير حالة الطلب.';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_accounted_order_delete() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_accounted_order_delete BEFORE DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.protect_accounted_order_delete();
