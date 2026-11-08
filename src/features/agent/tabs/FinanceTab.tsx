import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import { useTranslation } from 'react-i18next';
import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, FileText, Search, DollarSign, Eye } from 'lucide-react';
import { Card } from '../../../components/ui';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { WalletTransaction, Order } from '../../../types';
import { db } from '../../../lib/db';
import { formatDate, formatTime } from '../../../lib/dateUtils';

interface FinanceTabProps {
    myTransactions: WalletTransaction[];
    currentBalance: number;
    isDebt: boolean;
    onViewOrder: (order: Order) => void;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ myTransactions, currentBalance, isDebt, onViewOrder }) => {
  const { t } = useTranslation();
    const [financePage, setFinancePage] = useState(0);
    const [financeRowsPerPage, setFinanceRowsPerPage] = useState(10);
    const [financeSearch, setFinanceSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Trigger loading on mount & search
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, [financeSearch]);

    const filteredTransactions = useMemo(() => {
        return myTransactions.filter(t =>
            t.description.toLowerCase().includes(financeSearch.toLowerCase()) ||
            t.amount.toString().includes(financeSearch)
        );
    }, [myTransactions, financeSearch]);

    
    const translateDesc = (desc: string) => {
        if (!desc) return '';
        let res = desc;
        res = res.replace('تسديد دفعة للطلب', t('agent.desc_deposit'));
        res = res.replace('تسديد رصيد يدوي', t('agent.desc_pay_balance'));
        res = res.replace('إضافة رصيد يدوي', t('agent.desc_add_balance'));
        res = res.replace('استقطاع رصيد متبقي', t('agent.desc_manual_debt'));
        res = res.replace('تسوية حساب سالب', t('agent.desc_manual_credit'));
        res = res.replace('استقطاع', t('agent.desc_deduct'));
        res = res.replace('شراء طلبية', t('agent.desc_purchase_order'));
        res = res.replace('دفعة', t('agent.desc_payment'));
        return res;
    };

    const currentTransactions = useMemo(() => {
        return filteredTransactions.slice(financePage * financeRowsPerPage, (financePage + 1) * financeRowsPerPage);
    }, [filteredTransactions, financePage, financeRowsPerPage]);

    return (
        <div className="space-y-6 animate-fade-in">

            {/* 1. Summary Cards */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-[#0e3c63] text-white p-4 rounded-full">
                        <Wallet size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{t('agent.account_statement')}</h2>
                        <p className="text-gray-500">{t('agent.account_statement_sub')}</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                        <div className="h-24 bg-gray-200 rounded-2xl"></div>
                        <div className="h-24 bg-gray-200 rounded-2xl"></div>
                        <div className="h-24 bg-gray-200 rounded-2xl"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-sm text-gray-500 mb-1 font-bold">{t('agent.total_payments')}</p>
                            <p className="text-xl font-mono font-bold text-green-600">
                                ${myTransactions.filter(t => t.amount > 0).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-sm text-gray-500 mb-1 font-bold">{t('agent.total_debts')}</p>
                            <p className="text-xl font-mono font-bold text-red-600">
                                ${Math.abs(myTransactions.filter(t => t.amount < 0).reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString()}
                            </p>
                        </div>
                        <div className={`p-4 rounded-2xl border ${!isDebt ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <p className="text-sm text-gray-500 mb-1 font-bold">{!isDebt ? t('agent.balance_credit') : t('agent.balance_debt')}</p>
                            <p className={`text-xl font-mono font-bold ${!isDebt ? 'text-green-700' : 'text-red-700'}`}>
                                ${Math.abs(currentBalance).toLocaleString()}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Transaction Table with Pagination & Search */}
            <Card className="p-0 overflow-hidden border border-gray-200 shadow-md">
                {/* Header with Search */}
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 text-[#0e3c63]">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{t('agent.financial_details')}</h3>
                            <p className="text-xs text-gray-500">{t('agent.financial_details_sub')}</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-64">
                        <input
                            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#0e3c63] outline-none transition-colors"
                            placeholder={t('agent.search_statement')}
                            value={financeSearch}
                            onChange={(e) => { setFinanceSearch(e.target.value); setFinancePage(0); }}
                        />
                        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                    </div>
                </div>

                {/* Table (Redesigned) */}
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white text-gray-500 font-bold border-b border-gray-100">
                            <tr>
                                <th className="p-4 w-40">{t('agent.date')}</th>
                                <th className="p-4 w-48">{t('agent.col_type')}</th>
                                <th className="p-4">{t('agent.col_details')}</th>
                                <th className="p-4 text-left w-40">{t('agent.col_amount')}</th>
                                <th className="p-4 w-20 text-center">{t('agent.col_preview')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                        <td className="p-4"><div className="h-6 bg-gray-200 rounded w-20"></div></td>
                                        <td className="p-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                                        <td className="p-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                                        <td className="p-4"><div className="h-8 bg-gray-200 rounded w-8 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : currentTransactions.map(txn => {
                                // Check for Order ID in description for "View Order" button
                                const match = txn.description.match(/#(\d+)/);
                                const relatedOrderId = match ? parseInt(match[1]) : null;
                                const canViewOrder = relatedOrderId && db.orders.some(o => o.id === relatedOrderId);

                                let label: string = txn.type;
                                let typeStyle = '';
                                let Icon = Wallet;

                                if (txn.amount >= 0) {
                                    label = t('agent.deposit_payment');
                                    typeStyle = 'bg-green-50 text-green-700 border border-green-100';
                                    Icon = TrendingUp;
                                } else {
                                    label = t('agent.purchase_payment');
                                    typeStyle = 'bg-red-50 text-red-700 border border-red-100';
                                    Icon = TrendingDown;
                                }

                                return (
                                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-mono text-gray-500 text-xs">
                                            <div className="font-bold text-gray-700 mb-0.5">{formatDate(txn.createdAt)}</div>
                                            {formatTime(txn.createdAt)}
                                        </td>
                                        <td className="p-4">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit whitespace-nowrap ${typeStyle}`}>
                                                <Icon size={16} />
                                                <span className="font-bold text-xs">{label}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-700 font-medium">
                                            {translateDesc(txn.description)}
                                        </td>
                                        <td className={`p-4 text-left font-mono font-bold text-base ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
                                            {txn.amount > 0 ? '+' : ''}{txn.amount.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            {canViewOrder && (
                                                <button
                                                    onClick={() => onViewOrder(db.orders.find(o => o.id === relatedOrderId) || null as any)}
                                                    className="text-[#0e3c63] hover:bg-blue-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center"
                                                    title={t('agent.view_order')}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {!isLoading && currentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-10 text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <DollarSign size={32} className="opacity-20" />
                                            <p>{t('agent.no_financial_records')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <PaginationControl
                    page={financePage}
                    rowsPerPage={financeRowsPerPage}
                    setPage={setFinancePage}
                    setRowsPerPage={setFinanceRowsPerPage}
                    totalItems={filteredTransactions.length}
                />
            </Card>
        </div>
    );
};