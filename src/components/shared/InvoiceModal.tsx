import { getProductUnit, isUnitPricedProduct } from '../../lib/productFamilies';
import { useTranslation } from 'react-i18next';

import React, { useState, useEffect } from 'react';
import { Package, X, Printer, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '../ui';
import { Order } from '../../types';
import { db } from '../../lib/db';
import { sortOrderItemsByProductCode } from '../../lib/orderItems';
import { createPortal, flushSync } from 'react-dom';

interface InvoiceModalProps {
    order: Order;
    onClose: () => void;
    onNavigateToOrder?: (orderId: number) => void;
    allowPrint?: boolean;
    respectPrintSetting?: boolean;
}

export const InvoiceModal = ({ order, onClose, allowPrint = true, respectPrintSetting = true }: InvoiceModalProps) => {
    const { t } = useTranslation();

    const systemConfigs = db.vehicleConfig;

    const [printMode, setPrintMode] = useState<'normal' | 'no-price'>('normal');
    const canShowPrintButtons = allowPrint && (!respectPrintSetting || systemConfigs.enablePrint);

    useEffect(() => {
        const resetPrintMode = () => setPrintMode('normal');
        window.addEventListener('afterprint', resetPrintMode);
        return () => window.removeEventListener('afterprint', resetPrintMode);
    }, []);

    const handlePrint = (mode: 'normal' | 'no-price' = 'normal') => {
        flushSync(() => setPrintMode(mode));
        window.print();
    };

    if (!order) return null;

    return createPortal(
        <>
            <style>
                {`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm 10mm;
                    }
                    html, body {
                        width: auto !important;
                        height: auto !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                    }
                    body > :not(#invoice-modal):not(style) { display: none !important; }
                    #invoice-modal, #invoice-modal * {
                        visibility: visible;
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    #invoice-modal,
                    #invoice-modal > .invoice-dialog,
                    #invoice-modal .print-content-wrapper {
                        position: static !important;
                        display: block !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        border-radius: 0 !important;
                        background: white !important;
                        box-shadow: none !important;
                        transform: none !important;
                        backdrop-filter: none !important;
                        animation: none !important;
                    }
                    #invoice-modal .print-header-container,
                    #invoice-modal .print-footer-container {
                        position: static;
                        width: 100%;
                        break-inside: avoid;
                    }
                    #invoice-modal .print-header-container { margin-bottom: 4mm; }
                    #invoice-modal .print-footer-container { margin-top: 4mm; }
                    #invoice-modal .print-header-container img,
                    #invoice-modal .print-footer-container img {
                        display: block;
                        width: 100%;
                        height: auto;
                        object-fit: contain;
                    }
                    #invoice-modal .print-header-container img { max-height: 30mm; }
                    #invoice-modal .print-footer-container img { max-height: 16mm; }
                    #invoice-modal .invoice-heading {
                        margin-bottom: 5mm;
                        padding-bottom: 3mm;
                        break-inside: avoid;
                    }
                    #invoice-modal .invoice-heading > div:first-child { margin-bottom: 4mm; }
                    #invoice-modal .invoice-heading h1 { font-size: 14pt; }
                    #invoice-modal .invoice-heading span { font-size: 9pt; }
                    #invoice-modal .invoice-meta { gap: 5mm; }
                    #invoice-modal .invoice-meta > div { min-width: 0; }
                    #invoice-modal .invoice-meta span { overflow-wrap: anywhere; }
                    #invoice-modal .invoice-table-wrapper {
                        overflow: visible;
                        border: 0;
                        border-radius: 0;
                        margin: 0;
                    }
                    #invoice-modal .invoice-table {
                        width: 100%;
                        table-layout: fixed;
                        border-collapse: collapse;
                        border: 0.25mm solid #9ca3af;
                    }
                    #invoice-modal .invoice-table thead { display: table-header-group; }
                    #invoice-modal .invoice-table tfoot {
                        display: table-row-group;
                        break-inside: avoid;
                    }
                    #invoice-modal .invoice-table tr { break-inside: avoid; }
                    #invoice-modal .invoice-table th,
                    #invoice-modal .invoice-table td {
                        padding: 0.8mm 1mm;
                        font-size: 8pt;
                        line-height: 1.5;
                        color: #111827;
                        border: 0.2mm solid #d1d5db;
                        vertical-align: middle;
                        overflow-wrap: anywhere;
                    }
                    #invoice-modal .invoice-table th { font-size: 7.5pt; background: #f1f5f9; }
                    #invoice-modal .invoice-table th:nth-child(1) { width: 4%; }
                    #invoice-modal .invoice-table th:nth-child(2) { width: 14%; }
                    #invoice-modal .invoice-table th:nth-child(3) { width: 18%; }
                    #invoice-modal .invoice-table th:nth-child(4) { width: 10%; }
                    #invoice-modal .invoice-table th:nth-child(5) { width: 9%; }
                    #invoice-modal .invoice-table th:nth-child(6) { width: 10%; }
                    #invoice-modal .invoice-table th:nth-child(7) { width: 10%; }
                    #invoice-modal .invoice-table th:nth-child(8) { width: 12%; }
                    #invoice-modal .invoice-table th:nth-child(9) { width: 13%; }
                    #invoice-modal .invoice-table td:nth-child(2) > div { display: block; }
                    #invoice-modal .invoice-table td:nth-child(n+4) { font-variant-numeric: tabular-nums; }
                    #invoice-modal .invoice-table tfoot td { padding: 2mm 1mm; font-size: 9pt; }
                    #invoice-modal .invoice-table tfoot tr:last-child td { background: #edf2f7; font-weight: 900; }
                    #invoice-modal.print-no-price .price-col { display: none !important; }
                    #invoice-modal.print-no-price .invoice-table th:nth-child(2) { width: 21%; }
                    #invoice-modal.print-no-price .invoice-table th:nth-child(3) { width: 24%; }
                    #invoice-modal.print-no-price .invoice-table th:nth-child(4) { width: 13%; }
                    #invoice-modal.print-no-price .invoice-table th:nth-child(5) { width: 12%; }
                    #invoice-modal.print-no-price .invoice-table th:nth-child(6) { width: 13%; }
                    #invoice-modal.print-no-price .invoice-table th:nth-child(7) { width: 13%; }
                }
                `}
            </style>
            <div id="invoice-modal" className={`fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in print:animate-none print:p-0 print:static print:bg-white print:block print:h-auto print:overflow-visible ${printMode === 'no-price' ? 'print-no-price' : ''}`}>
                <div className="invoice-dialog bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-auto print:shadow-none print:rounded-none print:w-full print:block print:relative print:overflow-visible">

                    {/* Letterhead remains in document flow to avoid covering invoice rows. */}
                    {systemConfigs.printHeaderUrl && (
                        <div className="hidden print:block print-header-container">
                            <img src={systemConfigs.printHeaderUrl} className="w-full h-auto object-cover" alt="Header" />
                        </div>
                    )}

                    <div className={`bg-[#0e3c63] p-6 flex justify-between items-center text-white shrink-0 print:hidden`}>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <Package size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-xl">{t('invoice.preview_title')}</h3>
                                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">{t('invoice.preview_subtitle')}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="bg-white/10 hover:bg-red-500 p-2.5 rounded-xl transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 print:overflow-visible print-content-wrapper">

                        {/* Formal Invoice Header Design (User Requested) */}
                        <div className="invoice-heading mb-8 print:mb-4 border-b pb-4 print:pb-2 border-gray-200 print:border-black">
                            {/* Centered Title */}
                            <div className="text-center mb-6 print:mb-6">
                                <h1 className="text-xl font-black text-black inline-block border-b-2 border-black pb-1">{t('invoice.invoice_title')}</h1>
                            </div>

                            <div className="invoice-meta flex justify-between items-start dir-rtl px-4 print:px-0">

                                {/* Right Side: Agent Info */}
                                <div className="space-y-1 text-right">
                                    <div className="flex items-center gap-2">
                                        <span className="text-black text-[12px] font-bold">{t('invoice.agent_name')}</span>
                                        <span className="text-black text-[12px] font-bold">{order.agentName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-black text-[12px] font-bold">{t('invoice.province')}</span>
                                        <span className="text-black text-[12px] font-bold">
                                            {order.agentProvince}
                                            {(() => {
                                                const agent = db.users.find(u => u.fullName === order.agentName);
                                                return agent?.address ? ` - ${agent.address}` : '';
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                {/* Left Side: Invoice Meta */}
                                <div className="space-y-1 text-left print:text-left">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-black text-[12px] font-bold">{t('invoice.invoice_number')}</span>
                                        <span className="text-black text-[12px] font-bold">{order.id}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-black text-[12px] font-bold">{t('invoice.invoice_date')}</span>
                                        <span className="text-black text-[12px] font-bold font-mono dir-ltr">
                                            <span className="print:hidden">{new Date().toLocaleDateString('en-GB')}</span>
                                            <span className="hidden print:inline">{new Date(order.createdAt).toLocaleDateString('en-GB')}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8 print:hidden">
                            <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('invoice.total_amount')}</p>
                                <p className="text-xl font-black font-mono text-gray-800">${(order.totalAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100 text-emerald-700">
                                <p className="text-[10px] font-black uppercase mb-1 opacity-70">{t('invoice.paid_amount')}</p>
                                <p className="text-xl font-black font-mono">${(order.paidAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-2xl text-center border border-red-100 text-red-700">
                                <p className="text-[10px] font-black uppercase mb-1 opacity-70">{t('invoice.remaining_amount')}</p>
                                <p className="text-xl font-black font-mono">${((order.totalAmount || 0) - (order.paidAmount || 0)).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="invoice-table-wrapper border border-gray-200 print:border-black rounded-3xl print:rounded-none overflow-hidden mb-6">
                            <table className="invoice-table w-full text-right border-collapse">
                                <thead className="bg-gray-50 print:bg-gray-100 border-b print:border-black">
                                    <tr className="text-gray-500 print:text-black font-black text-[10px] uppercase">
                                        <th className="p-3 print:p-1.5 w-10 text-center">{t('invoice.th_seq')}</th>
                                        <th className="p-3 print:p-1.5">{t('invoice.th_code')}</th>
                                        <th className="p-3 print:p-1.5">{t('invoice.th_dimensions')}</th>
                                        <th className="p-3 print:p-1.5 text-center">العدد / الوحدة</th>
                                        <th className="p-3 print:p-1.5 text-center">{t('invoice.th_individual_meters')}</th>
                                        <th className="p-3 print:p-1.5 text-center">{t('invoice.th_meters_per_carton')}</th>
                                        <th className="p-3 print:p-1.5 text-center">{t('invoice.th_total_meters')}</th>
                                        <th className="p-3 print:p-1.5 text-center price-col">سعر المتر / الوحدة</th>
                                        <th className="p-3 print:p-1.5 text-left price-col">{t('invoice.th_total_price')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 print:divide-gray-400">
                                    {sortOrderItemsByProductCode(order.items).map((item, index) => {
                                        const product = db.products.find((p: any) => p.id === item.productId || String(p.id) === String(item.productId));
                                        const isAdhesive = isUnitPricedProduct(product, db.categories, item.productSaleMode) || !!item.productPaintType;
                                        const itemUnit = item.productPaintType ? 'سطلة' : getProductUnit(product, db.categories, item.productSaleMode);
                                        const metersPerCarton = item.productMetersPerCarton ?? product?.metersPerCarton ?? 0;
                                        const totalMeters = isAdhesive ? 0 : (item.quantityCartons * metersPerCarton) + (item.quantityMeters || 0);
                                        const unitPriceMeter = isAdhesive ? 0 : (metersPerCarton > 0 ? (item.unitPriceCarton / metersPerCarton) : (item.unitPriceMeter || 0));
                                        const computedTotalPrice = isAdhesive ? (item.totalPrice || 0) : (totalMeters * unitPriceMeter);

                                        return (
                                        <React.Fragment key={item.id}>
                                            <tr className={`text-sm print:text-[11px] ${item.isSpecialRequest ? 'bg-amber-50 print:bg-white' : ''}`}>
                                                <td className="p-3 print:p-1.5 text-center font-mono font-bold text-gray-400 print:text-black border-l print:border-gray-300">
                                                    {index + 1}
                                                </td>
                                                <td className="p-3 print:p-1.5 font-black text-gray-800 print:font-bold">
                                                    <div className="flex items-center gap-2">
                                                        {item.isSpecialRequest && <Sparkles size={12} className="text-amber-500 fill-amber-500 print:hidden" />}
                                                        {item.productName || product?.name || item.productCode}
                                                    </div>
                                                </td>
                                                <td className="p-3 print:p-1.5 text-gray-500 print:text-black">{item.productPaintType || product?.paintType ? `${item.productPaintType || product?.paintType} — ${item.productDimensions}` : item.productDimensions}{item.paintColor && <p className="mt-1 text-xs font-bold text-[#0e3c63] whitespace-pre-line">الألوان: {item.paintColor}</p>}</td>
                                                <td className="p-3 print:p-1.5 text-center font-bold">
                                                    {isAdhesive ? (
                                                        <span>{item.quantityCartons} <span className="text-[10px] opacity-50">{itemUnit}</span></span>
                                                    ) : (
                                                        <span>{item.quantityCartons}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 print:p-1.5 text-center font-mono">
                                                    {isAdhesive ? '-' : ((item.quantityMeters || 0) > 0 ? item.quantityMeters : '-')}
                                                </td>
                                                <td className="p-3 print:p-1.5 text-center font-mono">
                                                    {isAdhesive ? '-' : metersPerCarton}
                                                </td>
                                                <td className="p-3 print:p-1.5 text-center font-bold">
                                                    {isAdhesive ? '-' : totalMeters}
                                                </td>
                                                <td className="p-3 print:p-1.5 text-center font-mono price-col">
                                                    {isAdhesive ? (
                                                        item.unitPriceCarton > 0 ? `$${item.unitPriceCarton}` : <span className="text-xs text-amber-600 font-black">{t('invoice.pending_pricing')}</span>
                                                    ) : (
                                                        unitPriceMeter > 0 ? `$${unitPriceMeter % 1 === 0 ? unitPriceMeter : unitPriceMeter.toFixed(2)}` : <span className="text-xs text-amber-600 font-black">{t('invoice.pending_pricing')}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 print:p-1.5 text-left font-mono font-black price-col">
                                                    <span className="print:hidden">${(computedTotalPrice || 0).toLocaleString()}</span>
                                                    <span className="hidden print:inline">${(item.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </td>
                                            </tr>
                                            {item.isSpecialRequest && (
                                                <tr className="bg-amber-50/50 print:bg-white border-t border-amber-100 print:border-black">
                                                    <td colSpan={printMode === 'no-price' ? 7 : 9} className="p-4 py-3 print:p-1 print:pr-2">
                                                        <div className="flex items-start gap-2">
                                                            <MessageSquare size={14} className="text-amber-400 shrink-0 mt-0.5 print:hidden" />
                                                            <p className="text-xs font-bold text-amber-800 print:text-black italic">{t('invoice.custom_dimensions_note')}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 print:bg-white border-t-2 print:border-black price-col">
                                    <tr className="print:text-[11px]">
                                        <td colSpan={8} className="p-4 print:p-1 print:pr-2 font-bold text-gray-500 print:text-black text-left">{t('invoice.subtotal')}</td>
                                        <td className="p-4 print:p-1 text-left font-mono font-bold print:pl-2">${(order.subTotalAmount || order.totalAmount || 0).toLocaleString()}</td>
                                    </tr>
                                    {order.discountValue > 0 && (
                                        <tr className="text-red-600 print:text-black print:text-[11px]">
                                            <td colSpan={8} className="p-4 print:p-1 print:pr-2 font-black text-left">{t('invoice.discount')}</td>
                                            <td className="p-4 print:p-1 text-left font-mono font-black print:pl-2">-${(order.discountType === 'PERCENT' ? (order.subTotalAmount * order.discountValue / 100) : order.discountValue).toLocaleString()}</td>
                                        </tr>
                                    )}
                                    <tr className="bg-[#0e3c63] text-white print:bg-gray-100 print:text-black">
                                        <td colSpan={8} className="p-4 print:p-1 print:pr-2 font-black text-lg print:text-[12px] text-left">{t('invoice.final_net')}</td>
                                        <td className="p-4 print:p-1 text-left font-mono font-black text-xl print:text-[12px] print:pl-2">${(order.totalAmount || 0).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                    </div>

                    {systemConfigs.printFooterUrl && (
                        <div className="hidden print:block print-footer-container">
                            <img src={systemConfigs.printFooterUrl} className="w-full h-auto object-cover" alt="Footer" />
                        </div>
                    )}

                    <div className="p-6 border-t bg-gray-50 flex flex-wrap justify-end gap-3 shrink-0 sticky bottom-0 z-10 print:hidden">
                        <Button onClick={onClose} variant="secondary" className="px-8 rounded-xl font-bold">{t('invoice.close')}</Button>
                        {canShowPrintButtons && (
                            <>
                                <Button onClick={() => handlePrint('no-price')} className="px-8 bg-[#ff9800] hover:bg-[#e68a00] text-white rounded-xl font-black">
                                    <Printer size={18} />{t('invoice.print_no_price')}</Button>
                                <Button onClick={() => handlePrint('normal')} className="px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black">
                                    <Printer size={18} />{t('invoice.print_a4')}</Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};
