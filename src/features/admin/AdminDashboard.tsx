import { useTranslation } from 'react-i18next';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    AlertTriangle, Package, Check, PlayCircle, Activity, ShieldCheck, User, Undo2, LogOut, MapPin, X, Trash2, RefreshCcw, XCircle, CheckCircle2, ShieldAlert, Wallet, Info, AlertOctagon, ListOrdered, ShoppingCart, DollarSign, Box, Settings, Bell, Printer, Eye, Power,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/db';
import { UserRole, ProductionStatus, PaymentStatus, Order, User as UserType } from '../../types';
import { Button, Badge } from '../../components/ui';
import { InvoiceModal } from '../../components/shared/InvoiceModal';
import carbonFibre from '../../assets/patterns/carbon-fibre.png';

// Tabs
import { OverviewTab } from './tabs/OverviewTab';
import { ProductionTab } from './tabs/ProductionTab';
import { OrdersTab } from './tabs/OrdersTab';
import { SalesTab } from './tabs/SalesTab';
import { ReportsTab } from './tabs/ReportsTab';
import { CatalogTab } from './tabs/CatalogTab';
import { AgentsTab } from './tabs/AgentsTab';
import { StaffTab } from './tabs/StaffTab';
import { ActivityLogTab } from './tabs/ActivityLogTab';
import { SettingsTab } from './tabs/SettingsTab';
import { ProfitCalculatorTab } from './tabs/ProfitCalculatorTab';
import { PresenceTab } from './tabs/PresenceTab';
import { FactoryDashboard } from '../factory/FactoryDashboard';
import { SafeTab } from './tabs/SafeTab'; // استيراد التبويب الجديد
import { InvoiceMergeTab } from './tabs/InvoiceMergeTab';

