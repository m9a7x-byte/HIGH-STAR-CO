import { useTranslation } from 'react-i18next';


import React, { useState, useMemo, useEffect } from 'react';
import { Save, Truck, MapPin, Globe, ShoppingCart, Weight, Box, ShieldCheck, AlertCircle, X, UserCheck, DollarSign, Wallet, Calculator, TrendingDown, User, Edit3, Map, Lock, Users } from 'lucide-react';
import { Button } from '../../../components/ui';
import { FactoryCategory, MaterialType, UserRole, FactoryTransaction } from '../../../types';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ModalHeader, ModernSingleDatePicker, ModalModernSelect, materialLabels, materials } from './SharedFactoryComponents';
import { getTodayDateString } from '../../../lib/dateUtils';

interface LogisticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: FactoryCategory;
    onSuccess: () => void;
    transaction?: FactoryTransaction;
}

export const LogisticsModal = ({ isOpen, onClose, category, onSuccess, transaction }: LogisticsModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();

    const isEdit = !!transaction;
    const [date, setDate] = useState(() => getTodayDateString());
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [materialType, setMaterialType] = useState<MaterialType>('EPS_RAW');
    const [source, setSource] = useState('🇮🇶 العراق');
    const [supplierId, setSupplierId] = useState('');
    const [agentId, setAgentId] = useState('');
    const [brokerName, setBrokerName] = useState('');
    const [province, setProvince] = useState('');

    const isOutbound = category === 'TRANSPORT_OUT';
    const provinceDisplay = (val: string) => {
        const key = 'provinces.' + val;
        const translated = t(key);
        return translated !== key ? translated : val;
    };
    const isCustoms = category === 'CUSTOMS';
    const isInbound = category === 'TRANSPORT_IN' || category === 'SUPPLIER';

    const suppliers = useMemo(() => db.getSuppliers(), []);

    // جلب تلقائي للمحافظة عند اختيار الوكيل
    useEffect(() => {
        if (isOutbound && agentId) {
            const selectedAgent = db.users.find(u => u.id == agentId);
            if (selectedAgent?.province) {
                setProvince(selectedAgent.province);
            }
        }
    }, [agentId, isOutbound]);

    useEffect(() => {
        if (transaction) {
            setDate(new Date(transaction.date).toISOString().split('T')[0]);
            setAmount(transaction.amount?.toString() || '');
            setNotes(transaction.notes || '');
            if (transaction.materialType) setMaterialType(transaction.materialType);
            if (transaction.source) setSource(transaction.source);
            if (transaction.supplierId) setSupplierId(transaction.supplierId.toString());
            if (transaction.agentId) setAgentId(transaction.agentId.toString());
            if (transaction.brokerName) {
                // إذا كنا نعدل سجل قديم، نحاول مطابقة اسم المخلص مع مورد موجود
                const foundSupplier = suppliers.find(s => s.name === transaction.brokerName);
                if (foundSupplier) setSupplierId(foundSupplier.id.toString());
                setBrokerName(transaction.brokerName);
            }
            if (transaction.province) setProvince(transaction.province);
        }
    }, [transaction, isOpen, suppliers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const totalValue = Number(amount);
        // الشحنات الصادرة والواردة: تسدد فوراً من القاصة مباشرة
        // الكمرك فقط: paidAmount = 0 (المبلغ ينزل كدين على المورد/المخلص)
        const paid = isEdit ? (transaction?.paidAmount || 0) : (isCustoms ? 0 : totalValue);

        if (isNaN(totalValue) || totalValue <= 0) { toast.error('الرجاء إدخال مبلغ فاتورة صحيح'); return; }
        if (isEdit && paid > totalValue) {
            toast.error('لا يمكن جعل قيمة الفاتورة أقل من الواصل', `الواصل المسجل حالياً هو $${paid.toLocaleString()}`);
            return;
        }

        const selectedSupplier = suppliers.find(s => s.id === Number(supplierId));

        try {
            // Combine selected date with current time
            const selectedDate = new Date(date);
            const now = new Date();
            selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

            const payload = {
                category,
                date: selectedDate.toISOString(),
                amount: totalValue,
                paidAmount: paid,
                notes,
                materialType: !isOutbound ? materialType : undefined,
                transactionType: (category === 'TRANSPORT_IN' || category === 'SUPPLIER') ? 'IN' : 'OUT' as any,
                source: isOutbound ? province : source,
                supplierId: Number(supplierId) || undefined,
                supplierName: selectedSupplier?.name,
                agentId: agentId || undefined,
                province: isOutbound ? province : undefined,
                brokerName: isCustoms ? selectedSupplier?.name : undefined, // يتم تخزين اسم المورد في حقل المخلص
            };

            if (isEdit && transaction) {
                db.updateFactoryTransaction(user!.id, transaction.id, payload);
                toast.success(t('batch4.k643'));
            } else {
                db.addFactoryTransaction(user!.id, payload);
                toast.success(t('batch4.k644'));
            }
            onSuccess();
        } catch (err: any) { toast.error(err.message || t('logistics.logm_err_save')); }
    };

    if (!isOpen) return null;

    const modalTitle = isEdit ? t('logistics.logm_edit') : (isCustoms ? t('logistics.logm_customs') : isInbound ? t('logistics.logm_inbound') : t('logistics.logm_outbound'));

    return (
        <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 !mt-0">
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in border border-white/20 flex flex-col max-h-[95vh]">
                <ModalHeader title={modalTitle} subtitle={t('logistics.logm_subtitle')} onClose={onClose} />

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">

                    {isOutbound ? (
                        <div className="flex flex-col gap-6 animate-fade-in">
                            <div className="w-full">
                                <ModernSingleDatePicker label={t('batch4.k273')} value={date} onChange={setDate} />
                            </div>

                            <div className="w-full">
                                <ModalModernSelect
                                    label={t('batch4.k645')}
                                    value={agentId}
                                    options={db.users.filter(u => u.role === UserRole.AGENT).map(u => ({ value: u.id.toString(), label: u.fullName }))}
                                    onChange={setAgentId}
                                    icon={User}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 mr-1 uppercase tracking-widest">{t('batch4.k646')}</label>
                                <div className={`w-full h-[60px] flex items-center px-5 bg-white border-2 rounded-2xl transition-all font-black text-gray-800 shadow-sm ${province ? 'border-emerald-100 bg-emerald-50/20' : 'border-gray-100 opacity-60'}`}>
                                    <MapPin size={20} className={`ml-3 ${province ? 'text-emerald-500' : 'text-gray-300'}`} />
                                    {province ? provinceDisplay(province) : t('logistics.logm_province_wait')}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 mr-1 uppercase tracking-widest">{t('batch4.k647')}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full h-[60px] bg-white border-2 border-gray-100 rounded-2xl px-5 font-black text-gray-800 focus:border-[#0e3c63] outline-none shadow-sm transition-all"
                                        placeholder="0"
                                        required
                                    />
                                    <DollarSign size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#0e3c63]" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 mr-1 uppercase tracking-widest">{t('batch4.k648')}</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-[#0e3c63] shadow-sm min-h-[120px]"
                                    placeholder={t('batch4.k649')}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ModernSingleDatePicker label={t('batch4.k273')} value={date} onChange={setDate} />
                                <ModalModernSelect
                                    label={isCustoms ? t('logistics.logm_broker') : t('logistics.logm_select_sup')}
                                    value={supplierId}
                                    options={suppliers.map(s => ({ value: s.id.toString(), label: s.name }))}
                                    onChange={setSupplierId}
                                    icon={isCustoms ? Users : UserCheck}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ModalModernSelect label={t('batch4.k628')} value={materialType} options={materials.map(m => ({ value: m, label: materialLabels[m] ? t(materialLabels[m]) : m }))} onChange={setMaterialType} icon={Box} />
                                <ModalModernSelect label={t('batch4.k650')} value={source} options={[{ value: '🇮🇶 العراق', label: t('batch4.k651') }, { value: '🇹🇷 تركيا', label: t('batch4.k652') }, { value: '🇮🇷 ايران', label: t('batch4.k653') }]} onChange={setSource} icon={Globe} />
                            </div>

                            <div className="bg-white p-6 rounded-[2.5rem] border border-blue-100 shadow-md space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-gray-400 mr-1 uppercase">{t('batch4.k654')}</label>
                                        <div className="relative">
                                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-[60px] bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-black text-gray-800 focus:border-[#0e3c63] outline-none shadow-inner" placeholder="0" required />
                                            <DollarSign size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#0e3c63]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 mr-1 uppercase">{t('batch4.k648')}</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-[#0e3c63]" placeholder={t('batch4.k657')} />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-8 border-t bg-white flex gap-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                    <Button type="submit" className={`flex-1 h-16 bg-[#0e3c63] text-white text-lg font-black rounded-2xl shadow-xl hover:bg-[#1a4d7a]`}>
                        {isEdit ? <Edit3 size={20} /> : <Save size={20} />} {isEdit ? t('logistics.logm_save_edit') : t('logistics.logm_confirm')}
                    </Button>
                    <button type="button" onClick={onClose} className="px-10 h-16 rounded-2xl font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">{t('batch4.k156')}</button>
                </div>
            </form>
        </div>
    );
};
