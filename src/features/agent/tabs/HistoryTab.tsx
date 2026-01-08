
import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Search, Clock, Filter, CheckCircle2, Loader2, Hourglass, AlertCircle, Banknote, AlertTriangle, ListOrdered, Wallet, Eye, RotateCcw, Sparkles, Calendar } from 'lucide-react';
import { Card, Badge, Button } from '../../../components/ui';
import { MonthYearPicker } from '../../../components/ui/MonthYearPicker';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { Order, PaymentStatus, ProductionStatus, PaymentStatusLabels, ProductionStatusLabels } from '../../../types';
import { db } from '../../../lib/db';
import { formatDate } from '../../../lib/dateUtils';

interface HistoryTabProps {
    myOrders: Order[];
    onViewOrder: (order: Order) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ myOrders, onViewOrder }) => {
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

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Unified Container: Filters + Stats */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">

                {/* Header: Title + Filters */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-6">
                    <div className="flex items-center gap-3">
                        <ListOrdered size={28} className="text-[#0e3c63]" />
                        <h2 className="text-2xl font-black text-gray-800 whitespace-nowrap">سجل الطلبات</h2>
                        <span className="bg-[#0e3c63] text-white text-xs font-bold px-2.5 py-1 rounded-full">{filteredOrders.length}</span>
                        {isFiltered && (
                            <button
                                onClick={handleResetFilters}
                                className="bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 p-2 rounded-xl transition-all mr-2"
                                title="إعادة تعيين الفلاتر"
                            >
                                <RotateCcw size={20} />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative flex-1 w-full lg:w-40 group">
                            <input
                                className="w-full pl-4 pr-10 h-[50px] bg-white border border-gray-200 rounded-[1.5rem] outline-none text-sm transition-all focus:border-[#0e3c63] focus:ring-4 focus:ring-[#0e3c63]/5 shadow-sm group-hover:border-gray-300 font-medium"
                                placeholder="بحث برقم الطلب..."
                                value={historySearch}
                                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(0); }}
                            />
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0e3c63] transition-colors" size={20} />
                        </div>

                        <MonthYearPicker
                            selectedDate={historyDate}
                            onChange={(date) => { setHistoryDate(date); setHistoryPage(0); }}
                        />
                    </div>
                </div>

                {/* Stats Cards (Now Inside the Filter Container) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    {/* Production Status */}
                    <div>
                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm border-b border-gray-200 pb-2">
                            <ListOrdered size={16} className="text-blue-500" />
                            حالات الإنتاج (اضغط للفلترة)
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div
                                onClick={() => handleStatusClick('PRODUCTION', ProductionStatus.WAITING)}
                                className={`bg-white p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === ProductionStatus.WAITING ? 'border-gray-400 ring-2 ring-gray-100' : 'border-gray-100'}`}
                            >
                                <div className="mb-2 text-gray-400 flex justify-center"><Hourglass size={24} /></div>
                                <h4 className="text-2xl font-black text-gray-800">{historyStats.waiting}</h4>
                                <p className="text-xs text-gray-500 font-bold mt-1">انتظار</p>
                            </div>
                            <div
                                onClick={() => handleStatusClick('PRODUCTION', ProductionStatus.IN_PROGRESS)}
                                className={`bg-blue-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === ProductionStatus.IN_PROGRESS ? 'border-blue-400 ring-2 ring-blue-100' : 'border-blue-100'}`}
                            >
                                <div className="mb-2 text-blue-500 flex justify-center"><Loader2 size={24} /></div>
                                <h4 className="text-2xl font-black text-blue-600">{historyStats.inProgress}</h4>
                                <p className="text-xs text-blue-600 font-bold mt-1">تحضير</p>
                            </div>
                            <div
                                onClick={() => handleStatusClick('PRODUCTION', ProductionStatus.COMPLETED)}
                                className={`bg-green-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === ProductionStatus.COMPLETED ? 'border-green-400 ring-2 ring-green-100' : 'border-green-100'}`}
                            >
                                <div className="mb-2 text-green-500 flex justify-center"><CheckCircle2 size={24} /></div>
                                <h4 className="text-2xl font-black text-green-600">{historyStats.completed}</h4>
                                <p className="text-xs text-green-600 font-bold mt-1">جاهز</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div>
                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm border-b border-gray-200 pb-2">
                            <Wallet size={16} className="text-orange-500" />
                            حالات الدفع (اضغط للفلترة)
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div
                                onClick={() => handleStatusClick('PAYMENT', PaymentStatus.PENDING)}
                                className={`bg-red-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === PaymentStatus.PENDING ? 'border-red-400 ring-2 ring-red-100' : 'border-red-100'}`}
                            >
                                <div className="mb-2 text-red-500 flex justify-center"><AlertCircle size={24} /></div>
                                <h4 className="text-2xl font-black text-red-600">{historyStats.pending}</h4>
                                <p className="text-xs text-red-600 font-bold mt-1">دين</p>
                            </div>
                            <div
                                onClick={() => handleStatusClick('PAYMENT', PaymentStatus.PARTIALLY_PAID)}
                                className={`bg-orange-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === PaymentStatus.PARTIALLY_PAID ? 'border-orange-400 ring-2 ring-orange-100' : 'border-orange-100'}`}
                            >
                                <div className="mb-2 text-orange-500 flex justify-center"><AlertTriangle size={24} /></div>
                                <h4 className="text-2xl font-black text-orange-600">{historyStats.partial}</h4>
                                <p className="text-xs text-orange-600 font-bold mt-1">جزئي</p>
                            </div>
                            <div
                                onClick={() => handleStatusClick('PAYMENT', PaymentStatus.PAID)}
                                className={`bg-emerald-50 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all text-center shadow-sm ${selectedStatus === PaymentStatus.PAID ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-emerald-100'}`}
                            >
                                <div className="mb-2 text-emerald-500 flex justify-center"><Banknote size={24} /></div>
                                <h4 className="text-2xl font-black text-emerald-600">{historyStats.paid}</h4>
                                <p className="text-xs text-emerald-600 font-bold mt-1">مدفوع</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Order List */}
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
                    <p>لا توجد طلبات مطابقة للبحث</p>
                </div>
            ) : (
                currentHistory.map(o => (
                    <Card key={o.id} className="p-4 md:p-6 hover:border-blue-300 transition-colors">
                        {/* Desktop Layout */}
                        <div className="hidden md:flex justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-[#0e3c63] font-bold font-mono text-lg border border-blue-100">#{o.id}</div>
                                    {o.hasSpecialRequest && (
                                        <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1.5 rounded-full shadow-sm border-2 border-white z-10" title="طلب خاص">
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
                                    <span className="text-[10px] text-gray-400 mb-1">الدفع</span>
                                    <Badge color={getPaymentStatusColor(o.paymentStatus)}>{PaymentStatusLabels[o.paymentStatus]}</Badge>
                                </div>
                                <div className="w-px h-10 bg-gray-200"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 mb-1">التجهيز</span>
                                    <Badge color={o.productionStatus === ProductionStatus.COMPLETED ? 'blue' : 'gray'}>{ProductionStatusLabels[o.productionStatus]}</Badge>
                                </div>
                                <div className="w-px h-10 bg-gray-200"></div>
                                <div className="flex flex-col items-center min-w-[80px]">
                                    <span className="text-[10px] text-gray-400 mb-1">
                                        {o.productionStatus === ProductionStatus.COMPLETED ? 'تم الإنجاز في' : 'الوقت المتوقع'}
                                    </span>
                                    <div className="flex items-center gap-1 font-bold text-gray-600">
                                        <Clock size={14} />
                                        <span>{o.estimatedDays ? `${o.estimatedDays} يوم` : '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Button onClick={() => onViewOrder(o)} variant="ghost" className="text-[#0e3c63] hover:bg-blue-50">
                                    <Eye size={24} />
                                </Button>
                            </div>
                        </div>

                        {/* Mobile Layout - Compact Single Row Style */}
                        <div className="flex md:hidden items-center justify-between gap-3">
                            {/* Order ID + Special Badge */}
                            <div className="relative shrink-0">
                                <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-[#0e3c63] font-bold font-mono text-sm border border-blue-100">#{o.id}</div>
                                {o.hasSpecialRequest && (
                                    <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow-sm border-2 border-white z-10">
                                        <Sparkles size={10} className="fill-current" />
                                    </div>
                                )}
                            </div>

                            {/* Date + Amount + Badges in a compact format */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-gray-500 font-mono">{formatDate(o.createdAt)}</span>
                                    <span className="font-bold text-lg text-gray-900">${o.totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge color={getPaymentStatusColor(o.paymentStatus)} className="text-[10px] px-2 py-0.5">{PaymentStatusLabels[o.paymentStatus]}</Badge>
                                    <Badge color={o.productionStatus === ProductionStatus.COMPLETED ? 'blue' : 'gray'} className="text-[10px] px-2 py-0.5">{ProductionStatusLabels[o.productionStatus]}</Badge>
                                    {o.estimatedDays && (
                                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                            <Clock size={10} /> {o.estimatedDays}د
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* View Button */}
                            <button onClick={() => onViewOrder(o)} className="p-2 text-[#0e3c63] hover:bg-blue-50 rounded-xl shrink-0">
                                <Eye size={20} />
                            </button>
                        </div>
                    </Card>
                ))
            )}

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
