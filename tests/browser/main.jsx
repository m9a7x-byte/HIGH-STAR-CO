import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/i18n';
import '../../src/index.css';
import { db } from '../../src/lib/db';
import { ROLE_PERMISSIONS } from '../../src/lib/permissions';
import { AdminDashboard } from '../../src/features/admin/AdminDashboard';
import { AgentDashboard } from '../../src/features/agent/AgentDashboard';
import { FactoryDashboard } from '../../src/features/factory/FactoryDashboard';
import { ProfileTab } from '../../src/features/shared/ProfileTab';
import { NotificationBell } from '../../src/components/shared/NotificationBell';
import { LanguageProvider } from '../../src/context/LanguageContext';
import { ToastProvider } from '../../src/context/ToastContext';
import { InventoryModal } from '../../src/features/factory/components/InventoryModal';
import { ExpenseModal } from '../../src/features/factory/components/ExpenseModal';
import { LogisticsModal } from '../../src/features/factory/components/LogisticsModal';
import { SupplierModal } from '../../src/features/factory/components/SupplierModal';
import { EditFinanceModal } from '../../src/features/factory/components/EditFinanceModal';
import { InvoiceModal } from '../../src/components/shared/InvoiceModal';
import { ProductionConfirmationModal } from '../../src/components/shared/ProductionConfirmationModal';
import { AvatarCropModal } from '../../src/components/profile/AvatarCropModal';
import { Layout } from '../../src/layout/Layout';
import { ToastContainer } from '../../src/components/ui/ToastContainer';

