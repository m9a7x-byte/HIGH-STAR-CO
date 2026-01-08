import React, { useState, useMemo } from 'react';
import { History, Search, Filter, Calendar, DollarSign, Wallet, TrendingDown, Clock, Box, Globe, ShieldCheck, RotateCcw, AlertCircle } from 'lucide-react';
import { formatDate, formatTime } from '../../../lib/dateUtils';
import { Card, Badge, DateRangePicker, Button } from '../../../components/ui';
import { db } from '../../../lib/db';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { materialLabels } from '../components/SharedFactoryComponents';

interface SupplierHistoryTabProps {
    refreshTrigger: number;
    onOpenModal: (category: any) => void;
}

export const SupplierHistoryTab = ({ refreshTrigger, onOpenModal }: SupplierHistoryTabProps) => {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const allTxs = useMemo(() => db.getFactoryTransactions('SUPPLIER'), [refreshTrigger]);

    const filteredTxs = useMemo(() => {
        return allTxs.filter(t => {
            const matchesSearch = (t.supplierName || '').includes(searchTerm) || (t.notes || '').includes(searchTerm);
            const txDate = new Date(t.date).setHours(0, 0, 0, 0);
            const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
            const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            return matchesSearch && txDate >= start && txDate <= end;
        });
    }, [allTxs, searchTerm, fromDate, toDate]);

    const currentTxs = filteredTxs.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    const totals = useMemo(() => {
        const purchases = filteredTxs.reduce((s, t) => s + t.amount, 0);
        const paid = filteredTxs.reduce((s, t) => s + (t.paidAmount || 0), 0);
        return { purchases, paid, debt: purchases - paid };
    }, [filteredTxs]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Toolbar */}
            <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4">
                <div className="px-2">
                    <h3 className="font-black text-gray-800 text-xl flex items-center gap-3">
                        <History size={24} className="text-[#0e3c63]" />
                        سجل حركات الموردين
                    </h3>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <input
                            className="w-full h-[54px] pl-4 pr-11 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner"
                            placeholder="بحث باسم المورد أو البيان..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute right-4 top-[18px] text-gray-400" size={18} />
                    </div>
                    <DateRangePicker from={fromDate} to={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-0 shadow-lg bg-white flex items-center gap-5">
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl shadow-inner"><TrendingDown size={28} /></div>
                    <div><p className="text-[10px] text-gray-400 font-black uppercase mb-1">إجمالي المشتريات</p><p className="text-3xl font-mono font-black text-red-600">${totals.purchases.toLocaleString()}</p></div>
                </Card>
                <Card className="p-6 border-0 shadow-lg bg-white flex items-center gap-5">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner"><Wallet size={28} /></div>
                    <div><p className="text-[10px] text-gray-400 font-black uppercase mb-1">إجمالي الواصل</p><p className="text-3xl font-mono font-black text-emerald-600">${totals.paid.toLocaleString()}</p></div>
                </Card>
                <Card className={`p-6 border-0 shadow-lg flex items-center gap-5 text-white ${totals.debt > 0 ? 'bg-[#0e3c63]' : 'bg-emerald-600'}`}>
                    <div className="p-4 bg-white/20 rounded-2xl shadow-inner"><DollarSign size={28} /></div>
                    <div><p className="text-[10px] opacity-70 font-black uppercase mb-1">صافي المتبقي بذمة المعمل</p><p className="text-3xl font-mono font-black">${totals.debt.toLocaleString()}</p></div>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card className="p-0 overflow-hidden border border-gray-100 shadow-xl rounded-[2.5rem]">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b">
                            <tr>
                                <th className="p-5 pr-10 w-12 text-center">ت</th>
                                <th className="p-5">تاريخ العملية</th>
                                <th className="p-5">المورد</th>
                                <th className="p-5">المادة الأولية</th>
                                <th className="p-5 text-center">الدولة</th>
                                <th className="p-5 text-left">القيمة الكلية</th>
                                <th className="p-5 text-left">المدفوع</th>
                                <th className="p-5 text-left pl-10">المتبقي (دين)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {currentTxs.length === 0 ? (
                                <tr><td colSpan={8} className="p-32 text-center text-gray-400 font-black italic opacity-30 flex flex-col items-center gap-4">
                                    <AlertCircle size={64} />
                                    <p className="text-xl">لا توجد حركات مالية للموردين للفترة المحددة</p>
                                </td></tr>
                            ) : currentTxs.map((t, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="p-5 pr-10 text-center font-bold text-gray-400">{page * rowsPerPage + idx + 1}</td>
                                    <td className="p-5">
                                        <div className="flex flex-col font-mono">
                                            <span className="font-black text-gray-800 text-sm">{formatDate(t.date)}</span>
                                            <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock size={12} /> {formatTime(t.date)}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 font-black text-[#0e3c63] text-base">{t.supplierName}</td>
                                    <td className="p-5 font-black text-gray-800 flex items-center gap-2">
                                        <Box size={14} className="text-blue-400" />
                                        {materialLabels[t.materialType!] || t.materialType}
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-[10px] font-black text-gray-600">
                                            <Globe size={12} /> {t.country || t.source || '-'}
                                        </div>
                                    </td>
                                    <td className="p-5 text-left font-mono font-black text-gray-800 text-base">${t.amount.toLocaleString()}</td>
                                    <td className="p-5 text-left font-mono font-black text-emerald-600 text-base">${(t.paidAmount || 0).toLocaleString()}</td>
                                    <td className="p-5 text-left pl-10 font-mono font-black text-red-600 text-lg group-hover:scale-105 transition-transform origin-left">
                                        ${(t.amount - (t.paidAmount || 0)).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControl page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={filteredTxs.length} />
            </Card>
        </div>
    );
};
