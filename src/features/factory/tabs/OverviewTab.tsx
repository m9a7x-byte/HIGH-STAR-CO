import React, { useMemo, useState, useEffect } from 'react';
import {
    TrendingDown, Box, AlertCircle, DollarSign, Activity,
    PieChart, ArrowUpRight, ArrowDownLeft, ShieldCheck,
    Zap, Utensils, Calendar, Wallet, ShoppingCart, Truck,
    TrendingUp, Layers, RefreshCcw, Clock, Briefcase, History,
    Fuel, Lightbulb, BarChart, Sparkles, BrainCircuit, Loader2,
    ZapOff, Gauge, Zap as ZapIcon, Info, Users, UserCheck,
    Hexagon, Package, ArrowRightLeft, ArrowDownCircle, ArrowUpCircle,
    Brain, MessageSquareText, Key, Percent
} from 'lucide-react';
import { Card, Badge, Button } from '../../../components/ui';
import { db } from '../../../lib/db';
import { MONTHS_AR, materialLabels } from '../components/SharedFactoryComponents';
import { formatDate } from '../../../lib/dateUtils';
import { GoogleGenAI, Type } from "@google/genai";

const ESTIMATED_WORKING_HOURS = 300;
const GEN_TO_NATIONAL_COST_RATIO = 5;
const AI_CACHE_KEY = 'voga_factory_ai_insights';
const AI_USAGE_KEY = 'voga_factory_ai_usage_count';
const AI_COOLDOWN_MS = 300000; // 5 minutes cooldown
const FREE_TIER_LIMIT = 50; // تقديري لعدد الطلبات في اليوم

const arabicCategoryMap: Record<string, string> = {
    'SALARY': 'رواتب الموظفين',
    'RENT': 'إيجار الموقع',
    'FOOD': 'طعام وإطعام',
    'DAILY_EXPENSE': 'نثريات يومية',
    'ELECTRICITY': 'طاقة وكهرباء',
    'TRANSPORT_OUT': 'نقل صادر',
    'TRANSPORT_IN': 'نقل وارد',
    'INVENTORY': 'المخزن',
    'CUSTOMS': 'تخليص كمركي',
    'SUPPLIER': 'حساب موردين',
    'SAFE_WITHDRAWAL': 'سحب نقدي',
    'SAFE_DEPOSIT': 'إيداع نقدي'
};

