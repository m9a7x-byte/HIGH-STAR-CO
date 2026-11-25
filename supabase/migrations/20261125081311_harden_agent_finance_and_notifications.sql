SET lock_timeout='5s';
SET statement_timeout='30s';

-- Agents submit requests, while staff accounting functions own money movements.
ALTER POLICY access_update ON public.agent_details TO authenticated
USING ((SELECT public.is_editor_v5())) WITH CHECK ((SELECT public.is_editor_v5()));
ALTER POLICY access_insert ON public.wallet_transactions TO authenticated
WITH CHECK ((SELECT public.is_editor_v5()));
ALTER POLICY access_insert ON public.notifications TO authenticated
WITH CHECK ((SELECT public.is_editor_v5()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid())
        AND coalesce(to_jsonb(p.permissions),'[]'::jsonb) ? 'EDIT_SETTINGS'
));
CREATE POLICY access_delete ON public.notifications FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon,authenticated;

CREATE FUNCTION private.guard_system_reversal_metadata() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NEW.payment_details ? 'reversal' THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='بيانات القيد العكسي مخصصة لتصحيح محاسبي موثق';
    END IF;
    RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.guard_system_reversal_metadata() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_system_reversal_metadata BEFORE INSERT OR UPDATE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION private.guard_system_reversal_metadata();

-- Order notification triggers retain definer rights in the private, unexposed schema.
DO $$
DECLARE name text;
BEGIN
    FOREACH name IN ARRAY ARRAY['notify_admins_of_new_order','notify_agent_on_order_status_change','lock_agent_order_edit_after_agent_update'] LOOP
        IF to_regprocedure('public.'||name||'()') IS NOT NULL THEN
            EXECUTE format('ALTER FUNCTION public.%I() SET SCHEMA private',name);
            EXECUTE format('ALTER FUNCTION private.%I() SET search_path = %L',name,'');
            EXECUTE format('REVOKE ALL ON FUNCTION private.%I() FROM PUBLIC,anon,authenticated',name);
        END IF;
    END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION private.notify_admins_of_new_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
    INSERT INTO public.notifications(user_id,title,message,type,related_entity_id,related_entity_type)
    SELECT id,'طلب جديد','تم تقديم طلب جديد #'||NEW.id||' من قبل '||NEW.agent_name,'info',NEW.id::text,'order'
    FROM public.profiles WHERE role::text IN ('SUPER_ADMIN','ADMIN','SUPERVISOR')
        AND deleted_at IS NULL AND coalesce(status,'active')='active'
        AND coalesce(to_jsonb(permissions),'[]'::jsonb) ?| ARRAY['VIEW_ORDERS','VIEW_PRODUCTION'];
    RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.notify_admins_of_new_order() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.validate_agent_order_finance() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE
    v_agent public.agent_details%ROWTYPE;
    v_product public.products%ROWTYPE;
    v_item jsonb;
    v_original jsonb;
    v_total numeric:=0;
    v_cartons numeric;
    v_meters numeric;
    v_carton_price numeric;
    v_meter_price numeric;
    v_line numeric;
    v_increase numeric;
    v_type text;
