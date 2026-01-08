import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Search, MapPin, Phone, CreditCard, ExternalLink, History as HistoryIcon, AlertCircle, TrendingDown, Wallet, ArrowLeft, X, Save, Box, Globe, ShieldCheck, Lock, PackageSearch, Trash2, Edit3, Filter, Banknote, Trash, AlertOctagon, RefreshCcw, XCircle, Info, Truck, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatDate } from '../../../lib/dateUtils';
import { Card, Badge, Button, Input } from '../../../components/ui';
import { PhoneInput } from '../../../components/ui/PhoneInput';

import { db } from '../../../lib/db';
import { Supplier, FactoryTransaction } from '../../../types';
import { materialLabels } from '../components/SharedFactoryComponents';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

interface SuppliersTabProps {
    refreshTrigger: number;
    onOpenModal: (category: any, metadata?: any) => void;
}

export const SuppliersTab = ({ refreshTrigger, onOpenModal }: SuppliersTabProps) => {
    const { user } = useAuth();
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'DEBT'>('ALL');

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

    const suppliers = useMemo(() => db.getSuppliers(), [refreshTrigger, localRefresh]);

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.phone && s.phone.includes(searchTerm))
        );
    }, [suppliers, searchTerm]);

    const supplierTxs = useMemo(() => {
        if (!viewingSupplier) return [];
        let txs = db.getFactoryTransactions().filter(t =>
            t.supplierId === viewingSupplier.id && (t.category === 'TRANSPORT_IN' || t.category === 'SUPPLIER')
        );

        if (statusFilter === 'PAID') txs = txs.filter(t => t.amount === (t.paidAmount || 0));
        if (statusFilter === 'DEBT') txs = txs.filter(t => t.amount !== (t.paidAmount || 0));

        return txs;
    }, [viewingSupplier, refreshTrigger, localRefresh, statusFilter]);

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

    const handleDeleteTx = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذه القائمة نهائياً؟')) {
            db.factoryTransactions = db.factoryTransactions.filter(t => t.id !== id);
            toast.success('تم حذف القائمة وتحديث سجل المورد');
            forceUpdate();
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
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400 font-bold">
                                <span className="flex items-center gap-1.5"><Phone size={14} /> {viewingSupplier.phone || '-'}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="flex items-center gap-1.5"><MapPin size={14} /> {viewingSupplier.address || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-[2rem] flex flex-col items-center justify-center min-w-[240px] border-2 border-dashed relative z-10 ${(viewingSupplier.currentBalance || 0) < 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الميزان المالي الحالي</span>
                        <h3 className={`text-4xl font-black font-mono ${(viewingSupplier.currentBalance || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            ${Math.abs(viewingSupplier.currentBalance || 0).toLocaleString()}
                        </h3>
                        <span className="text-[10px] font-black mt-1 opacity-60 uppercase tracking-wider">
                            {(viewingSupplier.currentBalance || 0) < 0 ? 'ذمة بذمة المعمل (دين)' : 'الحساب مصفى'}
                        </span>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit gap-2">
                    <button onClick={() => setStatusFilter('ALL')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'ALL' ? 'bg-[#0e3c63] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>الكل</button>
                    <button onClick={() => setStatusFilter('PAID')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>مسددة</button>
                    <button onClick={() => setStatusFilter('DEBT')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === 'DEBT' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>دين بذمة المعمل</button>
                </div>

                {/* Supply Record Table */}
                <Card className="p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-[3rem]">
                    <div className="overflow-x-auto min-h-[450px]">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] border-b">
                                <tr>
                                    <th className="p-6 pr-10">التاريخ</th>
                                    <th className="p-6">المادة الموردة</th>
                                    <th className="p-6 text-left">قيمة المواد ($)</th>
                                    <th className="p-6 text-left">المبلغ المدفوع ($)</th>
                                    <th className="p-6 text-center">حالة القائمة</th>
                                    <th className="p-6 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {supplierTxs.length === 0 ? (
                                    <tr><td colSpan={6} className="p-32 text-center text-gray-400 font-black italic opacity-30 flex flex-col items-center gap-4">
                                        <HistoryIcon size={64} />
                                        <p className="text-xl">لا توجد سجلات مطابقة للفلترة</p>
                                    </td></tr>
                                ) : supplierTxs.map((t) => {
                                    const isFullyPaid = t.amount === (t.paidAmount || 0);
                                    return (
                                        <tr key={t.id} className="hover:bg-blue-50/20 transition-all group">
                                            <td className="p-6 pr-10">
                                                <div className="font-mono font-black text-gray-800 text-sm">{formatDate(t.date)}</div>
                                                <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">INV #{(t.id % 10000).toString().padStart(4, '0')}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-[#0e3c63] flex items-center gap-2">
                                                    <Box size={14} className="text-blue-300" />
                                                    {materialLabels[t.materialType!] || t.materialType || 'مواد أولية'}
                                                </div>
                                            </td>
                                            <td className="p-6 text-left font-mono font-black text-gray-700 text-lg">${t.amount.toLocaleString()}</td>
                                            <td className="p-6 text-left font-mono font-black text-emerald-600 text-lg">${(t.paidAmount || 0).toLocaleString()}</td>
                                            <td className="p-6 text-center">
                                                {isFullyPaid ? (
                                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-black text-[10px] shadow-sm">
                                                        <ShieldCheck size={12} /> مسددة
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-[10px] shadow-sm">
                                                        <AlertCircle size={12} /> دين بذمة المعمل
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => onOpenModal('EDIT_FINANCE', { tx: t })}
                                                        className={`p - 2.5 rounded - xl border transition - all ${isFullyPaid ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-blue-600 border-gray-200 hover:bg-blue-50 hover:shadow-md'} `}
                                                        title={isFullyPaid ? 'مشاهدة التفاصيل (القائمة مغلقة)' : 'تعديل أو تسجيل واصل جديد'}
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTx(Number(t.id))}
                                                        className="p-2.5 bg-white text-red-500 border border-gray-200 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                        title="حذف القائمة"
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

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSuppliers.map(s => {
                    const isDebt = (s.currentBalance || 0) < 0;
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

                            <div className={`mt-auto p-5 rounded-[1.8rem] flex justify-between items-center border-2 transition-all ${isDebt ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                <div>
                                    <p className={`text-[9px] font-black uppercase tracking-wider mb-1 ${isDebt ? 'text-red-500' : 'text-emerald-500'}`}>{isDebt ? 'المطلوب للمورد' : 'الحساب مصفى'}</p>
                                    <p className={`font-mono font-black text-2xl ${isDebt ? 'text-red-700' : 'text-emerald-700'}`} dir="ltr">${Math.abs(s.currentBalance || 0).toLocaleString()}</p>
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
                        {deleteModal.supplier.currentBalance < 0 ? (
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
                                        <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">الدين المتبقي بذمة المعمل</p>
                                        <h4 className="text-5xl font-black font-mono text-red-600 tracking-tighter" dir="ltr">
                                            ${Math.abs(deleteModal.supplier.currentBalance).toLocaleString()}
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
