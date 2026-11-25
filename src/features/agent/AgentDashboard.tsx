import { calculateLineTotal, calculateOrderTotals } from '../../lib/orderMoney';
import { getCatalogCartCounts, getProductUnit, snapshotProductUnits } from '../../lib/productFamilies';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MobileBottomNavigation, AgentNavItem } from './components/MobileBottomNavigation';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, ListOrdered, FileText, Wallet, Lock, Snowflake, AlertCircle, Box, Layers, Sparkles, X, ChevronLeft, Edit3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/db';
import { UserRole, Order } from '../../types';
import { Button, Badge, UserAvatar } from '../../components/ui';
import { ShippingCalculator } from '../../components/shared/ShippingCalculator';
import { InvoiceModal } from '../../components/shared/InvoiceModal';
import { ADHESIVE_CATEGORY } from '../../lib/constants';
import { compareProductsAlphabetically } from '../../lib/productSort';
import { getCartProductPrices, getAdjustedProductPrices } from '../../lib/pricing';

import { CatalogTab } from './tabs/CatalogTab';
import { HistoryTab } from './tabs/HistoryTab';
import { QueueTab } from './tabs/QueueTab';
import { FinanceTab } from './tabs/FinanceTab';
import { usePresence } from '../../hooks/usePresence';
import { ProfileTab } from '../shared/ProfileTab';

