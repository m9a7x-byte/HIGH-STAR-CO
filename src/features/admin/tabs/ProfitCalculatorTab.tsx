import i18n from 'i18next';
const t = i18n.t.bind(i18n);

import React, { useState, useMemo } from 'react';
import { Calculator, DollarSign, Plus, Trash2, TrendingUp, TrendingDown, ArrowLeft, RefreshCw, MinusCircle, Wallet } from 'lucide-react';
import { Card, Button, Badge } from '../../../components/ui';

interface ExpenseItem {
    id: number;
    name: string;
    amount: number;
}

export const ProfitCalculatorTab = ({ orders, isDateInRange }: any) => {
    // Filter State
    const [calcFromDate, setCalcFromDate] = useState('');
    const [calcToDate, setCalcToDate] = useState('');

    // Expenses State
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [newExpenseName, setNewExpenseName] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');

    // Helper to format number with commas
    const formatNumber = (num: string) => {
        return num.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/,/g, '');
        if (rawValue === '' || /^\d+$/.test(rawValue)) {
            setNewExpenseAmount(formatNumber(rawValue));
        }
    };

    // Logic: Calculate Revenue from Orders
    const calculatedRevenue = useMemo(() => {
        if (!calcFromDate && !calcToDate) return 0; // Don't calculate if no filter selected
        
        return orders
            .filter((o: any) => isDateInRange(o.createdAt, calcFromDate, calcToDate))
            .reduce((acc: number, o: any) => acc + o.totalAmount, 0);
    }, [orders, calcFromDate, calcToDate]);

    // Logic: Calculate Total Expenses
    const totalExpenses = useMemo(() => {
        return expenses.reduce((acc, curr) => acc + curr.amount, 0);
    }, [expenses]);

    // Logic: Net Profit
    const netProfit = calculatedRevenue - totalExpenses;

    // Handlers
    const handleAddExpense = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const cleanAmount = newExpenseAmount.replace(/,/g, '');
        if (!newExpenseName || !cleanAmount) return;

        setExpenses(prev => [
            ...prev, 
            { id: Date.now(), name: newExpenseName, amount: Number(cleanAmount) }
        ]);
        setNewExpenseName('');
        setNewExpenseAmount('');
    };

    const handleRemoveExpense = (id: number) => {
        setExpenses(prev => prev.filter(e => e.id !== id));
    };

    const handleReset = () => {
        if (window.confirm('هل أنت متأكد من تصفير الحاسبة؟')) {
            setExpenses([]);
            setCalcFromDate('');
            setCalcToDate('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="bg-[#0e3c63] text-white p-3 rounded-xl shadow-lg">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{t('batch4.k410')}</h2>
                        <p className="text-gray-500 text-sm">{t('batch4.k411')}</p>
                    </div>
                </div>
                <Button onClick={handleReset} variant="ghost" className="text-red-500 hover:bg-red-50">
                    <RefreshCw size={16} className="mr-2"/> تصفير الحاسبة
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Right Side: Inputs & Expenses List (7 Columns) */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* 1. Date Filter (Source of Revenue) */}
                    <Card className="p-6">
                        <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-600"/>
                            1. تحديد فترة المبيعات
                        </h3>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-blue-800 mb-1">{t('batch4.k133')}</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-500"
                                    value={calcFromDate}
                                    onChange={(e) => setCalcFromDate(e.target.value)}
                                />
                            </div>
                            <ArrowLeft size={20} className="text-blue-300 hidden md:block mt-5"/>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-blue-800 mb-1">{t('batch4.k134')}</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-500"
                                    value={calcToDate}
                                    onChange={(e) => setCalcToDate(e.target.value)}
                                />
                            </div>
                        </div>
                        {calculatedRevenue > 0 && (
                            <div className="mt-4 text-center">
                                <p className="text-sm text-gray-500 font-bold">{t('batch4.k412')}</p>
                                <p className="text-3xl font-black text-[#0e3c63] font-mono mt-1">${calculatedRevenue.toLocaleString()}</p>
                            </div>
                        )}
                    </Card>

                    {/* 2. Expenses Input */}
                    <Card className="p-6 h-fit">
                        <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                            <TrendingDown size={20} className="text-red-500"/>
                            2. إضافة المصاريف (التكاليف)
                        </h3>
                        
                        <form onSubmit={handleAddExpense} className="flex gap-2 mb-6">
                            <input 
                                className="flex-[2] p-3 border-2 border-gray-200 rounded-xl focus:border-[#0e3c63] outline-none text-sm font-bold placeholder-gray-400"
                                placeholder={t('batch4.k413')}
                                value={newExpenseName}
                                onChange={e => setNewExpenseName(e.target.value)}
                            />
                            <div className="relative flex-1">
                                <input 
                                    type="text"
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#0e3c63] outline-none text-sm font-bold text-center placeholder-gray-400 font-mono"
                                    placeholder={t('batch4.k414')}
                                    value={newExpenseAmount}
                                    onChange={handleAmountChange}
                                />
                                <span className="absolute left-3 top-3 text-gray-400 font-bold text-xs">$</span>
                            </div>
                            <Button type="submit" className="bg-[#0e3c63] hover:bg-[#1c5c8e] px-4"><Plus size={20}/></Button>
                        </form>

                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-500 font-bold text-xs border-b">
                                    <tr>
                                        <th className="p-3">{t('batch4.k415')}</th>
                                        <th className="p-3 text-left pl-8">{t('batch4.k414')}</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {expenses.length === 0 ? (
                                        <tr><td colSpan={3} className="text-center p-6 text-gray-400 text-sm">{t('batch4.k416')}</td></tr>
                                    ) : (
                                        expenses.map(exp => (
                                            <tr key={exp.id} className="group hover:bg-gray-50 transition-colors">
                                                <td className="p-3 font-bold text-gray-700">{exp.name}</td>
                                                <td className="p-3 text-left font-mono font-bold text-red-600 pl-8">
                                                    -${exp.amount.toLocaleString()}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button 
                                                        onClick={() => handleRemoveExpense(exp.id)} 
                                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {expenses.length > 0 && (
                                    <tfoot className="bg-red-50 text-red-800 font-bold border-t border-red-100">
                                        <tr>
                                            <td className="p-3">{t('batch4.k417')}</td>
                                            <td className="p-3 text-left font-mono pl-8">-${totalExpenses.toLocaleString()}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Left Side: Result Dashboard (5 Columns) */}
                <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6 h-fit">
                    
                    {/* Result Card */}
                    <div className="bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                        {/* Background Deco */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                        
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-2 opacity-90 relative z-10">
                            <Wallet size={24}/>
                            النتيجة النهائية
                        </h3>

                        <div className="space-y-6 relative z-10">
                            {/* Revenue Line */}
                            <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="bg-white/10 p-1.5 rounded-lg"><Plus size={14}/></div>
                                    <span className="text-sm font-medium opacity-80">{t('batch4.k418')}</span>
                                </div>
                                <span className="font-mono font-bold text-xl">${calculatedRevenue.toLocaleString()}</span>
                            </div>

                            {/* Expense Line */}
                            <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="bg-red-500/20 text-red-200 p-1.5 rounded-lg"><MinusCircle size={14}/></div>
                                    <span className="text-sm font-medium opacity-80 text-red-200">{t('batch4.k419')}</span>
                                </div>
                                <span className="font-mono font-bold text-xl text-red-200">-${totalExpenses.toLocaleString()}</span>
                            </div>

                            {/* Net Profit */}
                            <div className="pt-2">
                                <p className="text-sm font-bold mb-2 opacity-70 uppercase tracking-wider">{t('batch4.k420')}</p>
                                <div className={`text-5xl font-mono font-black tracking-tighter transition-all duration-500 ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${netProfit.toLocaleString()}
                                </div>
                                {calculatedRevenue > 0 && (
                                    <div className="mt-4 flex gap-2">
                                        <Badge color={netProfit >= 0 ? 'green' : 'red'}>
                                            هامش الربح: {((netProfit / calculatedRevenue) * 100).toFixed(1)}%
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mini Instruction Card */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-yellow-800 text-sm">
                        <p className="font-bold mb-1 flex items-center gap-2"><DollarSign size={16}/>{t('batch4.k421')}</p>
                        <p className="opacity-80 leading-relaxed">
                            هذه الحاسبة تعمل كأداة مسودة (Draft) ولا تقوم بحفظ البيانات في قاعدة البيانات. بمجرد تحديث الصفحة ستعود القيم للصفر.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
