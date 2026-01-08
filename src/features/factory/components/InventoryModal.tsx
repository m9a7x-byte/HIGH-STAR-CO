
import React, { useState, useEffect, useMemo } from 'react';
import { Save, Box, Weight, PlusCircle, MinusCircle, FileText, DollarSign, Globe, MapPin, Edit3, Calculator, Tag, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
// FIX: Added Badge to the imports
import { Button, Badge } from '../../../components/ui';
import { MaterialType, FactoryTransaction } from '../../../types';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ModalHeader, ModernSingleDatePicker, ModalModernSelect, materialLabels, materials } from './SharedFactoryComponents';
import { getTodayDateString } from '../../../lib/dateUtils';

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialMaterial?: MaterialType;
    transaction?: FactoryTransaction;
}

export const InventoryModal = ({ isOpen, onClose, onSuccess, initialMaterial, transaction }: InventoryModalProps) => {
    const { user } = useAuth();
    const toast = useToast();

    const isEdit = !!transaction;
    const [txType, setTxType] = useState<'IN' | 'OUT'>('IN');
    const [date, setDate] = useState(() => getTodayDateString());
    const [materialType, setMaterialType] = useState<MaterialType>('SILICON_HOT');
    const [quantity, setQuantity] = useState('');
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState('🇮🇶 العراق');
    const [region, setRegion] = useState('دربنديخان');
    const [notes, setNotes] = useState('');

    // جلب الرصيد الحالي للمادة المختارة
    const currentStockLevel = useMemo(() => {
        return db.getMaterialStock(materialType);
    }, [materialType, isOpen, txType]);

    // خوارزمية حساب معدل السعر للمادة المختارة
    const unitPriceAnalysis = useMemo(() => {
        const allTxs = db.getFactoryTransactions('INVENTORY').filter(t => t.materialType === materialType);
        const inTxs = allTxs.filter(t => t.transactionType === 'IN');
        const totalValue = inTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
        const totalQty = inTxs.reduce((acc, t) => acc + (t.quantity || 0), 0);

        const avgPrice = totalQty > 0 ? (totalValue / totalQty) : 0;
        const currentQty = Number(quantity) || 0;

        return {
            avgUnitPrice: avgPrice,
            totalEstimatedCost: avgPrice * currentQty
        };
    }, [materialType, quantity, isOpen]);

    useEffect(() => {
        if (transaction) {
            setTxType(transaction.transactionType || 'IN');
            setDate(new Date(transaction.date).toISOString().split('T')[0]);
            setMaterialType(transaction.materialType || 'SILICON_HOT');
            setQuantity(transaction.quantity?.toString() || '');
            setAmount(transaction.amount?.toString() || '');
            setSource(transaction.source || '🇮🇶 العراق');
            setSubTypeFromTx(transaction.subType);
            setNotes(transaction.notes || '');
        } else if (initialMaterial) {
            setMaterialType(initialMaterial);
        }
    }, [transaction, initialMaterial, isOpen]);

    const setSubTypeFromTx = (sub: string | undefined) => {
        if (sub === 'دربنديخان' || sub === 'اربيل') setRegion(sub);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const inputQty = Number(quantity);

        // نظام التحقق من المخزون عند الصرف
        if (txType === 'OUT') {
            if (currentStockLevel <= 0) {
                toast.error('لا يمكن الصرف!', `المخزون من ${materialLabels[materialType]} حالياً 0. لا توجد مواد أولية للصرف.`);
                return;
            }
            if (inputQty > currentStockLevel) {
                toast.error('تجاوزت المتوفر!', `الكمية المتوفرة في المخزن هي (${currentStockLevel}) فقط. لا يمكنك صرف (${inputQty}).`);
                return;
            }
        }

        try {
            let finalSubType = undefined;
            if (materialType === 'SAND_ADHESIVE' && txType === 'IN') finalSubType = region;

            const finalAmount = txType === 'OUT' ? unitPriceAnalysis.totalEstimatedCost : Number(amount);

            // Combine selected date with current time
            const selectedDate = new Date(date);
            const now = new Date();
            selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

            const payload = {
                category: 'INVENTORY' as const,
                date: selectedDate.toISOString(),
                amount: finalAmount,
                paidAmount: finalAmount, // Treat as full cash payment
                notes,
                materialType,
                quantity: inputQty,
                transactionType: txType,
                subType: finalSubType,
                source: txType === 'IN' ? source : undefined
            };

            if (isEdit && transaction) {
                db.updateFactoryTransaction(user!.id, transaction.id, payload);
                toast.success('تم تحديث بيانات حركة المخزن');
            } else {
                db.addFactoryTransaction(user!.id, payload);
                toast.success('تم تسجيل حركة المخزون بنجاح');
            }
            onSuccess();
        } catch (err: any) { toast.error(err.message || 'حدث خطأ أثناء الحفظ'); }
    };

    if (!isOpen) return null;

    const isStockLow = txType === 'OUT' && (Number(quantity) > currentStockLevel || currentStockLevel === 0);

    return (
        <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 !mt-0">
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in border border-white/20 flex flex-col max-h-[95vh]">
                <ModalHeader
                    title={isEdit ? "تعديل حركة مخزن" : "حركة مخزن جديدة"}
                    subtitle={isEdit ? "Update Inventory Record" : "New Inventory Movement"}
                    onClose={onClose}
                />

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                    {/* نوع الحركة */}
                    <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-2 gap-2">
                        <button type="button" disabled={isEdit} onClick={() => setTxType('IN')} className={`flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-black transition-all ${txType === 'IN' ? 'bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100' : 'text-gray-400 hover:bg-gray-50'} ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <PlusCircle size={18} /> وارد (شراء)
                        </button>
                        <button type="button" disabled={isEdit} onClick={() => setTxType('OUT')} className={`flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-black transition-all ${txType === 'OUT' ? 'bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100' : 'text-gray-400 hover:bg-gray-50'} ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <MinusCircle size={18} /> صرف (إنتاج)
                        </button>
                    </div>

                    {/* تنبيه الرصيد المتاح عند الصرف */}
                    {txType === 'OUT' && (
                        <div className={`p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${currentStockLevel > 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${currentStockLevel > 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                    <Box size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الرصيد المتاح حالياً</p>
                                    <h4 className={`font-black text-lg ${currentStockLevel > 0 ? 'text-blue-800' : 'text-red-700'}`}>{currentStockLevel.toLocaleString()} وحدة</h4>
                                </div>
                            </div>
                            {currentStockLevel <= 0 ? (
                                <Badge color="red" className="animate-pulse">نفذت الكمية</Badge>
                            ) : (
                                <Badge color="blue">جاهز للصرف</Badge>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ModernSingleDatePicker label="تاريخ الحركة" value={date} onChange={setDate} />
                        <ModalModernSelect
                            label="نوع المادة"
                            value={materialType}
                            options={materials.map(m => ({ value: m, label: materialLabels[m] }))}
                            onChange={setMaterialType}
                            icon={Box}
                        />
                    </div>

                    <div className={`grid grid-cols-1 ${txType === 'IN' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">الكمية ({materialLabels[materialType]})</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    className={`w-full h-[60px] bg-white border-2 rounded-2xl px-5 font-black text-gray-800 outline-none shadow-sm transition-all ${isStockLow ? 'border-red-500 ring-4 ring-red-50' : 'border-gray-100 focus:border-[#0e3c63]'}`}
                                    placeholder="0.00"
                                    required
                                />
                                <Weight size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${isStockLow ? 'text-red-500' : 'text-gray-300'}`} />
                            </div>
                            {isStockLow && (
                                <p className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-1">
                                    <AlertTriangle size={12} /> لا يمكنك تجاوز المتوفر ({currentStockLevel})
                                </p>
                            )}
                        </div>

                        {txType === 'IN' && (
                            <div className="space-y-2 animate-fade-in">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">كلفة الشراء الكلية ($)</label>
                                <div className="relative">
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-[60px] bg-white border-2 border-gray-100 rounded-2xl px-5 font-black text-gray-800 focus:border-[#0e3c63] outline-none shadow-sm" placeholder="0" required />
                                    <DollarSign size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    {txType === 'OUT' && (
                        <div className="bg-orange-50/50 rounded-[2rem] border-2 border-dashed border-orange-100 p-6 animate-fade-in space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calculator size={18} className="text-orange-600" />
                                <h5 className="text-xs font-black text-orange-800 uppercase tracking-widest">خوارزمية تسعير الصرف التلقائي</h5>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-50 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-gray-400 mb-1 uppercase">كلفة الوحدة (معدل)</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg font-black text-gray-800 font-mono">${unitPriceAnalysis.avgUnitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                        <Tag size={12} className="text-gray-300" />
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-50 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-gray-400 mb-1 uppercase">إجمالي تكلفة الصرف</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg font-black text-orange-600 font-mono">${unitPriceAnalysis.totalEstimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <DollarSign size={14} className="text-orange-300" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 bg-white/50 p-3 rounded-xl">
                                <Info size={14} className="text-orange-400 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-orange-700 font-bold leading-relaxed">يتم حساب هذه القيم تلقائياً بناءً على تاريخ مشتريات (الوارد) لهذه المادة.</p>
                            </div>
                        </div>
                    )}

                    {txType === 'IN' && (
                        <div className="space-y-6 animate-fade-in">
                            <ModalModernSelect label="المصدر / المنشأ" value={source} options={[{ value: '🇮🇶 العراق', label: '🇮🇶 العراق' }, { value: '🇹🇷 تركيا', label: '🇹🇷 تركيا' }, { value: '🇮🇷 ايران', label: '🇮🇷 ايران' }]} onChange={setSource} icon={Globe} />
                            {materialType === 'SAND_ADHESIVE' && <ModalModernSelect label="المنطقة" value={region} options={[{ value: 'دربنديخان', label: 'دربنديخان' }, { value: 'اربيل', label: 'اربيل' }]} onChange={setRegion} icon={MapPin} />}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">ملاحظات {txType === 'OUT' ? 'الإنتاج' : 'الشراء'}</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 focus:border-[#0e3c63] outline-none min-h-[100px]" placeholder={txType === 'OUT' ? "اذكر الوجبة أو خط الإنتاج..." : "تفاصيل الشحنة..."} />
                    </div>
                </div>

                <div className="p-8 border-t bg-white flex gap-4 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                    <Button
                        type="submit"
                        disabled={isStockLow}
                        className={`flex-1 h-16 ${txType === 'IN' ? 'bg-[#0e3c63]' : (isStockLow ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600')} text-white text-lg font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2`}
                    >
                        {isEdit ? <Edit3 size={20} /> : <Save size={20} />} {isEdit ? 'حفظ التعديلات' : (txType === 'IN' ? 'تسجيل وارد جديد' : 'تسجيل صرف للإنتاج')}
                    </Button>
                    <Button type="button" onClick={onClose} variant="secondary" className="px-10 h-16 rounded-2xl font-bold">إلغاء</Button>
                </div>
            </form>
        </div>
    );
};
