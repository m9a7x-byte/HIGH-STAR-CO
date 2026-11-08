import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Search, MapPin, Phone, CreditCard, ExternalLink, History as HistoryIcon, AlertCircle, TrendingDown, Wallet, ArrowLeft, X, Save, Box, Globe, ShieldCheck, Lock, PackageSearch, Trash2, Edit3, Filter, Banknote, Trash, AlertOctagon, RefreshCcw, XCircle, Info, Truck, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatDate } from '../../../lib/dateUtils';
import { Card, Badge, Button, Input, DateRangePicker } from '../../../components/ui';
import { PhoneInput } from '../../../components/ui/PhoneInput';

import { db } from '../../../lib/db';
import { Supplier, FactoryTransaction, FactoryPaymentLog } from '../../../types';
import { materialLabels } from '../components/SharedFactoryComponents';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

interface SuppliersTabProps {
    refreshTrigger: number;
    onOpenModal: (category: any, metadata?: any) => void;
}

const supplierLedgerCategories = ['SUPPLIER', 'CUSTOMS', 'SUPPLIER_PAYMENT', 'SUPPLIER_DEPOSIT', 'SUPPLIER_WITHDRAWAL'];
const supplierDebtCategories = ['SUPPLIER', 'CUSTOMS'];
const unifiedSupplierPaymentAllocationPattern = /توزيع دين:\s*\$?([\d,]+)/;

const isSupplierDebtInvoice = (tx: FactoryTransaction) => supplierDebtCategories.includes(tx.category);
const isSupplierAccountMovement = (tx: FactoryTransaction) => ['SUPPLIER_PAYMENT', 'SUPPLIER_DEPOSIT', 'SUPPLIER_WITHDRAWAL'].includes(tx.category);
const isUnifiedSupplierPaymentLog = (log: FactoryPaymentLog) => (log.notes || '').includes('تسديد موحد');
const getUnifiedSupplierDebtAllocation = (tx: FactoryTransaction) => {
    const match = (tx.notes || '').match(unifiedSupplierPaymentAllocationPattern);
    return match ? Number(match[1].replace(/,/g, '')) || 0 : 0;
};
const getSupplierStandaloneInvoicePaidAmount = (tx: FactoryTransaction) => {
    if (!isSupplierDebtInvoice(tx)) return 0;
    if (!tx.paymentHistory || tx.paymentHistory.length === 0) return tx.paidAmount || 0;
    return tx.paymentHistory
        .filter(log => !isUnifiedSupplierPaymentLog(log))
        .reduce((sum, log) => sum + (Number(log.amount) || 0), 0);
};
const getSupplierBilledDebtAmount = (tx: FactoryTransaction) => {
    if (isSupplierDebtInvoice(tx)) return tx.amount || 0;
    return 0;
};
const getSupplierDebtAmount = (tx: FactoryTransaction) => {
    if (isSupplierDebtInvoice(tx)) return Math.max((tx.amount || 0) - (tx.paidAmount || 0), 0);
    return 0;
};
const getSupplierPaidAmount = (tx: FactoryTransaction) => {
    if (isSupplierDebtInvoice(tx)) return tx.paidAmount || 0;
    return 0;
};
const getSupplierSettledAmount = (tx: FactoryTransaction) => {
    if (isSupplierDebtInvoice(tx)) return tx.paidAmount || 0;
    if (tx.category === 'SUPPLIER_PAYMENT' || tx.category === 'SUPPLIER_DEPOSIT') return tx.amount || 0;
    if (tx.category === 'SUPPLIER_WITHDRAWAL') return -(tx.amount || 0);
    return 0;
};
const getSupplierNetAmount = (tx: FactoryTransaction) => {
    if (isSupplierDebtInvoice(tx)) return -getSupplierDebtAmount(tx);
    if (tx.category === 'SUPPLIER_PAYMENT') return (tx.amount || 0) - getUnifiedSupplierDebtAllocation(tx);
    if (tx.category === 'SUPPLIER_DEPOSIT') return tx.amount || 0;
    if (tx.category === 'SUPPLIER_WITHDRAWAL') return -(tx.amount || 0);
    return 0;
};
const formatSignedMoney = (value: number) => `${value < 0 ? '-' : value > 0 ? '+' : ''}$${Math.abs(value).toLocaleString()}`;
type DeleteTxMode = 'RETURN_TO_SUPPLIER' | 'KEEP_AMOUNT';

