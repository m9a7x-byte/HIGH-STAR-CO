
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ShoppingCart, ListOrdered, FileText, Wallet, Lock, Snowflake, AlertCircle, Box, Layers, Sparkles, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/db';
import { UserRole, Order } from '../../types';
import { Button, Badge, UserAvatar } from '../../components/ui';
import { ShippingCalculator } from '../../components/shared/ShippingCalculator';
import { InvoiceModal } from '../../components/shared/InvoiceModal';
import { ADHESIVE_CATEGORY } from '../../lib/constants';

import { CatalogTab } from './tabs/CatalogTab';
import { HistoryTab } from './tabs/HistoryTab';
import { QueueTab } from './tabs/QueueTab';
import { FinanceTab } from './tabs/FinanceTab';
import { usePresence } from '../../hooks/usePresence';

export const AgentDashboard = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('catalog');

    // Internal Presence Tracking for Agent Tabs
    usePresence(activeTab);

    const [cart, setCart] = useState<Record<number, { m: number, c: number, isSpecial?: boolean, specialNote?: string }>>({});
    const [activeCat, setActiveCat] = useState('PAN');
    const [searchTerm, setSearchTerm] = useState('');


    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

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

    const refreshData = useCallback(() => {
        setProducts([...db.products]);
        setMyOrders(db.getOrders(user!.id, UserRole.AGENT));
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
    }, [user]);

    useEffect(() => {
        refreshData();
        const unsubscribe = db.subscribe(refreshData);
        return () => unsubscribe();
    }, [refreshData]);

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
        let totalCartons = 0;
        let totalBags = 0;

        Object.entries(cart).forEach(([pid, qty]) => {
            const id = Number(pid);
            const qData = qty as any;

            // Special requests have negative IDs
            if (id < 0 || qData.isSpecial) {
                totalCartons += qData.c || 0;
                return;
            }

            const p = products.find(x => x.id === id);
            if (!p) return;

            const q = qty as { m: number, c: number };

            // Check category type from database, not by constant name
            const isAdhesive = db.categories.find((c: any) => c.name === p.category)?.type === 'ADHESIVE';

            if (isAdhesive) {
                totalBags += (q.c || 0);
            } else {
                totalCartons += (q.c || 0) + ((q.m || 0) / (p.metersPerCarton || 1));
            }
        });

        return { totalCartons: isNaN(totalCartons) ? 0 : totalCartons, totalBags: isNaN(totalBags) ? 0 : totalBags };
    }, [cart, products]);

    const cartTotal = useMemo(() => {
        return Object.entries(cart).reduce((sum, [pid, qty]) => {
            const id = Number(pid);
            const qData = qty as any;

            // Special requests have 0 initial price until set by admin
            if (id < 0 || qData.isSpecial) return sum;

            const p = products.find(x => x.id === id);
            if (!p) return sum;
            const prices = p.prices[user!.agentDetails!.type];
            const q = qty as { m: number, c: number };
            return sum + ((q.c || 0) * prices.pricePerCarton) + ((q.m || 0) * prices.pricePerMeter);
        }, 0);
    }, [cart, products]);

    const handleOrderSubmit = async () => {
        if (maintenanceMode) {
            toast.error('عذراً', maintenanceMessage);
            return;
        }

        const items = Object.entries(cart).map(([pid, qty]) => {
            const id = Number(pid);
            const qData = qty as any;

            // Correctly identify special requests by negative ID or flag
            if (id < 0 || qData.isSpecial) {
                return {
                    productId: id, // Pass the unique negative ID
                    qMeters: 0,
                    qCartons: qData.c,
                    isSpecial: true,
                    specialNote: qData.specialNote
                };
            }

            const q = qty as { m: number, c: number };
            return { productId: id, qMeters: q.m || 0, qCartons: q.c || 0 };
        }).filter(i => i.qMeters > 0 || i.qCartons > 0 || i.isSpecial);

        const paidVal = 0; // DISABLED: Agents cannot pay partially during order.

        const remainingCost = cartTotal;
        const projectedBalance = (userBalance || 0) - remainingCost;

        if (!user?.agentDetails?.permissions.allowCreditOrders && projectedBalance < 0) {
            toast.warning('رصيد غير كافي', 'رصيدك الحالي لا يكفي لإتمام الطلب، وخاصية الدين غير مفعلة.');
            return;
        }

        try {
            await db.createOrder(user!.id, items, paidVal);
            setCart({});
            toast.success('تم إرسال الطلب', 'سيتم مراجعة طلبك وتسعير المواد الخاصة من قبل الإدارة.');
            if (user?.agentDetails?.permissions.showHistory) setActiveTab('history');
        } catch (e: any) {
            toast.error('فشل إرسال الطلب', e.message);
        }
    };

    if (latestUser?.agentDetails?.isFrozen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border-t-8 border-red-500">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><Snowflake size={48} className="text-red-500" /></div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">الحساب مجمد</h2>
                    <p className="text-gray-500 font-bold mb-6">عذراً، لا يمكنك الوصول للنظام في الوقت الحالي.</p>
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-sm text-red-700 font-medium mb-8">{user.agentDetails.freezeMessage}</div>
                    <p className="text-xs text-gray-400">للمساعدة، يرجى الاتصال بالإدارة</p>
                </div>
            </div>
        );
    }

    const canShowQueue = showQueueGlobal && (user?.agentDetails?.permissions.showProductionQueue ?? true);
    const canShowHistory = user?.agentDetails?.permissions.showHistory ?? true;
    const canShowFinance = user?.agentDetails?.permissions.showFinance ?? true;

    // Redirect if permission for active tab is revoked live
    useEffect(() => {
        if (activeTab === 'queue' && !canShowQueue) setActiveTab('catalog');
        if (activeTab === 'finance' && !canShowFinance) setActiveTab('catalog');
        if (activeTab === 'history' && !canShowHistory) setActiveTab('catalog');
    }, [activeTab, canShowQueue, canShowHistory, canShowFinance]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {viewingOrder && <InvoiceModal order={viewingOrder} onClose={() => setViewingOrder(null)} allowPrint={false} />}

            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 bg-[#0e3c63] text-white text-center">
                        <UserAvatar name={user?.fullName || 'User'} avatarPath={user?.avatar_path} avatarUrl={user?.avatar_url} size="xl" className="mx-auto mb-4 border-4 border-white/30 shadow-lg" />
                        <h3 className="font-bold text-xl">{user?.fullName}</h3>
                        <p className="text-sm opacity-80 mt-1">{user?.agentDetails?.province} • {user?.agentDetails?.type}</p>
                    </div>

                    {canShowFinance && (
                        <div className={`p-4 mx-4 -mt-6 mb-4 rounded-xl text-center shadow-lg relative z-10 border-2 ${!isDebt ? 'bg-white border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">{isDebt ? 'المبلغ المطلوب (عليك)' : 'الرصيد الدائن (لك)'}</p>
                            <p className="text-2xl font-mono font-black" dir="ltr">${Math.abs(userBalance).toLocaleString()}</p>
                        </div>
                    )}

                    <nav className="p-4 space-y-2">

                        {[
                            { id: 'catalog', label: 'الكتالوج والطلب', icon: ShoppingCart },
                            { id: 'history', label: 'طلباتي السابقة', icon: FileText, hidden: !canShowHistory },
                            { id: 'queue', label: 'جدول الإنتاج', icon: ListOrdered, hidden: !canShowQueue },
                            { id: 'finance', label: 'كشف الحساب', icon: Wallet, hidden: !canShowFinance },
                        ].filter(i => !i.hidden).map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-xl text-base font-bold transition-all ${activeTab === item.id ? 'bg-blue-50 text-[#0e3c63] shadow-inner' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}><item.icon size={20} /> {item.label}</button>
                        ))}
                    </nav>
                </div>

                {activeTab === 'catalog' && (
                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 sticky top-24">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg"><ShoppingCart size={20} /> السلة</h3>
                            {maintenanceMode ? <Badge color="red">موقف</Badge> : <span className="bg-red-500 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">{Object.keys(cart).length}</span>}
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-600"><Box size={16} /> فلين (كرتون)</div>
                                <span className="font-mono font-black text-lg">{cartStats.totalCartons.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-600"><Layers size={16} /> أكياس (لاصق)</div>
                                <span className="font-mono font-black text-lg">{cartStats.totalBags}</span>
                            </div>
                            {hasSpecialInCart && (
                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-700 animate-pulse">
                                    <Sparkles size={14} className="shrink-0" />
                                    <span className="text-[10px] font-black uppercase">يوجد طلب خاص يحتاج لتسعير</span>
                                </div>
                            )}
                        </div>

                        <div className="text-3xl font-bold font-mono text-[#0e3c63] mb-6 text-center border-b pb-6 border-dashed border-gray-200">${cartTotal.toLocaleString()}</div>



                        <ShippingCalculator cartonCount={cartStats.totalCartons} bagCount={cartStats.totalBags} />

                        <Button onClick={handleOrderSubmit} disabled={Object.keys(cart).length === 0 || maintenanceMode || (!user?.agentDetails?.permissions.allowCreditOrders && ((userBalance || 0) - cartTotal) < 0)} variant={maintenanceMode ? "secondary" : "primary"} className="w-full mt-6 text-lg py-4">
                            {maintenanceMode ? <span className="flex items-center gap-2 text-red-600 font-bold"><Lock size={18} /> الطلب متوقف حالياً</span> : "تأكيد وإرسال الطلب"}
                        </Button>
                    </div>
                )}
            </div>

            <div className="lg:col-span-3">
                {activeTab === 'catalog' && (
                    <CatalogTab
                        products={products} cart={cart} setCart={setCart} activeCat={activeCat} setActiveCat={setActiveCat} searchTerm={searchTerm} setSearchTerm={setSearchTerm} user={user} maintenanceMode={maintenanceMode} maintenanceMessage={maintenanceMessage}
                    />
                )}
                {activeTab === 'history' && canShowHistory && <HistoryTab myOrders={myOrders} onViewOrder={setViewingOrder} />}
                {activeTab === 'queue' && canShowQueue && <QueueTab productionQueue={productionQueue} user={user} />}
                {activeTab === 'finance' && canShowFinance && <FinanceTab myTransactions={myTransactions} currentBalance={userBalance} isDebt={isDebt} onViewOrder={setViewingOrder} />}
            </div>
        </div>
    );
};
