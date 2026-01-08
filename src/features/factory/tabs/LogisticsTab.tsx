
import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Container, Plus, Search, ArrowUpRight, ArrowDownLeft, MapPin, Globe, ShieldCheck, Clock, X, Hash, RotateCcw, AlertCircle, Ship, ListOrdered, Box, TrendingUp, CreditCard, Activity, Users, Lock, UserCheck, Edit3, Trash2, Filter, Banknote, History as HistoryIcon, AlertOctagon, XCircle, DollarSign, Wallet, TrendingDown, ArrowLeft } from 'lucide-react';
import { Button, Badge, DateRangePicker, Card } from '../../../components/ui';
import { db } from '../../../lib/db';
import { FactoryCategory, Supplier, FactoryTransaction, UserRole } from '../../../types';

import { formatDate } from '../../../lib/dateUtils';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { UserSelector } from '../../../components/shared/UserSelector';
import { materialLabels } from '../components/SharedFactoryComponents';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

interface LogisticsTabProps {
    refreshTrigger: number;
    onOpenModal: (category: any, metadata?: any) => void;
}

type LogisticsView = 'FROM_FACTORY' | 'TO_FACTORY' | 'CUSTOMS';

export const LogisticsTab = ({ refreshTrigger, onOpenModal }: LogisticsTabProps) => {
    const { user } = useAuth();
    const toast = useToast();
    const isAdmin = user?.role === UserRole.ADMIN;
    const [activeView, setActiveView] = useState<LogisticsView>('FROM_FACTORY');

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgentId, setSelectedAgentId] = useState<'ALL' | number>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'DEBT'>('ALL');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [actionModal, setActionModal] = useState<{ isOpen: boolean, tx: FactoryTransaction | null, type: 'DELETE' | 'LOCK' }>({
        isOpen: false,
        tx: null,
        type: 'DELETE'
    });

    const agents = useMemo(() => db.users.filter(u => u.role === UserRole.AGENT), []);

    useEffect(() => {
        setSearchTerm('');
        setSelectedAgentId('ALL');
        setStatusFilter('ALL');
        setPage(0);
    }, [activeView]);

    const handleExecuteAction = () => {
        if (actionModal.tx && user) {
            try {
                if (actionModal.type === 'DELETE') {
                    db.deleteFactoryTransaction(user.id, actionModal.tx.id);
                    toast.success('تم حذف السجل بنجاح');
                } else {
                    db.lockFactoryTransaction(user.id, actionModal.tx.id);
                    toast.success('تم قفل السجل نهائياً');
                }
                setActionModal({ isOpen: false, tx: null, type: 'DELETE' });
            } catch (err: any) {
                toast.error('فشل الإجراء', err.message);
            }
        }
    };

    const baseFilteredTxs = useMemo(() => {
        return db.getFactoryTransactions().filter(t => {
            let isInCategory = false;
            if (activeView === 'FROM_FACTORY') isInCategory = t.category === 'TRANSPORT_OUT';
            else if (activeView === 'TO_FACTORY') isInCategory = (t.category === 'TRANSPORT_IN' || t.category === 'SUPPLIER');
            else if (activeView === 'CUSTOMS') isInCategory = t.category === 'CUSTOMS';

            if (!isInCategory) return false;

            const txDate = new Date(t.date).setHours(0, 0, 0, 0);
            const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
            const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            if (txDate < start || txDate > end) return false;

            if (activeView === 'FROM_FACTORY' && selectedAgentId !== 'ALL') {
                if (t.agentId !== selectedAgentId) return false;
            }

            const searchLower = searchTerm.toLowerCase();
            const agentName = t.agentId ? (db.users.find(u => u.id === t.agentId)?.fullName || '') : '';
            const supplierName = t.supplierName || '';
            const brokerName = t.brokerName || '';
            const materialName = t.materialType ? (materialLabels[t.materialType] || t.materialType) : '';

            return (
                agentName.toLowerCase().includes(searchLower) ||
                supplierName.toLowerCase().includes(searchLower) ||
                brokerName.toLowerCase().includes(searchLower) ||
                materialName.toLowerCase().includes(searchLower) ||
                (t.notes || '').toLowerCase().includes(searchLower)
            );
        });
    }, [activeView, fromDate, toDate, searchTerm, selectedAgentId, refreshTrigger]);

    const summaryStats = useMemo(() => {
        const totalAmount = baseFilteredTxs.reduce((s, t) => s + t.amount, 0);
        const paidAmount = baseFilteredTxs.reduce((s, t) => s + (t.paidAmount || 0), 0);
        const paidCount = baseFilteredTxs.filter(t => t.amount === (t.paidAmount || 0)).length;
        const debtCount = baseFilteredTxs.filter(t => t.amount !== (t.paidAmount || 0)).length;
        return { total: { count: baseFilteredTxs.length, amount: totalAmount }, paid: { count: paidCount, amount: paidAmount }, debt: { count: debtCount, amount: totalAmount - paidAmount } };
    }, [baseFilteredTxs]);

    const finalFilteredTxs = useMemo(() => {
        if (statusFilter === 'ALL') return baseFilteredTxs;
        if (statusFilter === 'PAID') return baseFilteredTxs.filter(t => t.amount === (t.paidAmount || 0));
        if (statusFilter === 'DEBT') return baseFilteredTxs.filter(t => t.amount !== (t.paidAmount || 0));
        return baseFilteredTxs;
    }, [baseFilteredTxs, statusFilter]);

    const currentTxs = useMemo(() => finalFilteredTxs.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [finalFilteredTxs, page, rowsPerPage]);

    const hasPerm = (p: string) => user?.permissions?.includes(p as any);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm">
                    <button onClick={() => setActiveView('FROM_FACTORY')} className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-sm font-black transition-all ${activeView === 'FROM_FACTORY' ? 'bg-[#0e3c63] text-white shadow-xl' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}><ArrowUpRight size={20} />شحنات صادرة</button>
                    <button onClick={() => setActiveView('TO_FACTORY')} className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-sm font-black transition-all ${activeView === 'TO_FACTORY' ? 'bg-[#0e3c63] text-white shadow-xl' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}><ArrowDownLeft size={20} />شحنات واردة</button>
                    <button onClick={() => setActiveView('CUSTOMS')} className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-sm font-black transition-all ${activeView === 'CUSTOMS' ? 'bg-[#0e3c63] text-white shadow-xl' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}><Container size={20} />المخلص والكمرك</button>
                </div>
                {hasPerm('ADD_FACTORY_LOG') && (
                    <Button onClick={() => onOpenModal(activeView === 'FROM_FACTORY' ? 'TRANSPORT_OUT' : (activeView === 'TO_FACTORY' ? 'TRANSPORT_IN' : 'CUSTOMS'))} className="px-10 rounded-[1.5rem] bg-[#0e3c63] shadow-lg text-white font-black h-16 xl:h-auto"><Plus size={20} /> تسجيل عملية جديدة</Button>
                )}
            </div>

            {activeView !== 'FROM_FACTORY' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                    <button onClick={() => setStatusFilter('ALL')} className={`p-6 rounded-[2rem] border-2 text-right transition-all flex flex-col justify-between h-32 relative overflow-hidden group ${statusFilter === 'ALL' ? 'bg-[#0e3c63] border-[#0e3c63] text-white shadow-xl scale-[1.02]' : 'bg-white border-transparent shadow-sm'}`}><div className={`p-2 rounded-xl w-fit ${statusFilter === 'ALL' ? 'bg-white/10' : 'bg-blue-50 text-[#0e3c63]'}`}><HistoryIcon size={20} /></div><div><p className={`text-[10px] font-black uppercase mb-1 ${statusFilter === 'ALL' ? 'text-blue-200' : 'text-gray-400'}`}>إجمالي السجلات</p><div className="flex justify-between items-end"><h4 className="text-2xl font-black font-mono">${summaryStats.total.amount.toLocaleString()}</h4><Badge color={statusFilter === 'ALL' ? 'blue' : 'gray'}>{summaryStats.total.count}</Badge></div></div></button>
                    <button onClick={() => setStatusFilter('PAID')} className={`p-6 rounded-[2rem] border-2 text-right transition-all flex flex-col justify-between h-32 relative overflow-hidden group ${statusFilter === 'PAID' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.02]' : 'bg-white border-transparent shadow-sm'}`}><div className={`p-2 rounded-xl w-fit ${statusFilter === 'PAID' ? 'bg-white/10' : 'bg-emerald-50 text-emerald-600'}`}><ShieldCheck size={20} /></div><div><p className={`text-[10px] font-black uppercase mb-1 ${statusFilter === 'PAID' ? 'text-emerald-100' : 'text-gray-400'}`}>إجمالي المسدد</p><div className="flex justify-between items-end"><h4 className="text-2xl font-black font-mono">${summaryStats.paid.amount.toLocaleString()}</h4><Badge color={statusFilter === 'PAID' ? 'green' : 'gray'}>{summaryStats.paid.count}</Badge></div></div></button>
                    <button onClick={() => setStatusFilter('DEBT')} className={`p-6 rounded-[2rem] border-2 text-right transition-all flex flex-col justify-between h-32 relative overflow-hidden group ${statusFilter === 'DEBT' ? 'bg-red-600 border-red-600 text-white shadow-xl scale-[1.02]' : 'bg-white border-transparent shadow-sm'}`}><div className={`p-2 rounded-xl w-fit ${statusFilter === 'DEBT' ? 'bg-white/10' : 'bg-red-50 text-red-600'}`}><AlertCircle size={20} /></div><div><p className={`text-[10px] font-black uppercase mb-1 ${statusFilter === 'DEBT' ? 'text-red-100' : 'text-gray-400'}`}>دين بذمة المعمل</p><div className="flex justify-between items-end"><h4 className="text-2xl font-black font-mono">${summaryStats.debt.amount.toLocaleString()}</h4><Badge color={statusFilter === 'DEBT' ? 'red' : 'gray'}>{summaryStats.debt.count}</Badge></div></div></button>
                </div>
            )}

            <div className="bg-white p-3 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4">
                <div className="flex flex-col md:flex-row flex-1 w-full gap-3">
                    {activeView === 'FROM_FACTORY' && (
                        <div className="w-full md:w-64"><UserSelector users={agents} selectedUserId={selectedAgentId} onChange={(id) => { setSelectedAgentId(id); setPage(0); }} placeholder="اختيار الوكيل..." /></div>
                    )}
                    <div className="relative flex-1"><input className="w-full h-[54px] pl-11 pr-11 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner" placeholder="بحث..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }} /><Search className="absolute right-4 top-[18px] text-gray-400" size={18} /></div>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker from={fromDate} to={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
                    <button onClick={() => { setFromDate(''); setToDate(''); setStatusFilter('ALL'); }} className="p-3 bg-blue-50 text-[#0e3c63] rounded-2xl hover:bg-blue-100 border border-blue-100 transition-all"><RotateCcw size={20} /></button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-[3rem]">
                <div className="p-6 bg-gray-50/50 border-b flex justify-between items-center px-10">
                    <div className="flex items-center gap-2"><HistoryIcon size={18} className="text-gray-400" /><span className="text-xs font-black text-gray-500 uppercase tracking-widest">سجل العمليات التفصيلي</span></div>
                </div>
                <div className="overflow-x-auto min-h-[450px]">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] border-b">
                            <tr>
                                <th className="p-6 pr-10 w-12 text-center">#</th>
                                <th className="p-6">التاريخ</th>
                                <th className="p-6">التفاصيل</th>
                                <th className="p-6">الدولة / المصدر</th>
                                <th className="p-6 text-left">التكاليف / الواصل ($)</th>
                                <th className="p-6 text-center">الحالة</th>
                                <th className="p-6 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {currentTxs.length === 0 ? (
                                <tr><td colSpan={10} className="p-32 text-center text-gray-400 font-black italic opacity-30 flex flex-col items-center gap-4"><HistoryIcon size={64} /><p className="text-xl">لا توجد سجلات مطابقة</p></td></tr>
                            ) : currentTxs.map((t, idx) => {
                                const isLocked = t.isLocked;
                                const isFullyPaid = t.amount === (t.paidAmount || 0);
                                const canEditTx = hasPerm('EDIT_FACTORY_LOG') && (!isLocked || isAdmin);
                                const canDeleteTx = hasPerm('DELETE_FACTORY_LOG') && (!isLocked || isAdmin);
                                const canLockTx = hasPerm('LOCK_FACTORY_LOG') && !isLocked;

                                return (
                                    <tr key={t.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="p-6 pr-10 text-center font-mono font-black text-gray-400">#{idx + 1}</td>
                                        <td className="p-6">
                                            <div className="font-mono font-black text-gray-800 text-sm">{formatDate(t.date)}</div>
                                            {isLocked && <div className="inline-flex items-center gap-1 text-[8px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-black mt-1 uppercase"><Lock size={8} /> مقفل نهائياً</div>}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <div className="font-black text-gray-700">{activeView === 'FROM_FACTORY' ? db.users.find(u => u.id === t.agentId)?.fullName : t.supplierName || t.brokerName}</div>
                                                    {(activeView !== 'FROM_FACTORY' && t.materialType) && (
                                                        <div className="flex items-center gap-2 opacity-60">
                                                            <ArrowLeft size={14} className="text-gray-400" />
                                                            <span className="text-xs font-bold text-gray-600">{materialLabels[t.materialType] || t.materialType}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase">{t.notes || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-600 rounded-xl border border-gray-100 font-black text-[10px]">
                                                <Globe size={12} className="text-blue-400" />
                                                {t.source || t.country || (activeView === 'FROM_FACTORY' ? (t.province || 'محلي') : '-')}
                                            </div>
                                        </td>
                                        <td className="p-6 text-left font-mono font-black text-gray-700 text-lg">
                                            <div>${t.amount.toLocaleString()}</div>
                                            {t.paidAmount !== undefined && (
                                                <div className="text-[10px] text-emerald-600 font-bold mt-1">واصل: ${t.paidAmount.toLocaleString()}</div>
                                            )}
                                        </td>
                                        <td className="p-6 text-center">{isFullyPaid ? <Badge color="green">مسددة</Badge> : <Badge color="red">دين</Badge>}</td>
                                        <td className="p-6 text-center"><div className="flex items-center justify-center gap-2">{canEditTx && (<button onClick={() => onOpenModal(t.category, { tx: t })} className="p-2.5 bg-white text-blue-600 border border-gray-200 rounded-xl hover:bg-blue-50 shadow-sm"><Edit3 size={18} /></button>)}{!isFullyPaid && (<button onClick={() => onOpenModal('EDIT_FINANCE', { tx: t })} className="p-2.5 bg-white text-emerald-600 border border-gray-200 rounded-xl hover:bg-emerald-50 shadow-sm"><Banknote size={18} /></button>)}{canLockTx && (<button onClick={() => setActionModal({ isOpen: true, tx: t, type: 'LOCK' })} className="p-2.5 bg-white text-amber-600 border border-gray-200 rounded-xl hover:bg-amber-600 hover:text-white shadow-sm"><Lock size={18} /></button>)}{canDeleteTx && (<button onClick={() => setActionModal({ isOpen: true, tx: t, type: 'DELETE' })} className="p-2.5 bg-white text-red-500 border border-gray-200 rounded-xl hover:bg-red-500 hover:text-white shadow-sm"><Trash2 size={18} /></button>)}{isLocked && !isAdmin && (<div className="p-2.5 bg-gray-50 text-gray-300 border border-gray-100 rounded-xl"><Lock size={18} /></div>)}</div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div >
                <PaginationControl page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={finalFilteredTxs.length} />
            </Card >

            {
                actionModal.isOpen && actionModal.tx && (
                    <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                            <div className={`p-10 text-white text-center relative overflow-hidden bg-gradient-to-br ${actionModal.type === 'LOCK' ? 'from-amber-500 to-orange-700' : 'from-red-600 to-red-800'}`}><div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div><div className="relative z-10"><div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">{actionModal.type === 'LOCK' ? <Lock size={42} className="text-white animate-pulse" /> : <AlertOctagon size={42} className="text-white" />}</div><h3 className="text-2xl font-black mb-2">{actionModal.type === 'LOCK' ? 'تأكيد قفل الشحنة' : 'تأكيد حذف الشحنة'}</h3><p className="text-white/80 text-sm font-bold opacity-80">{actionModal.type === 'LOCK' ? 'سيتم منع أي تعديل مالي على هذه الشحنة بعد القفل.' : 'سيتم إزالة كافة السجلات المالية واللوجستية لهذه الشحنة.'}</p></div></div>
                            <div className="p-8 space-y-6"><div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4 text-right"><p className="font-black text-gray-800 text-lg">{actionModal.tx.supplierName || actionModal.tx.brokerName || 'شحنة صادرة'}</p><p className="font-mono font-black text-[#0e3c63] text-xl">${actionModal.tx.amount.toLocaleString()}</p></div><div className="flex flex-col gap-3"><Button onClick={handleExecuteAction} className={`w-full h-16 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all ${actionModal.type === 'LOCK' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}>{actionModal.type === 'LOCK' ? <Lock size={24} /> : <Trash2 size={24} />} نعم، تنفيذ الإجراء</Button><button onClick={() => setActionModal({ isOpen: false, tx: null, type: 'DELETE' })} className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200">إلغاء</button></div></div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
