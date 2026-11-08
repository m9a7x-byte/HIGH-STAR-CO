export const sortOrderItemsByProductCode = <T extends { productCode?: string }>(items: T[]): T[] => {
    return items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const codeCompare = (a.item.productCode || '').localeCompare(b.item.productCode || '', 'ar');
            return codeCompare !== 0 ? codeCompare : a.index - b.index;
        })
        .map(({ item }) => item);
};