export const OverviewTab = ({ refreshTrigger }: { refreshTrigger: number }) => {
    const txs = db.getFactoryTransactions();
    const settings = db.vehicleConfig;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // AI State
    const [aiInsights, setAiInsights] = useState<any[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [usageCount, setUsageCount] = useState<number>(() => {
        return Number(localStorage.getItem(AI_USAGE_KEY)) || 0;
    });

    // Stats Calculation
    const stats = useMemo(() => {
        const monthlyTxs = txs.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const totalExpenses = monthlyTxs.filter(t =>
            ['SALARY', 'RENT', 'FOOD', 'DAILY_EXPENSE', 'ELECTRICITY'].includes(t.category)
        ).reduce((acc, t) => acc + t.amount, 0);

        const logisticsCost = monthlyTxs.filter(t =>
            ['TRANSPORT_IN', 'TRANSPORT_OUT', 'CUSTOMS'].includes(t.category)
        ).reduce((acc, t) => acc + t.amount, 0);

        const inventoryInvestment = txs.filter(t => t.category === 'INVENTORY' && t.transactionType === 'IN')
            .reduce((acc, t) => acc + t.amount, 0);

        const nationalPower = monthlyTxs.filter(t => t.category === 'ELECTRICITY' && (t.subType?.includes('الوطنية') || t.subType?.includes('حكومي'))).reduce((s, t) => s + t.amount, 0);
        const generatorPower = monthlyTxs.filter(t => t.category === 'ELECTRICITY' && !t.subType?.includes('الوطنية') && !t.subType?.includes('حكومي')).reduce((s, t) => s + t.amount, 0);

        const last4Inventory = txs.filter(t => t.category === 'INVENTORY')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 4);

        const recentTxs = [...txs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

        return { totalExpenses, inventoryInvestment, logisticsCost, recentTxs, nationalPower, generatorPower, last4Inventory };
    }, [txs, currentMonth, currentYear, refreshTrigger]);

    const totalEnergy = stats.nationalPower + stats.generatorPower;
    const nationalPerc = totalEnergy > 0 ? (stats.nationalPower / totalEnergy) * 100 : 0;

    const energyAnalytics = useMemo(() => {
        if (totalEnergy === 0) return { hourly: 0, savings: 0 };
        const hourly = totalEnergy / ESTIMATED_WORKING_HOURS;
        const worstCaseScenario = (stats.nationalPower * GEN_TO_NATIONAL_COST_RATIO) + stats.generatorPower;
        const actualSavingsAmount = worstCaseScenario - totalEnergy;
        const savingsPercentage = worstCaseScenario > 0 ? (actualSavingsAmount / worstCaseScenario) * 100 : 0;
        return { hourly, savings: savingsPercentage };
    }, [totalEnergy, stats.nationalPower, stats.generatorPower]);

    const loadStatus = useMemo(() => {
        if (totalEnergy === 0) return { label: 'لا توجد بيانات', color: 'gray', textClass: 'text-gray-500', dotClass: 'bg-gray-400', bgClass: 'bg-gray-50', borderClass: 'border-gray-100' };
        if (nationalPerc >= 70) return { label: 'مثالي', color: 'emerald', textClass: 'text-emerald-700', dotClass: 'bg-emerald-500', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-100' };
        if (nationalPerc >= 40) return { label: 'مستقر', color: 'blue', textClass: 'text-blue-700', dotClass: 'bg-blue-500', bgClass: 'bg-blue-50', borderClass: 'border-blue-100' };
        return { label: 'كلفة مرتفعة', color: 'red', textClass: 'text-red-700', dotClass: 'bg-red-500', bgClass: 'bg-red-50', borderClass: 'border-red-100' };
    }, [totalEnergy, nationalPerc]);

    // Load AI Cache on Mount
    useEffect(() => {
        const cached = localStorage.getItem(AI_CACHE_KEY);
        if (cached) {
            try {
                const { insights, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < 7200000) {
                    setAiInsights(insights);
                    setLastUpdated(timestamp);
                }
            } catch (e) { console.error("Cache parsing error", e); }
        }
    }, []);

    const callAI = async () => {
        if (lastUpdated && Date.now() - lastUpdated < AI_COOLDOWN_MS) {
            setAiError(`يرجى الانتظار قليلاً قبل التحديث مرة أخرى.`);
            return;
        }

        setIsAiLoading(true);
        setAiError(null);

        try {
            // استخدام المفتاح من الإعدادات أو الافتراضي
            const apiKey = settings.geminiApiKey || process.env.API_KEY;
            const ai = new GoogleGenAI({ apiKey: apiKey });

            const prompt = `أنت خبير مالي لمصنع فلين.البيانات الحالية لشهر ${MONTHS_AR[currentMonth]}:
- استثمار المخزن: $${stats.inventoryInvestment}
- مصاريف تشغيلية: $${stats.totalExpenses}
- توفير طاقة: % ${energyAnalytics.savings.toFixed(0)}
- كلفة ساعة الطاقة: $${energyAnalytics.hourly.toFixed(2)}
            
            قدم 3 نصائح استراتيجية قصيرة جداً(مباشرة للهندسة والمالية) بالعربية الفصحى البسيطة.`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                text: { type: Type.STRING }
                            },
                            required: ["title", "text"]
                        }
                    }
                }
            });

            const data = JSON.parse(response.text || "[]");
            setAiInsights(data);

            const now = Date.now();
            setLastUpdated(now);
            const newUsage = usageCount + 1;
            setUsageCount(newUsage);
            localStorage.setItem(AI_USAGE_KEY, newUsage.toString());
            localStorage.setItem(AI_CACHE_KEY, JSON.stringify({ insights: data, timestamp: now }));
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes('quota') || err.message?.includes('429')) {
                setAiError('نفد رصيد التوكنات المجاني (Quota Exceeded). يرجى تحديث المفتاح من الإعدادات.');
            } else {
                setAiError('تعذر الاتصال بالمحرك الذكي حالياً.');
            }
        } finally {
            setIsAiLoading(false);
        }
    };

    const quotaPercentage = Math.max(0, 100 - (usageCount / FREE_TIER_LIMIT * 100));

    return (
        <div className="space-y-8 animate-fade-in pb-12" dir="rtl">

            {/* Header */}
            <div className="flex flex-row justify-between items-end px-2">
                <div className="text-right">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center gap-3">
                        إحصائيات شهر {MONTHS_AR[currentMonth]}
                        <BarChart size={32} className="text-[#0e3c63]" />
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-1 uppercase">VOGA FACTORY INTELLIGENCE</p>
                </div>
                <Badge color="blue" className="px-4 py-1.5 rounded-lg text-[10px] font-black">محدث لحظياً</Badge>
            </div>

            {/* Top 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-8 bg-white border border-gray-100 shadow-xl rounded-[2.5rem] group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"><Truck size={28} /></div>
                        <div className="text-left">
                            <p className="text-blue-300 text-[11px] font-black uppercase tracking-widest mb-1">تكاليف النقل والكمارك</p>
                            <h3 className="text-3xl font-black font-mono text-gray-800">${stats.logisticsCost.toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 bg-white border border-gray-100 shadow-xl rounded-[2.5rem] group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl group-hover:scale-110 transition-transform"><TrendingDown size={28} /></div>
                        <div className="text-left">
                            <p className="text-blue-300 text-[11px] font-black uppercase tracking-widest mb-1">إجمالي الإنفاق للفترة</p>
                            <h3 className="text-3xl font-black font-mono text-gray-800">${stats.totalExpenses.toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 bg-white border border-gray-100 shadow-xl rounded-[2.5rem] group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><Layers size={28} /></div>
                        <div className="text-left">
                            <p className="text-blue-300 text-[11px] font-black uppercase tracking-widest mb-1">قيمة المواد المتوفرة</p>
                            <h3 className="text-3xl font-black font-mono text-gray-800">${stats.inventoryInvestment.toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Energy Analysis */}
                <Card className="xl:col-span-7 p-10 border border-gray-100 shadow-xl rounded-[2.5rem] bg-white">
                    <div className="flex flex-row justify-between items-start mb-12">
                        <div className="text-right">
                            <h4 className="font-black text-2xl text-gray-800 flex items-center gap-2">
                                <Lightbulb size={24} className="text-amber-500" />
                                كفاءة وتحليل كلف الطاقة
                            </h4>
                            <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em] mt-1 uppercase">ENERGY SOURCE DYNAMICS</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                        <div className="md:col-span-4 space-y-6">
                            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 text-right">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="p-2.5 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-100"><ZapIcon size={20} /></div>
                                    <Badge color="blue" className="bg-white border-blue-100 text-blue-600 text-[10px] font-black">{nationalPerc.toFixed(1)}%</Badge>
                                </div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">الكهرباء الوطنية</p>
                                <h5 className="font-black text-blue-900 text-2xl tracking-tight">${stats.nationalPower.toLocaleString()}</h5>
                            </div>
                            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 text-right">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100"><Fuel size={20} /></div>
                                    <Badge color="yellow" className="bg-white border-amber-100 text-amber-600 text-[10px] font-black">{(100 - nationalPerc).toFixed(1)}%</Badge>
                                </div>
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">المولدات الأهلية</p>
                                <h5 className="font-black text-amber-900 text-2xl tracking-tight">${stats.generatorPower.toLocaleString()}</h5>
                            </div>
                        </div>
                        <div className="md:col-span-5 flex justify-center">
                            <div className="relative w-64 h-64 md:w-72 md:h-72">
                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
                                    {totalEnergy > 0 && (
                                        <>
                                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4.5" strokeDasharray={`${nationalPerc} ${100 - nationalPerc} `} strokeDashoffset="0" className="transition-all duration-1000" />
                                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray={`${100 - nationalPerc} ${nationalPerc} `} strokeDashoffset={-nationalPerc} className="transition-all duration-1000" />
                                        </>
                                    )}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي الفاتورة</span>
                                    <span className="text-4xl md:text-5xl font-black font-mono text-gray-800">${totalEnergy.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3 space-y-4 text-center">
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">كلفة الساعة</p>
                                <p className="text-xl font-black text-gray-800 font-mono">${energyAnalytics.hourly.toFixed(2)}</p>
                            </div>
                            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">توفير الطاقة</p>
                                <p className="text-xl font-black text-emerald-600 font-mono">+{energyAnalytics.savings.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* AI Intelligence Section */}
                <Card className="xl:col-span-5 p-10 bg-white border border-gray-100 shadow-xl rounded-[3rem] relative overflow-hidden flex flex-col min-h-[500px]">
                    <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-br from-purple-50 to-blue-50 opacity-50"></div>

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-200"><BrainCircuit size={28} /></div>
                            <div>
                                <h4 className="font-black text-2xl text-gray-800">تحليلات الـ AI</h4>
                                <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest">Powered by VOGA Brain</p>
                            </div>
                        </div>
                        <Button
                            onClick={callAI}
                            disabled={isAiLoading}
                            className="bg-[#0e3c63] text-white px-4 h-12 rounded-xl text-xs font-black shadow-lg hover:shadow-blue-900/20 active:scale-95 transition-all"
                        >
                            {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                            {isAiLoading ? 'تحليل...' : 'تحديث الذكاء'}
                        </Button>
                    </div>

                    {/* AI Quota Usage Bar */}
                    <div className="relative z-10 mb-6 bg-purple-50 p-4 rounded-2xl border border-purple-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                                <Gauge size={12} /> استهلاك الحصة المجانية
                            </span>
                            <span className="text-xs font-black text-purple-700 font-mono">{quotaPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                            <div
                                className={`h-full transition-all duration-1000 rounded-full ${quotaPercentage < 20 ? 'bg-red-500' : 'bg-purple-500'}`}
                                style={{ width: `${quotaPercentage}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1 relative z-10 text-right">
                        {aiError && (
                            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 animate-shake">
                                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] text-red-700 font-black leading-relaxed">{aiError}</p>
                                    <p className="text-[9px] text-red-600/70 font-bold mt-1">تلميح: يمكنك تغيير كود الـ API من إعدادات النظام.</p>
                                </div>
                            </div>
                        )}

                        {isAiLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-24 bg-gray-50 rounded-[2rem] animate-pulse border border-gray-100"></div>
                            ))
                        ) : aiInsights.length > 0 ? (
                            aiInsights.map((insight, idx) => (
                                <div key={idx} className="p-5 rounded-[2.2rem] border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-xl transition-all group border-b-4 border-b-purple-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-50 rounded-xl shadow-sm text-purple-600 group-hover:scale-110 transition-transform"><Sparkles size={14} /></div>
                                        <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{insight.title}</p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-500 leading-relaxed px-1">{insight.text}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                                <MessageSquareText size={48} className="mx-auto mb-4 opacity-10" />
                                <p className="font-black text-xs px-10 leading-relaxed text-gray-400">اضغط على زر التحديث لاستدعاء الذكاء الاصطناعي وتحليل بيانات المصنع الحالية.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Last 4 Inventory Transactions (Bags & Cartons) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <History size={18} className="text-[#0e3c63]" />
                    <h4 className="font-black text-sm text-gray-800 uppercase tracking-widest">أحدث حركات المخزن (تغليف ومواد)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.last4Inventory.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-400 font-bold bg-white rounded-3xl border-2 border-dashed border-gray-100">لم يتم تسجيل حركات مخزن بعد</div>
                    ) : stats.last4Inventory.map(item => {
                        const isIN = item.transactionType === 'IN';
                        return (
                            <Card key={item.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative group transition-all hover:shadow-2xl hover:border-blue-100">
                                <div className="flex justify-end mb-4">
                                    <div className={`p-3 rounded-xl shadow-sm ${isIN ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {isIN ? <ArrowDownCircle size={22} /> : <ArrowUpCircle size={22} />}
                                    </div>
                                </div>
                                <div className="text-right mb-6 min-h-[40px]">
                                    <p className={`text-[10px] font-black uppercase mb-1 ${isIN ? 'text-emerald-500' : 'text-orange-500'}`}>{isIN ? 'وارد للمخزن' : 'صرف للإنتاج'}</p>
                                    <h5 className="font-black text-gray-800 text-sm uppercase tracking-tight">{materialLabels[item.materialType!] || item.materialType}</h5>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-black font-mono tracking-tighter ${isIN ? 'text-emerald-700' : 'text-orange-700'}`}>{item.quantity?.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase">وحدة</span>
                                </div>
                                <div className={`absolute bottom-0 left-0 right-0 h-1.5 rounded-b-[2rem] overflow-hidden ${isIN ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Last 8 Recorded Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-12 p-0 border border-gray-100 shadow-xl overflow-hidden rounded-[3rem] bg-white">
                    <div className="p-8 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center px-10">
                        <h4 className="font-black text-xl text-gray-800 flex items-center gap-3">
                            <Activity size={24} className="text-[#0e3c63]" />
                            آخر العمليات المسجلة (أحدث 8)
                        </h4>
                        <div className="bg-white px-4 py-1.5 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-200">LATEST RECORDS</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <tbody className="divide-y divide-gray-50">
                                {stats.recentTxs.map(t => (
                                    <tr key={t.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="p-6 pr-10">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                                                    {t.category === 'INVENTORY' ? <Box size={20} /> : <DollarSign size={20} />}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-gray-800 text-xs font-mono uppercase tracking-tight">
                                                        {arabicCategoryMap[t.category] || t.category}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-black font-mono mt-1 tracking-widest">{formatDate(t.date)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-sm font-bold text-gray-500 truncate max-w-[400px]">{t.notes || t.supplierName || t.brokerName || '-'}</p>
                                        </td>
                                        <td className="p-6 text-left pl-10">
                                            <span className={`font-mono font-black text-xl ${t.transactionType === 'OUT' || ['SALARY', 'RENT', 'FOOD', 'DAILY_EXPENSE', 'ELECTRICITY', 'TRANSPORT_OUT', 'CUSTOMS'].includes(t.category) ? 'text-gray-800' : 'text-emerald-600'}`}>
                                                ${t.amount.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {stats.recentTxs.length === 0 && (
                                    <tr><td colSpan={3} className="p-20 text-center text-gray-400 font-black">لا توجد عمليات مسجلة حالياً</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};