export const SuppliersTab = ({ refreshTrigger, onOpenModal }: SuppliersTabProps) => {
    const { t: translate } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'DEBT'>('ALL');
    const [supplierBalanceFilter, setSupplierBalanceFilter] = useState<'ALL' | 'DEBT' | 'CREDIT'>('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // مفتاح محلي لإجبار الواجهة على التحديث عند تغيير البيانات
    const [localRefresh, setLocalRefresh] = useState(0);
    const forceUpdate = () => setLocalRefresh(prev => prev + 1);

    // الاشتراك في تغييرات قاعدة البيانات لضمان المزامنة اللحظية
    useEffect(() => {
        const unsubscribe = db.subscribe(forceUpdate);
        return () => unsubscribe();
    }, []);

    // حالات نافذة الحذف الآمن
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, supplier: Supplier | null }>({
        isOpen: false,
        supplier: null
    });

    // حالات نافذة العمليات المالية (تسديد ذكي / سحب)
    const [balanceModal, setBalanceModal] = useState<{ isOpen: boolean, type: 'PAYMENT' | 'WITHDRAWAL' }>({ isOpen: false, type: 'PAYMENT' });
    const [balanceAmount, setBalanceAmount] = useState('');
    const [balanceNote, setBalanceNote] = useState('');
    const [deleteTxModal, setDeleteTxModal] = useState<FactoryTransaction | null>(null);

    const suppliers = useMemo(() => db.getSuppliers(), [refreshTrigger, localRefresh]);

    // حساب الرصيد الحقيقي لكل مورد من الحركات المالية
    const supplierBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        const allTxs = db.getFactoryTransactions();
        suppliers.forEach(s => {
            const sid = String(s.id);
            const sTxs = allTxs.filter(t =>
                String(t.supplierId) === sid &&
                supplierLedgerCategories.includes(t.category)
            );
            let balance = 0;
            sTxs.forEach(t => {
                balance += getSupplierNetAmount(t);
            });
            balances[sid] = balance;
        });
        return balances;
    }, [suppliers, refreshTrigger, localRefresh]);

    const supplierStats = useMemo(() => {
        let totalDebt = 0;
        let totalCredit = 0;
        let debtCount = 0;
        let creditCount = 0;

        Object.values(supplierBalances).forEach(balance => {
            if (balance < 0) {
                totalDebt += Math.abs(balance);
                debtCount++;
            } else if (balance > 0) {
                totalCredit += balance;
                creditCount++;
            }
        });

        return {
            totalDebt,
            totalCredit,
            debtCount,
            creditCount,
            total: suppliers.length
        };
    }, [supplierBalances, suppliers.length]);

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => {
            const balance = supplierBalances[String(s.id)] || 0;
            const matchesSearch =
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.phone && s.phone.includes(searchTerm));
            const matchesBalance =
                supplierBalanceFilter === 'ALL' ||
                (supplierBalanceFilter === 'DEBT' ? balance < 0 : balance > 0);

            return matchesSearch && matchesBalance;
        });
    }, [suppliers, searchTerm, supplierBalances, supplierBalanceFilter]);

    const isDateInRange = (date: string) => {
        const txDate = new Date(date).setHours(0, 0, 0, 0);
        const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
        const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
        return txDate >= start && txDate <= end;
    };

    const supplierDateFilteredTxs = useMemo(() => {
        if (!viewingSupplier) return [];
        return db.getFactoryTransactions().filter(t =>
            String(t.supplierId) === String(viewingSupplier.id) &&
            supplierLedgerCategories.includes(t.category) &&
            isDateInRange(t.date)
        );
    }, [viewingSupplier, refreshTrigger, localRefresh, fromDate, toDate]);

    const supplierSummary = useMemo(() => {
        const paidMovements = supplierDateFilteredTxs.filter(t => (isSupplierAccountMovement(t) && getSupplierSettledAmount(t) !== 0) || getSupplierStandaloneInvoicePaidAmount(t) > 0);
        const debtMovements = supplierDateFilteredTxs.filter(t => getSupplierBilledDebtAmount(t) > 0);
        const paid = Math.max(0, paidMovements.reduce((sum, t) => sum + (isSupplierAccountMovement(t) ? getSupplierSettledAmount(t) : getSupplierStandaloneInvoicePaidAmount(t)), 0));
        const debt = debtMovements.reduce((sum, t) => sum + getSupplierBilledDebtAmount(t), 0);
        const net = supplierDateFilteredTxs.reduce((sum, t) => sum + getSupplierNetAmount(t), 0);

        return {
            paid,
            debt,
            net,
            paidCount: paidMovements.length,
            debtCount: debtMovements.length,
            totalCount: supplierDateFilteredTxs.length
        };
    }, [supplierDateFilteredTxs]);

    const supplierTxs = useMemo(() => {
        let txs = supplierDateFilteredTxs;
        if (statusFilter === 'PAID') txs = txs.filter(t => (isSupplierAccountMovement(t) && getSupplierSettledAmount(t) !== 0) || getSupplierStandaloneInvoicePaidAmount(t) > 0);
        if (statusFilter === 'DEBT') txs = txs.filter(t => getSupplierBilledDebtAmount(t) > 0);
        return txs;
    }, [supplierDateFilteredTxs, statusFilter]);

    const netCardTheme = useMemo(() => {
        if (supplierSummary.net < 0) {
            return {
                active: 'bg-red-600 text-white border-red-600 shadow-xl',
                idle: 'bg-red-50 border-red-100 hover:border-red-300 text-red-700',
                labelActive: 'text-red-100',
                labelIdle: 'text-red-700',
                subActive: 'text-red-100',
                subIdle: 'text-red-500'
            };
        }
        if (supplierSummary.net > 0) {
            return {
                active: 'bg-emerald-600 text-white border-emerald-600 shadow-xl',
                idle: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300 text-emerald-700',
                labelActive: 'text-emerald-100',
                labelIdle: 'text-emerald-700',
                subActive: 'text-emerald-100',
                subIdle: 'text-emerald-500'
            };
        }
        return {
            active: 'bg-[#0e3c63] text-white border-[#0e3c63] shadow-xl',
            idle: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300 text-[#0e3c63]',
            labelActive: 'text-indigo-100',
            labelIdle: 'text-indigo-700',
            subActive: 'text-indigo-100',
            subIdle: 'text-indigo-500'
        };
    }, [supplierSummary.net]);

    const getMaterialDisplay = (tx: FactoryTransaction) => {
        if (tx.category === 'SUPPLIER_PAYMENT') return tx.notes || 'تسديد مورد';
        if (tx.category === 'SUPPLIER_DEPOSIT') return tx.notes || 'إيداع رصيد مورد';
        if (tx.category === 'SUPPLIER_WITHDRAWAL') return tx.notes || 'سحب رصيد مورد';
        if (tx.materialType && materialLabels[tx.materialType]) return translate(materialLabels[tx.materialType]);
        return tx.materialType || 'مواد أولية';
    };

    const getMovementUser = (tx: FactoryTransaction) => {
        const latestPayment = tx.paymentHistory?.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (statusFilter === 'PAID' && latestPayment) {
            return { name: latestPayment.addedBy, label: 'آخر تسديد' };
        }

        if (tx.category === 'SUPPLIER_PAYMENT' || tx.category === 'SUPPLIER_DEPOSIT' || tx.category === 'SUPPLIER_WITHDRAWAL') {
            return { name: tx.withdrawnBy || 'نظام المصنع', label: 'منفذ الحركة' };
        }

        return {
            name: tx.withdrawnBy || latestPayment?.addedBy || 'نظام المصنع',
            label: latestPayment ? `آخر تسديد: ${latestPayment.addedBy}` : 'منشئ الفاتورة'
        };
    };

    const handleSaveSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const fd = new FormData(form);
        const name = fd.get('name') as string;
        const phone = fd.get('phone') as string;
        const address = fd.get('address') as string;

        if (editingSupplier) {
            db.updateSupplier(user!.id, editingSupplier.id, { name, phone, address });
            toast.success('تم تحديث بيانات المورد بنجاح');
            setEditingSupplier(null);
            forceUpdate();
        } else {
            db.addSupplier(user!.id, { name, phone, address });
            toast.success('تمت إضافة المورد الجديد بنجاح');
            setShowAddModal(false);
            forceUpdate();
        }
    };

    const handleOpenDelete = (e: React.MouseEvent, supplier: Supplier) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, supplier });
    };

    const executeDelete = () => {
        if (!deleteModal.supplier) return;
        try {
            const supplierIdToDelete = deleteModal.supplier.id;
            db.deleteSupplier(user!.id, supplierIdToDelete);
            toast.success('تم حذف المورد نهائياً من سجلات المصنع');

            // تحديث الحالات المحلية فوراً
            if (viewingSupplier?.id === supplierIdToDelete) {
                setViewingSupplier(null);
            }

            setDeleteModal({ isOpen: false, supplier: null });
            forceUpdate();
        } catch (err: any) {
            toast.error('فشل الحذف', err.message);
        }
    };

    const payOldestSupplierDebts = async (amount: number) => {
        if (!viewingSupplier) return { paid: 0, remainder: amount, invoices: 0 };

        let remainingPayment = amount;
        const openInvoices = db.getFactoryTransactions()
            .filter(tx =>
                String(tx.supplierId) === String(viewingSupplier.id) &&
                isSupplierDebtInvoice(tx) &&
                getSupplierDebtAmount(tx) > 0
            )
            .sort((a, b) => {
                const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                if (dateDiff !== 0) return dateDiff;
                return Number(a.id) - Number(b.id);
            });

        const totalOpenDebt = openInvoices.reduce((sum, tx) => sum + getSupplierDebtAmount(tx), 0);
        const allocations: { id: FactoryTransaction['id']; amount: number }[] = [];
        for (const invoice of openInvoices) {
            if (remainingPayment <= 0) break;

            const invoiceDebt = getSupplierDebtAmount(invoice);
            const appliedAmount = Math.min(invoiceDebt, remainingPayment);
            const updatedPaidAmount = (invoice.paidAmount || 0) + appliedAmount;
            const newLog: FactoryPaymentLog = {
                id: Date.now() + allocations.length,
                amount: appliedAmount,
                date: new Date().toISOString(),
                addedBy: user?.fullName || 'موظف غير معروف',
                notes: 'تسديد موحد'
            };
            const updatedHistory = [...(invoice.paymentHistory || []), newLog];

            await db.updateFactoryTransaction(user!.id, invoice.id, {
                paidAmount: updatedPaidAmount,
                payment_history: updatedHistory,
                paymentHistory: updatedHistory
            });

            allocations.push({ id: invoice.id, amount: appliedAmount });
            remainingPayment -= appliedAmount;
        }

        return {
            paid: Math.min(amount, totalOpenDebt),
            remainder: remainingPayment,
            invoices: allocations.length,
            allocations
        };
    };

    const buildUnifiedSupplierPaymentDescription = (amount: number, result: Awaited<ReturnType<typeof payOldestSupplierDebts>>, note: string) => {
        const allocationText = result.allocations.length > 0
            ? `توزعت على ${result.allocations.length} حركة: ${result.allocations.map(a => `#${(Number(a.id) % 10000).toString().padStart(4, '0')} ($${a.amount.toLocaleString()})`).join('، ')}`
            : 'لا توجد حركات دين مفتوحة';
        const remainderText = result.remainder > 0 ? ` | رصيد مقدم: $${result.remainder.toLocaleString()}` : '';
        const noteText = note.trim() ? ` | ملاحظة: ${note.trim()}` : '';
        return `تسديد مورد موحد $${amount.toLocaleString()} - ${allocationText}${remainderText} | توزيع دين: $${result.paid.toLocaleString()}${noteText}`;
    };

    const handleBalanceAction = async () => {
        if (!viewingSupplier || !balanceAmount) return;
        const amt = Number(balanceAmount);
        if (isNaN(amt) || amt <= 0) { toast.error('الرجاء إدخال مبلغ صحيح'); return; }
        try {
            if (balanceModal.type === 'PAYMENT') {
                const result = await payOldestSupplierDebts(amt);
                await db.addSupplierTransaction(user!.id, {
                    supplierId: viewingSupplier.id,
                    type: 'PAYMENT',
                    amount: amt,
                    description: buildUnifiedSupplierPaymentDescription(amt, result, balanceNote),
                });

                if (result.paid > 0 && result.remainder > 0) {
                    toast.success('تم التسديد وإضافة الرصيد', `تم تسديد $${result.paid.toLocaleString()} وإضافة $${result.remainder.toLocaleString()} للحساب`);
                } else if (result.paid > 0) {
                    toast.success('تم دفع الدين على أقدم الفواتير', `تم توزيع المبلغ على ${result.invoices} فاتورة`);
                } else {
                    toast.success('تمت إضافة الرصيد للحساب', `تمت إضافة $${result.remainder.toLocaleString()}`);
                }
                setStatusFilter('PAID');
            } else {
                await db.addSupplierTransaction(user!.id, {
                    supplierId: viewingSupplier.id,
                    type: balanceModal.type,
                    amount: amt,
                    description: balanceNote || 'سحب رصيد',
                });
                toast.success('تم السحب بنجاح');
                setStatusFilter('ALL');
            }
            const updatedSupplier = db.suppliers.find(s => s.id === viewingSupplier.id);
            if (updatedSupplier) setViewingSupplier({ ...updatedSupplier });
            setBalanceModal({ isOpen: false, type: 'PAYMENT' });
            setBalanceAmount(''); setBalanceNote('');
            forceUpdate();
        } catch (err) { toast.error('حدث خطأ أثناء العملية'); }
    };

    const handleOpenDeleteTx = (tx: FactoryTransaction) => {
        setDeleteTxModal(tx);
    };

    const executeDeleteTx = async (mode: DeleteTxMode) => {
        if (!deleteTxModal || !viewingSupplier) return;

        const tx = deleteTxModal;
        const paidAmount = getSupplierPaidAmount(tx);
        const invoiceRef = `#${(Number(tx.id) % 10000).toString().padStart(4, '0')}`;

        try {
            if (mode === 'RETURN_TO_SUPPLIER' && paidAmount > 0) {
                await db.addSupplierTransaction(user!.id, {
                    supplierId: viewingSupplier.id,
                    type: 'PAYMENT',
                    amount: paidAmount,
                    description: `إرجاع مبلغ للمورد بعد حذف الحركة ${invoiceRef}`,
                });
            }

            await db.deleteFactoryTransaction(user!.id, tx.id);
            toast.success(
                mode === 'RETURN_TO_SUPPLIER' && paidAmount > 0
                    ? 'تم حذف الحركة وإرجاع المبلغ للمورد'
                    : 'تم حذف الحركة مع الاحتفاظ بالمبلغ'
            );
            setDeleteTxModal(null);
            forceUpdate();
        } catch (err: any) {
            toast.error('فشل حذف الحركة', err.message || 'تعذر تنفيذ العملية');
        }
    };

    if (viewingSupplier) {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <button onClick={() => setViewingSupplier(null)} className="p-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-[#0e3c63] hover:text-white transition-all transform hover:translate-x-1">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="w-20 h-20 bg-blue-50 text-[#0e3c63] rounded-3xl flex items-center justify-center font-black text-3xl shadow-inner border border-blue-100">
                            {viewingSupplier.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-800">{viewingSupplier.name}</h2>
                            <span className="text-[10px] font-mono text-gray-300 font-bold mt-1 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">ID: {viewingSupplier.id}</span>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400 font-bold">
                                <span className="flex items-center gap-1.5"><Phone size={14} /> {viewingSupplier.phone || '-'}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="flex items-center gap-1.5"><MapPin size={14} /> {viewingSupplier.address || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto relative z-10">
                        <button
                            onClick={() => setStatusFilter('DEBT')}
                            className={`p-5 rounded-[1.5rem] min-w-[170px] border-2 text-right transition-all ${statusFilter === 'DEBT' ? 'bg-red-600 text-white border-red-600 shadow-xl' : 'bg-red-50 border-red-100 hover:border-red-300 text-red-700'}`}
                        >
                            <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'DEBT' ? 'text-red-100' : 'text-red-600'}`}>الدين</span>
                            <h3 className="text-2xl font-black font-mono" dir="ltr">${supplierSummary.debt.toLocaleString()}</h3>
                            <span className={`text-[10px] font-black mt-2 inline-block ${statusFilter === 'DEBT' ? 'text-red-100' : 'text-red-500'}`}>{supplierSummary.debtCount.toLocaleString()} حركة</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('PAID')}
                            className={`p-5 rounded-[1.5rem] min-w-[170px] border-2 text-right transition-all ${statusFilter === 'PAID' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl' : 'bg-emerald-50 border-emerald-100 hover:border-emerald-300 text-emerald-700'}`}
                        >
                            <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'PAID' ? 'text-emerald-100' : 'text-emerald-600'}`}>المسدد إلها</span>
                            <h3 className="text-2xl font-black font-mono" dir="ltr">${supplierSummary.paid.toLocaleString()}</h3>
                            <span className={`text-[10px] font-black mt-2 inline-block ${statusFilter === 'PAID' ? 'text-emerald-100' : 'text-emerald-500'}`}>{supplierSummary.paidCount.toLocaleString()} حركة</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`p-5 rounded-[1.5rem] min-w-[220px] border-2 text-right transition-all ${statusFilter === 'ALL' ? netCardTheme.active : netCardTheme.idle}`}
                        >
                            <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'ALL' ? netCardTheme.labelActive : netCardTheme.labelIdle}`}>الصافي بين الدين والمسدد</span>
                            <h3 className="text-2xl font-black font-mono" dir="ltr">
                                {formatSignedMoney(supplierSummary.net)}
                            </h3>
                            <span className={`text-[10px] font-black mt-2 inline-block ${statusFilter === 'ALL' ? netCardTheme.subActive : netCardTheme.subIdle}`}>
                                {supplierSummary.net < 0 ? 'يطلبنا فلوس' : supplierSummary.net > 0 ? 'نطلبه فلوس' : 'لا نطلبه ولا يطلبنا'} • {supplierSummary.totalCount.toLocaleString()} حركة
                            </span>
                        </button>
                    </div>
                </div>

                {/* Balance Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => { setBalanceModal({ isOpen: true, type: 'PAYMENT' }); setBalanceAmount(''); setBalanceNote(''); }} className="p-5 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-300 transition-all flex items-center gap-4 group hover:shadow-lg">
                        <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md group-hover:scale-110 transition-transform"><Wallet size={22} /></div>
                        <div className="text-right"><p className="text-xs font-black text-emerald-700">تسديد / إضافة رصيد</p><p className="text-[10px] text-emerald-500 font-bold mt-1">يسدد الدين أولاً والزائد يصير رصيد</p></div>
                    </button>
                    <button onClick={() => { setBalanceModal({ isOpen: true, type: 'WITHDRAWAL' }); setBalanceAmount(''); setBalanceNote(''); }} className="p-5 rounded-[2rem] bg-amber-50 border-2 border-amber-100 hover:border-amber-300 transition-all flex items-center gap-4 group hover:shadow-lg">
                        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md group-hover:scale-110 transition-transform"><ArrowUpRight size={22} /></div>
                        <div className="text-right"><p className="text-xs font-black text-amber-700">سحب رصيد</p><p className="text-[10px] text-amber-500 font-bold mt-1">يسجل الحركة حتى لو الرصيد صفر</p></div>
                    </button>
                </div>

                {/* Filters Bar */}
                <div className="bg-white p-3 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap p-1.5 rounded-2xl bg-gray-50 border border-gray-100 gap-2">
                        <button onClick={() => setStatusFilter('ALL')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${statusFilter === 'ALL' ? 'bg-[#0e3c63] text-white shadow-md' : 'text-gray-400 hover:bg-white'}`}>الكل</button>
                        <button onClick={() => setStatusFilter('PAID')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${statusFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-white'}`}>المسدد</button>
                        <button onClick={() => setStatusFilter('DEBT')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${statusFilter === 'DEBT' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:bg-white'}`}>الدين</button>
                    </div>
                    <DateRangePicker from={fromDate} to={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
                </div>

                {/* Supply Record Table */}
                <Card className="p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-[3rem]">
                    <div className="overflow-x-auto min-h-[450px]">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] border-b">
                                <tr>
                                    <th className="p-6 pr-10">التاريخ</th>
                                    <th className="p-6">المادة الموردة / نوع الحركة</th>
                                    <th className="p-6 text-left">قيمة ($)</th>
                                    <th className="p-6 text-left">الدين ($)</th>
                                    <th className="p-6 text-left">المسدد ($)</th>
                                    <th className="p-6 text-center">حالة الحركة</th>
                                    <th className="p-6">المستخدم</th>
                                    <th className="p-6 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {supplierTxs.length === 0 ? (
                                    <tr><td colSpan={8} className="p-32 text-center text-gray-400 font-black italic opacity-30 flex flex-col items-center gap-4">
                                        <HistoryIcon size={64} />
                                        <p className="text-xl">لا توجد سجلات مطابقة للفلترة</p>
                                    </td></tr>
                                ) : supplierTxs.map((tx) => {
                                    const invoiceValue = tx.amount || 0;
                                    const debtAmount = getSupplierDebtAmount(tx);
                                    const isDebtInvoice = isSupplierDebtInvoice(tx);
                                    const paidAmount = isDebtInvoice ? getSupplierPaidAmount(tx) : getSupplierSettledAmount(tx);
                                    const isAccountBalanceMovement = ['SUPPLIER_PAYMENT', 'SUPPLIER_DEPOSIT', 'SUPPLIER_WITHDRAWAL'].includes(tx.category);
                                    const isFullyPaid = isDebtInvoice && debtAmount === 0 && paidAmount > 0;
                                    const isPaidOnly = !isDebtInvoice && paidAmount > 0 && debtAmount === 0;
                                    const isDebtOnly = debtAmount > 0 && paidAmount === 0;
                                    const canEditFinance = isSupplierDebtInvoice(tx);
                                    const movementUser = getMovementUser(tx);
                                    return (
                                        <tr key={tx.id} className="hover:bg-blue-50/20 transition-all group">
                                            <td className="p-6 pr-10">
                                                <div className="font-mono font-black text-gray-800 text-sm">{formatDate(tx.date)}</div>
                                                <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">INV #{(Number(tx.id) % 10000).toString().padStart(4, '0')}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-[#0e3c63] flex items-center gap-2">
                                                    <Box size={14} className="text-blue-300" />
                                                    {getMaterialDisplay(tx)}
                                                </div>
                                            </td>
                                            <td className="p-6 text-left font-mono font-black text-[#0e3c63] text-lg">{invoiceValue > 0 ? `$${invoiceValue.toLocaleString()}` : '-'}</td>
                                            <td className="p-6 text-left font-mono font-black text-gray-700 text-lg">{debtAmount > 0 ? `$${debtAmount.toLocaleString()}` : '-'}</td>
                                            <td className={`p-6 text-left font-mono font-black text-lg ${paidAmount < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{paidAmount !== 0 ? formatSignedMoney(paidAmount) : '-'}</td>
                                            <td className="p-6 text-center">
                                                {isAccountBalanceMovement ? (
                                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 font-black text-[10px] shadow-sm">
                                                        <Wallet size={12} /> حركة رصيد
                                                    </div>
                                                ) : (isFullyPaid || isPaidOnly) ? (
                                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-black text-[10px] shadow-sm">
                                                        <ShieldCheck size={12} /> مسدد
                                                    </div>
                                                ) : isDebtOnly ? (
                                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-[10px] shadow-sm">
                                                        <AlertCircle size={12} /> دين
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 font-black text-[10px] shadow-sm">
                                                        <AlertCircle size={12} /> جزئي
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-gray-700 text-xs">{movementUser.name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold mt-1">{movementUser.label}</div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => canEditFinance && onOpenModal(tx.category, { tx })}
                                                        disabled={!canEditFinance}
                                                        className={`p-2.5 rounded-xl border transition-all ${canEditFinance ? 'bg-white text-blue-600 border-gray-200 hover:bg-blue-50 hover:shadow-md' : 'bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed'}`}
                                                        title={!canEditFinance ? 'حركة مالية مباشرة' : 'تعديل مبلغ الفاتورة وبياناتها'}
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDeleteTx(tx)}
                                                        className="p-2.5 bg-white text-red-500 border border-gray-200 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                        title="حذف الحركة"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Balance Action Modal */}
                {balanceModal.isOpen && (
                    <div className="fixed inset-0 bg-[#0e3c63]/50 backdrop-blur-md z-[800] flex items-center justify-center p-4 !mt-0 animate-fade-in">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border-t-[12px] border-[#0e3c63]">
                            <div className="p-8 text-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${balanceModal.type === 'PAYMENT' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                    {balanceModal.type === 'PAYMENT' ? <Wallet size={28} className="text-white" /> : <ArrowUpRight size={28} className="text-white" />}
                                </div>
                                <h3 className="text-xl font-black text-gray-800">{balanceModal.type === 'PAYMENT' ? 'تسديد ذكي / إضافة رصيد' : 'سحب رصيد'}</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">
                                    {balanceModal.type === 'PAYMENT' ? 'يسدد الدين المفتوح أولاً، والزائد يتحول إلى رصيد موجب' : viewingSupplier?.name}
                                </p>
                            </div>
                            <div className="p-8 pt-0 space-y-5">
                                <div>
                                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">المبلغ ($)</label>
                                    <input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="0" className="w-full h-16 text-center text-3xl font-black font-mono bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-[#0e3c63] outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">ملاحظات (اختياري)</label>
                                    <input type="text" value={balanceNote} onChange={e => setBalanceNote(e.target.value)} placeholder="وصف العملية..." className="w-full h-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#0e3c63] outline-none text-sm font-bold" />
                                </div>
                            </div>
                            <div className="p-8 pt-0 flex gap-3">
                                <Button onClick={handleBalanceAction} className={`flex-1 h-14 text-white rounded-2xl shadow-xl font-black ${balanceModal.type === 'PAYMENT' ? 'bg-emerald-600' : 'bg-amber-600'}`}>تنفيذ العملية</Button>
                                <button onClick={() => setBalanceModal({ isOpen: false, type: 'PAYMENT' })} className="px-8 h-14 rounded-2xl font-bold text-gray-500 hover:bg-gray-50">إلغاء</button>
                            </div>
                        </div>
                    </div>
                )}

                {deleteTxModal && (
                    <div className="fixed inset-0 bg-[#0e3c63]/60 backdrop-blur-md z-[850] flex items-center justify-center p-4 !mt-0 animate-fade-in">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-white/30">
                            <div className="p-8 bg-gradient-to-br from-slate-900 to-[#0e3c63] text-white relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                <div className="relative z-10 flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-xl">
                                        <Trash2 size={30} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.25em] mb-2">إجراء حذف الحركة</p>
                                        <h3 className="text-2xl font-black">اختيار طريقة الحذف</h3>
                                        <p className="text-sm text-blue-100 font-bold mt-2">{getMaterialDisplay(deleteTxModal)} • INV #{(Number(deleteTxModal.id) % 10000).toString().padStart(4, '0')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-5">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">قيمة</p>
                                        <p className="font-mono font-black text-lg text-[#0e3c63]" dir="ltr">${(deleteTxModal.amount || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">الدين</p>
                                        <p className="font-mono font-black text-lg text-red-600" dir="ltr">${getSupplierDebtAmount(deleteTxModal).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">الواصل</p>
                                        <p className="font-mono font-black text-lg text-emerald-600" dir="ltr">${getSupplierPaidAmount(deleteTxModal).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => executeDeleteTx('RETURN_TO_SUPPLIER')}
                                        className="w-full min-h-16 p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-100 border-b-4 border-red-800 active:scale-[0.98] transition-all flex items-center justify-between gap-4 text-right"
                                    >
                                        <span className="flex items-center gap-3">
                                            <RefreshCcw size={22} className="shrink-0" />
                                            <span>
                                                <span className="block font-black text-sm">حذف مع إرجاع المبلغ للمورد</span>
                                                <span className="block text-[10px] text-red-100 font-bold mt-1">يرجع الواصل كحركة دفع مستقلة</span>
                                            </span>
                                        </span>
                                        <span className="font-mono font-black text-lg" dir="ltr">${getSupplierPaidAmount(deleteTxModal).toLocaleString()}</span>
                                    </button>

                                    <button
                                        onClick={() => executeDeleteTx('KEEP_AMOUNT')}
                                        className="w-full min-h-16 p-4 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 active:scale-[0.98] transition-all flex items-center justify-between gap-4 text-right"
                                    >
                                        <span className="flex items-center gap-3">
                                            <Banknote size={22} className="text-emerald-600 shrink-0" />
                                            <span>
                                                <span className="block font-black text-sm">حذف مع الاحتفاظ بالمبلغ</span>
                                                <span className="block text-[10px] text-gray-400 font-bold mt-1">المبلغ المحتفظ به ظاهر هنا قبل التنفيذ</span>
                                            </span>
                                        </span>
                                        <span className="font-mono font-black text-lg text-emerald-600" dir="ltr">${getSupplierPaidAmount(deleteTxModal).toLocaleString()}</span>
                                    </button>

                                    <button
                                        onClick={() => setDeleteTxModal(null)}
                                        className="w-full h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <X size={18} /> إلغاء
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4">
                <div className="px-2">
                    <h3 className="font-black text-gray-800 text-xl flex items-center gap-3">
                        <Users size={24} className="text-[#0e3c63]" />
                        إدارة الموردين
                    </h3>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <input
                            className="w-full h-[54px] pl-4 pr-11 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner"
                            placeholder="بحث باسم المورد أو الهاتف..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute right-4 top-[18px] text-gray-400" size={18} />
                    </div>
                    <Button onClick={() => setShowAddModal(true)} className="h-[54px] px-8 bg-[#0e3c63] text-white rounded-2xl shadow-lg font-black shrink-0 active:scale-95 transition-all">
                        <Plus size={20} /> إضافة مورد جديد
                    </Button>
                </div>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    type="button"
                    onClick={() => setSupplierBalanceFilter('DEBT')}
                    className={`bg-white rounded-[2rem] border p-6 shadow-sm relative overflow-hidden text-right transition-all hover:shadow-lg active:scale-[0.99] ${supplierBalanceFilter === 'DEBT' ? 'border-red-300 ring-4 ring-red-50' : 'border-red-100'}`}
                >
                    <div className="absolute top-0 left-0 w-24 h-24 bg-red-50 rounded-full -ml-8 -mt-8 blur-2xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">مجموع الديون</p>
                            <h4 className="text-3xl font-black font-mono text-red-600" dir="ltr">-${supplierStats.totalDebt.toLocaleString()}</h4>
                            <p className="text-[10px] font-bold text-red-400 mt-1">{supplierStats.debtCount} موردين</p>
                        </div>
                        <div className="p-4 bg-red-50 text-red-500 rounded-2xl">
                            <TrendingDown size={24} />
                        </div>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => setSupplierBalanceFilter('CREDIT')}
                    className={`bg-white rounded-[2rem] border p-6 shadow-sm relative overflow-hidden text-right transition-all hover:shadow-lg active:scale-[0.99] ${supplierBalanceFilter === 'CREDIT' ? 'border-blue-300 ring-4 ring-blue-50' : 'border-blue-100'}`}
                >
                    <div className="absolute top-0 left-0 w-24 h-24 bg-blue-50 rounded-full -ml-8 -mt-8 blur-2xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">مجموع الأرصدة</p>
                            <h4 className="text-3xl font-black font-mono text-blue-600" dir="ltr">+${supplierStats.totalCredit.toLocaleString()}</h4>
                            <p className="text-[10px] font-bold text-blue-400 mt-1">{supplierStats.creditCount} موردين</p>
                        </div>
                        <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl">
                            <Wallet size={24} />
                        </div>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => setSupplierBalanceFilter('ALL')}
                    className={`bg-white rounded-[2rem] border p-6 shadow-sm relative overflow-hidden text-right transition-all hover:shadow-lg active:scale-[0.99] ${supplierBalanceFilter === 'ALL' ? 'border-emerald-300 ring-4 ring-emerald-50' : 'border-emerald-100'}`}
                >
                    <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-50 rounded-full -ml-8 -mt-8 blur-2xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">عدد الموردين</p>
                            <h4 className="text-3xl font-black font-mono text-emerald-600" dir="ltr">{supplierStats.total.toLocaleString()}</h4>
                            <p className="text-[10px] font-bold text-emerald-400 mt-1">إجمالي الموردين المسجلين</p>
                        </div>
                        <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl">
                            <Users size={24} />
                        </div>
                    </div>
                </button>
            </div>

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSuppliers.map(s => {
                    const balance = supplierBalances[String(s.id)] || 0;
                    const isSupplierOwed = balance < 0;
                    const isWeAreOwed = balance > 0;
                    const balanceBoxClass = isSupplierOwed ? 'bg-red-50/50 border-red-100' : isWeAreOwed ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50/50 border-emerald-100';
                    const balanceTextClass = isSupplierOwed ? 'text-red-500' : isWeAreOwed ? 'text-blue-600' : 'text-emerald-500';
                    const balanceAmountClass = isSupplierOwed ? 'text-red-700' : isWeAreOwed ? 'text-blue-700' : 'text-emerald-700';
                    const balanceLabel = isSupplierOwed ? 'يطلبنا فلوس' : isWeAreOwed ? 'نطلبه فلوس' : 'لا نطلبه ولا يطلبنا';
                    return (
                        <div
                            key={s.id}
                            onClick={() => setViewingSupplier(s)}
                            className="bg-white rounded-[2.5rem] border border-gray-100 p-8 flex flex-col hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden shadow-sm hover:border-blue-200"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-16 h-16 bg-blue-50 text-[#0e3c63] rounded-2xl flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform shadow-inner border border-blue-100">
                                    {s.name.charAt(0)}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingSupplier(s); }}
                                        className="p-2.5 bg-gray-50 text-gray-400 hover:bg-[#0e3c63] hover:text-white rounded-xl transition-all shadow-sm"
                                        title="تعديل بيانات المورد"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => handleOpenDelete(e, s)}
                                        className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                                        title="حذف المورد"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>

                            <h4 className="font-black text-gray-900 text-xl mb-1 truncate">{s.name}</h4>
                            <p className="text-gray-400 text-xs font-bold mb-6 flex items-center gap-1.5"><MapPin size={14} className="text-red-400" /> {s.address || 'العراق'}</p>

                            <div className={`mt-auto p-5 rounded-[1.8rem] flex justify-between items-center border-2 transition-all ${balanceBoxClass}`}>
                                <div>
                                    <p className={`text-[9px] font-black uppercase tracking-wider mb-1 ${balanceTextClass}`}>{balanceLabel}</p>
                                    <p className={`font-mono font-black text-2xl ${balanceAmountClass}`} dir="ltr">{formatSignedMoney(balance)}</p>
                                </div>
                                <div className="p-2 bg-white rounded-xl text-gray-300 group-hover:text-[#0e3c63] transition-colors shadow-sm">
                                    <ExternalLink size={18} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Supplier Modal */}
            {(showAddModal || editingSupplier) && (
                <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[700] flex items-center justify-center p-4 !mt-0">
                    <form onSubmit={handleSaveSupplier} className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in border-t-[12px] border-[#0e3c63]">
                        <div className="p-8 text-center border-b border-gray-50">
                            <h3 className="text-2xl font-black text-gray-800">{editingSupplier ? 'تعديل بيانات المورد' : 'تسجيل مورد جديد'}</h3>
                            <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">{editingSupplier ? 'Update Vendor Details' : 'Register New Material Vendor'}</p>
                        </div>
                        <div className="p-8 space-y-5 bg-gray-50/30">
                            <Input required name="name" label="اسم الشركة / المورد" defaultValue={editingSupplier?.name} placeholder="مثلاً: شركة البتروكيماويات..." />
                            <PhoneInput name="phone" label="رقم الهاتف للتواصل" value={editingSupplier?.phone} placeholder="770 123 4567" key={editingSupplier ? editingSupplier.id : 'new'} />
                            <Input name="address" label="العنوان / المنشأ" defaultValue={editingSupplier?.address} placeholder="المدينة، الدولة..." />
                        </div>
                        <div className="p-8 border-t bg-white flex gap-4">
                            <Button type="submit" className="flex-1 h-14 bg-[#0e3c63] text-white rounded-2xl shadow-xl font-black">حفظ البيانات</Button>
                            <button type="button" onClick={() => { setShowAddModal(false); setEditingSupplier(null); }} className="px-10 h-14 rounded-2xl font-bold text-gray-500 hover:bg-gray-50">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}

            {/* نافذة الحذف الآمن - Safe Delete Modal */}
            {deleteModal.isOpen && deleteModal.supplier && (
                <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[900] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                        {Math.abs(supplierBalances[String(deleteModal.supplier.id)] || 0) > 0 ? (
                            // حالة الحذف المحظور (يوجد دين)
                            <div className="flex flex-col">
                                <div className="bg-gradient-to-br from-amber-500 to-orange-700 p-10 text-white text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                    <div className="relative z-10">
                                        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                            <AlertOctagon size={42} className="text-white animate-pulse" />
                                        </div>
                                        <h3 className="text-2xl font-black mb-2">لا يمكن الحذف حالياً</h3>
                                        <p className="text-orange-100 text-sm font-bold opacity-80">نظام الحماية المالية مفعل لهذا المورد</p>
                                    </div>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="bg-red-50 rounded-[2rem] p-8 border-2 border-dashed border-red-200 text-center">
                                        <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">الرصيد غير مصفى</p>
                                        <h4 className="text-5xl font-black font-mono text-red-600 tracking-tighter" dir="ltr">
                                            {formatSignedMoney(supplierBalances[String(deleteModal.supplier.id)] || 0)}
                                        </h4>
                                    </div>
                                    <p className="text-gray-500 text-center font-bold leading-relaxed px-4">
                                        عذراً، لا يسمح النظام بحذف مورد تطلبونه مبالغ مالية. يرجى تسوية الحساب (تصفير الميزان) عن طريق تسجيل دفعات واصلة أولاً.
                                    </p>
                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => setDeleteModal({ isOpen: false, supplier: null })}
                                            className="w-full h-16 bg-[#0e3c63] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all"
                                        >
                                            فهمت، سأقوم بالتسوية
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // حالة الحذف المسموح (الرصيد صفر أو إيجابي)
                            <div className="flex flex-col">
                                <div className="bg-gradient-to-br from-red-600 to-red-800 p-10 text-white text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                    <div className="relative z-10">
                                        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                            <Trash2 size={42} className="text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black mb-2">تأكيد حذف المورد</h3>
                                        <p className="text-red-100 text-sm font-bold opacity-80">سيتم إزالة كافة بيانات المورد من النظام</p>
                                    </div>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-5">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#0e3c63] font-black text-2xl shadow-sm border border-gray-100">
                                            {deleteModal.supplier.name.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">اسم المورد:</span>
                                            <span className="font-black text-gray-800 text-lg">{deleteModal.supplier.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge color="green" className="text-[9px]">الحساب مصفى</Badge>
                                                <span className="text-[10px] font-mono text-gray-400">ID: {deleteModal.supplier.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Button
                                            onClick={executeDelete}
                                            className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl border-b-4 border-red-800 active:scale-95 transition-all"
                                        >
                                            <XCircle size={22} /> حذف نهائي للمورد
                                        </Button>
                                        <button
                                            onClick={() => setDeleteModal({ isOpen: false, supplier: null })}
                                            className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200"
                                        >
                                            إلغاء التراجع
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
