
import React, { useState, useEffect } from 'react';
import { Save, FileText, Utensils, Coffee, Moon, Sun, Zap, Settings, Fuel, Edit3, Wrench, Receipt, Droplets } from 'lucide-react';
import { Button } from '../../../components/ui';
import { FactoryCategory, FactoryTransaction } from '../../../types';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ModalHeader, ModernSingleDatePicker, ModernMonthYearPicker, ModalModernSelect } from './SharedFactoryComponents';
import { getTodayDateString } from '../../../lib/dateUtils';

const expenseNames: Record<FactoryCategory | string, string> = {
    'SALARY': 'رواتب الموظفين',
    'RENT': 'إيجار الموقع',
    'FOOD': 'الطعام والوجبات',
    'DAILY_EXPENSE': 'مصاريف نثرية',
    'ELECTRICITY': 'الكهرباء والمولدات'
};

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: FactoryCategory;
    onSuccess: () => void;
    transaction?: FactoryTransaction;
}

export const ExpenseModal = ({ isOpen, onClose, category, onSuccess, transaction }: ExpenseModalProps) => {
    const { user } = useAuth();
    const toast = useToast();

    const isEdit = !!transaction;
    const [date, setDate] = useState(() => getTodayDateString());
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [subType, setSubType] = useState<string>('');
    const [electricityType, setElectricityType] = useState<'NATIONAL' | 'GENERATOR'>('NATIONAL');
    const [generatorSubType, setGeneratorSubType] = useState<string>('كاز');

    useEffect(() => {
        if (!isOpen) return;

        if (transaction) {
            setDate(new Date(transaction.date).toISOString().split('T')[0]);
            setAmount(transaction.amount?.toString() || '');
            setNotes(transaction.notes || '');
            setSubType(transaction.subType || '');

            if (transaction.category === 'ELECTRICITY') {
                if (transaction.subType?.includes('الوطنية') || transaction.subType?.includes('حكومي')) {
                    setElectricityType('NATIONAL');
                } else {
                    setElectricityType('GENERATOR');
                    if (transaction.subType?.includes('نفط اسود')) setGeneratorSubType('نفط اسود');
                    else if (transaction.subType?.includes('كاز')) setGeneratorSubType('كاز');
                    else if (transaction.subType?.includes('دهن')) setGeneratorSubType('دهن/ فلتر');
                    else if (transaction.subType?.includes('يد عاملة')) setGeneratorSubType('يد عاملة ( صيانة )');
                    else setGeneratorSubType('كاز');
                }
            }
        } else {
            // Reset for new entry
            setAmount('');
            setNotes('');
            setSubType('');

            if (category === 'FOOD') setSubType('غداء');
            if (category === 'ELECTRICITY') {
                // Initialize defaults only once when opening
                setElectricityType('NATIONAL');
                setGeneratorSubType('كاز');
            }
        }
    }, [isOpen, transaction]); // Removed 'category' dependency to prevent reset on category change if modal stays open (though category unlikely changes while open in this flow)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) { toast.error('يرجى إدخال المبلغ'); return; }

        try {
            let finalSubType = subType;
            if (category === 'ELECTRICITY') {
                finalSubType = electricityType === 'NATIONAL' ? 'كهرباء حكومي (الوطنية)' : `مولدة (${generatorSubType})`;
            }

            // Date Construction Logic
            // 1. Parse selected date components
            const [yStr, mStr, dStr] = date.split('-');
            const year = parseInt(yStr);
            const month = parseInt(mStr) - 1; // 0-indexed
            let day = parseInt(dStr);

            const now = new Date();

            // 2. If Monthly (Salary/Rent), use Current Day (clamped)
            if (category === 'SALARY' || category === 'RENT') {
                const currentDay = now.getDate();
                const daysInMonth = new Date(year, month + 1, 0).getDate(); // Get last day of selected month
                day = Math.min(currentDay, daysInMonth);
            }

            // 3. Construct Final Date with Current Time
            const finalDate = new Date(year, month, day, now.getHours(), now.getMinutes(), now.getSeconds());

            const payload = {
                category,
                date: finalDate.toISOString(),
                amount: Number(amount),
                notes,
                subType: finalSubType
            };

            if (isEdit && transaction) {
                db.updateFactoryTransaction(user!.id, transaction.id, payload);
                toast.success('تم تحديث السجل المالي بنجاح');
            } else {
                db.addFactoryTransaction(user!.id, payload);
                toast.success('تم تسجيل المصروف بنجاح');
            }
            onSuccess();
        } catch (err: any) { toast.error(err.message || 'حدث خطأ أثناء الحفظ'); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 !mt-0">
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in border border-white/20 flex flex-col max-h-[95vh]">
                <ModalHeader title={isEdit ? `تعديل ${expenseNames[category]}` : `تسجيل ${expenseNames[category]}`} subtitle={isEdit ? "Update Financial Record" : "Operational Expense Logging"} onClose={onClose} />

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                    {category === 'SALARY' || category === 'RENT' ? <ModernMonthYearPicker label="عن شهر / سنة" value={date} onChange={setDate} /> : <ModernSingleDatePicker label="تاريخ العملية" value={date} onChange={setDate} />}

                    {category === 'ELECTRICITY' && (
                        <div className="space-y-6">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">نوع مجهز الطاقة</label>
                            <div className="grid grid-cols-2 gap-3 p-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <button type="button" onClick={() => setElectricityType('NATIONAL')} className={`flex items-center justify-center gap-2 py-4 rounded-xl transition-all ${electricityType === 'NATIONAL' ? 'bg-blue-50 text-[#0e3c63] ring-2 ring-blue-100 font-black' : 'text-gray-400'}`}><Zap size={18} /> الوطنية</button>
                                <button type="button" onClick={() => setElectricityType('GENERATOR')} className={`flex items-center justify-center gap-2 py-4 rounded-xl transition-all ${electricityType === 'GENERATOR' ? 'bg-amber-50 text-amber-600 ring-2 ring-amber-100 font-black' : 'text-gray-400'}`}><Settings size={18} /> المولدة</button>
                            </div>
                            {electricityType === 'GENERATOR' && (
                                <ModalModernSelect
                                    label="تفاصيل المولدة"
                                    value={generatorSubType}
                                    options={[
                                        { value: 'نفط اسود', label: 'نفط اسود' },
                                        { value: 'كاز', label: 'كاز' },
                                        { value: 'دهن/ فلتر', label: 'دهن/ فلتر' },
                                        { value: 'يد عاملة ( صيانة )', label: 'يد عاملة ( صيانة )' }
                                    ]}
                                    onChange={setGeneratorSubType}
                                    icon={Fuel}
                                />
                            )}
                        </div>
                    )}

                    {category === 'DAILY_EXPENSE' && (
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">نوع المصروف / العنوان</label>
                            <input
                                type="text"
                                value={subType}
                                onChange={e => setSubType(e.target.value)}
                                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-bold text-gray-700 focus:border-[#0e3c63] outline-none transition-all"
                                placeholder="مثلاً: ضيافة، قرطاسية، صيانة بسيطة..."
                            />
                        </div>
                    )}

                    {category === 'FOOD' && (
                        <div className="space-y-3">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">تحديد الوجبة</label>
                            <div className="grid grid-cols-3 gap-3 p-1.5 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                                <button type="button" onClick={() => setSubType('فطور')} className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-all group ${subType === 'فطور' ? 'bg-amber-50 text-amber-600 ring-2 ring-amber-200' : 'text-gray-400 hover:bg-gray-50'}`}>
                                    <Coffee size={24} className={`${subType === 'فطور' ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
                                    <span className="text-xs font-black">فطور</span>
                                </button>
                                <button type="button" onClick={() => setSubType('غداء')} className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-all group ${subType === 'غداء' ? 'bg-orange-50 text-orange-600 ring-2 ring-orange-200' : 'text-gray-400 hover:bg-gray-50'}`}>
                                    <Sun size={24} className={`${subType === 'غداء' ? 'animate-spin-slow' : 'group-hover:scale-110 transition-transform'}`} />
                                    <span className="text-xs font-black">غداء</span>
                                </button>
                                <button type="button" onClick={() => setSubType('عشاء')} className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-all group ${subType === 'عشاء' ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200' : 'text-gray-400 hover:bg-gray-50'}`}>
                                    <Moon size={24} className={`${subType === 'عشاء' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                                    <span className="text-xs font-black">عشاء</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center shadow-inner">
                        <label className="block text-[10px] font-black text-[#0e3c63] uppercase mb-4 tracking-[0.2em]">المبلغ المدفوع ($)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full max-w-[220px] h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl text-4xl font-mono font-black text-center text-gray-800 focus:bg-white focus:border-[#0e3c63] outline-none transition-all shadow-sm" placeholder="0" required />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">ملاحظات إضافية</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 focus:border-[#0e3c63] outline-none min-h-[100px] transition-all" placeholder="تفاصيل الصرف..." />
                    </div>
                </div>

                <div className="p-8 border-t bg-white flex gap-4 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                    <Button type="submit" className={`flex-1 h-16 ${isEdit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white text-lg font-black rounded-2xl shadow-xl active:scale-95 flex items-center justify-center gap-2`}>
                        {isEdit ? <Edit3 size={22} /> : <Save size={22} />} {isEdit ? 'حفظ التعديلات' : 'تأكيد عملية الصرف'}
                    </Button>
                    <Button type="button" onClick={onClose} variant="secondary" className="px-10 h-16 rounded-2xl font-bold">إلغاء</Button>
                </div>
            </form>
        </div>
    );
};
