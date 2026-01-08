
import React from 'react';
import { DollarSign, Wallet, Activity, AlertTriangle, Package, Settings, TrendingUp, Sparkles, Users, Clock, Calendar } from 'lucide-react';
import { Card, Button } from '../../../components/ui';
import { formatDate, formatTime } from '../../../lib/dateUtils';
import cubes from '../../../assets/patterns/cubes.png';

const HIJRI_MONTHS = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثاني',
    'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const getHijriDate = (date: Date) => {
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

const AreaChartSVG = ({ color, path }: { color: string, path: string }) => (
    <div className={`absolute bottom-0 left-0 right-0 h-16 md:h-24 overflow-hidden opacity-20 pointer-events-none text-${color}-600`}>
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full fill-current">
            <path d={path} />
        </svg>
    </div>
);

export const OverviewTab = ({ stats, currentTime, settings, setActiveTab, onNavigateToAgent, onNavigateToSpecificOrder }: any) => {
    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>

                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight mb-1">لوحة القيادة</h2>
                    <p className="text-gray-500 text-xs md:text-sm font-medium flex items-center gap-2 flex-wrap">
                        <span className="text-[#0e3c63] font-bold">
                            {formatDate(currentTime, { month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {getHijriDate(currentTime)}
                        </span>
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-3 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-700 leading-none">النظام نشط</span>
                        <span className="text-[9px] text-gray-500 font-bold mt-1 flex items-center gap-1">
                            <Users size={8} className="text-[#0e3c63]" /> {stats.onlineUsersCount} متصل
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
                    <AreaChartSVG color="blue" path="M0,150 L0,40 Q125,100 250,20 T500,60 L500,150 Z" />
                    <div className="relative p-4 md:p-6 z-10">
                        <div className="p-2 md:p-3 bg-white shadow-sm text-[#0e3c63] rounded-xl md:rounded-2xl border border-sky-100 w-fit mb-3">
                            <DollarSign size={20} className="md:w-6 md:h-6" />
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-xs font-black uppercase mb-1">المبيعات</p>
                        <h3 className="text-lg md:text-3xl font-black text-[#0e3c63] font-mono tracking-tight">${stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                </Card>

                {/* Paid */}
                <Card className="relative overflow-hidden border-0 shadow-lg group active:scale-95 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-green-50/30"></div>
                    <AreaChartSVG color="emerald" path="M0,150 L0,60 Q150,20 250,60 T500,30 L500,150 Z" />
                    <div className="relative p-4 md:p-6 z-10">
                        <div className="p-2 md:p-3 bg-white shadow-sm text-emerald-600 rounded-xl md:rounded-2xl border border-emerald-100 w-fit mb-3">
                            <Wallet size={20} className="md:w-6 md:h-6" />
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-xs font-black uppercase mb-1">الواصل</p>
                        <h3 className="text-lg md:text-3xl font-black text-emerald-600 font-mono tracking-tight">${stats.paidRevenue.toLocaleString()}</h3>
                    </div>
                </Card>

                {/* Production */}
                <Card className="relative overflow-hidden border-0 shadow-lg group active:scale-95 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-orange-50/30"></div>
                    <AreaChartSVG color="orange" path="M0,150 L0,80 C150,120 350,0 500,50 L500,150 Z" />
                    <div className="relative p-4 md:p-6 z-10">
                        <div className="p-2 md:p-3 bg-white shadow-sm text-orange-600 rounded-xl md:rounded-2xl border border-orange-100 w-fit mb-3">
                            <Activity size={20} className="md:w-6 md:h-6" />
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-xs font-black uppercase mb-1">الإنتاج</p>
                        <h3 className="text-lg md:text-3xl font-black text-orange-600 font-mono tracking-tight">{stats.activeProduction}</h3>
                    </div>
                </Card>

                {/* Unpaid */}
                <Card className="relative overflow-hidden border-0 shadow-lg group active:scale-95 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-red-50/30"></div>
                    <AreaChartSVG color="red" path="M0,150 L0,100 L100,60 L200,110 L300,40 L400,90 L500,20 L500,150 Z" />
                    <div className="relative p-4 md:p-6 z-10">
                        <div className="p-2 md:p-3 bg-white shadow-sm text-red-600 rounded-xl md:rounded-2xl border border-red-100 w-fit mb-3">
                            <AlertTriangle size={20} className="md:w-6 md:h-6" />
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-xs font-black uppercase mb-1">الذمم</p>
                        <h3 className="text-lg md:text-3xl font-black text-red-600 font-mono tracking-tight">{stats.unpaidCount}</h3>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 h-full border border-gray-100 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-800">النشاطات الأخيرة</h3>
                            <Button variant="ghost" onClick={() => setActiveTab('activity_log')} className="text-xs">الكل</Button>
                        </div>
                        <div className="space-y-4">
                            {stats.recentLogs.map((log: any) => (
                                <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                                    <div className="bg-blue-50 text-[#0e3c63] p-2 rounded-full mt-1 border border-blue-100 shrink-0">
                                        <Activity size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-sm text-gray-800 truncate">{log.action}</p>
                                            <div className="flex flex-col items-end shrink-0 mr-2 text-gray-400 font-mono">
                                                <span className="text-[9px] font-bold">{formatDate(log.timestamp, { day: '2-digit', month: '2-digit' })}</span>
                                                <span className="text-[8px]">{formatTime(log.timestamp)}</span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{log.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6 flex flex-col">
                    <Card className="p-6 bg-gradient-to-br from-[#0e3c63] to-[#164e7d] text-white shadow-xl relative overflow-hidden hidden md:block">
                        <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-10" style={{ backgroundImage: `url(${cubes})` }}></div>
                        <h3 className="font-bold text-lg mb-2 relative z-10">حالة النظام</h3>
                        <div className="flex items-center gap-2 mb-4 relative z-10">
                            <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${settings.maintenanceMode ? 'bg-red-400' : 'bg-green-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${settings.maintenanceMode ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            </span>
                            <span className="text-sm font-bold">{settings.maintenanceMode ? 'وضع الصيانة' : 'النظام يعمل'}</span>
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
                            أحدث الطلبات
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
