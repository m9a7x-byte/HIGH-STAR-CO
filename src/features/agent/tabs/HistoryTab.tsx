import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import { useTranslation } from 'react-i18next';

import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Search, Clock, Filter, CheckCircle2, Loader2, Hourglass, AlertCircle, Banknote, AlertTriangle, ListOrdered, Wallet, Eye, RotateCcw, Sparkles, Calendar, Edit } from 'lucide-react';
import { Card, Badge, Button } from '../../../components/ui';
import { MonthYearPicker } from '../../../components/ui/MonthYearPicker';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { Order, PaymentStatus, ProductionStatus, PaymentStatusLabels, ProductionStatusLabels } from '../../../types';
import { db } from '../../../lib/db';
import { formatDate } from '../../../lib/dateUtils';

interface HistoryTabProps {
    myOrders: Order[];
    onViewOrder: (order: Order) => void;
    onEditOrder: (order: Order) => void;
    lockedAgentEditOrderIds?: string[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ myOrders, onViewOrder, onEditOrder, lockedAgentEditOrderIds = [] }) => {
  const { t } = useTranslation();
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
    const [historySearch, setHistorySearch] = useState('');
    const [historyDate, setHistoryDate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // New Advanced Filters
    const [statusFilterType, setStatusFilterType] = useState<'PAYMENT' | 'PRODUCTION' | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 500);

        // Auto-refresh every 5 seconds
        const refreshInterval = setInterval(() => {
            db.fetchOrders();
        }, 5000);

        return () => {
            clearTimeout(timer);
            clearInterval(refreshInterval);
        };
    }, []);

    const getPaymentStatusColor = (status: PaymentStatus) => {
        switch (status) {
            case PaymentStatus.PAID: return 'green';
            case PaymentStatus.PARTIALLY_PAID: return 'orange';
            case PaymentStatus.PENDING: return 'red';
            default: return 'gray';
        }
    };



    const handleResetFilters = () => {
        setHistorySearch('');
        setHistoryDate(null);
        setSelectedStatus(null);
        setStatusFilterType(null);
        setHistoryPage(0);
    };

    const handleStatusClick = (type: 'PAYMENT' | 'PRODUCTION', status: string) => {
        if (selectedStatus === status && statusFilterType === type) {
            // Toggle off if already selected
            setStatusFilterType(null);
            setSelectedStatus(null);
        } else {
            setStatusFilterType(type);
            setSelectedStatus(status);
        }
        setHistoryPage(0);
    };

    // 1. Base Filtered List (For Stats Calculation - before applying Status Filter)
    const baseHistoryOrders = useMemo(() => {
        return myOrders.filter(o => {
            // Search Filter (ID)
            const matchesSearch = o.id.toString().includes(historySearch);
            if (!matchesSearch) return false;

            // Date Filter
            if (historyDate) {
                const orderDate = new Date(o.createdAt);
                if (orderDate.getMonth() !== historyDate.getMonth() ||
                    orderDate.getFullYear() !== historyDate.getFullYear()) {
                    return false;
                }
            }

            return true;
        });
    }, [myOrders, historySearch, historyDate]);

    // 2. Stats Calculation based on Base Filter
    const historyStats = useMemo(() => {
        return {
            // Payment Stats
            paid: baseHistoryOrders.filter(o => o.paymentStatus === PaymentStatus.PAID).length,
            partial: baseHistoryOrders.filter(o => o.paymentStatus === PaymentStatus.PARTIALLY_PAID).length,
            pending: baseHistoryOrders.filter(o => o.paymentStatus === PaymentStatus.PENDING).length,

            // Production Stats
            waiting: baseHistoryOrders.filter(o => o.productionStatus === ProductionStatus.WAITING).length,
            inProgress: baseHistoryOrders.filter(o => o.productionStatus === ProductionStatus.IN_PROGRESS).length,
            completed: baseHistoryOrders.filter(o => o.productionStatus === ProductionStatus.COMPLETED).length,
        };
    }, [baseHistoryOrders]);

    // 3. Final Filtered List (Applied to Table)
    const filteredOrders = useMemo(() => {
        return baseHistoryOrders.filter(o => {
            if (statusFilterType === 'PAYMENT' && selectedStatus) {
                return o.paymentStatus === selectedStatus;
            }
            if (statusFilterType === 'PRODUCTION' && selectedStatus) {
                return o.productionStatus === selectedStatus;
            }
            return true;
        });
    }, [baseHistoryOrders, statusFilterType, selectedStatus]);

    const currentHistory = useMemo(() => {
        return filteredOrders.slice(historyPage * historyRowsPerPage, (historyPage + 1) * historyRowsPerPage);
    }, [filteredOrders, historyPage, historyRowsPerPage]);

    const isFiltered = historySearch || historyDate || selectedStatus;
    const locallyLockedEditOrders = useMemo(() => new Set(lockedAgentEditOrderIds), [lockedAgentEditOrderIds]);
    const canAgentEditOrder = (order: Order) => {
        return !locallyLockedEditOrders.has(String(order.id)) &&
            order.agentEditUnlocked === true &&
            (order.productionStatus === ProductionStatus.PENDING_TRANSFER || order.productionStatus === ProductionStatus.PENDING_PAYMENT);
    };

    return (
        <div className="space-y-3 lg:space-y-6 animate-fade-in">

            {/* Unified Container: Filters + Stats */}
            <div className="bg-white p-3 lg:p-6 rounded-2xl lg:rounded-3xl shadow-sm border border-gray-100">

                {/* Header: Title + Filters */}
                <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 justify-between items-start lg:items-center lg:bg-gray-50 lg:p-5 lg:rounded-2xl lg:border lg:border-gray-100 lg:mb-6">
                    <div className="flex items-center gap-3">
                        <ListOrdered size={28} className="hidden lg:block text-[#0e3c63]" />
                        <h2 className="text-lg lg:text-2xl font-black text-gray-800">
                            <span className="lg:hidden">{t('agent_dashboard.mobile_orders')}</span><span className="hidden lg:inline">{t('agent.order_history')}</span>
                        </h2>
                        <span className="bg-[#0e3c63] text-white text-xs font-bold px-2.5 py-1 rounded-full">{filteredOrders.length}</span>
                        {isFiltered && (
                            <button
                                onClick={handleResetFilters}
                                className="bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 p-2 rounded-xl transition-all mr-2"
                                title={t('batch3.txt_0leeqw_7062')}
                            >
                                <RotateCcw size={20} />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 w-full lg:w-auto">
                        <div className="relative flex-1 w-full lg:w-40 group">
                            <input
                                className="w-full pe-4 ps-10 h-11 lg:h-[50px] bg-white border border-gray-200 rounded-xl lg:rounded-[1.5rem] outline-none text-sm transition-all focus:border-[#0e3c63] focus:ring-4 focus:ring-[#0e3c63]/5 shadow-sm group-hover:border-gray-300 font-medium"
                                aria-label={t('agent.by_order_number')}
                                placeholder={t('agent.by_order_number')}
                                value={historySearch}
                                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(0); }}
                            />
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0e3c63] transition-colors" size={20} aria-hidden="true" />
                        </div>

                        <div className="w-full grid grid-cols-2 gap-2 lg:hidden">
                            <label className="min-w-0 text-xs font-bold text-slate-600">
                                {t('agent.status_col')}
                                <select value={statusFilterType && selectedStatus ? `${statusFilterType}:${selectedStatus}` : ''} onChange={event => {
                                    const [type, status] = event.target.value.split(':');
                                    setStatusFilterType(type === 'PAYMENT' || type === 'PRODUCTION' ? type : null);
                                    setSelectedStatus(status || null);
                                    setHistoryPage(0);
                                }} className="mt-1 block h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-800">
                                    <option value="">{t('common.all')}</option>
                                    <optgroup label={t('agent_dashboard.mobile_production_status')}>
                                        {Object.entries(ProductionStatusLabels).map(([status, label]) => <option key={status} value={`PRODUCTION:${status}`}>{label}</option>)}
                                    </optgroup>
                                    <optgroup label={t('agent_dashboard.mobile_payment_status')}>
                                        {Object.entries(PaymentStatusLabels).map(([status, label]) => <option key={status} value={`PAYMENT:${status}`}>{label}</option>)}
                                    </optgroup>
                                </select>
                            </label>
                            <label className="min-w-0 text-xs font-bold text-slate-600">
                                {t('agent.date')}
                                <span className="relative mt-1 block">
                                    <input type="month" dir="ltr" value={historyDate ? `${historyDate.getFullYear()}-${String(historyDate.getMonth() + 1).padStart(2, '0')}` : ''} onChange={event => {
                                        const [year, month] = event.target.value.split('-').map(Number);
                                        setHistoryDate(year && month ? new Date(year, month - 1, 1) : null);
                                        setHistoryPage(0);
                                    }} className={`block h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-sm ${historyDate ? 'text-slate-800' : 'text-transparent focus:text-slate-800'} peer`} />
                                    {!historyDate && <span aria-hidden="true" className="pointer-events-none absolute inset-y-px end-8 start-2 flex items-center rounded-lg bg-white text-sm font-medium text-slate-700 peer-focus:hidden">{t('common.all')}</span>}
                                </span>
                            </label>
                        </div>
                        <div className="hidden lg:block">
                            <MonthYearPicker selectedDate={historyDate} onChange={(date) => { setHistoryDate(date); setHistoryPage(0); }} />
                        </div>
                    </div>
                </div>

                {/* Stats Cards (Now Inside the Filter Container) */}
                <div className="hidden lg:grid lg:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    {/* Production Status */}
                    <div>
                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm border-b border-gray-200 pb-2">
                            <ListOrdered size={16} className="text-blue-500" />{t('agent.production_status_filter')}</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div
                                onClick={() => handleStatusClick('PRODUCTION', ProductionStatus.WAITING)}
                                className={`bg-white p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === ProductionStatus.WAITING ? 'border-gray-400 ring-2 ring-gray-100' : 'border-gray-100'}`}
                            >
                                <div className="mb-2 text-gray-400 flex justify-center"><Hourglass size={24} /></div>
                                <h4 className="text-2xl font-black text-gray-800">{historyStats.waiting}</h4>
                                <p className="text-xs text-gray-500 font-bold mt-1">{t('batch3.txt_5r0kom_7062')}</p>
                            </div>
                            <div
                                onClick={() => handleStatusClick('PRODUCTION', ProductionStatus.IN_PROGRESS)}
                                className={`bg-blue-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === ProductionStatus.IN_PROGRESS ? 'border-blue-400 ring-2 ring-blue-100' : 'border-blue-100'}`}
                            >
                                <div className="mb-2 text-blue-500 flex justify-center"><Loader2 size={24} /></div>
                                <h4 className="text-2xl font-black text-blue-600">{historyStats.inProgress}</h4>
                                <p className="text-xs text-blue-600 font-bold mt-1">{t('batch3.txt_ltfgll_7062')}</p>
                            </div>
                            <div
                                onClick={() => handleStatusClick('PRODUCTION', ProductionStatus.COMPLETED)}
                                className={`bg-green-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === ProductionStatus.COMPLETED ? 'border-green-400 ring-2 ring-green-100' : 'border-green-100'}`}
                            >
                                <div className="mb-2 text-green-500 flex justify-center"><CheckCircle2 size={24} /></div>
                                <h4 className="text-2xl font-black text-green-600">{historyStats.completed}</h4>
                                <p className="text-xs text-green-600 font-bold mt-1">{t('batch3.txt_9bk634_7062')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div>
                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm border-b border-gray-200 pb-2">
                            <Wallet size={16} className="text-orange-500" />{t('agent.payment_status_filter')}</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div
                                onClick={() => handleStatusClick('PAYMENT', PaymentStatus.PENDING)}
                                className={`bg-red-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === PaymentStatus.PENDING ? 'border-red-400 ring-2 ring-red-100' : 'border-red-100'}`}
                            >
                                <div className="mb-2 text-red-500 flex justify-center"><AlertCircle size={24} /></div>
                                <h4 className="text-2xl font-black text-red-600">{historyStats.pending}</h4>
                                <p className="text-xs text-red-600 font-bold mt-1">{t('batch3.txt_8uzm5j_7062')}</p>
                            </div>
                            <div
                                onClick={() => handleStatusClick('PAYMENT', PaymentStatus.PARTIALLY_PAID)}
                                className={`bg-orange-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === PaymentStatus.PARTIALLY_PAID ? 'border-orange-400 ring-2 ring-orange-100' : 'border-orange-100'}`}
                            >
                                <div className="mb-2 text-orange-500 flex justify-center"><AlertTriangle size={24} /></div>
                                <h4 className="text-2xl font-black text-orange-600">{historyStats.partial}</h4>
                                <p className="text-xs text-orange-600 font-bold mt-1">{t('batch3.txt_54njbg_7062')}</p>
                            </div>
                            <div
                                onClick={() => handleStatusClick('PAYMENT', PaymentStatus.PAID)}
                                className={`bg-emerald-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === PaymentStatus.PAID ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-emerald-100'}`}
                            >
                                <div className="mb-2 text-emerald-500 flex justify-center"><Banknote size={24} /></div>
                                <h4 className="text-2xl font-black text-emerald-600">{historyStats.paid}</h4>
                                <p className="text-xs text-emerald-600 font-bold mt-1">{t('batch3.txt_zatlrt_7062')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:hidden overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table aria-label={t('agent_dashboard.mobile_orders')} className="w-full table-fixed text-start text-sm [&_td]:align-top">
                    <thead className="bg-slate-50 text-xs text-slate-600">
                        <tr>
                            <th scope="col" className="w-[27%] px-2 py-3 text-start">{t('agent.order_col')}</th>
                            <th scope="col" className="w-[30%] px-1 py-3 text-start">{t('agent.status_col')}</th>
                            <th scope="col" className="w-[26%] px-1 py-3 text-end">{t('agent.col_amount')}</th>
                            <th scope="col" className="px-1 py-3 text-center">{t('common.edit')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 border-t border-slate-100">
                        {(isLoading || currentHistory.length === 0) && <tr><td colSpan={4} className="p-6 text-center text-slate-500" role="status">{isLoading ? t('common.loading') : t('batch3.txt_7mnhul_7062')}</td></tr>}
                        {!isLoading && currentHistory.map(order => (
                            <tr key={order.id}>
                                <td className="px-2 py-2.5 text-start">
                                    <button type="button" onClick={() => onViewOrder(order)} aria-label={`${t('agent.view_order')} #${order.id}`} className="inline-flex min-h-7 items-center gap-1 font-black text-[#0e3c63] underline decoration-slate-300 underline-offset-4">
                                        <bdi>#{order.id}</bdi>{order.hasSpecialRequest && <Sparkles size={12} className="text-amber-600" aria-hidden="true" />}
                                    </button>
                                    <p className="text-xs text-slate-600"><bdi>{formatDate(order.createdAt)}</bdi></p>
                                </td>
                                <td className="px-1 py-3 text-start">
                                    <span className="block font-bold leading-snug text-slate-800">{ProductionStatusLabels[order.productionStatus]}</span>
                                    <span className={`mt-1 block text-xs leading-snug ${order.paymentStatus === PaymentStatus.PAID ? 'text-emerald-700' : 'text-slate-600'}`}>{PaymentStatusLabels[order.paymentStatus]}</span>
                                    {Boolean(order.estimatedDays) && <span className="mt-1 block text-xs text-slate-600">{order.estimatedDays} {t('agent.days')}</span>}
                                </td>
                                <td className="px-1 py-3 break-words text-end text-xs font-bold tabular-nums text-slate-900">
                                    <bdi dir="ltr">${order.totalAmount.toLocaleString()}</bdi>
                                </td>
                                <td className="px-1 py-2 text-center">
                                    {canAgentEditOrder(order) && (
                                        <button type="button" onClick={() => onEditOrder(order)} aria-label={`${t('agent_dashboard.mobile_edit_order')} #${order.id}`} className="inline-flex h-11 w-11 max-w-full items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-amber-700">
                                            <span className="inline-flex size-7 items-center justify-center rounded-md bg-amber-50 text-amber-800"><Edit size={14} aria-hidden="true" /></span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="hidden lg:block space-y-6">
            {/* Desktop order list */}
            {isLoading ? (
                // Skeleton Loading
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 animate-pulse">
                            <div className="flex items-center gap-6 w-full">
                                <div className="bg-gray-200 w-16 h-16 rounded-2xl"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : currentHistory.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t('batch3.txt_7mnhul_7062')}</p>
                </div>
            ) : (
                currentHistory.map(o => (
                    <Card key={o.id} className="p-4 md:p-6 hover:border-blue-300 transition-colors">
                        {/* Desktop Layout */}
                        <div className="flex justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-[#0e3c63] font-bold font-mono text-lg border border-blue-100">#{o.id}</div>
                                    {o.hasSpecialRequest && (
                                        <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1.5 rounded-full shadow-sm border-2 border-white z-10" title={t('batch3.txt_ujb7g0_7062')}>
                                            <Sparkles size={14} className="fill-current" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1 font-mono">{formatDate(o.createdAt)}</p>
                                    <p className="font-bold text-2xl text-gray-900">${o.totalAmount.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 mb-1">{t('batch3.txt_8pwd83_7062')}</span>
                                    <Badge color={getPaymentStatusColor(o.paymentStatus)}>{PaymentStatusLabels[o.paymentStatus]}</Badge>
                                </div>
                                <div className="w-px h-10 bg-gray-200"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 mb-1">{t('batch3.txt_fhpqia_7062')}</span>
                                    <Badge color={o.productionStatus === ProductionStatus.COMPLETED ? 'blue' : 'gray'}>{ProductionStatusLabels[o.productionStatus]}</Badge>
                                </div>
                                <div className="w-px h-10 bg-gray-200"></div>
                                <div className="flex flex-col items-center min-w-[80px]">
                                    <span className="text-[10px] text-gray-400 mb-1">{o.productionStatus === ProductionStatus.COMPLETED ? t('agent.completed_in') : t('agent.expected_time')}</span>
                                    <div className="flex items-center gap-1 font-bold text-gray-600">
                                        <Clock size={14} />
                                        <span>{o.estimatedDays ? `${o.estimatedDays} ${t('agent.days')}` : '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {canAgentEditOrder(o) && (
                                    <Button onClick={() => onEditOrder(o)} variant="ghost" className="text-amber-600 hover:bg-amber-50">
                                        <Edit size={22} />
                                    </Button>
                                )}
                                <Button onClick={() => onViewOrder(o)} variant="ghost" className="text-[#0e3c63] hover:bg-blue-50">
                                    <Eye size={24} />
                                </Button>
                            </div>
                        </div>

                    </Card>
                ))
            )}

            </div>

            {/* 3. Pagination */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <PaginationControl
                    page={historyPage}
                    rowsPerPage={historyRowsPerPage}
                    setPage={setHistoryPage}
                    setRowsPerPage={setHistoryRowsPerPage}
                    totalItems={filteredOrders.length}
                />
            </div>
        </div>
    );
};
