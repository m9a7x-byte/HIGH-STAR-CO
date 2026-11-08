// Removed global t to avoid stale translations
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Wallet, Activity, AlertTriangle, Package, Settings, TrendingUp, Sparkles, Users, Clock, Calendar, PlayCircle } from 'lucide-react';
import { Card, Button } from '../../../components/ui';
import { formatDate, formatTime } from '../../../lib/dateUtils';
import cubes from '../../../assets/patterns/cubes.png';

const getHijriDate = (date: Date, t: any) => {
    const HIJRI_MONTHS = [
        t('batch4.txt_w7hrrt_6991'), t('batch4.txt_0gfzvs_6991'), t('batch4.txt_yojog5_6991'), t('batch4.txt_cmft01_6991'), t('batch4.txt_uh5suf_6991'), t('batch4.txt_56hqxj_6991'),
        t('batch4.txt_mllnjb_6991'), t('batch4.txt_e7lfl8_6991'), t('batch4.txt_itdqlj_6991'), t('batch4.txt_yku1fc_6991'), t('batch4.txt_ypah12_6991'), t('batch4.txt_658kmd_6991')
    ];

    try {
        const formatter = Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
            day: 'numeric', month: 'numeric', year: 'numeric'
        });
        const parts = formatter.formatToParts(date);
        const day = parts.find(p => p.type === 'day')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const year = parts.find(p => p.type === 'year')?.value;
        if (day && month && year) {
            const monthIndex = parseInt(month) - 1;
            const monthName = HIJRI_MONTHS[monthIndex] || month;
            return `${day} ${monthName} ${year}`;
        }
        return '';
    } catch (e) { return ''; }
};

const generateSmoothPath = (data: number[], width = 500, height = 150) => {
    if (!data || data.length === 0) return `M0,${height} L${width},${height} Z`;

    const maxVal = Math.max(...data, 1); // Avoid division by zero
    const padding = 20; // Padding from top
    const w = width / Math.max(data.length - 1, 1);

    const points = data.map((val, i) => {
        const x = i * w;
        const y = height - (val / maxVal) * (height - padding);
        return { x, y };
    });

    // Create a smooth bezier curve path
    let path = `M0,${height} L${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cx = (p0.x + p1.x) / 2;
        path += ` C${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }

    path += ` L${width},${height} Z`;
    return path;
};

// SVG variant with morphing animations between 3 variations of the generated path
const AnimatedAreaChartSVG = ({ color, data }: { color: string; data: number[] }) => {
    // Generate the base path from actual data
    const basePath = generateSmoothPath(data);

    // Create slight variations for the morphing animation to make it feel alive
    // even if the data hasn't changed today
    const variation1 = generateSmoothPath(data.map(v => v * (1 + (Math.random() * 0.1 - 0.05))));
    const variation2 = generateSmoothPath(data.map(v => v * (1 + (Math.random() * 0.15 - 0.075))));

    const morphPaths = [basePath, variation1, variation2, basePath];

    return (
        <div className={`absolute bottom-0 left-0 right-0 h-16 md:h-24 overflow-hidden opacity-30 pointer-events-none text-${color}-600`}>
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full fill-current">
                <path d={basePath}>
                    <animate
                        attributeName="d"
                        dur="6s"
                        repeatCount="indefinite"
                        values={morphPaths.join(';')}
                    />
                </path>
            </svg>
        </div>
    );
};

