SET lock_timeout='5s';
ALTER TABLE public.categories DROP CONSTRAINT categories_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check CHECK (type IN ('STYROFOAM','ADHESIVE','PAINT'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS paint_type text;
INSERT INTO public.categories(name,type) SELECT 'أصباغ','PAINT' WHERE NOT EXISTS(SELECT 1 FROM public.categories WHERE name='أصباغ');
WITH seed(code,name,paint_type,dimensions,price) AS (VALUES
('PAINT-001','ستار برايمر','مائي','18 لتر',32.74::numeric),
('PAINT-002','بيورا برايمر','مائي','18 لتر',35.71::numeric),
('PAINT-003','فليكس بلاستك داخلي','مائي','18 لتر',26.79::numeric),
('PAINT-004','فليكس بلاستك خارجي','مائي','18 لتر',31.55::numeric),
('PAINT-005','ستار سوبر بلس','مائي','18 لتر',38.69::numeric),
('PAINT-006','ستار جارد خارجي','مائي','18 لتر',46.43::numeric),
('PAINT-007','ستار مطفي','مائي','18 لتر',32.74::numeric),
('PAINT-008','بيوراه مطفي داخلي','مائي','18 لتر',50.60::numeric),
('PAINT-009','بيورا مطفي خارجي','مائي','18 لتر',62.50::numeric),
('PAINT-010','بيورا نصف لمعة','مائي','18 لتر',74.40::numeric),
('PAINT-011','فيلر متعدد الاستخدامات','معجون تصليح','كالون',10.71::numeric),
('PAINT-012','فيلر متعدد الاستخدامات','معجون تصليح','20 كغم',29.76::numeric),
('PAINT-013','روف جارد بلس','وتر ستوب عازل مائي + عازل حراري','20 كغم',53.57::numeric),
('PAINT-014','دهني أساس سلقون','زنجاري','كالون',10.12::numeric),
('PAINT-015','دهني فينر لماع','صبغ','كالون',19.05::numeric),
('PAINT-016','المنيوم مقاوم للحرارة','صبغ حراري','كالون',71.43::numeric)
)
INSERT INTO public.products(code,name,paint_type,category,dimensions,image_url,meters_per_carton,volume_per_carton,is_active,prices)
SELECT code,name,paint_type,'أصباغ',dimensions,'',1,1,true,
jsonb_build_object('عادي',jsonb_build_object('pricePerMeter',0,'pricePerCarton',price),'VIP',jsonb_build_object('pricePerMeter',0,'pricePerCarton',price))
FROM seed WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.code=seed.code AND p.category='أصباغ');
NOTIFY pgrst,'reload schema';
