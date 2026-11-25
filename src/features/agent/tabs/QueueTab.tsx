import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductionStatusLabels, ProductionStatus } from '../../../types';
import {
    ListOrdered, Clock, Sparkles, Send, Hourglass, Activity, CheckCircle2, LogOut
} from 'lucide-react';
import { formatDate } from '../../../lib/dateUtils';
import { supabase } from '../../../lib/supabase';
import { Card } from '../../../components/ui';
import { PaginationControl } from '../../../components/shared/PaginationControl';

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
        <div className={`flex items-center gap-2 px-1.5 py-1 lg:px-3 lg:py-2 rounded-lg lg:rounded-xl border border-gray-100 ${style.bg} w-fit`}>
            <Icon size={14} className={`hidden lg:block ${style.text}`} aria-hidden="true" />
            <span className={`text-[11px] font-black leading-snug ${style.text}`}>{ProductionStatusLabels[status]}</span>
        </div>
    );
};

interface QueueOrder {
    id: number;
    agent_name: string | null;
    is_own_order: boolean;
    has_special_request: boolean;
    created_at: string;
    production_at: string | null;
    production_status: ProductionStatus;
}

export const QueueTab = () => {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [queue, setQueue] = useState<{ rows: QueueOrder[]; total: number } | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        const request = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const start = page * rowsPerPage;

        const refresh = async () => {
            const { data, count, error } = await supabase.rpc('get_agent_production_queue', {}, { count: 'exact' })
                .order('created_at').order('id').range(start, start + rowsPerPage - 1)
                .abortSignal(request.signal);
            if (request.signal.aborted) return;

            if (error?.code === 'PGRST103' && page > 0) {
                setPage(0);
                return;
            }

            if (error) {
                console.error('Error fetching the agent production queue:', error);
                setQueue(null);
                setLoadFailed(true);
            } else {
                const total = count ?? 0;
                const lastPage = Math.max(0, Math.ceil(total / rowsPerPage) - 1);
                setLoadFailed(false);
                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }
                setQueue({ rows: data ?? [], total });
            }

            // Order Realtime events only include orders the current agent owns.
            timer = setTimeout(refresh, 15_000);
        };

        setQueue(null);
        setLoadFailed(false);
        void refresh();
        return () => {
            request.abort();
            clearTimeout(timer);
        };
    }, [page, rowsPerPage]);

    return (
        <Card className="p-3 lg:p-8 shadow-sm lg:shadow-xl">
            <div className="flex items-center gap-3 lg:gap-4 mb-3 lg:mb-8">
                <div className="hidden lg:block bg-[#0e3c63] text-white p-4 rounded-2xl shadow-lg">
                    <ListOrdered size={32} />
                </div>
                <div>
                    <h2 className="font-bold text-lg lg:text-2xl text-gray-800">
                        <span className="lg:hidden">{t('agent_dashboard.production_schedule')}</span><span className="hidden lg:inline">{t('agent.production_queue')}</span>
                    </h2>
                    <p className="hidden lg:block text-gray-500 mt-1">{t('agent.queue_subtitle')}</p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl lg:rounded-2xl border border-gray-100 lg:shadow-sm">
                <table aria-label={t('agent_dashboard.production_schedule')} className="w-full table-fixed lg:table-auto text-right bg-white">
                    <thead className="bg-[#0e3c63] text-white font-bold text-xs lg:text-sm">
                        <tr>
                            <th scope="col" className="w-[11%] lg:w-auto px-1 py-3 lg:p-5 text-center lg:text-right">#</th>
                            <th scope="col" className="w-[33%] lg:w-auto px-1.5 py-3 lg:p-5">{t('agent.order_col')}</th>
                            <th scope="col" className="hidden lg:table-cell p-5">{t('agent.name_col')}</th>
                            <th scope="col" className="hidden lg:table-cell p-5">{t('agent.order_date_col')}</th>
                            <th scope="col" className="w-[28%] lg:w-auto px-1.5 py-3 lg:p-5 bg-[#4a90e2]">
                                <span className="lg:hidden">{t('agent_dashboard.mobile_production_date')}</span><span className="hidden lg:inline">{t('agent.production_date_col')}</span>
                            </th>
                            <th scope="col" className="px-1.5 py-3 lg:p-5">{t('agent.status_col')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {queue?.rows.map((o, idx) => (
                            <tr key={o.id} className={`transition-colors ${o.is_own_order ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                <td className="px-1 py-3 lg:p-5 text-center lg:text-right align-top lg:align-middle font-bold text-gray-500 lg:text-gray-400">{page * rowsPerPage + idx + 1}</td>
                                <td className="px-1.5 py-3 lg:p-5 font-mono text-gray-600">
                                    <div className="flex items-center gap-1 lg:gap-2">
                                        <bdi className="font-bold lg:font-normal">#{o.id}</bdi>
                                        {o.has_special_request && (
                                            <Sparkles size={14} className="text-amber-500 fill-amber-100" />
                                        )}
                                    </div>
                                    <div className="mt-1 break-words font-sans text-xs text-slate-600 lg:hidden">
                                        <p className="font-bold leading-tight">{o.is_own_order ? t('agent.you') : o.agent_name || '-'}</p>
                                        <bdi className="block pt-0.5">{formatDate(o.created_at)}</bdi>
                                    </div>
                                </td>
                                <td className="hidden lg:table-cell p-5">
                                    {o.is_own_order ? (
                                        <span className="font-bold text-[#0e3c63] flex items-center gap-2"><span className="w-2 h-2 bg-[#0e3c63] rounded-full" />{t('agent.you')}</span>
                                    ) : <span className="font-bold text-gray-700">{o.agent_name || '-'}</span>}
                                </td>
                                <td className="hidden lg:table-cell p-5 font-mono text-gray-500">{formatDate(o.created_at)}</td>
                                <td className="px-1.5 py-3 lg:p-5 text-xs lg:text-sm font-mono font-bold text-[#0e3c63] bg-blue-50">
                                    {o.production_at ? (
                                        <span className="flex items-center gap-2">
                                            <Clock size={14} className="hidden lg:block shrink-0" aria-hidden="true" /> <bdi>{formatDate(o.production_at)}</bdi>
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="px-1.5 py-3 lg:p-5"><StatusBadge status={o.production_status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loadFailed && <p role="alert" className="p-6 lg:p-12 text-center font-bold text-red-600">{t('agent.queue_load_failed')}</p>}
                {!queue && !loadFailed && <p role="status" className="p-6 lg:p-12 text-center font-bold text-gray-500">{t('common.loading')}</p>}
                {queue?.total === 0 && <p className="text-center text-gray-500 p-6 lg:p-12 font-bold">{t('agent.empty_queue')}</p>}
            </div>
            {queue && <PaginationControl page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={queue.total} />}
        </Card>
    );
};
