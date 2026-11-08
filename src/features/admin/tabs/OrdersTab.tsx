import { getProductFamily, getProductUnit, isUnitPricedProduct } from '../../../lib/productFamilies';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Eye, Edit, Wallet, AlertCircle, Hourglass, Activity, Filter, ChevronDown,
    Plus, Trash2, Banknote, ShoppingBag, CreditCard, Clock, Send, X, Save, Box, Layers,
    ChevronLeft, CheckCircle2, Package, PlayCircle, ArrowRightLeft, TrendingUp, Info,
    ShoppingCart, Calculator, MapPin, Ruler, History, Tag, Percent, Lock, ShieldCheck,
    LockKeyhole, UnlockKeyhole, User, Sparkles, MessageSquare, RotateCcw, PenTool, DollarSign
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
import { sortOrderItemsByProductCode } from '../../../lib/orderItems';
import { getAdjustedProductPrices } from '../../../lib/pricing';

interface SpecialItemRow {
    id: string;
    note: string;
    qty: string;
    price: string;
}

type PriceEditScope = 'edit' | 'manual';
type PriceField = 'unitPriceCarton' | 'unitPriceMeter';
type PriceEditTarget = { scope: PriceEditScope; index: number; field: PriceField } | null;
type PriceTrackedOrderItem = OrderItem & { priceAdjustmentNote?: string };

