import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import { useTranslation } from 'react-i18next';
import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, FileText, Search, DollarSign, Eye } from 'lucide-react';
import { Card } from '../../../components/ui';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { WalletTransaction, Order } from '../../../types';
import { db } from '../../../lib/db';
import { summarizeAgentLedger, statementWithBalances, getMovementOrderIds } from '../../../lib/agentMovements';
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
        return statementWithBalances(myTransactions, currentBalance).filter(t =>
            String(t.description || '').toLowerCase().includes(financeSearch.toLowerCase()) ||
            String(t.amount).includes(financeSearch) || String(t.id).includes(financeSearch.replace(/^#/, ''))
        );
    }, [myTransactions, financeSearch, currentBalance]);

    
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

    const summary = summarizeAgentLedger(myTransactions, currentBalance);

    const currentTransactions = useMemo(() => {
        return filteredTransactions.slice(financePage * financeRowsPerPage, (financePage + 1) * financeRowsPerPage);
    }, [filteredTransactions, financePage, financeRowsPerPage]);

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">

            {/* 1. Summary Cards */}
            <div className="bg-white rounded-2xl lg:rounded-3xl p-3 lg:p-8 border border-gray-100 shadow-sm lg:shadow-lg lg:mb-6">
                <div className="hidden lg:flex items-center gap-4 mb-6">
                    <div className="bg-[#0e3c63] text-white p-4 rounded-full">
                        <Wallet size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{t('agent.account_statement')}</h2>
                        <p className="text-gray-500">{t('agent.account_statement_sub')}</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-6 animate-pulse">
                        <div className="h-24 bg-gray-200 rounded-2xl"></div>
                        <div className="h-24 bg-gray-200 rounded-2xl"></div>
                        <div className="hidden lg:block h-24 bg-gray-200 rounded-2xl"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-6">
                        <div className="bg-gray-50 p-3 lg:p-4 rounded-xl lg:rounded-2xl border border-gray-100">
                            <p className="text-xs lg:text-sm text-gray-600 lg:text-gray-500 mb-1 font-bold">{t('agent.total_payments')}</p>
                            <p className="break-words text-base lg:text-xl font-mono font-bold text-green-700 lg:text-green-600">
                                ${summary.paid.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-3 lg:p-4 rounded-xl lg:rounded-2xl border border-gray-100">
                            <p className="text-xs lg:text-sm text-gray-600 lg:text-gray-500 mb-1 font-bold">{t('agent.total_debts')}</p>
                            <p className="break-words text-base lg:text-xl font-mono font-bold text-red-700 lg:text-red-600">
                                ${summary.debt.toLocaleString()}
                            </p>
                        </div>
                        <div className={`hidden lg:block p-4 rounded-2xl border ${!isDebt ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <p className="text-sm text-gray-500 mb-1 font-bold">{!isDebt ? t('agent.balance_credit') : t('agent.balance_debt')}</p>
                            <p className={`text-xl font-mono font-bold ${!isDebt ? 'text-green-700' : 'text-red-700'}`}>
                                ${Math.abs(currentBalance).toLocaleString()}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Transaction Table with Pagination & Search */}
            <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm lg:shadow-md">
                {/* Header with Search */}
                <div className="p-3 lg:p-5 border-b border-gray-100 lg:bg-gray-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4">
                    <div className="flex items-center gap-3">
                        <div className="hidden lg:block bg-white p-2 rounded-lg border border-gray-200 text-[#0e3c63]">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800"><span className="lg:hidden">{t('agent.account_statement')}</span><span className="hidden lg:inline">{t('agent.financial_details')}</span></h3>
                            <p className="hidden lg:block text-xs text-gray-500">{t('agent.financial_details_sub')}</p>
                        </div>
                    </div>

                    <div className="relative w-full lg:w-64">
                        <input
                            className="w-full min-h-11 lg:min-h-0 pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#0e3c63] outline-none transition-colors"
                            aria-label={t('agent.search_statement')}
                            placeholder={t('agent.search_statement')}
                            value={financeSearch}
                            onChange={(e) => { setFinanceSearch(e.target.value); setFinancePage(0); }}
                        />
                        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                    </div>
                </div>

                {/* Table (Redesigned) */}
                <div className="overflow-x-auto">
                    <table aria-label={t('agent.account_statement')} className="w-full table-fixed lg:table-auto text-right text-sm">
                        <thead className="bg-slate-50 lg:bg-white text-gray-600 lg:text-gray-500 font-bold text-xs lg:text-sm border-b border-gray-100">
                            <tr>
                                <th scope="col" className="w-[61%] lg:w-auto px-3 py-2.5 lg:p-4">{t('agent_dashboard.mobile_transaction')}</th>
                                <th scope="col" className="hidden lg:table-cell p-4 w-40">{t('agent.date')}</th>
                                <th scope="col" className="hidden lg:table-cell p-4 w-48">{t('agent.col_type')}</th>
                                <th scope="col" className="hidden lg:table-cell p-4">{t('agent.col_details')}</th>
                                <th scope="col" className="px-3 py-2.5 lg:p-4 text-left lg:w-40">{t('agent.col_amount')}</th>
                                <th scope="col" className="hidden lg:table-cell p-4 text-left">{t('agent_dashboard.mobile_running_balance')}</th>
                                <th scope="col" className="hidden lg:table-cell p-4 w-20 text-center">{t('agent.col_preview')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {isLoading ? (
                                <>
                                    <tr className="lg:hidden animate-pulse"><td colSpan={2} className="px-3 py-8 text-center text-slate-500">{t('common.loading')}</td></tr>
                                    {Array.from({ length: 5 }, (_, index) => (
                                        <tr key={index} className="hidden lg:table-row animate-pulse">
                                            {['w-24', 'w-20', 'w-48', 'w-16', 'w-8', 'w-16', 'w-8'].map((width, column) => <td key={column} className="p-4"><div className={`${width} h-4 bg-gray-200 rounded`} /></td>)}
                                        </tr>
                                    ))}
                                </>
                            ) : currentTransactions.map(txn => {
                                const ids = getMovementOrderIds(txn);
                                const relatedOrders = db.orders.filter(o => String(o.agentId) === String(txn.agentId) && ids.includes(String(o.id)));
                                const canViewOrder = relatedOrders.length === 1;

                                let label: string = txn.type;
                                let typeStyle = '';
                                let Icon = Wallet;

                                if (txn.amount >= 0) {
                                    label = txn.paymentDetails?.reversal ? 'عكس احتساب طلب ملغي' : txn.type === 'ADJUSTMENT' ? 'تسوية رصيد غير نقدية' : t('agent.deposit_payment');
                                    typeStyle = 'bg-green-50 text-green-700 border border-green-100';
                                    Icon = TrendingUp;
                                } else {
                                    label = t('agent.purchase_payment');
                                    typeStyle = 'bg-red-50 text-red-700 border border-red-100';
                                    Icon = TrendingDown;
                                }

                                return (
                                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-3 lg:p-4 font-bold align-top lg:align-middle">
                                            <bdi dir="ltr" className="font-mono text-[#0e3c63] lg:text-inherit">#{txn.id}</bdi>
                                            <div className="mt-1 space-y-1 lg:hidden">
                                                <p className="text-xs font-medium text-slate-600"><bdi>{formatDate(txn.createdAt)} · {formatTime(txn.createdAt)}</bdi></p>
                                                <p className="text-xs font-bold leading-snug text-slate-800">{label}</p>
                                                {txn.description && <p className="break-words text-xs font-medium leading-snug text-slate-600">{translateDesc(txn.description)}</p>}
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell p-4 font-mono text-gray-500 text-xs">
                                            <div className="font-bold text-gray-700 mb-0.5">{formatDate(txn.createdAt)}</div>
                                            {formatTime(txn.createdAt)}
                                        </td>
                                        <td className="hidden lg:table-cell p-4">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit whitespace-nowrap ${typeStyle}`}>
                                                <Icon size={16} />
                                                <span className="font-bold text-xs">{label}</span>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell p-4 text-gray-700 font-medium">
                                            {translateDesc(txn.description)}
                                        </td>
                                        <td className="px-3 py-3 lg:p-4 text-left align-top lg:align-middle">
                                            <bdi dir="ltr" className={`block break-words font-mono font-bold text-sm lg:text-base ${txn.amount >= 0 ? 'text-green-700 lg:text-green-600' : 'text-red-700 lg:text-red-600'}`}>{txn.amount > 0 ? '+' : ''}{txn.amount.toLocaleString()}</bdi>
                                            <div className="mt-1 text-xs font-medium text-slate-600 lg:hidden">
                                                <p>{t('agent_dashboard.mobile_running_balance')}</p>
                                                <bdi dir="ltr" className="mt-0.5 block break-words font-bold text-slate-800">{txn.balanceAfter.toLocaleString('en-US')}</bdi>
                                                {canViewOrder && <button type="button" onClick={() => onViewOrder(relatedOrders[0])} aria-label={t('agent.view_order')} className="mt-1 inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0e3c63]"><Eye size={16} aria-hidden="true" /></button>}
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell p-4 text-left font-mono font-bold" dir="ltr">{txn.balanceAfter.toLocaleString('en-US')}</td>
                                        <td className="hidden lg:table-cell p-4 text-center">
                                            {canViewOrder && (
                                                <button
                                                    onClick={() => onViewOrder(relatedOrders[0])}
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
                                    <td colSpan={7} className="text-center p-10 text-gray-400">
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
