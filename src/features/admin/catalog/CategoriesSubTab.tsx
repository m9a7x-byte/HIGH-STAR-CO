import React, { useState, useEffect } from 'react';
import {
    Plus, Settings, Trash2, Box, Layers, X, Save,
    ShieldAlert, AlertTriangle, Copy, Info, Check, ChevronDown
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../components/ui';
import { Product, Category } from '../../../types';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export const CategoriesSubTab = ({ categories, products, canEdit }: any) => {
    const { user: currentUser } = useAuth();
    const toast = useToast();

    const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean, mode: 'add' | 'edit', cat?: any }>({ isOpen: false, mode: 'add' });
    const [deleteWarning, setDeleteWarning] = useState<{ isOpen: boolean, cat: any, linkedProducts: Product[] }>({ isOpen: false, cat: null, linkedProducts: [] });
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean, cat: any }>({ isOpen: false, cat: null });

    const handleSaveCategory = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const fd = new FormData(form);
        const name = fd.get('name') as string;
        const type = fd.get('type') as 'STYROFOAM' | 'ADHESIVE';

        if (categoryModal.mode === 'add') {
            db.addCategory(currentUser!.id, name, type);
            toast.success('تمت إضافة التصنيف بنجاح');
        } else {
            db.updateCategory(currentUser!.id, categoryModal.cat.id, name, type);
            toast.success('تم تحديث بيانات التصنيف');
        }
        setCategoryModal({ isOpen: false, mode: 'add' });
    };

    const initiateDelete = (cat: any) => {
        const linked = products.filter((p: any) => p.category === cat.name);
        if (linked.length > 0) {
            setDeleteWarning({ isOpen: true, cat, linkedProducts: linked });
        } else {
            setConfirmDeleteModal({ isOpen: true, cat });
        }
    };

    const executeDelete = () => {
        if (confirmDeleteModal.cat) {
            db.deleteCategory(currentUser!.id, confirmDeleteModal.cat.id);
            toast.success('تم حذف التصنيف');
            setConfirmDeleteModal({ isOpen: false, cat: null });
        }
    };

    const copyProductCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.info('تم نسخ الكود', `الكود ${code} جاهز للبحث`);
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <div>
                    <h3 className="font-black text-2xl text-gray-800">إدارة التصنيفات</h3>
                    <p className="text-sm font-bold text-gray-400 mt-1">الأقسام التي تندرج تحتها المنتجات (فلين أو لاصق)</p>
                </div>
                {canEdit && <Button onClick={() => setCategoryModal({ isOpen: true, mode: 'add' })} className="h-14 px-8 rounded-2xl bg-[#0e3c63] text-white font-black shadow-md"><Plus size={20} /> إضافة تصنيف جديد</Button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
                {categories.map((cat: any) => (
                    <div key={cat.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex justify-between items-center group hover:shadow-xl hover:border-blue-200 transition-all">
                        <div>
                            <span className="font-black text-lg text-gray-800 block mb-1">{cat.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-gray-300 font-bold">ID: {cat.id}</span>
                                <Badge color={cat.type === 'STYROFOAM' ? 'blue' : 'orange'} className="text-[9px] px-3 font-black">
                                    {cat.type === 'STYROFOAM' ? 'قسم الفلين' : 'قسم اللاصق'}
                                </Badge>
                            </div>
                        </div>
                        {canEdit && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                <button onClick={() => setCategoryModal({ isOpen: true, mode: 'edit', cat })} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-[#0e3c63] hover:text-white transition-all"><Settings size={18} /></button>
                                <button onClick={() => initiateDelete(cat)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Category Modal (Add/Edit) */}
            {categoryModal.isOpen && (
                <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[500] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-fade-in">
                        <div className="p-8 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white/10 rounded-2xl shadow-inner"><Box size={24} /></div>
                                <div>
                                    <h3 className="font-black text-xl">{categoryModal.mode === 'add' ? 'إضافة تصنيف جديد' : 'تعديل بيانات التصنيف'}</h3>
                                    <p className="text-blue-200 text-[10px] font-bold opacity-70 uppercase tracking-widest">Category Structure Management</p>
                                </div>
                            </div>
                            <button onClick={() => setCategoryModal({ isOpen: false, mode: 'add' })} className="bg-white/10 hover:bg-red-500 p-2.5 rounded-xl transition-all shadow-inner"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSaveCategory} className="p-10 space-y-8 bg-gray-50/30 flex-1">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">اسم التصنيف (بالعربي أو الإنجليزي)</label>
                                    <input required name="name" defaultValue={categoryModal.cat?.name} className="w-full h-14 bg-white border-2 border-gray-100 rounded-xl px-5 font-black text-gray-800 focus:border-[#0e3c63] outline-none shadow-sm transition-all" placeholder="مثال: قوالب، زوايا، لاصق ممتاز..." />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">نوع التصنيف (تبعية المواد)</label>
                                    <div className="grid grid-cols-2 gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                                        <label className="cursor-pointer">
                                            <input type="radio" name="type" value="STYROFOAM" defaultChecked={categoryModal.cat?.type !== 'ADHESIVE'} className="peer sr-only" />
                                            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent transition-all peer-checked:bg-blue-50 peer-checked:border-[#0e3c63] peer-checked:text-[#0e3c63] hover:bg-gray-50 grayscale peer-checked:grayscale-0">
                                                <Box size={24} />
                                                <span className="text-xs font-black">منتجات فلين</span>
                                            </div>
                                        </label>
                                        <label className="cursor-pointer">
                                            <input type="radio" name="type" value="ADHESIVE" defaultChecked={categoryModal.cat?.type === 'ADHESIVE'} className="peer sr-only" />
                                            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent transition-all peer-checked:bg-purple-50 peer-checked:border-purple-600 peer-checked:text-purple-600 hover:bg-gray-50 grayscale peer-checked:grayscale-0">
                                                <Layers size={24} />
                                                <span className="text-xs font-black">مادة لاصقة</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button type="submit" className="flex-1 h-16 bg-[#0e3c63] text-white text-lg font-black rounded-2xl shadow-xl hover:bg-[#1a4d7a] transition-all"><Save size={20} /> حفظ التصنيف</Button>
                                <Button type="button" onClick={() => setCategoryModal({ isOpen: false, mode: 'add' })} variant="secondary" className="px-8 h-16 rounded-2xl font-bold">إلغاء</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDeleteModal.isOpen && (
                <div className="fixed inset-0 bg-[#0e3c63]/60 z-[600] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-fade-in border-t-[12px] border-red-500 relative overflow-hidden">
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl ring-8 ring-red-50"><Trash2 size={42} /></div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 mb-2">تأكيد الحذف</h3>
                                <p className="text-gray-500 font-bold leading-relaxed">هل أنت متأكد من رغبتك في حذف تصنيف <span className="text-red-500 font-black underline underline-offset-4">"{confirmDeleteModal.cat?.name}"</span>؟ لا يمكن التراجع عن هذا الإجراء.</p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button onClick={executeDelete} className="flex-1 h-14 bg-red-500 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-600 active:scale-95 transition-all">نعم، احذف</Button>
                                <Button onClick={() => setConfirmDeleteModal({ isOpen: false, cat: null })} variant="secondary" className="flex-1 h-14 rounded-2xl font-bold">تراجع</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Safe Delete Warning (For Linked Products) */}
            {deleteWarning.isOpen && (
                <div className="fixed inset-0 bg-[#0e3c63]/60 z-[600] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-fade-in border-t-[12px] border-amber-500 relative overflow-hidden">
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl ring-8 ring-amber-50"><ShieldAlert size={42} /></div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 mb-2">لا يمكن حذف التصنيف!</h3>
                                <p className="text-gray-500 font-bold leading-relaxed">تصنيف <span className="text-[#0e3c63] font-black underline underline-offset-4">"{deleteWarning.cat?.name}"</span> مرتبط بالمنتجات التالية. يرجى تغيير تصنيف هذه المنتجات أولاً ليتم السماح بالحذف.</p>
                            </div>

                            <div className="bg-amber-50 p-6 rounded-3xl border-2 border-dashed border-amber-200">
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                    {deleteWarning.linkedProducts.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => copyProductCode(p.code)}
                                            className="group flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-amber-200 shadow-sm text-gray-800 font-mono font-black text-xs hover:bg-[#0e3c63] hover:text-white transition-all active:scale-90"
                                        >
                                            {p.code}
                                            <Copy size={12} className="opacity-40 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={() => setDeleteWarning({ isOpen: false, cat: null, linkedProducts: [] })} className="w-full h-16 bg-[#0e3c63] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">فهمت، سأقوم بالتعديل</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};