
import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Eye, Edit, Wallet, AlertCircle, Hourglass, Activity, Filter, ChevronDown,
    Plus, Trash2, Banknote, ShoppingBag, CreditCard, Clock, Send, X, Save, Box, Layers,
    ChevronLeft, CheckCircle2, Package, PlayCircle, ArrowRightLeft, TrendingUp, Info,
    ShoppingCart, Calculator, MapPin, Ruler, History, Tag, Percent, Lock, ShieldCheck,
    LockKeyhole, User, Sparkles, MessageSquare, RotateCcw, PenTool
} from 'lucide-react';
import { Badge, Button, DateRangePicker, Input, Tooltip } from '../../../components/ui';
import { PaymentStatus, ProductionStatus, Order, OrderItem, Product, UserRole, AgentType, PaymentStatusLabels, ProductionStatusLabels } from '../../../types';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { ADHESIVE_CATEGORY } from '../../../lib/constants';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { UserSelector } from '../../../components/shared/UserSelector';
import { ProductionConfirmationModal } from '../../../components/shared/ProductionConfirmationModal';
import { formatDate } from '../../../lib/dateUtils';

interface SpecialItemRow {
    id: string;
    note: string;
    qty: string;
    price: string;
}

export const OrdersTab = ({ orders, onViewOrder, onDeleteOrder, isDateInRange, onNavigateToAgent, userPermissions, onUpdateStatus, products, agents }: any) => {
    const { user: currentUser } = useAuth();
    const toast = useToast();

    const [ordersFromDate, setOrdersFromDate] = useState('');
    const [ordersToDate, setOrdersToDate] = useState('');
    const [orderSearch, setOrderSearch] = useState('');
    const [ordersPage, setOrdersPage] = useState(0);
    const [ordersRowsPerPage, setOrdersRowsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(true);

    const [activeFilter, setActiveFilter] = useState<{ type: 'PAYMENT' | 'PRODUCTION' | 'ALL', value: string | null }>({ type: 'ALL', value: null });

    // Edit Order State
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [editingOrderItems, setEditingOrderItems] = useState<OrderItem[]>([]);
    const [newPaymentAddition, setNewPaymentAddition] = useState<number>(0);
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
    const [editSearch, setEditSearch] = useState('');
    const [editSearchType, setEditSearchType] = useState<'STYROFOAM' | 'ADHESIVE'>('STYROFOAM');

    // Edit Order Special Request Repeater
    const [editSpecialModal, setEditSpecialModal] = useState(false);
    const [editSpecialItems, setEditSpecialItems] = useState<SpecialItemRow[]>([
        { id: Math.random().toString(), note: '', qty: '0', price: '0' }
    ]);

    // Production Confirmation State
    const [productionConfirmationOrder, setProductionConfirmationOrder] = useState<Order | null>(null);
    const [showPricingErrorModal, setShowPricingErrorModal] = useState(false);
    const [deleteAttemptOrder, setDeleteAttemptOrder] = useState<Order | null>(null);

    // Manual Order State
    const [manualOrderModal, setManualOrderModal] = useState(false);
    const [manualOrderAgentId, setManualOrderAgentId] = useState<number | 'ALL'>('ALL');
    const [manualOrderItems, setManualOrderItems] = useState<any[]>([]);
    const [manualOrderPaid, setManualOrderPaid] = useState<string>('0');
    const [manualDiscount, setManualDiscount] = useState<number>(0);
    const [manualDiscountType, setManualDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
    const [manualOrderSearch, setManualOrderSearch] = useState('');
    const [manualOrderSearchType, setManualOrderSearchType] = useState<'STYROFOAM' | 'ADHESIVE'>('STYROFOAM');

    // Manual Order Special Request Repeater
    const [manualSpecialModal, setManualSpecialModal] = useState(false);
    const [manualSpecialItems, setManualSpecialItems] = useState<SpecialItemRow[]>([
        { id: Math.random().toString(), note: '', qty: '0', price: '0' }
    ]);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 400);
        return () => clearTimeout(timer);
    }, [ordersFromDate, ordersToDate, orderSearch, activeFilter]);

    const filteredOrders = useMemo(() => {
        return orders.filter((o: any) => {
            const matchesSearch = o.id.toString().includes(orderSearch) || o.agentName.includes(orderSearch);
            if (!matchesSearch) return false;
            if (!isDateInRange(o.createdAt, ordersFromDate, ordersToDate)) return false;
            if (activeFilter.type === 'PAYMENT' && activeFilter.value) { if (o.paymentStatus !== activeFilter.value) return false; }
            if (activeFilter.type === 'PRODUCTION' && activeFilter.value) { if (o.productionStatus !== activeFilter.value) return false; }
            return true;
        });
    }, [orders, orderSearch, ordersFromDate, ordersToDate, activeFilter, isDateInRange]);

    const handleManualRefresh = () => {
        setIsLoading(true);
        db.fetchOrders().then(() => {
            setTimeout(() => setIsLoading(false), 500);
        });
    };

    const currentOrders = filteredOrders.slice(ordersPage * ordersRowsPerPage, (ordersPage + 1) * ordersRowsPerPage);

    const stats = useMemo(() => ({
        total: orders.length,
        debt: orders.filter((o: any) => o.paymentStatus === PaymentStatus.PENDING).length,
        partial: orders.filter((o: any) => o.paymentStatus === PaymentStatus.PARTIALLY_PAID).length,
        paid: orders.filter((o: any) => o.paymentStatus === PaymentStatus.PAID).length,
        pendingTransfer: orders.filter((o: any) => o.productionStatus === ProductionStatus.PENDING_TRANSFER || o.productionStatus === ProductionStatus.PENDING_PAYMENT).length,
        waiting: orders.filter((o: any) => o.productionStatus === ProductionStatus.WAITING).length,
        inProgress: orders.filter((o: any) => o.productionStatus === ProductionStatus.IN_PROGRESS).length,
        completed: orders.filter((o: any) => o.productionStatus === ProductionStatus.COMPLETED).length
    }), [orders]);

    const handleConfirmProductionMove = () => {
        if (productionConfirmationOrder && currentUser) {
            // DIRECT UPDATE: Calling db directly to avoid triggering the parent's second confirmation modal
            db.updateOrderStatus(currentUser.id, productionConfirmationOrder.id, 'production', ProductionStatus.WAITING);
            setProductionConfirmationOrder(null);
            toast.success('تم ترحيل الطلب للإنتاج بنجاح');
        }
    };

    const validateOrderForProduction = (order: Order) => {
        // Check for special requests with 0 price
        const hasUnpricedSpecial = order.items.some(i => i.isSpecialRequest && (i.totalPrice === 0 || i.unitPriceCarton === 0));
        if (hasUnpricedSpecial) {
            setShowPricingErrorModal(true);
            return false;
        }
        return true;
    };

    const handleOpenEditOrder = (order: Order) => {
        if (order.productionStatus === ProductionStatus.COMPLETED && order.paymentStatus === PaymentStatus.PAID) {
            toast.warning('فاتورة مغلقة', 'هذا الطلب مكتمل ومسدد بالكامل، لا يمكن تعديله نهائياً.');
            return;
        }
        setEditingOrder(order);
        setEditingOrderItems(JSON.parse(JSON.stringify(order.items)));
        setNewPaymentAddition(0);
        setDiscountValue(order.discountValue || 0);
        setDiscountType(order.discountType || 'FIXED');
        setEditSearch('');
    };

    const handleClickDelete = (order: Order) => {
        if (
            order.productionStatus === ProductionStatus.WAITING ||
            order.productionStatus === ProductionStatus.IN_PROGRESS
        ) {
            setDeleteAttemptOrder(order);
            return;
        }
        onDeleteOrder(order);
    };

    const handleSaveOrderChanges = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingOrder) {
            try {
                const updatedItemsSimple = editingOrderItems.map(i => ({
                    productId: i.productId,
                    qMeters: i.quantityMeters,
                    qCartons: i.quantityCartons,
                    isSpecialRequest: i.isSpecialRequest,
                    specialRequestNote: i.specialRequestNote,
                    unitPriceCarton: i.unitPriceCarton,
                    unitPriceMeter: i.unitPriceMeter
                }));
                db.updateOrder(currentUser!.id, editingOrder.id, updatedItemsSimple, Number(newPaymentAddition), Number(discountValue), discountType);
                toast.success('تم حفظ التغييرات بنجاح');
                setEditingOrder(null);
            } catch (e: any) { toast.error(e.message); }
        }
    };

    const addProductToEditOrder = (p: Product) => {
        if (editingOrder) {
            if (editingOrder.productionStatus === ProductionStatus.COMPLETED) return;
            const prodDetails = products.find((pr: any) => pr.id === p.id);
            if (!prodDetails) return;
            const agent = agents.find((u: any) => u.id === editingOrder.agentId);
            if (!agent || !agent.agentDetails) return;
            const exists = editingOrderItems.find(i => i.productId === p.id);
            if (exists) { toast.info('المنتج موجود بالفعل'); return; }
            const prices = prodDetails.prices[agent.agentDetails.type];
            const newItem: OrderItem = {
                id: Date.now(), productId: p.id, productCode: p.code, productDimensions: p.dimensions,
                quantityCartons: 1, quantityMeters: 0, unitPriceCarton: prices.pricePerCarton,
                unitPriceMeter: prices.pricePerMeter, totalPrice: prices.pricePerCarton
            };
            setEditingOrderItems(prev => [...prev, newItem]);
            setEditSearch('');
        }
    };

    // Special Request Repeater Helpers (Used in Edit and Manual)
    const addSpecialRow = (setter: React.Dispatch<React.SetStateAction<SpecialItemRow[]>>) => {
        setter(prev => [...prev, { id: Math.random().toString(), note: '', qty: '0', price: '0' }]);
    };

    const removeSpecialRow = (setter: React.Dispatch<React.SetStateAction<SpecialItemRow[]>>, id: string) => {
        setter(prev => prev.length > 1 ? prev.filter(item => item.id !== id) : [{ id: Math.random().toString(), note: '', qty: '0', price: '0' }]);
    };

    const updateSpecialRow = (setter: React.Dispatch<React.SetStateAction<SpecialItemRow[]>>, id: string, field: keyof SpecialItemRow, value: string) => {
        let cleanValue = value;

        // Prevent leading zeros for qty and price
        if (field === 'qty' || field === 'price') {
            if (value === '') {
                cleanValue = '';
            } else {
                // Convert to number and back to string to remove leading zeros (e.g. "05" -> 5 -> "5")
                cleanValue = Number(value).toString();
            }
        }

        setter(prev => prev.map(item => item.id === id ? { ...item, [field]: cleanValue } : item));
    };

    // Add Specials to Edit Order
    const handleConfirmEditSpecials = () => {
        // Validate quantities
        const zeroQty = editSpecialItems.find(i => Number(i.qty) <= 0);
        if (zeroQty) {
            toast.error('يرجى تحديد كمية أكبر من 0 لجميع البنود');
            return;
        }

        const valid = editSpecialItems.filter(i => i.note.trim() !== '');
        if (valid.length === 0) {
            toast.error('يرجى كتابة وصف للطلب');
            return;
        }

        const newItems: OrderItem[] = valid.map((item, idx) => ({
            id: Date.now() + idx,
            productId: -1,
            productCode: 'طلب خاص',
            productDimensions: 'أبعاد مخصصة',
            quantityCartons: Number(item.qty),
            quantityMeters: 0,
            unitPriceCarton: Number(item.price),
            unitPriceMeter: 0,
            totalPrice: Number(item.qty) * Number(item.price),
            isSpecialRequest: true,
            specialRequestNote: item.note
        }));

        setEditingOrderItems(prev => [...prev, ...newItems]);
        setEditSpecialModal(false);
        setEditSpecialItems([{ id: Math.random().toString(), note: '', qty: '0', price: '0' }]);
    };

    // Add Specials to Manual Order
    const handleConfirmManualSpecials = () => {
        // Validate quantities
        const zeroQty = manualSpecialItems.find(i => Number(i.qty) <= 0);
        if (zeroQty) {
            toast.error('يرجى تحديد كمية أكبر من 0 لجميع البنود');
            return;
        }

        const valid = manualSpecialItems.filter(i => i.note.trim() !== '');
        if (valid.length === 0) {
            toast.error('يرجى كتابة وصف للطلب');
            return;
        }

        const newItems = valid.map((item, idx) => ({
            id: Date.now() + idx,
            productId: -1,
            productCode: 'طلب خاص',
            productDimensions: 'أبعاد مخصصة',
            quantityCartons: Number(item.qty),
            quantityMeters: 0,
            unitPriceCarton: Number(item.price),
            unitPriceMeter: 0,
            totalPrice: Number(item.qty) * Number(item.price),
            isSpecialRequest: true,
            specialRequestNote: item.note
        }));

        setManualOrderItems(prev => [...prev, ...newItems]);
        setManualSpecialModal(false);
        setManualSpecialItems([{ id: Math.random().toString(), note: '', qty: '0', price: '0' }]);
    };

    const productsForEdit = useMemo(() => {
        if (!editSearch.trim()) return [];
        return products.filter((p: any) => {
            const matchesCode = p.code.toLowerCase().includes(editSearch.toLowerCase());
            if (!matchesCode) return false;

            const categoryType = db.categories.find((c: any) => c.name === p.category)?.type;

            if (editSearchType === 'ADHESIVE') {
                return categoryType === 'ADHESIVE';
            } else {
                return categoryType === 'STYROFOAM';
            }
        });
    }, [products, editSearch, editSearchType]);

    const currentSubtotal = useMemo(() => editingOrderItems.reduce((s, i) => s + (i.totalPrice || 0), 0), [editingOrderItems]);
    const currentActualDiscount = useMemo(() => discountType === 'PERCENT' ? (currentSubtotal * discountValue / 100) : discountValue, [currentSubtotal, discountValue, discountType]);
    const currentFinalTotal = currentSubtotal - currentActualDiscount;

    // --- Manual Order Helper Functions ---
    const productsForManual = useMemo(() => {
        if (!manualOrderSearch.trim()) return [];
        return products.filter((p: any) => {
            const matchesSearch = p.code.toLowerCase().includes(manualOrderSearch.toLowerCase());
            if (!matchesSearch) return false;
            // Check category type from database
            const categoryType = db.categories.find((c: any) => c.name === p.category)?.type;
            if (manualOrderSearchType === 'ADHESIVE') {
                return categoryType === 'ADHESIVE';
            } else {
                return categoryType === 'STYROFOAM';
            }
        });
    }, [products, manualOrderSearch, manualOrderSearchType]);

    const addProductToManualOrder = (p: Product) => {
        const agent = agents.find((u: any) => u.id === manualOrderAgentId);
        if (!agent || !agent.agentDetails) { toast.error('يرجى اختيار الوكيل أولاً لتحديد الأسعار'); return; }

        const exists = manualOrderItems.find(i => i.productId === p.id);
        if (exists) { toast.info('المنتج موجود بالفعل في السلة'); return; }

        const prices = p.prices[agent.agentDetails.type];
        const newItem = {
            id: Date.now(),
            productId: p.id,
            productCode: p.code,
            productDimensions: p.dimensions,
            quantityCartons: 1,
            quantityMeters: 0,
            unitPriceCarton: prices.pricePerCarton,
            unitPriceMeter: prices.pricePerMeter,
            totalPrice: prices.pricePerCarton,
            isSpecialRequest: false
        };
        setManualOrderItems(prev => [...prev, newItem]);
        setManualOrderSearch('');
    };

    const manualSubtotal = useMemo(() => manualOrderItems.reduce((s, i) => s + (i.totalPrice || 0), 0), [manualOrderItems]);
    const manualActualDiscount = useMemo(() => manualDiscountType === 'PERCENT' ? (manualSubtotal * manualDiscount / 100) : manualDiscount, [manualSubtotal, manualDiscount, manualDiscountType]);
    const manualFinalTotal = manualSubtotal - manualActualDiscount;

    const handleCreateManualOrder = async () => {
        if (manualOrderAgentId === 'ALL') { toast.error('يرجى تحديد الوكيل'); return; }
        if (manualOrderItems.length === 0) { toast.error('السلة فارغة'); return; }
        try {
            // 1. Create Base Order
            const itemsPayload = manualOrderItems.map(i => ({
                productId: i.productId,
                qMeters: i.quantityMeters,
                qCartons: i.quantityCartons,
                isSpecial: i.isSpecialRequest,
                specialNote: i.specialRequestNote
            }));
            const newOrder = await db.createOrder(manualOrderAgentId, itemsPayload, Number(manualOrderPaid), true, currentUser?.fullName, currentUser?.id);

            // 2. Immediately update with custom prices if needed (admin override prices)
            const updatePayload = manualOrderItems.map(i => ({
                ...i,
                qCartons: i.quantityCartons,
                qMeters: i.quantityMeters,
            }));
            db.updateOrder(currentUser!.id, newOrder.id, updatePayload, 0, manualDiscount, manualDiscountType);

            toast.success('تم إنشاء الطلب اليدوي بنجاح');
            setManualOrderModal(false);
            setManualOrderItems([]);
            setManualOrderPaid('0');
            setManualOrderAgentId('ALL');
        } catch (err: any) { toast.error(err.message); }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2"><div className="p-1.5 bg-blue-50 text-[#0e3c63] rounded-lg border border-blue-100"><Banknote size={14} /></div><h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">الموقف المالي للطلبات</h4></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { id: 'ALL', label: 'الكل', val: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', type: 'ALL', status: null, icon: ShoppingBag },
                            { id: 'DEBT', label: 'ديون (أجل)', val: stats.debt, color: 'text-red-600', bg: 'bg-red-50', type: 'PAYMENT', status: PaymentStatus.PENDING, icon: AlertCircle },
                            { id: 'PARTIAL', label: 'مدفوع جزئياً', val: stats.partial, color: 'text-orange-600', bg: 'bg-orange-50', type: 'PAYMENT', status: PaymentStatus.PARTIALLY_PAID, icon: Wallet },
                            { id: 'PAID', label: 'واصل (كامل)', val: stats.paid, color: 'text-emerald-600', bg: 'bg-emerald-50', type: 'PAYMENT', status: PaymentStatus.PAID, icon: Banknote },
                        ].map(item => (
                            <button key={item.id} onClick={() => { setActiveFilter({ type: item.type as any, value: item.status }); setOrdersPage(0); }} className={`p-4 rounded-2xl border-2 transition-all text-right group relative overflow-hidden flex flex-col justify-between h-28 ${activeFilter.type === item.type && activeFilter.value === item.status ? 'bg-white border-[#0e3c63] shadow-xl scale-[1.05] z-10' : 'bg-white border-transparent hover:border-blue-100 shadow-sm'}`}><div className={`p-2 rounded-xl w-fit ${item.bg} ${item.color}`}><item.icon size={16} /></div><div><p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{item.label}</p><span className="text-xl font-black font-mono tracking-tighter text-gray-800">{item.val}</span></div></button>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2"><div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg border border-orange-100"><Activity size={14} /></div><h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">الموقف الإنتاجي للطلبات</h4></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { id: 'P_TRANS', label: 'بانتظار ترحيل', val: stats.pendingTransfer, color: 'text-indigo-600', bg: 'bg-indigo-50', type: 'PRODUCTION', status: ProductionStatus.PENDING_TRANSFER, icon: PlayCircle },
                            { id: 'WAITING', label: 'في الانتظار', val: stats.waiting, color: 'text-gray-600', bg: 'bg-gray-100', type: 'PRODUCTION', status: ProductionStatus.WAITING, icon: Clock },
                            { id: 'IN_PROG', label: 'قيد التحضير', val: stats.inProgress, color: 'text-blue-600', bg: 'bg-blue-50', type: 'PRODUCTION', status: ProductionStatus.IN_PROGRESS, icon: Activity },
                            { id: 'DONE', label: 'تم التجهيز', val: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50', type: 'PRODUCTION', status: ProductionStatus.COMPLETED, icon: CheckCircle2 },
                        ].map(item => (
                            <button key={item.id} onClick={() => { setActiveFilter({ type: item.type as any, value: item.status }); setOrdersPage(0); }} className={`p-4 rounded-2xl border-2 transition-all text-right group relative overflow-hidden flex flex-col justify-between h-28 ${activeFilter.type === item.type && activeFilter.value === item.status ? 'bg-white border-[#0e3c63] shadow-xl scale-[1.05] z-10' : 'bg-white border-transparent hover:border-blue-100 shadow-sm'}`}><div className={`p-2 rounded-xl w-fit ${item.bg} ${item.color}`}><item.icon size={16} /></div><div><p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{item.label}</p><span className="text-xl font-black font-mono tracking-tighter text-gray-800">{item.val}</span></div></button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="sticky top-0 z-30"><div className="bg-white/95 backdrop-blur-md p-3 rounded-[2rem] shadow-xl border border-white flex flex-col xl:flex-row items-center gap-3"><div className="relative flex-1 w-full"><input className="w-full h-[52px] pl-4 pr-11 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner" placeholder="بحث باسم الوكيل أو رقم الطلب..." value={orderSearch} onChange={e => { setOrderSearch(e.target.value); setOrdersPage(0); }} /><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /></div><DateRangePicker from={ordersFromDate} to={ordersToDate} onChangeFrom={setOrdersFromDate} onChangeTo={setOrdersToDate} />{userPermissions?.includes('ADD_ORDERS') && <Button onClick={() => setManualOrderModal(true)} className="h-[52px] px-6 bg-[#0e3c63] rounded-2xl shadow-lg hover:shadow-blue-900/20 active:scale-95 transition-all"><Plus size={18} /> إضافة طلب يدوي</Button>}</div></div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-6 px-6 pt-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-xl">
                            <ShoppingBag className="text-gray-400" size={22} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">إدارة الطلبات</h2>
                    </div>
                    <button onClick={handleManualRefresh} className="bg-gray-50 p-2.5 rounded-full border border-gray-200 text-gray-400 hover:text-[#0e3c63] hover:border-[#0e3c63] hover:bg-blue-50 transition-all" title="تحديث القائمة">
                        <RotateCcw size={18} className={`${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-[#0e3c63] text-white text-xs font-bold uppercase tracking-wider border-b-4 border-[#1a4d7a] shadow-md sticky top-0 z-20">
                            <tr><th className="p-5 text-right rounded-tr-2xl">الطلب</th><th className="p-5 text-right">الوكيل</th><th className="p-5 text-right">المبلغ / الواصل</th><th className="p-5 text-right">التاريخ</th><th className="p-5 text-right">الحالة المالية</th><th className="p-5 text-right">التجهيز</th><th className="p-5 text-center rounded-tl-2xl">إجراء</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                // Skeleton Loading Rows
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-6"><div className="h-5 bg-gray-200 rounded w-16"></div></td>
                                        <td className="p-6"><div className="h-5 bg-gray-200 rounded w-24 mb-1"></div><div className="h-3 bg-gray-100 rounded w-16"></div></td>
                                        <td className="p-6"><div className="h-6 bg-gray-200 rounded w-20 mb-1"></div><div className="h-3 bg-gray-100 rounded w-14"></div></td>
                                        <td className="p-6"><div className="h-5 bg-gray-200 rounded w-20"></div></td>
                                        <td className="p-6"><div className="h-6 bg-gray-200 rounded-full w-20"></div></td>
                                        <td className="p-6"><div className="h-6 bg-gray-200 rounded-full w-16"></div></td>
                                        <td className="p-6"><div className="flex justify-center gap-2"><div className="w-10 h-10 bg-gray-200 rounded-xl"></div><div className="w-10 h-10 bg-gray-200 rounded-xl"></div></div></td>
                                    </tr>
                                ))
                            ) : currentOrders.map((o: any) => {
                                const isLocked = o.productionStatus === ProductionStatus.COMPLETED;
                                const isPaid = o.paymentStatus === PaymentStatus.PAID;
                                return (
                                    <tr key={o.id} className="hover:bg-blue-50/40 transition-all">
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-black text-gray-400">#{o.id}</span>
                                                {o.isManual && (
                                                    <Tooltip content={`تم إنشاء الطلب يدوياً بواسطة: ${o.manualBy || 'الإدارة'}`}>
                                                        <div className="p-1 rounded-md bg-amber-100 text-amber-600 animate-pulse shadow-sm cursor-help">
                                                            <PenTool size={12} />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                                {isLocked && (
                                                    <Tooltip content={isPaid ? "طلب مغلق نهائياً" : "طلب مكتمل - مسموح بالدفع فقط"}>
                                                        <div className={`p-1 rounded-md ${isPaid ? 'text-red-500 bg-red-50' : 'text-amber-500 bg-amber-50'} cursor-help`}>
                                                            <Lock size={12} />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                                {o.hasSpecialRequest && (
                                                    <Tooltip content="تحتوي هذه القائمة على طلب خاص">
                                                        <div className="p-1 rounded-md bg-amber-50 text-amber-500 animate-pulse cursor-help">
                                                            <Sparkles size={12} className="text-amber-500 fill-amber-500" />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6"><button onClick={() => onNavigateToAgent(o.agentId)} className="font-black text-gray-800 hover:text-blue-600 transition-colors">{o.agentName}</button><span className="block text-[10px] text-gray-400 font-bold">{o.agentProvince}</span></td>
                                        <td className="p-6"><div className="font-mono font-black text-[#0e3c63] text-lg">${(o.totalAmount || 0).toLocaleString()}</div><div className="font-mono text-[11px] text-emerald-600 font-bold">${(o.paidAmount || 0).toLocaleString()}</div></td>
                                        <td className="p-6"><span className="font-bold text-gray-700 text-sm">{formatDate(o.createdAt)}</span></td>
                                        <td className="p-6"><Badge color={o.paymentStatus === PaymentStatus.PAID ? 'green' : (o.paymentStatus === PaymentStatus.PARTIALLY_PAID ? 'orange' : 'red')}>{PaymentStatusLabels[o.paymentStatus]}</Badge></td>
                                        <td className="p-6"><Badge color={o.productionStatus === ProductionStatus.COMPLETED ? 'blue' : 'gray'}>{ProductionStatusLabels[o.productionStatus]}</Badge></td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center gap-2">
                                                <Tooltip content="معاينة الفاتورة">
                                                    <button onClick={() => onViewOrder(o)} className="w-10 h-10 flex items-center justify-center text-[#0e3c63] bg-white border border-gray-100 rounded-xl hover:bg-sky-50 shadow-sm transition-all" aria-label="معاينة الفاتورة">
                                                        <Eye size={20} />
                                                    </button>
                                                </Tooltip>
                                                {(o.productionStatus === ProductionStatus.PENDING_TRANSFER || o.productionStatus === ProductionStatus.PENDING_PAYMENT) && userPermissions.includes('EDIT_PRODUCTION') && (
                                                    <Tooltip content="ترحيل للإنتاج">
                                                        <button onClick={() => { if (validateOrderForProduction(o)) setProductionConfirmationOrder(o); }} className="w-10 h-10 flex items-center justify-center text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white shadow-sm transition-all animate-pulse" aria-label="ترحيل للإنتاج">
                                                            <PlayCircle size={20} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {userPermissions.includes('EDIT_ORDERS') && (
                                                    <Tooltip content={isLocked && isPaid ? "الطلب مغلق تماماً" : "تعديل الطلب"}>
                                                        <button onClick={() => handleOpenEditOrder(o)} disabled={isLocked && isPaid} className={`w-10 h-10 flex items-center justify-center rounded-xl border shadow-sm transition-all ${isLocked && isPaid ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' : 'text-blue-600 bg-white border-gray-100 hover:bg-blue-50'}`} aria-label="تعديل الطلب">
                                                            <Edit size={20} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {userPermissions.includes('DELETE_ORDERS') && o.productionStatus !== ProductionStatus.COMPLETED && (
                                                    <Tooltip content="حذف الطلب">
                                                        <button onClick={() => handleClickDelete(o)} className="w-10 h-10 flex items-center justify-center text-red-500 bg-white border border-gray-100 rounded-xl hover:bg-red-50 shadow-sm transition-all" aria-label="حذف الطلب">
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <PaginationControl page={ordersPage} rowsPerPage={ordersRowsPerPage} setPage={setOrdersPage} setRowsPerPage={setOrdersRowsPerPage} totalItems={filteredOrders.length} />
            </div>

            {/* --- PRICING ERROR MODAL --- */}
            {showPricingErrorModal && (
                <div className="fixed inset-0 bg-red-900/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border-2 border-red-100 p-6 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <AlertCircle size={40} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">مطلوب تسعير الطلب</h3>
                        <p className="text-gray-500 font-bold leading-relaxed mb-8">
                            يحتوي هذا الطلب على بنود خاصة غير مسعرة. <br />
                            لا يمكن ترحيل الطلب للإنتاج قبل تحديد سعر للوحدات الخاصة.
                        </p>
                        <Button onClick={() => setShowPricingErrorModal(false)} className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-lg shadow-lg">
                            فهمت ذلك
                        </Button>
                    </div>
                </div>
            )}

            {/* --- DELETE ERROR MODAL --- */}
            {deleteAttemptOrder && (
                <div className="fixed inset-0 bg-red-900/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border-2 border-red-100 p-6 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <LockKeyhole size={40} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">لا يمكن حذف الطلب</h3>
                        <p className="text-gray-500 font-bold leading-relaxed mb-8">
                            هذا الطلب موجود حالياً في خط الإنتاج. <br />
                            حالة الطلب: <span className="text-[#0e3c63] font-black">{ProductionStatusLabels[deleteAttemptOrder.productionStatus]}</span>
                            <br />
                            لحماية السجلات، يرجى إخراج الطلب من قائمة الإنتاج أولاً إذا كنت تريد حذفه.
                        </p>
                        <Button onClick={() => setDeleteAttemptOrder(null)} className="w-full h-14 bg-gray-800 hover:bg-gray-900 text-white rounded-2xl font-black text-lg shadow-lg">
                            حسناً
                        </Button>
                    </div>
                </div>
            )}

            {/* --- EDIT ORDER MODAL --- */}
            {editingOrder && (
                <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[300] flex items-center justify-center p-4 !mt-0">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white/20">
                        <div className="p-6 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl shadow-inner">{editingOrder.productionStatus === ProductionStatus.COMPLETED ? <LockKeyhole size={24} /> : <Edit size={24} />}</div>
                                <div>
                                    <h3 className="font-black text-xl flex items-center gap-2">{editingOrder.productionStatus === ProductionStatus.COMPLETED ? 'تسوية مالية لطلب جاهز' : 'تعديل ومراجعة الطلب المالي'} <span className="font-mono text-blue-200">#{editingOrder.id}</span></h3>
                                    <p className="text-[10px] font-bold text-blue-300 opacity-80 uppercase tracking-widest">وكيل: {editingOrder.agentName}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingOrder(null)} className="bg-white/10 hover:bg-red-500 p-3 rounded-2xl transition-all shadow-inner"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/30">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                <div className="lg:col-span-8 space-y-6">
                                    {editingOrderItems.some(i => i.isSpecialRequest) && (
                                        <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-4 rounded-[1.5rem] flex items-center gap-4 animate-pulse">
                                            <Sparkles size={24} className="text-amber-500 fill-amber-500" />
                                            <div>
                                                <h4 className="font-black text-amber-900 text-sm">تنبيه: تحتوي القائمة على طلب خاص</h4>
                                                <p className="text-amber-800 text-[10px] font-bold">يرجى تحديد السعر المناسب للوحدة الخاصة في الجدول أدناه.</p>
                                            </div>
                                        </div>
                                    )}

                                    {editingOrder.productionStatus !== ProductionStatus.COMPLETED && (
                                        <div className="bg-white p-6 rounded-[2rem] border border-blue-100 shadow-md space-y-5">
                                            <h4 className="font-black text-base text-gray-800 flex items-center gap-3 border-b pb-4"><Plus size={20} className="text-[#0e3c63]" /> إضافة مواد للطلب</h4>
                                            <div className="flex gap-3">
                                                <div className="grid grid-cols-2 gap-3 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 flex-1">
                                                    <button onClick={() => setEditSearchType('STYROFOAM')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${editSearchType === 'STYROFOAM' ? 'bg-white text-[#0e3c63]' : 'text-gray-400'}`}><Box size={16} /> فلين</button>
                                                    <button onClick={() => setEditSearchType('ADHESIVE')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${editSearchType === 'ADHESIVE' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-400'}`}><Layers size={16} /> لاصق</button>
                                                </div>
                                                <button onClick={() => setEditSpecialModal(true)} className="px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg gap-1 transition-all active:scale-95">
                                                    <Sparkles size={18} />
                                                    طلب خاص
                                                </button>
                                            </div>
                                            <div className="relative"><input className="w-full h-14 pl-12 pr-6 bg-white border-2 border-gray-100 rounded-2xl text-base font-black focus:border-[#0e3c63] outline-none transition-all shadow-inner" placeholder="بحث بكود المنتج..." value={editSearch} onChange={e => setEditSearch(e.target.value)} /><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={22} /></div>
                                            {editSearch.trim() !== '' && (
                                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-1.5 py-2">
                                                    {productsForEdit.map(p => (
                                                        <button key={p.id} onClick={() => addProductToEditOrder(p)} className="w-full p-4 bg-white hover:bg-blue-50 border-2 border-gray-50 rounded-2xl flex justify-between items-center transition-all group shadow-sm">
                                                            <div className="flex flex-col text-right"><span className="font-mono font-black text-gray-700 text-lg">{p.code}</span><span className="text-[10px] text-gray-400 font-bold">{p.dimensions}</span></div>
                                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><Plus size={18} /></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mr-2">المواد في القائمة الحالية</h4>
                                        {editingOrderItems.map((item, idx) => {
                                            const isDataLocked = editingOrder.productionStatus === ProductionStatus.COMPLETED;
                                            const isAdhesiveItem = products.find((p: any) => p.id === item.productId)
                                                ? db.categories.find((c: any) => c.name === products.find((p: any) => p.id === item.productId).category)?.type === 'ADHESIVE'
                                                : false;
                                            return (
                                                <div key={idx} className={`bg-white p-5 rounded-[1.8rem] border flex flex-col md:flex-row justify-between items-center shadow-sm gap-4 group transition-all ${isDataLocked ? 'border-gray-50 bg-gray-50/20 grayscale' : 'border-gray-100 hover:border-blue-100'} ${item.isSpecialRequest ? 'bg-amber-50 border-amber-200' : ''}`}>
                                                    <div className="flex-1 text-right flex items-center gap-4 min-w-0">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-gray-300 transition-all shrink-0 ${item.isSpecialRequest ? 'bg-amber-100 text-amber-500' : (isDataLocked ? 'bg-gray-100' : 'bg-gray-50 group-hover:bg-[#0e3c63] group-hover:text-white')}`}>
                                                            {item.isSpecialRequest ? <Sparkles size={24} className="fill-current" /> : <Package size={24} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="font-black text-[#0e3c63] block font-mono text-lg truncate">{item.productCode}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase block truncate">{item.isSpecialRequest ? 'وحدة إنتاج خاصة' : item.productDimensions}</span>
                                                            {item.isSpecialRequest && <p className="text-[10px] text-amber-700 font-bold mt-1 bg-white/50 px-2 py-1 rounded w-fit break-words whitespace-normal line-clamp-2">"{item.specialRequestNote}"</p>}
                                                        </div>
                                                    </div>

                                                    <div className={`flex gap-3 items-center w-full md:w-auto p-2 rounded-2xl border ${item.isSpecialRequest ? 'bg-white border-amber-100 shadow-sm' : 'bg-gray-50/50 border-gray-100'}`}>
                                                        <div className="flex items-center gap-2">

                                                            {/* Cartons Qty */}
                                                            <div className="text-center px-1">
                                                                <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">
                                                                    {item.isSpecialRequest ? 'الكمية' : (isAdhesiveItem ? 'كيس' : 'كارتون')}
                                                                </label>
                                                                {isDataLocked ? <div className="w-14 p-2 bg-white border border-gray-100 rounded-xl text-center font-black text-lg text-gray-400 shadow-inner">{item.quantityCartons}</div> : <input type="number" min="0" className="w-20 p-2 bg-white border border-gray-200 rounded-xl text-center font-black text-lg focus:border-[#0e3c63] outline-none" value={item.quantityCartons} onChange={(e) => { const n = [...editingOrderItems]; n[idx].quantityCartons = Math.max(0, Number(e.target.value)); n[idx].totalPrice = (n[idx].quantityCartons * n[idx].unitPriceCarton) + (n[idx].quantityMeters * (n[idx].unitPriceMeter || 0)); setEditingOrderItems(n); }} />}
                                                            </div>

                                                            {/* Price - Unit/Carton */}
                                                            <div className="text-center px-1 border-r border-gray-200">
                                                                <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">السعر</label>
                                                                {item.isSpecialRequest && !isDataLocked ? (
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            className="w-24 p-2 bg-white border-2 border-amber-200 rounded-xl text-center font-black text-lg text-amber-700 focus:border-amber-500 outline-none shadow-sm"
                                                                            value={item.unitPriceCarton}
                                                                            onChange={(e) => {
                                                                                const n = [...editingOrderItems];
                                                                                n[idx].unitPriceCarton = Math.max(0, Number(e.target.value));
                                                                                n[idx].quantityMeters = 0;
                                                                                n[idx].totalPrice = (n[idx].quantityCartons * n[idx].unitPriceCarton);
                                                                                setEditingOrderItems(n);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-10 flex items-center justify-center font-mono font-black text-lg text-gray-600 pt-1">${item.unitPriceCarton}</div>
                                                                )}
                                                            </div>

                                                            {/* Meters Logic - Only for Normal Items */}
                                                            {!item.isSpecialRequest && item.unitPriceMeter > 0 && (
                                                                <>
                                                                    <div className="text-center px-1 border-r border-gray-200">
                                                                        <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">أمتار</label>
                                                                        {isDataLocked ? <div className="w-14 p-2 bg-white border border-gray-100 rounded-xl text-center font-black text-lg text-gray-400 shadow-inner">{item.quantityMeters}</div> : <input type="number" min="0" className="w-20 p-2 bg-white border border-gray-200 rounded-xl text-center font-black text-lg focus:border-[#0e3c63] outline-none" value={item.quantityMeters} onChange={(e) => { const n = [...editingOrderItems]; n[idx].quantityMeters = Math.max(0, Number(e.target.value)); n[idx].totalPrice = (n[idx].quantityCartons * n[idx].unitPriceCarton) + (n[idx].quantityMeters * n[idx].unitPriceMeter); setEditingOrderItems(n); }} />}
                                                                    </div>

                                                                    <div className="text-center px-1 border-r border-gray-200">
                                                                        <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">سعر المتر</label>
                                                                        <div className="h-10 flex items-center justify-center font-mono font-black text-lg text-gray-600">${item.unitPriceMeter}</div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="w-px h-10 bg-gray-200"></div>
                                                        <div className="text-left min-w-[80px]">
                                                            <span className="text-[9px] text-gray-400 block font-black uppercase">الإجمالي</span>
                                                            <span className="font-mono font-black text-xl text-emerald-600">${(item.totalPrice || 0).toLocaleString()}</span>
                                                        </div>
                                                        {!isDataLocked && <button onClick={() => setEditingOrderItems(prev => prev.filter((_, i) => i !== idx))} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="lg:col-span-4 space-y-6"><div className="bg-[#0e3c63] rounded-[2.5rem] p-8 text-white shadow-2xl sticky top-0 border-b-8 border-blue-400"><div className="flex items-center gap-3 mb-8"><div className="p-3 bg-white/10 rounded-2xl"><Banknote size={24} /></div><h4 className="font-black text-lg">الموقف المالي النهائي</h4></div><div className="space-y-6"><div className="bg-white/5 p-4 rounded-2xl border border-white/10"><p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">المجموع قبل الخصم</p><h2 className="text-3xl font-black font-mono text-white opacity-60">${currentSubtotal.toLocaleString()}</h2></div><div className={`space-y-4 p-5 rounded-3xl border relative overflow-hidden transition-all ${editingOrder.productionStatus === ProductionStatus.COMPLETED ? 'bg-gray-900/20 border-white/5 opacity-50' : 'bg-white/5 border-white/10'}`}><div className="absolute top-0 right-0 p-2 opacity-10"><Tag size={40} /></div><label className="block text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-2"><Percent size={14} /> نظام خصم القائمة</label><div className="flex gap-2"><div className="flex-1 relative"><input disabled={editingOrder.productionStatus === ProductionStatus.COMPLETED} type="number" value={discountValue} onChange={e => setDiscountValue(Math.max(0, Number(e.target.value)))} className="w-full h-12 bg-white/10 border border-white/10 rounded-xl px-4 font-black font-mono text-white outline-none focus:bg-white/20 disabled:cursor-not-allowed" placeholder="0" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-black">{discountType === 'PERCENT' ? '%' : '$'}</span></div><div className="flex bg-white/5 rounded-xl p-1 border border-white/10"><button type="button" disabled={editingOrder.productionStatus === ProductionStatus.COMPLETED} onClick={() => setDiscountType('FIXED')} className={`px-3 rounded-lg text-[10px] font-black transition-all ${discountType === 'FIXED' ? 'bg-white text-[#0e3c63]' : 'text-blue-200'}`}>مبلغ</button><button type="button" disabled={editingOrder.productionStatus === ProductionStatus.COMPLETED} onClick={() => setDiscountType('PERCENT')} className={`px-3 rounded-lg text-[10px] font-black transition-all ${discountType === 'PERCENT' ? 'bg-white text-[#0e3c63]' : 'text-blue-200'}`}>%</button></div></div></div><div className="bg-emerald-400/10 p-5 rounded-2xl border border-emerald-400/20 text-center"><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">الصافي النهائي للمطالبة</p><h2 className="text-4xl font-black font-mono text-emerald-400 tracking-tighter">${currentFinalTotal.toLocaleString()}</h2></div><div className="space-y-3 pt-4 border-t border-white/10"><label className="block text-xs font-black text-blue-200 uppercase mr-1">إضافة تسديد (واصل جديد)</label><div className="relative"><input type="number" value={newPaymentAddition || ''} onChange={(e) => { const val = Number(e.target.value); const remainingDebt = Math.max(0, currentFinalTotal - editingOrder.paidAmount); const safeVal = Math.max(0, Math.min(val, remainingDebt)); setNewPaymentAddition(e.target.value === '' ? 0 : safeVal); }} className="w-full h-16 bg-white rounded-2xl text-center text-3xl font-black font-mono text-[#0e3c63] focus:ring-4 focus:ring-blue-400/20 outline-none" placeholder="0" /><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black">$</span></div><div className="flex justify-between items-center text-[10px] text-blue-300 font-bold px-1"><span>واصل سابق: ${editingOrder.paidAmount.toLocaleString()}</span><span className="bg-blue-400/20 px-2 py-0.5 rounded">سيصبح: ${(editingOrder.paidAmount + newPaymentAddition).toLocaleString()}</span></div></div><div className="bg-red-900/30 p-4 rounded-2xl border border-red-500/20"><div className="flex justify-between items-center text-xs"><span className="text-red-200 font-bold">المتبقي (الدين)</span><span className="font-mono font-black text-red-300 text-lg">${Math.max(0, currentFinalTotal - (editingOrder.paidAmount + newPaymentAddition)).toLocaleString()}</span></div></div><Button onClick={handleSaveOrderChanges} className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-black rounded-2xl shadow-xl transition-all group flex items-center justify-center gap-3"><Save size={22} /> حفظ وإرسال التحديث</Button></div></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MANUAL ORDER MODAL --- */}
            {manualOrderModal && (
                <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[300] flex items-center justify-center p-4 !mt-0">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white/20">
                        <div className="p-6 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl shadow-inner"><Plus size={24} /></div>
                                <div>
                                    <h3 className="font-black text-xl">إنشاء طلب يدوي جديد</h3>
                                    <p className="text-blue-200 text-[10px] font-bold opacity-70 uppercase tracking-widest">Manual Order Entry</p>
                                </div>
                            </div>
                            <button onClick={() => { setManualOrderModal(false); setManualOrderItems([]); setManualOrderAgentId('ALL'); }} className="bg-white/10 hover:bg-red-500 p-3 rounded-2xl transition-all shadow-inner"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/30">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                <div className="lg:col-span-8 space-y-6">
                                    {/* Agent Selection */}
                                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">تحديد الوكيل (العميل)</h4>
                                        <UserSelector users={agents} selectedUserId={manualOrderAgentId} onChange={(id) => { setManualOrderAgentId(id); setManualOrderItems([]); }} placeholder="ابحث واختر الوكيل..." />
                                    </div>

                                    {/* Product Adder */}
                                    <div className={`bg-white p-6 rounded-[2rem] border border-blue-100 shadow-md space-y-5 transition-all ${manualOrderAgentId === 'ALL' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                        <h4 className="font-black text-base text-gray-800 flex items-center gap-3 border-b pb-4"><Plus size={20} className="text-[#0e3c63]" /> إضافة مواد للسلة</h4>
                                        <div className="flex gap-3">
                                            <div className="grid grid-cols-2 gap-3 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 flex-1">
                                                <button onClick={() => setManualOrderSearchType('STYROFOAM')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${manualOrderSearchType === 'STYROFOAM' ? 'bg-white text-[#0e3c63] shadow-sm' : 'text-gray-400'}`}><Box size={16} /> فلين</button>
                                                <button onClick={() => setManualOrderSearchType('ADHESIVE')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${manualOrderSearchType === 'ADHESIVE' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}><Layers size={16} /> لاصق</button>
                                            </div>
                                            <button onClick={() => setManualSpecialModal(true)} className="px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg gap-1 transition-all active:scale-95">
                                                <Sparkles size={18} />
                                                طلب خاص
                                            </button>
                                        </div>
                                        <div className="relative"><input className="w-full h-14 pl-12 pr-6 bg-white border-2 border-gray-100 rounded-2xl text-base font-black focus:border-[#0e3c63] outline-none transition-all shadow-inner" placeholder="بحث بكود المنتج..." value={manualOrderSearch} onChange={e => setManualOrderSearch(e.target.value)} /><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={22} /></div>
                                        {manualOrderSearch.trim() !== '' && (
                                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-1.5 py-2">
                                                {productsForManual.map((p: any) => (
                                                    <button key={p.id} onClick={() => addProductToManualOrder(p)} className="w-full p-4 bg-white hover:bg-blue-50 border-2 border-gray-50 rounded-2xl flex justify-between items-center transition-all group shadow-sm">
                                                        <div className="flex flex-col text-right"><span className="font-mono font-black text-gray-700 text-lg">{p.code}</span><span className="text-[10px] text-gray-400 font-bold">{p.dimensions}</span></div>
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><Plus size={18} /></div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Items Table */}
                                    <div className="space-y-3">
                                        <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mr-2">محتويات الطلب</h4>
                                        {manualOrderItems.length === 0 ? (
                                            <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-bold">السلة فارغة، يرجى إضافة منتجات</div>
                                        ) : (
                                            manualOrderItems.map((item, idx) => {
                                                const product = products.find((p: any) => p.id === item.productId);
                                                const isAdhesive = product ? db.categories.find((c: any) => c.name === product.category)?.type === 'ADHESIVE' : false;
                                                return (
                                                    <div key={idx} className={`bg-white p-4 rounded-[1.5rem] border flex flex-col md:flex-row justify-between items-center shadow-sm gap-4 transition-all ${item.isSpecialRequest ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 hover:border-blue-200'}`}>
                                                        <div className="flex-1 text-right flex items-center gap-4 min-w-0 w-full md:w-auto">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.isSpecialRequest ? 'bg-amber-100 text-amber-500' : 'bg-gray-50 text-gray-400'}`}>
                                                                {item.isSpecialRequest ? <Sparkles size={24} /> : <Package size={24} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="font-black text-[#0e3c63] block font-mono text-lg truncate">{item.productCode}</span>
                                                                <span className="text-[11px] text-gray-400 font-bold uppercase block truncate">{item.isSpecialRequest ? 'وحدة إنتاج خاصة' : item.productDimensions}</span>
                                                                {item.isSpecialRequest && <p className="text-[10px] text-amber-700 font-bold mt-1 bg-white/50 px-2 py-1 rounded w-fit break-words whitespace-normal line-clamp-2">"{item.specialRequestNote}"</p>}
                                                            </div>
                                                        </div>

                                                        <div className={`flex flex-wrap md:flex-nowrap justify-center gap-2 items-center w-full md:w-auto p-2 rounded-2xl border ${item.isSpecialRequest ? 'bg-white border-amber-100 shadow-sm' : 'bg-gray-50/50 border-gray-100'}`}>
                                                            <div className="text-center px-2">
                                                                <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">{isAdhesive ? 'أكياس' : 'كارتون'}</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="w-24 h-10 bg-white border border-gray-200 rounded-xl text-center font-black text-lg focus:border-[#0e3c63] outline-none shadow-sm"
                                                                    value={item.quantityCartons}
                                                                    onChange={(e) => {
                                                                        const val = Math.max(0, Number(e.target.value));
                                                                        const n = [...manualOrderItems];
                                                                        n[idx].quantityCartons = val;
                                                                        n[idx].totalPrice = (val * n[idx].unitPriceCarton) + (n[idx].quantityMeters * (n[idx].unitPriceMeter || 0));
                                                                        setManualOrderItems(n);
                                                                    }}
                                                                />
                                                            </div>

                                                            {!isAdhesive && !item.isSpecialRequest && (
                                                                <div className="text-center px-2 border-r border-gray-200">
                                                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">أمتار</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        className="w-24 h-10 bg-white border border-gray-200 rounded-xl text-center font-black text-lg focus:border-[#0e3c63] outline-none shadow-sm"
                                                                        value={item.quantityMeters}
                                                                        onChange={(e) => {
                                                                            const val = Math.max(0, Number(e.target.value));
                                                                            const n = [...manualOrderItems];
                                                                            n[idx].quantityMeters = val;
                                                                            n[idx].totalPrice = (n[idx].quantityCartons * n[idx].unitPriceCarton) + (val * n[idx].unitPriceMeter || 0);
                                                                            setManualOrderItems(n);
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="text-center px-2 border-r border-gray-200">
                                                                <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">{!isAdhesive && !item.isSpecialRequest ? 'سعر الكارتون' : 'السعر'}</label>
                                                                {item.isSpecialRequest ? (
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        className="w-28 h-10 bg-white border-2 border-amber-200 rounded-xl text-center font-black text-lg text-amber-700 focus:border-amber-500 outline-none shadow-sm"
                                                                        value={item.unitPriceCarton}
                                                                        onChange={(e) => {
                                                                            const val = Math.max(0, Number(e.target.value));
                                                                            const n = [...manualOrderItems];
                                                                            n[idx].unitPriceCarton = val;
                                                                            if (item.isSpecialRequest) n[idx].quantityMeters = 0;
                                                                            n[idx].totalPrice = (n[idx].quantityCartons * val) + (n[idx].quantityMeters * (n[idx].unitPriceMeter || 0));
                                                                            setManualOrderItems(n);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-10 flex items-center justify-center font-mono font-black text-lg text-gray-600 pt-1">${item.unitPriceCarton}</div>
                                                                )}
                                                            </div>

                                                            {!isAdhesive && !item.isSpecialRequest && (
                                                                <div className="text-center px-2 border-r border-gray-200 hidden sm:block">
                                                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">سعر المتر</label>
                                                                    <div className="h-10 flex items-center justify-center font-mono font-black text-lg text-gray-600">${item.unitPriceMeter}</div>
                                                                </div>
                                                            )}

                                                            <div className="w-px h-10 bg-gray-200 hidden md:block"></div>
                                                            <div className="text-left min-w-[80px] px-2">
                                                                <span className="text-[9px] text-gray-400 block font-black uppercase">الإجمالي</span>
                                                                <span className="font-mono font-black text-xl text-emerald-600">${item.totalPrice.toLocaleString()}</span>
                                                            </div>
                                                            <button onClick={() => setManualOrderItems(prev => prev.filter((_, i) => i !== idx))} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-[#0e3c63] rounded-[2.5rem] p-8 text-white shadow-2xl sticky top-0 border-b-8 border-blue-400">
                                        <div className="flex items-center gap-3 mb-8"><div className="p-3 bg-white/10 rounded-2xl"><Banknote size={24} /></div><h4 className="font-black text-lg">الموقف المالي</h4></div>
                                        <div className="space-y-6">
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10"><p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">المجموع قبل الخصم</p><h2 className="text-3xl font-black font-mono text-white opacity-60">${manualSubtotal.toLocaleString()}</h2></div>
                                            <div className="space-y-4 p-5 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden"><div className="absolute top-0 right-0 p-2 opacity-10"><Tag size={40} /></div><label className="block text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-2"><Percent size={14} /> خصم إضافي</label><div className="flex gap-2"><div className="flex-1 relative"><input type="number" value={manualDiscount} onChange={e => setManualDiscount(Math.max(0, Number(e.target.value)))} className="w-full h-12 bg-white/10 border border-white/10 rounded-xl px-4 font-black font-mono text-white outline-none focus:bg-white/20" placeholder="0" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-black">{manualDiscountType === 'PERCENT' ? '%' : '$'}</span></div><div className="flex bg-white/5 rounded-xl p-1 border border-white/10"><button type="button" onClick={() => setManualDiscountType('FIXED')} className={`px-3 rounded-lg text-[10px] font-black transition-all ${manualDiscountType === 'FIXED' ? 'bg-white text-[#0e3c63]' : 'text-blue-200'}`}>مبلغ</button><button type="button" onClick={() => setManualDiscountType('PERCENT')} className={`px-3 rounded-lg text-[10px] font-black transition-all ${manualDiscountType === 'PERCENT' ? 'bg-white text-[#0e3c63]' : 'text-blue-200'}`}>%</button></div></div></div>
                                            <div className="bg-emerald-400/10 p-5 rounded-2xl border border-emerald-400/20 text-center"><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">الصافي النهائي</p><h2 className="text-4xl font-black font-mono text-emerald-400 tracking-tighter">${manualFinalTotal.toLocaleString()}</h2></div>
                                            <div className="space-y-3 pt-4 border-t border-white/10"><label className="block text-xs font-black text-blue-200 uppercase mr-1">المبلغ الواصل (المدفوع)</label><div className="relative"><input type="number" value={manualOrderPaid} onChange={(e) => setManualOrderPaid(e.target.value)} className="w-full h-16 bg-white rounded-2xl text-center text-3xl font-black font-mono text-[#0e3c63] focus:ring-4 focus:ring-blue-400/20 outline-none" placeholder="0" /><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black">$</span></div></div>
                                            <div className="bg-red-900/30 p-4 rounded-2xl border border-red-500/20"><div className="flex justify-between items-center text-xs"><span className="text-red-200 font-bold">المتبقي (الدين)</span><span className="font-mono font-black text-red-300 text-lg">${Math.max(0, manualFinalTotal - Number(manualOrderPaid)).toLocaleString()}</span></div></div>
                                            <Button onClick={handleCreateManualOrder} className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-black rounded-2xl shadow-xl transition-all group flex items-center justify-center gap-3"><Save size={22} /> إنشاء الطلب</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MANUAL SPECIAL REQUEST REPEATER MODAL --- */}
            {manualSpecialModal && (
                <div className="fixed inset-0 bg-[#0e3c63]/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto !mt-0">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border-t-[10px] border-amber-500 my-8">
                        <div className="p-8 pb-4 text-center">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-800">إضافة طلبات خاصة (يدوي)</h3>
                            <p className="text-sm text-gray-400 font-bold mt-1">تسجيل منتجات بمواصفات مخصصة دفعة واحدة</p>
                        </div>
                        <div className="px-8 pb-8 space-y-6">
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
                                {manualSpecialItems.map((item, idx) => (
                                    <div key={item.id} className="p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl space-y-4 relative">
                                        <div className="flex justify-between items-center">
                                            <Badge color="yellow">طلب خاص #{idx + 1}</Badge>
                                            <button onClick={() => removeSpecialRow(setManualSpecialItems, item.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">وصف الطلب</label>
                                            <textarea
                                                className="w-full h-24 bg-white border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none focus:border-amber-500 transition-all text-gray-700 text-sm"
                                                placeholder="وصف المنتج..."
                                                value={item.note}
                                                onChange={e => updateSpecialRow(setManualSpecialItems, item.id, 'note', e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الكمية</label>
                                                <input type="number" className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-black text-lg outline-none focus:border-amber-500" value={item.qty} onChange={e => updateSpecialRow(setManualSpecialItems, item.id, 'qty', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">السعر ($)</label>
                                                <input type="number" className="w-full h-12 bg-white border-2 border-amber-200 rounded-xl px-4 font-black text-lg text-amber-700 outline-none focus:border-amber-500" value={item.price} onChange={e => updateSpecialRow(setManualSpecialItems, item.id, 'price', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => addSpecialRow(setManualSpecialItems)} className="w-full py-4 border-2 border-dashed border-amber-200 rounded-2xl text-amber-600 font-black text-sm flex items-center justify-center gap-2 hover:bg-amber-50 transition-all"><Plus size={18} /> إضافة طلب خاص آخر</button>

                            <div className="flex gap-3 pt-2">
                                <Button onClick={handleConfirmManualSpecials} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-16 rounded-2xl font-black shadow-lg">إضافة للقائمة</Button>
                                <button onClick={() => { setManualSpecialModal(false); setManualSpecialItems([{ id: Math.random().toString(), note: '', qty: '0', price: '0' }]); }} className="px-8 h-16 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- EDIT SPECIAL REQUEST REPEATER MODAL --- */}
            {productionConfirmationOrder && (
                <ProductionConfirmationModal
                    order={productionConfirmationOrder}
                    onClose={() => setProductionConfirmationOrder(null)}
                    onConfirm={handleConfirmProductionMove}
                />
            )}
            {editSpecialModal && (
                <div className="fixed inset-0 bg-[#0e3c63]/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto !mt-0">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border-t-[10px] border-amber-500 my-8">
                        <div className="p-8 pb-4 text-center">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-800">تعديل: إضافة طلبات خاصة</h3>
                            <p className="text-sm text-gray-400 font-bold mt-1">إضافة مواد خاصة للقائمة الحالية دفعة واحدة</p>
                        </div>
                        <div className="px-8 pb-8 space-y-6">
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
                                {editSpecialItems.map((item, idx) => (
                                    <div key={item.id} className="p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl space-y-4 relative">
                                        <div className="flex justify-between items-center">
                                            <Badge color="yellow">طلب خاص #{idx + 1}</Badge>
                                            <button onClick={() => removeSpecialRow(setEditSpecialItems, item.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">وصف الطلب</label>
                                            <textarea
                                                className="w-full h-24 bg-white border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none focus:border-amber-500 transition-all text-gray-700 text-sm"
                                                placeholder="وصف المنتج..."
                                                value={item.note}
                                                onChange={e => updateSpecialRow(setEditSpecialItems, item.id, 'note', e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الكمية</label>
                                                <input type="number" className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-black text-lg outline-none focus:border-amber-500" value={item.qty} onChange={e => updateSpecialRow(setEditSpecialItems, item.id, 'qty', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">السعر ($)</label>
                                                <input type="number" className="w-full h-12 bg-white border-2 border-amber-200 rounded-xl px-4 font-black text-lg text-amber-700 outline-none focus:border-amber-500" value={item.price} onChange={e => updateSpecialRow(setEditSpecialItems, item.id, 'price', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => addSpecialRow(setEditSpecialItems)} className="w-full py-4 border-2 border-dashed border-amber-200 rounded-2xl text-amber-600 font-black text-sm flex items-center justify-center gap-2 hover:bg-amber-50 transition-all"><Plus size={18} /> إضافة طلب خاص آخر</button>

                            <div className="flex gap-3 pt-2">
                                <Button onClick={handleConfirmEditSpecials} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-16 rounded-2xl font-black shadow-lg">إضافة للقائمة</Button>
                                <button onClick={() => { setEditSpecialModal(false); setEditSpecialItems([{ id: Math.random().toString(), note: '', qty: '0', price: '0' }]); }} className="px-8 h-16 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
