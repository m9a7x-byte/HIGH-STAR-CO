
import React, { useState } from 'react';
import { Order, User, ProductionStatusLabels, ProductionStatus } from '../../../types';
import {
    ListOrdered, Clock, Sparkles, Send, Hourglass, Activity, CheckCircle2, LogOut
} from 'lucide-react';
import { formatDate } from '../../../lib/dateUtils';
import { Card } from '../../../components/ui';

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

interface QueueTabProps {
    productionQueue: Order[];
    user: User | null;
}

export const QueueTab: React.FC<QueueTabProps> = ({ productionQueue, user }) => {
    const [queuePage, setQueuePage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const sortedQueue = [...productionQueue].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const currentQueue = sortedQueue.slice((queuePage - 1) * ITEMS_PER_PAGE, queuePage * ITEMS_PER_PAGE);

    return (
        <Card className="p-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-[#0e3c63] text-white p-4 rounded-2xl shadow-lg">
                    <ListOrdered size={32} />
                </div>
                <div>
                    <h3 className="font-bold text-2xl text-gray-800">جدول الإنتاج المباشر</h3>
                    <p className="text-gray-500 mt-1">تابع دورك في قائمة الانتظار. الأولوية للأسبق دخولاً للقائمة.</p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                <table className="w-full text-right bg-white">
                    <thead className="bg-[#0e3c63] text-white font-bold text-sm">
                        <tr>
                            <th className="p-5">#</th>
                            <th className="p-5">الطلب</th>
                            <th className="p-5">الاسم</th>
                            <th className="p-5">تاريخ الطلب</th>
                            <th className="p-5 bg-[#4a90e2]">تاريخ الدخول للإنتاج (الدور)</th>
                            <th className="p-5">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {currentQueue.map((o, idx) => (
                            <tr key={o.id} className={`transition-colors ${o.agentId === user!.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                <td className="p-5 font-bold text-gray-400">{(queuePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                <td className="p-5 font-mono text-gray-600">
                                    <div className="flex items-center gap-2">
                                        #{o.id}
                                        {o.hasSpecialRequest && (
                                            <Sparkles size={14} className="text-amber-500 fill-amber-100" />
                                        )}
                                    </div>
                                </td>
                                <td className="p-5">
                                    {o.agentId === user!.id ? (
                                        <span className="font-bold text-[#0e3c63] flex items-center gap-2"><div className="w-2 h-2 bg-[#0e3c63] rounded-full"></div> أنت</span>
                                    ) : <span className="font-bold text-gray-700">{o.agentName}</span>}
                                </td>
                                <td className="p-5 font-mono text-gray-500">{formatDate(o.createdAt)}</td>
                                <td className="p-5 font-mono font-bold text-[#0e3c63] bg-blue-50">
                                    {o.movedToProductionAt ? (
                                        <span className="flex items-center gap-2">
                                            <Clock size={14} /> {formatDate(o.movedToProductionAt)}
                                        </span>
                                    ) : o.paidAt ? (
                                        <span className="flex items-center gap-2">
                                            <Clock size={14} /> {formatDate(o.paidAt)}
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="p-5"><StatusBadge status={o.productionStatus} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {productionQueue.length === 0 && <p className="text-center text-gray-400 p-12 font-bold">القائمة فارغة حالياً، كن أول من يطلب!</p>}
            </div>
        </Card>
    );
};
