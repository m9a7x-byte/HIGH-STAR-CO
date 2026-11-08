import type { Category, Product, ProductSaleMode } from '../types';

export type ProductFamily = 'STYROFOAM' | 'ADHESIVE' | 'PAINT';
export const PAINT_CATEGORY = 'paints';
export const getProductFamily = (product: Pick<Product, 'category'> | undefined, categories: Category[]): ProductFamily =>
    categories.find(category => category.name === product?.category)?.type || ([PAINT_CATEGORY, 'أصباغ'].includes(product?.category || '') ? 'PAINT' : 'STYROFOAM');
export const getProductName = (product: Pick<Product, 'name' | 'code'> | undefined) => product?.name || product?.code || '';
export const isPieceProduct = (product: Pick<Product, 'saleMode'> | undefined, mode?: ProductSaleMode) => (mode ?? product?.saleMode) === 'PIECE';
export const normalizePaintColor = (value: unknown): string | undefined => {
    if (value == null || value === '') return undefined;
    if (typeof value !== 'string' || value.length > 500) throw new Error('الألوان يجب أن تكون نصاً لا يتجاوز 500 حرف');
    return value.trim() || undefined;
};
export const snapshotProductUnits = (product: Product | undefined) => ({
    productSaleMode: product?.saleMode ?? 'CARTON' as ProductSaleMode,
    productMetersPerCarton: isPieceProduct(product) ? 0 : product?.metersPerCarton ?? 0
});
export const getProductUnit = (product: Pick<Product, 'category' | 'saleMode'> | undefined, categories: Category[], mode?: ProductSaleMode) => {
    const family = getProductFamily(product, categories);
    return family === 'PAINT' ? 'سطلة' : family === 'ADHESIVE' ? 'كيس' : isPieceProduct(product, mode) ? 'قطعة' : 'كارتون';
};
export const isUnitPricedProduct = (product: Pick<Product, 'category' | 'saleMode'> | undefined, categories: Category[], mode?: ProductSaleMode) =>
    getProductFamily(product, categories) !== 'STYROFOAM' || isPieceProduct(product, mode);

export const validateProductQuantities = (product: Product, categories: Category[], count: number, meters: number, mode?: ProductSaleMode) => {
    if (![count, meters].every(value => Number.isFinite(value) && value >= 0)) throw new Error('الكمية يجب أن تكون رقماً غير سالب');
    if (isUnitPricedProduct(product, categories, mode) && meters !== 0) throw new Error('المنتج يباع بالعدد فقط ولا يقبل أمتاراً منفردة');
    if (isPieceProduct(product, mode) && !Number.isInteger(count)) throw new Error('عدد القطع يجب أن يكون عدداً صحيحاً');
};

export const getCatalogCartCounts = (cart: Record<string, { c?: number; m?: number; isSpecial?: boolean; productSaleMode?: ProductSaleMode; productMetersPerCarton?: number }>, products: Product[], categories: Category[]) => {
    const counts = { totalCartons: 0, totalBags: 0, totalBuckets: 0, totalPieces: 0 };
    for (const [id, quantity] of Object.entries(cart)) {
        if (Number(id) < 0 || quantity.isSpecial) { counts.totalCartons += quantity.c || 0; continue; }
        const product = products.find(item => String(item.id) === id);
        if (!product) continue;
        const family = getProductFamily(product, categories);
        if (family === 'PAINT') counts.totalBuckets += quantity.c || 0;
        else if (family === 'ADHESIVE') counts.totalBags += quantity.c || 0;
        else if (isPieceProduct(product, quantity.productSaleMode)) counts.totalPieces += quantity.c || 0;
        else counts.totalCartons += (quantity.c || 0) + (quantity.m || 0) / ((quantity.productMetersPerCarton ?? product.metersPerCarton) || 1);
    }
    return counts;
};
