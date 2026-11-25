// A movement owns specific invoice payments. Never infer ownership from an invoice number alone.
export type MovementMode = 'deposit' | 'withdraw' | 'settlement' | 'invoice';
type Allocation = { orderId: string | number; paymentId: string | number; amount: number };
export type PaymentDetails = { mode: MovementMode; note: string; allocations: Allocation[]; reversal?: { kind: 'order_charge_reversal'; transactionId: string | number; orderId: string | number } };
type Payment = { id: string | number; amountAdded: number; previousPaid?: number; newTotalPaid?: number; date: string; addedBy?: string; addedById?: string | number; note?: string };
export type MovementOrder = {
    id: string | number; agentId: string | number; totalAmount: number; paidAmount: number;
    paymentHistory: Payment[]; paymentStatus: string; createdAt: string; paidAt?: string | null;
};
export type AgentMovement = {
    id: string | number; agentId: string | number; amount: number; description: string;
    type: string; createdAt: string; locked?: boolean; linkedOrderId?: string | number | null;
    paymentDetails?: PaymentDetails | null;
};
const cents = (value: number) => Math.round(Number(value) * 100);
const money = (value: number) => value / 100;
const cleanDescription = (description: string) => description.split(' | بواسطة:')[0].split(' | عُدلت بواسطة:')[0];

