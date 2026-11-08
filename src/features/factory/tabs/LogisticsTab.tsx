
import { useTranslation } from 'react-i18next';

import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Container, Plus, Search, ArrowUpRight, ArrowDownLeft, MapPin, Globe, ShieldCheck, Clock, X, Hash, RotateCcw, AlertCircle, Ship, ListOrdered, Box, TrendingUp, CreditCard, Activity, Users, Lock, UserCheck, Edit3, Trash2, Filter, Banknote, History as HistoryIcon, AlertOctagon, XCircle, DollarSign, Wallet, TrendingDown, ArrowLeft } from 'lucide-react';
import { Button, Badge, DateRangePicker, Card, UserAvatar } from '../../../components/ui';
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
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();
    const isAdmin = user?.role === UserRole.ADMIN;
    const provinceDisplay = (val: string) => {
        const key = 'provinces.' + val;
        const translated = t(key);
        return translated !== key ? translated : val;
    };
    const countryDisplay = (val: string) => {
        const map: Record<string, string> = {
            '🇮🇶 العراق': t('logistics.country_iraq'),
            '🇹🇷 تركيا': t('logistics.country_turkey'),
            '🇮🇷 ايران': t('logistics.country_iran'),
        };
        return map[val] || val;
    };
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
                    toast.success(t('logistics.log_del_ok'));
                } else {
                    db.lockFactoryTransaction(user.id, actionModal.tx.id);
                    toast.success(t('logistics.log_lock_ok'));
                }
                setActionModal({ isOpen: false, tx: null, type: 'DELETE' });
            } catch (err: any) {
                toast.error(t('logistics.log_action_fail'), err.message);
            }
        }
    };

    const baseFilteredTxs = useMemo(() => {
        return db.getFactoryTransactions().filter(tx => {
            let isInCategory = false;
            if (activeView === 'FROM_FACTORY') isInCategory = tx.category === 'TRANSPORT_OUT';
            else if (activeView === 'TO_FACTORY') isInCategory = (tx.category === 'TRANSPORT_IN' || tx.category === 'SUPPLIER');
            else if (activeView === 'CUSTOMS') isInCategory = tx.category === 'CUSTOMS';

            if (!isInCategory) return false;

            const txDate = new Date(tx.date).setHours(0, 0, 0, 0);
            const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
            const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            if (txDate < start || txDate > end) return false;

            if (activeView === 'FROM_FACTORY' && selectedAgentId !== 'ALL') {
                if (tx.agentId !== selectedAgentId) return false;
            }

            const searchLower = searchTerm.toLowerCase();
            const agentName = tx.agentId ? (db.users.find(u => u.id === tx.agentId)?.fullName || '') : '';
            const supplierName = tx.supplierName || '';
            const brokerName = tx.brokerName || '';
            const materialName = tx.materialType ? (t(materialLabels[tx.materialType] || tx.materialType)) : '';
            const invoiceNumber = `INV #${(Number(tx.id) % 10000).toString().padStart(4, '0')}`.toLowerCase();

            return (
                invoiceNumber.includes(searchLower) ||
                agentName.toLowerCase().includes(searchLower) ||
                supplierName.toLowerCase().includes(searchLower) ||
                brokerName.toLowerCase().includes(searchLower) ||
                materialName.toLowerCase().includes(searchLower) ||
                (tx.notes || '').toLowerCase().includes(searchLower)
            );
        });
    }, [activeView, fromDate, toDate, searchTerm, selectedAgentId, refreshTrigger]);

    const summaryStats = useMemo(() => {
        const totalAmount = baseFilteredTxs.reduce((s, tx) => s + tx.amount, 0);
        return { total: { count: baseFilteredTxs.length, amount: totalAmount } };
    }, [baseFilteredTxs]);

    const finalFilteredTxs = useMemo(() => {
        return baseFilteredTxs;
    }, [baseFilteredTxs]);

    const currentTxs = useMemo(() => finalFilteredTxs.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [finalFilteredTxs, page, rowsPerPage]);

    const hasPerm = (p: string) => user?.permissions?.includes(p as any);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm">
                    <button onClick={() => setActiveView('FROM_FACTORY')} className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-sm font-black transition-all ${activeView === 'FROM_FACTORY' ? 'bg-[#0e3c63] text-white shadow-xl' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}><ArrowUpRight size={20} />{t('logistics.log_outbound')}</button>
                    <button onClick={() => setActiveView('TO_FACTORY')} className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-sm font-black transition-all ${activeView === 'TO_FACTORY' ? 'bg-[#0e3c63] text-white shadow-xl' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}><ArrowDownLeft size={20} />{t('logistics.log_inbound')}</button>
                    <button onClick={() => setActiveView('CUSTOMS')} className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-sm font-black transition-all ${activeView === 'CUSTOMS' ? 'bg-[#0e3c63] text-white shadow-xl' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}><Container size={20} />{t('logistics.log_customs')}</button>
                </div>
                {hasPerm('ADD_FACTORY_LOG') && (
                    <Button onClick={() => onOpenModal(activeView === 'FROM_FACTORY' ? 'TRANSPORT_OUT' : (activeView === 'TO_FACTORY' ? 'TRANSPORT_IN' : 'CUSTOMS'))} className="px-10 rounded-[1.5rem] bg-[#0e3c63] shadow-lg text-white font-black h-16 xl:h-auto"><Plus size={20} /> {t('logistics.log_register_op')}</Button>
                )}
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#0e3c63] text-white rounded-2xl shadow-md"><DollarSign size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('logistics.log_total_records')}</p>
                        <h4 className="text-3xl font-black font-mono text-gray-800">${summaryStats.total.amount.toLocaleString()}</h4>
                    </div>
                </div>
                <Badge color="blue" className="text-sm px-4 py-2">{summaryStats.total.count} {t('logistics.log_op_log')}</Badge>
            </div>

            <div className="bg-white p-3 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4">
                <div className="flex flex-col md:flex-row flex-1 w-full gap-3">
                    {activeView === 'FROM_FACTORY' && (
                        <div className="w-full md:w-64"><UserSelector users={agents} selectedUserId={selectedAgentId} onChange={(id) => { setSelectedAgentId(id); setPage(0); }} placeholder={t('logistics.log_agent_ph')} /></div>
                    )}
                    <div className="relative flex-1"><input className="w-full h-[54px] pl-11 pr-11 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner" placeholder={t('logistics.log_search')} value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }} /><Search className="absolute right-4 top-[18px] text-gray-400" size={18} /></div>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker from={fromDate} to={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
                    <button onClick={() => { setFromDate(''); setToDate(''); setStatusFilter('ALL'); }} className="p-3 bg-blue-50 text-[#0e3c63] rounded-2xl hover:bg-blue-100 border border-blue-100 transition-all"><RotateCcw size={20} /></button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-[3rem]">
                <div className="p-6 bg-gray-50/50 border-b flex justify-between items-center px-10">
                    <div className="flex items-center gap-2"><HistoryIcon size={18} className="text-gray-400" /><span className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('logistics.log_op_log')}</span></div>
                </div>
                <div className="overflow-x-auto min-h-[450px]">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] border-b">
                            <tr>
                                <th className="p-6 pr-10 w-12 text-center">#</th>
                                <th className="p-6 text-center">INV</th>
                                <th className="p-6">{t('logistics.log_th_date')}</th>
                                <th className="p-6">{t('logistics.log_th_details')}</th>
                                <th className="p-6">{t('logistics.log_th_country')}</th>
                                <th className="p-6 text-left">{t('logistics.log_th_costs')}</th>
                                <th className="p-6">{t('logistics.log_th_created_by')}</th>
                                <th className="p-6 text-center">{t('logistics.log_th_action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {currentTxs.length === 0 ? (
                                <tr><td colSpan={8} className="p-32 text-center text-gray-400 font-black italic opacity-30 flex flex-col items-center gap-4"><HistoryIcon size={64} /><p className="text-xl">{t('logistics.log_no_records')}</p></td></tr>
                            ) : currentTxs.map((tx, idx) => {
                                const isLocked = tx.isLocked;
                                const isFullyPaid = tx.amount === (tx.paidAmount || 0);
                                const canEditTx = hasPerm('EDIT_FACTORY_LOG') && (!isLocked || isAdmin);
                                const canDeleteTx = hasPerm('DELETE_FACTORY_LOG') && (!isLocked || isAdmin);
                                const canLockTx = hasPerm('LOCK_FACTORY_LOG') && !isLocked;

                                return (
                                    <tr key={tx.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="p-6 pr-10 text-center font-mono font-black text-gray-400">#{idx + 1}</td>
                                        <td className="p-6 text-center">
                                            <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-blue-50 text-[#0e3c63] border border-blue-100 font-mono font-black text-[11px]">
                                                INV #{(Number(tx.id) % 10000).toString().padStart(4, '0')}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-mono font-black text-gray-800 text-sm">{formatDate(tx.date)}</div>
                                            {isLocked && <div className="inline-flex items-center gap-1 text-[8px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-black mt-1 uppercase"><Lock size={8} /> {t('logistics.log_locked')}</div>}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <div className="font-black text-gray-700">{activeView === 'FROM_FACTORY' ? db.users.find(u => u.id === tx.agentId)?.fullName : tx.supplierName || tx.brokerName}</div>
                                                    {(activeView !== 'FROM_FACTORY' && tx.materialType) && (
                                                        <div className="flex items-center gap-2 opacity-60">
                                                            <ArrowLeft size={14} className="text-gray-400" />
                                                            <span className="text-xs font-bold text-gray-600">{t(materialLabels[tx.materialType] || tx.materialType)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase">{tx.notes || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-600 rounded-xl border border-gray-100 font-black text-[10px]">
                                                <Globe size={12} className="text-blue-400" />
                                                {countryDisplay(tx.source || tx.country || '') || (activeView === 'FROM_FACTORY' ? (tx.province ? provinceDisplay(tx.province) : t('logistics.log_local')) : '-')}
                                            </div>
                                        </td>
                                        <td className="p-6 text-left font-mono font-black text-gray-700 text-lg">
                                            <div>${tx.amount.toLocaleString()}</div>
                                        </td>
                                        <td className="p-6">
                                            {(() => {
                                                const staffUser = db.users.find(u => u.fullName === tx.withdrawnBy);
                                                return (
                                                    <div className="flex items-center gap-2.5">
                                                        <UserAvatar
                                                            name={tx.withdrawnBy || '?'}
                                                            avatarPath={staffUser?.avatar_path}
                                                            avatarUrl={staffUser?.avatar_url}
                                                            size="sm"
                                                            className="border-2 border-white shadow-sm"
                                                        />
                                                        <span className="text-xs font-black text-gray-600">{tx.withdrawnBy || '-'}</span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-6 text-center"><div className="flex items-center justify-center gap-2">{canEditTx && (<button onClick={() => onOpenModal(tx.category, { tx: tx })} className="p-2.5 bg-white text-blue-600 border border-gray-200 rounded-xl hover:bg-blue-50 shadow-sm"><Edit3 size={18} /></button>)}{canLockTx && (<button onClick={() => setActionModal({ isOpen: true, tx: tx, type: 'LOCK' })} className="p-2.5 bg-white text-amber-600 border border-gray-200 rounded-xl hover:bg-amber-600 hover:text-white shadow-sm"><Lock size={18} /></button>)}{canDeleteTx && (<button onClick={() => setActionModal({ isOpen: true, tx: tx, type: 'DELETE' })} className="p-2.5 bg-white text-red-500 border border-gray-200 rounded-xl hover:bg-red-500 hover:text-white shadow-sm"><Trash2 size={18} /></button>)}{isLocked && !isAdmin && (<div className="p-2.5 bg-gray-50 text-gray-300 border border-gray-100 rounded-xl"><Lock size={18} /></div>)}</div></td>
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
                            <div className={`p-10 text-white text-center relative overflow-hidden bg-gradient-to-br ${actionModal.type === 'LOCK' ? 'from-amber-500 to-orange-700' : 'from-red-600 to-red-800'}`}><div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div><div className="relative z-10"><div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">{actionModal.type === 'LOCK' ? <Lock size={42} className="text-white animate-pulse" /> : <AlertOctagon size={42} className="text-white" />}</div><h3 className="text-2xl font-black mb-2">{actionModal.type === 'LOCK' ? t('logistics.log_confirm_lock') : t('logistics.log_confirm_del')}</h3><p className="text-white/80 text-sm font-bold opacity-80">{actionModal.type === 'LOCK' ? t('logistics.log_lock_warn') : t('logistics.log_del_warn')}</p></div></div>
                            <div className="p-8 space-y-6"><div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4 text-right"><p className="font-black text-gray-800 text-lg">{actionModal.tx.supplierName || actionModal.tx.brokerName || t('logistics.log_outbound_ship')}</p><p className="font-mono font-black text-[#0e3c63] text-xl">${actionModal.tx.amount.toLocaleString()}</p></div><div className="flex flex-col gap-3"><Button onClick={handleExecuteAction} className={`w-full h-16 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all ${actionModal.type === 'LOCK' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}>{actionModal.type === 'LOCK' ? <Lock size={24} /> : <Trash2 size={24} />} نعم، تنفيذ الإجراء</Button><button onClick={() => setActionModal({ isOpen: false, tx: null, type: 'DELETE' })} className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200">{t('logistics.log_cancel')}</button></div></div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
