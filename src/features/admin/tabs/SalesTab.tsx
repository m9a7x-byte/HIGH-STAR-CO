import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Search, Eye, ChevronDown, Users, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Card, DateRangePicker, UserAvatar } from '../../../components/ui';
import { UserSelector } from '../../../components/shared/UserSelector';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { db } from '../../../lib/db';
import { formatDate, formatTime } from '../../../lib/dateUtils';

export const SalesTab = ({ transactions, agents, isDateInRange, onNavigateToAgent, onViewOrder }: any) => {
    const [salesFromDate, setSalesFromDate] = useState('');
    const [salesToDate, setSalesToDate] = useState('');
    const [salesSelectedAgent, setSalesSelectedAgent] = useState<'ALL' | number>('ALL');
    const [financialSearch, setFinancialSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);

    const [salesPage, setSalesPage] = useState(0);
    const [salesRowsPerPage, setSalesRowsPerPage] = useState(10);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 400);
        return () => clearTimeout(timer);
    }, [salesFromDate, salesToDate, salesSelectedAgent, financialSearch, salesPage]);

    const contextTransactions = useMemo(() => {
        return transactions.filter((t: any) => {
            const agentMatch = salesSelectedAgent === 'ALL' || t.agentId === salesSelectedAgent;
            if (!agentMatch) return false;
            const dateMatch = isDateInRange(t.createdAt, salesFromDate, salesToDate);
            if (!dateMatch) return false;
            const agentName = db.users.find(u => u.id === t.agentId)?.fullName || '';
            const matchesSearch = agentName.includes(financialSearch) || t.description.includes(financialSearch);
            return matchesSearch;
        });
    }, [transactions, salesFromDate, salesToDate, salesSelectedAgent, financialSearch, isDateInRange]);

    const stats = useMemo(() => {
        const received = contextTransactions.filter((t: any) => t.amount >= 0).reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
        const billed = contextTransactions.filter((t: any) => t.amount < 0).reduce((acc: number, t: any) => acc + Math.abs(t.amount || 0), 0);
        return { received, billed, net: received - billed };
    }, [contextTransactions]);

    const currentTransactions = contextTransactions.slice(salesPage * salesRowsPerPage, (salesPage + 1) * salesRowsPerPage);

    // دالة ذكية لإيجاد الطلب المرتبط بالحركة المالية قبل عرضه
    const handleViewOrder = (transaction: any) => {
        const match = transaction.description.match(/#(\d+)/);
        if (match) {
            const orderId = parseInt(match[1]);
            const order = db.orders.find(o => o.id === orderId);
            if (order) {
                onViewOrder(order);
            } else {
                // إذا لم يكن طلباً (مثلاً تسديد يدوي)، لا نفعل شيئاً أو يمكن إظهار رسالة
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in w-full">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-white to-red-50">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-200"><TrendingDown size={28} /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-black uppercase mb-1">إجمالي المبيعات (دين)</p>
                            <h3 className="text-3xl font-black text-red-600 font-mono">${(stats.billed || 0).toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200"><TrendingUp size={28} /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-black uppercase mb-1">إجمالي الواصل (قبض)</p>
                            <h3 className="text-3xl font-black text-emerald-600 font-mono">${(stats.received || 0).toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 text-white rounded-2xl shadow-lg ${stats.net >= 0 ? 'bg-[#0e3c63]' : 'bg-red-900'}`}><DollarSign size={28} /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-black uppercase mb-1">صافي حركة الفترة</p>
                            <h3 className={`text-3xl font-black font-mono ${stats.net >= 0 ? 'text-[#0e3c63]' : 'text-red-800'}`}>${Math.abs(stats.net || 0).toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="bg-white p-3 md:p-4 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex justify-between items-center w-full md:w-auto px-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-sky-50 p-2.5 rounded-2xl text-[#0e3c63] border border-sky-100"><History size={22} /></div>
                        <h3 className="font-black text-sm md:text-xl text-gray-800 whitespace-nowrap">السجل المالي</h3>
                    </div>
                    <button onClick={() => setIsFilterCollapsed(!isFilterCollapsed)} className="md:hidden px-4 py-2 bg-gray-50 text-[#0e3c63] rounded-xl border border-gray-200 text-[11px] font-black">
                        {isFilterCollapsed ? 'تصفية' : 'إغلاق'} <ChevronDown size={14} className={`inline ${isFilterCollapsed ? '' : 'rotate-180'}`} />
                    </button>
                </div>
                <div className={`w-full md:flex md:flex-1 md:justify-end items-center gap-3 transition-all ${isFilterCollapsed ? 'hidden' : 'flex flex-col'}`}>
                    <div className="relative w-full md:flex-1 md:max-w-md">
                        <input className="w-full h-[54px] pl-4 pr-11 bg-gray-50 border-2 border-transparent rounded-[1.2rem] text-sm font-black focus:bg-white focus:border-[#0e3c63] outline-none transition-all shadow-inner" placeholder="بحث..." value={financialSearch} onChange={e => { setFinancialSearch(e.target.value); setSalesPage(0); }} />
                        <Search className="absolute right-4 top-[18px] text-gray-400" size={18} />
                    </div>
                    <div className="w-full md:w-56 shrink-0"><UserSelector users={agents} selectedUserId={salesSelectedAgent} onChange={(v: any) => { setSalesSelectedAgent(v); setSalesPage(0); }} placeholder="كل الوكلاء" /></div>
                    <div className="w-full md:w-auto shrink-0"><DateRangePicker from={salesFromDate} to={salesToDate} onChangeFrom={(d: any) => { setSalesFromDate(d); setSalesPage(0); }} onChangeTo={(d: any) => { setSalesToDate(d); setSalesPage(0); }} /></div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col w-full">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="p-5 pr-10">التاريخ والوقت</th>
                                <th className="p-5">الوكيل / المكتب</th>
                                <th className="p-5">البيان</th>
                                <th className="p-5 text-left">المبلغ ($)</th>
                                <th className="p-5 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="p-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td></tr>) : currentTransactions.map((t: any) => {
                                const isPositive = t.amount >= 0;
                                const hasOrder = t.description.includes('#');
                                const agent = db.users.find(u => u.id === t.agentId);

                                return (
                                    <tr key={t.id} className="hover:bg-blue-50/30 transition-all group">
                                        <td className="p-5 pr-10">
                                            <div className="flex flex-col font-mono">
                                                <span className="font-black text-gray-800 text-xs">{formatDate(t.createdAt)}</span>
                                                <span className="text-[10px] text-gray-400">{formatTime(t.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <button onClick={() => onNavigateToAgent(t.agentId)} className="font-black text-gray-900 hover:text-sky-600 transition-colors flex items-center gap-2">
                                                <UserAvatar
                                                    name={agent?.fullName || 'غير معروف'}
                                                    avatarPath={agent?.avatar_path}
                                                    avatarUrl={agent?.imageUrl}
                                                    size="sm"
                                                    className="w-8 h-8"
                                                />
                                                {agent?.fullName || 'غير معروف'}
                                            </button>
                                        </td>
                                        <td className="p-5 font-bold text-gray-600 text-xs">{t.description}</td>
                                        <td className={`p-5 text-left font-mono font-black text-lg ${isPositive ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                                            {isPositive ? '+' : ''}{(t.amount || 0).toLocaleString()}
                                            <span className={`block text-[9px] uppercase tracking-tighter mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>{isPositive ? 'قبض' : 'دين'}</span>
                                        </td>
                                        <td className="p-5 text-center">
                                            {hasOrder && (
                                                <button onClick={() => handleViewOrder(t)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-sky-600 hover:bg-white hover:shadow-md transition-all" title="معاينة الطلب"><Eye size={16} /></button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50/50">
                    {/* FIX: Use setSalesRowsPerPage instead of undefined setRowsPerPage */}
                    <PaginationControl page={salesPage} rowsPerPage={salesRowsPerPage} setPage={setSalesPage} setRowsPerPage={setSalesRowsPerPage} totalItems={contextTransactions.length} />
                </div>
            </div>
        </div>
    );
};