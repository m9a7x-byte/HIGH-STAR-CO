begin;
do $test$
declare agent uuid; admin uuid; piece_id bigint; carton_id bigint; paint_id bigint; before_pack numeric; saved jsonb; blocked boolean;
begin
  select id into agent from public.profiles where role='AGENT' and deleted_at is null and coalesce(status,'active')='active' limit 1;
  select id into admin from public.profiles where role in ('ADMIN','SUPER_ADMIN') and deleted_at is null and coalesce(status,'active')='active' limit 1;
  select id into strict piece_id from public.products where code='TL-15-B' and dimensions='80 سم';
  select id,meters_per_carton into strict carton_id,before_pack from public.products where code='PAN-00';
  select id into strict paint_id from public.products where code='PAINT-001';
  update public.products set sale_mode='PIECE',meters_per_carton=0,
    prices='{"عادي":{"pricePerMeter":0,"pricePerCarton":6},"VIP":{"pricePerMeter":0,"pricePerCarton":6}}'::jsonb where id=piece_id;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',agent,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  insert into public.orders(id,agent_id,agent_name,items,sub_total_amount,total_amount)
  values(-2147483000,agent,'ROLLBACK unit test',jsonb_build_array(jsonb_build_object('id',1,'productId',piece_id,'productCode','TL-15-B',
    'productDimensions','80 سم','productSaleMode','CARTON','productMetersPerCarton',999,
    'quantityCartons',7,'quantityMeters',0,'unitPriceMeter',0,'unitPriceCarton',6,'totalPrice',42)),42,42)
  returning items->0 into saved;
  if saved->>'productSaleMode'<>'PIECE' or (saved->>'productMetersPerCarton')::numeric<>0 then raise exception 'Agent insert did not capture authoritative piece units'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated')::text,true);
  blocked:=false;
  begin
    update public.orders set items=jsonb_set(items,'{0,quantityCartons}','0.5'::jsonb) where id=-2147483000;
  exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Fractional pieces were accepted'; end if;
  blocked:=false;
  begin
    update public.orders set items=jsonb_set(items,'{0,quantityMeters}','2'::jsonb) where id=-2147483000;
  exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Meter quantities were accepted for pieces'; end if;
  update public.products set sale_mode='CARTON',meters_per_carton=9 where id=piece_id;
  update public.orders set items=jsonb_set(items,'{0,quantityCartons}','8'::jsonb) where id=-2147483000 returning items->0 into saved;
  if saved->>'productSaleMode'<>'PIECE' or (saved->>'productMetersPerCarton')::numeric<>0 then raise exception 'Existing piece order changed units with catalog'; end if;
  insert into public.orders(id,agent_id,agent_name,items)
  values(-2147483001,agent,'ROLLBACK carton test',jsonb_build_array(jsonb_build_object('id',2,'productId',carton_id,
    'quantityCartons',2,'quantityMeters',4,'unitPriceMeter',2,'unitPriceCarton',16,'totalPrice',40))) returning items->0 into saved;
  if saved->>'productSaleMode'<>'CARTON' or (saved->>'productMetersPerCarton')::numeric<>before_pack then raise exception 'Carton snapshot missing'; end if;
  update public.products set meters_per_carton=before_pack+1 where id=carton_id;
  update public.orders set items=jsonb_set(items,'{0,totalPrice}','41'::jsonb) where id=-2147483001 returning items->0 into saved;
  if (saved->>'productMetersPerCarton')::numeric<>before_pack then raise exception 'Carton history followed live product quantity'; end if;
  insert into public.orders(id,agent_id,agent_name,items)
  values(-2147483002,agent,'ROLLBACK paint color test',jsonb_build_array(jsonb_build_object('id',3,'productId',paint_id,
    'paintColor',E'أبيض، بيج\nأزرق فاتح','quantityCartons',1,'quantityMeters',0,'unitPriceMeter',0,'unitPriceCarton',32.74,'totalPrice',32.74))) returning items->0 into saved;
  if saved->>'paintColor'<>E'أبيض، بيج\nأزرق فاتح' then raise exception 'Paint color text was lost on insert'; end if;
  update public.orders set items=jsonb_set(items,'{0,quantityCartons}','2'::jsonb) where id=-2147483002 returning items->0 into saved;
  if saved->>'paintColor'<>E'أبيض، بيج\nأزرق فاتح' then raise exception 'Paint color text was lost on update'; end if;
end $test$;
rollback;
select 'piece snapshots, integer piece counts, agent insert access and historical carton meters verified; all test writes rolled back' as result;
