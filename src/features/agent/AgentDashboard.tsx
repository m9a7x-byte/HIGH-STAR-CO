import { snapshotProductUnits } from '../../lib/productFamilies';
import { getCatalogCartCounts } from '../../lib/productFamilies';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MobileBottomNavigation, AgentNavItem } from './components/MobileBottomNavigation';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, ListOrdered, FileText, Wallet, Lock, Snowflake, AlertCircle, Box, Layers, Sparkles, Info, Truck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/db';
import { UserRole, Order } from '../../types';
import { Button, Badge, UserAvatar } from '../../components/ui';
import { ShippingCalculator } from '../../components/shared/ShippingCalculator';
import { InvoiceModal } from '../../components/shared/InvoiceModal';
import { ADHESIVE_CATEGORY } from '../../lib/constants';
import { compareProductsAlphabetically } from '../../lib/productSort';
import { getAdjustedProductPrices } from '../../lib/pricing';

import { CatalogTab } from './tabs/CatalogTab';
import { HistoryTab } from './tabs/HistoryTab';
import { QueueTab } from './tabs/QueueTab';
import { FinanceTab } from './tabs/FinanceTab';
import { usePresence } from '../../hooks/usePresence';

type AgentCartEntry = {
    m: number;
    c: number;
    isSpecial?: boolean;
    specialNote?: string;
    productCode?: string;
    productDimensions?: string;
    unitPriceCarton?: number;
    unitPriceMeter?: number;
    priceAdjustmentNote?: string;
    paintColor?: string;
    productSaleMode?: 'CARTON' | 'PIECE';
    productMetersPerCarton?: number;
};

