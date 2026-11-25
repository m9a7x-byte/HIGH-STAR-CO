SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE FUNCTION public.save_staff_order_edit(p_order_id bigint, p_expected jsonb, p_changes jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_order public.orders%ROWTYPE;
    v_next public.orders%ROWTYPE;
    v_agent uuid;
    v_difference numeric;
    v_subtotal numeric;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid() AND deleted_at IS NULL AND coalesce(status,'active')='active';
    IF NOT FOUND OR v_profile.role::text NOT IN ('SUPER_ADMIN','ADMIN','SUPERVISOR')
        OR NOT (coalesce(to_jsonb(v_profile.permissions),'[]'::jsonb) ? 'EDIT_ORDERS') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='لا تملك صلاحية تعديل الطلبات';
    END IF;
    SELECT agent_id INTO v_agent FROM public.orders WHERE id=p_order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
    PERFORM 1 FROM public.agent_details WHERE id=v_agent FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'بيانات الوكيل غير موجودة'; END IF;
    SELECT * INTO v_order FROM public.orders WHERE id=p_order_id AND agent_id=v_agent FOR UPDATE;
    IF NOT FOUND OR jsonb_build_object('total_amount',v_order.total_amount,'paid_amount',v_order.paid_amount,
        'production_status',v_order.production_status,'items',v_order.items,
        'discount_value',coalesce(v_order.discount_value,0),'discount_type',coalesce(v_order.discount_type,'FIXED')) IS DISTINCT FROM p_expected THEN
        RAISE EXCEPTION 'تغيّر الطلب أو دفعاته أو حالة تجهيزه. حدّث الصفحة ثم حاول مجدداً.';
    END IF;
    IF v_order.payment_status::text='CANCELLED' THEN RAISE EXCEPTION 'لا يمكن تعديل طلب ملغي'; END IF;
    v_next := jsonb_populate_record(v_order,p_changes);
    IF jsonb_typeof(v_next.items) IS DISTINCT FROM 'array' OR v_next.total_amount IS NULL
        OR v_next.total_amount < 0 OR v_next.total_amount::text IN ('NaN','Infinity','-Infinity')
        OR v_next.discount_value IS NULL OR v_next.discount_value < 0 OR v_next.discount_type NOT IN ('FIXED','PERCENT')
        OR (v_next.discount_type='PERCENT' AND v_next.discount_value>100) THEN RAISE EXCEPTION 'قيمة الطلب أو الخصم غير صحيحة'; END IF;
    SELECT coalesce(sum(round((value->>'totalPrice')::numeric,2)),0) INTO v_subtotal FROM jsonb_array_elements(v_next.items);
    IF v_subtotal IS DISTINCT FROM v_next.sub_total_amount OR v_next.total_amount IS DISTINCT FROM round(v_subtotal-
        CASE WHEN v_next.discount_type='PERCENT' THEN v_subtotal*v_next.discount_value/100 ELSE v_next.discount_value END,2) THEN
        RAISE EXCEPTION 'مجموع مواد الطلب والخصم غير متطابق';
    END IF;
    v_difference := v_next.total_amount-v_order.total_amount;
    UPDATE public.orders SET items=v_next.items,total_amount=v_next.total_amount,sub_total_amount=v_next.sub_total_amount,
        discount_value=v_next.discount_value,discount_type=v_next.discount_type,total_volume=v_next.total_volume,
        has_special_request=v_next.has_special_request,agent_edit_unlocked=v_next.agent_edit_unlocked,
        payment_status=(jsonb_populate_record(NULL::public.orders,jsonb_build_object('payment_status',
            CASE WHEN v_order.paid_amount>=v_next.total_amount AND v_next.total_amount>0 THEN 'PAID'
                WHEN v_order.paid_amount>0 THEN 'PARTIALLY_PAID' ELSE 'PENDING' END))).payment_status,
        paid_at=CASE WHEN v_order.paid_amount>=v_next.total_amount AND v_next.total_amount>0 THEN coalesce(v_order.paid_at,now()) ELSE NULL END
    WHERE id=p_order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'تعذر تعديل الطلب'; END IF;
    IF v_order.production_status::text='COMPLETED' AND v_difference<>0 THEN
        UPDATE public.agent_details SET current_balance=current_balance-v_difference WHERE id=v_agent;
        IF NOT FOUND THEN RAISE EXCEPTION 'تعذر تحديث الرصيد'; END IF;
        INSERT INTO public.wallet_transactions(agent_id,amount,type,description,linked_order_id,locked)
        VALUES(v_agent,-v_difference,'ADJUSTMENT','تعديل قيمة الطلب #'||p_order_id::text||CASE WHEN v_difference>0 THEN ' (زيادة)' ELSE ' (نقصان)' END,p_order_id,true);
    END IF;
    INSERT INTO public.audit_logs(user_id,user_name,action,context,details,previous_value,new_value)
    VALUES(auth.uid(),v_profile.full_name,'تعديل طلب','ORDERS','تعديل الطلب #'||p_order_id::text,to_jsonb(v_order)::text,p_changes::text);
END
$$;
REVOKE ALL ON FUNCTION public.save_staff_order_edit(bigint,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_staff_order_edit(bigint,jsonb,jsonb) TO authenticated;