BEGIN
    IF auth.uid() IS NULL OR (SELECT public.is_editor_v5()) THEN RETURN NEW; END IF;
    IF (SELECT private.current_profile_role()) <> 'AGENT' OR NEW.agent_id<>auth.uid() THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='لا تملك صلاحية إنشاء أو تعديل هذا الطلب';
    END IF;
    SELECT * INTO v_agent FROM public.agent_details WHERE id=auth.uid();
    IF NOT FOUND OR coalesce(v_agent.is_frozen,false) THEN RAISE EXCEPTION 'حساب الوكيل غير متاح لإرسال الطلبات'; END IF;
    IF TG_OP='INSERT' THEN
        IF NEW.production_status::text NOT IN ('PENDING_TRANSFER','PENDING_PAYMENT') OR coalesce(NEW.paid_amount,0)<>0
            OR coalesce(NEW.payment_history,'[]'::jsonb)<>'[]'::jsonb OR NEW.payment_status::text<>'PENDING'
            OR coalesce(NEW.discount_value,0)<>0 OR NEW.paid_at IS NOT NULL THEN
            RAISE EXCEPTION 'إنشاء الطلب لا يسجل دفعة أو خصماً أو تجهيزاً. الحساب من اختصاص الإدارة';
        END IF;
        NEW.created_at:=now();
    ELSE
        IF OLD.agent_id IS DISTINCT FROM NEW.agent_id OR OLD.paid_amount IS DISTINCT FROM NEW.paid_amount
            OR OLD.payment_history IS DISTINCT FROM NEW.payment_history OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
            OR OLD.production_status IS DISTINCT FROM NEW.production_status OR OLD.discount_value IS DISTINCT FROM NEW.discount_value
            OR OLD.discount_type IS DISTINCT FROM NEW.discount_type OR OLD.paid_at IS DISTINCT FROM NEW.paid_at
            OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
            RAISE EXCEPTION 'الوكيل لا يمكنه تغيير الدفعات أو الخصم أو حالة الطلب';
        END IF;
    END IF;
    IF jsonb_typeof(NEW.items) IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.items)=0 THEN RAISE EXCEPTION 'الطلب يجب أن يحتوي مادة واحدة على الأقل'; END IF;
    v_type:=CASE WHEN v_agent.agent_type::text='NORMAL' THEN 'عادي' ELSE v_agent.agent_type::text END;
    v_increase:=greatest(coalesce(v_agent.price_increase_percent,0),0);
    FOR v_item IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
        v_cartons:=coalesce((v_item->>'quantityCartons')::numeric,0);
        v_meters:=coalesce((v_item->>'quantityMeters')::numeric,0);
        IF v_cartons<0 OR v_meters<0 OR v_cartons+v_meters<=0 OR v_cartons::text IN ('NaN','Infinity','-Infinity') OR v_meters::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'كمية مادة الطلب غير صحيحة'; END IF;
        v_original:=NULL;
        IF TG_OP='UPDATE' THEN
            SELECT value INTO v_original FROM jsonb_array_elements(OLD.items)
            WHERE value->>'productId'=v_item->>'productId'
                AND coalesce(value->>'productSaleMode','CARTON')=coalesce(v_item->>'productSaleMode','CARTON')
                AND coalesce(value->>'productCode','')=coalesce(v_item->>'productCode','')
                AND (value->>'unitPriceCarton')::numeric=(v_item->>'unitPriceCarton')::numeric
                AND (value->>'unitPriceMeter')::numeric=(v_item->>'unitPriceMeter')::numeric LIMIT 1;
            IF v_original IS NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(OLD.items) x
                WHERE x->>'productId'=v_item->>'productId' AND coalesce(x->>'productCode','')=coalesce(v_item->>'productCode','')
                    AND coalesce(x->>'productSaleMode','CARTON')=coalesce(v_item->>'productSaleMode','CARTON')) THEN
                RAISE EXCEPTION 'لا يمكن للوكيل تغيير السعر المعتمد لمادة موجودة في الطلب';
            END IF;
        END IF;
        IF v_original IS NOT NULL THEN
            v_carton_price:=(v_original->>'unitPriceCarton')::numeric;
            v_meter_price:=(v_original->>'unitPriceMeter')::numeric;
        ELSIF coalesce((v_item->>'isSpecialRequest')::boolean,false) THEN
            v_carton_price:=0; v_meter_price:=0;
        ELSE
            SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'productId')::bigint;
            IF NOT FOUND OR v_product.is_active IS FALSE THEN RAISE EXCEPTION 'مادة الطلب غير متاحة'; END IF;
            v_carton_price:=greatest(coalesce((v_product.prices->v_type->>'pricePerCarton')::numeric,0),0);
            v_meter_price:=greatest(coalesce((v_product.prices->v_type->>'pricePerMeter')::numeric,0),0);
            IF v_increase>0 THEN
                v_carton_price:=round(v_carton_price*(1+v_increase/100),2);
                v_meter_price:=round(v_meter_price*(1+v_increase/100),2);
            END IF;
        END IF;
        IF (v_item->>'unitPriceCarton')::numeric IS DISTINCT FROM v_carton_price OR (v_item->>'unitPriceMeter')::numeric IS DISTINCT FROM v_meter_price THEN
            RAISE EXCEPTION 'أسعار المادة تغيّرت أو غير معتمدة. حدّث الكتالوج ثم حاول مجدداً';
        END IF;
        v_line:=round(v_cartons*v_carton_price+v_meters*v_meter_price,2);
        IF (v_item->>'totalPrice')::numeric IS DISTINCT FROM v_line THEN RAISE EXCEPTION 'مجموع مادة الطلب غير متطابق'; END IF;
        v_total:=v_total+v_line;
    END LOOP;
    IF NEW.sub_total_amount IS DISTINCT FROM v_total OR NEW.total_amount IS DISTINCT FROM round(v_total-
        CASE WHEN NEW.discount_type='PERCENT' THEN v_total*coalesce(NEW.discount_value,0)/100 ELSE coalesce(NEW.discount_value,0) END,2) THEN
        RAISE EXCEPTION 'مجموع الطلب والخصم غير متطابق';
    END IF;
    RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.validate_agent_order_finance() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_agent_order_finance BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.validate_agent_order_finance();