export const AgentDashboard = () => {
    const { user } = useAuth();
    const toast = useToast();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('catalog');
    const [mobileCartActive, setMobileCartActive] = useState(false);
    const cartPanelRef = useRef<HTMLDivElement>(null);

    // Internal Presence Tracking for Agent Tabs
    usePresence(activeTab);

    const [cart, setCart] = useState<Record<number, AgentCartEntry>>({});
    const [activeCat, setActiveCat] = useState('PAN');
    const [searchTerm, setSearchTerm] = useState('');
    const [targetVehicle, setTargetVehicle] = useState<'KIA' | 'CANTER' | 'TRAILER'>('KIA');

    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [editingAgentOrder, setEditingAgentOrder] = useState<Order | null>(null);
    const [lockedAgentEditOrderIds, setLockedAgentEditOrderIds] = useState<string[]>([]);

    const [products, setProducts] = useState(db.products);
    const [myOrders, setMyOrders] = useState(db.getOrders(user!.id, UserRole.AGENT));
    const [productionQueue, setProductionQueue] = useState(db.getProductionQueue());
    const [myTransactions, setMyTransactions] = useState(db.getTransactions(user!.id));
    const [userBalance, setUserBalance] = useState(user?.agentDetails?.currentBalance || 0);

    const isDebt = userBalance < 0;

    const [showQueueGlobal, setShowQueueGlobal] = useState(db.vehicleConfig.showProductionQueueToAgents);
    const [maintenanceMode, setMaintenanceMode] = useState(db.vehicleConfig.maintenanceMode);
    const [maintenanceMessage, setMaintenanceMessage] = useState(db.vehicleConfig.maintenanceMessage);

    const [latestUser, setLatestUser] = useState(user);
    const effectiveUser = latestUser || user;
    const agentPriceIncreasePercent = effectiveUser?.agentDetails?.priceIncreasePercent || 0;

    useEffect(() => {
        if (user) setLatestUser(user);
    }, [user]);

    const refreshData = useCallback(() => {
        const locallyLockedIds = new Set(lockedAgentEditOrderIds);
        const agentOrders = db.getOrders(user!.id, UserRole.AGENT);
        const remainingLockedIds = lockedAgentEditOrderIds.filter(orderId => {
            const order = agentOrders.find(o => String(o.id) === orderId);
            return order?.agentEditUnlocked === true;
        });

        setProducts([...db.products]);
        setMyOrders(agentOrders.map(order =>
            locallyLockedIds.has(String(order.id)) ? { ...order, agentEditUnlocked: false } : order
        ));
        if (remainingLockedIds.length !== lockedAgentEditOrderIds.length) {
            setLockedAgentEditOrderIds(remainingLockedIds);
        }
        setProductionQueue(db.getProductionQueue());
        setMyTransactions(db.getTransactions(user!.id));

        const updatedUser = db.users.find(u => u.id === user!.id);
        if (updatedUser) {
            setLatestUser({ ...updatedUser }); // Update local user state
            if (updatedUser.agentDetails) {
                setUserBalance(updatedUser.agentDetails.currentBalance);
            }
        }

        setShowQueueGlobal(db.vehicleConfig.showProductionQueueToAgents);
        setMaintenanceMode(db.vehicleConfig.maintenanceMode);
        setMaintenanceMessage(db.vehicleConfig.maintenanceMessage);
    }, [user, lockedAgentEditOrderIds]);

    useEffect(() => {
        refreshData();
        const unsubscribe = db.subscribe(refreshData);
        return () => unsubscribe();
    }, [refreshData]);

    // Detect new notifications and show toast + browser notification
    useEffect(() => {
        const newNotifs = db.consumeNewNotifications();
        if (newNotifs.length > 0) {
            newNotifs.forEach(notif => {
                // Translate notification title for toast
                let toastTitle = notif.title;
                if (notif.title === 'تحديث حالة الطلب') toastTitle = t('notifications.status_update_title', 'تحديث حالة الطلب');
                else if (notif.title === 'قيد التحضير') toastTitle = t('notifications.in_production', 'قيد التحضير');
                else if (notif.title === 'تم التجهيز') toastTitle = t('notifications.completed', 'تم التجهيز');
                else if (notif.title === 'ينتظر دفع') toastTitle = t('notifications.pending_payment', 'ينتظر دفع');

                // Translate message
                let toastMsg = notif.message;
                const statusMatch = notif.message.match(/تم تغيير حالة طلبك #(\d+) إلى: (.+)/);
                if (statusMatch) {
                    const statusArabic = statusMatch[2].trim();
                    let trStatus = statusArabic;
                    if (statusArabic === 'قيد الانتظار') trStatus = t('production.waiting', statusArabic);
                    else if (statusArabic === 'جاري التحضير') trStatus = t('production.processing', statusArabic);
                    else if (statusArabic === 'تم التجهيز') trStatus = t('notifications.completed', statusArabic);
                    else if (statusArabic === 'ينتظر دفع') trStatus = t('notifications.pending_payment', statusArabic);
                    toastMsg = t('notifications.status_change_msg', { orderId: statusMatch[1], status: trStatus, defaultValue: notif.message });
                }

                // Show in-app toast
                if (notif.type === 'success') {
                    toast.success(toastTitle, toastMsg);
                } else {
                    toast.info(toastTitle, toastMsg);
                }

                // Show browser/OS notification (desktop + mobile PWA)
                try {
                    if ('Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification(toastTitle, { body: toastMsg, icon: '/voga-logo.png', tag: notif.id });
                        } else if (Notification.permission !== 'denied') {
                            Notification.requestPermission().then(perm => {
                                if (perm === 'granted') {
                                    new Notification(toastTitle, { body: toastMsg, icon: '/voga-logo.png', tag: notif.id });
                                }
                            });
                        }
                    }
                } catch (e) { console.warn('Browser notification failed:', e); }
            });
        }
    });

    useEffect(() => {
        if (activeTab !== 'catalog') {
            setActiveCat('PAN');
            setSearchTerm('');
        }
    }, [activeTab]);

    const hasSpecialInCart = useMemo(() => {
        return Object.keys(cart).some(key => Number(key) < 0);
    }, [cart]);

    const cartStats = useMemo(() => {
        return getCatalogCartCounts(cart, products, db.categories);
    }, [cart, products]);
    const cartItemCount = (Object.values(cart) as AgentCartEntry[]).filter(item => item.c > 0 || item.m > 0).length;

    const cartTotal = useMemo(() => {
        return Object.entries(cart).reduce((sum, [pid, qty]) => {
            const id = Number(pid);
            const qData = qty as any;

            // Special requests have 0 initial price until set by admin
            if (id < 0 || qData.isSpecial) return sum;

            const p = products.find(x => x.id === id);
            if (!p) return sum;
            const prices = getAdjustedProductPrices(p, effectiveUser?.agentDetails);
            const q = qty as { m: number, c: number };
            const previousUnits = qData.productSaleMode && qData.productSaleMode !== (p.saleMode ?? 'CARTON');
            return sum + ((q.c || 0) * (previousUnits ? qData.unitPriceCarton ?? 0 : prices.pricePerCarton)) + ((q.m || 0) * (previousUnits ? qData.unitPriceMeter ?? 0 : prices.pricePerMeter));
        }, 0);
    }, [cart, products, agentPriceIncreasePercent, effectiveUser?.agentDetails?.type]);

    const orderCanBeEditedByAgent = (order: Order) => {
        return !lockedAgentEditOrderIds.includes(String(order.id)) &&
            order.agentEditUnlocked === true &&
            (order.productionStatus === 'PENDING_TRANSFER' || order.productionStatus === 'PENDING_PAYMENT');
    };

    const buildCartItemsPayload = (includePricing = false) => {
        return Object.entries(cart).sort(([aId], [bId]) => {
            const aNumber = Number(aId);
            const bNumber = Number(bId);

            if (aNumber < 0 && bNumber < 0) return aNumber - bNumber;
            if (aNumber < 0) return 1;
            if (bNumber < 0) return -1;

            const aProduct = products.find(p => Number(p.id) === aNumber);
            const bProduct = products.find(p => Number(p.id) === bNumber);
            if (!aProduct || !bProduct) return aNumber - bNumber;

            return compareProductsAlphabetically(aProduct, bProduct);
        }).map(([pid, qty]) => {
            const id = Number(pid);
            const qData = qty as AgentCartEntry;

            if (id < 0 || qData.isSpecial) {
                return {
                    productId: id,
                    qMeters: 0,
                    qCartons: qData.c,
                    isSpecial: true,
                    isSpecialRequest: true,
                    specialNote: qData.specialNote,
                    specialRequestNote: qData.specialNote,
                    productCode: qData.productCode || 'طلب خاص (إنتاج)',
                    productDimensions: qData.productDimensions || 'حسب الطلب',
                    unitPriceCarton: qData.unitPriceCarton || 0,
                    unitPriceMeter: qData.unitPriceMeter || 0,
                    priceAdjustmentNote: qData.priceAdjustmentNote
                };
            }

            const product = products.find(p => Number(p.id) === id);
            const prices = getAdjustedProductPrices(product, effectiveUser?.agentDetails);
            const q = qty as AgentCartEntry;
            return {
                productId: id,
                qMeters: q.m || 0,
                qCartons: q.c || 0,
                paintColor: qData.paintColor,
                ...(includePricing ? {
                    productCode: product?.code,
                    ...snapshotProductUnits(product),
                    productSaleMode: qData.productSaleMode ?? product?.saleMode ?? 'CARTON',
                    productMetersPerCarton: qData.productMetersPerCarton ?? snapshotProductUnits(product).productMetersPerCarton,
                    productDimensions: product?.dimensions,
                    unitPriceCarton: qData.productSaleMode && qData.productSaleMode !== (product?.saleMode ?? 'CARTON') ? qData.unitPriceCarton ?? 0 : prices?.pricePerCarton || 0,
                    unitPriceMeter: qData.productSaleMode && qData.productSaleMode !== (product?.saleMode ?? 'CARTON') ? qData.unitPriceMeter ?? 0 : prices?.pricePerMeter || 0,
                    priceAdjustmentNote: prices.increasePercent > 0 ? `زيادة ${prices.increasePercent}%` : undefined
                } : {})
            };
        }).filter(i => i.qMeters > 0 || i.qCartons > 0 || i.isSpecial);
    };

    const handleStartEditOrder = (order: Order) => {
        if (!orderCanBeEditedByAgent(order)) {
            toast.error('التعديل غير متاح', 'هذا الطلب غير مفتوح للتعديل أو تم ترحيله للإنتاج.');
            return;
        }

        const nextCart: Record<number, AgentCartEntry> = {};
        order.items.forEach((item, index) => {
            const key = item.isSpecialRequest ? -(Date.now() + index) : Number(item.productId);
            nextCart[key] = {
                m: item.quantityMeters || 0,
                c: item.quantityCartons || 0,
                paintColor: item.paintColor,
                productSaleMode: item.productSaleMode,
                productMetersPerCarton: item.productMetersPerCarton,
                isSpecial: item.isSpecialRequest,
                specialNote: item.specialRequestNote,
                productCode: item.productCode,
                productDimensions: item.productDimensions,
                unitPriceCarton: item.unitPriceCarton,
                unitPriceMeter: item.unitPriceMeter,
                priceAdjustmentNote: item.priceAdjustmentNote
            };
        });

        setCart(nextCart);
        setEditingAgentOrder(order);
        setActiveTab('catalog');
        toast.info('تعديل الطلب مفتوح', `تقدر تعدل الطلب #${order.id} من السلة الحالية.`);
    };

    const cancelAgentOrderEdit = () => {
        setEditingAgentOrder(null);
        setCart({});
    };

    const handleOrderSubmit = async () => {
        if (maintenanceMode) {
            toast.error(t('agent_dashboard.sorry'), maintenanceMessage);
            return;
        }

        const paidVal = 0; // LEDGER SYSTEM: No payment at order time — charge at COMPLETED only.

        try {
            const items = buildCartItemsPayload(Boolean(editingAgentOrder));
            if (editingAgentOrder) {
                const editedOrderId = editingAgentOrder.id;
                await db.updateOrderByAgent(user!.id, editingAgentOrder.id, items);
                setLockedAgentEditOrderIds(prev => Array.from(new Set([...prev, String(editedOrderId)])));
                const refreshedOrders = db.getOrders(user!.id, UserRole.AGENT).map(order =>
                    order.id == editedOrderId ? { ...order, agentEditUnlocked: false } : order
                );
                setMyOrders(refreshedOrders);
                setEditingAgentOrder(null);
                toast.success('تم حفظ التعديل', 'انقفل تعديل الطلب تلقائياً بعد الحفظ.');
            } else {
                await db.createOrder(user!.id, items, paidVal);
                toast.success(t('agent_dashboard.order_sent'), t('agent_dashboard.order_sent_msg'));
            }
            setCart({});
            if (effectiveUser?.agentDetails?.permissions.showHistory) setActiveTab('history');
        } catch (e: any) {
            toast.error(t('agent_dashboard.order_send_failed'), e.message);
        }
    };

    if (latestUser?.agentDetails?.isFrozen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border-t-8 border-red-500">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><Snowflake size={48} className="text-red-500" /></div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">{t('agent_dashboard.account_frozen')}</h2>
                    <p className="text-gray-500 font-bold mb-6">{t('agent_dashboard.cannot_access')}</p>
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-sm text-red-700 font-medium mb-8">{latestUser.agentDetails.freezeMessage}</div>
                    <p className="text-xs text-gray-400">{t('agent_dashboard.contact_admin')}</p>
                </div>
            </div>
        );
    }

    const canShowQueue = showQueueGlobal && (effectiveUser?.agentDetails?.permissions.showProductionQueue ?? true);
    const canShowHistory = effectiveUser?.agentDetails?.permissions.showHistory ?? true;
    const canShowFinance = effectiveUser?.agentDetails?.permissions.showFinance ?? true;

    // Redirect if permission for active tab is revoked live
    useEffect(() => {
        if (activeTab === 'queue' && !canShowQueue) setActiveTab('catalog');
        if (activeTab === 'finance' && !canShowFinance) setActiveTab('catalog');
        if (activeTab === 'history' && !canShowHistory) setActiveTab('catalog');
    }, [activeTab, canShowQueue, canShowHistory, canShowFinance]);

    const navigateMobile = (item: AgentNavItem) => {
        setMobileCartActive(item === 'cart');
        setActiveTab(item === 'cart' ? 'catalog' : item);
        requestAnimationFrame(() => item === 'cart' ? cartPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : window.scrollTo({ top: 0, behavior: 'smooth' }));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
            {viewingOrder && <InvoiceModal order={viewingOrder} onClose={() => setViewingOrder(null)} allowPrint={true} />}

            <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 bg-[#0e3c63] text-white text-center">
                        <UserAvatar name={effectiveUser?.fullName || 'User'} avatarPath={effectiveUser?.avatar_path} avatarUrl={effectiveUser?.avatar_url} size="xl" className="mx-auto mb-4 border-4 border-white/30 shadow-lg" />
                        <h3 className="font-bold text-xl">{effectiveUser?.fullName}</h3>
                        <p className="text-sm opacity-80 mt-1">{effectiveUser?.agentDetails?.province} • {effectiveUser?.agentDetails?.type}</p>
                    </div>

                    {canShowFinance && (
                        <div className={`p-4 mx-4 -mt-6 mb-4 rounded-xl text-center shadow-lg relative z-10 border-2 ${!isDebt ? 'bg-white border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">{isDebt ? t('agent_dashboard.debt_balance') : t('agent_dashboard.credit_balance')}</p>
                            <p className="text-2xl font-mono font-black" dir="ltr">${Math.abs(userBalance).toLocaleString()}</p>
                        </div>
                    )}

                    <nav className="hidden lg:block p-4 space-y-2">

                        {[
                            { id: 'catalog', label: t('agent_dashboard.catalog_order'), icon: ShoppingCart },
                            { id: 'history', label: t('agent_dashboard.my_orders'), icon: FileText, hidden: !canShowHistory },
                            { id: 'queue', label: t('agent_dashboard.production_schedule'), icon: ListOrdered, hidden: !canShowQueue },
                            { id: 'finance', label: t('agent_dashboard.account_statement'), icon: Wallet, hidden: !canShowFinance },
                        ].filter(i => !i.hidden).map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-xl text-base font-bold transition-all ${activeTab === item.id ? 'bg-blue-50 text-[#0e3c63] shadow-inner' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}><item.icon size={20} /> {item.label}</button>
                        ))}
                    </nav>
                </div>

                {activeTab === 'catalog' && (
                    <div ref={cartPanelRef} className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 lg:sticky lg:top-24 scroll-mt-24">
                        {editingAgentOrder && (
                            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 flex flex-col gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest mb-1">تعديل طلب مفتوح</p>
                                    <p className="text-sm font-bold">أنت تعدل الطلب #{editingAgentOrder.id}. بعد الحفظ ينقفل التعديل تلقائياً.</p>
                                </div>
                                <button onClick={cancelAgentOrderEdit} className="h-10 px-3 rounded-xl bg-white/80 text-amber-700 border border-amber-100 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all font-black text-xs flex items-center justify-center gap-2">
                                    <X size={16} />
                                    إلغاء التعديل
                                </button>
                            </div>
                        )}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg"><ShoppingCart size={20} /> {t('agent_dashboard.cart')}</h3>
                            {maintenanceMode ? <Badge color="red">{t('common.stopped')}</Badge> : <span className="bg-red-500 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">{cartItemCount}</span>}
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-600"><Box size={16} /> {t('agent_dashboard.foam_cartons')}</div>
                                <span className="font-mono font-black text-lg">{cartStats.totalCartons.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-600"><Layers size={16} /> {t('agent_dashboard.adhesive_bags')}</div>
                                <span className="font-mono font-black text-lg">{cartStats.totalBags}</span>
                            </div>
                            {cartStats.totalBuckets > 0 && <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100"><span className="text-sm font-bold text-gray-600">أصباغ — سطلات</span><span className="font-mono font-black text-lg">{cartStats.totalBuckets}</span></div>}
                            {cartStats.totalPieces > 0 && <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100"><span className="text-sm font-bold text-gray-600">فلين — قطع</span><span className="font-mono font-black text-lg">{cartStats.totalPieces}</span></div>}
                            {hasSpecialInCart && (
                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-700 animate-pulse">
                                    <Sparkles size={14} className="shrink-0" />
                                    <span className="text-[10px] font-black uppercase">{t('agent_dashboard.special_order_pricing')}</span>
                                </div>
                            )}
                        </div>

                        <div className="text-3xl font-bold font-mono text-[#0e3c63] mb-6 text-center border-b pb-6 border-dashed border-gray-200">${cartTotal.toLocaleString()}</div>

                        {(() => {
                            const limitMultiplier = targetVehicle === 'KIA' ? Number(db.vehicleConfig.maxKiaVehicles || 1) : targetVehicle === 'CANTER' ? Number(db.vehicleConfig.maxCanterVehicles || 1) : Number(db.vehicleConfig.maxTrailerVehicles || 1);
                            const kiaCap = Number(db.vehicleConfig.kiaCapacity) || 140;
                            const canterCap = Number(db.vehicleConfig.canterCapacity) || 180;
                            const trailerCap = Number(db.vehicleConfig.trailerCapacity) || 240;
                            const currentTargetCap = targetVehicle === 'KIA' ? kiaCap : targetVehicle === 'CANTER' ? canterCap : trailerCap;
                            const maxAllowedCartons = currentTargetCap * limitMultiplier;
                            const isOverLimit = db.vehicleConfig.orderConstraintMode === 'LOCKED' && cartStats.totalCartons > maxAllowedCartons;

                            return (
                                <>
                                    <ShippingCalculator 
                                        cartonCount={cartStats.totalCartons} 
                                        bagCount={cartStats.totalBags}
                                        bucketCount={cartStats.totalBuckets}
                                        pieceCount={cartStats.totalPieces}
                                        targetVehicle={targetVehicle}
                                        onTargetVehicleChange={(v) => {
                                            setTargetVehicle(v as any);
                                        }} 
                                    />

                                    {isOverLimit && (
                                        <div className="mt-4 mb-2 text-sm font-black text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex flex-col items-center justify-center gap-1 shadow-sm text-center">
                                            <div className="flex items-center gap-2"><AlertCircle size={18} /> {t('agent_dashboard.exceeded_limit')}</div>
                                            <span className="text-xs opacity-80">({t('agent_dashboard.limit_info', { count: limitMultiplier, vehicle: targetVehicle === 'KIA' ? t('agent_dashboard.vehicle_kia') : targetVehicle === 'CANTER' ? t('agent_dashboard.vehicle_canter') : t('agent_dashboard.vehicle_trailer'), max: maxAllowedCartons.toFixed(1) })})</span>
                                        </div>
                                    )}

                                    <Button 
                                        onClick={handleOrderSubmit} 
                                        disabled={cartItemCount === 0 || maintenanceMode || isOverLimit}
                                        variant={maintenanceMode ? "secondary" : "primary"} 
                                        className="w-full mt-6 text-lg py-4 shadow-xl"
                                    >
                                        {maintenanceMode ? <span className="flex items-center gap-2 text-red-600 font-bold"><Lock size={18} /> {t('agent_dashboard.order_stopped')}</span> : isOverLimit ? t('agent_dashboard.exceeded_capacity') : (editingAgentOrder ? `حفظ تعديل الطلب #${editingAgentOrder.id}` : t('agent_dashboard.confirm_send_order'))}
                                    </Button>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            <div className="lg:col-span-3 order-1 lg:order-2">
                {activeTab === 'catalog' && (
                    <CatalogTab
                        products={products} cart={cart} setCart={setCart} activeCat={activeCat} setActiveCat={setActiveCat} searchTerm={searchTerm} setSearchTerm={setSearchTerm} user={effectiveUser} maintenanceMode={maintenanceMode} maintenanceMessage={maintenanceMessage} editingOrderId={editingAgentOrder?.id ?? null} onCancelEdit={cancelAgentOrderEdit}
                    />
                )}
                {activeTab === 'history' && canShowHistory && <HistoryTab myOrders={myOrders} onViewOrder={setViewingOrder} onEditOrder={handleStartEditOrder} lockedAgentEditOrderIds={lockedAgentEditOrderIds} />}
                {activeTab === 'queue' && canShowQueue && <QueueTab productionQueue={productionQueue} user={effectiveUser} />}
                {activeTab === 'finance' && canShowFinance && <FinanceTab myTransactions={myTransactions} currentBalance={userBalance} isDebt={isDebt} onViewOrder={setViewingOrder} />}
            </div>
            <MobileBottomNavigation activeItem={mobileCartActive && activeTab === 'catalog' ? 'cart' : activeTab} cartCount={cartItemCount} canShowHistory={canShowHistory} canShowQueue={canShowQueue} canShowFinance={canShowFinance} onNavigate={navigateMobile} />
        </div>
    );
};
