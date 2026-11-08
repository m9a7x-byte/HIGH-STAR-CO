import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    ListOrdered, Eye, Clock, Hourglass, Activity, CheckCircle2, Layers, Calendar,
    ChevronDown, RotateCcw, XCircle, Undo2, LogOut, PlayCircle, Check, Send, AlertCircle, Sparkles, PenTool
} from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { ProductionStatus, PaymentStatus, ProductionStatusLabels } from '../../../types';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { ProductionConfirmationModal } from '../../../components/shared/ProductionConfirmationModal';
import { Tooltip } from '../../../components/ui/Tooltip';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatDate, formatTime } from '../../../lib/dateUtils';

// Status Badge Component
const StatusBadge = ({ status }: { status: ProductionStatus }) => {
    const styles = {
        [ProductionStatus.PENDING_TRANSFER]: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: Send },
        [ProductionStatus.WAITING]: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Hourglass },
        [ProductionStatus.IN_PROGRESS]: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Activity },
        [ProductionStatus.COMPLETED]: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle2 },
        [ProductionStatus.PENDING_PAYMENT]: { bg: 'bg-red-50', text: 'text-red-600', icon: LogOut },
    };
    const style = styles[status] || styles[ProductionStatus.WAITING];
    const Icon = style.icon;

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 ${style.bg} w-fit`}>
            <Icon size={14} className={style.text} />
            <span className={`text-[11px] font-black ${style.text}`}>{ProductionStatusLabels[status]}</span>
        </div>
    );
};

export const ProductionTab = ({ productionQueue, canEdit, onUpdateStatus, onViewOrder, onNavigateToAgent }: any) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();
    const [queuePage, setQueuePage] = useState(0);
    const [queueRowsPerPage, setQueueRowsPerPage] = useState(25);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'WAITING' | 'IN_PROGRESS' | 'PAID'>('ALL');

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{ order: any, action: 'START' | 'COMPLETE' | 'OUT' | 'RETURN' } | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, [activeFilter]);



    const stats = useMemo(() => {
        const all = {
            count: productionQueue.length,
            amount: productionQueue.reduce((s: number, o: any) => s + o.totalAmount, 0)
        };

        const waiting = productionQueue.filter((o: any) => o.productionStatus === ProductionStatus.WAITING);
        const waitingStats = {
            count: waiting.length,
            amount: waiting.reduce((s: number, o: any) => s + o.totalAmount, 0)
        };

        const processing = productionQueue.filter((o: any) => o.productionStatus === ProductionStatus.IN_PROGRESS);
        const processingStats = {
            count: processing.length,
            amount: processing.reduce((s: number, o: any) => s + o.totalAmount, 0)
        };

        const paid = productionQueue.filter((o: any) => o.paymentStatus === PaymentStatus.PAID);
        const paidStats = {
            count: paid.length,
            amount: paid.reduce((s: number, o: any) => s + o.totalAmount, 0)
        };

        return { all, waiting: waitingStats, processing: processingStats, paid: paidStats };
    }, [productionQueue]);

    const filteredQueue = useMemo(() => {
        const sorted = [...productionQueue].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return sorted.filter((o: any) => {
            if (activeFilter === 'WAITING') return o.productionStatus === ProductionStatus.WAITING;
            if (activeFilter === 'IN_PROGRESS') return o.productionStatus === ProductionStatus.IN_PROGRESS;
            if (activeFilter === 'PAID') return o.paymentStatus === PaymentStatus.PAID;
            return true;
        });
    }, [productionQueue, activeFilter]);

    const currentQueue = filteredQueue.slice(queuePage * queueRowsPerPage, (queuePage + 1) * queueRowsPerPage);

    const handleUpdateDays = (orderId: number, days: number) => {
        db.updateOrderEstimate(user!.id, orderId, days);
    };

    const handleConfirmAction = () => {
        if (!confirmModal) return;
        const { order, action } = confirmModal;

        let newStatus = ProductionStatus.WAITING;
        if (action === 'START') newStatus = ProductionStatus.IN_PROGRESS;
        if (action === 'COMPLETE') newStatus = ProductionStatus.COMPLETED;
        if (action === 'OUT') newStatus = ProductionStatus.PENDING_PAYMENT;
        if (action === 'RETURN') newStatus = ProductionStatus.WAITING;

        // Directly call database update to bypass parent's confirmation logic
        db.updateOrderStatus(user!.id, order.id, 'production', newStatus);
        setConfirmModal(null);

        // Toast feedback
        const messages: Record<string, { title: string; msg: string }> = {
            'START': { title: t('production.toast_started', 'تم بدء التحضير'), msg: `#${order.id}` },
            'COMPLETE': { title: t('production.toast_completed', 'تم التجهيز'), msg: `#${order.id}` },
            'OUT': { title: t('production.toast_removed', 'تم الإرجاع من الإنتاج'), msg: `#${order.id}` },
            'RETURN': { title: t('production.toast_returned', 'تم الإرجاع لقيد الانتظار'), msg: `#${order.id}` },
        };
        const m = messages[action];
        if (m) toast.success(m.title, m.msg);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div onClick={() => { setActiveFilter('ALL'); setQueuePage(0); }} className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${activeFilter === 'ALL' ? 'bg-[#0e3c63] text-white border-[#0e3c63] shadow-lg transform -translate-y-1' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-xl ${activeFilter === 'ALL' ? 'bg-white/10' : 'bg-gray-50 text-gray-500'}`}><Layers size={20} /></div>
                        <span className={`text-2xl font-black font-mono ${activeFilter === 'ALL' ? 'text-white' : 'text-gray-800'}`}>{stats.all.count}</span>
                    </div>
                    <p className={`text-sm font-bold ${activeFilter === 'ALL' ? 'text-blue-100' : 'text-gray-600'}`}>{t('production.all_orders')}</p>
                    <p className={`text-xs font-mono mt-1 ${activeFilter === 'ALL' ? 'text-blue-200' : 'text-gray-400'}`}>${stats.all.amount.toLocaleString()}</p>
                </div>

                <div onClick={() => { setActiveFilter('WAITING'); setQueuePage(0); }} className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${activeFilter === 'WAITING' ? 'bg-gray-800 text-white border-gray-800 shadow-lg transform -translate-y-1' : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-md'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-xl ${activeFilter === 'WAITING' ? 'bg-white/10' : 'bg-gray-50 text-gray-500'}`}><Hourglass size={20} /></div>
                        <span className={`text-2xl font-black font-mono ${activeFilter === 'WAITING' ? 'text-white' : 'text-gray-800'}`}>{stats.waiting.count}</span>
                    </div>
                    <p className={`text-sm font-bold ${activeFilter === 'WAITING' ? 'text-gray-200' : 'text-gray-600'}`}>{t('production.waiting')}</p>
                    <p className={`text-xs font-mono mt-1 ${activeFilter === 'WAITING' ? 'text-gray-400' : 'text-gray-400'}`}>${stats.waiting.amount.toLocaleString()}</p>
                </div>

                <div onClick={() => { setActiveFilter('IN_PROGRESS'); setQueuePage(0); }} className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${activeFilter === 'IN_PROGRESS' ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform -translate-y-1' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-xl ${activeFilter === 'IN_PROGRESS' ? 'bg-white/10' : 'bg-blue-50 text-blue-600'}`}><Activity size={20} /></div>
                        <span className={`text-2xl font-black font-mono ${activeFilter === 'IN_PROGRESS' ? 'text-white' : 'text-blue-600'}`}>{stats.processing.count}</span>
                    </div>
                    <p className={`text-sm font-bold ${activeFilter === 'IN_PROGRESS' ? 'text-blue-100' : 'text-gray-600'}`}>{t('production.processing')}</p>
                    <p className={`text-xs font-mono mt-1 ${activeFilter === 'IN_PROGRESS' ? 'text-blue-200' : 'text-gray-400'}`}>${stats.processing.amount.toLocaleString()}</p>
                </div>

                <div onClick={() => { setActiveFilter('PAID'); setQueuePage(0); }} className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${activeFilter === 'PAID' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg transform -translate-y-1' : 'bg-white border-gray-100 hover:border-emerald-300 hover:shadow-md'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-xl ${activeFilter === 'PAID' ? 'bg-white/10' : 'bg-emerald-50 text-emerald-600'}`}><CheckCircle2 size={20} /></div>
                        <span className={`text-2xl font-black font-mono ${activeFilter === 'PAID' ? 'text-white' : 'text-emerald-600'}`}>{stats.paid.count}</span>
                    </div>
                    <p className={`text-sm font-bold ${activeFilter === 'PAID' ? 'text-emerald-100' : 'text-gray-600'}`}>{t('production.paid_ready')}</p>
                    <p className={`text-xs font-mono mt-1 ${activeFilter === 'PAID' ? 'text-emerald-200' : 'text-gray-400'}`}>${stats.paid.amount.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg">
                <div className="overflow-x-auto rounded-t-2xl">
                    <table className="w-full text-right min-w-[900px]">
                        <thead className="bg-gray-50 text-gray-600 font-bold text-xs uppercase border-b">
                            <tr>
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4">{t('production.th_order')}</th>
                                <th className="p-4">{t('production.th_client')}</th>
                                <th className="p-4">{t('production.th_date_time')}</th>
                                <th className="p-4">{t('production.th_value')}</th>
                                <th className="p-4">{t('production.th_transfer_date')}</th>
                                <th className="p-4">{t('production.th_duration')}</th>
                                <th className="p-4 w-44">{t('production.th_status')}</th>
                                <th className="p-4 text-center w-48">{t('production.th_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {currentQueue.map((o: any, idx: number) => (
                                <tr key={o.id} className="hover:bg-blue-50/50 transition-colors group">
                                    <td className="p-4 font-bold text-gray-400 text-center">{queuePage * queueRowsPerPage + idx + 1}</td>
                                    <td className="p-4 font-mono font-bold text-[#0e3c63]">
                                        <div className="flex items-center gap-2">
                                            #{o.id}
                                            {o.hasSpecialRequest && (
                                                <Tooltip content={t('production.has_special_request')}>
                                                    <div className="p-1 rounded-md bg-amber-50 text-amber-500 animate-pulse cursor-help">
                                                        <Sparkles size={14} className="fill-amber-500" />
                                                    </div>
                                                </Tooltip>
                                            )}
                                            {o.isManual && (
                                                <Tooltip content={`${t('production.manual_order_by')} ${o.manualBy || t('production.admin')}`}>
                                                    <div className="p-1 rounded-md bg-amber-100 text-amber-600 animate-pulse shadow-sm cursor-help">
                                                        <PenTool size={14} />
                                                    </div>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => onNavigateToAgent(o.agentId)} className="font-bold text-gray-900 hover:text-blue-600 transition-colors">{o.agentName}</button>
                                        <span className="text-[10px] text-gray-400 block font-bold">{o.agentProvince}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col text-[11px] font-mono text-gray-600">
                                            <span className="font-bold text-gray-800 text-sm">{formatDate(o.createdAt)}</span>
                                            <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Clock size={12} /> {formatTime(o.createdAt)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-mono font-black text-[#0e3c63]">${o.totalAmount.toLocaleString()}</div>
                                        <div className="font-mono text-[10px] text-emerald-600 font-bold">{t('production.paid_amount')} ${o.paidAmount.toLocaleString()}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-mono text-xs text-gray-600 font-bold">
                                            {o.movedToProductionAt ? new Date(o.movedToProductionAt).toLocaleDateString('ar-IQ') : '-'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 w-fit">
                                            <Clock size={14} className="text-gray-400" />
                                            {canEdit ? (
                                                <input type="number" min="0" className="w-10 bg-transparent text-center font-bold text-gray-700 outline-none" defaultValue={o.estimatedDays || 0} onBlur={(e) => handleUpdateDays(o.id, Number(e.target.value))} />
                                            ) : (
                                                <span className="font-bold text-gray-700 px-1">{o.estimatedDays || 0}</span>
                                            )}
                                            <span className="text-[10px] text-gray-400 font-bold">{t('production.days')}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <StatusBadge status={o.productionStatus} />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Tooltip content={t('production.view_details')}>
                                                <button
                                                    onClick={() => onViewOrder(o)}
                                                    className="w-10 h-10 flex items-center justify-center bg-blue-50 text-[#0e3c63] rounded-xl transition-all btn-draw-border hover:bg-blue-100"
                                                >
                                                    <Eye size={20} />
                                                </button>
                                            </Tooltip>

                                            {canEdit && (
                                                <>
                                                    {o.productionStatus === ProductionStatus.IN_PROGRESS ? (
                                                        <div className="flex items-center gap-2">
                                                            <Tooltip content={t('production.confirm_ready', 'تم التجهيز')}>
                                                                <button
                                                                    onClick={() => setConfirmModal({ order: o, action: 'COMPLETE' })}
                                                                    className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl transition-all btn-draw-border hover:bg-emerald-100"
                                                                >
                                                                    <CheckCircle2 size={20} />
                                                                </button>
                                                            </Tooltip>

                                                            <Tooltip content={t('production.cancel_and_return', 'إلغاء وإرجاع')}>
                                                                <button
                                                                    onClick={() => setConfirmModal({ order: o, action: 'RETURN' })}
                                                                    className="w-10 h-10 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl transition-all btn-draw-border hover:bg-amber-100"
                                                                >
                                                                    <Undo2 size={20} />
                                                                </button>
                                                            </Tooltip>
                                                        </div>
                                                    ) : o.productionStatus === ProductionStatus.WAITING ? (
                                                        <div className="flex items-center gap-2">
                                                            <Tooltip content={t('production.confirm_start', 'تأكيد البدء')}>
                                                                <button
                                                                    onClick={() => setConfirmModal({ order: o, action: 'START' })}
                                                                    className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl transition-all btn-draw-border hover:bg-blue-100"
                                                                >
                                                                    <PlayCircle size={20} />
                                                                </button>
                                                            </Tooltip>

                                                            <Tooltip content={t('production.return_to_waiting', 'إرجاع لقيد الانتظار')}>
                                                                <button
                                                                    onClick={() => setConfirmModal({ order: o, action: 'OUT' })}
                                                                    className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl transition-all btn-draw-border hover:bg-red-100"
                                                                >
                                                                    <LogOut size={20} />
                                                                </button>
                                                            </Tooltip>
                                                        </div>
                                                    ) : null}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControl page={queuePage} rowsPerPage={queueRowsPerPage} setPage={setQueuePage} setRowsPerPage={setQueueRowsPerPage} totalItems={filteredQueue.length} />
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <ProductionConfirmationModal
                    order={confirmModal.order}
                    onClose={() => setConfirmModal(null)}
                    onConfirm={handleConfirmAction}
                    title={
                        confirmModal.action === 'START' ? t('production.confirm_start_production') :
                            confirmModal.action === 'COMPLETE' ? t('production.complete_order_prep') :
                                confirmModal.action === 'OUT' ? t('production.remove_from_prod') : t('production.return_to_waiting')
                    }
                    subtitle={
                        confirmModal.action === 'START' ? t('production.sub_start_prod') :
                            confirmModal.action === 'COMPLETE' ? t('production.sub_complete_prep') : t('production.sub_workflow')
                    }
                    confirmLabel={
                        confirmModal.action === 'START' ? t('production.btn_confirm_start') :
                            confirmModal.action === 'COMPLETE' ? t('production.btn_confirm_prep') :
                                confirmModal.action === 'OUT' ? t('production.btn_confirm_remove') : t('production.btn_confirm')
                    }
                    icon={
                        confirmModal.action === 'START' ? PlayCircle :
                            confirmModal.action === 'COMPLETE' ? CheckCircle2 :
                                confirmModal.action === 'OUT' ? LogOut : Undo2
                    }
                />
            )}
        </div>
    );
};

