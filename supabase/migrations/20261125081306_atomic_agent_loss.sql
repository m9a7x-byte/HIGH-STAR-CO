SET lock_timeout='5s';
SET statement_timeout='30s';
CREATE FUNCTION public.record_agent_loss(p_agent_id uuid,p_expected_balance numeric,p_amount numeric,p_notes text,p_cash_refund boolean) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_balance numeric;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid() AND deleted_at IS NULL AND coalesce(status,'active')='active';
    IF NOT FOUND OR v_profile.role::text NOT IN ('SUPER_ADMIN','ADMIN','SUPERVISOR')
        OR NOT (coalesce(to_jsonb(v_profile.permissions),'[]'::jsonb) ? 'EDIT_AGENTS') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='لا تملك صلاحية تعديل حساب الوكيل';
    END IF;
    IF p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2) OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_cash_refund IS NULL THEN RAISE EXCEPTION 'مبلغ الخسارة غير صحيح'; END IF;
    SELECT current_balance INTO v_balance FROM public.agent_details WHERE id=p_agent_id FOR UPDATE;
    IF NOT FOUND OR v_balance IS DISTINCT FROM p_expected_balance THEN RAISE EXCEPTION 'تغيّر رصيد الوكيل. حدّث الصفحة ثم حاول مجدداً.'; END IF;
    INSERT INTO public.wallet_transactions(agent_id,amount,type,description,locked)
    VALUES(p_agent_id,p_amount,'ADJUSTMENT','خسارة/خصم للوكيل - '||CASE WHEN p_cash_refund THEN 'اعتماد محاسبي' ELSE 'إضافة رصيد' END
        ||CASE WHEN nullif(btrim(p_notes),'') IS NOT NULL THEN ': '||btrim(p_notes) ELSE '' END||' | بواسطة: '||v_profile.full_name,true);
    IF p_cash_refund THEN
        INSERT INTO public.wallet_transactions(agent_id,amount,type,description,locked)
        VALUES(p_agent_id,-p_amount,'ADJUSTMENT','ترجيع كاش فعلي للوكيل'||CASE WHEN nullif(btrim(p_notes),'') IS NOT NULL THEN ': '||btrim(p_notes) ELSE '' END||' | بواسطة: '||v_profile.full_name,true);
    ELSE
        UPDATE public.agent_details SET current_balance=current_balance+p_amount WHERE id=p_agent_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'تعذر تحديث رصيد الوكيل'; END IF;
    END IF;
    INSERT INTO public.audit_logs(user_id,user_name,action,context,details,previous_value,new_value)
    VALUES(auth.uid(),v_profile.full_name,'تسجيل خسارة وكيل','AGENTS',CASE WHEN p_cash_refund THEN 'خسارة مع ترجيع كاش فعلي' ELSE 'خسارة كرصيد للوكيل' END,
        jsonb_build_object('balance',v_balance)::text,jsonb_build_object('amount',p_amount,'cashRefund',p_cash_refund,'notes',p_notes)::text);
END
$$;
REVOKE ALL ON FUNCTION public.record_agent_loss(uuid,numeric,numeric,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_agent_loss(uuid,numeric,numeric,text,boolean) TO authenticated;
