
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Filter, Plus, ArrowDown, ArrowUp, Layers, Package, Beaker, Zap, Search, Hexagon, DollarSign, Calculator, RotateCcw, XCircle, TrendingUp, Calendar, ChevronDown, Check, Clock, ShieldCheck, Tag, Info, ArrowUpRight, ArrowDownLeft, Lock, Edit3, Trash2, AlertOctagon } from 'lucide-react';
import { formatDate, formatTime } from '../../../lib/dateUtils';
import { Button, Badge, DateRangePicker, Card } from '../../../components/ui';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { db } from '../../../lib/db';
import { MaterialType, FactoryTransaction, UserRole } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

interface InventoryTabProps {
    refreshTrigger: number;
    onOpenModal: (category: any, metadata?: any) => void;
}

const materialLabels: Record<string, { ar: string, en: string, unit: string, icon: any, color: string, iconProps?: any }> = {
    'SILICON_HOT': { ar: 'سليكون حار', en: 'SILICON HOT', unit: 'طن', icon: Zap, color: 'text-orange-500 bg-orange-50 border-orange-100' },
    'SILICON_COLD': { ar: 'سليكون بارد', en: 'SILICON COLD', unit: 'طن', icon: Zap, color: 'text-blue-500 bg-blue-50 border-blue-100' },
    'SAND': { ar: 'رمل فلين', en: 'FOAM SAND', unit: 'طن', icon: Box, color: 'text-amber-500 bg-amber-50 border-amber-100' },
    'SAND_ADHESIVE': { ar: 'رمل لاصق', en: 'ADHESIVE SAND', unit: 'طن', icon: Box, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
    'CEMENT_BLACK': { ar: 'سمنت أسود', en: 'BLACK CEMENT', unit: 'طن', icon: Hexagon, color: 'text-gray-700 bg-gray-100 border-gray-200', iconProps: { fill: 'currentColor' } },
    'CEMENT_WHITE': { ar: 'سمنت أبيض', en: 'WHITE CEMENT', unit: 'طن', icon: Hexagon, color: 'text-gray-400 bg-gray-50 border-gray-100' },
    'EPS_RAW': { ar: 'حبيبات الفلين', en: 'EPS RAW', unit: 'طن', icon: Package, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
    'POLYMER_ADHESIVE': { ar: 'بوليمر', en: 'POLYMER', unit: 'طن', icon: Beaker, color: 'text-teal-600 bg-teal-50 border-teal-100' },
    'SILOSH_ADHESIVE': { ar: 'سليليوز', en: 'CELLULOSE', unit: 'طن', icon: Beaker, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    'SHASTA_ADHESIVE': { ar: 'نشاسته', en: 'STARCH', unit: 'طن', icon: Beaker, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    'CARTON_FOAM': { ar: 'كارتون فلين', en: 'FOAM CARTON', unit: 'كارتون', icon: Box, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    'CHEMICAL': { ar: 'أكياس لاصق', en: 'ADHESIVE BAGS', unit: 'كيس', icon: Box, color: 'text-slate-600 bg-slate-50 border-slate-100' }
};

const allMaterialsList: MaterialType[] = [
    'SAND_ADHESIVE', 'SAND', 'SILICON_COLD', 'SILICON_HOT',
    'CEMENT_BLACK', 'CEMENT_WHITE', 'EPS_RAW', 'POLYMER_ADHESIVE',
    'SILOSH_ADHESIVE', 'SHASTA_ADHESIVE', 'CARTON_FOAM', 'CHEMICAL'
];

const MaterialCard = ({ mat, stats, onClick, isActive, onAdd }: any) => {
    const info = materialLabels[mat];
    if (!info) return null;
    const Icon = info.icon;
    const unitPrice = stats.totalInQty > 0 ? (stats.totalInVal / stats.totalInQty) : 0;

    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-[2.5rem] border shadow-sm flex flex-col transition-all duration-300 group relative cursor-pointer overflow-hidden ${isActive ? 'ring-4 ring-blue-100 border-[#0e3c63] shadow-xl transform -translate-y-1' : 'border-gray-100 hover:shadow-2xl hover:border-blue-200'}`}
        >
            <div className="p-6 pb-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border shadow-sm transition-transform group-hover:rotate-12 shrink-0 ${info.color}`}>
                        {React.createElement(Icon, { size: 18, ...(info.iconProps || {}) })}
                    </div>
                    <div className="text-right min-w-0">
                        <h4 className="text-lg font-black text-gray-800 leading-tight truncate">{info.ar}</h4>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 font-sans truncate">{info.en}</p>
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onAdd(); }}
                    className="w-10 h-10 rounded-xl bg-[#0e3c63] text-white flex items-center justify-center shadow-lg hover:bg-[#1a4d7a] active:scale-95 transition-all transform hover:rotate-90 z-20 shrink-0 opacity-0 group-hover:opacity-100"
                    title="إضافة حركة جديدة"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-6">
                <div className="flex items-baseline justify-center gap-2 mb-4">
                    <span className="text-5xl font-black text-gray-800 font-mono tracking-tighter">{(stats.currentStock || 0).toLocaleString()}</span>
                    <span className="text-lg font-black text-gray-400">{info.unit}</span>
                </div>
                <div className="space-y-2 w-full px-8">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 flex justify-center items-center gap-2 text-gray-500">
                        <span className="text-xs font-black">القيمة الحالية:</span>
                        <span className="text-sm font-black font-mono">${(stats.currentStockValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl py-2 px-4 flex justify-center items-center gap-2 text-blue-700">
                        <Tag size={14} />
                        <span className="text-xs font-black">معدل الشراء:</span>
                        <span className="text-sm font-black font-mono">${(unitPrice || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 border-t border-dashed border-gray-100 divide-x divide-x-reverse divide-gray-50">
                {/* الصرف */}
                <div className="p-4 flex flex-col items-center justify-center hover:bg-orange-50/30 transition-colors group/sec">
                    <div className="flex items-center gap-1 text-orange-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-tighter">قيمة الصرف</span>
                        <ArrowUp size={12} />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-black text-gray-800 text-lg font-mono leading-none">{(stats.periodOutQty || 0).toLocaleString()}</span>
                        <span className="text-[10px] font-black text-orange-600 mt-1">${(stats.periodOutVal || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                </div>
                {/* الوارد */}
                <div className="p-4 flex flex-col items-center justify-center hover:bg-emerald-50/30 transition-colors">
                    <div className="flex items-center gap-1 text-emerald-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-tighter">قيمة الوارد</span>
                        <ArrowDown size={12} />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-black text-gray-800 text-lg font-mono leading-none">{(stats.periodInQty || 0).toLocaleString()}</span>
                        <span className="text-[10px] font-black text-emerald-600 mt-1">${(stats.periodInVal || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const InventoryTab = ({ refreshTrigger, onOpenModal }: InventoryTabProps) => {
    const { user } = useAuth();
    const toast = useToast();

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filterMat, setFilterMat] = useState<'ALL' | string>('ALL');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [confirmAction, setConfirmAction] = useState<{ type: 'DELETE' | 'LOCK', tx: FactoryTransaction | null }>({ type: 'DELETE', tx: null });

    // حساب معدلات الأسعار لجميع المواد لعرضها في الجدول
    const avgPricesMap = useMemo(() => {
        const map: Record<string, number> = {};
        const allTxs = db.getFactoryTransactions('INVENTORY');

        allMaterialsList.forEach(mat => {
            const inTxs = allTxs.filter(t => t.materialType === mat && t.transactionType === 'IN');
            const totalVal = inTxs.reduce((s, t) => s + (t.amount || 0), 0);
            const totalQty = inTxs.reduce((s, t) => s + (t.quantity || 0), 0);
            map[mat] = totalQty > 0 ? (totalVal / totalQty) : 0;
        });

        return map;
    }, [refreshTrigger]);

    const filteredTxs = useMemo(() => {
        return db.getFactoryTransactions('INVENTORY').filter(t => {
            const matchesMat = filterMat === 'ALL' || t.materialType === filterMat;
            const txDate = new Date(t.date).setHours(0, 0, 0, 0);
            const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
            const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            return matchesMat && txDate >= start && txDate <= end;
        });
    }, [refreshTrigger, filterMat, fromDate, toDate]);

    const currentTxs = useMemo(() => filteredTxs.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [filteredTxs, page, rowsPerPage]);

    const handleExecuteAction = () => {
        if (!confirmAction.tx || !user) return;
        try {
            if (confirmAction.type === 'DELETE') {
                db.deleteFactoryTransaction(user.id, confirmAction.tx.id);
                toast.success('تم حذف السجل بنجاح');
            } else if (confirmAction.type === 'LOCK') {
                db.lockFactoryTransaction(user.id, confirmAction.tx.id);
                toast.success('تم قفل السجل نهائياً');
            }
            setConfirmAction({ type: 'DELETE', tx: null });
        } catch (err: any) {
            toast.error('خطأ', err.message);
        }
    };

    const calculateMaterialFinancials = (mat: string) => {
        const allHistoryTxs = db.getFactoryTransactions('INVENTORY').filter(t => t.materialType === mat);
        const totalInValueAllTime = allHistoryTxs.filter(t => t.transactionType === 'IN').reduce((acc, t) => acc + (t.amount || 0), 0);
        const totalInQtyAllTime = allHistoryTxs.filter(t => t.transactionType === 'IN').reduce((acc, t) => acc + (t.quantity || 0), 0);

        const avgPurchasePrice = totalInQtyAllTime > 0 ? (totalInValueAllTime / totalInQtyAllTime) : 0;
        const currentStock = db.getMaterialStock(mat);
        const currentStockValue = currentStock * avgPurchasePrice;

        const periodTxs = allHistoryTxs.filter(t => {
            const txDate = new Date(t.date).setHours(0, 0, 0, 0);
            const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
            const end = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            return txDate >= start && txDate <= end;
        });

        const periodInQty = periodTxs.filter(t => t.transactionType === 'IN').reduce((acc, t) => acc + (t.quantity || 0), 0);
        const periodInVal = periodTxs.filter(t => t.transactionType === 'IN').reduce((acc, t) => acc + (t.amount || 0), 0);
        const periodOutQty = periodTxs.filter(t => t.transactionType === 'OUT').reduce((acc, t) => acc + (t.quantity || 0), 0);

        const periodOutVal = periodOutQty * avgPurchasePrice;

        return {
            currentStock,
            currentStockValue,
            totalInQty: totalInQtyAllTime,
            totalInVal: totalInValueAllTime,
            periodInQty,
            periodInVal,
            periodOutQty,
            periodOutVal
        };
    };

    const globalStats = useMemo(() => {
        let totalStockValue = 0, totalInValue = 0, totalOutValue = 0;
        allMaterialsList.forEach(mat => {
            const stats = calculateMaterialFinancials(mat);
            totalStockValue += stats.currentStockValue;
            totalInValue += stats.periodInVal;
            totalOutValue += stats.periodOutVal;
        });
        return { totalStockValue, totalInValue, totalOutValue };
    }, [refreshTrigger, fromDate, toDate]);

    const hasPerm = (p: string) => user?.permissions?.includes(p as any);
    const isAdmin = user?.role === UserRole.ADMIN;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-xl px-2"><Box size={24} className="text-[#0e3c63]" /> المواد والمخزون</h3>
                    <DateRangePicker from={fromDate} to={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800 p-6 rounded-[1.5rem] text-white text-center">
                    <div className="md:border-l border-white/10"><p className="text-[10px] opacity-60 font-bold mb-1 uppercase tracking-widest">قيمة المشتريات (الفترة)</p><p className="text-2xl font-black font-mono text-green-400">${globalStats.totalInValue.toLocaleString()}</p></div>
                    <div className="md:border-l border-white/10"><p className="text-[10px] opacity-60 font-bold mb-1 uppercase tracking-widest">قيمة الاستهلاك (الفترة)</p><p className="text-2xl font-black font-mono text-amber-400">${Math.round(globalStats.totalOutValue).toLocaleString()}</p></div>
                    <div><p className="text-[10px] opacity-60 font-bold mb-1 uppercase tracking-widest">القيمة المخزنية الحالية</p><p className="text-2xl font-black font-mono text-blue-300">${Math.round(globalStats.totalStockValue).toLocaleString()}</p></div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h4 className="font-black text-gray-400 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2"><Hexagon size={14} className="text-[#0e3c63]" /> المواد الأولية ومواد التغليف</h4>
                    <div className="h-px flex-1 bg-gray-100 mx-4"></div>
                    {hasPerm('ADD_FACTORY_INV') && (
                        <Button onClick={() => onOpenModal('INVENTORY')} className="h-10 px-4 rounded-xl text-[10px] font-black"><Plus size={14} /> حركة مخزن جديدة</Button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {allMaterialsList.map(mat => (
                        <MaterialCard key={mat} mat={mat} stats={calculateMaterialFinancials(mat)} onClick={() => { setFilterMat(filterMat === mat ? 'ALL' : mat); setPage(0); }} onAdd={() => onOpenModal('INVENTORY', { material: mat })} isActive={filterMat === mat} />
                    ))}
                </div>
            </div>

            <Card className="p-0 overflow-hidden border border-gray-100 shadow-xl rounded-[2.5rem]">
                <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center px-10">
                    <h4 className="font-black text-gray-700 flex items-center gap-2"><Search size={18} className="text-gray-400" />سجل حركات المخزن</h4>
                    <div className="flex items-center gap-3">
                        {filterMat !== 'ALL' && <button onClick={() => { setFilterMat('ALL'); setPage(0); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-black transition-all border border-red-100 shadow-sm"><XCircle size={14} /> إلغاء التحديد ({materialLabels[filterMat]?.ar || filterMat})</button>}
                        <Badge color="gray" className="font-black">{filteredTxs.length} سجل</Badge>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="p-5 pr-10">التاريخ</th>
                                <th className="p-5">المادة</th>
                                <th className="p-5 text-center">النوع</th>
                                <th className="p-5">الكمية</th>
                                <th className="p-5">البيان / المصدر</th>
                                <th className="p-5 text-left">القيمة المالية ($)</th>
                                <th className="p-5 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredTxs.length === 0 ? <tr><td colSpan={7} className="p-20 text-center text-gray-400 font-bold italic">لا توجد بيانات للفترة المحددة</td></tr> : currentTxs.map(t => {
                                const isLocked = t.isLocked;
                                const isOut = t.transactionType === 'OUT';
                                const canEditTx = hasPerm('EDIT_FACTORY_INV') && (!isLocked || isAdmin);
                                const canDeleteTx = hasPerm('DELETE_FACTORY_INV') && (!isLocked || isAdmin);
                                const canLockTx = hasPerm('LOCK_FACTORY_INV') && !isLocked;

                                // حساب القيمة التقديرية للصرف في السجل
                                const estimatedValue = isOut ? ((t.quantity || 0) * (avgPricesMap[t.materialType!] || 0)) : t.amount;

                                return (
                                    <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-5 pr-10">
                                            <div className="flex items-center gap-5">
                                                <div className="flex flex-col font-mono"><span className="font-black text-gray-800 text-sm">{formatDate(t.date)}</span><span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock size={12} /> {formatTime(t.date)}</span></div>
                                            </div>
                                        </td>
                                        <td className="p-5 font-black text-[#0e3c63]">
                                            <div className="flex items-center gap-2">
                                                {materialLabels[t.materialType!]?.ar || t.materialType}
                                                {isLocked && <span title="مغلق نهائياً"><Lock size={12} className="text-amber-500" /></span>}
                                            </div>
                                        </td>
                                        <td className="p-5 text-center"><Badge color={t.transactionType === 'IN' ? 'green' : 'orange'} className="font-black">{t.transactionType === 'IN' ? 'وارد' : 'صرف'}</Badge></td>
                                        <td className="p-5 font-black text-gray-800 font-mono text-lg">{(t.quantity || 0).toLocaleString()} <span className="text-[10px] text-gray-400 font-sans">{materialLabels[t.materialType!] ? materialLabels[t.materialType!].unit : ''}</span></td>
                                        <td className="p-5 text-gray-500 font-bold text-xs truncate max-w-[200px]">{t.source || t.notes || '-'}</td>
                                        <td className="p-5 text-left font-mono font-black text-lg">
                                            <span className={isOut ? 'text-orange-600' : 'text-emerald-600'}>
                                                ${(estimatedValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {canEditTx && (
                                                    <button onClick={() => onOpenModal('INVENTORY', { tx: t })} className="p-2.5 bg-white text-blue-600 border border-gray-200 rounded-xl hover:bg-blue-50 shadow-sm" title="تعديل"><Edit3 size={18} /></button>
                                                )}
                                                {canLockTx && (
                                                    <button onClick={() => setConfirmAction({ type: 'LOCK', tx: t })} className="p-2.5 bg-white text-amber-600 border border-gray-200 rounded-xl hover:bg-amber-600 hover:text-white shadow-sm" title="قفل نهائي"><Lock size={18} /></button>
                                                )}
                                                {canDeleteTx && (
                                                    <button onClick={() => setConfirmAction({ type: 'DELETE', tx: t })} className="p-2.5 bg-white text-red-500 border border-gray-200 rounded-xl hover:bg-red-500 hover:text-white shadow-sm" title="حذف"><Trash2 size={18} /></button>
                                                )}
                                                {isLocked && !isAdmin && (
                                                    <div className="p-2.5 bg-gray-50 text-gray-300 border border-gray-100 rounded-xl" title="الحركة مقفلة من الإدارة"><Lock size={18} /></div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <PaginationControl page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={filteredTxs.length} />
            </Card>

            {/* نافذة تأكيد الإجراء */}
            {confirmAction.tx && (
                <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                        <div className={`p-10 text-white text-center relative overflow-hidden bg-gradient-to-br ${confirmAction.type === 'LOCK' ? 'from-amber-500 to-orange-700' : 'from-red-600 to-red-800'}`}>
                            <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                    {confirmAction.type === 'LOCK' ? <Lock size={42} className="text-white animate-pulse" /> : <AlertOctagon size={42} className="text-white" />}
                                </div>
                                <h3 className="text-2xl font-black mb-2">{confirmAction.type === 'LOCK' ? 'تأكيد قفل السجل' : 'تأكيد حذف السجل'}</h3>
                                <p className="text-white/80 text-sm font-bold opacity-80">
                                    {confirmAction.type === 'LOCK' ? 'بعد القفل، سيتم تثبيت أرصدة المادة نهائياً لهذه الحركة.' : 'سيتم إزالة السجل وتعديل رصيد المخزن تلقائياً.'}
                                </p>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4 text-right">
                                <p className="font-black text-gray-800 text-lg">
                                    {materialLabels[confirmAction.tx.materialType!]?.ar}: {(confirmAction.tx.quantity || 0)} {materialLabels[confirmAction.tx.materialType!]?.unit}
                                </p>
                                <p className="text-xs text-gray-500 font-bold">{formatDate(confirmAction.tx.date)}</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button onClick={handleExecuteAction} className={`w-full h-16 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all ${confirmAction.type === 'LOCK' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {confirmAction.type === 'LOCK' ? <Lock size={24} /> : <Trash2 size={24} />}
                                    {confirmAction.type === 'LOCK' ? 'نعم، اقفل الحركة' : 'نعم، احذف الحركة'}
                                </Button>
                                <button onClick={() => setConfirmAction({ type: 'DELETE', tx: null })} className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
