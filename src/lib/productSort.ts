import { AgentType, Product } from '../types';

export type ProductSortMode = 'ALPHA_ASC' | 'ALPHA_DESC' | 'PRICE_ASC' | 'PRICE_DESC';

const compareText = (a: string, b: string) => {
    return a.localeCompare(b, 'ar', { numeric: true, sensitivity: 'base' });
};

const parseDimensionNumbers = (dimensions?: string) => {
    return (dimensions || '')
        .match(/\d+(?:[.,]\d+)?/g)
        ?.map(value => Number(value.replace(',', '.')))
        .filter(value => Number.isFinite(value)) || [];
};

const compareDimensions = (a: Product, b: Product) => {
    const aNumbers = parseDimensionNumbers(a.dimensions);
    const bNumbers = parseDimensionNumbers(b.dimensions);
    const length = Math.max(aNumbers.length, bNumbers.length);

    for (let i = 0; i < length; i += 1) {
        const aValue = aNumbers[i];
        const bValue = bNumbers[i];
        if (aValue === undefined) return -1;
        if (bValue === undefined) return 1;
        if (aValue !== bValue) return aValue - bValue;
    }

    return compareText(a.dimensions || '', b.dimensions || '');
};

export const compareProductsAlphabetically = (a: Product, b: Product) => {
    const codeCompare = compareText(a.code || '', b.code || '');
    if (codeCompare !== 0) return codeCompare;

    const dimensionCompare = compareDimensions(a, b);
    if (dimensionCompare !== 0) return dimensionCompare;

    return compareText(String(a.id), String(b.id));
};

const getProductPrice = (product: Product, agentType: AgentType) => {
    const prices = product.prices?.[agentType] || product.prices?.[AgentType.NORMAL] || product.prices?.[AgentType.VIP];
    return Number(prices?.pricePerCarton || 0);
};

export const sortProductsForCatalog = (
    products: Product[],
    mode: ProductSortMode,
    agentType: AgentType
) => {
    return [...products].sort((a, b) => {
        const alphaCompare = compareProductsAlphabetically(a, b);

        if (mode === 'ALPHA_DESC') return -alphaCompare;

        if (mode === 'PRICE_ASC' || mode === 'PRICE_DESC') {
            const priceCompare = getProductPrice(a, agentType) - getProductPrice(b, agentType);
            if (priceCompare !== 0) return mode === 'PRICE_ASC' ? priceCompare : -priceCompare;
        }

        return alphaCompare;
    });
};