const scrollToPageStart = () => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));

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
    const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
    const orderSubmitBusy = useRef(false);
    const [mobileCartActive, setMobileCartActive] = useState(false);
    const [editingAccount, setEditingAccount] = useState(false);

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
    const cartItems = Object.entries<AgentCartEntry>(cart).filter(([, item]) => item.c > 0 || item.m > 0);
    const cartItemCount = cartItems.length;

    const cartTotal = useMemo(() => {
        const lines = Object.entries(cart).map(([pid, quantity]) => {
            const snapshot = quantity as AgentCartEntry;
            if ((Number(pid)<0 || snapshot.isSpecial) && !editingAgentOrder) return { totalPrice: 0 };
            const product = products.find(p => String(p.id) === pid);
            const prices = getCartProductPrices(product, effectiveUser?.agentDetails, snapshot, Boolean(editingAgentOrder));
            return { totalPrice: calculateLineTotal(snapshot.c || 0, prices.pricePerCarton, snapshot.m || 0, prices.pricePerMeter) };
        });
        return calculateOrderTotals(lines, editingAgentOrder?.discountValue || 0, editingAgentOrder?.discountType || 'FIXED').total;
    }, [cart, products, agentPriceIncreasePercent, effectiveUser?.agentDetails?.type, editingAgentOrder]);

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
            const original = editingAgentOrder?.items.find(item => !item.isSpecialRequest && Number(item.productId) === id
                && (item.productSaleMode || 'CARTON') === (qData.productSaleMode || product?.saleMode || 'CARTON'));
            return {
                productId: id,
                qMeters: q.m || 0,
                qCartons: q.c || 0,
                paintColor: qData.paintColor,
                ...(includePricing ? {
                    productCode: original?.productCode ?? product?.code,
                    ...snapshotProductUnits(product),
                    productSaleMode: qData.productSaleMode ?? product?.saleMode ?? 'CARTON',
                    productMetersPerCarton: qData.productMetersPerCarton ?? snapshotProductUnits(product).productMetersPerCarton,
                    productDimensions: original?.productDimensions ?? product?.dimensions,
                    unitPriceCarton: original?.unitPriceCarton ?? prices.pricePerCarton,
                    unitPriceMeter: original?.unitPriceMeter ?? prices.pricePerMeter,
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

        const productIds = order.items.filter(item => !item.isSpecialRequest).map(item => String(item.productId));
        if (new Set(productIds).size !== productIds.length) { toast.error('يحتاج تعديل من الإدارة', 'هذا الطلب يحتوي نفس المادة بأكثر من سطر. راجع الإدارة حتى تبقى جميع السطور محفوظة.'); return; }
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
        setMobileCartActive(false);
        setActiveTab('catalog');
        if (window.matchMedia('(width < 1024px)').matches) scrollToPageStart();
        toast.info('تعديل الطلب مفتوح', `تقدر تعدل الطلب #${order.id} من السلة الحالية.`);
    };

    const cancelAgentOrderEdit = () => {
        setEditingAgentOrder(null);
        setCart({});
    };

    const handleOrderSubmit = async () => {
        if (orderSubmitBusy.current) return;
        if (maintenanceMode) {
            toast.error(t('agent_dashboard.sorry'), maintenanceMessage);
            return;
        }

        const paidVal = 0; // LEDGER SYSTEM: No payment at order time — charge at COMPLETED only.

        orderSubmitBusy.current = true;
        setIsOrderSubmitting(true);
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
            setMobileCartActive(false);
            if (effectiveUser?.agentDetails?.permissions.showHistory) setActiveTab('history');
        } catch (e: any) {
            toast.error(t('agent_dashboard.order_send_failed'), e.message);
        } finally { orderSubmitBusy.current = false; setIsOrderSubmitting(false); }
    };

    const canShowQueue = showQueueGlobal && effectiveUser?.agentDetails?.permissions?.showProductionQueue === true;
    const canShowHistory = effectiveUser?.agentDetails?.permissions?.showHistory ?? true;
    const canShowFinance = effectiveUser?.agentDetails?.permissions?.showFinance ?? true;

    useEffect(() => {
        if (activeTab === 'queue' && !canShowQueue) setActiveTab('catalog');
        if (activeTab === 'finance' && !canShowFinance) setActiveTab('catalog');
        if (activeTab === 'history' && !canShowHistory) setActiveTab('catalog');
    }, [activeTab, canShowQueue, canShowHistory, canShowFinance]);

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

    const navigateMobile = (item: AgentNavItem) => {
        setEditingAccount(false);
        setMobileCartActive(item === 'cart');
        setActiveTab(item === 'cart' ? 'catalog' : item);
        scrollToPageStart();
    };
    const toggleAccountEditor = (open: boolean) => {
        setEditingAccount(open);
        scrollToPageStart();
    };
    const showingMobileCart = activeTab === 'catalog' && mobileCartActive;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            {viewingOrder && <InvoiceModal order={viewingOrder} onClose={() => setViewingOrder(null)} allowPrint={true} />}

            <div className={`min-w-0 lg:col-span-1 space-y-6 order-2 lg:order-1 ${showingMobileCart ? 'block' : 'hidden lg:block'}`}>
                <div className="hidden lg:block bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
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
                            <button key={item.id} onClick={() => { setEditingAccount(false); setMobileCartActive(false); setActiveTab(item.id); }} className={`w-full flex items-center gap-4 p-4 rounded-xl text-base font-bold transition-all ${activeTab === item.id ? 'bg-blue-50 text-[#0e3c63] shadow-inner' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}><item.icon size={20} /> {item.label}</button>
                        ))}
                    </nav>
                </div>

                {activeTab === 'catalog' && (
                    <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-sm lg:shadow-xl border border-gray-100 lg:sticky lg:top-24">
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

                        <div className="lg:hidden mb-5">
                            {cartItems.length > 0 ? (
                                <ul className="divide-y divide-slate-100 border-y border-slate-100">
                                    {cartItems.map(([id, item]) => {
                                        const product = products.find(product => String(product.id) === id);
                                        const name = item.isSpecial ? item.specialNote || t('agent_dashboard.special_order_pricing') : product?.name || item.productCode || `#${id}`;
                                        return (
                                            <li key={id} className="flex items-center justify-between gap-3 py-3 text-sm">
                                                <div className="min-w-0 break-words font-bold text-slate-800">
                                                    {name}
                                                    {product?.code && <bdi className="block text-xs font-medium text-slate-500">{product.code}</bdi>}
                                                </div>
                                                <div className="shrink-0 text-end text-xs font-semibold text-slate-700">
                                                    {item.c > 0 && <p>{item.c} {getProductUnit(product, db.categories, item.productSaleMode)}</p>}
                                                    {item.m > 0 && <p>{item.m} {t('common.meter')}</p>}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <p className="py-3 text-sm text-slate-500">{t('agent_dashboard.mobile_empty_cart')}</p>}
                            <button type="button" onClick={() => navigateMobile('catalog')} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[#0e3c63]">
                                {t('agent_dashboard.mobile_products')} <ChevronLeft size={16} className="ltr:rotate-180" aria-hidden="true" />
                            </button>
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
                                        disabled={isOrderSubmitting || cartItemCount === 0 || maintenanceMode || isOverLimit}
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

            <div className={`min-w-0 lg:col-span-3 order-1 lg:order-2 ${showingMobileCart ? 'hidden lg:block' : ''}`}>
                {activeTab === 'catalog' && (
                    <CatalogTab
                        products={products} cart={cart} setCart={setCart} activeCat={activeCat} setActiveCat={setActiveCat} searchTerm={searchTerm} setSearchTerm={setSearchTerm} user={effectiveUser} maintenanceMode={maintenanceMode} maintenanceMessage={maintenanceMessage} editingOrderId={editingAgentOrder?.id ?? null} onCancelEdit={cancelAgentOrderEdit}
                    />
                )}
                {activeTab === 'history' && canShowHistory && <HistoryTab myOrders={myOrders} onViewOrder={setViewingOrder} onEditOrder={handleStartEditOrder} lockedAgentEditOrderIds={lockedAgentEditOrderIds} />}
                {activeTab === 'queue' && canShowQueue && <QueueTab key={effectiveUser?.id} />}
                {activeTab === 'finance' && canShowFinance && (
                    <>
                    {editingAccount && <div className="lg:hidden"><ProfileTab onBack={() => toggleAccountEditor(false)} /></div>}
                    <div className={`space-y-4 lg:space-y-0 ${editingAccount ? 'hidden lg:block' : ''}`}>
                        {effectiveUser && (
                            <section aria-labelledby="mobile-agent-account" className="lg:hidden rounded-2xl bg-[#0e3c63] p-4 text-white shadow-sm">
                                <div className="flex items-center gap-3">
                                    <UserAvatar name={effectiveUser.fullName} avatarPath={effectiveUser.avatar_path} avatarUrl={effectiveUser.avatar_url || effectiveUser.imageUrl} size="lg" className="border-white/30" />
                                    <div className="min-w-0">
                                        <h2 id="mobile-agent-account" className="text-xs font-semibold text-sky-100">{t('agent_dashboard.mobile_account')}</h2>
                                        <p className="break-words text-base font-extrabold">{effectiveUser.fullName}</p>
                                        <p className="text-sm text-sky-100">{[effectiveUser.province, effectiveUser.agentDetails?.type].filter(Boolean).join(' · ')}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/20 pt-3">
                                    <div>
                                        <p className="text-xs font-semibold text-sky-100">{isDebt ? t('agent_dashboard.debt_balance') : t('agent_dashboard.credit_balance')}</p>
                                        <bdi dir="ltr" className="mt-1 block text-xl font-black tabular-nums">${Math.abs(userBalance).toLocaleString('en-US')}</bdi>
                                    </div>
                                    <button type="button" onClick={() => toggleAccountEditor(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-2.5 text-xs font-bold text-white hover:bg-white/20">
                                        <Edit3 size={15} aria-hidden="true" /> {t('common.edit_account')}
                                    </button>
                                </div>
                            </section>
                        )}
                        <FinanceTab myTransactions={myTransactions} currentBalance={userBalance} isDebt={isDebt} onViewOrder={setViewingOrder} />
                    </div>
                    </>
                )}
            </div>
            <MobileBottomNavigation activeItem={showingMobileCart ? 'cart' : activeTab} cartCount={cartItemCount} canShowHistory={canShowHistory} canShowQueue={canShowQueue} canShowFinance={canShowFinance} onNavigate={navigateMobile} />
        </div>
    );
};