const pages = import.meta.glob('../../src/pages/*.tsx', { eager: true });
const now = new Date().toISOString();
const mobilePreview = new URLSearchParams(location.search).has('mobilePreview');
if (mobilePreview) {
  const fetchLocal = window.fetch.bind(window);
  window.fetch = (input, options) => input === 'https://api.ipify.org?format=json'
    ? Promise.resolve(Response.json({ ip: '192.0.2.1' }))
    : fetchLocal(input, options);
  if ('Notification' in window) Object.defineProperty(Notification, 'permission', { configurable: true, value: 'denied' });
}
const permissions = [...new Set(Object.values(ROLE_PERMISSIONS || {}).flatMap(r => r.permissions || []))];
const allPermissions = ['VIEW_PRODUCTION','EDIT_PRODUCTION','VIEW_ORDERS','ADD_ORDERS','EDIT_ORDERS','DELETE_ORDERS','UNLOCK_ORDERS','VIEW_CATALOG','ADD_CATALOG','EDIT_CATALOG','DELETE_CATALOG','VIEW_AGENTS','ADD_AGENTS','EDIT_AGENTS','DELETE_AGENTS','VIEW_SALES','VIEW_REPORTS','VIEW_LOGS','VIEW_PRESENCE','MANAGE_STAFF','ACCESS_FACTORY','VIEW_SAFE','ADD_SAFE_TX','EDIT_SAFE_TX','DELETE_SAFE_TX','VIEW_SETTINGS','EDIT_SETTINGS',...permissions];
for (const area of ['INV','EXP','SUP','LOG']) for (const action of ['VIEW','ADD','EDIT','DELETE','LOCK']) allPermissions.push(`${action}_FACTORY_${area}`);
const admin = { id: 'fixture-admin', fullName: 'مدير اختبار', email: 'admin@example.invalid', role: 'SUPER_ADMIN', status: 'active', permissions: allPermissions, phone: '07700000000', province: 'بغداد', address: 'عنوان اختبار', presence: { isOnline: true, lastSeen: now } };
const agent = { ...admin, id: 'fixture-agent', fullName: 'وكيل اختبار', email: 'agent@example.invalid', role: 'AGENT', agentDetails: { type: 'عادي', currentBalance: -5176.96, isFrozen: false, permissions: { canShowFinance: true, showFinance: true, canSeePrices: true, showPrices: true, canOrder: true, canShowQueue: true, showProductionQueue: true, canShowHistory: true } } };
if (mobilePreview) {
  agent.fullName = 'كركوك تجريبي';
  agent.province = 'كركوك';
}
db.users = [admin, agent, { ...admin, id: 'fixture-staff', fullName: 'موظف اختبار', role: 'ADMIN', email: 'staff@example.invalid' }];
db.categories = [{ id: 1, name: 'فلين', type: 'STYROFOAM', order: 1 }, { id: 2, name: 'أصباغ', type: 'PAINT', order: 2 }, { id: 3, name: 'لاصق', type: 'ADHESIVE', order: 3 }];
db.products = db.categories.map((c, i) => ({ id: i + 1, code: `TEST-${i + 1}`, name: `منتج اختبار ${i + 1}`, category: c.name, dimensions: '10x10', isActive: true, pricePerCarton: 20, pricePerMeter: 2, metersPerCarton: 10, volumePerCarton: 0.1, saleMode: 'CARTON', inventory: 100, prices: { 'عادي': { pricePerCarton: 20, pricePerMeter: 2 }, VIP: { pricePerCarton: 18, pricePerMeter: 1.8 } } }));
if (mobilePreview) {
  db.products[0].name = 'لوح فلين عازل';
  db.products.push(
    { ...db.products[0], id: 4, code: 'TEST-4', name: 'لوح فلين عالي الكثافة' },
    { ...db.products[0], id: 5, code: 'TEST-5', name: 'لوح فلين للعزل الحراري' }
  );
}
const item = { id: 1, productId: 1, productCode: 'TEST-1', productName: 'منتج اختبار', productDimensions: '10x10', productSaleMode: 'CARTON', productMetersPerCarton: 10, quantityCartons: 5, quantityMeters: 0, unitPriceCarton: 20, unitPriceMeter: 2, totalPrice: 100 };
db.orders = ['PENDING_TRANSFER','WAITING','IN_PROGRESS','COMPLETED','PENDING_PAYMENT'].map((productionStatus, i) => ({ id: 34 + i, agentId: agent.id, agentName: agent.fullName, agentProvince: 'بغداد', totalAmount: i === 3 ? 11376.96 : 100, subTotalAmount: i === 3 ? 11376.96 : 100, paidAmount: 0, discountValue: 0, discountType: 'FIXED', productionStatus, paymentStatus: 'PENDING', items: [{ ...item }], paymentHistory: [], totalVolume: 0.5, createdAt: now, agentEditUnlocked: true, estimatedDays: 2, movedToProductionAt: now, hasSpecialRequest: false }));
if (new URLSearchParams(location.search).has('noPersonalOrders')) db.orders = [];
db.walletTransactions = [
  { id: 79, agentId: agent.id, amount: 6200, type: 'DEPOSIT', description: 'تسديد موحد $6,200', createdAt: now },
  { id: 92, agentId: agent.id, amount: -11376.96, type: 'PAYMENT', description: 'شراء طلبية #37', linkedOrderId: 37, createdAt: now },
  { id: 93, agentId: agent.id, amount: -44219.58, type: 'PAYMENT', description: 'شراء طلبية #21', createdAt: now },
  { id: 100, agentId: agent.id, amount: 44219.58, type: 'ADJUSTMENT', description: 'إلغاء احتساب الطلب الملغي #21', locked: true, createdAt: now, paymentDetails: { mode: 'deposit', note: '', allocations: [], reversal: { kind: 'order_charge_reversal', transactionId: 93, orderId: 21 } } }
];
db.suppliers = [{ id: 'supplier-test', name: 'مورد اختبار', phone: '07700000001', current_balance: 0 }];
db.factoryTransactions = [{ id: 1, category: 'DAILY_EXPENSE', transactionType: 'OUT', amount: 10, date: now, description: 'مصروف اختبار', withdrawnBy: admin.fullName, notes: 'اختبار', isLocked: false }, { id: 2, category: 'INVENTORY', transactionType: 'IN', materialType: 'EPS', quantity: 10, amount: 100, date: now, description: 'مخزون اختبار', notes: 'اختبار', isLocked: false }];
db.auditLogs = [{ id: 1, userId: admin.id, userName: admin.fullName, action: 'تحديث', context: 'ORDERS', details: 'الطلب #34', timestamp: now }];
db.notifications = [{ id: 'notice-test', userId: admin.id, title: 'إشعار اختبار', message: 'رسالة اختبار', isRead: true, type: 'info', createdAt: now, actionUrl: '/test' }];
if (mobilePreview) {
  const messages = [
    ['قيد التحضير', 'بدأ تجهيز طلبك رقم 36. تقدر تتابع حالته من جدول الإنتاج.', 'info'],
    ['تم التجهيز', 'صار الطلب رقم 37 جاهز للاستلام.', 'success'],
    ['تحديث على الطلب', 'تم فتح تعديل الطلب رقم 34 من الإدارة.', 'warning']
  ];
  db.notifications.push(...Array.from({ length: 9 }, (_, index) => {
    const [title, message, type] = messages[index % messages.length];
    return { id: `mobile-notice-${index}`, userId: agent.id, title, message, type, isRead: index > 1, createdAt: now };
  }));
  db.notifications.forEach(notice => db.shownNotifications.add(notice.id));
}
db.factoryMaterialsStatus = 'ready';
db.vehicleConfig = { ...db.vehicleConfig, maintenanceMode: false, isSystemClosed: false, showProductionQueueToAgents: true, showPricesToAgents: true };
window.__testCalls = [];
for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(db))) {
  if (/^(add|update|delete|remove|create|save|set|send|verify|mark|upload|fetch|ensure|restore|login|logout|init)/.test(name)) db[name] = async (...args) => { window.__testCalls.push({ name, args }); return { id: 99, success: true, user: admin }; };
}
window.__fixtureDb = db;
if (mobilePreview) {
  db.updateProfile = async (id, data) => {
    window.__testCalls.push({ name: 'updateProfile', args: [id, data] });
    Object.assign(agent, data);
    db.notify();
    return { user: agent };
  };
}

class Boundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <pre data-testid="runtime-error">{String(this.state.error.stack)}</pre> : this.props.children; }
}
function Fixture() {
  const params = new URLSearchParams(location.search);
  const [tab, setTab] = useState(params.get('tab') || 'overview');
  const view = params.get('view') || 'admin';
  const name = params.get('page') || 'StaffLoginPage';
  const module = pages[`../../src/pages/${name}.tsx`];
  const PublicPage = module?.[name] || module?.default;
  const windows = { InventoryModal, ExpenseModal, LogisticsModal, SupplierModal, EditFinanceModal, InvoiceModal, ProductionConfirmationModal, AvatarCropModal };
  const Window = windows[name];
  return <LanguageProvider><ToastProvider><Boundary><div data-testid="page-content">
    {view === 'admin' && <AdminDashboard activeTab={tab} setActiveTab={setTab} />}
    {view === 'agent' && (mobilePreview ? <><Layout><AgentDashboard /></Layout><ToastContainer offsetMobileNavigation /></> : <AgentDashboard />)}
    {view === 'factory' && <FactoryDashboard />}
    {view === 'profile' && <ProfileTab onBack={() => {}} />}
    {view === 'notifications' && <div className="p-20 bg-blue-900"><NotificationBell /></div>}
    {view === 'window' && Window && <Window isOpen={true} order={db.orders[0]} onClose={() => {}} onCancel={() => {}} onSuccess={() => {}} onConfirm={() => {}} onCropComplete={() => {}}
      category={params.get('category') || 'DAILY_EXPENSE'} transaction={name === 'EditFinanceModal' || params.get('editing') ? { ...db.factoryTransactions[0], amount: 100, paidAmount: 20, paymentHistory: [], category: params.get('category') || 'DAILY_EXPENSE' } : undefined}
      imageSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='blue'/%3E%3C/svg%3E" />}
    {view === 'public' && PublicPage && <PublicPage onBack={() => {}} onSuccess={() => {}} onNavigate={() => {}} onLogin={() => {}} onSwitchToAgent={() => {}} onForgotPassword={() => {}} title="اختبار" message="اختبار" />}
  </div></Boundary></ToastProvider></LanguageProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture />);