const PRICE_CHANGE_PERCENTAGES = [5, 10];

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
    const [editingOrderItems, setEditingOrderItems] = useState<PriceTrackedOrderItem[]>([]);
    const [priceEditTarget, setPriceEditTarget] = useState<PriceEditTarget>(null);
    const [editCustomPricePercentage, setEditCustomPricePercentage] = useState('');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
    const [editSearch, setEditSearch] = useState('');
    const [editSearchType, setEditSearchType] = useState<'STYROFOAM' | 'ADHESIVE' | 'PAINT'>('STYROFOAM');
    const [paymentModal, setPaymentModal] = useState<{ order: Order | null, amount: string, editingPaymentId: number | null, editAmount: string }>({ order: null, amount: '', editingPaymentId: null, editAmount: '' });

    // Edit Order Special Request Repeater
    const [editSpecialModal, setEditSpecialModal] = useState(false);
    const [editSpecialItems, setEditSpecialItems] = useState<SpecialItemRow[]>([
        { id: Math.random().toString(), note: '', qty: '0', price: '0' }
    ]);

    // Production Confirmation State
    const [productionConfirmationOrder, setProductionConfirmationOrder] = useState<Order | null>(null);
    const [showPricingErrorModal, setShowPricingErrorModal] = useState(false);
    const [deleteAttemptOrder, setDeleteAttemptOrder] = useState<Order | null>(null);

    // Unlocked Orders (temporary UI-only unlock, production status stays COMPLETED)
    const [unlockedOrders, setUnlockedOrders] = useState<Set<number>>(new Set());

    // Manual Order State
    const [manualOrderModal, setManualOrderModal] = useState(false);
    const [manualOrderAgentId, setManualOrderAgentId] = useState<number | 'ALL'>('ALL');
    const [manualOrderItems, setManualOrderItems] = useState<any[]>([]);
    const [manualDiscount, setManualDiscount] = useState<number>(0);
    const [manualDiscountType, setManualDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
    const [manualOrderSearch, setManualOrderSearch] = useState('');
    const [manualOrderSearchType, setManualOrderSearchType] = useState<'STYROFOAM' | 'ADHESIVE' | 'PAINT'>('STYROFOAM');
    const [manualCustomPricePercentage, setManualCustomPricePercentage] = useState('');

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

    const searchDateFilteredOrders = useMemo(() => {
        return orders.filter((o: any) => {
            const matchesSearch = o.id.toString().includes(orderSearch) || o.agentName.includes(orderSearch);
            if (!matchesSearch) return false;
            if (!isDateInRange(o.createdAt, ordersFromDate, ordersToDate)) return false;
            return true;
        });
    }, [orders, orderSearch, ordersFromDate, ordersToDate, isDateInRange]);

    const filteredOrders = useMemo(() => {
        return searchDateFilteredOrders.filter((o: any) => {
            if (activeFilter.type === 'PAYMENT' && activeFilter.value) { if (o.paymentStatus !== activeFilter.value) return false; }
            if (activeFilter.type === 'PRODUCTION' && activeFilter.value) {
                if (activeFilter.value === ProductionStatus.PENDING_TRANSFER) {
                    return o.productionStatus === ProductionStatus.PENDING_TRANSFER || o.productionStatus === ProductionStatus.PENDING_PAYMENT;
                }
                if (o.productionStatus !== activeFilter.value) return false;
            }
            return true;
        });
    }, [searchDateFilteredOrders, activeFilter]);

    const handleManualRefresh = () => {
        setIsLoading(true);
        db.fetchOrders().then(() => {
            setTimeout(() => setIsLoading(false), 500);
        });
    };

    const currentOrders = filteredOrders.slice(ordersPage * ordersRowsPerPage, (ordersPage + 1) * ordersRowsPerPage);

    const stats = useMemo(() => {
        const sumAmount = (items: any[]) => items.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
        const pendingTransferOrders = searchDateFilteredOrders.filter((o: any) => o.productionStatus === ProductionStatus.PENDING_TRANSFER || o.productionStatus === ProductionStatus.PENDING_PAYMENT);
        const waitingOrders = searchDateFilteredOrders.filter((o: any) => o.productionStatus === ProductionStatus.WAITING);
        const inProgressOrders = searchDateFilteredOrders.filter((o: any) => o.productionStatus === ProductionStatus.IN_PROGRESS);
        const completedOrders = searchDateFilteredOrders.filter((o: any) => o.productionStatus === ProductionStatus.COMPLETED);

        return {
            total: searchDateFilteredOrders.length,
            totalAmount: sumAmount(searchDateFilteredOrders),
            debt: searchDateFilteredOrders.filter((o: any) => o.paymentStatus === PaymentStatus.PENDING).length,
            partial: searchDateFilteredOrders.filter((o: any) => o.paymentStatus === PaymentStatus.PARTIALLY_PAID).length,
            paid: searchDateFilteredOrders.filter((o: any) => o.paymentStatus === PaymentStatus.PAID).length,
            pendingTransfer: pendingTransferOrders.length,
            pendingTransferAmount: sumAmount(pendingTransferOrders),
            waiting: waitingOrders.length,
            waitingAmount: sumAmount(waitingOrders),
            inProgress: inProgressOrders.length,
            inProgressAmount: sumAmount(inProgressOrders),
            completed: completedOrders.length,
            completedAmount: sumAmount(completedOrders)
        };
    }, [searchDateFilteredOrders]);

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
        const isUnlocked = unlockedOrders.has(order.id);
        if (order.productionStatus === ProductionStatus.COMPLETED && order.paymentStatus === PaymentStatus.PAID && !isUnlocked) {
            toast.warning('فاتورة مغلقة', 'هذا الطلب مكتمل ومسدد بالكامل، لا يمكن تعديله نهائياً.');
            return;
        }
        setEditingOrder(order);
        setEditingOrderItems(sortOrderItemsByProductCode(JSON.parse(JSON.stringify(order.items))));
        setDiscountValue(order.discountValue || 0);
        setDiscountType(order.discountType || 'FIXED');
        setEditSearch('');
    };

    const canToggleAgentEdit = (order: Order) => {
        return order.productionStatus === ProductionStatus.PENDING_TRANSFER || order.productionStatus === ProductionStatus.PENDING_PAYMENT;
    };

    const handleToggleAgentEdit = async (order: Order) => {
        if (!currentUser) return;
        try {
            const nextValue = !order.agentEditUnlocked;
            await db.setOrderAgentEditUnlocked(currentUser.id, order.id, nextValue);
            toast.success(nextValue ? 'تم فتح تعديل الوكيل' : 'تم قفل تعديل الوكيل');
        } catch (err: any) {
            toast.error(err.message || 'تعذر تحديث صلاحية تعديل الوكيل');
        }
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

    const handleSaveOrderChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingOrder) {
            try {
                const canEditCompletedQuantities = userPermissions?.includes('UNLOCK_ORDERS') && unlockedOrders.has(editingOrder.id);
                const isCompletedWithoutUnlock = editingOrder.productionStatus === ProductionStatus.COMPLETED && !canEditCompletedQuantities;
                const originalItems = sortOrderItemsByProductCode(editingOrder.items);
                const quantityChanged = editingOrderItems.some((item, idx) => {
                    const original = originalItems[idx];
                    return !original || original.quantityCartons !== item.quantityCartons || original.quantityMeters !== item.quantityMeters;
                });

                if (isCompletedWithoutUnlock && quantityChanged) {
                    toast.warning('الطلب مقفول', 'افتح القفل أولاً حتى تقدر تعدل الكمية.');
                    return;
                }

                const updatedItemsSimple = editingOrderItems.map(i => ({
                    productId: i.productId,
                    qMeters: i.quantityMeters,
                    qCartons: i.quantityCartons,
                    isSpecialRequest: i.isSpecialRequest,
                    specialRequestNote: i.specialRequestNote,
                    unitPriceCarton: i.unitPriceCarton,
                    unitPriceMeter: i.unitPriceMeter,
                    priceAdjustmentNote: i.priceAdjustmentNote
                }));
                await db.updateOrder(currentUser!.id, editingOrder.id, updatedItemsSimple, 0, Number(discountValue), discountType);
                toast.success('تم حفظ التغييرات بنجاح');
                setEditingOrder(null);
            } catch (e: any) { toast.error(e.message); }
        }
    };

    const openPaymentModal = (order: Order) => {
        setPaymentModal({ order, amount: '', editingPaymentId: null, editAmount: '' });
    };

    const refreshPaymentModalOrder = (orderId: Order['id']) => {
        const updatedOrder = db.orders.find(o => o.id == orderId) as Order | undefined;
        if (updatedOrder) {
            setPaymentModal({ order: updatedOrder, amount: '', editingPaymentId: null, editAmount: '' });
        } else {
            setPaymentModal({ order: null, amount: '', editingPaymentId: null, editAmount: '' });
        }
    };

    const handleSaveInvoicePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        const order = paymentModal.order;
        if (!order) return;

        const paymentAddition = Number(paymentModal.amount || 0);
        const remainingAmount = Math.max((order.totalAmount || 0) - (order.paidAmount || 0), 0);

        if (Number.isNaN(paymentAddition) || paymentAddition <= 0) {
            toast.error('مبلغ الواصل غير صحيح');
            return;
        }

        if (paymentAddition > remainingAmount) {
            toast.warning('مبلغ الواصل أكبر من المتبقي', `المتبقي على الفاتورة هو $${remainingAmount.toLocaleString()} فقط.`);
            return;
        }

        try {
            const unchangedItems = order.items.map(i => ({
                productId: i.productId,
                qMeters: i.quantityMeters,
                qCartons: i.quantityCartons,
                isSpecialRequest: i.isSpecialRequest,
                specialRequestNote: i.specialRequestNote,
                unitPriceCarton: i.unitPriceCarton,
                unitPriceMeter: i.unitPriceMeter,
                priceAdjustmentNote: i.priceAdjustmentNote
            }));

            await db.updateOrder(currentUser!.id, order.id, unchangedItems, paymentAddition, order.discountValue || 0, order.discountType || 'FIXED');
            toast.success('تم تسجيل الواصل بنجاح');
            refreshPaymentModalOrder(order.id);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleEditPayment = async (paymentId: number) => {
        const order = paymentModal.order;
        if (!order) return;

        const nextAmount = Number(paymentModal.editAmount || 0);
        if (Number.isNaN(nextAmount) || nextAmount <= 0) {
            toast.error('مبلغ الدفعة غير صحيح');
            return;
        }

        const otherPaymentsTotal = (order.paymentHistory || [])
            .filter(pay => pay.id !== paymentId)
            .reduce((sum, pay) => sum + (Number(pay.amountAdded) || 0), 0);

        if (otherPaymentsTotal + nextAmount > order.totalAmount) {
            toast.warning('مجموع الدفعات أكبر من الفاتورة', `أقصى مبلغ ممكن لهذه الدفعة هو $${Math.max(order.totalAmount - otherPaymentsTotal, 0).toLocaleString()}.`);
            return;
        }

        try {
            const nextHistory = (order.paymentHistory || []).map(pay =>
                pay.id === paymentId
                    ? { ...pay, amountAdded: nextAmount, note: pay.note || 'تعديل دفعة' }
                    : pay
            );
            await db.updateOrderPaymentHistory(currentUser!.id, order.id, nextHistory);
            toast.success('تم تعديل الدفعة');
            refreshPaymentModalOrder(order.id);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        const order = paymentModal.order;
        if (!order) return;

        try {
            const nextHistory = (order.paymentHistory || []).filter(pay => pay.id !== paymentId);
            await db.updateOrderPaymentHistory(currentUser!.id, order.id, nextHistory);
            toast.success('تم حذف الدفعة');
            refreshPaymentModalOrder(order.id);
        } catch (err: any) {
            toast.error(err.message);
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
            const prices = getAdjustedProductPrices(prodDetails, agent.agentDetails);
            const newItem: OrderItem = {
                id: Date.now(), productId: p.id, productCode: p.code, productName: p.name, productPaintType: p.paintType, productDimensions: p.dimensions,
                quantityCartons: 1, quantityMeters: 0, unitPriceCarton: prices.pricePerCarton,
                unitPriceMeter: prices.pricePerMeter, totalPrice: prices.pricePerCarton,
                priceAdjustmentNote: prices.increasePercent > 0 ? `زيادة ${prices.increasePercent}%` : undefined
            };
            setEditingOrderItems(prev => sortOrderItemsByProductCode([...prev, newItem]));
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

        setEditingOrderItems(prev => sortOrderItemsByProductCode([...prev, ...newItems]));
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

    const recalculateItemTotal = <T extends Pick<OrderItem, 'quantityCartons' | 'quantityMeters' | 'unitPriceCarton' | 'unitPriceMeter' | 'totalPrice'>>(item: T): T => ({
        ...item,
        totalPrice: (Number(item.quantityCartons) * Number(item.unitPriceCarton)) + (Number(item.quantityMeters) * Number(item.unitPriceMeter || 0))
    });

    const cleanPrice = (value: string | number) => Math.max(0, Number(value) || 0);
    const roundPrice = (value: number) => Math.round(value * 100) / 100;

    const updateItemPrice = <T extends PriceTrackedOrderItem>(items: T[], index: number, field: PriceField, value: string | number): T[] => {
        return items.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            return recalculateItemTotal({
                ...item,
                [field]: cleanPrice(value),
                priceAdjustmentNote: 'سعر يدوي'
            });
        });
    };

    const applyPricePercentage = <T extends PriceTrackedOrderItem>(items: T[], percentage: number): T[] => {
        const multiplier = 1 + (percentage / 100);
        return items.map(item => {
            if (item.isSpecialRequest) return item;
            return recalculateItemTotal({
                ...item,
                unitPriceCarton: roundPrice(Number(item.unitPriceCarton || 0) * multiplier),
                unitPriceMeter: item.unitPriceMeter > 0 ? roundPrice(Number(item.unitPriceMeter) * multiplier) : item.unitPriceMeter,
                priceAdjustmentNote: `زيادة ${percentage}%`
            });
        });
    };

    const hasRegularItems = (items: PriceTrackedOrderItem[]) => items.some(item => !item.isSpecialRequest);

    const applyEditPricePercentage = (percentage: number) => {
        if (!hasRegularItems(editingOrderItems)) {
            toast.info('لا توجد منتجات عادية لتغيير أسعارها');
            return;
        }
        setEditingOrderItems(prev => applyPricePercentage(prev, percentage));
        setPriceEditTarget(null);
        toast.success(`تمت زيادة أسعار المنتجات ${percentage}%`);
    };

    const applyCustomEditPricePercentage = () => {
        const percentage = Number(editCustomPricePercentage);
        if (Number.isNaN(percentage) || percentage <= 0) {
            toast.error('يرجى إدخال نسبة صحيحة');
            return;
        }
        applyEditPricePercentage(percentage);
        setEditCustomPricePercentage('');
    };

    const applyManualPricePercentage = (percentage: number) => {
        if (!hasRegularItems(manualOrderItems)) {
            toast.info('لا توجد منتجات عادية لتغيير أسعارها');
            return;
        }
        setManualOrderItems(prev => applyPricePercentage(prev, percentage));
        setPriceEditTarget(null);
        toast.success(`تمت زيادة أسعار المنتجات ${percentage}%`);
    };

    const applyCustomManualPricePercentage = () => {
        const percentage = Number(manualCustomPricePercentage);
        if (Number.isNaN(percentage) || percentage <= 0) {
            toast.error('يرجى إدخال نسبة صحيحة');
            return;
        }
        applyManualPricePercentage(percentage);
        setManualCustomPricePercentage('');
    };

    const handlePriceInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.currentTarget.blur();
        }
    };

    const getOrderPriceAdjustmentTooltip = (order: Order) => {
        const notes = Array.from(new Set(
            order.items
                .map(item => {
                    if (item.priceAdjustmentNote) return item.priceAdjustmentNote;
                    if (item.isSpecialRequest) return '';

                    const product = products.find((p: Product) => p.id == item.productId);
                    const agent = agents.find((u: any) => u.id == order.agentId);
                    const agentType = agent?.agentDetails?.type;
                    const prices = product && agentType ? product.prices?.[agentType] : null;
                    if (!prices) return '';

                    const cartonChanged = Math.abs(Number(item.unitPriceCarton || 0) - Number(prices.pricePerCarton || 0)) > 0.01;
                    const meterChanged = Number(item.unitPriceMeter || 0) > 0 && Math.abs(Number(item.unitPriceMeter || 0) - Number(prices.pricePerMeter || 0)) > 0.01;
                    return cartonChanged || meterChanged ? 'سعر يدوي' : '';
                })
                .filter((note): note is string => Boolean(note))
        ));

        if (notes.length === 0) return '';
        if (notes.length === 1) return notes[0];
        return `تحتوي القائمة على أسعار معدلة: ${notes.join('، ')}`;
    };

    const productsForEdit = useMemo(() => {
        if (!editSearch.trim()) return [];
        return products.filter((p: any) => {
            const matchesCode = [p.code,p.name,p.paintType,p.dimensions].join(' ').toLowerCase().includes(editSearch.toLowerCase());
            if (!matchesCode) return false;

            const categoryType = db.categories.find((c: any) => c.name === p.category)?.type;

            return categoryType === editSearchType;
        });
    }, [products, editSearch, editSearchType]);

    const currentSubtotal = useMemo(() => editingOrderItems.reduce((s, i) => s + (i.totalPrice || 0), 0), [editingOrderItems]);
    const currentActualDiscount = useMemo(() => discountType === 'PERCENT' ? (currentSubtotal * discountValue / 100) : discountValue, [currentSubtotal, discountValue, discountType]);
    const currentFinalTotal = currentSubtotal - currentActualDiscount;
    const paymentOrder = paymentModal.order;
    const paymentRemainingAmount = paymentOrder ? Math.max((paymentOrder.totalAmount || 0) - (paymentOrder.paidAmount || 0), 0) : 0;
    const paymentRemainingAfterAddition = paymentOrder ? Math.max((paymentOrder.totalAmount || 0) - ((paymentOrder.paidAmount || 0) + Number(paymentModal.amount || 0)), 0) : 0;
    const paymentPaidRatio = paymentOrder && paymentOrder.totalAmount > 0 ? Math.min(100, Math.round(((paymentOrder.paidAmount || 0) / paymentOrder.totalAmount) * 100)) : 0;

    // --- Manual Order Helper Functions ---
    const productsForManual = useMemo(() => {
        if (!manualOrderSearch.trim()) return [];
        return products.filter((p: any) => {
            const matchesSearch = [p.code,p.name,p.paintType,p.dimensions].join(' ').toLowerCase().includes(manualOrderSearch.toLowerCase());
            if (!matchesSearch) return false;
            // Check category type from database
            const categoryType = db.categories.find((c: any) => c.name === p.category)?.type;
            return categoryType === manualOrderSearchType;
        });
    }, [products, manualOrderSearch, manualOrderSearchType]);

    const addProductToManualOrder = (p: Product) => {
        const agent = agents.find((u: any) => u.id === manualOrderAgentId);
        if (!agent || !agent.agentDetails) { toast.error('يرجى اختيار الوكيل أولاً لتحديد الأسعار'); return; }

        const exists = manualOrderItems.find(i => i.productId === p.id);
        if (exists) { toast.info('المنتج موجود بالفعل في السلة'); return; }

        const prices = getAdjustedProductPrices(p, agent.agentDetails);
        const newItem = {
            id: Date.now(),
            productId: p.id,
            productCode: p.code, productName: p.name, productPaintType: p.paintType,
            productDimensions: p.dimensions,
            quantityCartons: 1,
            quantityMeters: 0,
            unitPriceCarton: prices.pricePerCarton,
            unitPriceMeter: prices.pricePerMeter,
            totalPrice: prices.pricePerCarton,
            priceAdjustmentNote: prices.increasePercent > 0 ? `زيادة ${prices.increasePercent}%` : undefined,
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
            const newOrder = await db.createOrder(manualOrderAgentId, itemsPayload, 0, true, currentUser?.fullName, currentUser?.id);

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
            setManualOrderAgentId('ALL');
        } catch (err: any) { toast.error(err.message); }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2"><div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg border border-orange-100"><Activity size={14} /></div><h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">الموقف الإنتاجي للطلبات</h4></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                        {[
                            { id: 'ALL', label: 'الكل', val: stats.total, amount: stats.totalAmount, color: 'text-[#0e3c63]', bg: 'bg-blue-50', type: 'ALL', status: null, icon: ShoppingBag },
                            { id: 'P_TRANS', label: 'بانتظار ترحيل', val: stats.pendingTransfer, amount: stats.pendingTransferAmount, color: 'text-indigo-600', bg: 'bg-indigo-50', type: 'PRODUCTION', status: ProductionStatus.PENDING_TRANSFER, icon: PlayCircle },
                            { id: 'WAITING', label: 'في الانتظار', val: stats.waiting, amount: stats.waitingAmount, color: 'text-gray-600', bg: 'bg-gray-100', type: 'PRODUCTION', status: ProductionStatus.WAITING, icon: Clock },
                            { id: 'IN_PROG', label: 'قيد التحضير', val: stats.inProgress, amount: stats.inProgressAmount, color: 'text-blue-600', bg: 'bg-blue-50', type: 'PRODUCTION', status: ProductionStatus.IN_PROGRESS, icon: Activity },
                            { id: 'DONE', label: 'تم التجهيز', val: stats.completed, amount: stats.completedAmount, color: 'text-emerald-600', bg: 'bg-emerald-50', type: 'PRODUCTION', status: ProductionStatus.COMPLETED, icon: CheckCircle2 },
                        ].map(item => (
                            <button key={item.id} onClick={() => { setActiveFilter({ type: item.type as any, value: item.status }); setOrdersPage(0); }} className={`p-4 rounded-2xl border-2 transition-all text-right group relative overflow-hidden flex flex-col justify-between h-32 ${activeFilter.type === item.type && activeFilter.value === item.status ? 'bg-white border-[#0e3c63] shadow-xl scale-[1.05] z-10' : 'bg-white border-transparent hover:border-blue-100 shadow-sm'}`}><div className={`p-2 rounded-xl w-fit ${item.bg} ${item.color}`}><item.icon size={16} /></div><div><p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{item.label}</p><span className="text-xl font-black font-mono tracking-tighter text-gray-800">{item.val}</span><div className={`mt-1 text-[11px] font-black font-mono ${item.color}`}>${item.amount.toLocaleString()}</div></div></button>
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
                            <tr><th className="p-5 text-right rounded-tr-2xl">الطلب</th><th className="p-5 text-right">الوكيل</th><th className="p-5 text-right">المبلغ</th><th className="p-5 text-right">التاريخ</th><th className="p-5 text-right">التجهيز</th><th className="p-5 text-center rounded-tl-2xl">إجراء</th></tr>
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
                                        <td className="p-6"><div className="h-6 bg-gray-200 rounded-full w-16"></div></td>
                                        <td className="p-6"><div className="flex justify-center gap-2"><div className="w-10 h-10 bg-gray-200 rounded-xl"></div><div className="w-10 h-10 bg-gray-200 rounded-xl"></div></div></td>
                                    </tr>
                                ))
                            ) : currentOrders.map((o: any) => {
                                const isLocked = o.productionStatus === ProductionStatus.COMPLETED;
                                const isPaid = o.paymentStatus === PaymentStatus.PAID;
                                const priceAdjustmentTooltip = getOrderPriceAdjustmentTooltip(o);
                                return (
                                    <tr key={o.id} className="hover:bg-blue-50/40 transition-all">
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-black text-gray-400">#{o.id}</span>
                                                {priceAdjustmentTooltip && (
                                                    <Tooltip content={priceAdjustmentTooltip}>
                                                        <div className="p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm cursor-help">
                                                            <DollarSign size={12} />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                                {o.isManual && (
                                                    <Tooltip content={`تم إنشاء الطلب يدوياً بواسطة: ${o.manualBy || 'الإدارة'}`}>
                                                        <div className="p-1 rounded-md bg-amber-100 text-amber-600 animate-pulse shadow-sm cursor-help">
                                                            <PenTool size={12} />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                                {isLocked && (() => {
                                                    const canUnlock = userPermissions?.includes('UNLOCK_ORDERS');
                                                    const isUnlocked = unlockedOrders.has(o.id);
                                                    
                                                    if (isUnlocked) {
                                                        // Show re-lock button
                                                        return (
                                                            <Tooltip content="إعادة قفل الطلب">
                                                                <button 
                                                                    onClick={() => {
                                                                        setUnlockedOrders(prev => { const next = new Set(prev); next.delete(o.id); return next; });
                                                                        toast.info('تم إعادة قفل الطلب');
                                                                    }}
                                                                    className="p-1 flex items-center justify-center rounded-md text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer shadow-sm border border-emerald-200 transition-all animate-pulse"
                                                                >
                                                                    <ShieldCheck size={12} />
                                                                </button>
                                                            </Tooltip>
                                                        );
                                                    }

                                                    return (
                                                    <Tooltip content={canUnlock ? "انقر مرتين لفتح القفل مؤقتاً" : (isPaid ? "طلب مغلق نهائياً" : "طلب مكتمل - مسموح بالدفع فقط")}>
                                                        <button 
                                                            disabled={!canUnlock}
                                                            onDoubleClick={() => {
                                                                if (canUnlock) {
                                                                    setUnlockedOrders(prev => new Set(prev).add(o.id));
                                                                    toast.success('تم فتح القفل مؤقتاً! يمكنك الآن التعديل أو الحذف.');
                                                                }
                                                            }}
                                                            className={`p-1 flex items-center justify-center rounded-md ${canUnlock ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 cursor-pointer shadow-sm border border-amber-200' : (isPaid ? 'text-red-500 bg-red-50 cursor-not-allowed' : 'text-amber-500 bg-amber-50 cursor-not-allowed')} transition-all`}
                                                        >
                                                            <Lock size={12} />
                                                        </button>
                                                    </Tooltip>
                                                    );
                                                })()}
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
                                        <td className="p-6">
                                            <div className="font-mono font-black text-[#0e3c63] text-lg">${(o.totalAmount || 0).toLocaleString()}</div>
                                            <div className="font-mono text-[10px] text-emerald-600 font-bold">الواصل ${((o.paidAmount || 0)).toLocaleString()}</div>
                                        </td>
                                        <td className="p-6"><span className="font-bold text-gray-700 text-sm">{formatDate(o.createdAt)}</span></td>
                                        <td className="p-6"><Badge color={o.productionStatus === ProductionStatus.COMPLETED ? 'blue' : 'gray'}>{ProductionStatusLabels[o.productionStatus]}</Badge></td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center gap-2">
                                                <Tooltip content="معاينة الفاتورة">
                                                    <button onClick={() => onViewOrder(o)} className="w-10 h-10 flex items-center justify-center text-[#0e3c63] bg-white border border-gray-100 rounded-xl hover:bg-sky-50 shadow-sm transition-all" aria-label="معاينة الفاتورة">
                                                        <Eye size={20} />
                                                    </button>
                                                </Tooltip>
                                                {userPermissions.includes('EDIT_ORDERS') && (o.paidAmount || 0) < (o.totalAmount || 0) && (
                                                    <Tooltip content="دفع الفاتورة">
                                                        <button onClick={() => openPaymentModal(o)} className="w-10 h-10 flex items-center justify-center text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white shadow-sm transition-all" aria-label="دفع الفاتورة">
                                                            <CreditCard size={20} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {(o.productionStatus === ProductionStatus.PENDING_TRANSFER || o.productionStatus === ProductionStatus.PENDING_PAYMENT) && userPermissions.includes('EDIT_PRODUCTION') && (
                                                    <Tooltip content="ترحيل للإنتاج">
                                                        <button onClick={() => { if (validateOrderForProduction(o)) setProductionConfirmationOrder(o); }} className="w-10 h-10 flex items-center justify-center text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white shadow-sm transition-all animate-pulse" aria-label="ترحيل للإنتاج">
                                                            <PlayCircle size={20} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {userPermissions.includes('EDIT_ORDERS') && canToggleAgentEdit(o) && (
                                                    <Tooltip content={o.agentEditUnlocked ? 'قفل تعديل الوكيل' : 'فتح تعديل الوكيل'}>
                                                        <button
                                                            onClick={() => handleToggleAgentEdit(o)}
                                                            className={`w-10 h-10 flex items-center justify-center rounded-xl border shadow-sm transition-all ${o.agentEditUnlocked ? 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-600 hover:text-white' : 'text-gray-500 bg-white border-gray-100 hover:bg-gray-900 hover:text-white'}`}
                                                            aria-label={o.agentEditUnlocked ? 'قفل تعديل الوكيل' : 'فتح تعديل الوكيل'}
                                                        >
                                                            {o.agentEditUnlocked ? <UnlockKeyhole size={20} /> : <LockKeyhole size={20} />}
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {userPermissions.includes('EDIT_ORDERS') && (!isLocked || unlockedOrders.has(o.id)) && (() => {
                                                    const isUnlocked = unlockedOrders.has(o.id);
                                                    const isDisabled = isLocked && isPaid && !isUnlocked;
                                                    return (
                                                    <Tooltip content={isDisabled ? "الطلب مغلق تماماً" : "تعديل الطلب"}>
                                                        <button onClick={() => handleOpenEditOrder(o)} disabled={isDisabled} className={`w-10 h-10 flex items-center justify-center rounded-xl border shadow-sm transition-all ${isDisabled ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' : 'text-blue-600 bg-white border-gray-100 hover:bg-blue-50'}`} aria-label="تعديل الطلب">
                                                            <Edit size={20} />
                                                        </button>
                                                    </Tooltip>
                                                    );
                                                })()}
                                                {userPermissions.includes('DELETE_ORDERS') && (o.productionStatus !== ProductionStatus.COMPLETED || unlockedOrders.has(o.id)) && (
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
                                                <div className="grid grid-cols-3 gap-3 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 flex-1">
                                                    <button onClick={() => setEditSearchType('STYROFOAM')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${editSearchType === 'STYROFOAM' ? 'bg-white text-[#0e3c63]' : 'text-gray-400'}`}><Box size={16} /> فلين</button>
                                                    <button onClick={() => setEditSearchType('ADHESIVE')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${editSearchType === 'ADHESIVE' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-400'}`}><Layers size={16} /> لاصق</button>
                                                    <button onClick={() => setEditSearchType('PAINT')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${editSearchType === 'PAINT' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-400'}`}><Layers size={16} /> أصباغ</button>
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
                                                            <div className="flex flex-col text-right"><span className="font-mono font-black text-gray-700 text-lg">{p.name || p.code}</span><span className="text-[10px] text-gray-400 font-bold">{p.dimensions}</span></div>
                                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><Plus size={18} /></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-2">
                                            <h4 className="font-black text-gray-500 text-[11px] uppercase tracking-widest">المواد في القائمة الحالية</h4>
                                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">{editingOrderItems.length} مادة</span>
                                        </div>
                                        {editingOrderItems.map((item, idx) => {
                                            const canEditCompletedQuantities = userPermissions?.includes('UNLOCK_ORDERS') && unlockedOrders.has(editingOrder.id);
                                            const isCompletedOrder = editingOrder.productionStatus === ProductionStatus.COMPLETED;
                                            const isDataLocked = isCompletedOrder;
                                            const canEditQuantities = !isCompletedOrder || canEditCompletedQuantities;
                                            const canEditPrices = !isCompletedOrder || canEditCompletedQuantities || editingOrder.paymentStatus !== PaymentStatus.PAID;
                                            const isCartonPriceEditing = priceEditTarget?.scope === 'edit' && priceEditTarget.index === idx && priceEditTarget.field === 'unitPriceCarton';
                                            const isMeterPriceEditing = priceEditTarget?.scope === 'edit' && priceEditTarget.index === idx && priceEditTarget.field === 'unitPriceMeter';
                                            const itemProduct = products.find((p: any) => String(p.id) === String(item.productId));
                                            const isAdhesiveItem = isUnitPricedProduct(itemProduct, db.categories);
                                            const itemFamily = getProductFamily(itemProduct, db.categories);
                                            const itemUnit = getProductUnit(itemProduct, db.categories);
                                            return (
                                                <div key={idx} className={`bg-white p-4 rounded-[1.5rem] border flex flex-col items-stretch shadow-sm gap-3 group transition-all ${isDataLocked ? 'border-gray-100 bg-gray-50/40 grayscale' : 'border-gray-200 hover:border-[#0e3c63]/30 hover:shadow-md'} ${item.isSpecialRequest ? 'bg-amber-50/70 border-amber-200' : ''}`}>
                                                    <div className="w-full text-right flex flex-wrap items-start justify-between gap-3 min-w-0">
                                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border font-mono font-black text-sm transition-all ${item.isSpecialRequest ? 'bg-amber-100 text-amber-700 border-amber-200' : (isDataLocked ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-[#0e3c63] text-white border-[#0e3c63] shadow-sm group-hover:bg-white group-hover:text-[#0e3c63]')}`}>
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2 min-w-0 pt-1.5">
                                                                {item.priceAdjustmentNote && (
                                                                    <Tooltip content={item.priceAdjustmentNote}>
                                                                        <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                                                                            <DollarSign size={14} />
                                                                        </span>
                                                                    </Tooltip>
                                                                )}
                                                                <span className="font-black text-[#0e3c63] block font-mono text-xl leading-7 whitespace-normal break-words">{item.productName || products.find((p: any) => String(p.id) === String(item.productId))?.name || item.productCode}</span>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 max-w-full">
                                                            <span className={`px-3 py-1.5 rounded-xl border text-[10px] font-black leading-5 whitespace-nowrap ${item.isSpecialRequest ? 'bg-amber-100 text-amber-700 border-amber-200' : (isAdhesiveItem ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-[#0e3c63] border-blue-100')}`}>
                                                                {item.isSpecialRequest ? 'طلب خاص' : (itemFamily === 'PAINT' ? 'أصباغ' : isAdhesiveItem ? 'مادة لاصقة' : 'فلين')}
                                                            </span>
                                                            <span className={`max-w-full px-3 py-1.5 rounded-xl border text-[10px] font-black leading-5 whitespace-normal break-words ${item.isSpecialRequest ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                                {item.isSpecialRequest ? 'وحدة إنتاج خاصة' : item.productDimensions}
                                                            </span>
                                                        </div>
                                                        {item.isSpecialRequest && <p className="basis-full text-[10px] text-amber-700 font-bold mt-1 bg-white/50 px-2 py-1 rounded w-fit max-w-full break-words whitespace-normal line-clamp-2">"{item.specialRequestNote}"</p>}
                                                    </div>

                                                    <div className={`w-full overflow-x-auto custom-scrollbar p-2 rounded-2xl border ${item.isSpecialRequest ? 'bg-white border-amber-100 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                                                        <div className="flex min-w-max items-end gap-2">

                                                            {/* Cartons Qty */}
                                                            <div className="text-center px-2 py-1 rounded-xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                                                <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">
                                                                    {item.isSpecialRequest ? 'الكمية' : itemUnit}
                                                                </label>
                                                                {!canEditQuantities ? <div className="w-14 p-2 bg-white border border-gray-100 rounded-xl text-center font-black text-lg text-gray-400 shadow-inner">{item.quantityCartons}</div> : <input type="number" min="0" className="w-20 p-2 bg-white border border-gray-200 rounded-xl text-center font-black text-lg focus:border-[#0e3c63] outline-none" value={item.quantityCartons} onChange={(e) => { const n = [...editingOrderItems]; n[idx].quantityCartons = Math.max(0, Number(e.target.value)); n[idx].totalPrice = (n[idx].quantityCartons * n[idx].unitPriceCarton) + (n[idx].quantityMeters * (n[idx].unitPriceMeter || 0)); setEditingOrderItems(n); }} />}
                                                            </div>

                                                            {/* Price - Unit/Carton */}
                                                            <div className="text-center px-2 py-1 rounded-xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                                                <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">السعر</label>
                                                                {canEditPrices && (item.isSpecialRequest || isCartonPriceEditing) ? (
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            autoFocus={isCartonPriceEditing}
                                                                            className={`w-24 p-2 bg-white border-2 rounded-xl text-center font-black text-lg outline-none shadow-sm ${item.isSpecialRequest ? 'border-amber-200 text-amber-700 focus:border-amber-500' : 'border-blue-200 text-[#0e3c63] focus:border-[#0e3c63]'}`}
                                                                            value={item.unitPriceCarton}
                                                                            onBlur={() => setPriceEditTarget(null)}
                                                                            onKeyDown={handlePriceInputKeyDown}
                                                                            onChange={(e) => {
                                                                                setEditingOrderItems(prev => updateItemPrice(prev, idx, 'unitPriceCarton', e.target.value));
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={!canEditPrices}
                                                                        onDoubleClick={() => canEditPrices && setPriceEditTarget({ scope: 'edit', index: idx, field: 'unitPriceCarton' })}
                                                                        className={`h-10 min-w-24 px-2 flex items-center justify-center font-mono font-black text-lg rounded-xl transition-all ${canEditPrices ? 'text-gray-600 hover:bg-blue-50 hover:text-[#0e3c63] cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                                                                        title="دبل كلك لتعديل السعر"
                                                                    >
                                                                        ${item.unitPriceCarton}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Meters Logic - Only for Normal Items */}
                                                            {!item.isSpecialRequest && item.unitPriceMeter > 0 && (
                                                                <>
                                                                    <div className="text-center px-2 py-1 rounded-xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                                                        <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">أمتار</label>
                                                                        {!canEditQuantities ? <div className="w-14 p-2 bg-white border border-gray-100 rounded-xl text-center font-black text-lg text-gray-400 shadow-inner">{item.quantityMeters}</div> : <input type="number" min="0" className="w-20 p-2 bg-white border border-gray-200 rounded-xl text-center font-black text-lg focus:border-[#0e3c63] outline-none" value={item.quantityMeters} onChange={(e) => { const n = [...editingOrderItems]; n[idx].quantityMeters = Math.max(0, Number(e.target.value)); n[idx].totalPrice = (n[idx].quantityCartons * n[idx].unitPriceCarton) + (n[idx].quantityMeters * n[idx].unitPriceMeter); setEditingOrderItems(n); }} />}
                                                                    </div>

                                                                    <div className="text-center px-2 py-1 rounded-xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                                                        <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">سعر المتر</label>
                                                                        {canEditPrices && isMeterPriceEditing ? (
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                autoFocus
                                                                                className="w-24 p-2 bg-white border-2 border-blue-200 rounded-xl text-center font-black text-lg text-[#0e3c63] focus:border-[#0e3c63] outline-none shadow-sm"
                                                                                value={item.unitPriceMeter}
                                                                                onBlur={() => setPriceEditTarget(null)}
                                                                                onKeyDown={handlePriceInputKeyDown}
                                                                                onChange={(e) => {
                                                                                    setEditingOrderItems(prev => updateItemPrice(prev, idx, 'unitPriceMeter', e.target.value));
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                disabled={!canEditPrices}
                                                                                onDoubleClick={() => canEditPrices && setPriceEditTarget({ scope: 'edit', index: idx, field: 'unitPriceMeter' })}
                                                                                className={`h-10 min-w-24 px-2 flex items-center justify-center font-mono font-black text-lg rounded-xl transition-all ${canEditPrices ? 'text-gray-600 hover:bg-blue-50 hover:text-[#0e3c63] cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                                                                                title="دبل كلك لتعديل سعر المتر"
                                                                            >
                                                                                ${item.unitPriceMeter}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="text-center min-w-[112px] px-2 py-1 rounded-xl bg-emerald-50 border border-emerald-100 shadow-[0_1px_2px_rgba(16,185,129,0.08)]">
                                                                <span className="text-[8px] text-gray-400 block font-black uppercase mb-1">الإجمالي</span>
                                                                <span className="h-10 px-2 font-mono font-black text-xl text-emerald-600 flex items-center justify-center">${(item.totalPrice || 0).toLocaleString()}</span>
                                                            </div>
                                                            {!isDataLocked && <button onClick={() => setEditingOrderItems(prev => prev.filter((_, i) => i !== idx))} className="p-2.5 h-12 w-12 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"><Trash2 size={20} /></button>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-[#0e3c63] rounded-[2.5rem] p-8 text-white shadow-2xl sticky top-0 border-b-8 border-blue-400">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-3 bg-white/10 rounded-2xl"><Banknote size={24} /></div>
                                            <h4 className="font-black text-lg">الموقف المالي النهائي</h4>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">المجموع قبل الخصم</p>
                                                <h2 className="text-3xl font-black font-mono text-white opacity-60">${currentSubtotal.toLocaleString()}</h2>
                                            </div>
                                            <div className="space-y-4 p-5 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingUp size={40} /></div>
                                                <label className="block text-[10px] font-black text-blue-200 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} /> زيادة أسعار المنتجات</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {PRICE_CHANGE_PERCENTAGES.map(percent => (
                                                        <button
                                                            key={percent}
                                                            type="button"
                                                            disabled={!hasRegularItems(editingOrderItems)}
                                                            onClick={() => applyEditPricePercentage(percent)}
                                                            className="h-11 rounded-xl bg-white/10 border border-white/10 text-white font-black font-mono text-sm hover:bg-white hover:text-[#0e3c63] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            {percent}%+
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editCustomPricePercentage}
                                                            onChange={e => setEditCustomPricePercentage(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    applyCustomEditPricePercentage();
                                                                }
                                                            }}
                                                            className="w-full h-11 bg-white/10 border border-white/10 rounded-xl px-4 pl-9 font-black font-mono text-white outline-none focus:bg-white/20"
                                                            placeholder="نسبة مخصصة"
                                                        />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-black">%</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={!hasRegularItems(editingOrderItems)}
                                                        onClick={applyCustomEditPricePercentage}
                                                        className="h-11 px-4 rounded-xl bg-blue-400 text-[#0e3c63] font-black text-xs hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        تطبيق الزيادة
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={`space-y-4 p-5 rounded-3xl border relative overflow-hidden transition-all ${editingOrder.productionStatus === ProductionStatus.COMPLETED ? 'bg-gray-900/20 border-white/5 opacity-50' : 'bg-white/5 border-white/10'}`}>
                                                <div className="absolute top-0 right-0 p-2 opacity-10"><Tag size={40} /></div>
                                                <label className="block text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-2"><Percent size={14} /> نظام خصم القائمة</label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 relative">
                                                        <input disabled={editingOrder.productionStatus === ProductionStatus.COMPLETED} type="number" value={discountValue} onChange={e => setDiscountValue(Math.max(0, Number(e.target.value)))} className="w-full h-12 bg-white/10 border border-white/10 rounded-xl px-4 font-black font-mono text-white outline-none focus:bg-white/20 disabled:cursor-not-allowed" placeholder="0" />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-black">{discountType === 'PERCENT' ? '%' : '$'}</span>
                                                    </div>
                                                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                                                        <button type="button" disabled={editingOrder.productionStatus === ProductionStatus.COMPLETED} onClick={() => setDiscountType('FIXED')} className={`px-3 rounded-lg text-[10px] font-black transition-all ${discountType === 'FIXED' ? 'bg-white text-[#0e3c63]' : 'text-blue-200'}`}>مبلغ</button>
                                                        <button type="button" disabled={editingOrder.productionStatus === ProductionStatus.COMPLETED} onClick={() => setDiscountType('PERCENT')} className={`px-3 rounded-lg text-[10px] font-black transition-all ${discountType === 'PERCENT' ? 'bg-white text-[#0e3c63]' : 'text-blue-200'}`}>%</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-emerald-400/10 p-5 rounded-2xl border border-emerald-400/20 text-center">
                                                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">الصافي النهائي للمطالبة</p>
                                                <h2 className="text-4xl font-black font-mono text-emerald-400 tracking-tighter">${currentFinalTotal.toLocaleString()}</h2>
                                            </div>
                                            <Button onClick={handleSaveOrderChanges} className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-black rounded-2xl shadow-xl transition-all group flex items-center justify-center gap-3"><Save size={22} /> حفظ وإرسال التحديث</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- INVOICE PAYMENT MODAL --- */}
            {paymentOrder && (
                <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md z-[360] flex items-center justify-center p-4 !mt-0">
                    <form onSubmit={handleSaveInvoicePayment} className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-6 bg-[#0e3c63] text-white flex justify-between items-start gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-inner shrink-0"><CreditCard size={24} /></div>
                                <div>
                                    <h3 className="font-black text-2xl leading-tight">دفع الفاتورة <span className="font-mono text-blue-200">#{paymentOrder.id}</span></h3>
                                    <p className="text-[11px] font-bold text-blue-200 mt-1">وكيل: {paymentOrder.agentName} - {paymentOrder.agentProvince}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setPaymentModal({ order: null, amount: '', editingPaymentId: null, editAmount: '' })} className="bg-white/10 hover:bg-red-500 p-3 rounded-2xl transition-all shadow-inner">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 bg-gray-50 space-y-5">
                            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-5 space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نسبة التسديد</p>
                                        <h4 className="font-mono font-black text-3xl text-[#0e3c63] mt-1">{paymentPaidRatio}%</h4>
                                    </div>
                                    <Badge color={paymentRemainingAmount <= 0 ? 'green' : 'yellow'}>
                                        {paymentRemainingAmount <= 0 ? 'مسدد بالكامل' : 'باقي دين'}
                                    </Badge>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${paymentPaidRatio}%` }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">قيمة الفاتورة</p>
                                    <div className="font-mono font-black text-[#0e3c63]">${(paymentOrder.totalAmount || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">الواصل الحالي</p>
                                    <div className="font-mono font-black text-emerald-700">${(paymentOrder.paidAmount || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">المتبقي</p>
                                    <div className="font-mono font-black text-amber-700">${paymentRemainingAmount.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 mr-1">مبلغ واصل جديد</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={paymentRemainingAmount}
                                        value={paymentModal.amount}
                                        onChange={e => setPaymentModal(prev => ({ ...prev, amount: e.target.value }))}
                                        disabled={paymentRemainingAmount <= 0}
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 font-black font-mono text-gray-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="0"
                                        autoFocus
                                    />
                                </div>
                                <div className="bg-[#0e3c63] text-white rounded-2xl p-4 min-w-[170px] shadow-lg">
                                    <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">المتبقي بعد الواصل</p>
                                    <div className="font-mono font-black text-lg">${paymentRemainingAfterAddition.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h4 className="font-black text-gray-700 text-sm">سجل الدفعات</h4>
                                    <span className="text-[10px] font-black text-gray-400">{(paymentOrder.paymentHistory || []).length} دفعة</span>
                                </div>
                                {(paymentOrder.paymentHistory || []).length === 0 ? (
                                    <div className="h-24 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">لا توجد دفعات مسجلة</div>
                                ) : (
                                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                                        {[...(paymentOrder.paymentHistory || [])].reverse().map(pay => {
                                            const isEditing = paymentModal.editingPaymentId === pay.id;
                                            return (
                                                <div key={pay.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center bg-gray-50 rounded-2xl px-3 py-3 border border-gray-100">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Banknote size={18} /></div>
                                                        <div className="min-w-0">
                                                            <span className="font-black text-gray-700 block truncate">{pay.addedBy || 'مستخدم'}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold">{formatDate(pay.date)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={paymentModal.editAmount}
                                                                    onChange={e => setPaymentModal(prev => ({ ...prev, editAmount: e.target.value }))}
                                                                    className="w-28 h-10 bg-white border-2 border-emerald-100 rounded-xl px-3 text-center font-mono font-black text-gray-800 outline-none focus:border-emerald-500"
                                                                />
                                                                <button type="button" onClick={() => handleEditPayment(pay.id)} className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all" title="حفظ تعديل الدفعة">
                                                                    <Save size={16} />
                                                                </button>
                                                                <button type="button" onClick={() => setPaymentModal(prev => ({ ...prev, editingPaymentId: null, editAmount: '' }))} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all" title="إلغاء التعديل">
                                                                    <X size={16} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="font-mono font-black text-emerald-600 min-w-[90px] text-left">${pay.amountAdded.toLocaleString()}</span>
                                                                <button type="button" onClick={() => setPaymentModal(prev => ({ ...prev, editingPaymentId: pay.id, editAmount: String(pay.amountAdded) }))} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all" title="تعديل الدفعة">
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button type="button" onClick={() => handleDeletePayment(pay.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all" title="حذف الدفعة">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <Button type="submit" disabled={paymentRemainingAmount <= 0} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl">
                                <Save size={20} /> حفظ الواصل
                            </Button>
                        </div>
                    </form>
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
                                            <div className="grid grid-cols-3 gap-3 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 flex-1">
                                                <button onClick={() => setManualOrderSearchType('STYROFOAM')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${manualOrderSearchType === 'STYROFOAM' ? 'bg-white text-[#0e3c63] shadow-sm' : 'text-gray-400'}`}><Box size={16} /> فلين</button>
                                                <button onClick={() => setManualOrderSearchType('ADHESIVE')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${manualOrderSearchType === 'ADHESIVE' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}><Layers size={16} /> لاصق</button>
                                                <button onClick={() => setManualOrderSearchType('PAINT')} className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${manualOrderSearchType === 'PAINT' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}><Layers size={16} /> أصباغ</button>
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
                                                        <div className="flex flex-col text-right"><span className="font-mono font-black text-gray-700 text-lg">{p.name || p.code}</span><span className="text-[10px] text-gray-400 font-bold">{p.dimensions}</span></div>
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><Plus size={18} /></div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Items Table */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-2">
                                            <h4 className="font-black text-gray-500 text-[11px] uppercase tracking-widest">محتويات الطلب</h4>
                                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">{manualOrderItems.length} مادة</span>
                                        </div>
                                        {manualOrderItems.length === 0 ? (
                                            <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-bold">السلة فارغة، يرجى إضافة منتجات</div>
                                        ) : (
                                            manualOrderItems.map((item, idx) => {
                                                const product = products.find((p: any) => p.id === item.productId);
                                                const isAdhesive = isUnitPricedProduct(product, db.categories);
                                                const itemFamily = getProductFamily(product, db.categories);
                                                const itemUnit = getProductUnit(product, db.categories);
                                                const isCartonPriceEditing = priceEditTarget?.scope === 'manual' && priceEditTarget.index === idx && priceEditTarget.field === 'unitPriceCarton';
                                                const isMeterPriceEditing = priceEditTarget?.scope === 'manual' && priceEditTarget.index === idx && priceEditTarget.field === 'unitPriceMeter';
                                                return (
                                                    <div key={idx} className={`bg-white p-4 rounded-[1.5rem] border flex flex-col items-stretch shadow-sm gap-3 transition-all ${item.isSpecialRequest ? 'border-amber-200 bg-amber-50/70' : 'border-gray-200 hover:border-[#0e3c63]/30 hover:shadow-md'}`}>
                                                        <div className="text-right flex flex-wrap items-start justify-between gap-3 min-w-0 w-full">
                                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border font-mono font-black text-sm transition-all ${item.isSpecialRequest ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-[#0e3c63] text-white border-[#0e3c63] shadow-sm'}`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2 min-w-0 pt-1.5">
                                                                    {item.priceAdjustmentNote && (
                                                                        <Tooltip content={item.priceAdjustmentNote}>
                                                                            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                                                                                <DollarSign size={14} />
                                                                            </span>
                                                                        </Tooltip>
                                                                    )}
                                                                    <span className="font-black text-[#0e3c63] block text-lg leading-7 whitespace-normal break-words">{item.productName || products.find((p: any) => String(p.id) === String(item.productId))?.name || item.productCode}</span>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 max-w-full">
                                                                <span className={`px-3 py-1.5 rounded-xl border text-[10px] font-black leading-5 whitespace-nowrap ${item.isSpecialRequest ? 'bg-amber-100 text-amber-700 border-amber-200' : (isAdhesive ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-[#0e3c63] border-blue-100')}`}>
                                                                    {item.isSpecialRequest ? 'طلب خاص' : (itemFamily === 'PAINT' ? 'أصباغ' : isAdhesive ? 'مادة لاصقة' : 'فلين')}
                                                                </span>
                                                                <span className={`max-w-full px-3 py-1.5 rounded-xl border text-[10px] font-black leading-5 whitespace-normal break-words ${item.isSpecialRequest ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                                    {item.isSpecialRequest ? 'وحدة إنتاج خاصة' : item.productDimensions}
                                                                </span>
                                                            </div>
                                                            {item.isSpecialRequest && <p className="basis-full text-[10px] text-amber-700 font-bold mt-1 bg-white/50 px-2 py-0.5 rounded w-fit max-w-full break-words whitespace-normal line-clamp-2">"{item.specialRequestNote}"</p>}
                                                        </div>

                                                        <div className={`w-full overflow-x-auto custom-scrollbar p-2 rounded-2xl border ${item.isSpecialRequest ? 'bg-white border-amber-100 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                                                            <div className="flex min-w-max justify-center gap-2 items-end">
                                                            <div className="text-center px-2 py-1 rounded-xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
                                                                <div className="text-center px-2 py-1 rounded-xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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

                                                            <div className="text-center px-2 py-1 rounded-xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                                                <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">{!isAdhesive && !item.isSpecialRequest ? 'سعر الكارتون' : 'السعر'}</label>
                                                                {item.isSpecialRequest || isCartonPriceEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        autoFocus={isCartonPriceEditing}
                                                                        className={`w-28 h-10 bg-white border-2 rounded-xl text-center font-black text-lg outline-none shadow-sm ${item.isSpecialRequest ? 'border-amber-200 text-amber-700 focus:border-amber-500' : 'border-blue-200 text-[#0e3c63] focus:border-[#0e3c63]'}`}
                                                                        value={item.unitPriceCarton}
                                                                        onBlur={() => setPriceEditTarget(null)}
                                                                        onKeyDown={handlePriceInputKeyDown}
                                                                        onChange={(e) => {
                                                                            setManualOrderItems(prev => updateItemPrice(prev, idx, 'unitPriceCarton', e.target.value));
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onDoubleClick={() => setPriceEditTarget({ scope: 'manual', index: idx, field: 'unitPriceCarton' })}
                                                                        className="h-10 min-w-28 px-2 flex items-center justify-center font-mono font-black text-lg text-gray-600 rounded-xl hover:bg-blue-50 hover:text-[#0e3c63] transition-all cursor-pointer"
                                                                        title="دبل كلك لتعديل السعر"
                                                                    >
                                                                        ${item.unitPriceCarton}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {!isAdhesive && !item.isSpecialRequest && (
                                                                <div className="text-center px-2 py-1 rounded-xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hidden sm:block">
                                                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">سعر المتر</label>
                                                                    {isMeterPriceEditing ? (
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            autoFocus
                                                                            className="w-28 h-10 bg-white border-2 border-blue-200 rounded-xl text-center font-black text-lg text-[#0e3c63] focus:border-[#0e3c63] outline-none shadow-sm"
                                                                            value={item.unitPriceMeter}
                                                                            onBlur={() => setPriceEditTarget(null)}
                                                                            onKeyDown={handlePriceInputKeyDown}
                                                                            onChange={(e) => {
                                                                                setManualOrderItems(prev => updateItemPrice(prev, idx, 'unitPriceMeter', e.target.value));
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onDoubleClick={() => setPriceEditTarget({ scope: 'manual', index: idx, field: 'unitPriceMeter' })}
                                                                            className="h-10 min-w-28 px-2 flex items-center justify-center font-mono font-black text-lg text-gray-600 rounded-xl hover:bg-blue-50 hover:text-[#0e3c63] transition-all cursor-pointer"
                                                                            title="دبل كلك لتعديل سعر المتر"
                                                                        >
                                                                            ${item.unitPriceMeter}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="text-center min-w-[112px] px-2 py-1 rounded-xl bg-emerald-50 border border-emerald-100 shadow-[0_1px_2px_rgba(16,185,129,0.08)]">
                                                                <span className="text-[9px] text-gray-400 block font-black uppercase mb-1">الإجمالي</span>
                                                                <span className="h-10 px-2 font-mono font-black text-xl text-emerald-600 flex items-center justify-center">${item.totalPrice.toLocaleString()}</span>
                                                            </div>
                                                            <button onClick={() => setManualOrderItems(prev => prev.filter((_, i) => i !== idx))} className="p-2.5 h-12 w-12 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"><Trash2 size={20} /></button>
                                                            </div>
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
                                            <div className="space-y-4 p-5 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingUp size={40} /></div>
                                                <label className="block text-[10px] font-black text-blue-200 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} /> زيادة أسعار المنتجات</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {PRICE_CHANGE_PERCENTAGES.map(percent => (
                                                        <button
                                                            key={percent}
                                                            type="button"
                                                            disabled={!hasRegularItems(manualOrderItems)}
                                                            onClick={() => applyManualPricePercentage(percent)}
                                                            className="h-11 rounded-xl bg-white/10 border border-white/10 text-white font-black font-mono text-sm hover:bg-white hover:text-[#0e3c63] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            {percent}%+
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={manualCustomPricePercentage}
                                                            onChange={e => setManualCustomPricePercentage(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    applyCustomManualPricePercentage();
                                                                }
                                                            }}
                                                            className="w-full h-11 bg-white/10 border border-white/10 rounded-xl px-4 pl-9 font-black font-mono text-white outline-none focus:bg-white/20"
                                                            placeholder="نسبة مخصصة"
                                                        />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-black">%</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={!hasRegularItems(manualOrderItems)}
                                                        onClick={applyCustomManualPricePercentage}
                                                        className="h-11 px-4 rounded-xl bg-blue-400 text-[#0e3c63] font-black text-xs hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        تطبيق الزيادة
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-4 p-5 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden"><div className="absolute top-0 right-0 p-2 opacity-10"><Tag size={40} /></div><label className="block text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-2"><Percent size={14} /> خصم إضافي</label><div className="flex gap-2"><div className="flex-1 relative"><input type="number" value={manualDiscount} onChange={e => setManualDiscount(Math.max(0, Number(e.target.value)))} className="w-full h-12 bg-white/10 border border-white/10 rounded-xl px-4 font-black font-mono text-white outline-none focus:bg-white/20" placeholder="0" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-black">{manualDiscountType === 'PERCENT' ? '%' : '$'}</span></div><div className="flex bg-white/5 rounded-xl p-1 border border-white/10"><button type="button" onClick={() => setManualDiscountType('FIXED')} className={`px-3 rounded-lg text-[10px] font-black transition-all ${manualDiscountType === 'FIXED' ? 'bg-white text-[#0e3c63]' : 'text-blue-200'}`}>مبلغ</button><button type="button" onClick={() => setManualDiscountType('PERCENT')} className={`px-3 rounded-lg text-[10px] font-black transition-all ${manualDiscountType === 'PERCENT' ? 'bg-white text-[#0e3c63]' : 'text-blue-200'}`}>%</button></div></div></div>
                                            <div className="bg-emerald-400/10 p-5 rounded-2xl border border-emerald-400/20 text-center"><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">الصافي النهائي</p><h2 className="text-4xl font-black font-mono text-emerald-400 tracking-tighter">${manualFinalTotal.toLocaleString()}</h2></div>
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
