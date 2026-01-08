
import React, { useMemo, useState, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, DollarSign, Box, Layers, Users, MapPin,
    BarChart3, PieChart, Activity, CheckCircle2, Clock, Hourglass,
    Filter, Calendar, Ruler, Award, ArrowUpRight, ArrowDownLeft,
    ShoppingBag, Landmark, Target, Globe, Star, Zap, ShoppingCart, PackagePlus,
    ListOrdered, ChevronLeft, ArrowRight, Gauge, MousePointer2, Briefcase,
    AlertCircle, BarChart, Percent, History, Map, Trophy, Sparkles
} from 'lucide-react';
import { Card, Badge, DateRangePicker, Button } from '../../../components/ui';
import { UserSelector } from '../../../components/shared/UserSelector';
import { db } from '../../../lib/db';
import { formatDate } from '../../../lib/dateUtils';
import { PaymentStatus, ProductionStatus, AgentType, Product, Order, OrderItem } from '../../../types';
import { ADHESIVE_CATEGORY, STYROFOAM_CATEGORIES } from '../../../lib/constants';

export const ReportsTab = ({ orders, products, agents, isDateInRange, onNavigateToOrders, onNavigateToAgent, onViewOrder }: any) => {
    const [reportAgent, setReportAgent] = useState<'ALL' | number>('ALL');
    const [reportFromDate, setReportFromDate] = useState('');
    const [reportToDate, setReportToDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 700);
        return () => clearTimeout(timer);
    }, [reportAgent, reportFromDate, reportToDate]);

    const reportData = useMemo(() => {
        const filtered = orders.filter((o: any) => {
            const agentMatch = reportAgent === 'ALL' || o.agentId === reportAgent;
            const dateMatch = isDateInRange(o.createdAt, reportFromDate, reportToDate);
            return agentMatch && dateMatch;
        });

        // 1. المبالغ والمعدلات
        const totalRevenue = filtered.reduce((acc: number, o: any) => acc + o.totalAmount, 0);
        const totalPaid = filtered.reduce((acc: number, o: any) => acc + o.paidAmount, 0);
        const totalDebt = totalRevenue - totalPaid;
        const avgOrderValue = filtered.length > 0 ? totalRevenue / filtered.length : 0;

        // 2. تحليل عميق للمواد
        let foamCartons = 0;
        let foamMeters = 0;
        let adhesiveBags = 0;
        let foamRevenue = 0;
        let adhesiveRevenue = 0;
        let specialRequestsCount = 0;

        const foamSales: Record<number, { code: string, cartons: number, meters: number, revenue: number, dims: string }> = {};
        const adhesiveSales: Record<number, { code: string, bags: number, revenue: number, dims: string }> = {};

        filtered.forEach((order: Order) => {
            order.items.forEach((item: OrderItem) => {
                // Count Special Requests
                if (item.isSpecialRequest) {
                    specialRequestsCount += 1;
                }

                const p = products.find((x: any) => x.id === item.productId);
                const isAdhesive = p ? db.categories.find((c: any) => c.name === p.category)?.type === 'ADHESIVE' : false;

                if (isAdhesive) {
                    if (!adhesiveSales[item.productId]) {
                        adhesiveSales[item.productId] = { code: item.productCode, bags: 0, revenue: 0, dims: item.productDimensions };
                    }
                    adhesiveSales[item.productId].bags += item.quantityCartons;
                    adhesiveSales[item.productId].revenue += item.totalPrice;
                    adhesiveBags += item.quantityCartons;
                    adhesiveRevenue += item.totalPrice;
                } else if (!item.isSpecialRequest) { // Only count standard foam items here
                    if (!foamSales[item.productId]) {
                        foamSales[item.productId] = { code: item.productCode, cartons: 0, meters: 0, revenue: 0, dims: item.productDimensions };
                    }
                    // احتساب الأمتار المضافة يدوياً فقط لعرضها كبادج
                    foamSales[item.productId].cartons += item.quantityCartons;
                    foamSales[item.productId].meters += (item.quantityMeters || 0);
                    foamSales[item.productId].revenue += item.totalPrice;

                    const itemMetersTotal = (item.quantityCartons * (p?.metersPerCarton || 0)) + (item.quantityMeters || 0);
                    foamCartons += item.quantityCartons;
                    foamMeters += itemMetersTotal;
                    foamRevenue += item.totalPrice;
                }
            });
        });

        // أحدث 5 طلبات
        const recentOrders = [...filtered]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

        // تحليل الوكلاء
        const agentPerf: Record<number, { name: string, total: number, orders: number, province: string }> = {};
        filtered.forEach((o: any) => {
            if (!agentPerf[o.agentId]) agentPerf[o.agentId] = { name: o.agentName, total: 0, orders: 0, province: o.agentProvince };
            agentPerf[o.agentId].total += o.totalAmount;
            agentPerf[o.agentId].orders += 1;
        });

        const topAgents = Object.entries(agentPerf)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([id, data]) => ({ id: Number(id), ...data }));

        // تحليل المحافظات
        const provincePerf: Record<string, number> = {};
        filtered.forEach((o: any) => {
            provincePerf[o.agentProvince] = (provincePerf[o.agentProvince] || 0) + o.totalAmount;
        });

        const topProvinces = Object.entries(provincePerf)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, total]) => ({ name, total }));

        return {
            totalRevenue, totalPaid, totalDebt, avgOrderValue,
            foamCartons, foamMeters, foamRevenue,
            adhesiveBags, adhesiveRevenue,
            specialRequestsCount,
            recentOrders, topAgents, topProvinces,
            ordersCount: filtered.length,
            topFoam: Object.values(foamSales).sort((a, b) => b.cartons - a.cartons).slice(0, 5),
            topAdhesive: Object.values(adhesiveSales).sort((a, b) => b.bags - a.bags).slice(0, 5)
        };
    }, [orders, reportAgent, reportFromDate, reportToDate, products, isDateInRange]);

    const getRankStyle = (index: number) => {
        switch (index) {
            case 0: return { bg: 'bg-amber-400', text: 'text-amber-950', icon: <Trophy size={16} />, label: 'الأول' };
            case 1: return { bg: 'bg-slate-300', text: 'text-slate-900', icon: <Award size={16} />, label: 'الثاني' };
            case 2: return { bg: 'bg-orange-400', text: 'text-orange-950', icon: <Star size={16} />, label: 'الثالث' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-500', icon: null, label: (index + 1).toString() };
        }
    };

    // Calculate percentages based on combined foam + adhesive revenue (to always fill the circle 100%)
    const combinedMaterialRevenue = reportData.foamRevenue + reportData.adhesiveRevenue;
    const foamShare = combinedMaterialRevenue > 0 ? (reportData.foamRevenue / combinedMaterialRevenue) * 100 : 0;
    const adhesiveShare = combinedMaterialRevenue > 0 ? (reportData.adhesiveRevenue / combinedMaterialRevenue) * 100 : 0;

    return (
        <div className="space-y-10 animate-fade-in pb-20">

            {/* --- الفلترة العلوية --- */}
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-[2.5rem] shadow-xl border border-white flex flex-col xl:flex-row justify-between items-center gap-6 sticky top-0 z-40">
                <div className="flex items-center gap-4 px-2">
                    <div className="bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] p-3 rounded-2xl text-white shadow-lg">
                        <BarChart3 size={28} />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl text-gray-800">التقارير التحليلية</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">نظام الإحصاء المركزي</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="w-full md:w-72">
                        <UserSelector users={agents} selectedUserId={reportAgent} onChange={setReportAgent} placeholder="كل الوكلاء" />
                    </div>
                    <DateRangePicker from={reportFromDate} to={reportToDate} onChangeFrom={setReportFromDate} onChangeTo={setReportToDate} />
                </div>
            </div>

            {/* --- بطاقات KPI --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <Card className="p-6 border-0 shadow-lg bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-70"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">إجمالي المبيعات</p>
                    <h4 className="text-2xl font-black text-gray-800 font-mono relative z-10">${reportData.totalRevenue.toLocaleString()}</h4>
                    <div className="mt-4 p-2 bg-blue-50 text-[#0e3c63] rounded-xl w-fit"><DollarSign size={18} /></div>
                </Card>

                <Card className="p-6 border-0 shadow-lg bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-70"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">الواصل النقدي</p>
                    <h4 className="text-2xl font-black text-emerald-600 font-mono relative z-10">${reportData.totalPaid.toLocaleString()}</h4>
                    <div className="mt-4 p-2 bg-emerald-50 text-emerald-600 rounded-xl w-fit"><TrendingUp size={18} /></div>
                </Card>

                <Card className="p-6 border-0 shadow-lg bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-70"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">الديون المفتوحة</p>
                    <h4 className="text-2xl font-black text-red-600 font-mono relative z-10">${reportData.totalDebt.toLocaleString()}</h4>
                    <div className="mt-4 p-2 bg-red-50 text-red-600 rounded-xl w-fit"><TrendingDown size={18} /></div>
                </Card>

                <Card className="p-6 border-0 shadow-lg bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-70"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">متوسط قيمة الطلب</p>
                    <h4 className="text-2xl font-black text-gray-800 font-mono relative z-10">${Math.round(reportData.avgOrderValue).toLocaleString()}</h4>
                    <div className="mt-4 p-2 bg-orange-50 text-orange-600 rounded-xl w-fit"><Activity size={18} /></div>
                </Card>

                {/* Special Orders Card (Expanded) */}
                <Card className="md:col-span-2 p-6 border-0 shadow-lg bg-gradient-to-br from-amber-50 to-white relative overflow-hidden group border-amber-100">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-70"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest mb-1">عدد الطلبات الخاصة</p>
                            <h4 className="text-3xl font-black text-amber-600 font-mono">{reportData.specialRequestsCount}</h4>
                            <p className="text-[9px] font-bold text-amber-800/50 mt-1">طلبات بمواصفات غير قياسية</p>
                        </div>
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shadow-sm"><Sparkles size={24} /></div>
                    </div>
                </Card>

                <Card className="p-6 border-0 shadow-lg bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-70"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">حجم الفلين الكلي</p>
                    <h4 className="text-xl font-black text-gray-800 font-mono relative z-10">{reportData.foamCartons.toLocaleString()} كارتون</h4>
                    <p className="text-[10px] font-bold text-blue-500 mt-1 relative z-10">{Math.round(reportData.foamMeters).toLocaleString()} متر كلي</p>
                    <div className="mt-4 p-2 bg-blue-50 text-[#0e3c63] rounded-xl w-fit"><Box size={18} /></div>
                </Card>

                <Card className="p-6 border-0 shadow-lg bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-70"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">حجم اللاصق الكلي</p>
                    <h4 className="text-xl font-black text-gray-800 font-mono relative z-10">{reportData.adhesiveBags.toLocaleString()} كيس</h4>
                    <div className="mt-4 p-2 bg-purple-50 text-purple-600 rounded-xl w-fit"><Layers size={18} /></div>
                </Card>
            </div>

            {/* --- الصف العلوي للتحليلات (الإيرادات + المحافظات + الوكلاء) --- */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">

                {/* بطاقة توزيع الإيرادات (الرسم الدائري) */}
                <Card className="xl:col-span-5 p-10 border-0 shadow-2xl rounded-[3rem] bg-white relative overflow-hidden flex flex-col items-center justify-center min-h-[600px]">
                    <h4 className="text-xl font-black text-gray-800 mb-10 w-full text-right flex items-center gap-3">
                        <PieChart size={24} className="text-[#0e3c63]" />
                        توزيع إيرادات المواد
                    </h4>

                    <div className="relative w-72 h-72 mb-12 group">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3"></circle>
                            {reportData.totalRevenue > 0 && (
                                <>
                                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#0e3c63" strokeWidth="4.2" strokeDasharray={`${foamShare} ${100 - foamShare}`} strokeDashoffset="0" className="transition-all duration-1000"></circle>
                                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#9333ea" strokeWidth="4.2" strokeDasharray={`${adhesiveShare} ${100 - adhesiveShare}`} strokeDashoffset={-foamShare} className="transition-all duration-1000"></circle>
                                </>
                            )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الإيراد الكلي</span>
                            <span className="text-3xl font-black text-gray-800 font-mono">${reportData.totalRevenue.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="p-6 rounded-[2rem] bg-blue-50 border border-blue-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#0e3c63]"></div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-black text-[#0e3c63]">قسم الفلين</span>
                                <span className="text-xl font-black font-mono text-gray-800">{foamShare.toFixed(1)}%</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 flex justify-between"><span>كرتون:</span> <span>{reportData.foamCartons.toLocaleString()}</span></p>
                                <p className="text-[10px] font-bold text-gray-500 flex justify-between"><span>أمتار:</span> <span>{Math.round(reportData.foamMeters).toLocaleString()} م²</span></p>
                                <p className="text-lg font-black text-[#0e3c63] font-mono mt-3">${reportData.foamRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-purple-50 border border-purple-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-black text-purple-600">قسم اللاصق</span>
                                <span className="text-xl font-black font-mono text-gray-800">{adhesiveShare.toFixed(1)}%</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-500 flex justify-between"><span>أكياس:</span> <span>{reportData.adhesiveBags.toLocaleString()}</span></p>
                                <p className="text-[10px] font-bold text-gray-500 opacity-0">-</p>
                                <p className="text-lg font-black text-purple-600 font-mono mt-3">${reportData.adhesiveRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* الجانب الأيمن: المحافظات + الوكلاء (نفس الارتفاع) */}
                <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

                    {/* أكثر المحافظات طلباً */}
                    <Card className="p-8 border-0 shadow-2xl rounded-[3rem] bg-white flex flex-col h-full min-h-[600px]">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <Map size={24} className="text-red-500" />
                            <h4 className="font-black text-lg text-gray-800 uppercase tracking-widest">أكثر المحافظات طلباً</h4>
                        </div>
                        <div className="space-y-8 flex-1">
                            {reportData.topProvinces.map((prov, idx) => {
                                const perc = reportData.totalRevenue > 0 ? (prov.total / reportData.totalRevenue) * 100 : 0;
                                return (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-all font-black text-xs">{idx + 1}</div>
                                                <span className="font-black text-gray-800">{prov.name}</span>
                                            </div>
                                            <span className="font-mono font-black text-[#0e3c63] tracking-tighter text-sm">${prov.total.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                            <div className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-1000" style={{ width: `${perc}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="pt-6 border-t border-gray-50 flex items-center justify-center gap-2">
                            <Globe size={14} className="text-blue-400" />
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">تحليل جغرافي</span>
                        </div>
                    </Card>

                    {/* أفضل الوكلاء سحباً */}
                    <Card className="p-0 overflow-hidden border-0 shadow-2xl rounded-[3rem] bg-white flex flex-col h-full min-h-[600px]">
                        <div className="p-8 pb-4 flex items-center gap-3">
                            <Star size={24} className="text-amber-500" />
                            <h4 className="font-black text-lg text-gray-800 uppercase tracking-widest">أفضل الوكلاء سحباً</h4>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50/50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="p-5 text-center w-12">#</th>
                                        <th className="p-5 text-right">الوكيل</th>
                                        <th className="p-5 text-left pl-8">المجموع</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {reportData.topAgents.map((agent, idx) => (
                                        <tr key={agent.id} className="hover:bg-blue-50/30 transition-all">
                                            <td className="p-5 text-center">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shadow-sm ${getRankStyle(idx).bg} ${getRankStyle(idx).text}`}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <button onClick={() => onNavigateToAgent(agent.id)} className="font-black text-gray-800 text-xs hover:text-[#0e3c63] transition-colors">{agent.name}</button>
                                                <span className="block text-[8px] text-gray-400 font-bold">{agent.province}</span>
                                            </td>
                                            <td className="p-5 text-left pl-8 font-mono font-black text-emerald-600 text-xs">
                                                ${agent.total.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase">
                                <span>إجمالي سحب الـ 5:</span>
                                <span className="text-[#0e3c63]">${reportData.topAgents.reduce((s, a) => s + a.total, 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* --- الصف السفلي (أحدث الطلبات + المنتجات الأكثر مبيعاً) --- */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">

                {/* أحدث 5 طلبات مواد (تفاعلية ومرتبة بدقة) */}
                <div className="xl:col-span-4 space-y-4 flex flex-col">
                    <div className="flex items-center gap-2 px-2 shrink-0">
                        <History size={20} className="text-[#0e3c63]" />
                        <h4 className="font-black text-base text-gray-800 uppercase tracking-widest">أحدث 5 طلبات مواد</h4>
                    </div>
                    <Card className="p-4 border-0 shadow-xl rounded-[2.5rem] bg-white flex-1 flex flex-col">
                        <div className="flex-1 space-y-3 p-1">
                            {reportData.recentOrders.map((order: any) => {
                                const foamCartons = order.items
                                    .filter((i: any) => {
                                        const p = products.find((pr: any) => pr.id === i.productId);
                                        const isAdh = p ? db.categories.find((c: any) => c.name === p.category)?.type === 'ADHESIVE' : false;
                                        return !isAdh;
                                    })
                                    .reduce((acc: number, i: any) => acc + i.quantityCartons, 0);

                                const foamMeters = order.items
                                    .filter((i: any) => {
                                        const p = products.find((pr: any) => pr.id === i.productId);
                                        const isAdh = p ? db.categories.find((c: any) => c.name === p.category)?.type === 'ADHESIVE' : false;
                                        return !isAdh;
                                    })
                                    .reduce((acc: number, i: any) => acc + i.quantityMeters, 0);

                                const adhBags = order.items
                                    .filter((i: any) => {
                                        const p = products.find((pr: any) => pr.id === i.productId);
                                        const isAdh = p ? db.categories.find((c: any) => c.name === p.category)?.type === 'ADHESIVE' : false;
                                        return isAdh;
                                    })
                                    .reduce((acc: number, i: any) => acc + i.quantityCartons, 0);

                                return (
                                    <div key={order.id} className="p-4 bg-gray-50/50 hover:bg-blue-50/30 border border-gray-100 rounded-[2rem] transition-all group relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <button
                                                onClick={() => onViewOrder(order)}
                                                className="font-mono font-black text-[#0e3c63] text-base bg-white px-3 py-1 rounded-xl shadow-sm hover:scale-105 transition-transform"
                                                title="عرض تفاصيل الطلب"
                                            >
                                                #{order.id}
                                            </button>
                                            <div className="text-left">
                                                <p className="text-[10px] text-gray-500 font-bold">{formatDate(order.createdAt)}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => onNavigateToAgent(order.agentId)}
                                            className="block w-full text-right mb-3 group/name"
                                        >
                                            <h5 className="font-black text-gray-800 text-xs group-hover/name:text-blue-600 transition-colors flex items-center gap-2">
                                                <Users size={12} className="text-gray-400 group-hover/name:text-blue-500" />
                                                {order.agentName}
                                            </h5>
                                        </button>

                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-gray-200">
                                            {foamCartons > 0 && <span className="bg-blue-100/50 text-[#0e3c63] px-2 py-1 rounded-lg text-[9px] font-black border border-blue-100 flex items-center gap-1"><Box size={10} /> {foamCartons} كارتون</span>}
                                            {foamMeters > 0 && <span className="bg-sky-50 text-sky-700 px-2 py-1 rounded-lg text-[9px] font-black border border-sky-100 flex items-center gap-1"><Ruler size={10} /> {foamMeters} م²</span>}
                                            {adhBags > 0 && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg text-[9px] font-black border border-purple-100 flex items-center gap-1"><Layers size={10} /> {adhBags} كيس</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* منصة تتويج المنتجات - الطول تم تعديله ليتناسب مع البطاقة المجاورة */}
                <div className="xl:col-span-8 space-y-4 flex flex-col">
                    <div className="flex items-center gap-2 px-2 shrink-0">
                        <Award size={20} className="text-amber-500" />
                        <h4 className="font-black text-base text-gray-800 uppercase tracking-widest">أحدث المنتجات مبيعاً</h4>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                        {/* فوم */}
                        <Card className="p-6 bg-white border border-gray-100 shadow-xl rounded-[2.5rem] flex flex-col">
                            <h5 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Box size={16} /> أفضل مبيعات الفلين
                            </h5>
                            <div className="space-y-3 flex-1">
                                {reportData.topFoam.map((p, idx) => {
                                    const rank = getRankStyle(idx);
                                    return (
                                        <div key={idx} className="bg-gray-50/50 p-4 rounded-[1.8rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-[#0e3c63] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shadow-inner ${rank.bg} ${rank.text}`}>
                                                    {rank.icon || <span className="text-[10px]">{rank.label}</span>}
                                                    {rank.icon && <span className="text-[7px] font-black mt-0.5">{rank.label}</span>}
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-gray-800 font-mono text-sm leading-tight">{p.code}</h5>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{p.dims}</p>
                                                </div>
                                            </div>
                                            <div className="text-left font-mono flex items-center gap-2">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xl font-black text-gray-800">{p.cartons.toLocaleString()}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">كارتون</span>
                                                </div>
                                                {p.meters > 0 && (
                                                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 flex flex-col items-center min-w-[50px]">
                                                        <span className="text-xs font-black">{p.meters.toLocaleString()}</span>
                                                        <span className="text-[7px] font-bold uppercase">متر</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* لاصق */}
                        <Card className="p-6 bg-white border border-gray-100 shadow-xl rounded-[2.5rem] flex flex-col">
                            <h5 className="text-xs font-black text-purple-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Layers size={16} /> أفضل مبيعات اللاصق
                            </h5>
                            <div className="space-y-3 flex-1">
                                {reportData.topAdhesive.map((p, idx) => {
                                    const rank = getRankStyle(idx);
                                    return (
                                        <div key={idx} className="bg-gray-50/50 p-4 rounded-[1.8rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-purple-600 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shadow-inner ${rank.bg} ${rank.text}`}>
                                                    {rank.icon || <span className="text-[10px]">{rank.label}</span>}
                                                    {rank.icon && <span className="text-[7px] font-black mt-0.5">{rank.label}</span>}
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-gray-800 font-mono text-sm leading-tight">{p.code}</h5>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{p.dims}</p>
                                                </div>
                                            </div>
                                            <div className="text-left font-mono">
                                                <span className="text-xl font-black text-purple-600">{p.bags.toLocaleString()}</span>
                                                <span className="text-[9px] font-bold text-gray-400 mr-1 uppercase">كيس</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
