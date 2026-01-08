
import React, { useState, useEffect, useMemo } from 'react';
import { Search, AlertTriangle, Box, Layers, ShoppingBag, Sparkles, MessageSquare, Plus, Check, RotateCcw, Trash2 } from 'lucide-react';
import { Card, Badge, Button } from '../../../components/ui';
import { Product, User } from '../../../types';
import { STYROFOAM_CATEGORIES, ADHESIVE_CATEGORY } from '../../../lib/constants';
import { db } from '../../../lib/db';
import { useToast } from '../../../context/ToastContext';

interface CatalogTabProps {
    products: Product[];
    cart: Record<number, { m: number, c: number, isSpecial?: boolean, specialNote?: string }>;
    setCart: React.Dispatch<React.SetStateAction<Record<number, { m: number, c: number, isSpecial?: boolean, specialNote?: string }>>>;
    activeCat: string;
    setActiveCat: (cat: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    user: User | null;
    maintenanceMode: boolean;
    maintenanceMessage: string;
}

interface SpecialItemEntry {
    id: string;
    note: string;
    qty: string;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
    products, cart, setCart, activeCat, setActiveCat,
    searchTerm, setSearchTerm, user, maintenanceMode, maintenanceMessage
}) => {
    const { error } = useToast();
    const [mainType, setMainType] = useState<'STYROFOAM' | 'ADHESIVE'>('STYROFOAM');
    const [isLoading, setIsLoading] = useState(true);
    const [showSpecialModal, setShowSpecialModal] = useState(false);

    // Repeater state for multiple special requests
    const [specialItems, setSpecialItems] = useState<SpecialItemEntry[]>([
        { id: Math.random().toString(), note: '', qty: '0' }
    ]);

    useEffect(() => {
        const typeCategories = db.categories.filter((c: any) => c.type === mainType);

        if (mainType === 'ADHESIVE') {
            setActiveCat(ADHESIVE_CATEGORY);
        } else {
            // For Styrofoam, check if current activeCat is valid
            const isValid = typeCategories.some((c: any) => c.name === activeCat);
            if (!isValid && typeCategories.length > 0) {
                setActiveCat(typeCategories[0].name);
            } else if (!isValid) {
                // Fallback to PAN only if absolutely nothing else exists (legacy safety)
                setActiveCat('PAN');
            }
        }
    }, [mainType, db.categories]);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, [activeCat, searchTerm, mainType]);

    const filteredProducts = useMemo(() => {
        // Derive allowed categories dynamically from db
        const allowedCategoryNames = db.categories
            .filter((c: any) => c.type === mainType)
            .map((c: any) => c.name);

        // Smart Fallback for Legacy/Defaults
        if (mainType === 'ADHESIVE') {
            const hasAdhesiveDef = db.categories.some((c: any) => c.name === ADHESIVE_CATEGORY);
            if (!hasAdhesiveDef) allowedCategoryNames.push(ADHESIVE_CATEGORY);
        } else {
            const hasPanDef = db.categories.some((c: any) => c.name === 'PAN');
            if (!hasPanDef) allowedCategoryNames.push('PAN');
        }

        return products.filter(p => {
            // For Styrofoam: Must match the specific selected category (activeCat)
            // For Adhesive: Show ALL products that belong to any category of type 'ADHESIVE' (since there are no sub-tabs in UI)
            const isCategoryMatch = mainType === 'ADHESIVE'
                ? allowedCategoryNames.includes(p.category)
                : p.category === activeCat;

            const isTypeMatch = allowedCategoryNames.includes(p.category);
            const isSearchMatch = p.code.toLowerCase().includes(searchTerm.toLowerCase());
            return isCategoryMatch && isTypeMatch && isSearchMatch;
        });
    }, [products, activeCat, searchTerm, mainType, db.categories]);

    // Memoize the categories list for the UI buttons
    const uiCategories = useMemo(() => {
        const cats = db.categories
            .filter((c: any) => c.type === 'STYROFOAM') // UI Loop specifically for Styrofoam tab section
            .map((c: any) => c.name);

        // Fallback for PAN if default missing
        if (!db.categories.some((c: any) => c.name === 'PAN')) cats.push('PAN');

        return cats;
    }, []);

    const addRepeaterRow = () => {
        setSpecialItems(prev => [...prev, { id: Math.random().toString(), note: '', qty: '0' }]);
    };

    const removeRepeaterRow = (id: string) => {
        if (specialItems.length > 1) {
            setSpecialItems(prev => prev.filter(item => item.id !== id));
        } else {
            setSpecialItems([{ id: Math.random().toString(), note: '', qty: '0' }]);
        }
    };

    const updateRepeaterItem = (id: string, field: 'note' | 'qty', value: string) => {
        let cleanValue = value;

        // Prevent leading zeros for quantity
        if (field === 'qty') {
            if (value === '') {
                cleanValue = '';
            } else {
                // Convert to number and back to string to remove leading zeros (e.g. "05" -> 5 -> "5")
                cleanValue = Number(value).toString();
            }
        }

        setSpecialItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: cleanValue } : item
        ));
    };

    const resetSpecialItems = () => {
        setSpecialItems([{ id: Math.random().toString(), note: '', qty: '0' }]);
    };

    const handleAddSpecialToCart = () => {
        // Validation: Check if any item has 0 quantity
        const zeroQtyItem = specialItems.find(item => Number(item.qty) <= 0);
        if (zeroQtyItem) {
            error('خطأ في الكمية', 'يرجى تحديد كمية أكبر من 0 لجميع البنود');
            return;
        }

        const validItems = specialItems.filter(item => item.note.trim() !== '');

        if (validItems.length === 0) {
            error('بيانات ناقصة', 'يرجى كتابة وصف للطلب الخاص');
            return;
        }

        setCart(prev => {
            const newCart = { ...prev };
            validItems.forEach((item, idx) => {
                const uniqueId = -(Date.now() + idx);
                newCart[uniqueId] = {
                    m: 0,
                    c: Number(item.qty),
                    isSpecial: true,
                    specialNote: item.note
                };
            });
            return newCart;
        });

        setShowSpecialModal(false);
    };

    const allowSpecial = user?.agentDetails?.permissions.allowSpecialRequests ?? false;

    return (
        <div className="space-y-8 animate-fade-in">
            {maintenanceMode ? (
                <div className="bg-red-50 border-2 border-red-100 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-inner">
                        <AlertTriangle size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-red-800 mb-4 tracking-tight">نعتذر منكم</h2>
                    <p className="text-xl text-gray-600 max-w-lg leading-relaxed font-medium">
                        {maintenanceMessage}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-6">
                        <button
                            onClick={() => {
                                setMainType('STYROFOAM');
                                setIsLoading(true);
                                Promise.all([db.fetchCategories(), db.fetchProducts()]).then(() => setIsLoading(false));
                            }}
                            className={`p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center gap-4 group ${mainType === 'STYROFOAM' ? 'bg-[#0e3c63] border-[#0e3c63] text-white shadow-xl shadow-blue-900/20 scale-[1.02]' : 'bg-white border-transparent hover:border-gray-200 text-gray-500 hover:bg-gray-50 hover:shadow-lg'}`}
                        >
                            <div className={`p-4 rounded-full transition-colors ${mainType === 'STYROFOAM' ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-300 group-hover:text-[#0e3c63]'}`}>
                                <Box size={32} />
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-xl mb-1">منتجات الفلين</h3>
                                <p className={`text-xs ${mainType === 'STYROFOAM' ? 'text-blue-200' : 'text-gray-400'}`}>القوالب، الإطارات، الزوايا</p>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setMainType('ADHESIVE');
                                setIsLoading(true);
                                Promise.all([db.fetchCategories(), db.fetchProducts()]).then(() => setIsLoading(false));
                            }}
                            className={`p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center gap-4 group ${mainType === 'ADHESIVE' ? 'bg-[#0e3c63] border-[#0e3c63] text-white shadow-xl shadow-blue-900/20 scale-[1.02]' : 'bg-white border-transparent hover:border-gray-200 text-gray-500 hover:bg-gray-50 hover:shadow-lg'}`}
                        >
                            <div className={`p-4 rounded-full transition-colors ${mainType === 'ADHESIVE' ? 'bg-white/10 text-white' : 'bg-purple-50 text-purple-300 group-hover:text-purple-600'}`}>
                                <Layers size={32} />
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-xl mb-1">المواد اللاصقة</h3>
                                <p className={`text-xs ${mainType === 'ADHESIVE' ? 'text-blue-200' : 'text-gray-400'}`}>لاصق السيراميك والمرمر</p>
                            </div>
                        </button>
                    </div>

                    <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
                        <div className="relative mx-4 mt-4">
                            <input
                                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-gray-800 font-bold focus:bg-white focus:border-[#0e3c63] focus:shadow-lg outline-none transition-all placeholder:text-gray-400 placeholder:font-medium"
                                placeholder="بحث سريع برقم الكود..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                        </div>

                        {mainType === 'STYROFOAM' && (
                            <div className="flex flex-wrap gap-2 p-4 pt-0">
                                {uiCategories.map((cat: string) => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCat(cat)}
                                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeCat === cat ? 'bg-[#0e3c63] text-white shadow-lg shadow-blue-900/20 scale-105' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
                        {/* Special Order Card - Repeater Support */}
                        {mainType === 'STYROFOAM' && !searchTerm && allowSpecial && (
                            <div
                                onClick={() => setShowSpecialModal(true)}
                                className={`group relative bg-gradient-to-br from-amber-50 to-white rounded-[2.5rem] p-6 border-2 border-dashed transition-all duration-500 flex flex-col cursor-pointer border-amber-200 hover:border-amber-400 hover:shadow-xl`}
                            >
                                <div className="flex items-start gap-5 mb-6">
                                    <div className="p-5 bg-amber-500 text-white rounded-3xl shadow-lg group-hover:scale-110 transition-transform">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-amber-900 text-2xl leading-none">طلب خاص</h4>
                                        <p className="text-xs font-bold text-amber-600 mt-2">إنتاج بمواصفات وأحجام مخصصة</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white/50 rounded-2xl p-4 border border-amber-100 flex items-center justify-center text-center">
                                    <p className="text-sm font-bold text-amber-600">اضغط هنا لإضافة طلبات إنتاج خاصة (مواصفات يدوية)</p>
                                </div>
                                <div className="mt-5 pt-4 border-t border-amber-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">تحديد السعر من المعمل</span>
                                    <div className="p-2 rounded-lg bg-amber-100 text-amber-500">
                                        <Plus size={18} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-white h-[320px] rounded-[2.5rem] p-6 shadow-sm animate-pulse border border-gray-100 flex flex-col">
                                    <div className="flex gap-4 mb-6">
                                        <div className="h-24 w-24 bg-gray-200 rounded-3xl"></div>
                                        <div className="flex-1 space-y-3 pt-2"><div className="h-6 bg-gray-200 rounded-lg w-1/3"></div><div className="h-4 bg-gray-200 rounded-lg w-2/3"></div></div>
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded-3xl"></div>
                                </div>
                            ))
                        ) : filteredProducts.map(p => {
                            const price = p.prices[user!.agentDetails!.type];
                            const inCart = cart[p.id];
                            const isAdhesive = db.categories.find((c: any) => c.name === p.category)?.type === 'ADHESIVE';
                            return (
                                <div key={p.id} className="group relative bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_-12px_rgba(14,60,99,0.15)] hover:border-blue-100 hover:-translate-y-1 transition-all duration-500 flex flex-col">
                                    <div className="flex items-start gap-5 mb-6">
                                        <div className="relative shrink-0">
                                            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-50 shadow-inner"><img src={p.imageUrl} className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-110 transition-transform duration-700" /></div>
                                            <div className={`absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${isAdhesive ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-[#0e3c63]'}`}>{isAdhesive ? 'لاصق' : p.category}</div>
                                        </div>
                                        <div className="flex-1 pt-1"><h4 className="font-black text-gray-800 text-3xl font-mono tracking-tighter mb-1 group-hover:text-[#0e3c63] transition-colors">{p.code}</h4><p className="text-sm font-bold text-gray-400 leading-tight">{p.dimensions}</p></div>
                                    </div>
                                    <div className={`flex-1 rounded-3xl p-1.5 mb-5 transition-colors ${inCart ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'bg-gray-50'}`}>
                                        {isAdhesive ? (
                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex items-center h-16 transition-all"><span className="text-gray-400 font-bold text-xs px-3">عدد الأكياس</span><div className="w-px h-6 bg-gray-200"></div><input type="number" min="0" placeholder="0" className="w-full h-full text-center text-2xl font-black text-gray-800 bg-transparent outline-none placeholder:text-gray-200" value={inCart?.c || ''} onChange={(e) => setCart(prev => ({ ...prev, [p.id]: { m: 0, c: Number(e.target.value) } }))} /></div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-1.5 h-full"><div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-col justify-center items-center h-20 relative overflow-hidden"><input type="number" min="0" placeholder="0" className="w-full text-center text-xl font-black text-gray-800 bg-transparent outline-none placeholder:text-gray-200 relative z-10" value={inCart?.c || ''} onChange={(e) => setCart(prev => ({ ...prev, [p.id]: { ...prev[p.id], c: Number(e.target.value) } }))} /><span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide">كرتون</span><div className="absolute top-0 right-0 w-8 h-8 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div></div><div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-col justify-center items-center h-20 transition-all"><input type="number" min="0" placeholder="0" className="w-full text-center text-xl font-black text-gray-800 bg-transparent outline-none placeholder:text-gray-200" value={inCart?.m || ''} onChange={(e) => setCart(prev => ({ ...prev, [p.id]: { ...prev[p.id], m: Number(e.target.value) } }))} /><span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide">أمتار (إضافي)</span></div></div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-4"><div className="flex items-center gap-4"><div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">سعر {isAdhesive ? 'الكيس' : 'الكرتون'}</span><span className="text-xl font-black font-mono text-gray-800 group-hover:text-[#0e3c63] transition-colors">${price.pricePerCarton}</span></div>{!isAdhesive && <div className="flex flex-col border-r-2 border-gray-100 pr-4 mr-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">سعر المتر</span><span className="text-lg font-bold font-mono text-gray-500">${price.pricePerMeter}</span></div>}</div><div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${inCart?.c || inCart?.m ? 'bg-[#0e3c63] text-white scale-110 shadow-blue-200' : 'bg-gray-100 text-gray-300'}`}><ShoppingBag size={18} className={inCart ? "animate-bounce" : ""} /></div></div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Special Order Modal (Repeater / Multi-item) */}
                    {showSpecialModal && (
                        <div className="fixed inset-0 bg-[#0e3c63]/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in border-t-[10px] border-amber-500 my-8">
                                <div className="p-8 pb-4 text-center">
                                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Sparkles size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-800">تفاصيل الطلبات الخاصة</h3>
                                    <p className="text-sm text-gray-400 font-bold mt-1">أدخل مواصفات وكميات المواد غير القياسية المطلوبة</p>
                                </div>

                                <div className="px-8 pb-4 space-y-6">
                                    <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
                                        {specialItems.map((item, idx) => (
                                            <div key={item.id} className="p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl space-y-4 relative group/row animate-fade-in">
                                                <div className="flex justify-between items-center mb-2">
                                                    <Badge color="yellow" className="px-3">طلب خاص #{idx + 1}</Badge>
                                                    {specialItems.length > 1 && (
                                                        <button
                                                            onClick={() => removeRepeaterRow(item.id)}
                                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">وصف الطلب الفني</label>
                                                    <textarea
                                                        className="w-full h-24 bg-white border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none focus:border-amber-500 transition-all text-gray-700 text-sm"
                                                        placeholder="مثلاً: قالب فلين على شكل هلال بارتفاع 50 سم وعرض 20 سم..."
                                                        value={item.note}
                                                        onChange={e => updateRepeaterItem(item.id, 'note', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 space-y-2">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الكمية المطلوبة</label>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="flex-1 h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-black text-lg outline-none focus:border-amber-500"
                                                                value={item.qty}
                                                                onChange={e => updateRepeaterItem(item.id, 'qty', e.target.value)}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-[10px] font-bold text-gray-400">وحدة</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={addRepeaterRow}
                                            className="flex-1 py-4 border-2 border-dashed border-amber-200 rounded-2xl text-amber-600 font-black text-sm flex items-center justify-center gap-2 hover:bg-amber-50 transition-all active:scale-[0.98]"
                                        >
                                            <Plus size={18} /> إضافة طلب خاص آخر
                                        </button>
                                        <button
                                            onClick={resetSpecialItems}
                                            className="px-4 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all"
                                            title="تصفير القائمة"
                                        >
                                            <RotateCcw size={20} />
                                        </button>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button onClick={handleAddSpecialToCart} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-16 rounded-2xl font-black shadow-lg">إضافة الكل للسلة</Button>
                                        <button onClick={() => { setShowSpecialModal(false); }} className="px-8 h-16 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200">إلغاء</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
