import type { Category, Product } from '../types';

export type ProductFamily = 'STYROFOAM' | 'ADHESIVE' | 'PAINT';
export const PAINT_CATEGORY = 'paints';
export const getProductFamily = (product: Pick<Product, 'category'> | undefined, categories: Category[]): ProductFamily =>
    categories.find(category => category.name === product?.category)?.type || ([PAINT_CATEGORY, 'أصباغ'].includes(product?.category || '') ? 'PAINT' : 'STYROFOAM');
export const getProductName = (product: Pick<Product, 'name' | 'code'> | undefined) => product?.name || product?.code || '';
export const getProductUnit = (product: Pick<Product, 'category'> | undefined, categories: Category[]) => {
    const family = getProductFamily(product, categories);
    return family === 'PAINT' ? 'سطلة' : family === 'ADHESIVE' ? 'كيس' : 'كارتون';
};
export const isUnitPricedProduct = (product: Pick<Product, 'category'> | undefined, categories: Category[]) =>
    getProductFamily(product, categories) !== 'STYROFOAM';

export const getCatalogCartCounts = (cart: Record<string, { c?: number; m?: number; isSpecial?: boolean }>, products: Product[], categories: Category[]) => {
    const counts = { totalCartons: 0, totalBags: 0, totalBuckets: 0 };
    for (const [id, quantity] of Object.entries(cart)) {
        if (Number(id) < 0 || quantity.isSpecial) { counts.totalCartons += quantity.c || 0; continue; }
        const product = products.find(item => String(item.id) === id);
        if (!product) continue;
        const family = getProductFamily(product, categories);
        if (family === 'PAINT') counts.totalBuckets += quantity.c || 0;
        else if (family === 'ADHESIVE') counts.totalBags += quantity.c || 0;
        else counts.totalCartons += (quantity.c || 0) + (quantity.m || 0) / (product.metersPerCarton || 1);
    }
    return counts;
};