export function getMovementMode(tx: AgentMovement): MovementMode {
    if (tx.paymentDetails) return tx.paymentDetails.mode;
    if (tx.description.startsWith('تسديد موحد ')) return 'settlement';
    if (tx.amount > 0 && (tx.linkedOrderId || /^(?:دفعة(?: إضافية)? للطلب|تسديد واصل لطلبية|تسديد دفعة للطلب|تسديد إضافي للطلب).*#/.test(tx.description))) return 'invoice';
    return tx.amount > 0 ? 'deposit' : 'withdraw';
}

export function getMovementNote(tx: AgentMovement) {
    if (tx.paymentDetails) return tx.paymentDetails.note;
    if (getMovementMode(tx) === 'settlement') return cleanDescription(tx.description).split(' | ملاحظة: ')[1] || '';
    if (getMovementMode(tx) === 'invoice') return cleanDescription(tx.description).split(' | ملاحظة: ')[1] || '';
    return cleanDescription(tx.description);
}

export function canCorrectMovement(tx: AgentMovement) {
    // Purchases and invoice price adjustments must still be edited from the invoice.
    return !tx.locked && !tx.paymentDetails?.reversal && !(tx.amount <= 0 && tx.linkedOrderId) && !/^(?:شراء طلبية|تعديل قيمة الطلب|تعديل دفعات الطلب).*#/.test(tx.description);
}

export function getMovementOrderIds(tx: AgentMovement): string[] {
    if (tx.paymentDetails?.reversal) return [String(tx.paymentDetails.reversal.orderId)];
    if (tx.paymentDetails?.allocations?.length) return [...new Set(tx.paymentDetails.allocations.map(a => String(a.orderId)))];
    if (tx.linkedOrderId != null) return [String(tx.linkedOrderId)];
    const description = String(tx.description || '');
    if (!/^(?:شراء طلبية|تعديل قيمة الطلب|تعديل دفعات الطلب|تسديد موحد|دفعة(?: إضافية)? للطلب|تسديد واصل لطلبية|تسديد دفعة للطلب|تسديد إضافي للطلب)/.test(description)) return [];
    return [...new Set([...description.split(' | ')[0].matchAll(/#(\d+)(?!\d)/g)].map(match => match[1]))];
}

const isPurchase = (tx: AgentMovement) => /^(?:شراء طلبية|تعديل قيمة الطلب).*#/.test(String(tx.description || ''));

export const isRecognizedOrder = (order: { productionStatus: string; paymentStatus?: string }) => order.productionStatus === 'COMPLETED' && order.paymentStatus !== 'CANCELLED';

export function isAgentCashMovement(tx: AgentMovement) {
    if (tx.paymentDetails?.reversal || isPurchase(tx)) return false;
    return (tx.type === 'DEPOSIT' && Number(tx.amount) > 0)
        || (Number(tx.amount) < 0 && String(tx.description || '').includes('ترجيع كاش فعلي للوكيل'));
}

export function ledgerFinancialTotals(entries: AgentMovement[]) {
    const received = money(entries.filter(isAgentCashMovement).reduce((sum, tx) => sum + cents(tx.amount), 0));
    const billed = money(-entries.filter(tx => isPurchase(tx) || tx.paymentDetails?.reversal?.kind === 'order_charge_reversal').reduce((sum, tx) => sum + cents(tx.amount), 0));
    const net = money(entries.reduce((sum, tx) => sum + cents(tx.amount), 0));
    return { received, billed, net };
}

export function outstandingAgentDebt(entries: AgentMovement[]) {
    const balances = new Map<string, number>();
    for (const tx of entries) balances.set(String(tx.agentId), (balances.get(String(tx.agentId)) || 0) + cents(tx.amount));
    return money([...balances.values()].reduce((total, balance) => total + Math.max(0, -balance), 0));
}

export function summarizeAgentLedger(entries: AgentMovement[], currentBalance: number) {
    const reversed = new Set<string>();
    const corrections = new Set<string>();
    for (const tx of entries) {
        const reversal = tx.paymentDetails?.reversal;
        if (reversal?.kind !== 'order_charge_reversal') continue;
        const source = entries.find(item => String(item.id) === String(reversal.transactionId) && String(item.agentId) === String(tx.agentId));
        if (!source || !isPurchase(source) || Number(source.amount) >= 0 || cents(tx.amount) !== -cents(source.amount)
            || !getMovementOrderIds(source).includes(String(reversal.orderId)) || reversed.has(String(source.id))) continue;
        reversed.add(String(source.id));
        corrections.add(String(tx.id));
    }
    const purchases = entries.filter(tx => isPurchase(tx) && !reversed.has(String(tx.id)));
    const debt = money(Math.max(0, -purchases.reduce((sum, tx) => sum + cents(tx.amount), 0)));
    const net = Number(currentBalance) || 0;
    return { debt, paid: ledgerFinancialTotals(entries).received, net,
        debtCount: purchases.filter(tx => Number(tx.amount) < 0).length,
        paidCount: entries.filter(isAgentCashMovement).length,
        totalCount: entries.length };
}

export function statementWithBalances<T extends AgentMovement>(entries: T[], currentBalance: number) {
    const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        || String(a.id).localeCompare(String(b.id), 'en', { numeric: true }));
    let running = cents(currentBalance) - entries.reduce((sum, tx) => sum + cents(tx.amount), 0);
    return sorted.map(tx => { running += cents(tx.amount); return { ...tx, amount: Number(tx.amount), balanceAfter: money(running) }; }).reverse();
}

function resolveAllocations(tx: AgentMovement, orders: MovementOrder[]): Allocation[] {
    if (tx.paymentDetails) return tx.paymentDetails.allocations;
    const mode = getMovementMode(tx);
    if (mode !== 'settlement' && mode !== 'invoice') return [];
    const expected = mode === 'settlement'
        ? [...cleanDescription(tx.description).split(' | ')[0].matchAll(/#([^\s]+) \(\$([\d,.]+)\)/g)].map(match => ({ orderId: match[1], amount: Number(match[2].replaceAll(',', '')) }))
        : [{ orderId: tx.linkedOrderId || tx.description.match(/#([^\s|]+)/)?.[1], amount: Number(tx.amount) }];
    if (!expected.length && !tx.description.includes('لا توجد فواتير مفتوحة')) {
        throw new Error('تعذر تحديد فواتير الحركة القديمة. راجع سجل دفعات الفاتورة قبل التصحيح.');
    }
    return expected.map(allocation => {
        const order = orders.find(order => String(order.id) === String(allocation.orderId));
        const distance = (payment: Payment) => Math.abs(new Date(payment.date).getTime() - new Date(tx.createdAt).getTime());
        const candidates = (order?.paymentHistory || []).filter(payment =>
            cents(payment.amountAdded) === cents(allocation.amount) &&
            distance(payment) <= 120_000
        ).sort((a, b) => distance(a) - distance(b));
        // Old unified payments were logged immediately after their invoice updates.
        // Distinguish successive equal amounts only when one match is close and clearly separated.
        const closeMatchWindow = 10_000;
        const isolatedCloseMatch = candidates.length > 1 && distance(candidates[0]) <= closeMatchWindow
            && distance(candidates[1]) - distance(candidates[0]) > closeMatchWindow;
        if (candidates.length !== 1 && !isolatedCloseMatch) throw new Error('تعذر ربط الحركة القديمة بدفعتها بشكل مؤكد. راجع سجل دفعات الفاتورة قبل التصحيح.');
        return { orderId: order!.id, paymentId: candidates[0].id, amount: allocation.amount };
    });
}

export function movementOwnsPayment(tx: AgentMovement, order: MovementOrder, paymentId: string | number, orders: MovementOrder[] = [order]) {
    if (String(tx.agentId) !== String(order.agentId) || !canCorrectMovement(tx)) return false;
    try {
        return resolveAllocations(tx, orders).some(a => String(a.orderId) === String(order.id) && String(a.paymentId) === String(paymentId));
    } catch { return false; } // Ambiguous legacy records must be reviewed from the full statement.
}

export function planAgentMovement(input: {
    agentId: string | number; transaction?: AgentMovement; orders: MovementOrder[];
    amount?: number; mode?: MovementMode; note?: string; remove?: boolean; orderId?: string | number;
    user: { id: string | number; fullName: string }; now: string; paymentId: () => string | number;
}) {
    const { transaction: tx, user, now } = input;
    if (tx && (String(tx.agentId) !== String(input.agentId) || !canCorrectMovement(tx))) throw new Error('هذه الحركة مقفلة أو مرتبطة بقيمة فاتورة');
    const mode = tx ? getMovementMode(tx) : input.mode || 'deposit';
    const amount = input.remove ? 0 : Number(input.amount);
    if (!input.remove && (!Number.isFinite(amount) || cents(amount) === 0 || (mode === 'withdraw' ? amount >= 0 : amount <= 0))) throw new Error('مبلغ الحركة غير صحيح');
    const owned = tx ? resolveAllocations(tx, input.orders) : [];
    const working = input.orders.filter(order => String(order.agentId) === String(input.agentId)).map(order => ({ ...order, paymentHistory: order.paymentHistory.map(payment => ({ ...payment })) }));
    const changed = new Set<string>();
    const preserveDistribution = tx && !input.remove && cents(amount) === cents(tx.amount);
    for (const allocation of owned) {
        const order = working.find(order => String(order.id) === String(allocation.orderId));
        const payment = order?.paymentHistory.find(payment => String(payment.id) === String(allocation.paymentId));
        if (!order || !payment || cents(payment.amountAdded) !== cents(allocation.amount)) throw new Error('تغيّرت دفعات هذه الحركة. حدّث الصفحة ثم حاول مجدداً.');
        if (preserveDistribution) continue;
        order.paymentHistory = order.paymentHistory.filter(item => item !== payment);
        order.paidAmount = money(cents(order.paidAmount) - cents(allocation.amount));
        if (order.paidAmount < 0) throw new Error('رصيد دفعات الفاتورة غير متطابق');
        changed.add(String(order.id));
    }
    const allocations: Allocation[] = preserveDistribution ? [...owned] : [];
    let remaining = cents(amount) - allocations.reduce((sum, item) => sum + cents(item.amount), 0);
    const addPayment = (order: MovementOrder, value: number) => {
        const previous = owned.find(allocation => String(allocation.orderId) === String(order.id));
        const originalPayment = previous && input.orders.find(item => String(item.id) === String(order.id))?.paymentHistory.find(payment => String(payment.id) === String(previous.paymentId));
        const payment = originalPayment ? { ...originalPayment, amountAdded: money(value) } : {
            id: input.paymentId(), amountAdded: money(value), date: now, addedBy: user.fullName, addedById: user.id, note: 'تسديد من كشف حساب الوكيل'
        };
        order.paymentHistory.push(payment);
        order.paymentHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        order.paidAmount = money(cents(order.paidAmount) + value);
        allocations.push({ orderId: order.id, paymentId: payment.id, amount: money(value) });
        changed.add(String(order.id));
        remaining -= value;
    };
    if (!input.remove && !preserveDistribution && mode === 'invoice') {
        const order = working.find(order => String(order.id) === String(tx ? owned[0]?.orderId : input.orderId));
        if (!order || order.paymentStatus === 'CANCELLED' || remaining > cents(order.totalAmount) - cents(order.paidAmount)) throw new Error('الفاتورة غير متاحة أو مبلغ الدفعة أكبر من المتبقي على الفاتورة');
        addPayment(order, remaining);
    }
    if (!input.remove && !preserveDistribution && mode === 'settlement') {
        const oldest = [...working].filter(order => order.paymentStatus !== 'CANCELLED').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || String(a.id).localeCompare(String(b.id), 'en', { numeric: true }));
        for (const order of oldest) {
            if (remaining <= 0) break;
            const debt = cents(order.totalAmount) - cents(order.paidAmount);
            if (debt > 0) addPayment(order, Math.min(remaining, debt));
        }
    }
    const note = input.note?.trim() || '';
    const details: PaymentDetails = { mode, note, allocations };
    let description = note || (mode === 'withdraw' ? 'سحب رصيد' : 'إيداع رصيد');
    if (mode === 'settlement') {
        const distribution = allocations.length ? `توزعت على ${allocations.length} فاتورة: ${allocations.map(item => `#${item.orderId} ($${item.amount.toLocaleString('en-US')})`).join('، ')}` : 'لا توجد فواتير مفتوحة';
        description = `تسديد موحد $${amount.toLocaleString('en-US')} - ${distribution}${remaining > 0 ? ` | رصيد مقدم: $${money(remaining).toLocaleString('en-US')}` : ''}${note ? ` | ملاحظة: ${note}` : ''}`;
    } else if (mode === 'invoice') description = `دفعة للطلب #${allocations[0]?.orderId}${note ? ` | ملاحظة: ${note}` : ''}`;
    const creator = tx?.description.match(/\| بواسطة: (.*?)(?: \| عُدلت|$)/)?.[1];
    description += tx ? `${creator ? ` | بواسطة: ${creator}` : ''} | عُدلت بواسطة: ${user.fullName}` : ` | بواسطة: ${user.fullName}`;
    return {
        balanceDelta: money(cents(amount) - cents(tx?.amount || 0)),
        next: input.remove ? null : { amount: money(cents(amount)), type: tx?.type || (amount > 0 ? 'DEPOSIT' : 'ADJUSTMENT'), description, payment_details: details },
        orderChanges: working.filter(order => changed.has(String(order.id))).map(order => {
            const original = input.orders.find(item => String(item.id) === String(order.id))!;
            // Some old invoices have an opening payment outside their history. Preserve it.
            let running = cents(original.paidAmount) - original.paymentHistory.reduce((sum, payment) => sum + cents(payment.amountAdded), 0);
            if (running < 0) throw new Error('مجموع سجل دفعات الفاتورة لا يطابق المبلغ الواصل. راجع الفاتورة قبل التصحيح.');
            const history = order.paymentHistory.map(payment => {
                const previousPaid = money(running);
                running += cents(payment.amountAdded);
                return { ...payment, previousPaid, newTotalPaid: money(running) };
            });
            return {
                id: order.id,
                expected: { paid_amount: original.paidAmount, total_amount: original.totalAmount, payment_history: original.paymentHistory, payment_status: original.paymentStatus, paid_at: original.paidAt || null },
                paid_amount: order.paidAmount, payment_history: history
            };
        })
    };
}