export const OverviewTab = ({ stats, currentTime, settings, setActiveTab, onNavigateToAgent, onNavigateToSpecificOrder }: any) => {
    const { t } = useTranslation();

    // Translate DB-stored Arabic action strings to current language
    const translateAction = (action: string): string => {
        const actionMap: Record<string, string> = {
            'تسجيل دخول': t('actions.login'),
            'تسجيل خروج': t('actions.logout'),
            'إنشاء طلب': t('actions.create_order'),
            'تعديل طلب': t('actions.edit_order'),
            'تحديث حالة': t('actions.update_status'),
            'تعديل الإعدادات': t('actions.edit_settings'),
            'تحديث بيانات دخول': t('actions.update_credentials'),
            'تحديث بروفايل': t('actions.update_profile'),
            'إضافة مورد': t('actions.add_supplier'),
            'تعديل مورد': t('actions.edit_supplier'),
            'حذف مورد': t('actions.delete_supplier'),
            'إضافة حركة': t('actions.add_transaction'),
            'تعديل حركة': t('actions.edit_transaction'),
            'حذف حركة': t('actions.delete_transaction'),
            'قفل حركة': t('actions.lock_transaction'),
            'إضافة موظف': t('actions.add_staff'),
            'تعديل وكيل': t('actions.edit_agent'),
            'تعديل رصيد': t('actions.edit_balance'),
        };
        return actionMap[action] || action;
    };

    // Translate known English terms embedded in log.details from DB
    const translateDetails = (details: string): string => {
        let result = details;
        // Translate (type) markers stored by db.ts updateOrderStatus
        result = result.replace('(production)', `(${t('tabs.production')})`);
        result = result.replace('(payment)', `(${t('tabs.orders')})`);
        // Translate status values that may appear in details
        const statusMap: Record<string, string> = {
            'WAITING': t('activity.status_waiting'),
            'IN_PROGRESS': t('activity.status_in_progress'),
            'COMPLETED': t('activity.status_completed'),
            'PENDING_TRANSFER': t('activity.status_pending_transfer'),
            'PENDING_PAYMENT': t('activity.status_pending_payment'),
            'PAID': t('activity.status_paid'),
            'PARTIALLY_PAID': t('activity.status_partially_paid'),
            'PENDING': t('activity.status_unpaid'),
        };
        for (const [key, val] of Object.entries(statusMap)) {
            if (result.includes(key)) {
                result = result.split(key).join(val);
            }
        }
        return result;
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>

                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight mb-1">{t('overview.dashboard')}</h2>
                    <p className="text-gray-500 text-xs md:text-sm font-medium flex items-center gap-2 flex-wrap">
                        <span className="text-[#0e3c63] font-bold">
                            {formatDate(currentTime, { month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {getHijriDate(currentTime, t)}
                        </span>
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-3 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-700 leading-none">{t('overview.system_active')}</span>
                        <span className="text-[9px] text-gray-500 font-bold mt-1 flex items-center gap-1">
                            <Users size={8} className="text-[#0e3c63]" /> {stats.onlineUsersCount} {t('overview.connected')}
                        </span>
                    </div>
                    <Sparkles size={14} className="text-amber-400 fill-amber-100 mr-1" />
                </div>
            </div>

            {/* RE-ENGINEERED: 2x2 Grid for Mobile, 1x4 for Desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">

                {/* Revenue */}
                <Card className="relative overflow-hidden border-0 shadow-lg group active:scale-95 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-sky-50/30"></div>
                    <AnimatedAreaChartSVG color="blue" data={stats.dailyRevenue || []} />
                    <div className="relative p-4 md:p-6 z-10">
                        <div className="p-2 md:p-3 bg-white shadow-sm text-[#0e3c63] rounded-xl md:rounded-2xl border border-sky-100 w-fit mb-3">
                            <DollarSign size={20} className="md:w-6 md:h-6" />
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-xs font-black uppercase mb-1">{t('overview.sales')}</p>
                        <h3 className="text-lg md:text-3xl font-black text-[#0e3c63] font-mono tracking-tight">${stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                </Card>

                {/* Paid */}
                <Card className="relative overflow-hidden border-0 shadow-lg group active:scale-95 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-green-50/30"></div>
                    <AnimatedAreaChartSVG color="emerald" data={stats.dailyPaid || []} />
                    <div className="relative p-4 md:p-6 z-10">
                        <div className="p-2 md:p-3 bg-white shadow-sm text-emerald-600 rounded-xl md:rounded-2xl border border-emerald-100 w-fit mb-3">
                            <Wallet size={20} className="md:w-6 md:h-6" />
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-xs font-black uppercase mb-1">{t('overview.received')}</p>
                        <h3 className="text-lg md:text-3xl font-black text-emerald-600 font-mono tracking-tight">${stats.paidRevenue.toLocaleString()}</h3>
                    </div>
                </Card>

                {/* Production */}
                <Card className="relative overflow-hidden border-0 shadow-lg group active:scale-95 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-orange-50/30"></div>
                    <AnimatedAreaChartSVG color="orange" data={stats.dailyProduction || []} />
                    <div className="relative p-4 md:p-6 z-10">
                        <div className="p-2 md:p-3 bg-white shadow-sm text-orange-600 rounded-xl md:rounded-2xl border border-orange-100 w-fit mb-3">
                            <Activity size={20} className="md:w-6 md:h-6" />
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-xs font-black uppercase mb-1">{t('overview.production')}</p>
                        <h3 className="text-lg md:text-3xl font-black text-orange-600 font-mono tracking-tight">{stats.activeProduction}</h3>
                    </div>
                </Card>

                {/* Pending Transfer */}
                <Card className="relative overflow-hidden border-0 shadow-lg group active:scale-95 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-indigo-50/30"></div>
                    <AnimatedAreaChartSVG color="indigo" data={[stats.pendingTransferCount || 0]} />
                    <div className="relative p-4 md:p-6 z-10">
                        <div className="p-2 md:p-3 bg-white shadow-sm text-indigo-600 rounded-xl md:rounded-2xl border border-indigo-100 w-fit mb-3">
                            <PlayCircle size={20} className="md:w-6 md:h-6" />
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-xs font-black uppercase mb-1">بانتظار الترحيل</p>
                        <h3 className="text-lg md:text-3xl font-black text-indigo-600 font-mono tracking-tight">{stats.pendingTransferCount}</h3>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 h-full border border-gray-100 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-800">{t('overview.recent_activities')}</h3>
                            <Button variant="ghost" onClick={() => setActiveTab('activity_log')} className="text-xs">{t('common.all')}</Button>
                        </div>
                        <div className="space-y-4">
                            {stats.recentLogs.map((log: any) => (
                                <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 shadow-sm">
                                    <div className="bg-blue-50 text-[#0e3c63] p-2 rounded-full mt-1 border border-blue-100 shrink-0">
                                        <Activity size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <p className="font-black text-sm text-gray-800 truncate">{translateAction(log.action)}</p>
                                                <span className="text-[10px] text-[#0e3c63] bg-blue-50 px-2 py-0.5 rounded-full font-black mt-1 w-fit border border-blue-100 flex items-center gap-1"><Users size={10} /> {log.userName || t('overview.the_system')}</span>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 mr-2 text-gray-400 font-mono">
                                                <span className="text-[9px] font-bold">{formatDate(log.timestamp, { day: '2-digit', month: '2-digit' })}</span>
                                                <span className="text-[8px]">{formatTime(log.timestamp)}</span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-2 font-medium leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-100">{translateDetails(log.details)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6 flex flex-col">
                    <Card className="p-6 bg-gradient-to-br from-[#0e3c63] to-[#164e7d] text-white shadow-xl relative overflow-hidden hidden md:block">
                        <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-10" style={{ backgroundImage: `url(${cubes})` }}></div>
                        <h3 className="font-bold text-lg mb-2 relative z-10">{t('overview.system_status')}</h3>
                        <div className="flex items-center gap-2 mb-4 relative z-10">
                            <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${settings.maintenanceMode ? 'bg-red-400' : 'bg-green-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${settings.maintenanceMode ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            </span>
                            <span className="text-sm font-bold">{settings.maintenanceMode ? t('overview.maintenance_mode') : t('overview.system_running')}</span>
                        </div>
                        <div className="pt-4 border-t border-white/10 text-center font-mono relative z-10">
                            <div className="text-2xl font-black tracking-widest">
                                {formatTime(currentTime, { hour12: true })}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 flex-1 shadow-lg border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                            <Package size={20} className="text-[#0e3c63]" />
                            {t('overview.recent_orders')}
                        </h3>
                        <div className="space-y-3">
                            {stats.recentOrders.map((o: any, idx: number) => (
                                <div key={o.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all bg-white border-gray-100 hover:border-blue-200`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <button onClick={() => onNavigateToAgent(o.agentId)} className="font-black text-gray-800 text-xs truncate max-w-[120px]">{o.agentName}</button>
                                            <button onClick={() => onNavigateToSpecificOrder(o.id)} className="font-mono text-[10px] font-black text-[#0e3c63] bg-blue-50 px-1.5 py-0.5 rounded">#{o.id}</button>
                                        </div>
                                        <div className="flex justify-between items-end mt-1">
                                            <div className="flex flex-col text-[8px] text-gray-400 font-mono">
                                                <span className="font-bold">{formatDate(o.createdAt, { day: '2-digit', month: '2-digit' })}</span>
                                                <span>{formatTime(o.createdAt)}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-emerald-600">${o.totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
