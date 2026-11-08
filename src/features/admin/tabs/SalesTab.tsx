import i18n from 'i18next';
const t = i18n.t.bind(i18n);
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
        return transactions.filter((tx: any) => {
            const agentMatch = salesSelectedAgent === 'ALL' || tx.agentId === salesSelectedAgent;
            if (!agentMatch) return false;
            const dateMatch = isDateInRange(tx.createdAt, salesFromDate, salesToDate);
            if (!dateMatch) return false;
            const agentName = db.users.find(u => u.id === tx.agentId)?.fullName || '';
            const matchesSearch = agentName.includes(financialSearch) || tx.description.includes(financialSearch);
            return matchesSearch;
        });
    }, [transactions, salesFromDate, salesToDate, salesSelectedAgent, financialSearch, isDateInRange]);

    const stats = useMemo(() => {
        const received = contextTransactions.filter((tx: any) => tx.amount >= 0).reduce((acc: number, tx: any) => acc + (tx.amount || 0), 0);
        const billed = contextTransactions.filter((tx: any) => tx.amount < 0).reduce((acc: number, tx: any) => acc + Math.abs(tx.amount || 0), 0);
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

    const translateDesc = (desc: string) => {
        if (!desc) return '';
        let res = desc;
        res = res.replace('تنزيل فاتورة', t('batch4.tx_desc_1', 'تنزيل فاتورة'));
        res = res.replace('تسديد دفعة للطلب', t('batch4.tx_desc_10', 'تسديد دفعة للطلب'));
        res = res.replace('تسديد رصيد يدوي', t('batch4.tx_desc_2', 'تسديد رصيد يدوي'));
        res = res.replace('إضافة رصيد يدوي', t('batch4.tx_desc_3', 'إضافة رصيد يدوي'));
        res = res.replace('استقطاع رصيد متبقي', t('batch4.tx_desc_6', 'استقطاع رصيد متبقي'));
        res = res.replace('تسوية حساب سالب', t('batch4.tx_desc_8', 'تسوية حساب سالب'));
        res = res.replace('استقطاع', t('batch4.tx_desc_7', 'استقطاع'));
        res = res.replace('شراء طلبية', t('batch4.tx_desc_4', 'شراء طلبية'));
        res = res.replace('طلبية', t('batch4.tx_desc_5', 'طلبية'));
        res = res.replace('دفعة', t('batch4.tx_desc_9', 'دفعة'));
        return res;
    };

    return (
        <div className="space-y-6 animate-fade-in w-full">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-white to-red-50">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-200"><TrendingDown size={28} /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-black uppercase mb-1">{t('batch4.k486')}</p>
                            <h3 className="text-3xl font-black text-red-600 font-mono">${(stats.billed || 0).toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200"><TrendingUp size={28} /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-black uppercase mb-1">{t('batch4.k487')}</p>
                            <h3 className="text-3xl font-black text-emerald-600 font-mono">${(stats.received || 0).toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 text-white rounded-2xl shadow-lg ${stats.net >= 0 ? 'bg-[#0e3c63]' : 'bg-red-900'}`}><DollarSign size={28} /></div>
                        <div>
                            <p className="text-gray-500 text-xs font-black uppercase mb-1">{t('batch4.k488')}</p>
                            <h3 className={`text-3xl font-black font-mono ${stats.net >= 0 ? 'text-[#0e3c63]' : 'text-red-800'}`}>${Math.abs(stats.net || 0).toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="bg-white p-3 md:p-4 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex justify-between items-center w-full md:w-auto px-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-sky-50 p-2.5 rounded-2xl text-[#0e3c63] border border-sky-100"><History size={22} /></div>
                        <h3 className="font-black text-sm md:text-xl text-gray-800 whitespace-nowrap">{t('batch4.k489')}</h3>
                    </div>
                    <button onClick={() => setIsFilterCollapsed(!isFilterCollapsed)} className="md:hidden px-4 py-2 bg-gray-50 text-[#0e3c63] rounded-xl border border-gray-200 text-[11px] font-black">
                        {isFilterCollapsed ? t('batch4.txt_filter_open') : t('batch4.txt_filter_close')} <ChevronDown size={14} className={`inline ${isFilterCollapsed ? '' : 'rotate-180'}`} />
                    </button>
                </div>
                <div className={`w-full md:flex md:flex-1 md:justify-end items-center gap-3 transition-all ${isFilterCollapsed ? 'hidden' : 'flex flex-col'}`}>
                    <div className="relative w-full md:flex-1 md:max-w-md">
                        <input className="w-full h-[54px] pl-4 pr-11 bg-gray-50 border-2 border-transparent rounded-[1.2rem] text-sm font-black focus:bg-white focus:border-[#0e3c63] outline-none transition-all shadow-inner" placeholder={t('batch4.k190')} value={financialSearch} onChange={e => { setFinancialSearch(e.target.value); setSalesPage(0); }} />
                        <Search className="absolute right-4 top-[18px] text-gray-400" size={18} />
                    </div>
                    <div className="w-full md:w-56 shrink-0"><UserSelector users={agents} selectedUserId={salesSelectedAgent} onChange={(v: any) => { setSalesSelectedAgent(v); setSalesPage(0); }} placeholder={t('batch4.k427')} /></div>
                    <div className="w-full md:w-auto shrink-0"><DateRangePicker from={salesFromDate} to={salesToDate} onChangeFrom={(d: any) => { setSalesFromDate(d); setSalesPage(0); }} onChangeTo={(d: any) => { setSalesToDate(d); setSalesPage(0); }} /></div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col w-full">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="p-5 pr-10">{t('batch4.k490')}</th>
                                <th className="p-5">{t('batch4.k491')}</th>
                                <th className="p-5">{t('batch4.k492')}</th>
                                <th className="p-5 text-left">{t('batch4.k276')}</th>
                                <th className="p-5 text-center">{t('batch4.k207')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="p-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td></tr>) : currentTransactions.map((tx: any) => {
                                const isPositive = tx.amount >= 0;
                                const hasOrder = tx.description.includes('#');
                                const agent = db.users.find(u => u.id === tx.agentId);

                                return (
                                    <tr key={tx.id} className="hover:bg-blue-50/30 transition-all group">
                                        <td className="p-5 pr-10">
                                            <div className="flex flex-col font-mono">
                                                <span className="font-black text-gray-800 text-xs">{formatDate(tx.createdAt)}</span>
                                                <span className="text-[10px] text-gray-400">{formatTime(tx.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <button onClick={() => onNavigateToAgent(tx.agentId)} className="font-black text-gray-900 hover:text-sky-600 transition-colors flex items-center gap-2">
                                                <UserAvatar
                                                    name={agent?.fullName || t('batch4.txt_unknown')}
                                                    avatarPath={agent?.avatar_path}
                                                    avatarUrl={agent?.imageUrl}
                                                    size="sm"
                                                    className="w-8 h-8"
                                                />
                                                {agent?.fullName || t('batch4.txt_unknown')}
                                            </button>
                                        </td>
                                        <td className="p-5 font-bold text-gray-600 text-xs">{translateDesc(tx.description)}</td>
                                        <td className={`p-5 text-left font-mono font-black text-lg ${isPositive ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                                            {isPositive ? '+' : ''}{(tx.amount || 0).toLocaleString()}
                                            <span className={`block text-[9px] uppercase tracking-tighter mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>{isPositive ? t('batch4.txt_receipt') : t('batch4.txt_debt')}</span>
                                        </td>
                                        <td className="p-5 text-center">
                                            {hasOrder && (
                                                <button onClick={() => handleViewOrder(tx)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-sky-600 hover:bg-white hover:shadow-md transition-all" title={t('batch4.k493')}><Eye size={16} /></button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50/50">
                    <PaginationControl page={salesPage} rowsPerPage={salesRowsPerPage} setPage={setSalesPage} setRowsPerPage={setSalesRowsPerPage} totalItems={contextTransactions.length} />
                </div>
            </div>
        </div>
    );
};