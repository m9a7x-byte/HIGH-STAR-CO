
import React, { useState, useMemo, useEffect } from 'react';
import { Save, UserCheck, DollarSign, Wallet, Box, Globe, FileText, Calculator, ShieldCheck, TrendingDown, Edit3 } from 'lucide-react';
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
    const { user } = useAuth();
    const toast = useToast();

    const isEdit = !!transaction;
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState('');
    const [materialType, setMaterialType] = useState<MaterialType>('EPS_RAW');
    const [amount, setAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [country, setCountry] = useState('🇹🇷 تركيا');
    const [notes, setNotes] = useState('');

    const suppliers = useMemo(() => db.getSuppliers(), []);

    useEffect(() => {
        if (transaction && isOpen) {
            setDate(new Date(transaction.date).toISOString().split('T')[0]);
            setSupplierId(transaction.supplierId?.toString() || '');
            setMaterialType(transaction.materialType || 'EPS_RAW');
            setAmount(transaction.amount?.toString() || '');
            setPaidAmount(transaction.paidAmount?.toString() || '');
            setCountry(transaction.country || '🇹🇷 تركيا');
            setNotes(transaction.notes || '');
        } else if (!transaction) {
            // Reset for new entry
            setDate(new Date().toISOString().split('T')[0]);
            setSupplierId('');
            setMaterialType('EPS_RAW');
            setAmount('');
            setPaidAmount('');
            setCountry('🇹🇷 تركيا');
            setNotes('');
        }
    }, [transaction, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const total = Number(amount);
        const paid = Number(paidAmount);
        const sid = Number(supplierId);

        if (!sid) { toast.error('يرجى اختيار مورد من القائمة'); return; }
        if (paid > total) { toast.error('المبلغ المدفوع لا يمكن أن يتجاوز القيمة الكلية'); return; }

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
                toast.success('تم تحديث معاملة المورد بنجاح');
            } else {
                db.addFactoryTransaction(user!.id, payload);
                toast.success('تم تسجيل معاملة المورد بنجاح');
            }
            onSuccess();
        } catch (err: any) { toast.error(err.message || 'حدث خطأ أثناء الحفظ'); }
    };

    const remaining = Math.max(0, Number(amount || 0) - Number(paidAmount || 0));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 !mt-0">
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in border border-white/20 flex flex-col max-h-[95vh]">
                <ModalHeader title={isEdit ? "تعديل معاملة مورد" : "تسجيل معاملة مورد"} subtitle="Supplier Purchase & Debt Entry" onClose={onClose} />

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ModalModernSelect label="اختيار المورد" value={supplierId} options={suppliers.map(s => ({ value: s.id.toString(), label: s.name }))} onChange={setSupplierId} icon={UserCheck} />
                        <ModernSingleDatePicker label="تاريخ المعاملة" value={date} onChange={setDate} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ModalModernSelect label="المادة المشتراة" value={materialType} options={materials.map(m => ({ value: m, label: materialLabels[m] }))} onChange={setMaterialType} icon={Box} />
                        <ModalModernSelect label="المنشأ" value={country} options={[{ value: '🇮🇶 العراق', label: 'العراق' }, { value: '🇹🇷 تركيا', label: 'تركيا' }, { value: '🇮🇷 ايران', label: 'ايران' }]} onChange={setCountry} icon={Globe} />
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-blue-100 shadow-md space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">القيمة الإجمالية ($)</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-[60px] bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-black text-gray-800 focus:border-[#0e3c63] outline-none" placeholder="0" required />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">المدفوع حالياً ($)</label>
                                <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className={`w-full h-[60px] border-2 rounded-2xl px-5 font-black outline-none ${isEdit ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-emerald-50/50 border-emerald-100 text-emerald-700 focus:border-emerald-500'}`} placeholder="0" required readOnly={isEdit} />
                            </div>
                        </div>
                        {remaining > 0 && <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center"><span className="text-xs font-black text-red-700">المتبقي كدين:</span><span className="font-mono font-black text-red-600 text-xl">${remaining.toLocaleString()}</span></div>}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 focus:border-[#0e3c63] outline-none min-h-[100px]" placeholder="تفاصيل الطلبية..." />
                    </div>
                </div>

                <div className="p-8 border-t bg-white flex gap-4 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                    <Button type="submit" className="flex-1 h-16 bg-[#0e3c63] text-white text-lg font-black rounded-2xl shadow-xl hover:bg-[#1a4d7a] transition-all">
                        {isEdit ? <Edit3 size={20} /> : <Save size={20} />} {isEdit ? 'حفظ التغييرات' : 'حفظ المعاملة'}
                    </Button>
                    <Button type="button" onClick={onClose} variant="secondary" className="px-10 h-16 rounded-2xl font-bold">إلغاء</Button>
                </div>
            </form>
        </div>
    );
};
