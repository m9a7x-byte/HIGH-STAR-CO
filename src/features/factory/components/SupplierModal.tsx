import { useTranslation } from 'react-i18next';

import React, { useState, useMemo, useEffect } from 'react';
import { Save, UserCheck, DollarSign, Wallet, Box, Globe, FileText, Calculator, ShieldCheck, TrendingDown, Edit3, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui';
import { MaterialType, FactoryTransaction } from '../../../types';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ModalHeader, ModernSingleDatePicker, ModalModernSelect, materialLabels, materials } from './SharedFactoryComponents';

interface SupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transaction?: FactoryTransaction;
}

export const SupplierModal = ({ isOpen, onClose, onSuccess, transaction }: SupplierModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();

    const isEdit = !!transaction;
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState('');
    const [materialType, setMaterialType] = useState<MaterialType>('EPS_RAW');
    const [amount, setAmount] = useState('');
    const [country, setCountry] = useState('🇹🇷 تركيا');
    const [notes, setNotes] = useState('');

    const suppliers = useMemo(() => db.getSuppliers(), []);

    useEffect(() => {
        if (transaction && isOpen) {
            setDate(new Date(transaction.date).toISOString().split('T')[0]);
            setSupplierId(transaction.supplierId?.toString() || '');
            setMaterialType(transaction.materialType || 'EPS_RAW');
            setAmount(transaction.amount?.toString() || '');
            setCountry(transaction.country || '🇹🇷 تركيا');
            setNotes(transaction.notes || '');
        } else if (!transaction) {
            // Reset for new entry
            setDate(new Date().toISOString().split('T')[0]);
            setSupplierId('');
            setMaterialType('EPS_RAW');
            setAmount('');
            setCountry('🇹🇷 تركيا');
            setNotes('');
        }
    }, [transaction, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const total = Number(amount);
        const paid = isEdit ? (transaction?.paidAmount || 0) : 0; // عند التعديل نحافظ على الدفعات المسجلة
        const sid = Number(supplierId);

        if (!sid) { toast.error(t('suppliers.supm_err_sup')); return; }
        if (isNaN(total) || total <= 0) { toast.error('الرجاء إدخال مبلغ فاتورة صحيح'); return; }
        if (isEdit && paid > total) {
            toast.error('لا يمكن جعل قيمة الفاتورة أقل من الواصل', `الواصل المسجل حالياً هو $${paid.toLocaleString()}`);
            return;
        }

        const selectedSupplier = suppliers.find(s => s.id === sid);

        try {
            // Combine selected date with current time
            const selectedDate = new Date(date);
            const now = new Date();
            selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

            const payload = {
                category: 'SUPPLIER' as const,
                date: selectedDate.toISOString(),
                amount: total,
                paidAmount: paid,
                supplierId: sid,
                supplierName: selectedSupplier?.name,
                materialType,
                country,
                notes,
                transactionType: 'IN' as const
            };

            if (isEdit && transaction) {
                db.updateFactoryTransaction(user!.id, transaction.id, payload);
                toast.success(t('suppliers.supm_tx_updated'));
            } else {
                db.addFactoryTransaction(user!.id, payload);
                toast.success(t('suppliers.supm_tx_added'));
            }
            onSuccess();
        } catch (err: any) { toast.error(err.message || t('suppliers.supm_err_save')); }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 !mt-0">
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in border border-white/20 flex flex-col max-h-[95vh]">
                <ModalHeader title={isEdit ? t('suppliers.supm_edit_title') : t('suppliers.supm_add_title')} subtitle={t('suppliers.supm_subtitle')} onClose={onClose} />

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ModalModernSelect label={t('suppliers.supm_select')} value={supplierId} options={suppliers.map(s => ({ value: s.id.toString(), label: s.name }))} onChange={setSupplierId} icon={UserCheck} />
                        <ModernSingleDatePicker label={t('suppliers.supm_date')} value={date} onChange={setDate} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ModalModernSelect label={t('suppliers.supm_material')} value={materialType} options={materials.map(m => ({ value: m, label: materialLabels[m] ? t(materialLabels[m]) : m }))} onChange={setMaterialType} icon={Box} />
                        <ModalModernSelect label={t('suppliers.supm_origin')} value={country} options={[{ value: '🇮🇶 العراق', label: t('factory_modals.iraq') }, { value: '🇹🇷 تركيا', label: t('factory_modals.turkey') }, { value: '🇮🇷 ايران', label: t('factory_modals.iran') }]} onChange={setCountry} icon={Globe} />
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-blue-100 shadow-md space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">{t('suppliers.supm_total')}</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-[60px] bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-black text-gray-800 focus:border-[#0e3c63] outline-none" placeholder="0" required />
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                            <AlertCircle size={16} className="text-blue-500 shrink-0" />
                            <span className="text-xs font-bold text-blue-700">المبلغ الكامل سينزل كدين على رصيد المورد. يمكنك التسديد من صفحة المورد.</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">{t('suppliers.supm_notes')}</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 focus:border-[#0e3c63] outline-none min-h-[100px]" placeholder={t('suppliers.supm_notes_ph')} />
                    </div>
                </div>

                <div className="p-8 border-t bg-white flex gap-4 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                    <Button type="submit" className="flex-1 h-16 bg-[#0e3c63] text-white text-lg font-black rounded-2xl shadow-xl hover:bg-[#1a4d7a] transition-all">
                        {isEdit ? <Edit3 size={20} /> : <Save size={20} />} {isEdit ? t('suppliers.supm_save_edit') : t('suppliers.supm_save_new')}
                    </Button>
                    <Button type="button" onClick={onClose} variant="secondary" className="px-10 h-16 rounded-2xl font-bold">إلغاء</Button>
                </div>
            </form>
        </div>
    );
};
