import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

import React, { useState, useMemo } from 'react';
import { X, Trash2, Save, AlertCircle, DollarSign, Clock, FileText, Banknote, User, History, ArrowLeftRight, Star, Lock } from 'lucide-react';
import { formatDate, formatTime } from '../../../lib/dateUtils';
import { Button, UserAvatar } from '../../../components/ui';
import { FactoryTransaction, FactoryPaymentLog } from '../../../types';
import { db } from '../../../lib/db';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { ModalHeader, materialLabels } from './SharedFactoryComponents';

export const EditFinanceModal = ({ isOpen, transaction, onClose, onSuccess }: any) => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const toast = useToast();
    const [newPaidAmount, setNewPaidAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isPaid = transaction.amount === (transaction.paidAmount || 0);
    const remaining = transaction.amount - (transaction.paidAmount || 0);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || isPaid) return;

        const addedValue = Number(newPaidAmount);
        if (isNaN(addedValue) || addedValue <= 0) { toast.error(t('batch4.k588')); return; }
        if (addedValue > remaining) { toast.error(t('batch4.k589')); return; }

        setIsSubmitting(true);
        try {
            const tx = db.factoryTransactions.find(t => t.id === transaction.id);
            if (tx) {
                const currentPaid = tx.paidAmount || 0;
                const newPaidTotal = currentPaid + addedValue;

                const newLog: FactoryPaymentLog = {
                    id: Date.now(),
                    amount: addedValue,
                    date: new Date().toISOString(),
                    addedBy: currentUser?.fullName || 'موظف غير معروف'
                };

                const updatedHistory = [...(tx.paymentHistory || []), newLog];

                // Optimistic Local Update (Visual)
                tx.paidAmount = newPaidTotal;
                tx.paymentHistory = updatedHistory;

                // Send to DB
                await db.updateFactoryTransaction(currentUser!.id, transaction.id, {
                    paidAmount: newPaidTotal,
                    payment_history: updatedHistory // Pass this to update logic
                });

                // Update Supplier Balance if applicable
                if (tx.supplierId) {
                    const supplier = db.suppliers.find(s => s.id === tx.supplierId);
                    if (supplier) {
                        // Optimistic Supplier Update
                        db.updateSupplier(currentUser!.id, supplier.id, {
                            currentBalance: supplier.currentBalance + addedValue
                        });
                    }
                }

                toast.success(t('batch4.k590'));
                setNewPaidAmount('');
                onSuccess();
            }
        } catch (err: any) {
            toast.error(err.message || 'فشل حفظ الدفعة');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !transaction) return null;

    return (
        <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[600] flex items-center justify-center p-4 !mt-0">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-fade-in border border-white/20 flex flex-col max-h-[90vh]">
                <ModalHeader
                    title={isPaid ? "معاينة القائمة (مسددة)" : "الإدارة المالية للقائمة"}
                    subtitle={`Invoice Management #${(transaction.id % 10000).toString().padStart(4, '0')} `}
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gray-50/30">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{t('batch4.k591')}</span>
                                        <h4 className="font-black text-gray-800 flex items-center gap-2">
                                            <Banknote size={18} className="text-[#0e3c63]" />
                                            {transaction.supplierName || 'معاملة عامة'}
                                        </h4>
                                        <p className="text-[11px] font-bold text-gray-400 mt-1">{materialLabels[transaction.materialType!] ? t(materialLabels[transaction.materialType!]) : t('factory_shared.mat_sand')} • {formatDate(transaction.date)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-100">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{t('batch4.k592')}</p>
                                        <p className="font-mono font-black text-xl text-gray-700">${transaction.amount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">{t('batch4.k593')}</p>
                                        <p className="font-mono font-black text-xl text-emerald-600">${(transaction.paidAmount || 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                {!isPaid && (
                                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                                        <span className="text-xs font-black text-red-700">{t('batch4.k594')}</span>
                                        <span className="font-mono font-black text-red-600 text-xl">${remaining.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {!isPaid ? (
                                <form onSubmit={handleUpdate} className="space-y-4 animate-fade-in bg-white p-6 rounded-[2rem] border border-blue-100 shadow-md">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mr-1">{t('batch4.k595')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={newPaidAmount}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    // Allow empty or valid number <= remaining
                                                    if (val === '' || (Number(val) >= 0 && Number(val) <= remaining)) {
                                                        setNewPaidAmount(val);
                                                    } else if (Number(val) > remaining) {
                                                        // Optional: You could clamp it, but strictly blocking as requested
                                                        // Or just toast warning if you want, but user said "don't accept"
                                                        // logic here simply ignores the input if > remaining
                                                    }
                                                }}
                                                className="w-full h-16 bg-gray-50 border-2 border-blue-50 rounded-2xl px-6 text-3xl font-black font-mono text-[#0e3c63] outline-none focus:border-[#0e3c63] focus:bg-white transition-all shadow-inner"
                                                placeholder="0"
                                                autoFocus
                                                required
                                            />
                                            <DollarSign size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" />
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-emerald-600 text-white rounded-2xl shadow-xl font-black active:scale-95 transition-all">
                                        {isSubmitting ? 'جاري الحفظ...' : 'تأكيد تسجيل الدفعة'}
                                    </Button>
                                </form>
                            ) : (
                                <div className="bg-gray-100 p-8 rounded-[2rem] border-2 border-dashed border-gray-200 text-center space-y-3">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-gray-400 shadow-sm"><Lock size={28} /></div>
                                    <h5 className="font-black text-gray-500">{t('batch4.k596')}</h5>
                                    <p className="text-[10px] text-gray-400 font-bold">{t('batch4.k597')}</p>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-7 space-y-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className="p-2 bg-[#0e3c63] text-white rounded-lg shadow-md"><History size={18} /></div>
                                <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">{t('batch4.k598')}</h4>
                            </div>

                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[300px]">
                                {!transaction.paymentHistory || transaction.paymentHistory.length === 0 ? (
                                    <div className="p-20 text-center text-gray-400 italic font-bold flex flex-col items-center gap-4 opacity-30">
                                        <ArrowLeftRight size={48} />
                                        <p>{t('batch4.k599')}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        <div className="grid grid-cols-4 bg-gray-50/50 p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">
                                            <div className="pr-4">{t('batch4.k600')}</div>
                                            <div>{t('batch4.k245')}</div>
                                            <div className="col-span-2">{t('batch4.k601')}</div>
                                        </div>
                                        {transaction.paymentHistory.slice().reverse().map((log: FactoryPaymentLog, idx: number) => {
                                            const staffUser = db.users.find(u => u.fullName === log.addedBy);
                                            // أول دفعة هي الدفعة التي تم دفعها عند الإنشاء (تكون آخر دفعة في المصفوفة الأصلية)
                                            const isInitial = idx === transaction.paymentHistory.length - 1;

                                            return (
                                                <div key={log.id} className={`grid grid-cols-4 p-5 items-center hover:bg-blue-50/30 transition-all group ${isInitial ? 'bg-emerald-50/30' : ''}`}>
                                                    <div className="flex flex-col pr-4">
                                                        <span className="font-mono font-black text-emerald-600 text-lg">
                                                            +${log.amount.toLocaleString()}
                                                        </span>
                                                        {isInitial && (
                                                            <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase mt-1">
                                                                <Star size={8} fill="currentColor" /> دفعة افتتاحية (عند الإنشاء)
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-700 font-mono">{formatDate(log.date)}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-1">
                                                            <Clock size={10} /> {formatTime(log.date)}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                                                            <UserAvatar
                                                                name={log.addedBy}
                                                                avatarPath={staffUser?.avatar_path}
                                                                avatarUrl={staffUser?.avatar_url}
                                                                size="md"
                                                                className="w-full h-full"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-xs font-black text-gray-700 group-hover:text-[#0e3c63] transition-colors truncate">
                                                                {log.addedBy}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                                {staffUser?.role || 'النظام'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="p-8 border-t bg-white flex justify-end">
                    <button type="button" onClick={onClose} className="px-12 h-14 bg-gray-900 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all">
                        إغلاق النافذة
                    </button>
                </div>
            </div>
        </div>
    );
};
