import { ProductTechnicalDetails } from '../../../components/shared/ProductTechnicalDetails';
import { ProductFamilySelector } from '../../../components/shared/ProductFamilySelector';
import i18n from 'i18next';
const t = i18n.t.bind(i18n);

import React, { useState, useEffect, useMemo } from 'react';
import { Search, AlertTriangle, Box, Layers, ShoppingBag, PaintBucket, Sparkles, MessageSquare, Plus, Check, RotateCcw, Trash2, ArrowUpAZ, ArrowDownAZ, DollarSign, Edit, X } from 'lucide-react';
import { Card, Badge, Button } from '../../../components/ui';
import { AgentType, Product, User } from '../../../types';
import { STYROFOAM_CATEGORIES, ADHESIVE_CATEGORY } from '../../../lib/constants';
import { db } from '../../../lib/db';
import { useToast } from '../../../context/ToastContext';
import { ProductSortMode, sortProductsForCatalog } from '../../../lib/productSort';
import { getAdjustedProductPrices } from '../../../lib/pricing';

interface CatalogTabProps {
    products: Product[];
    cart: Record<number, { m: number, c: number, isSpecial?: boolean, specialNote?: string, productCode?: string, productDimensions?: string, unitPriceCarton?: number, unitPriceMeter?: number, priceAdjustmentNote?: string }>;
    setCart: React.Dispatch<React.SetStateAction<Record<number, { m: number, c: number, isSpecial?: boolean, specialNote?: string, productCode?: string, productDimensions?: string, unitPriceCarton?: number, unitPriceMeter?: number, priceAdjustmentNote?: string }>>>;
    activeCat: string;
    setActiveCat: (cat: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    user: User | null;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    editingOrderId?: string | number | null;
    onCancelEdit?: () => void;
}

interface SpecialItemEntry {
    id: string;
    note: string;
    qty: string;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
    products, cart, setCart, activeCat, setActiveCat,
    searchTerm, setSearchTerm, user, maintenanceMode, maintenanceMessage,
    editingOrderId, onCancelEdit
}) => {
    const { error } = useToast();
    const [mainType, setMainType] = useState<'STYROFOAM' | 'ADHESIVE' | 'PAINT'>('STYROFOAM');
    const [isLoading, setIsLoading] = useState(true);
    const [showSpecialModal, setShowSpecialModal] = useState(false);
    const [sortMode, setSortMode] = useState<ProductSortMode>('ALPHA_ASC');

    // Repeater state for multiple special requests
    const [specialItems, setSpecialItems] = useState<SpecialItemEntry[]>([
        { id: Math.random().toString(), note: '', qty: '0' }
    ]);

    useEffect(() => {
        const typeCategories = db.categories.filter((c: any) => c.type === mainType);

        if (mainType !== 'STYROFOAM') {
            setActiveCat(typeCategories[0]?.name || (mainType === 'PAINT' ? 'أصباغ' : ADHESIVE_CATEGORY));
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
        } else if (mainType === 'STYROFOAM') {
            const hasPanDef = db.categories.some((c: any) => c.name === 'PAN');
            if (!hasPanDef) allowedCategoryNames.push('PAN');
        }

        const filtered = products.filter(p => {
            // For Styrofoam: Must match the specific selected category (activeCat)
            // For Adhesive: Show ALL products that belong to any category of type 'ADHESIVE' (since there are no sub-tabs in UI)
            const isCategoryMatch = mainType !== 'STYROFOAM'
                ? allowedCategoryNames.includes(p.category)
                : p.category === activeCat;

            const isTypeMatch = allowedCategoryNames.includes(p.category);
            const isSearchMatch = [p.code, p.name, p.paintType, p.dimensions].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
            return isCategoryMatch && isTypeMatch && isSearchMatch;
        });

        return sortProductsForCatalog(filtered, sortMode, user?.agentDetails?.type || AgentType.NORMAL);
    }, [products, activeCat, searchTerm, mainType, db.categories, sortMode, user?.agentDetails?.type]);

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
            error(t('batch4.txt_4vo7gb_7014'), t('batch4.txt_bbcwao_7014'));
            return;
        }

        const validItems = specialItems.filter(item => item.note.trim() !== '');

        if (validItems.length === 0) {
            error(t('batch4.txt_t6uu7q_7014'), t('batch4.txt_3yk5vx_7014'));
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
                    <h2 className="text-4xl font-black text-red-800 mb-4 tracking-tight">{t('batch3.txt_rlrloa_5353')}</h2>
                    <p className="text-xl text-gray-600 max-w-lg leading-relaxed font-medium">
                        {maintenanceMessage}
                    </p>
                </div>
            ) : (
                <>
                    {editingOrderId && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                                    <Edit size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-amber-600 uppercase tracking-wider mb-1">وضع تعديل الطلب</p>
                                    <h3 className="text-lg font-black text-amber-950 leading-tight">أنت حالياً تعدل الطلب #{editingOrderId}</h3>
                                    <p className="text-sm font-bold text-amber-700 mt-1">بعد الضغط على حفظ التعديل، ينقفل تعديل هذا الطلب تلقائياً.</p>
                                </div>
                            </div>
                            {onCancelEdit && (
                                <button
                                    type="button"
                                    onClick={onCancelEdit}
                                    className="h-11 px-4 rounded-xl bg-white text-amber-700 border border-amber-200 font-black text-sm hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all flex items-center justify-center gap-2 shrink-0"
                                >
                                    <X size={18} />
                                    إلغاء التعديل
                                </button>
                            )}
                        </div>
                    )}

                    <ProductFamilySelector value={mainType} onChange={setMainType} />

                    <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
                        <div className="relative mx-4 mt-4">
                            <input
                                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-gray-800 font-bold focus:bg-white focus:border-[#0e3c63] focus:shadow-lg outline-none transition-all placeholder:text-gray-400 placeholder:font-medium"
                                placeholder={t('batch3.txt_zzhsft_5353')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                        </div>

                        <div className="mx-4 grid grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-1.5">
                            {[
                                { value: 'ALPHA_ASC' as const, label: 'أبجدي أ-ي', icon: ArrowUpAZ },
                                { value: 'ALPHA_DESC' as const, label: 'أبجدي ي-أ', icon: ArrowDownAZ },
                                { value: 'PRICE_ASC' as const, label: 'السعر الأقل', icon: DollarSign },
                                { value: 'PRICE_DESC' as const, label: 'السعر الأعلى', icon: DollarSign },
                            ].map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSortMode(option.value)}
                                    className={`h-11 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-2 ${sortMode === option.value ? 'bg-white text-[#0e3c63] shadow-md' : 'text-gray-400 hover:bg-white/70 hover:text-gray-600'}`}
                                >
                                    <option.icon size={16} />
                                    {option.label}
                                </button>
                            ))}
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
                                        <h4 className="font-black text-amber-900 text-2xl leading-none">{t('batch3.txt_8m4b5f_5353')}</h4>
                                        <p className="text-xs font-bold text-amber-600 mt-2">{t('batch3.txt_snblg7_5353')}</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white/50 rounded-2xl p-4 border border-amber-100 flex items-center justify-center text-center">
                                    <p className="text-sm font-bold text-amber-600">{t('batch3.txt_7ghl0d_5353')}</p>
                                </div>
                                <div className="mt-5 pt-4 border-t border-amber-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{t('batch3.txt_7j24df_5353')}</span>
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
                            const price = getAdjustedProductPrices(p, user!.agentDetails);
                            const inCart = cart[p.id];
                            const family = db.categories.find((c: any) => c.name === p.category)?.type;
                            const isAdhesive = family === 'ADHESIVE';
                            const isPaint = family === 'PAINT';
                            const isUnitProduct = isAdhesive || isPaint;
                            const bagsPerPallet = Math.max(0, Number(p.metersPerCarton ?? 80));
                            const palletPrice = Math.round((Number(price.pricePerCarton || 0) * bagsPerPallet) * 100) / 100;
                            return (
                                <div key={p.id} className="group relative bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_-12px_rgba(14,60,99,0.15)] hover:border-blue-100 hover:-translate-y-1 transition-all duration-500 flex flex-col">
                                    <div className="flex items-start gap-5 mb-6">
                                        <div className="relative shrink-0">
                                            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-50 shadow-inner">{isPaint && !p.imageUrl ? <PaintBucket className="w-full h-full p-5 text-[#0e3c63]" /> : <img src={p.imageUrl || undefined} className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-110 transition-transform duration-700" />}</div>
                                            <div className={`absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${isAdhesive ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-[#0e3c63]'}`}>{isAdhesive ? t('common.adhesive') : p.category}</div>
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1">
                                            <h4 className={`text-gray-800 mb-1 group-hover:text-[#0e3c63] transition-colors ${isPaint ? 'text-base sm:text-lg font-bold leading-relaxed break-words' : 'text-3xl font-black font-mono tracking-tighter'}`}>{p.name || p.code}</h4>
                                            <p className="text-sm font-bold text-gray-400 leading-tight">{p.paintType ? `${p.paintType} — ${p.dimensions}` : p.dimensions}</p>
                                            {p.imageNote && <p className="text-[10px] text-gray-500 mt-2">{p.imageNote}</p>}
                                            {isAdhesive && (
                                                <div className="mt-2 w-fit px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-black">
                                                    {bagsPerPallet} كيس / باليت
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <ProductTechnicalDetails product={p} compact />
                                    <div className={`flex-1 rounded-3xl p-1.5 mb-5 transition-colors ${inCart ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'bg-gray-50'}`}>
                                        {isUnitProduct ? (
                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex items-center h-16 transition-all"><span className="text-gray-400 font-bold text-xs px-3">{isPaint ? 'سطلة' : t('batch3.txt_hoh391_5353')}</span><div className="w-px h-6 bg-gray-200"></div><input type="number" min="0" placeholder="0" className="w-full h-full text-center text-2xl font-black text-gray-800 bg-transparent outline-none placeholder:text-gray-200" value={inCart?.c || ''} onChange={(e) => setCart(prev => ({ ...prev, [p.id]: { m: 0, c: Number(e.target.value) } }))} /></div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-1.5 h-full"><div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-col justify-center items-center h-20 relative overflow-hidden"><input type="number" min="0" placeholder="0" className="w-full text-center text-xl font-black text-gray-800 bg-transparent outline-none placeholder:text-gray-200 relative z-10" value={inCart?.c || ''} onChange={(e) => setCart(prev => ({ ...prev, [p.id]: { ...prev[p.id], c: Number(e.target.value) } }))} /><span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide">{t('batch3.txt_zrhwww_5353')}</span><div className="absolute top-0 right-0 w-8 h-8 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div></div><div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-col justify-center items-center h-20 transition-all"><input type="number" min="0" placeholder="0" className="w-full text-center text-xl font-black text-gray-800 bg-transparent outline-none placeholder:text-gray-200" value={inCart?.m || ''} onChange={(e) => setCart(prev => ({ ...prev, [p.id]: { ...prev[p.id], m: Number(e.target.value) } }))} /><span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide">{t('batch3.txt_pxkoh8_5353')}</span></div></div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{isPaint ? 'سعر السطلة' : isAdhesive ? t('products_tab.price_bag_label') : t('products_tab.price_carton_label')}</span>
                                                <span className="text-xl font-black font-mono text-gray-800 group-hover:text-[#0e3c63] transition-colors">${price.pricePerCarton}</span>
                                                {isAdhesive && <span className="text-[10px] font-black text-purple-600 mt-1">باليت ${palletPrice}</span>}
                                            </div>
                                            {!isUnitProduct && <div className="flex flex-col border-r-2 border-gray-100 pr-4 mr-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('batch3.txt_7ehqtv_5353')}</span><span className="text-lg font-bold font-mono text-gray-500">${price.pricePerMeter}</span></div>}
                                        </div>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${inCart?.c || inCart?.m ? 'bg-[#0e3c63] text-white scale-110 shadow-blue-200' : 'bg-gray-100 text-gray-300'}`}><ShoppingBag size={18} className={inCart ? "animate-bounce" : ""} /></div>
                                    </div>
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
                                    <h3 className="text-2xl font-black text-gray-800">{t('batch3.txt_3r5d2g_5353')}</h3>
                                    <p className="text-sm text-gray-400 font-bold mt-1">{t('batch3.txt_0ew7t2_5353')}</p>
                                </div>

                                <div className="px-8 pb-4 space-y-6">
                                    <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
                                        {specialItems.map((item, idx) => (
                                            <div key={item.id} className="p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl space-y-4 relative group/row animate-fade-in">
                                                <div className="flex justify-between items-center mb-2">
                                                    <Badge color="yellow" className="px-3">{t('batch3.txt_8m4b5f_5353')} #{idx + 1}</Badge>
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
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">{t('batch3.txt_tls28l_5353')}</label>
                                                    <textarea
                                                        className="w-full h-24 bg-white border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none focus:border-amber-500 transition-all text-gray-700 text-sm"
                                                        placeholder={t('batch3.txt_4lofps_5353')}
                                                        value={item.note}
                                                        onChange={e => updateRepeaterItem(item.id, 'note', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 space-y-2">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">{t('batch3.txt_sqiklp_5353')}</label>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="flex-1 h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-black text-lg outline-none focus:border-amber-500"
                                                                value={item.qty}
                                                                onChange={e => updateRepeaterItem(item.id, 'qty', e.target.value)}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-[10px] font-bold text-gray-400">{t('batch3.txt_396lhx_5353')}</span>
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
                                            <Plus size={18} />{t('batch3.txt_zfpb5n_5353')}</button>
                                        <button
                                            onClick={resetSpecialItems}
                                            className="px-4 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all"
                                            title={t('batch3.txt_0obfim_5353')}
                                        >
                                            <RotateCcw size={20} />
                                        </button>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button onClick={handleAddSpecialToCart} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-16 rounded-2xl font-black shadow-lg">{t('batch3.txt_gltzzo_5353')}</Button>
                                        <button onClick={() => { setShowSpecialModal(false); }} className="px-8 h-16 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200">{t('batch3.txt_fdhq8b_5353')}</button>
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
