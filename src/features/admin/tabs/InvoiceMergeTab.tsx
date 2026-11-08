import { getProductUnit, isUnitPricedProduct } from '../../../lib/productFamilies';
import React, { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    ClipboardList,
    FileSearch,
    FileStack,
    PackageCheck,
    Printer,
    Search,
    X,
} from 'lucide-react';

import { Badge, Button } from '../../../components/ui';
import { db } from '../../../lib/db';
import { Order, OrderItem, Product, ProductionStatus } from '../../../types';

type MergeFilter = 'COMPLETED' | 'NOT_COMPLETED';
type PrintMode = 'with-price' | 'no-price' | null;

interface InvoiceMergeTabProps {
    orders: Order[];
    products: Product[];
    onViewOrder: (order: Order) => void;
}

interface MergedInvoiceRef {
    orderId: number | string;
    agentName: string;
}

interface MergedAgentRef {
    agentId: number | string;
    agentName: string;
    quantityCartons: number;
    quantityMeters: number;
    totalMeters: number;
    invoiceIds: Array<number | string>;
}

interface MergedItem {
    key: string;
    productId: number | string;
    productCode: string;
    productDimensions: string;
    quantityCartons: number;
    quantityMeters: number;
    metersPerCarton: number;
    totalMeters: number;
    totalPrice: number;
    isAdhesive: boolean;
    unitLabel: string;
    productName?: string;
    paintColor?: string;
    isSpecialRequest?: boolean;
    specialRequestNote?: string;
    invoiceRefs: MergedInvoiceRef[];
    agentRefs: MergedAgentRef[];
}

const ORDER_BATCH_SIZE = 50;
const formatNumber = (value: number) => Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const formatMoney = (value: number) => `$${Math.round(value || 0).toLocaleString()}`;

const compareText = (a: string, b: string) => a.localeCompare(b, 'ar', { numeric: true, sensitivity: 'base' });

const parseDimensionNumbers = (dimensions?: string) => (
    dimensions || ''
).match(/\d+(?:[.,]\d+)?/g)?.map(value => Number(value.replace(',', '.'))).filter(Number.isFinite) || [];

const compareDimensions = (a: string, b: string) => {
    const aNumbers = parseDimensionNumbers(a);
    const bNumbers = parseDimensionNumbers(b);
    const length = Math.max(aNumbers.length, bNumbers.length);

    for (let i = 0; i < length; i += 1) {
        const aValue = aNumbers[i];
        const bValue = bNumbers[i];
        if (aValue === undefined) return -1;
        if (bValue === undefined) return 1;
        if (aValue !== bValue) return aValue - bValue;
    }

    return compareText(a, b);
};

const getItemKey = (item: OrderItem) => [
    item.productCode || '',
    item.productDimensions || '',
    item.paintColor?.trim() || '',
    item.isSpecialRequest ? item.specialRequestNote || 'SPECIAL' : 'STANDARD',
].join('|');

