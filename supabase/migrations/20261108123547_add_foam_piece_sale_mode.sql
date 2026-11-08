alter table public.products
  add column sale_mode text not null default 'CARTON',
  add constraint products_sale_mode_check check (sale_mode in ('CARTON','PIECE')),
  add constraint products_piece_units_check check (sale_mode <> 'PIECE' or
    (meters_per_carton = 0 and coalesce((prices->'عادي'->>'pricePerMeter')::numeric,0) = 0
    and coalesce((prices->'VIP'->>'pricePerMeter')::numeric,0) = 0));

create function private.capture_order_product_units()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare line jsonb; previous_line jsonb; product_row public.products%rowtype;
  captured jsonb := '[]'::jsonb; mode text; pack_meters numeric; units numeric; meters numeric;
begin
  if pg_catalog.jsonb_typeof(new.items) <> 'array' then raise exception 'Order items must be an array'; end if;
  for line in select value from pg_catalog.jsonb_array_elements(new.items) loop
    if coalesce((line->>'isSpecialRequest')::boolean,false) or coalesce(line->>'productId','') !~ '^[0-9]+$' then
      captured := captured || pg_catalog.jsonb_build_array(line); continue;
    end if;
    select * into product_row from public.products where id=(line->>'productId')::bigint;
    if not found then
      captured := captured || pg_catalog.jsonb_build_array(line); continue;
    end if;
    previous_line := null;
    if tg_op = 'UPDATE' then
      select value into previous_line from pg_catalog.jsonb_array_elements(old.items)
      where value->>'productId' = line->>'productId'
        and (not (line ? 'productSaleMode') or value->>'productSaleMode' = line->>'productSaleMode')
      order by (value->>'id' = line->>'id') desc nulls last limit 1;
    end if;
    mode := coalesce(previous_line->>'productSaleMode',product_row.sale_mode);
    pack_meters := case when mode='PIECE' then 0 else coalesce((previous_line->>'productMetersPerCarton')::numeric,product_row.meters_per_carton,0) end;
    units := coalesce((line->>'quantityCartons')::numeric,0);
    meters := coalesce((line->>'quantityMeters')::numeric,0);
    if mode='PIECE' and (units < 0 or units <> pg_catalog.trunc(units) or meters <> 0
      or coalesce((line->>'unitPriceMeter')::numeric,0) <> 0) then
      raise exception 'Piece products require a whole piece count and cannot contain meter quantities or meter prices';
    end if;
    line := line || pg_catalog.jsonb_build_object('productSaleMode',mode,'productMetersPerCarton',pack_meters);
    captured := captured || pg_catalog.jsonb_build_array(line);
  end loop;
  new.items := captured;
  return new;
end $$;
revoke all on function private.capture_order_product_units() from public, anon, authenticated;
create trigger capture_order_product_units before insert or update of items on public.orders
for each row execute function private.capture_order_product_units();

-- Capture existing orders before any catalog products are switched to PIECE.
update public.orders o set items=(select pg_catalog.jsonb_agg(
  case when p.id is null or coalesce((i.line->>'isSpecialRequest')::boolean,false) then i.line
    else i.line || pg_catalog.jsonb_build_object('productSaleMode',coalesce(i.line->>'productSaleMode','CARTON'),
      'productMetersPerCarton',coalesce((i.line->>'productMetersPerCarton')::numeric,p.meters_per_carton,0)) end order by i.ordinality)
  from pg_catalog.jsonb_array_elements(o.items) with ordinality as i(line,ordinality)
  left join public.products p on p.id::text=i.line->>'productId')
where pg_catalog.jsonb_array_length(o.items)>0;
