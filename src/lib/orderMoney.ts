const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

export const calculateLineTotal = (quantity: number, unitPrice: number, meters = 0, meterPrice = 0) =>
    roundMoney(quantity * unitPrice + meters * meterPrice);

export const calculateOrderTotals = (
    items: ReadonlyArray<{ totalPrice: number }>,
    discountValue = 0,
    discountType = 'FIXED'
) => {
    const subTotal = items.reduce((cents, item) => cents + Math.round((item.totalPrice + Number.EPSILON) * 100), 0) / 100;
    const discount = discountType === 'PERCENT' ? subTotal * discountValue / 100 : discountValue;
    return { subTotal, total: roundMoney(subTotal - discount) };
};
