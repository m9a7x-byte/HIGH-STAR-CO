import { ProductTechnicalDetails } from '../../../components/shared/ProductTechnicalDetails';
import { ProductFamilySelector } from '../../../components/shared/ProductFamilySelector';
import { PAINT_CATEGORY } from '../../../lib/productFamilies';
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Layers, PaintBucket, Search, Plus, Filter, ArrowRight, Trash2, Edit3, X, Image as ImageIcon,
    Upload, Info, Check, ChevronDown, DollarSign, User, Award, History, Eye, ShieldAlert,
    Scale, Ruler, Loader2, TrendingUp, AlertOctagon, RefreshCcw, XCircle, Save
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../components/ui';
import { AgentType, Product, ProductionStatus, Order, UserRole } from '../../../types';
import { STYROFOAM_CATEGORIES, ADHESIVE_CATEGORY } from '../../../lib/constants';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { UserSelector } from '../../../components/shared/UserSelector';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatDate } from '../../../lib/dateUtils';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

const CategorySelector = ({ categories, value, onChange, placeholder, label }: any) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = categories.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
    const styrofoam = filtered.filter((c: any) => c.type === 'STYROFOAM');
    const adhesive = filtered.filter((c: any) => c.type === 'ADHESIVE');
    const paints = filtered.filter((c: any) => c.type === 'PAINT');

    return (
        <div className="relative w-full" ref={ref}>
            <div className="mb-2">
                {label && <label className="block text-sm font-bold text-gray-700">{label}</label>}
            </div>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[60px] flex justify-between items-center bg-gray-50 border-2 rounded-xl px-5 text-sm font-bold transition-all ${isOpen ? 'border-[#0e3c63] ring-0 ring-blue-50 shadow-none' : 'border-gray-200 hover:border-blue-300'}`}
            >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 z-[500] overflow-hidden animate-fade-in origin-top">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <input className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:border-[#0e3c63] shadow-inner" placeholder={t("products_tab.search_products")} value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1.5">
                        <div className="w-full text-right px-4 py-3 rounded-xl text-sm font-bold text-gray-300 border-b border-gray-50 mb-1 cursor-default select-none">
                            {t("products_tab.category_none")}
                        </div>
                        {styrofoam.length > 0 && (
                            <>
                                <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 rounded-lg mb-1 mt-1">{t("products_tab.foam_products_badge")}</div>
                                {styrofoam.map((c: any) => (
                                    <button key={c.id} type="button" onClick={() => { onChange(c.name); setIsOpen(false); }} className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-colors ${value === c.name ? 'bg-blue-50 text-[#0e3c63]' : 'text-gray-600 hover:bg-gray-50'}`}>
                                        {c.name}
                                        {value === c.name && <Check size={16} />}
                                    </button>
                                ))}
                            </>
                        )}
                        {adhesive.length > 0 && (
                            <>
                                <div className="px-3 py-2 text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-50/50 rounded-lg mb-1 mt-2">{t("products_tab.adhesive_products_badge")}</div>
                                {adhesive.map((c: any) => (
                                    <button key={c.id} type="button" onClick={() => { onChange(c.name); setIsOpen(false); }} className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-colors ${value === c.name ? 'bg-blue-50 text-[#0e3c63]' : 'text-gray-600 hover:bg-gray-50'}`}>
                                        {c.name}
                                        {value === c.name && <Check size={16} />}
                                    </button>
                                ))}
                            </>
                        )}
                        {paints.length > 0 && <>
                            <div className="px-3 py-2 text-xs font-black text-[#0e3c63]">أصباغ</div>
                            {paints.map((category: any) => <button key={category.id} type="button" onClick={() => { onChange(category.name); setIsOpen(false); }} className="w-full text-right px-4 py-3 rounded-xl text-sm font-bold hover:bg-gray-50">{category.name}</button>)}
                        </>}
                        {styrofoam.length === 0 && adhesive.length === 0 && paints.length === 0 && (
                            <div className="p-4 text-center text-gray-400 text-xs">{t("products_tab.no_results")}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ProductsSubTab = ({ products, categories, orders, canEdit, onViewOrder, onDeleteProduct }: any) => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const toast = useToast();

    const [selectedCat, setSelectedCat] = useState('PAN');
    const [productSearch, setProductSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

    // Controlled pricing state for the product form modal
    const [formMeterPriceNormal, setFormMeterPriceNormal] = useState<number>(0);
    const [formMeterPriceVIP, setFormMeterPriceVIP] = useState<number>(0);
    const [formBagPriceNormal, setFormBagPriceNormal] = useState<number>(0);
    const [formBagPriceVIP, setFormBagPriceVIP] = useState<number>(0);
    const [formMetersPerCarton, setFormMetersPerCarton] = useState<number>(0);
    const [mainType, setMainType] = useState<'STYROFOAM' | 'ADHESIVE' | 'PAINT'>('STYROFOAM');

    // Modals
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [modalCategory, setModalCategory] = useState('');

    // Dynamic Form Type: Derived from the selected category in the modal, fallback to mainType
    const selectedCategoryObject = categories.find((c: any) => c.name === modalCategory);
    const formType = selectedCategoryObject ? selectedCategoryObject.type : mainType;
    const formBagsPerPallet = Math.max(1, Number(formMetersPerCarton || 80));
    const formPalletPriceNormal = Math.round((formBagPriceNormal * formBagsPerPallet) * 100) / 100;
    const formPalletPriceVIP = Math.round((formBagPriceVIP * formBagsPerPallet) * 100) / 100;

    const getBagsPerPallet = (product?: Product | null) => Math.max(1, Number(product?.metersPerCarton || 80));
    const getPalletPrice = (bagPrice: number, product?: Product | null) => Math.round((Number(bagPrice || 0) * getBagsPerPallet(product)) * 100) / 100;

    // Constraints
    const [linkedOrdersModal, setLinkedOrdersModal] = useState<{ isOpen: boolean, productCode: string, orderIds: number[] }>({
        isOpen: false, productCode: '', orderIds: []
    });

    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean, product: Product | null }>({
        isOpen: false, product: null
    });

    const [detailPage, setDetailPage] = useState(0);
    const [detailRowsPerPage, setDetailRowsPerPage] = useState(10);
    const [detailAgent, setDetailAgent] = useState<'ALL' | number>('ALL');

    // Image Upload State
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');

    useEffect(() => {
        if (!showProductModal) {
            setPreviewUrl('');
            setSelectedImage(null);
        }
    }, [showProductModal]);

    // Initialize controlled form state when editing a product or opening modal
    useEffect(() => {
        if (showProductModal && editingProduct) {
            setFormMeterPriceNormal(editingProduct.prices[AgentType.NORMAL].pricePerMeter || 0);
            setFormMeterPriceVIP(editingProduct.prices[AgentType.VIP].pricePerMeter || 0);
            setFormMetersPerCarton(editingProduct.metersPerCarton || 0);
            setFormBagPriceNormal(editingProduct.prices[AgentType.NORMAL].pricePerCarton || 0);
            setFormBagPriceVIP(editingProduct.prices[AgentType.VIP].pricePerCarton || 0);
        } else if (showProductModal && !editingProduct) {
            setFormMeterPriceNormal(0);
            setFormMeterPriceVIP(0);
            setFormMetersPerCarton(mainType === 'ADHESIVE' ? 80 : 0);
            setFormBagPriceNormal(0);
            setFormBagPriceVIP(0);
        }
    }, [showProductModal, editingProduct, mainType]);

    useEffect(() => {
        if (showProductModal && formType === 'ADHESIVE' && formMetersPerCarton <= 0) {
            setFormMetersPerCarton(80);
        }
    }, [showProductModal, formType, formMetersPerCarton]);

    useEffect(() => {
        if (viewingProduct) {
            const stillExists = products.find((p: any) => Number(p.id) === Number(viewingProduct.id));
            if (!stillExists) setViewingProduct(null);
        }
    }, [products, viewingProduct]);

    useEffect(() => {
        // Filter categories based on the active main type
        const typeCategories = categories.filter((c: any) => c.type === mainType);

        // If we have categories for this type, select the first one if current selection is invalid
        if (typeCategories.length > 0) {
            const currentIsValid = typeCategories.some((c: any) => c.name === selectedCat);
            if (!currentIsValid) {
                setSelectedCat(typeCategories[0].name);
            }
        } else {
            // Fallback defaults if no categories found (legacy behavior)
            if (mainType === 'ADHESIVE') setSelectedCat(ADHESIVE_CATEGORY);
            else if (selectedCat === ADHESIVE_CATEGORY) setSelectedCat('PAN');
        }
    }, [mainType, categories]);

    const filteredProducts = useMemo(() => {
        // Strict Mode: Only show products whose category aligns with current MainType
        // Deriving allowed names from fetched categories prop
        const allowedCategoryNames = categories
            .filter((c: any) => c.type === mainType)
            .map((c: any) => c.name);

        // Smart Fallback: Only add defaults if they are NOT in the managed categories list
        if (mainType === 'ADHESIVE') {
            const hasAdhesiveDef = categories.some((c: any) => c.name === ADHESIVE_CATEGORY);
            if (!hasAdhesiveDef) allowedCategoryNames.push(ADHESIVE_CATEGORY);
        } else if (mainType === 'STYROFOAM') {
            const hasPanDef = categories.some((c: any) => c.name === 'PAN');
            if (!hasPanDef) allowedCategoryNames.push('PAN');
        }

        return products.filter((p: any) => {
            const isCategoryMatch = selectedCat === 'ALL' ? true : p.category === selectedCat;
            const isTypeMatch = allowedCategoryNames.includes(p.category);
            const isSearchMatch = [p.code, p.name, p.paintType, p.dimensions].join(' ').toLowerCase().includes(productSearch.toLowerCase());

            return isCategoryMatch && isTypeMatch && isSearchMatch;
        });
    }, [products, selectedCat, productSearch, categories, mainType]);

    const handleConfirmDelete = (p: Product) => {
        if (!p || !currentUser) return;
        const activeOrdersWithProduct = orders.filter((order: Order) => {
            const isActive = order.productionStatus !== ProductionStatus.COMPLETED;
            return isActive && order.items.some(item => Number(item.productId) === Number(p.id));
        });
        if (activeOrdersWithProduct.length > 0) {
            setLinkedOrdersModal({ isOpen: true, productCode: p.code, orderIds: activeOrdersWithProduct.map((o: Order) => o.id) });
            return;
        }
        setDeleteConfirmModal({ isOpen: true, product: p });
    };

    const executeDeleteProduct = async () => {
        if (deleteConfirmModal.product) {
            try {
                await onDeleteProduct(Number(deleteConfirmModal.product.id));
                toast.success(t('products_tab.delete_success'));
                setDeleteConfirmModal({ isOpen: false, product: null });
            } catch (err: any) {
                toast.error(t('products_tab.delete_failed_msg'), err.message);
            }
        }
    };

    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (uploading) return;
        setUploading(true);

        try {
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const data = Object.fromEntries(fd.entries());

            // Determine type based on selected category, not just mainType
            const selectedCatObj = categories.find((c: any) => c.name === modalCategory);
            const effectiveType = selectedCatObj ? selectedCatObj.type : mainType;
            const isAdh = effectiveType !== 'STYROFOAM';

            let finalImageUrl = editingProduct?.imageUrl || (effectiveType === 'PAINT' ? '' : `https://api.dicebear.com/9.x/shapes/svg?seed=${data.code}`);

            if (selectedImage) {
                finalImageUrl = await db.uploadProductImage(selectedImage);
            }

            // For adhesive products, metersPerCarton stores bags-per-pallet so existing DB schema stays compatible.
            const metersInCarton = effectiveType === 'PAINT' ? 1 : isAdh ? formBagsPerPallet : formMetersPerCarton;
            const meterPriceNormal = isAdh ? 0 : formMeterPriceNormal;
            const meterPriceVIP = isAdh ? 0 : formMeterPriceVIP;
            const cartonPriceNormal = isAdh ? Number(formBagPriceNormal || data.priceCartonNormal || 0) : Math.round((meterPriceNormal * metersInCarton) * 100) / 100;
            const cartonPriceVIP = isAdh ? Number(formBagPriceVIP || data.priceCartonVIP || 0) : Math.round((meterPriceVIP * metersInCarton) * 100) / 100;

            const payload: any = {
                code: data.code as string,
                category: modalCategory || (isAdh ? ADHESIVE_CATEGORY : 'PAN'),
                dimensions: data.dimensions as string,
                metersPerCarton: metersInCarton,
                volumePerCarton: 1,
                imageUrl: finalImageUrl,
                name: effectiveType === 'PAINT' ? String(data.name || '').trim() : editingProduct?.name || null,
                paintType: effectiveType === 'PAINT' ? String(data.paintType || '').trim() : editingProduct?.paintType || null,
                isActive: true,
                prices: {
                    [AgentType.NORMAL]: { pricePerMeter: meterPriceNormal, pricePerCarton: cartonPriceNormal },
                    [AgentType.VIP]: { pricePerMeter: meterPriceVIP, pricePerCarton: cartonPriceVIP }
                }
            };
            if (editingProduct) {
                await db.updateProduct(currentUser!.id, { ...editingProduct, ...payload, id: Number(editingProduct.id) });
                // If we are currently viewing this product, update the view immediately
                if (viewingProduct && Number(viewingProduct.id) === Number(editingProduct.id)) {
                    setViewingProduct({ ...viewingProduct, ...payload, id: Number(editingProduct.id), imageUrl: finalImageUrl });
                }
            } else {
                await db.createProduct(currentUser!.id, payload);
            }

            setShowProductModal(false);
            setEditingProduct(null);
            setSelectedImage(null);
            setPreviewUrl('');
            toast.success(t('products_tab.save_success'));
        } catch (err: any) {
            console.error('Save error:', err);
            toast.error(t('products_tab.save_failed_msg'), err.message || t('products_tab.save_failed_generic'));
        } finally {
            setUploading(false);
        }
    };

    const productStats = useMemo(() => {
        if (!viewingProduct) return { totalSold: 0, totalMetersSold: 0, totalRevenue: 0, history: [] };
        let totalSold = 0, totalMetersSold = 0, totalRevenue = 0; const history: any[] = [];
        orders.forEach((order: any) => {
            if (detailAgent !== 'ALL' && order.agentId !== detailAgent) return;
            order.items.forEach((item: any) => {
                if (Number(item.productId) === Number(viewingProduct.id)) {
                    totalSold += item.quantityCartons;
                    totalMetersSold += (item.quantityMeters || 0);
                    totalRevenue += item.totalPrice;
                    history.push({ orderId: order.id, date: order.createdAt, agentName: order.agentName, quantityC: item.quantityCartons, quantityM: item.quantityMeters || 0, price: item.unitPriceCarton, total: item.totalPrice });
                }
            });
        });
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { totalSold, totalMetersSold, totalRevenue, history };
    }, [viewingProduct, orders, detailAgent]);

    const currentHistory = productStats.history.slice(detailPage * detailRowsPerPage, (detailPage + 1) * detailRowsPerPage);

    // Dynamic viewing product type
    // Fallback to STYROFOAM if data isn't ready, although viewingProduct check usually handles this.
    // We check the category against our loaded categories map.
    const viewingProductType = viewingProduct
        ? categories.find((c: any) => c.name === viewingProduct.category)?.type || 'STYROFOAM'
        : 'STYROFOAM';

    return (
        <div className="space-y-8 animate-fade-in relative">
            {viewingProduct ? (
                <div className="space-y-6 animate-fade-in">
                    <button onClick={() => setViewingProduct(null)} className="flex items-center gap-2 text-gray-500 hover:text-[#0e3c63] font-black transition-colors mb-2 group">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 group-hover:bg-[#0e3c63] group-hover:text-white transition-all"><ArrowRight size={18} /></div>
                        {t("products_tab.back_to_catalog")}
                    </button>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative shrink-0">
                            <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-gray-50 shadow-xl border-4 border-white">
                                {viewingProductType === 'PAINT' && !viewingProduct.imageUrl ? <PaintBucket className="w-full h-full p-8 text-[#0e3c63]" /> : <img src={viewingProduct.imageUrl || undefined} className="w-full h-full object-cover" />}
                            </div>
                            <div className={`absolute -bottom-2 -right-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${viewingProductType === 'ADHESIVE' ? 'bg-purple-600 text-white' : 'bg-[#0e3c63] text-white'}`}>
                                {viewingProductType === 'PAINT' ? 'أصباغ' : viewingProductType === 'ADHESIVE' ? t("products_tab.product_type_adhesive") : t("products_tab.product_type_foam")}
                            </div>
                        </div>
                        <div className="flex-1 w-full relative z-10">
                            <div className="flex flex-col xl:flex-row justify-between items-start gap-4 mb-6">
                                <div>
                                    <h2 className="text-4xl font-black text-gray-800 font-mono tracking-tighter mb-2">{viewingProduct.name || viewingProduct.code}</h2>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <Badge color="blue" className="px-4 py-1.5 rounded-xl">{viewingProduct.category}</Badge>
                                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-black text-gray-500">
                                            {viewingProductType === 'ADHESIVE' ? <Scale size={14} /> : <Ruler size={14} />}
                                            {viewingProductType === 'PAINT' ? 'الوزن / الحجم:' : viewingProductType === 'ADHESIVE' ? t("products_tab.weight_label") : t("products_tab.dimensions_label")} {viewingProduct.paintType ? `${viewingProduct.paintType} — ${viewingProduct.dimensions}` : viewingProduct.dimensions}
                                        </div>
                                        {viewingProductType === 'PAINT' ? null : viewingProductType === 'ADHESIVE' ? (
                                            <div className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl border border-purple-100 text-xs font-black flex items-center gap-1.5">
                                                <Layers size={14} />
                                                {getBagsPerPallet(viewingProduct)} كيس / باليت
                                            </div>
                                        ) : (
                                            <div className="bg-blue-50 text-[#0e3c63] px-3 py-1.5 rounded-xl border border-blue-100 text-xs font-black">{viewingProduct.metersPerCarton} {t('products_tab.meters_per_carton')}</div>
                                        )}
                                    </div>
                                </div>
                                {canEdit && (
                                    <div className="flex gap-2">
                                        <Button onClick={() => { setMainType(viewingProductType); setEditingProduct(viewingProduct); setModalCategory(viewingProduct.category); setShowProductModal(true); }} variant="secondary" className="h-12 px-6 rounded-2xl bg-white border-gray-200 shadow-md font-black text-sm hover:!bg-[#0e3c63] hover:!text-white hover:!border-[#0e3c63] transition-all"><Edit3 size={18} /> {t("products_tab.edit_data")}</Button>
                                        <button onClick={() => handleConfirmDelete(viewingProduct)} className="h-12 px-5 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-95"><Trash2 size={18} /></button>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="p-4 border-0 bg-gray-50/80 shadow-inner flex items-center gap-4">
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-[#0e3c63] border border-gray-100"><Box size={22} /></div>
                                    <div><p className="text-[9px] text-gray-400 font-black uppercase mb-0.5">{viewingProductType === 'PAINT' ? 'المباع — سطلة' : viewingProductType === 'ADHESIVE' ? t('products_tab.sold_bag') : t('products_tab.sold_carton')}</p><p className="text-2xl font-black text-gray-800 font-mono tracking-tighter">{productStats.totalSold.toLocaleString()}</p></div>
                                </Card>
                                {viewingProductType === 'STYROFOAM' && (
                                    <Card className="p-4 border-0 bg-gray-50/80 shadow-inner flex items-center gap-4">
                                        <div className="bg-white p-3 rounded-xl shadow-sm text-blue-500 border border-gray-100"><Ruler size={22} /></div>
                                        <div><p className="text-[9px] text-gray-400 font-black uppercase mb-0.5">{t("products_tab.sold_meter")}</p><p className="text-2xl font-black text-blue-600 font-mono tracking-tighter">{productStats.totalMetersSold.toLocaleString()}</p></div>
                                    </Card>
                                )}
                                <Card className="p-4 border-0 bg-gray-50/80 shadow-inner flex items-center gap-4 md:col-span-2">
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-green-600 border border-gray-100"><TrendingUp size={22} /></div>
                                    <div><p className="text-[9px] text-gray-400 font-black uppercase mb-0.5">{t("products_tab.net_revenue")}</p><p className="text-2xl font-black text-green-600 font-mono tracking-tighter">${productStats.totalRevenue.toLocaleString()}</p></div>
                                </Card>

                                <div className="md:col-span-2 lg:col-span-4 grid grid-cols-2 gap-4 mt-2">
                                    {/* Normal Price Detail */}
                                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-gray-400 font-black text-xs">{t("products_tab.normal")}</div>
                                            <div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-black text-gray-800 font-mono text-xl">${viewingProduct.prices[AgentType.NORMAL].pricePerCarton}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">{viewingProductType === 'PAINT' ? ' / سطلة' : viewingProductType === 'ADHESIVE' ? t('products_tab.per_bag') : t('products_tab.per_carton')}</span>
                                                </div>
                                                {viewingProductType === 'ADHESIVE' && (
                                                    <div className="mt-1 flex items-center gap-2 text-[10px] font-black text-purple-600">
                                                        <span className="bg-purple-50 border border-purple-100 rounded-lg px-2 py-0.5">باليت</span>
                                                        <span className="font-mono">${getPalletPrice(viewingProduct.prices[AgentType.NORMAL].pricePerCarton, viewingProduct)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {viewingProductType === 'STYROFOAM' && viewingProduct.prices[AgentType.NORMAL].pricePerMeter > 0 && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                                                <span className="font-bold text-gray-500 font-mono text-sm">${viewingProduct.prices[AgentType.NORMAL].pricePerMeter}</span>
                                                <span className="text-[10px] text-gray-300 font-bold">{t("products_tab.per_meter")}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* VIP Price Detail */}
                                    <div className="bg-[#0e3c63] rounded-2xl p-4 shadow-lg shadow-blue-900/20 flex items-center justify-between relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-full -mr-10 -mt-10"></div>
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-blue-200 font-black text-xs">VIP</div>
                                            <div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-black text-white font-mono text-xl">${viewingProduct.prices[AgentType.VIP].pricePerCarton}</span>
                                                    <span className="text-[10px] text-blue-200/60 font-bold">{viewingProductType === 'PAINT' ? ' / سطلة' : viewingProductType === 'ADHESIVE' ? t('products_tab.per_bag') : t('products_tab.per_carton')}</span>
                                                </div>
                                                {viewingProductType === 'ADHESIVE' && (
                                                    <div className="mt-1 flex items-center gap-2 text-[10px] font-black text-blue-100">
                                                        <span className="bg-white/10 border border-white/10 rounded-lg px-2 py-0.5">باليت</span>
                                                        <span className="font-mono">${getPalletPrice(viewingProduct.prices[AgentType.VIP].pricePerCarton, viewingProduct)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {viewingProductType === 'STYROFOAM' && viewingProduct.prices[AgentType.VIP].pricePerMeter > 0 && (
                                            <div className="relative z-10 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
                                                <span className="font-bold text-white font-mono text-sm">${viewingProduct.prices[AgentType.VIP].pricePerMeter}</span>
                                                <span className="text-[10px] text-blue-200/60 font-bold">{t("products_tab.per_meter")}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ProductTechnicalDetails product={viewingProduct} />

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b bg-gray-50/50 flex flex-col xl:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-white p-3 rounded-2xl border border-gray-200 text-[#0e3c63] shadow-md"><History size={24} /></div>
                                <h3 className="font-black text-xl text-gray-800">{t("products_tab.sales_archive")}</h3>
                            </div>
                            <div className="w-full md:w-56"><UserSelector users={db.users.filter(u => u.role === UserRole.AGENT)} selectedUserId={detailAgent} onChange={(id: any) => { setDetailAgent(id); setDetailPage(0); }} placeholder={t("products_tab.filter_agent")} /></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-white text-gray-400 font-black uppercase text-[10px] tracking-widest border-b">
                                    <tr>
                                        <th className="p-6">{t("products_tab.date")}</th>
                                        <th className="p-6">{t("products_tab.invoice_number")}</th>
                                        <th className="p-6">{t("products_tab.agent")}</th>
                                        <th className="p-6 text-center">{viewingProductType === 'PAINT' ? 'سطلة' : t("products_tab.carton_bag")}</th>
                                        {viewingProductType === 'STYROFOAM' && <th className="p-6 text-center">{t("products_tab.extra_meter")}</th>}
                                        <th className="p-6 text-left pl-10">{t("products_tab.total")}</th>
                                        <th className="p-6 text-center">{t("products_tab.action")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {currentHistory.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-all">
                                            <td className="p-6 font-mono font-black text-gray-800">{formatDate(row.date)}</td>
                                            <td className="p-6 font-mono font-black text-[#0e3c63]">#{row.orderId}</td>
                                            <td className="p-6 font-black text-gray-700">{row.agentName}</td>
                                            <td className="p-6 text-center"><span className="bg-blue-50 text-[#0e3c63] px-3 py-1.5 rounded-xl font-black font-mono border border-blue-100">{row.quantityC}</span></td>
                                            {viewingProductType === 'STYROFOAM' && <td className="p-6 text-center"><span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl font-black font-mono border border-amber-100">{row.quantityM}</span></td>}
                                            <td className="p-6 text-left pl-10 font-mono font-black text-emerald-600">${row.total.toLocaleString()}</td>
                                            <td className="p-6 text-center"><button onClick={() => { const ord = orders.find((o: any) => o.id === row.orderId); if (ord) onViewOrder(ord); }} className="text-gray-300 hover:text-[#0e3c63] p-3 rounded-xl hover:bg-white hover:shadow-md transition-all"><Eye size={20} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <PaginationControl page={detailPage} rowsPerPage={detailRowsPerPage} setPage={setDetailPage} setRowsPerPage={setDetailRowsPerPage} totalItems={productStats.history.length} />
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    <ProductFamilySelector value={mainType} onChange={type => { setMainType(type); setSelectedCat('ALL'); }} />

                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-[2.5rem] shadow-xl border border-white flex flex-col md:flex-row justify-between items-center gap-6">

                        <div className="relative flex-1 w-full"><input className="w-full h-16 bg-gray-50 border-2 border-transparent rounded-[1.8rem] pl-16 pr-8 text-gray-800 font-black focus:bg-white focus:border-[#0e3c63] outline-none transition-all placeholder:text-gray-300 shadow-inner" placeholder={t("products_tab.search_product_code")} value={productSearch} onChange={e => setProductSearch(e.target.value)} /><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={28} /></div>
                        {canEdit && <Button onClick={() => { setEditingProduct(null); setModalCategory(mainType === 'PAINT' ? PAINT_CATEGORY : mainType === 'ADHESIVE' ? (categories.find((c: any) => c.type === 'ADHESIVE')?.name || ADHESIVE_CATEGORY) : 'PAN'); setShowProductModal(true); }} className="h-16 px-10 rounded-[1.8rem] shadow-2xl bg-[#0e3c63] text-lg font-black"><Plus size={24} /> {t("products_tab.add_product")}</Button>}
                    </div>

                    {/* Dynamic Category Filter Buttons - For both Styrofoam and Adhesive */}
                    <div className="flex flex-wrap gap-3 pb-2 pt-2">
                        {categories.filter((c: any) => c.type === mainType).map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCat(cat.name)}
                                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${selectedCat === cat.name
                                    ? 'bg-[#0e3c63] text-white shadow-lg shadow-blue-900/20 scale-105'
                                    : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 hover:border-blue-100'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                        <button
                            onClick={() => setSelectedCat('ALL')}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${selectedCat === 'ALL'
                                ? 'bg-[#0e3c63] text-white shadow-lg shadow-blue-900/20 scale-105'
                                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 hover:border-blue-100'
                                }`}
                        >
                            {t("products_tab.all")}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 pb-20">
                        {filteredProducts.map((p: any) => {
                            const productType = categories.find((c: any) => c.name === p.category)?.type || 'STYROFOAM';
                            const isAdhesive = productType === 'ADHESIVE';
                            return (
                            <div key={p.id} onClick={() => setViewingProduct(p)} className="group relative bg-white rounded-[3rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden">
                                {canEdit && (
                                    <button onClick={(e) => { e.stopPropagation(); handleConfirmDelete(p); }} className="absolute top-6 left-6 z-40 p-4 bg-red-50 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-red-500 hover:text-white"><Trash2 size={24} /></button>
                                )}
                                <div className="flex items-start gap-6 mb-8">
                                    <div className="w-28 h-28 rounded-[2rem] overflow-hidden bg-gray-50 shadow-inner border border-gray-100 shrink-0">{productType === 'PAINT' && !p.imageUrl ? <PaintBucket className="w-full h-full p-6 text-[#0e3c63]" /> : <img src={p.imageUrl || undefined} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />}</div>
                                    <div className="flex-1 pt-2">
                                        <h4 className="font-black text-gray-800 text-3xl font-mono tracking-tighter mb-1">{p.name || p.code}</h4>
                                        {productType === 'PAINT' && <p className="text-xs font-bold text-[#0e3c63] mb-2">{p.paintType} · {p.code}</p>}
                                        {p.imageNote && <p className="text-[10px] font-medium text-gray-500 mb-2">{p.imageNote}</p>}
                                        <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">{isAdhesive ? <Scale size={12} /> : <Ruler size={12} />} {p.dimensions}</p>
                                        {isAdhesive && (
                                            <div className="mt-2 w-fit px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-black flex items-center gap-1">
                                                <Layers size={12} />
                                                {getBagsPerPallet(p)} كيس / باليت
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-50/50 rounded-[2rem] p-2 mb-8 border border-gray-100 grid grid-cols-2 gap-3 text-center">
                                    {/* Normal Price Card */}
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between group-hover:border-blue-100 transition-colors">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t("products_tab.normal")}</span>
                                        <div className="space-y-1">
                                            <div className="flex items-baseline justify-center gap-0.5">
                                                <span className="text-xs font-bold text-gray-300 align-top">$</span>
                                                <span className="font-black text-gray-800 font-mono text-xl">{p.prices[AgentType.NORMAL].pricePerCarton}</span>
                                                <span className="text-[10px] text-gray-400 font-bold mr-1">{productType === 'PAINT' ? ' / سطلة' : isAdhesive ? t('products_tab.per_bag') : t('products_tab.per_carton')}</span>
                                            </div>
                                            {isAdhesive && (
                                                <div className="flex items-center justify-center gap-1 pt-2 mt-1 border-t border-dashed border-purple-100">
                                                    <span className="font-bold text-purple-600 font-mono text-xs">${getPalletPrice(p.prices[AgentType.NORMAL].pricePerCarton, p)}</span>
                                                    <span className="text-[9px] text-purple-300 font-bold">/ باليت</span>
                                                </div>
                                            )}
                                            {productType === 'STYROFOAM' && p.prices[AgentType.NORMAL].pricePerMeter > 0 && (
                                                <div className="flex items-center justify-center gap-1 pt-2 mt-1 border-t border-dashed border-gray-100">
                                                    <span className="font-bold text-gray-500 font-mono text-xs">${p.prices[AgentType.NORMAL].pricePerMeter}</span>
                                                    <span className="text-[9px] text-gray-300 font-bold">{t("products_tab.per_meter")}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* VIP Price Card */}
                                    <div className="bg-[#0e3c63] rounded-2xl p-4 shadow-lg shadow-blue-900/20 flex flex-col justify-between relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-bl-3xl"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 bg-black/10 rounded-tr-2xl"></div>

                                        <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest block mb-2 relative z-10">VIP</span>
                                        <div className="space-y-1 relative z-10">
                                            <div className="flex items-baseline justify-center gap-0.5">
                                                <span className="text-xs font-bold text-blue-300 align-top">$</span>
                                                <span className="font-black text-white font-mono text-xl">{p.prices[AgentType.VIP].pricePerCarton}</span>
                                                <span className="text-[10px] text-blue-200/60 font-bold mr-1">{productType === 'PAINT' ? ' / سطلة' : isAdhesive ? t('products_tab.per_bag') : t('products_tab.per_carton')}</span>
                                            </div>
                                            {isAdhesive && (
                                                <div className="flex items-center justify-center gap-1 pt-2 mt-1 border-t border-dashed border-white/10">
                                                    <span className="font-bold text-blue-100 font-mono text-xs">${getPalletPrice(p.prices[AgentType.VIP].pricePerCarton, p)}</span>
                                                    <span className="text-[9px] text-blue-300/60 font-bold">/ باليت</span>
                                                </div>
                                            )}
                                            {productType === 'STYROFOAM' && p.prices[AgentType.VIP].pricePerMeter > 0 && (
                                                <div className="flex items-center justify-center gap-1 pt-2 mt-1 border-t border-dashed border-white/10">
                                                    <span className="font-bold text-blue-100 font-mono text-xs">${p.prices[AgentType.VIP].pricePerMeter}</span>
                                                    <span className="text-[9px] text-blue-300/60 font-bold">{t("products_tab.per_meter")}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-t border-dashed border-gray-200 pt-6"><span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t("products_tab.sales_view")}</span><div className="flex items-center gap-2 text-[#0e3c63] font-black text-sm group-hover:gap-4 transition-all">{t("products_tab.details_arrow")} <ArrowRight size={18} /></div></div>
                            </div>
                        )})}
                    </div>
                </div>
            )}

            {/* --- PRODUCT FORM MODAL (ADD / EDIT) --- */}
            {showProductModal && (
                <div className="fixed inset-0 bg-[#0e3c63]/50 backdrop-blur-md z-[800] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white/20 animate-fade-in">
                        <div className="p-8 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white/10 rounded-3xl shadow-inner">{editingProduct ? <Edit3 size={32} /> : <Plus size={32} />}</div>
                                <div>
                                    <h3 className="font-black text-2xl">{editingProduct ? t('products_tab.edit_product_title', { code: editingProduct.code }) : t('products_tab.add_new_catalog')}</h3>
                                    <p className="text-blue-200 text-xs font-bold opacity-70 uppercase tracking-widest">Inventory Master Data</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowProductModal(false); setEditingProduct(null); }} className="bg-white/10 hover:bg-red-500 p-3 rounded-2xl transition-all shadow-inner"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleProductSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-gray-50/30">
                            <div className="space-y-10">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4 px-1"><Info size={14} className="text-[#0e3c63]" /> {t("products_tab.basic_info")}</h4>
                                    {/* Image Upload Area */}
                                    <div className="w-full flex justify-center mb-6">
                                        <div
                                            onClick={() => document.getElementById('prod-img-upload')?.click()}
                                            className="w-full h-40 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-[#0e3c63] transition-all group relative overflow-hidden bg-white"
                                        >
                                            {previewUrl || editingProduct?.imageUrl ? (
                                                <img src={previewUrl || editingProduct?.imageUrl} className="absolute inset-0 w-full h-full object-contain p-2" />
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-[#0e3c63] transition-colors mb-2">
                                                        <Upload size={20} />
                                                    </div>
                                                    <p className="text-gray-400 font-bold text-xs group-hover:text-[#0e3c63]">{t("products_tab.upload_image_hint")}</p>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                id="prod-img-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setSelectedImage(e.target.files[0]);
                                                        setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input required label={t("products_tab.product_code")} name="code" defaultValue={editingProduct?.code} placeholder={t("products_tab.product_code_placeholder")} />
                                        <CategorySelector label={t("products_tab.product_category")} categories={categories} value={modalCategory} onChange={setModalCategory} placeholder={t("products_tab.product_category_placeholder")} />
                                    </div>
                                    {formType === 'PAINT' && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input required label="اسم المادة" name="name" defaultValue={editingProduct?.name} />
                                        <Input required label="نوع الصبغ" name="paintType" defaultValue={editingProduct?.paintType} />
                                    </div>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Input required label={formType === 'PAINT' ? 'الوزن / الحجم' : formType === 'ADHESIVE' ? t('products_tab.weight_kg') : t('products_tab.dimensions_cm')} name="dimensions" defaultValue={editingProduct?.dimensions} placeholder={formType === 'PAINT' ? '18 لتر / 20 كغم / كالون' : formType === 'ADHESIVE' ? "25kg" : "200x50x5 cm"} />
                                        </div>
                                        {formType !== 'PAINT' && <Input
                                            type="number"
                                            required
                                            min="1"
                                            label={formType === 'ADHESIVE' ? 'عدد الأكياس بالباليت' : t("products_tab.meters_in_carton")}
                                            name={formType === 'ADHESIVE' ? 'bagsPerPallet' : 'metersPerCarton'}
                                            value={formMetersPerCarton}
                                            onChange={(e: any) => setFormMetersPerCarton(Number(e.target.value) || 0)}
                                            placeholder={formType === 'ADHESIVE' ? '80' : '0'}
                                        />}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-4 px-1"><DollarSign size={14} /> {t("products_tab.price_structure")}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Normal Pricing */}
                                        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-md space-y-4">
                                            <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-2"><div className="p-2 bg-gray-50 text-gray-400 rounded-xl"><User size={18} /></div><span className="font-black text-gray-700">{t("products_tab.normal_agents")}</span></div>
                                            <div className="space-y-4">
                                                {formType === 'PAINT' ? (<Input type="number" min="0" step="0.01" required label="سعر السطلة" name="priceCartonNormal" value={formBagPriceNormal} onChange={(e: any) => setFormBagPriceNormal(Number(e.target.value) || 0)} />) : formType === 'ADHESIVE' ? (
                                                    <>
                                                        <Input type="number" step="0.01" required label={t('products_tab.price_bag_label')} name="priceCartonNormal" value={formBagPriceNormal} onChange={(e: any) => setFormBagPriceNormal(Number(e.target.value) || 0)} />
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-bold text-gray-700">سعر الباليت</label>
                                                            <div className="w-full h-[52px] bg-purple-50 border-2 border-purple-100 rounded-xl px-4 font-black font-mono text-purple-700 flex items-center gap-2 cursor-not-allowed select-none">
                                                                <Layers size={16} className="text-purple-400" />
                                                                <span className="text-lg">${formPalletPriceNormal || 0}</span>
                                                                <span className="text-[10px] text-purple-400 font-bold mr-auto">{formBagsPerPallet} كيس</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Input type="number" step="0.01" required label={t("products_tab.price_per_meter")} name="priceMeterNormal" value={formMeterPriceNormal} onChange={(e: any) => setFormMeterPriceNormal(Number(e.target.value) || 0)} />
                                                        {/* Read-only calculated carton price */}
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-bold text-gray-700">{t('products_tab.price_carton_label')}</label>
                                                            <div className="w-full h-[52px] bg-gray-100 border-2 border-gray-200 rounded-xl px-4 font-black font-mono text-gray-600 flex items-center gap-2 cursor-not-allowed select-none">
                                                                <DollarSign size={16} className="text-gray-400" />
                                                                <span className="text-lg">{(Math.round((formMeterPriceNormal * formMetersPerCarton) * 100) / 100) || 0}</span>
                                                                <span className="text-[10px] text-gray-400 font-bold mr-auto">{t('products_tab.auto_calculated')}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {/* VIP Pricing */}
                                        <div className="bg-[#0e3c63] p-6 rounded-[2.5rem] shadow-2xl space-y-4 text-white">
                                            <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-2"><div className="p-2 bg-white/10 text-amber-400 rounded-xl"><Award size={18} /></div><span className="font-black">{t("products_tab.vip_agents")}</span></div>
                                            <div className="space-y-4">
                                                {formType === 'PAINT' ? (<Input type="number" min="0" step="0.01" required label="سعر السطلة VIP" name="priceCartonVIP" value={formBagPriceVIP} onChange={(e: any) => setFormBagPriceVIP(Number(e.target.value) || 0)} />) : formType === 'ADHESIVE' ? (
                                                    <>
                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-black text-blue-200 mr-1">{t('products_tab.price_bag_label')}</label>
                                                            <input type="number" step="0.01" required name="priceCartonVIP" value={formBagPriceVIP} onChange={(e: any) => setFormBagPriceVIP(Number(e.target.value) || 0)} className="w-full h-12 bg-white/10 border border-white/10 rounded-xl px-4 font-black font-mono text-white outline-none focus:bg-white/20" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-black text-blue-200 mr-1">سعر الباليت</label>
                                                            <div className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 font-black font-mono text-blue-100 flex items-center gap-2 cursor-not-allowed select-none">
                                                                <Layers size={16} className="text-blue-300/50" />
                                                                <span className="text-lg">${formPalletPriceVIP || 0}</span>
                                                                <span className="text-[10px] text-blue-300/50 font-bold mr-auto">{formBagsPerPallet} كيس</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-black text-blue-200 mr-1">{t("products_tab.price_per_meter")}</label>
                                                            <input type="number" step="0.01" required name="priceMeterVIP" value={formMeterPriceVIP} onChange={(e: any) => setFormMeterPriceVIP(Number(e.target.value) || 0)} className="w-full h-12 bg-white/10 border border-white/10 rounded-xl px-4 font-black font-mono text-white outline-none focus:bg-white/20" />
                                                        </div>
                                                        {/* Read-only calculated carton price */}
                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-black text-blue-200 mr-1">{t('products_tab.price_carton_label')}</label>
                                                            <div className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 font-black font-mono text-blue-100 flex items-center gap-2 cursor-not-allowed select-none">
                                                                <DollarSign size={16} className="text-blue-300/50" />
                                                                <span className="text-lg">{(Math.round((formMeterPriceVIP * formMetersPerCarton) * 100) / 100) || 0}</span>
                                                                <span className="text-[10px] text-blue-300/50 font-bold mr-auto">{t('products_tab.auto_calculated')}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="p-8 border-t bg-white flex gap-4 shrink-0 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.1)]">
                            <Button type="submit" disabled={uploading} onClick={() => (document.querySelector('form') as HTMLFormElement).requestSubmit()} className="flex-1 h-16 bg-[#0e3c63] text-white text-lg font-black rounded-2xl shadow-xl active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {uploading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                {uploading ? t('products_tab.uploading_product') : (editingProduct ? t('products_tab.updating_product') : t('products_tab.adding_catalog'))}
                            </Button>
                            <Button type="button" onClick={() => { setShowProductModal(false); setEditingProduct(null); }} variant="secondary" className="px-10 h-16 rounded-2xl font-bold">{t("products_tab.cancel")}</Button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmModal.isOpen && deleteConfirmModal.product && (
                <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                        {/* Red Warning Header */}
                        <div className="bg-gradient-to-br from-red-600 to-red-800 p-10 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                    <AlertOctagon size={42} className="text-white animate-pulse" />
                                </div>
                                <h3 className="text-2xl font-black mb-2">{t("products_tab.delete_action_title")}</h3>
                                <p className="text-red-100 text-sm font-bold opacity-80">{t("products_tab.delete_warning")}</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8">
                            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t("products_tab.code_label")}</span>
                                    <span className="font-mono font-black text-[#0e3c63] text-xl">{deleteConfirmModal.product.code}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t("products_tab.sub_category")}</span>
                                    <span className="font-black text-gray-800">{deleteConfirmModal.product.category}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t("products_tab.main_type")}</span>
                                    <span className="font-black text-gray-800">
                                        {
                                            (categories.find((c: any) => c.name === deleteConfirmModal.product!.category)?.type || 'STYROFOAM') === 'ADHESIVE'
                                                ? t('products_tab.type_adhesives')
                                                : t('products_tab.type_foams')
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button onClick={executeDeleteProduct} className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg border-b-4 border-red-800">
                                    <XCircle size={20} /> {t("products_tab.permanent_delete")}
                                </Button>
                                <button onClick={() => setDeleteConfirmModal({ isOpen: false, product: null })} className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200 mt-2">{t("products_tab.cancel")}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {linkedOrdersModal.isOpen && (
                <div className="fixed inset-0 bg-[#0e3c63]/60 backdrop-blur-md z-[700] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in border-t-[12px] border-amber-500">
                        <div className="p-10 text-center space-y-6">
                            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl ring-8 ring-amber-50"><ShieldAlert size={42} /></div>
                            <div><h3 className="text-2xl font-black text-gray-800 mb-2">{t("products_tab.cannot_delete_title")}</h3><p className="text-gray-500 font-bold leading-relaxed px-4">{t("products_tab.cannot_delete_msg1")} <span className="text-[#0e3c63] font-black">"{linkedOrdersModal.productCode}"</span> {t("products_tab.cannot_delete_msg2")}</p></div>
                            <div className="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                {linkedOrdersModal.orderIds.map(id => (
                                    <span key={id} className="bg-white border border-amber-200 px-4 py-2 rounded-xl text-sm font-mono font-black text-[#0e3c63]">#{id}</span>
                                ))}
                            </div>
                            <Button onClick={() => setLinkedOrdersModal(prev => ({ ...prev, isOpen: false }))} className="w-full h-16 bg-[#0e3c63] text-white rounded-2xl font-black text-lg shadow-xl mt-4">{t("products_tab.understood_review")}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