interface AdminDashboardProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const AdminDashboard = ({ activeTab, setActiveTab }: AdminDashboardProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();

    // High-Level Data State
    const [categories, setCategories] = useState(db.categories);
    const [products, setProducts] = useState(db.products);
    const [orders, setOrders] = useState(db.orders);
    const [productionQueue, setProductionQueue] = useState<Order[]>([]);
    const [agents, setAgents] = useState(db.users.filter(u => u.role === UserRole.AGENT && !u.deleted_at));
    const [employees, setEmployees] = useState(db.users.filter(u => u.role !== UserRole.AGENT && !u.deleted_at));
    const [allUsers, setAllUsers] = useState(db.users.filter(u => !u.deleted_at));
    const [settings, setSettings] = useState(db.vehicleConfig);
    const [allTransactions, setAllTransactions] = useState(db.getAllTransactions());

    const [currentTime, setCurrentTime] = useState(new Date());

    // Shared Modals State
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<UserType | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<UserType | null>(null);
    const [confirmStatus, setConfirmStatus] = useState<{ id: number, type: 'payment' | 'production', val: string } | null>(null);
    const [deleteOrderConfirm, setDeleteOrderConfirm] = useState<Order | null>(null);
    const [settingsConfirm, setSettingsConfirm] = useState<{ key: string, val: any, title: string, message: string, icon: any, color: string } | null>(null);

    useEffect(() => {
        if (activeTab !== 'agents') setSelectedAgent(null);
        if (activeTab !== 'staff') setSelectedEmployee(null);
        setViewingOrder(null);
    }, [activeTab]);

    const refresh = useCallback(() => {
        setCategories([...db.categories]);
        setProducts([...db.products]);
        setOrders([...db.orders]);
        setProductionQueue(db.getProductionQueue());
        setAgents(db.users.filter(u => u.role === UserRole.AGENT && !u.deleted_at));
        setEmployees(db.users.filter(u => u.role !== UserRole.AGENT && !u.deleted_at));
        setAllUsers([...db.users].filter(u => !u.deleted_at));
        setSettings(db.vehicleConfig);
        setAllTransactions(db.getAllTransactions());
    }, []);

    useEffect(() => {
        refresh();
        const unsubscribe = db.subscribe(refresh);
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { unsubscribe(); clearInterval(clockInterval); };
    }, [refresh]);

    // Show browser/OS notification for admins (new orders from agents, etc.)
    useEffect(() => {
        const newNotifs = db.consumeNewNotifications();
        if (newNotifs.length > 0) {
            newNotifs.forEach(notif => {
                let title = notif.title;
                let body = notif.message;
                if (notif.title === 'طلب جديد') title = t('notifications.new_order_title', 'طلب جديد');

                toast.info(title, body);

                try {
                    if ('Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification(title, { body, icon: '/voga-logo.png', tag: notif.id });
                        } else if (Notification.permission !== 'denied') {
                            Notification.requestPermission().then(perm => {
                                if (perm === 'granted') {
                                    new Notification(title, { body, icon: '/voga-logo.png', tag: notif.id });
                                }
                            });
                        }
                    }
                } catch (e) { console.warn('Browser notification failed:', e); }
            });
        }
    });

    const hasPermission = (p: any) => (employees.find(e => e.id === user?.id) || user)?.permissions?.includes(p) || false;

    const handleUpdateStatus = () => {
        if (confirmStatus && hasPermission('EDIT_PRODUCTION')) {
            db.updateOrderStatus(user!.id, confirmStatus.id, confirmStatus.type, confirmStatus.val);
            toast.success(t('batch4.k149')); setConfirmStatus(null);
        }
    };

    const handleDeleteOrder = (refund: boolean) => {
        if (deleteOrderConfirm && hasPermission('DELETE_ORDERS')) {
            db.deleteOrder(user!.id, deleteOrderConfirm.id, refund);
            toast.success(refund ? 'تم الحذف وإرجاع المبلغ للمحفظة' : 'تم الحذف النهائي للطلب');
            setDeleteOrderConfirm(null);
        }
    };

    const confirmUpdateSettings = () => {
        if (settingsConfirm) {
            const newSettings = { ...settings, [settingsConfirm.key]: settingsConfirm.val };
            setSettings(newSettings); db.updateVehicleConfig(user!.id, newSettings);
            toast.success(t('batch4.k150'));
            setSettingsConfirm(null);
        }
    };

    const isDateInRange = (dateStr: string, from: string, to: string) => {
        const target = new Date(dateStr).getTime();
        const fromTime = from ? new Date(from).setHours(0, 0, 0, 0) : 0;
        const toTime = to ? new Date(to).setHours(23, 59, 59, 999) : Infinity;
        return target >= fromTime && target <= toTime;
    };

    const stats = useMemo(() => {
        const monthlyOrders = orders.filter(o => {
            const d = new Date(o.createdAt);
            return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
        });
        return {
            totalOrders: monthlyOrders.length,
            totalRevenue: monthlyOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0),
            paidRevenue: monthlyOrders.reduce((acc, o) => acc + (o.paidAmount || 0), 0),
            activeProduction: orders.filter(o => o.productionStatus === ProductionStatus.WAITING || o.productionStatus === ProductionStatus.IN_PROGRESS).length,
            pendingTransferCount: orders.filter(o => o.productionStatus === ProductionStatus.PENDING_TRANSFER).length,
            unpaidCount: monthlyOrders.filter(o => o.paymentStatus !== PaymentStatus.PAID).length,
            recentLogs: [...db.auditLogs].slice(0, 7),
            recentOrders: [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
            onlineUsersCount: allUsers.filter(u => u.presence?.isOnline).length
        };
    }, [orders, allUsers]);

    const selectedOrderForStatus = useMemo(() => confirmStatus ? orders.find(o => o.id === confirmStatus.id) : null, [confirmStatus, orders]);

    return (
        <div className="pb-20">
            {viewingOrder && <InvoiceModal order={viewingOrder} onClose={() => setViewingOrder(null)} allowPrint={true} respectPrintSetting={false} />}

            {/* Global Confirmation Dialogs */}
            {(confirmStatus || settingsConfirm || deleteOrderConfirm) && (
                <div className="fixed inset-0 bg-[#0e3c63]/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className={`bg-white rounded-[3rem] overflow-hidden w-full shadow-[0_30px_70px_rgba(0,0,0,0.4)] border border-white/20 ${deleteOrderConfirm || settingsConfirm ? 'max-w-lg' : 'max-w-2xl'}`}>

                        {/* --- 1. ORDER DELETE SAFETY GUARD --- */}
                        {deleteOrderConfirm ? (
                            <div className="flex flex-col">
                                <div className="bg-gradient-to-br from-red-600 to-red-800 p-10 text-white text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                    <div className="relative z-10">
                                        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                            <AlertOctagon size={42} className="text-white animate-pulse" />
                                        </div>
                                        <h3 className="text-2xl font-black mb-2">{t('batch4.k151')}</h3>
                                        <p className="text-red-100 text-sm font-bold opacity-80">{t('batch4.k152')}</p>
                                    </div>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                                        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('batch4.k153')}</span>
                                            <span className="font-mono font-black text-[#0e3c63] text-xl">#{deleteOrderConfirm.id}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('batch4.k154')}</span>
                                            <span className="font-black text-gray-800">{deleteOrderConfirm.agentName}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('batch4.k155')}</span>
                                            <span className="font-mono font-black text-emerald-600 text-lg">${(deleteOrderConfirm.totalAmount || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Button onClick={() => handleDeleteOrder(true)} className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg border-b-4 border-amber-700">
                                            <RefreshCcw size={20} /> حذف مع إرجاع الواصل (${(deleteOrderConfirm.paidAmount || 0).toLocaleString()}) للرصيد
                                        </Button>
                                        <Button onClick={() => handleDeleteOrder(false)} className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg border-b-4 border-red-800">
                                            <XCircle size={20} /> حذف نهائي (بدون إرجاع مبالغ)
                                        </Button>
                                        <button onClick={() => setDeleteOrderConfirm(null)} className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200 mt-2">{t('batch4.k156')}</button>
                                    </div>
                                </div>
                            </div>
                        )

                            /* --- 2. SETTINGS CONFIRMATION (RE-STYLED) --- */
                            : settingsConfirm ? (
                                <div className="flex flex-col">
                                    <div className={`p-10 text-white text-center relative overflow-hidden bg-gradient-to-br ${settingsConfirm.color}`}>
                                        <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                        <div className="relative z-10">
                                            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                                {React.createElement(settingsConfirm.icon, { size: 42, className: "text-white" })}
                                            </div>
                                            <h3 className="text-2xl font-black mb-2">{settingsConfirm.title}</h3>
                                            <p className="text-white/80 text-sm font-bold opacity-80 uppercase tracking-widest">System Configuration Security</p>
                                        </div>
                                    </div>
                                    <div className="p-10 space-y-8">
                                        <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 text-center">
                                            <p className="text-gray-600 font-bold leading-relaxed">{settingsConfirm.message}</p>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <Button onClick={confirmUpdateSettings} className="w-full h-16 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3">
                                                <Check size={24} /> تأكيد وحفظ التغيير
                                            </Button>
                                            <button onClick={() => setSettingsConfirm(null)} className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200">{t('batch4.k156')}</button>
                                        </div>
                                    </div>
                                </div>
                            )

                                /* --- 3. PRODUCTION STATUS CHANGE MODAL (Rich Details) --- */
                                : confirmStatus && selectedOrderForStatus ? (
                                    <div className="flex flex-col">
                                        {/* Header based on status change */}
                                        {(() => {
                                            const val = confirmStatus.val;
                                            const current = selectedOrderForStatus.productionStatus;
                                            let theme = { from: '#0e3c63', to: '#1a4d7a', icon: Activity, label: t('batch4.k157') };

                                            if ((val === ProductionStatus.WAITING || val === ProductionStatus.IN_PROGRESS) && (current === ProductionStatus.PENDING_TRANSFER || current === ProductionStatus.PENDING_PAYMENT)) {
                                                theme = { from: '#4f46e5', to: '#3730a3', icon: PlayCircle, label: t('batch4.k114') };
                                            } else if (val === ProductionStatus.IN_PROGRESS) {
                                                theme = { from: '#2563eb', to: '#1e40af', icon: Activity, label: t('batch4.k158') };
                                            } else if (val === ProductionStatus.WAITING && current === ProductionStatus.IN_PROGRESS) {
                                                theme = { from: '#d97706', to: '#b45309', icon: Undo2, label: t('batch4.k159') };
                                            } else if (val === ProductionStatus.PENDING_PAYMENT) {
                                                theme = { from: '#dc2626', to: '#991b1b', icon: LogOut, label: t('batch4.k160') };
                                            } else if (val === ProductionStatus.COMPLETED) {
                                                theme = { from: '#10b981', to: '#065f46', icon: CheckCircle2, label: t('batch4.k161') };
                                            }

                                            return (
                                                <div className="p-8 text-white relative overflow-hidden shrink-0" style={{ background: `linear-gradient(to bottom right, ${theme.from}, ${theme.to})` }}>
                                                    <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                                    <div className="relative z-10 flex items-center justify-between">
                                                        <div className="flex items-center gap-5">
                                                            <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md border border-white/20 shadow-xl">
                                                                <theme.icon size={32} />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-2xl font-black">{theme.label}</h3>
                                                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Order Workflow Confirmation</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-left">
                                                            <span className="block text-[10px] font-black text-white/50 uppercase">{t('batch4.k113')}</span>
                                                            <span className="text-3xl font-black font-mono">#{selectedOrderForStatus.id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar p-8 bg-gray-50/30">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                {/* Details Column */}
                                                <div className="space-y-6">
                                                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><User size={14} />{t('batch4.k115')}</h4>
                                                        <div>
                                                            <p className="font-black text-gray-800 text-lg">{selectedOrderForStatus.agentName}</p>
                                                            <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mt-1"><MapPin size={12} /> {selectedOrderForStatus.agentProvince}</p>
                                                        </div>
                                                        <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-gray-500">{t('batch4.k162')}</span>
                                                            <span className="font-mono font-black text-[#0e3c63] text-lg">${(selectedOrderForStatus.totalAmount || 0).toLocaleString()}</span>
                                                        </div>
                                                    </div>

                                                    {selectedOrderForStatus.paymentStatus !== PaymentStatus.PAID && (
                                                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-4">
                                                            <ShieldAlert size={24} className="text-amber-600 shrink-0 mt-1" />
                                                            <div>
                                                                <h5 className="font-black text-amber-800 text-sm mb-1">{t('batch4.k117')}</h5>
                                                                <p className="text-[11px] text-amber-700 font-bold leading-relaxed">{t('batch4.k163')}<span className="font-mono text-[#0e3c63]">${((selectedOrderForStatus.totalAmount || 0) - (selectedOrderForStatus.paidAmount || 0)).toLocaleString()}</span>{t('batch4.k164')}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Items Column */}
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1"><ShoppingCart size={14} />{t('batch4.k165')}</h4>
                                                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                                                            {selectedOrderForStatus.items.map((item, idx) => (
                                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center text-[#0e3c63] shadow-sm"><Box size={18} /></div>
                                                                        <div>
                                                                            <p className="text-xs font-black text-gray-800 font-mono tracking-tight">{item.productName || item.productCode}</p>
                                                                            <p className="text-[9px] text-gray-400 font-bold">{item.productDimensions}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-left bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                                                        <span className="font-black text-[#0e3c63] font-mono">{(item.quantityCartons || 0)}</span>
                                                                        <span className="text-[9px] font-bold text-[#0e3c63]/60 mr-1">{t('batch4.k166')}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 border-t bg-white flex gap-4 shrink-0 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.1)]">
                                            <Button onClick={handleUpdateStatus} className="flex-1 h-16 bg-[#0e3c63] text-white text-lg font-black rounded-2xl shadow-xl active:scale-95 flex items-center justify-center gap-2">
                                                <Check size={24} /> تأكيد الإجراء
                                            </Button>
                                            <Button onClick={() => setConfirmStatus(null)} variant="secondary" className="px-10 h-16 rounded-2xl font-bold">{t('batch4.k156')}</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-center p-8">
                                        <AlertTriangle size={32} className="text-yellow-500 mb-4" />
                                        <h3 className="text-xl font-black mb-4">{t('batch4.k167')}</h3>
                                        <div className="w-full space-y-4">
                                            <div className="flex gap-4 w-full">
                                                <Button onClick={settingsConfirm ? confirmUpdateSettings : handleUpdateStatus} className="flex-1 bg-[#0e3c63] text-white py-4 rounded-2xl font-black shadow-lg">{t('batch4.k168')}</Button>
                                                <Button onClick={() => { setConfirmStatus(null); setSettingsConfirm(null); }} variant="secondary" className="flex-1 rounded-2xl">{t('batch4.k156')}</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                    </div>
                </div>
            )}

            {/* Render Main Tabs */}
            {activeTab === 'overview' && <OverviewTab stats={stats} currentTime={currentTime} settings={settings} setActiveTab={setActiveTab} onNavigateToAgent={(id: any) => { setSelectedAgent(agents.find(a => a.id === id) || null); setActiveTab('agents'); }} onNavigateToSpecificOrder={(id: any) => setActiveTab('orders')} />}
            {activeTab === 'production' && <ProductionTab productionQueue={productionQueue} canEdit={hasPermission('EDIT_PRODUCTION')} onUpdateStatus={(data: any) => setConfirmStatus(data)} onViewOrder={setViewingOrder} onNavigateToAgent={(id: any) => { setSelectedAgent(agents.find(a => a.id === id) || null); setActiveTab('agents'); }} />}
            {activeTab === 'orders' && <OrdersTab orders={orders} userPermissions={(employees.find(e => e.id === user?.id) || user)?.permissions || []} onViewOrder={(o: Order) => { db.markOrderAsSeen(o.id); setViewingOrder(o); }} onDeleteOrder={(o: Order) => setDeleteOrderConfirm(o)} onUpdateStatus={(data: any) => setConfirmStatus(data)} isDateInRange={isDateInRange} onNavigateToAgent={(id: any) => { setSelectedAgent(agents.find(a => a.id === id) || null); setActiveTab('agents'); }} products={products} agents={agents} />}
            {activeTab === 'invoice_merge' && hasPermission('VIEW_ORDERS') && <InvoiceMergeTab orders={orders} products={products} onViewOrder={(o: Order) => { db.markOrderAsSeen(o.id); setViewingOrder(o); }} />}
            {activeTab === 'sales' && hasPermission('VIEW_SALES') && <SalesTab salesStats={{ totalSales: stats.totalRevenue, totalReceived: stats.paidRevenue }} transactions={allTransactions} agents={agents} isDateInRange={isDateInRange} onNavigateToAgent={(id: any) => { setSelectedAgent(agents.find(a => a.id === id) || null); setActiveTab('agents'); }} onViewOrder={setViewingOrder} />}
            {activeTab === 'reports' && hasPermission('VIEW_REPORTS') && <ReportsTab orders={orders} products={products} agents={agents} isDateInRange={isDateInRange} onNavigateToOrders={() => setActiveTab('orders')} onNavigateToAgent={(id: any) => { setSelectedAgent(agents.find(a => a.id === id) || null); setActiveTab('agents'); }} onViewOrder={setViewingOrder} />}
            {activeTab === 'profit_calculator' && <ProfitCalculatorTab orders={orders} isDateInRange={isDateInRange} />}
            {activeTab === 'catalog' && hasPermission('VIEW_CATALOG') && <CatalogTab categories={categories} products={products} orders={orders} canEdit={hasPermission('EDIT_CATALOG')} onViewOrder={setViewingOrder} onDeleteProduct={(id: number) => db.deleteProduct(user!.id, id)} />}
            {activeTab === 'agents' && hasPermission('VIEW_AGENTS') && <AgentsTab agents={agents} selectedAgent={selectedAgent} agentTransactions={allTransactions.filter(t => String(t.agentId) === String(selectedAgent?.id))} canEdit={hasPermission('EDIT_AGENTS')} isSuperAdmin={user?.role === UserRole.SUPER_ADMIN} onSelectAgent={setSelectedAgent} onViewOrder={setViewingOrder} />}
            {activeTab === 'staff' && hasPermission('MANAGE_STAFF') && <StaffTab employees={employees} selectedEmployee={selectedEmployee} onSelectEmployee={setSelectedEmployee} isSuperAdmin={user?.role === UserRole.SUPER_ADMIN} onNavigateOrder={(id: any) => setActiveTab('orders')} />}
            {activeTab === 'activity_log' && hasPermission('VIEW_LOGS') && <ActivityLogTab employees={employees} agents={agents} onNavigateUser={(u: any) => { if (u.role === UserRole.AGENT) { setSelectedAgent(u); setActiveTab('agents'); } else { setSelectedEmployee(u); setActiveTab('staff'); } }} onNavigateOrder={(id: any) => setActiveTab('orders')} />}
            {activeTab === 'settings' && hasPermission('VIEW_SETTINGS') && <SettingsTab settings={settings} onUpdateSettings={(key: any, val: any, title: any, msg: any, icon: any, color: any) => { if (msg) setSettingsConfirm({ key, val, title, message: msg, icon, color }); else db.updateVehicleConfig(user!.id, { ...settings, [key]: val }); }} />}
            {activeTab === 'presence' && hasPermission('VIEW_PRESENCE') && <PresenceTab users={allUsers} onNavigate={(u: any) => { if (u.role === UserRole.AGENT) { setSelectedAgent(u); setActiveTab('agents'); } else { setSelectedEmployee(u); setActiveTab('staff'); } }} />}
            {activeTab === 'factory' && hasPermission('ACCESS_FACTORY') && <FactoryDashboard />}
            {activeTab === 'safe' && hasPermission('VIEW_SAFE') && <SafeTab />}
        </div>
    );
};