export const InvoiceMergeTab = ({ orders, products, onViewOrder }: InvoiceMergeTabProps) => {
    const [filter, setFilter] = useState<MergeFilter>('COMPLETED');
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [printMode, setPrintMode] = useState<PrintMode>(null);
    const [visibleOrderCount, setVisibleOrderCount] = useState(ORDER_BATCH_SIZE);
    const [showAgentColumn, setShowAgentColumn] = useState(true);
    const [showInvoiceColumn, setShowInvoiceColumn] = useState(true);

    const categoryByProductId = useMemo(() => {
        const map = new Map<string, { product: Product, type?: string }>();
        products.forEach(product => {
            const category = db.categories.find(c => c.name === product.category);
            map.set(String(product.id), { product, type: category?.type });
        });
        return map;
    }, [products]);

    const filteredOrders = useMemo(() => {
        const cleanQuery = query.trim().replace(/^#/, '');

        return [...orders]
            .filter(order => {
                const matchesFilter = filter === 'COMPLETED'
                    ? order.productionStatus === ProductionStatus.COMPLETED
                    : order.productionStatus !== ProductionStatus.COMPLETED;

                if (!matchesFilter) return false;
                if (!cleanQuery) return true;

                return String(order.id).includes(cleanQuery);
            })
            .sort((a, b) => Number(b.id) - Number(a.id));
    }, [orders, filter, query]);

    const displayedOrders = useMemo(() => (
        filteredOrders.slice(0, visibleOrderCount)
    ), [filteredOrders, visibleOrderCount]);

    const hasMoreOrders = displayedOrders.length < filteredOrders.length;

    const selectedOrders = useMemo(() => (
        orders
            .filter(order => selectedIds.has(String(order.id)))
            .sort((a, b) => Number(a.id) - Number(b.id))
    ), [orders, selectedIds]);

    const mergedItems = useMemo(() => {
        const map = new Map<string, MergedItem>();

        selectedOrders.forEach(order => {
            order.items.forEach(item => {
                const productInfo = categoryByProductId.get(String(item.productId));
                const product = productInfo?.product;
                const isAdhesive = isUnitPricedProduct(product, db.categories, item.productSaleMode) || !!item.productPaintType;
                const unitLabel = item.productPaintType ? 'سطلة' : getProductUnit(product, db.categories, item.productSaleMode);
                const metersPerCarton = isAdhesive ? 0 : Number(item.productMetersPerCarton ?? product?.metersPerCarton ?? 0);
                const totalMeters = isAdhesive ? 0 : ((Number(item.quantityCartons || 0) * metersPerCarton) + Number(item.quantityMeters || 0));
                const key = `${getItemKey(item)}|${unitLabel}|${metersPerCarton}`;
                const existing = map.get(key);
                const itemCartons = Number(item.quantityCartons || 0);
                const itemMeters = Number(item.quantityMeters || 0);

                if (existing) {
                    existing.quantityCartons += itemCartons;
                    existing.quantityMeters += itemMeters;
                    existing.totalMeters += totalMeters;
                    existing.totalPrice += Number(item.totalPrice || 0);

                    if (!existing.invoiceRefs.some(ref => String(ref.orderId) === String(order.id))) {
                        existing.invoiceRefs.push({ orderId: order.id, agentName: order.agentName });
                    }

                    const agentRef = existing.agentRefs.find(ref => String(ref.agentId) === String(order.agentId));
                    if (agentRef) {
                        agentRef.quantityCartons += itemCartons;
                        agentRef.quantityMeters += itemMeters;
                        agentRef.totalMeters += totalMeters;
                        if (!agentRef.invoiceIds.some(id => String(id) === String(order.id))) {
                            agentRef.invoiceIds.push(order.id);
                        }
                    } else {
                        existing.agentRefs.push({
                            agentId: order.agentId,
                            agentName: order.agentName,
                            quantityCartons: itemCartons,
                            quantityMeters: itemMeters,
                            totalMeters,
                            invoiceIds: [order.id],
                        });
                    }
                    return;
                }

                map.set(key, {
                    key,
                    productId: item.productId,
                    productCode: item.productCode,
                    productDimensions: item.productDimensions,
                    quantityCartons: itemCartons,
                    quantityMeters: itemMeters,
                    metersPerCarton,
                    totalMeters,
                    totalPrice: Number(item.totalPrice || 0),
                    isAdhesive,
                    unitLabel,
                    productName: item.productName || product?.name,
                    paintColor: item.paintColor,
                    isSpecialRequest: item.isSpecialRequest,
                    specialRequestNote: item.specialRequestNote,
                    invoiceRefs: [{ orderId: order.id, agentName: order.agentName }],
                    agentRefs: [{
                        agentId: order.agentId,
                        agentName: order.agentName,
                        quantityCartons: itemCartons,
                        quantityMeters: itemMeters,
                        totalMeters,
                        invoiceIds: [order.id],
                    }],
                });
            });
        });

        return Array.from(map.values()).sort((a, b) => {
            const codeCompare = compareText(a.productCode || '', b.productCode || '');
            if (codeCompare !== 0) return codeCompare;

            const dimensionCompare = compareDimensions(a.productDimensions || '', b.productDimensions || '');
            if (dimensionCompare !== 0) return dimensionCompare;

            return compareText(String(a.productId), String(b.productId));
        });
    }, [selectedOrders, categoryByProductId]);

    const summary = useMemo(() => ({
        invoices: selectedOrders.length,
        agents: new Set(selectedOrders.map(order => String(order.agentId))).size,
        cartons: mergedItems.reduce((sum, item) => sum + item.quantityCartons, 0),
        meters: mergedItems.reduce((sum, item) => sum + item.totalMeters, 0),
        total: mergedItems.reduce((sum, item) => sum + item.totalPrice, 0),
    }), [selectedOrders, mergedItems]);

    useEffect(() => {
        const clearPrintMode = () => setPrintMode(null);
        window.addEventListener('afterprint', clearPrintMode);
        return () => window.removeEventListener('afterprint', clearPrintMode);
    }, []);

    useEffect(() => {
        setVisibleOrderCount(ORDER_BATCH_SIZE);
    }, [filter, query]);

    const toggleOrder = (orderId: number | string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            const key = String(orderId);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const selectVisibleOrders = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            displayedOrders.forEach(order => next.add(String(order.id)));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const loadMoreOrders = () => {
        setVisibleOrderCount(prev => Math.min(prev + ORDER_BATCH_SIZE, filteredOrders.length));
    };

    const handleOrderListScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
        if (distanceFromBottom < 160 && hasMoreOrders) {
            loadMoreOrders();
        }
    };

    const exportPdf = (mode: Exclude<PrintMode, null>) => {
        if (selectedOrders.length === 0) return;
        setPrintMode(mode);
        window.setTimeout(() => window.print(), 80);
    };

    const selectedInvoiceLabel = selectedOrders.map(order => `#${order.id}`).join('، ');

    const renderMergedTable = (print = false) => {
        const noteColSpan = print && printMode === 'no-price'
            ? 7 + (showInvoiceColumn ? 1 : 0) + (showAgentColumn ? 1 : 0)
            : 9 + (showInvoiceColumn ? 1 : 0) + (showAgentColumn ? 1 : 0);
        const totalLabelColSpan = 3 + (showInvoiceColumn ? 1 : 0);

        return (
            <table className="w-full table-auto text-right border-collapse">
                <colgroup>
                    <col className="seq-col" style={{ width: '0.1%' }} />
                    {showInvoiceColumn && <col style={{ width: showAgentColumn ? '10%' : '12%' }} />}
                    <col style={{ width: showAgentColumn || showInvoiceColumn ? '9%' : '14%' }} />
                    <col style={{ width: showAgentColumn || showInvoiceColumn ? '10%' : '14%' }} />
                    <col style={{ width: showAgentColumn || showInvoiceColumn ? '7%' : '11%' }} />
                    <col style={{ width: showAgentColumn || showInvoiceColumn ? '6%' : '9%' }} />
                    <col style={{ width: showAgentColumn || showInvoiceColumn ? '7%' : '10%' }} />
                    <col style={{ width: showAgentColumn || showInvoiceColumn ? '7%' : '11%' }} />
                    <col className="price-col" style={{ width: showAgentColumn || showInvoiceColumn ? '7%' : '10%' }} />
                    <col className="price-col" style={{ width: showAgentColumn || showInvoiceColumn ? '10%' : '13%' }} />
                    {showAgentColumn && <col style={{ width: showInvoiceColumn ? '23%' : '27%' }} />}
                </colgroup>
                <thead className="bg-gray-50 print:bg-gray-100 border-b print:border-black">
                    <tr className="text-gray-500 print:text-black font-black text-[9px] uppercase leading-tight">
                        <th className="seq-cell px-1 py-0 print:px-1 print:py-0 text-center text-[7px] leading-none whitespace-nowrap">#</th>
                        {showInvoiceColumn && <th className="p-1.5 print:p-1">الفواتير</th>}
                        <th className="p-1.5 print:p-1">الكود</th>
                        <th className="p-1.5 print:p-1">القياس</th>
                        <th className="p-1.5 print:p-1 text-center">العدد / الوحدة</th>
                        <th className="p-1.5 print:p-1 text-center">أمتار</th>
                        <th className="p-1.5 print:p-1 text-center">متر/كارتون</th>
                        <th className="p-1.5 print:p-1 text-center">مجموع م</th>
                        <th className="p-1.5 print:p-1 text-center price-col">سعر</th>
                        <th className="p-1.5 print:p-1 text-center price-col">الإجمالي</th>
                        {showAgentColumn && <th className="p-1.5 print:p-1">الوكلاء</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-gray-400">
                    {mergedItems.map((item, index) => {
                        const unitPrice = item.isAdhesive
                            ? (item.quantityCartons > 0 ? item.totalPrice / item.quantityCartons : 0)
                            : (item.totalMeters > 0 ? item.totalPrice / item.totalMeters : 0);
                        const invoiceText = item.invoiceRefs.map(ref => `#${ref.orderId}`).join('، ');
                        const agentsText = item.agentRefs
                            .sort((a, b) => compareText(a.agentName, b.agentName))
                            .map(ref => {
                                const meterText = !item.isAdhesive && ref.quantityMeters > 0 ? ` + ${formatNumber(ref.quantityMeters)} م` : '';
                                const invoiceText = ref.invoiceIds.map(id => `#${id}`).join('، ');
                                return `${ref.agentName} (${formatNumber(ref.quantityCartons)} ${item.unitLabel}${meterText} - ${invoiceText})`;
                            })
                            .join('، ');

                        return (
                            <React.Fragment key={item.key}>
                                <tr className={`text-[11px] print:text-[9px] leading-tight ${item.isSpecialRequest ? 'bg-amber-50 print:bg-white' : ''}`}>
                                    <td className="seq-cell px-1 py-0 print:px-1 print:py-0 text-center font-mono text-[7px] leading-none font-bold text-gray-400 print:text-black border-l print:border-gray-300 whitespace-nowrap">{index + 1}</td>
                                    {showInvoiceColumn && <td className="p-1.5 print:p-1 font-mono font-black text-[#0e3c63] print:text-black break-words">{invoiceText}</td>}
                                    <td className="p-1.5 print:p-1 font-black text-gray-800 print:font-bold break-words">{item.productName || item.productCode}{item.paintColor && <p className="mt-1 text-[10px] font-bold whitespace-pre-line">الألوان: {item.paintColor}</p>}</td>
                                    <td className="p-1.5 print:p-1 text-gray-500 print:text-black break-words">{item.productDimensions}</td>
                                    <td className="p-1.5 print:p-1 text-center font-bold">{formatNumber(item.quantityCartons)} {item.unitLabel}</td>
                                    <td className="p-1.5 print:p-1 text-center font-mono">{item.isAdhesive || item.quantityMeters <= 0 ? '-' : formatNumber(item.quantityMeters)}</td>
                                    <td className="p-1.5 print:p-1 text-center font-mono">{item.isAdhesive ? '-' : formatNumber(item.metersPerCarton)}</td>
                                    <td className="p-1.5 print:p-1 text-center font-bold">{item.isAdhesive ? '-' : formatNumber(item.totalMeters)}</td>
                                    <td className="p-1.5 print:p-1 text-center font-mono price-col">{unitPrice > 0 ? `$${unitPrice % 1 === 0 ? unitPrice.toLocaleString() : unitPrice.toFixed(2)}` : '-'}</td>
                                    <td className="p-1.5 print:p-1 text-center font-mono font-black price-col">{formatMoney(item.totalPrice)}</td>
                                    {showAgentColumn && <td className="p-1.5 print:p-1 text-gray-600 print:text-black break-words">{agentsText}</td>}
                                </tr>
                                {item.isSpecialRequest && item.specialRequestNote && (
                                    <tr className="bg-amber-50/50 print:bg-white border-t border-amber-100 print:border-black">
                                        <td colSpan={noteColSpan} className="p-2 print:p-1 text-[10px] font-bold text-amber-800 print:text-black">
                                            طلب خاص: {item.specialRequestNote}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            <tfoot className="bg-gray-50 print:bg-white border-t-2 print:border-black">
                    <tr className="font-black text-[11px] print:text-[9px]">
                        <td colSpan={totalLabelColSpan} className="p-2 print:p-1 text-left text-gray-500 print:text-black">المجموع</td>
                        <td className="p-2 print:p-1 text-center font-mono">{formatNumber(summary.cartons)}</td>
                        <td className="p-2 print:p-1 text-center">-</td>
                        <td className="p-2 print:p-1 text-center">-</td>
                        <td className="p-2 print:p-1 text-center font-mono">{formatNumber(summary.meters)}</td>
                        <td className="p-2 print:p-1 price-col"></td>
                        <td className="p-2 print:p-1 text-center font-mono text-[#0e3c63] print:text-black price-col">{formatMoney(summary.total)}</td>
                        {showAgentColumn && <td className="p-2 print:p-1 text-gray-400 print:text-black">حسب كل مادة</td>}
                    </tr>
                </tfoot>
            </table>
        );
    };

    return (
        <div className="space-y-6">
            <style>{`
                .seq-col,
                .seq-cell {
                    width: 0.1% !important;
                    min-width: 0 !important;
                    white-space: nowrap !important;
                }

                @media print {
                    body * { visibility: hidden !important; }
                    #invoice-merge-print-root, #invoice-merge-print-root * { visibility: visible !important; }
                    #invoice-merge-print-root {
                        display: block !important;
                        position: absolute !important;
                        inset: 0 auto auto 0 !important;
                        width: 100% !important;
                        min-height: 100vh !important;
                        background: white !important;
                        color: black !important;
                        padding: 24px !important;
                        direction: rtl !important;
                    }
                    #invoice-merge-print-root.merge-no-price .price-col { display: none !important; }
                    #invoice-merge-print-root table { font-size: 10px !important; page-break-inside: auto; }
                    #invoice-merge-print-root .seq-col,
                    #invoice-merge-print-root .seq-cell {
                        width: 0.1% !important;
                        min-width: 0 !important;
                        white-space: nowrap !important;
                    }
                    #invoice-merge-print-root tr { page-break-inside: avoid; page-break-after: auto; }
                }
            `}</style>

            <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden print:hidden">
                <div className="bg-[#0e3c63] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                            <FileStack size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">دمج فواتير</h2>
                            <p className="text-blue-100 text-xs font-bold mt-1">كشف تجهيز موحد حسب الفواتير المختارة</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button disabled={selectedOrders.length === 0} onClick={() => exportPdf('no-price')} className="bg-amber-500 hover:bg-amber-600 text-white px-5 h-12 rounded-xl">
                            <Printer size={18} /> PDF بدون سعر
                        </Button>
                        <Button disabled={selectedOrders.length === 0} onClick={() => exportPdf('with-price')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 h-12 rounded-xl">
                            <Printer size={18} /> PDF بسعر
                        </Button>
                    </div>
                </div>

                <div className="p-5 sm:p-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">الفواتير</p>
                        <p className="text-2xl font-black text-gray-800 font-mono">{summary.invoices}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">الوكلاء</p>
                        <p className="text-2xl font-black text-gray-800 font-mono">{summary.agents}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">عدد الوحدات</p>
                        <p className="text-2xl font-black text-gray-800 font-mono">{formatNumber(summary.cartons)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">الأمتار</p>
                        <p className="text-2xl font-black text-gray-800 font-mono">{formatNumber(summary.meters)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-emerald-700">
                        <p className="text-[10px] font-black uppercase mb-1 opacity-70">الإجمالي</p>
                        <p className="text-2xl font-black font-mono">{formatMoney(summary.total)}</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:hidden">
                <section className="xl:col-span-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><FileSearch size={19} /> اختيار الفواتير</h3>
                            <Badge color="gray">{displayedOrders.length} / {filteredOrders.length} فاتورة</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-2xl p-1">
                            <button onClick={() => setFilter('COMPLETED')} className={`h-11 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${filter === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                                <CheckCircle2 size={15} /> تم تجهيز
                            </button>
                            <button onClick={() => setFilter('NOT_COMPLETED')} className={`h-11 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${filter === 'NOT_COMPLETED' ? 'bg-white text-[#0e3c63] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                                <ClipboardList size={15} /> غير تم تجهيز
                            </button>
                        </div>

                        <div className="relative">
                            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                placeholder="بحث برقم الفاتورة"
                                className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-2xl pr-11 pl-4 outline-none focus:border-[#0e3c63] text-sm font-bold"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={selectVisibleOrders} variant="secondary" className="flex-1 h-11 rounded-xl text-xs shadow-none">
                                اختيار المحملة
                            </Button>
                            <Button onClick={clearSelection} variant="ghost" className="h-11 rounded-xl text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                                <X size={16} /> مسح
                            </Button>
                        </div>
                    </div>

                    <div onScroll={handleOrderListScroll} className="max-h-[680px] overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {displayedOrders.map(order => {
                            const isSelected = selectedIds.has(String(order.id));
                            return (
                                <div key={order.id} className={`border rounded-2xl p-3 transition-all ${isSelected ? 'border-[#0e3c63] bg-blue-50/60 shadow-sm' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleOrder(order.id)}
                                            className="mt-1 w-5 h-5 accent-[#0e3c63]"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-mono font-black text-[#0e3c63]">#{order.id}</span>
                                                <span className="font-mono font-black text-gray-800">{formatMoney(order.totalAmount)}</span>
                                            </div>
                                            <p className="text-sm font-black text-gray-800 truncate mt-1">{order.agentName}</p>
                                            <div className="flex items-center justify-between gap-2 mt-2">
                                                <span className="text-[10px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleDateString('ar-IQ')}</span>
                                                <button type="button" onClick={(event) => { event.preventDefault(); onViewOrder(order); }} className="text-[10px] font-black text-blue-600 hover:text-blue-800">عرض الفاتورة</button>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            );
                        })}

                        {hasMoreOrders && (
                            <button onClick={loadMoreOrders} className="w-full h-12 rounded-2xl bg-gray-50 hover:bg-blue-50 text-[#0e3c63] text-xs font-black border border-gray-100 transition-all">
                                تحميل فواتير أكثر
                            </button>
                        )}

                        {filteredOrders.length === 0 && (
                            <div className="text-center py-16 text-gray-400">
                                <PackageCheck size={42} className="mx-auto mb-3 opacity-40" />
                                <p className="text-sm font-black">ماكو فواتير مطابقة</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="xl:col-span-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><PackageCheck size={19} /> مواد الفواتير المدمجة</h3>
                            <p className="text-xs font-bold text-gray-400 mt-1">{selectedInvoiceLabel || 'اختار فواتير حتى يظهر كشف التجهيز'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowInvoiceColumn(prev => !prev)}
                                className={`h-10 px-4 rounded-xl text-xs font-black border transition-all ${showInvoiceColumn ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                            >
                                {showInvoiceColumn ? 'إخفاء الفواتير' : 'إظهار الفواتير'}
                            </button>
                            <button
                                onClick={() => setShowAgentColumn(prev => !prev)}
                                className={`h-10 px-4 rounded-xl text-xs font-black border transition-all ${showAgentColumn ? 'bg-blue-50 text-[#0e3c63] border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                            >
                                {showAgentColumn ? 'إخفاء الوكلاء' : 'إظهار الوكلاء'}
                            </button>
                            <Badge color={mergedItems.length > 0 ? 'blue' : 'gray'}>{mergedItems.length} مادة</Badge>
                        </div>
                    </div>

                    {mergedItems.length > 0 ? (
                        <div className="overflow-hidden">
                            {renderMergedTable(false)}
                        </div>
                    ) : (
                        <div className="min-h-[420px] flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <FileStack size={56} className="mb-4 opacity-30" />
                            <h4 className="text-lg font-black text-gray-500 mb-1">بعد ما مختار فواتير</h4>
                            <p className="text-sm font-bold">اختار فاتورة أو أكثر من القائمة حتى ينزل مجموع موادها هنا.</p>
                        </div>
                    )}
                </section>
            </div>

            <div id="invoice-merge-print-root" className={`hidden ${printMode === 'no-price' ? 'merge-no-price' : ''}`}>
                {db.vehicleConfig.printHeaderUrl && (
                    <img src={db.vehicleConfig.printHeaderUrl} alt="Header" className="w-full h-auto mb-4" />
                )}
                <div className="border-b border-black pb-3 mb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black">كشف دمج فواتير</h1>
                            <p className="text-sm font-bold mt-1">{printMode === 'no-price' ? 'نسخة تجهيز بدون أسعار' : 'نسخة إدارة مع الأسعار'}</p>
                        </div>
                        <div className="text-left text-xs font-bold leading-6">
                            <p>التاريخ: {new Date().toLocaleDateString('ar-IQ')}</p>
                            <p>عدد الفواتير: {summary.invoices}</p>
                            <p>الفواتير: {selectedInvoiceLabel}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
                    <div className="border border-black p-2"><b>الوكلاء:</b> {summary.agents}</div>
                    <div className="border border-black p-2"><b>عدد الوحدات:</b> {formatNumber(summary.cartons)}</div>
                    <div className="border border-black p-2"><b>الأمتار:</b> {formatNumber(summary.meters)}</div>
                    <div className="border border-black p-2 price-col"><b>الإجمالي:</b> {formatMoney(summary.total)}</div>
                </div>
                {renderMergedTable(true)}
                {db.vehicleConfig.printFooterUrl && (
                    <img src={db.vehicleConfig.printFooterUrl} alt="Footer" className="w-full h-auto mt-4" />
                )}
            </div>
        </div>
    );
};
