import { useTranslation } from 'react-i18next';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DollarSign, Box, Utensils, Zap, TrendingDown, Filter, Plus, Calendar, ChevronDown, Check, Clock, Coffee, Sun, Moon, X, RotateCcw, Edit3, Trash2, Lock, Unlock, AlertOctagon, ArrowLeft } from 'lucide-react';
import { formatDate, formatTime, getFirstDayOfMonthString, getTodayDateString } from '../../../lib/dateUtils';
import { Card, Badge, DateRangePicker, Button } from '../../../components/ui';
import { db } from '../../../lib/db';
import { FactoryCategory, FactoryTransaction, UserRole } from '../../../types';
import { MONTHS_AR } from '../components/SharedFactoryComponents';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

interface ExpensesTabProps {
    refreshTrigger: number;
    onOpenModal: (category: FactoryCategory, metadata?: any) => void;
}

const categories: { id: FactoryCategory, labelKey: string, icon: any, color: string }[] = [
    { id: 'SALARY', labelKey: 'expenses_tab.fact_exp_salary', icon: DollarSign, color: 'text-green-600 bg-green-50 border-green-100' },
    { id: 'RENT', labelKey: 'expenses_tab.fact_exp_rent', icon: Box, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { id: 'FOOD', labelKey: 'expenses_tab.fact_exp_food', icon: Utensils, color: 'text-orange-600 bg-orange-50 border-orange-100' },
    { id: 'ELECTRICITY', labelKey: 'expenses_tab.fact_exp_elec', icon: Zap, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
    { id: 'DAILY_EXPENSE', labelKey: 'expenses_tab.fact_exp_daily', icon: TrendingDown, color: 'text-red-600 bg-red-50 border-red-100' },
];

export const ExpensesTab = ({ refreshTrigger, onOpenModal }: ExpensesTabProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();
    const isAdmin = user?.role === UserRole.ADMIN;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [fromDate, setFromDate] = useState(() => getFirstDayOfMonthString());
    const [toDate, setToDate] = useState(() => getTodayDateString());
    const [selectedCat, setSelectedCat] = useState<FactoryCategory | 'ALL'>('ALL');

    const [confirmAction, setConfirmAction] = useState<{ type: 'DELETE' | 'LOCK', tx: FactoryTransaction | null }>({ type: 'DELETE', tx: null });

    const filteredTxs = useMemo(() => {
        return db.getFactoryTransactions().filter(tx => {
            const isExpense = categories.some(c => c.id === tx.category);
            if (!isExpense) return false;

            if (selectedCat !== 'ALL' && tx.category !== selectedCat) return false;

            const txDate = new Date(tx.date).setHours(0, 0, 0, 0);
            const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
            const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            return txDate >= start && txDate <= end;
        });
    }, [refreshTrigger, fromDate, toDate, selectedCat]);

    const currentTxs = useMemo(() => filteredTxs.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [filteredTxs, page, rowsPerPage]);

    const expenseTotalsByDate = useMemo(() => {
        const totals: Record<string, number> = {};
        categories.forEach(cat => totals[cat.id] = 0);
        db.getFactoryTransactions().forEach(tx => {
            const txDate = new Date(tx.date).setHours(0, 0, 0, 0);
            const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
            const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            if (txDate >= start && txDate <= end && totals[tx.category] !== undefined) {
                totals[tx.category] += tx.amount;
            }
        });
        return totals;
    }, [refreshTrigger, fromDate, toDate]);

    const handleExecuteAction = () => {
        if (!confirmAction.tx || !user) return;
        try {
            if (confirmAction.type === 'DELETE') {
                db.deleteFactoryTransaction(user.id, confirmAction.tx.id);
                toast.success(t('expenses_tab.fact_exp_del_succ'));
            } else if (confirmAction.type === 'LOCK') {
                db.lockFactoryTransaction(user.id, confirmAction.tx.id);
                toast.success(t('expenses_tab.fact_exp_lock_succ'));
            }
            setConfirmAction({ type: 'DELETE', tx: null });
        } catch (err: any) { toast.error(t('expenses_tab.fact_exp_err'), err.message); }
    };

    const getMealIcon = (meal: string) => {
        if (meal === 'فطور') return <Coffee size={14} className="text-amber-500" />;
        if (meal === 'غداء') return <Sun size={14} className="text-orange-500" />;
        if (meal === 'عشاء') return <Moon size={14} className="text-indigo-500" />;
        return null;
    };

    const hasPerm = (p: string) => user?.permissions?.includes(p as any);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 sticky top-0 z-20">
                <div className="px-2">
                    <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                        <DollarSign size={24} className="text-emerald-600" />
                        {t('expenses_tab.fact_exp_title')}
                    </h3>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker from={fromDate} to={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
                    {selectedCat !== 'ALL' && (
                        <button onClick={() => { setSelectedCat('ALL'); setPage(0); }} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 border border-red-100 transition-all flex items-center gap-2 text-xs font-black"><X size={18} /> {t('expenses_tab.fact_exp_clear')}</button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map(cat => (
                    <div key={cat.id} onClick={() => { setSelectedCat(cat.id); setPage(0); }} className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer group relative ${selectedCat === cat.id ? 'ring-2 ring-[#0e3c63] border-transparent shadow-lg transform -translate-y-1' : 'border-gray-100 hover:border-blue-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2.5 rounded-2xl border ${cat.color}`}><cat.icon size={20} /></div>
                            {hasPerm('ADD_FACTORY_EXP') && <button onClick={(e) => { e.stopPropagation(); onOpenModal(cat.id); }} className="w-8 h-8 rounded-full bg-[#0e3c63] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all opacity-0 group-hover:opacity-100"><Plus size={16} /></button>}
                        </div>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">{t(cat.labelKey)}</p>
                        <h4 className="text-2xl font-black font-mono tracking-tighter text-gray-800">${expenseTotalsByDate[cat.id]?.toLocaleString() || 0}</h4>
                    </div>
                ))}
            </div>

            <Card className="p-0 overflow-hidden border border-gray-100 shadow-xl rounded-[2.5rem]">
                <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center px-10">
                    <h3 className="font-black text-gray-700 flex items-center gap-2"><Calendar size={18} className="text-gray-400" />{t('expenses_tab.fact_exp_log')}</h3>
                    <Badge color="gray" className="font-black">{filteredTxs.length} {t('expenses_tab.fact_exp_count')}</Badge>
                </div>
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="p-5 pr-10">{t('expenses_tab.fact_exp_col_date')}</th>
                                <th className="p-5">{t('expenses_tab.fact_exp_col_cat')}</th>
                                <th className="p-5">{t('expenses_tab.fact_exp_col_note')}</th>
                                <th className="p-5 text-left">{t('expenses_tab.fact_exp_col_amt')}</th>
                                <th className="p-5 text-center">{t('expenses_tab.fact_exp_col_action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentTxs.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-gray-400 font-bold italic">{t('expenses_tab.fact_exp_empty')}</td></tr>
                            ) : currentTxs.map(tx => {
                                const isMonthly = tx.category === 'SALARY' || tx.category === 'RENT';
                                const d = new Date(tx.date);
                                const isLocked = tx.isLocked;
                                const canEditTx = hasPerm('EDIT_FACTORY_EXP') && (!isLocked || isAdmin);
                                const canDeleteTx = hasPerm('DELETE_FACTORY_EXP') && (!isLocked || isAdmin);
                                const canLockTx = hasPerm('LOCK_FACTORY_EXP') && !isLocked;

                                return (
                                    <tr key={tx.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="p-5 pr-10">
                                            <div className="flex flex-col font-mono">
                                                {isMonthly ? <span className="font-black text-gray-800 text-sm">{MONTHS_AR[d.getMonth()]} ({d.getMonth() + 1}) {d.getFullYear()}</span> : <><span className="font-black text-gray-800 text-sm">{formatDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock size={12} /> {formatTime(d)}</span></>}
                                            </div>
                                        </td>
                                        <td className="p-5 font-black text-[#0e3c63]">
                                            <div className="flex items-center flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    {(() => { const found = categories.find(c => c.id === tx.category); return found ? t(found.labelKey) : tx.category; })()}
                                                    {isLocked && <Lock size={12} className="text-amber-500" />}
                                                </div>

                                                {(tx.subType || tx.category === 'FOOD') && (
                                                    <div className="flex items-center gap-2 opacity-60">
                                                        <ArrowLeft size={14} className="text-gray-400" />
                                                        {tx.category === 'FOOD' ? (
                                                            <div className="flex items-center gap-1.5">
                                                                {getMealIcon(tx.subType)}
                                                                <span className="text-xs font-bold text-gray-600">{t('expenses_tab.fact_exp_meal')} {tx.subType === 'فطور' ? t('expenses_tab.fact_exp_bfast') : tx.subType === 'غداء' ? t('expenses_tab.fact_exp_lunch') : t('expenses_tab.fact_exp_dinner')}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-bold text-gray-600">{tx.subType}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-gray-600 font-bold text-xs max-w-[250px] truncate">{tx.notes || '-'}</td>
                                        <td className="p-5 text-left font-mono font-black text-red-600 text-lg group-hover:scale-105 transition-transform origin-left">${tx.amount.toLocaleString()}</td>
                                        <td className="p-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {canEditTx && <button onClick={() => onOpenModal(tx.category, { tx })} className="p-2.5 bg-white text-blue-600 border border-gray-200 rounded-xl hover:bg-blue-50 shadow-sm"><Edit3 size={18} /></button>}
                                                {canLockTx && <button onClick={() => setConfirmAction({ type: 'LOCK', tx })} className="p-2.5 bg-white text-amber-600 border border-gray-200 rounded-xl hover:bg-amber-600 hover:text-white shadow-sm"><Lock size={18} /></button>}
                                                {canDeleteTx && <button onClick={() => setConfirmAction({ type: 'DELETE', tx })} className="p-2.5 bg-white text-red-500 border border-gray-200 rounded-xl hover:bg-red-500 hover:text-white shadow-sm"><Trash2 size={18} /></button>}
                                                {isLocked && !isAdmin && <div className="p-2.5 bg-gray-50 text-gray-300 border border-gray-100 rounded-xl"><Lock size={18} /></div>}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <PaginationControl page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={filteredTxs.length} />
            </Card>

            {/* نافذة تأكيد ال{t('expenses_tab.fact_exp_col_action')} */}
            {confirmAction.tx && (
                <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                        <div className={`p-10 text-white text-center relative overflow-hidden bg-gradient-to-br ${confirmAction.type === 'LOCK' ? 'from-amber-500 to-orange-700' : 'from-red-600 to-red-800'}`}>
                            <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">{confirmAction.type === 'LOCK' ? <Lock size={42} className="text-white animate-pulse" /> : <AlertOctagon size={42} className="text-white" />}</div>
                                <h3 className="text-2xl font-black mb-2">{confirmAction.type === 'LOCK' ? t('expenses_tab.fact_exp_lock_title') : t('expenses_tab.fact_exp_del_title')}</h3>
                                <p className="text-white/80 text-sm font-bold opacity-80">{confirmAction.type === 'LOCK' ? t('expenses_tab.fact_exp_lock_desc') : t('expenses_tab.fact_exp_del_desc')}</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4 text-right">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('expenses_tab.fact_exp_rec_data')}</p><p className="font-black text-gray-800 text-lg">{categories.find(c => c.id === confirmAction.tx?.category)?.labelKey ? t(categories.find(c => c.id === confirmAction.tx?.category)!.labelKey) : confirmAction.tx?.category}: ${confirmAction.tx?.amount.toLocaleString()}</p><p className="text-xs text-gray-500 font-bold">{formatDate(confirmAction.tx!.date)}</p></div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button onClick={handleExecuteAction} className={`w-full h-16 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all ${confirmAction.type === 'LOCK' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}>{confirmAction.type === 'LOCK' ? <Lock size={24} /> : <Trash2 size={24} />} {confirmAction.type === 'LOCK' ? t('expenses_tab.fact_exp_yes_lock') : t('expenses_tab.fact_exp_yes_del')}</Button>
                                <button onClick={() => setConfirmAction({ type: 'DELETE', tx: null })} className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200">{t('expenses_tab.fact_exp_cancel')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
