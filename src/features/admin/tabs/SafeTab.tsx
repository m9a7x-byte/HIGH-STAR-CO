
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Wallet, TrendingUp, TrendingDown, History, ArrowDownLeft,
    ArrowUpRight, Clock, User, Filter, DollarSign, Calculator,
    ShieldCheck, AlertCircle, Plus, Send, Landmark, Coins, Vault,
    FileText, UserCheck, CreditCard, PieChart, Sparkles, Receipt, Save, X,
    Search, Trash2, Edit3, Calendar, PlusCircle, MinusCircle, AlertOctagon,
    Lock, ArrowRightLeft, MapPin, ChevronLeft, Layout, RotateCcw
} from 'lucide-react';
import { Card, Badge, Button, Input, DateRangePicker, UserAvatar } from '../../../components/ui';
import { db } from '../../../lib/db';
import { formatDate, formatTime, getTodayDateString } from '../../../lib/dateUtils';
import { FactoryTransaction, WalletTransaction, UserRole, FactoryCategory } from '../../../types';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ModernSingleDatePicker, materialLabels } from '../../factory/components/SharedFactoryComponents';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

export const SafeTab = () => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const toast = useToast();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [manualModal, setManualModal] = useState<{
        isOpen: boolean;
        mode: 'SAFE_WITHDRAWAL' | 'SAFE_DEPOSIT';
        tx?: FactoryTransaction;
        amount: string;
    }>({ isOpen: false, mode: 'SAFE_WITHDRAWAL', amount: '' });

    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const refresh = () => setRefreshTrigger(prev => prev + 1);

    useEffect(() => {
        const unsubscribe = db.subscribe(refresh);
        return () => unsubscribe();
    }, []);

    const isDateInRange = (dateStr: string) => {
        const target = new Date(dateStr).setHours(0, 0, 0, 0);
        const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
        const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
        return target >= start && target <= end;
    };

    const getMaterialName = (tx: FactoryTransaction) => {
        if (!tx.materialType) return '';
        const labelKey = materialLabels[tx.materialType];
        return labelKey ? t(labelKey) : tx.materialType;
    };

    const withOptionalDetail = (title: string, detail?: string) => {
        const cleanDetail = detail?.trim();
        return cleanDetail ? `${title} (${cleanDetail})` : title;
    };

    const allSafeEvents = useMemo(() => {
        const events: any[] = [];
        db.getAllTransactions().filter(t => t.type === 'DEPOSIT' || (t.amount < 0 && t.description.includes('ترجيع كاش فعلي للوكيل'))).forEach(t => {
            const agent = db.users.find(u => u.id === t.agentId);
            const isAgentCashRefund = t.amount < 0 && t.description.includes('ترجيع كاش فعلي للوكيل');
            // Extract real user if present in description
            let finalDesc = t.description;
            let finalUser = { name: 'النظام الآلي', avatarPath: undefined, avatarUrl: undefined };

            if (t.description && t.description.includes(' | بواسطة: ')) {
                const parts = t.description.split(' | بواسطة: ');
                finalDesc = parts[0];
                const staffName = parts[1]?.trim();
                const staffUser = db.users.find(u => u.fullName === staffName);
                if (staffName) {
                    finalUser = {
                        name: staffName,
                        avatarPath: staffUser?.avatar_path,
                        avatarUrl: staffUser?.avatar_url
                    };
                }
            }

            events.push({
                id: `agent-dep-${t.id}`,
                date: t.createdAt,
                type: isAgentCashRefund ? 'OUT' : 'IN',
                amount: Math.abs(t.amount),
                title: isAgentCashRefund ? 'ترجيع كاش فعلي (وكيل)' : 'استلام نقدي (وكيل)',
                sourcePage: 'نظام الوكلاء',
                sourceTab: 'المحفظة المالية',
                details: finalDesc,
                beneficiary: agent?.fullName || 'وكيل غير معروف',
                user: finalUser,
                isManual: false, // Keep false to avoid edit/delete via SafeTab (as it belongs to Agents)
                rawTx: t
            });
        });

        const factoryTxs = db.getFactoryTransactions();

        factoryTxs.forEach(tx => {
            // Explicitly handle SAFE categories to ensure they appear
            const isSafeTx = ['SAFE_WITHDRAWAL', 'SAFE_DEPOSIT'].includes(tx.category);
            const isSupplierSafeTx = ['SUPPLIER_PAYMENT', 'SUPPLIER_DEPOSIT', 'SUPPLIER_WITHDRAWAL'].includes(tx.category);
            const isInboundShipment = tx.category === 'TRANSPORT_IN' && tx.paidAmount > 0;
            const isDirectExpense = ['SALARY', 'RENT', 'FOOD', 'DAILY_EXPENSE', 'ELECTRICITY'].includes(tx.category) || isSafeTx || isSupplierSafeTx || isInboundShipment;

            if (isDirectExpense) {
                const staff = db.users.find(u => u.fullName === tx.withdrawnBy);
                const categoryLabels: any = {
                    SALARY: 'الرواتب', RENT: 'الإيجار', FOOD: 'الطعام', DAILY_EXPENSE: 'نثرية', ELECTRICITY: 'الطاقة',
                    SAFE_DEPOSIT: 'إيداع إداري', SAFE_WITHDRAWAL: 'سحب إداري',
                    SUPPLIER_PAYMENT: 'تسديد دين مورد', SUPPLIER_DEPOSIT: 'إيداع رصيد مورد', SUPPLIER_WITHDRAWAL: 'استرداد من مورد',
                    TRANSPORT_IN: 'دفع شحنة واردة'
                };

                // Determine title/details
                let title = categoryLabels[tx.category] || 'مصروف نقد';
                if (tx.category === 'SAFE_WITHDRAWAL') title = 'سحب إداري';
                if (tx.category === 'SAFE_DEPOSIT') title = 'إيداع إداري';
                if (tx.category === 'SUPPLIER_PAYMENT') title = 'تسديد دين مورد';
                if (tx.category === 'SUPPLIER_DEPOSIT') title = 'إيداع رصيد مورد';
                if (tx.category === 'SUPPLIER_WITHDRAWAL') title = 'استرداد من مورد';
                if (tx.category === 'TRANSPORT_IN') title = 'دفع شحنة واردة';

                // Determine direction
                const isInflow = tx.category === 'SAFE_DEPOSIT' || tx.category === 'SUPPLIER_WITHDRAWAL';

                // Determine beneficiary
                let beneficiary = 'حساب المصنع';
                if (tx.category === 'SAFE_WITHDRAWAL') {
                    beneficiary = tx.notes?.split(':')[1]?.split('|')[0]?.trim() || 'الإدارة';
                } else if (isSupplierSafeTx) {
                    beneficiary = tx.supplierName || tx.notes?.split(':')[1]?.split('|')[0]?.trim() || 'مورد';
                } else if (isInboundShipment) {
                    beneficiary = tx.supplierName || tx.source || 'شحنة واردة';
                }

                events.push({
                    id: `fact-direct-${tx.id}`,
                    date: tx.date || new Date().toISOString(),
                    type: isInflow ? 'IN' : 'OUT',
                    amount: tx.amount || 0,
                    title: title,
                    sourcePage: isSupplierSafeTx ? 'نظام الموردين' : (isInboundShipment ? 'اللوجستيات' : 'إدارة المصنع'),
                    sourceTab: isSupplierSafeTx ? 'حركات المورد' : (isInboundShipment ? 'شحنات واردة' : (isSafeTx ? 'العمليات الإدارية' : 'المصروفات التشغيلية')),
                    details: isInboundShipment ? withOptionalDetail(tx.notes || 'شحنة واردة', getMaterialName(tx)) : (tx.subType || tx.notes || categoryLabels[tx.category]),
                    beneficiary: beneficiary,
                    user: { name: tx.withdrawnBy || 'موظف', avatarPath: staff?.avatar_path, avatarUrl: staff?.avatar_url },
                    isManual: isSafeTx, // Only manual SAFE entries are editable, supplier/logistics entries are locked
                    rawTx: tx
                });
            } else if (tx.category !== 'INVENTORY') {
                tx.paymentHistory?.forEach(pay => {
                    if (tx.supplierId && pay.notes === 'تسديد موحد') {
                        return;
                    }

                    const staff = db.users.find(u => u.fullName === pay.addedBy);
                    const isOutboundShipmentPayment = tx.category === 'TRANSPORT_OUT';
                    const isInboundShipmentPayment = tx.category === 'TRANSPORT_IN';
                    const paymentTitle = tx.category === 'SUPPLIER'
                        ? 'شراء مواد'
                        : (tx.category === 'INVENTORY'
                            ? 'شراء مواد أولية'
                            : (isOutboundShipmentPayment ? 'شحنة صادرة' : (isInboundShipmentPayment ? 'شحنة واردة' : 'أجور شحن')));
                    const paymentDetail = tx.category === 'SUPPLIER' || tx.category === 'INVENTORY'
                        ? getMaterialName(tx)
                        : (tx.notes || tx.source || tx.province || tx.brokerName || tx.supplierName || '');
                    const sourcePage = isOutboundShipmentPayment || isInboundShipmentPayment ? 'لوجستيات' : 'إدارة المصنع';
                    const sourceTab = tx.category === 'SUPPLIER'
                        ? 'الموردين'
                        : (tx.category === 'INVENTORY'
                            ? 'المخزن والمواد'
                            : (isOutboundShipmentPayment ? 'شحنات صادرة' : (isInboundShipmentPayment ? 'شحنات واردة' : 'اللوجستيات')));
                    events.push({
                        id: `fact-pay-${pay.id}`,
                        date: pay.date || new Date().toISOString(),
                        type: 'OUT',
                        amount: pay.amount || 0,
                        title: isOutboundShipmentPayment ? 'دفع شحنة صادرة' : (isInboundShipmentPayment ? 'دفع شحنة واردة' : 'تسديد فاتورة'),
                        sourcePage,
                        sourceTab,
                        details: withOptionalDetail(paymentTitle, paymentDetail),
                        beneficiary: tx.category === 'INVENTORY' ? (tx.source || 'غير محدد') : (tx.supplierName || tx.brokerName || 'جهة خارجية'),
                        user: { name: pay.addedBy || 'موظف', avatarPath: staff?.avatar_path, avatarUrl: staff?.avatar_url },
                        isManual: false,
                        rawTx: tx
                    });
                });
            }
        });



        const withRunningBalance = [...events]
            .sort((a, b) => {
                const dA = new Date(a.date).getTime() || 0;
                const dB = new Date(b.date).getTime() || 0;
                if (dA !== dB) return dA - dB;
                return String(a.id).localeCompare(String(b.id));
            })
            .reduce((acc: any[], event) => {
                const previousBalance = acc.length ? acc[acc.length - 1].balanceAfter : 0;
                const signedAmount = event.type === 'IN' ? event.amount : -event.amount;
                acc.push({ ...event, balanceAfter: previousBalance + signedAmount });
                return acc;
            }, []);

        // Sort safely
        return withRunningBalance.sort((a, b) => {
            const dA = new Date(a.date).getTime() || 0;
            const dB = new Date(b.date).getTime() || 0;
            if (dA !== dB) return dB - dA;
            return String(b.id).localeCompare(String(a.id));
        });
    }, [refreshTrigger]);

    // حساب الرصيد الصافي الفعلي (بدون فلاتر التاريخ) لمعرفة المتاح للسحب
    const totalSafeBalance = useMemo(() => {
        const totalIn = allSafeEvents.filter(e => e.type === 'IN').reduce((acc, e) => acc + e.amount, 0);
        const totalOut = allSafeEvents.filter(e => e.type === 'OUT').reduce((acc, e) => acc + e.amount, 0);
        return totalIn - totalOut;
    }, [allSafeEvents]);

    const filteredEvents = useMemo(() => {
        const res = allSafeEvents.filter(e => {
            const matchesSearch =
                e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (e.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (e.beneficiary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (e.user.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch && isDateInRange(e.date);
        });

        return res;
    }, [allSafeEvents, searchTerm, fromDate, toDate]);

    const financials = useMemo(() => {
        const totalIn = filteredEvents.filter(e => e.type === 'IN').reduce((acc, e) => acc + e.amount, 0);
        const totalOut = filteredEvents.filter(e => e.type === 'OUT').reduce((acc, e) => acc + e.amount, 0);
        return { totalIn, totalOut, balance: totalIn - totalOut };
    }, [filteredEvents]);

    const currentEvents = filteredEvents.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const amount = Number(manualModal.amount);
        const dateVal = fd.get('date_val') as string;
        const notes = fd.get('notes') as string;
        const receiver = fd.get('receiver') as string;



        if (isNaN(amount) || amount <= 0) {
            toast.error('خطأ في المبلغ', 'يرجى إدخال مبلغ أكبر من صفر ولا يحتوي على إشارات سالبة.');
            return;
        }

        // التحقق من كفاية الرصيد في حالة السحب فقط
        if (manualModal.mode === 'SAFE_WITHDRAWAL') {
            const currentEffectiveBalance = manualModal.tx
                ? totalSafeBalance + manualModal.tx.amount // استرجاع المبلغ القديم للحسبة في حال التعديل
                : totalSafeBalance;

            if (amount > currentEffectiveBalance) {
                toast.error('رصيد غير كافٍ', `لا يمكنك سحب $${amount.toLocaleString()}، الرصيد المتاح في الخزنة هو $${currentEffectiveBalance.toLocaleString()} فقط.`);
                return;
            }
        }

        try {
            const finalCategory: any = manualModal.mode;

            // Combine selected date with CURRENT time (not 00:00 UTC)
            const selectedDate = new Date(dateVal);
            const now = new Date();
            selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

            const payload: any = {
                category: finalCategory,
                date: selectedDate.toISOString(),
                amount: amount,
                paidAmount: amount, // Full amount for manual safe tx
                notes: `${manualModal.mode === 'SAFE_WITHDRAWAL' ? 'سحب نقدي لصالح:' : 'إيداع نقدي من:'} ${receiver} | ${notes}`,
                transactionType: manualModal.mode === 'SAFE_WITHDRAWAL' ? 'OUT' as const : 'IN' as const,
                withdrawnBy: currentUser?.fullName
            };



            if (manualModal.tx) {
                await db.updateFactoryTransaction(currentUser!.id, manualModal.tx.id, payload);
            } else {
                // Force payment history for SAFE deposits/withdrawals to ensure they appear in financial queries if needed
                payload.payment_history = [{
                    id: Date.now(),
                    amount: amount,
                    date: payload.date,
                    addedBy: currentUser?.fullName || 'النظام',
                    notes: manualModal.mode === 'SAFE_DEPOSIT' ? 'إيداع صندوق' : 'سحب صندوق'
                }] as any;

                await db.addFactoryTransaction(currentUser!.id, payload);
            }



            toast.success('تم تسجيل الحركة بنجاح');
            setManualModal({ ...manualModal, isOpen: false, tx: undefined, amount: '' });

            // Force multiple refreshes to ensure data is visible
            refresh();
            setTimeout(() => refresh(), 500);
            setTimeout(() => refresh(), 1500);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'فشل في حفظ الحركة');
        }
    };

    return (
        <div className="space-y-10 animate-fade-in pb-10" dir="rtl">

            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">

                <Card className="xl:col-span-3 p-8 border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-white flex flex-col justify-between group hover:shadow-2xl transition-all border-b-8 border-emerald-500">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-emerald-500 text-white rounded-[1.5rem] shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                            <TrendingUp size={32} />
                        </div>
                        <Badge color="green" className="font-black px-3 py-1">IN</Badge>
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">إجمالي المقبوضات (الفترة)</p>
                        <h4 className="text-4xl font-black font-mono text-emerald-600 tracking-tighter">${financials.totalIn.toLocaleString()}</h4>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500/60">
                            <Clock size={12} /> آخر استلام: {filteredEvents.find(e => e.type === 'IN')?.date ? formatDate(filteredEvents.find(e => e.type === 'IN')!.date) : '-'}
                        </div>
                    </div>
                </Card>

                <Card className={`xl:col-span-6 p-10 border-0 shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[350px] transition-all duration-700 rounded-[3.5rem] ${(totalSafeBalance < 0) ? 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-200' : 'bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] shadow-blue-200'}`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-10" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                    <div className="relative z-10 text-center">
                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 mb-10 text-white/80">
                            <Vault size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.3em]">السيولة النقدية المتاحة (الآن)</span>
                            <Sparkles size={16} className="text-amber-400 animate-pulse" />
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-baseline justify-center gap-4 text-white">
                                <span className="text-7xl md:text-8xl font-black font-mono tracking-tighter drop-shadow-2xl">
                                    {(totalSafeBalance < 0) ? '-' : ''}${Math.abs(totalSafeBalance).toLocaleString()}
                                </span>
                            </div>
                            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-sky-200 opacity-60">TOTAL VAULT CASH LIQUIDITY</p>
                        </div>
                        <div className="mt-12 flex justify-center gap-4 flex-wrap">
                            <button onClick={() => setManualModal({ isOpen: true, mode: 'SAFE_DEPOSIT', amount: '' })} className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 h-16 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all flex items-center gap-2"><PlusCircle size={24} /> إيداع نقد</button>
                            <button onClick={() => setManualModal({ isOpen: true, mode: 'SAFE_WITHDRAWAL', amount: '' })} className="bg-white text-red-600 hover:bg-red-50 px-8 h-16 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all flex items-center gap-2"><MinusCircle size={24} /> سحب نقد</button>
                        </div>
                    </div>
                </Card>

                <Card className="xl:col-span-3 p-8 border-0 shadow-xl bg-gradient-to-br from-red-50 to-white flex flex-col justify-between group hover:shadow-2xl transition-all border-b-8 border-red-500">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-red-500 text-white rounded-[1.5rem] shadow-lg shadow-red-200 group-hover:scale-110 transition-transform">
                            <TrendingDown size={32} />
                        </div>
                        <Badge color="red" className="font-black px-3 py-1">OUT</Badge>
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">إجمالي المدفوعات (الفترة)</p>
                        <h4 className="text-4xl font-black font-mono text-red-600 tracking-tighter">${financials.totalOut.toLocaleString()}</h4>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-500/60">
                            <Clock size={12} /> آخر صرف: {filteredEvents.find(e => e.type === 'OUT')?.date ? formatDate(filteredEvents.find(e => e.type === 'OUT')!.date) : '-'}
                        </div>
                    </div>
                </Card>
            </div>

            {/* List & Filtering */}
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 px-2 shrink-0">
                        <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl border border-gray-100"><History size={20} /></div>
                        <div><h3 className="font-black text-lg text-gray-800">حركات الكاش والبيانات</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">REAL CASH FEED</p></div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                        <div className="relative flex-1">
                            <input className="w-full h-14 pl-4 pr-11 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner" placeholder="بحث في الحركات، المنفذ، الجهة..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }} />
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                        <DateRangePicker from={fromDate} to={toDate} onChangeFrom={(d: any) => { setFromDate(d); setPage(0); }} onChangeTo={(d: any) => { setToDate(d); setPage(0); }} />
                        <button onClick={() => { setFromDate(''); setToDate(''); }} className="p-3.5 bg-blue-50 text-[#0e3c63] hover:bg-blue-100 rounded-2xl transition-all border border-blue-100 shadow-sm" title="تصفير الفلترة"><RotateCcw size={20} /></button>
                    </div>
                </div>

                <Card className="p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-[3rem]">
                    <div className="overflow-x-auto min-h-[450px]">
                        <table className="w-full text-right text-sm border-collapse">
                            <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] border-b">
                                <tr>
                                    <th className="p-6 pr-10">التوقيت</th>
                                    <th className="p-6">نوع الحركة</th>
                                    <th className="p-6">البيان و المستفيد (المسار)</th>
                                    <th className="p-6">بواسطة</th>
                                    <th className="p-6 text-left">المبلغ ($)</th>
                                    <th className="p-6 text-left">الرصيد بعد الحركة</th>
                                    <th className="p-6 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {currentEvents.map((e: any) => {
                                    const balanceAfter = Number(e.balanceAfter || 0);
                                    return (
                                    <tr key={e.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="p-6 pr-10">
                                            <div className="flex flex-col font-mono">
                                                <span className="font-black text-gray-800 text-sm">{formatDate(e.date)}</span>
                                                <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock size={12} /> {formatTime(e.date)}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            {(() => {
                                                const isSupplier = e.sourcePage === 'نظام الموردين';
                                                let badgeClass = e.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100';
                                                if (isSupplier) {
                                                    badgeClass = e.type === 'IN' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-amber-50 text-amber-700 border border-amber-200';
                                                }
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${badgeClass}`}>
                                                        {isSupplier ? <ArrowRightLeft size={14} /> : (e.type === 'IN' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />)}
                                                        {e.title}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter bg-gray-100 px-2 py-0.5 rounded-md">{e.sourcePage}</span>
                                                    <ChevronLeft size={10} className="text-gray-300" />
                                                    <span className="text-[10px] font-black text-[#0e3c63] uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded-md">{e.sourceTab}</span>
                                                </div>
                                                <p className="font-black text-gray-700 text-sm leading-tight mb-1">{e.details}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <UserCheck size={10} className="text-blue-400" />
                                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{e.beneficiary}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar
                                                    name={e.user.name}
                                                    avatarPath={e.user.avatarPath}
                                                    avatarUrl={e.user.avatarUrl}
                                                    size="md"
                                                    className="border-2 border-white shadow-sm"
                                                />
                                                <span className="font-black text-gray-700 text-xs">{e.user.name}</span>
                                            </div>
                                        </td>
                                        <td className={`p-6 text-left font-mono font-black text-2xl ${e.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                                            {e.type === 'IN' ? '+' : '-'}${e.amount.toLocaleString()}
                                        </td>
                                        <td className={`p-6 text-left font-mono font-black text-xl ${balanceAfter < 0 ? 'text-red-600' : 'text-[#0e3c63]'}`} dir="ltr">
                                            {balanceAfter < 0 ? '-' : ''}${Math.abs(balanceAfter).toLocaleString()}
                                        </td>
                                        <td className="p-6 text-center">
                                            {e.isManual && !e.rawTx?.isLocked ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => setManualModal({ isOpen: true, mode: e.rawTx.category, tx: e.rawTx, amount: e.rawTx.amount.toString() })} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="تعديل"><Edit3 size={16} /></button>
                                                    <button onClick={() => { db.updateFactoryTransaction(currentUser!.id, e.rawTx.id, { isLocked: true }); toast.success('تم قفل الحركة'); refresh(); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="قفل الحركة"><Lock size={16} /></button>
                                                    <button onClick={() => setDeleteConfirm(e)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm" title="حذف"><Trash2 size={16} /></button>
                                                </div>
                                            ) : e.isManual && e.rawTx?.isLocked ? (
                                                <div className="flex items-center justify-center">
                                                    <button 
                                                        onDoubleClick={() => {
                                                            if (isSuperAdmin) {
                                                                db.updateFactoryTransaction(currentUser!.id, e.rawTx.id, { isLocked: false });
                                                                toast.success('تم فتح قفل الحركة');
                                                                refresh();
                                                            }
                                                        }}
                                                        className={`p-2.5 rounded-xl transition-all ${isSuperAdmin ? 'bg-amber-50 text-amber-500 hover:bg-amber-100 cursor-pointer' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`} 
                                                        title={isSuperAdmin ? 'انقر مرتين لفتح القفل' : 'حركة مقفلة'}
                                                    >
                                                        <Lock size={16} className="mx-auto" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <span className="p-2.5 bg-gray-50 text-gray-300 rounded-xl" title="عملية مرتبطة - التعديل من صفحة المورد">
                                                        <Lock size={16} className="mx-auto" />
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                                {currentEvents.length === 0 && (
                                    <tr><td colSpan={7} className="p-32 text-center text-gray-400 font-black italic opacity-30 flex flex-col items-center gap-4"><Wallet size={64} /><p className="text-xl">لا توجد حركات نقدية مطابقة في هذه الفترة</p></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControl page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={filteredEvents.length} />
                </Card>
            </div>

            {/* Manual Entry Modal */}
            {manualModal.isOpen && (
                <div className="fixed inset-0 bg-[#0e3c63]/50 backdrop-blur-md z-[1000] flex items-center justify-center p-4 !mt-0">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in border border-white/20">
                        <div className={`p-8 text-white flex justify-between items-center ${manualModal.mode === 'SAFE_DEPOSIT' ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-red-600 to-red-800'}`}>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl shadow-inner">{manualModal.mode === 'SAFE_DEPOSIT' ? <PlusCircle size={24} /> : <MinusCircle size={24} />}</div>
                                <div><h3 className="font-black text-xl">{manualModal.tx ? 'تعديل عملية' : (manualModal.mode === 'SAFE_DEPOSIT' ? 'إيداع نقد يدوي' : 'سحب نقد يدوي')}</h3><p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Manual Safe Transaction</p></div>
                            </div>
                            <button onClick={() => setManualModal({ ...manualModal, isOpen: false, tx: undefined, amount: '' })} className="bg-white/10 hover:bg-red-500 p-2.5 rounded-xl transition-all shadow-inner"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleManualSubmit} className="p-10 space-y-6 bg-gray-50/30">
                            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center shadow-inner group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-[0.2em]">المبلغ النقدي ($)</label>
                                <div className="relative w-full flex justify-center items-center">
                                    <span className="text-4xl font-black text-[#0e3c63] ml-3">$</span>
                                    <input
                                        name="amount"
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                        className="w-full max-w-[200px] text-5xl font-black font-mono text-center bg-transparent outline-none text-gray-800"
                                        placeholder="0"
                                        value={manualModal.amount}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || Number(val) >= 0) {
                                                setManualModal({ ...manualModal, amount: val });
                                            }
                                        }}
                                        autoFocus
                                        required
                                    />
                                </div>
                                {manualModal.mode === 'SAFE_WITHDRAWAL' && (
                                    <p className="mt-4 text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
                                        <AlertCircle size={12} className="text-amber-500" />
                                        المتاح للسحب حالياً: <span className="text-[#0e3c63] font-black">${totalSafeBalance.toLocaleString()}</span>
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-5">
                                <ModernSingleDatePicker label="تاريخ الحركة" value={manualModal.tx?.date ? new Date(manualModal.tx.date).toISOString().split('T')[0] : getTodayDateString()} onChange={(val) => { const input = document.getElementById('date_val_hidden') as HTMLInputElement; if (input) input.value = val; }} />
                                <input type="hidden" id="date_val_hidden" name="date_val" defaultValue={manualModal.tx?.date ? new Date(manualModal.tx.date).toISOString().split('T')[0] : getTodayDateString()} />
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">المستفيد / المصدر</label><input name="receiver" className="w-full h-14 bg-white border-2 border-gray-100 rounded-2xl px-5 font-black text-gray-700 focus:border-[#0e3c63] outline-none shadow-sm" placeholder="الاسم..." defaultValue={manualModal.tx?.notes?.split('|')[0]?.replace(/.*:/, '')?.trim()} required /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">البيان (التفاصيل)</label><textarea name="notes" className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl font-bold text-sm text-gray-600 focus:border-[#0e3c63] outline-none min-h-[100px] shadow-sm" placeholder="ملاحظات..." defaultValue={manualModal.tx?.notes?.split('|')[1]?.trim() || manualModal.tx?.notes} required /></div>
                            </div>
                            <div className="flex gap-4">
                                <Button type="submit" className={`flex-1 h-16 text-white text-lg font-black rounded-2xl shadow-xl active:scale-95 transition-all ${manualModal.mode === 'SAFE_DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>تأكيد وحفظ</Button>
                                <button type="button" onClick={() => setManualModal({ ...manualModal, isOpen: false, tx: undefined, amount: '' })} className="px-8 h-16 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all border border-gray-100">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-fade-in !mt-0">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                        <div className="bg-gradient-to-br from-red-600 to-red-800 p-10 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                            <div className="relative z-10"><div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20"><AlertOctagon size={42} className="text-white animate-pulse" /></div><h3 className="text-2xl font-black mb-2">إلغاء عملية نقدية</h3><p className="text-red-100 text-sm font-bold opacity-80">سيتم التراجع عن هذه الحركة وتصحيح رصيد الصندوق</p></div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-gray-50 rounded-[2rem] p-8 border-2 border-dashed border-gray-200 text-center">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">القيمة المراد حذفها</p>
                                <h4 className="text-4xl font-black font-mono text-red-600 tracking-tighter" dir="ltr">${deleteConfirm.amount.toLocaleString()}</h4>
                                <p className="text-sm font-bold text-gray-500 mt-3">{deleteConfirm.details}</p>
                            </div>
                            <div className="space-y-3">
                                <Button onClick={() => { db.deleteFactoryTransaction(currentUser!.id, deleteConfirm.rawTx.id); toast.success('تم حذف الحركة وتصحيح الرصيد'); setDeleteConfirm(null); refresh(); }} className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg border-b-4 border-red-800 active:scale-95 transition-all"> <Trash2 size={24} /> نعم، احذف الحركة نهائياً</Button>
                                <button onClick={() => setDeleteConfirm(null)} className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200">تراجع عن الحذف</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
