import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Box, Edit3, History, Lock, Plus, RotateCcw, Search, Trash2, TrendingUp, X } from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { TIMEZONE, formatDate, formatTime } from '../../../lib/dateUtils';
import { db } from '../../../lib/db';
import { materialName, materialUnit } from '../../../lib/factoryMaterials';
import { UserRole, type FactoryTransaction } from '../../../types';
import { InventoryDialog } from '../components/InventoryDialog';
import { MaterialCatalogDialog, type CatalogAction } from '../components/MaterialCatalogDialog';
import { ModernSingleDatePicker, ModalModernSelect } from '../components/SharedFactoryComponents';
import { factoryFieldInput } from '../components/FactoryFieldPopover';

interface InventoryTabProps {
    refreshTrigger: number;
    onOpenModal: (category: 'INVENTORY', metadata?: { material?: string; tx?: FactoryTransaction }) => void;
}

const dateKey = new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE, dateStyle: 'short' });
const dateDigits: Intl.DateTimeFormatOptions = { numberingSystem: 'latn' };
const quantity = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 });
const usd = (value: number) => '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const iconButtonClass = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e3c63]';
const actionClass = iconButtonClass + ' text-slate-600 hover:bg-slate-100 hover:text-[#0e3c63]';
const selectedClass = 'bg-[#eaf2f8] text-[#0e3c63]';
const toggleClass = 'min-h-11 rounded-lg px-3 text-sm font-semibold hover:bg-slate-100';
const materialGrid = 'grid grid-cols-2 items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1.55fr)_repeat(3,minmax(0,1fr))_auto]';
const emptyStats = { stock: 0, purchased: 0, cost: 0, inQty: 0, inValue: 0, outQty: 0, avg: 0 };
const unitPrice = (tx: FactoryTransaction) => tx.quantity ? (tx.amount || 0) / tx.quantity : 0;

export function InventoryTab({ refreshTrigger, onOpenModal }: InventoryTabProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();
    const [view, setView] = useState<'materials' | 'movements' | 'prices'>('materials');
    const [showArchived, setShowArchived] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [catalogAction, setCatalogAction] = useState<CatalogAction | null>(null);
    const [movementAction, setMovementAction] = useState<{ type: 'delete' | 'lock'; tx: FactoryTransaction } | null>(null);
    const [busy, setBusy] = useState(false);
    const [movementError, setMovementError] = useState('');

    const materials = db.getFactoryMaterials();
    const catalogReady = db.factoryMaterialsStatus === 'ready';
    const editor = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUPERVISOR;
    const canAdd = editor && user?.permissions?.includes('ADD_FACTORY_INV');
    const canEdit = editor && user?.permissions?.includes('EDIT_FACTORY_INV');
    const canDelete = editor && user?.permissions?.includes('DELETE_FACTORY_INV');
    const canLock = editor && user?.permissions?.includes('LOCK_FACTORY_INV');
    const byId = useMemo(() => new Map(materials.map(material => [material.id, material])), [materials]);
    const label = (id?: string) => materialName(t, id, id ? byId.get(id) : undefined);
    const unit = (id?: string) => id ? materialUnit(t, byId.get(id)) : '';
    const activeCount = materials.filter(material => !material.archived_at).length;
    const visibleMaterials = materials.filter(material =>
        Boolean(material.archived_at) === showArchived && label(material.id).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    );

    const { allTxs, periodTxs, statsById, summary } = useMemo(() => {
        const allTxs = db.getFactoryTransactions('INVENTORY');
        const periodTxs: FactoryTransaction[] = [];
        const statsById = new Map<string | undefined, typeof emptyStats>();

        for (const tx of allTxs) {
            const time = Date.parse(tx.date);
            const day = Number.isFinite(time) ? dateKey.format(time) : '';
            const inPeriod = (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
            if (inPeriod) periodTxs.push(tx);
            const stats = statsById.get(tx.materialType) ?? { ...emptyStats };
            const qty = tx.quantity || 0;
            if (tx.transactionType === 'IN') {
                stats.stock += qty;
                stats.purchased += qty;
                stats.cost += tx.amount || 0;
                if (inPeriod) {
                    stats.inQty += qty;
                    stats.inValue += tx.amount || 0;
                }
            } else if (tx.transactionType === 'OUT') {
                stats.stock -= qty;
                if (inPeriod) stats.outQty += qty;
            }
            statsById.set(tx.materialType, stats);
        }

        const summary = { stockValue: 0, inValue: 0, outValue: 0 };
        for (const stats of statsById.values()) {
            stats.avg = stats.purchased > 0 ? stats.cost / stats.purchased : 0;
            summary.stockValue += stats.stock * stats.avg;
            summary.inValue += stats.inValue;
            summary.outValue += stats.outQty * stats.avg;
        }
        return { allTxs, periodTxs, statsById, summary };
    }, [refreshTrigger, fromDate, toDate]);

    const filteredTxs = filter ? periodTxs.filter(tx => tx.materialType === filter) : periodTxs;
    const currentPage = Math.min(page, Math.max(0, Math.ceil(filteredTxs.length / rowsPerPage) - 1));
    const historyMaterialIds = Array.from(new Set([
        ...materials.map(material => material.id),
        ...allTxs.flatMap(tx => tx.materialType ? [tx.materialType] : []),
    ]));
    const priceHistory = useMemo(() => {
        if (!filter || view !== 'prices') return [];
        const inPeriod = new Set(periodTxs);
        return allTxs.filter(tx => tx.materialType === filter && tx.transactionType === 'IN')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((tx, index, purchases) => {
                const previous = purchases[index + 1];
                const price = unitPrice(tx);
                const priorPrice = previous ? unitPrice(previous) : 0;
                const change = priorPrice > 0 ? (price - priorPrice) / priorPrice * 100 : 0;
                return { tx, price, change };
            })
            .filter(({ tx }) => inPeriod.has(tx));
    }, [allTxs, periodTxs, filter, view]);

    const openHistory = (material: string) => {
        setView('movements');
        setFilter(material);
        setPage(0);
    };

    const executeMovementAction = async () => {
        if (!movementAction || !user || busy) return;
        if (movementAction.type === 'lock' ? !canLock : !canDelete) return;
        setBusy(true);
        setMovementError('');
        try {
            if (movementAction.type === 'delete') {
                await db.deleteFactoryTransaction(user.id, movementAction.tx.id, true);
            } else {
                await db.setInventoryMovementLock(user.id, movementAction.tx.id, true);
            }
            toast.success(t(movementAction.type === 'delete' ? 'batch4.k683' : 'batch4.k684'));
            setMovementAction(null);
        } catch {
            setMovementError(t('factory_materials.save_failed'));
        } finally {
            setBusy(false);
        }
    };

    const unlockMovement = async (tx: FactoryTransaction) => {
        if (!user || !canLock || !tx.isLocked) return;
        try {
            await db.setInventoryMovementLock(user.id, tx.id, false);
            toast.success(t('factory_materials.movement_unlocked'));
        } catch {
            toast.error(t('factory_materials.unlock_failed'));
        }
    };

    const movementButton = canAdd && activeCount > 0 && (
        <Button variant="secondary" className="text-sm" onClick={() => onOpenModal('INVENTORY', {
            material: view !== 'materials' && byId.has(filter) && !byId.get(filter)?.archived_at ? filter : undefined,
        })}><Plus size={17} aria-hidden />{t('batch4.k693')}</Button>
    );

    return (
        <div className="min-w-0 space-y-5">
            <section className="space-y-4 rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Box size={22} className="text-[#0e3c63]" aria-hidden />{t('batch4.k698')}</h3>
                    <div className="flex w-full items-end gap-2 sm:w-auto">
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:min-w-96">
                            <ModernSingleDatePicker label={t('batch4.k133')} value={fromDate} max={toDate || undefined}
                                onChange={value => { setFromDate(value); setPage(0); }} />
                            <ModernSingleDatePicker label={t('batch4.k134')} value={toDate} min={fromDate || undefined}
                                onChange={value => { setToDate(value); setPage(0); }} />
                        </div>
                        {(fromDate || toDate) && <button type="button" className={actionClass + ' min-h-12 border-2 border-gray-100 bg-white'} title={t('common.reset_date')} aria-label={t('common.reset_date')}
                            onClick={() => { setFromDate(''); setToDate(''); setPage(0); }}><RotateCcw size={16} aria-hidden /></button>}
                    </div>
                </div>
                <dl className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
                    {[
                        { label: t('batch4.k701'), value: summary.stockValue, color: 'text-[#0e3c63]' },
                        { label: t('batch4.k699'), value: summary.inValue, color: 'text-emerald-700' },
                        { label: t('batch4.k700'), value: summary.outValue, color: 'text-amber-800' },
                    ].map(stat => (
                        <div key={stat.label} className="flex flex-wrap items-baseline justify-between gap-2 bg-slate-50 px-4 py-3 sm:block">
                            <dt className="text-sm text-slate-600">{stat.label}</dt>
                            <dd className={'text-lg font-bold tabular-nums sm:mt-1 sm:text-xl ' + stat.color}><bdi>{usd(stat.value)}</bdi></dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="min-w-0 rounded-[1.5rem] border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap gap-1">
                        <button type="button" aria-pressed={view === 'materials'} className={toggleClass + (view === 'materials' ? ' ' + selectedClass : ' text-slate-600')} onClick={() => setView('materials')}>
                            {t('factory_materials.title')}
                        </button>
                        <button type="button" aria-pressed={view !== 'materials'} className={toggleClass + (view !== 'materials' ? ' ' + selectedClass : ' text-slate-600')} onClick={() => setView('movements')}>
                            {t('batch4.k704')}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {movementButton}
                        {canAdd && catalogReady && view === 'materials' && <Button className="text-sm"
                            onClick={() => setCatalogAction({ type: 'add' })}><Plus size={17} aria-hidden />{t('factory_materials.add')}</Button>}
                    </div>
                </div>

                {view === 'materials' ? (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                            <div className="relative w-full sm:w-64">
                                <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#0e3c63]" aria-hidden />
                                <input type="search" aria-label={t('factory_materials.search')} placeholder={t('factory_materials.search')} value={search}
                                    onChange={event => setSearch(event.target.value)} className={factoryFieldInput + ' appearance-none pe-12 ps-9 [&::-webkit-search-cancel-button]:appearance-none'} />
                                {search && <button type="button" aria-label={t('common.reset_filters')} onClick={() => setSearch('')}
                                    className={actionClass + ' absolute end-0.5 top-1/2 -translate-y-1/2'}><X size={17} aria-hidden /></button>}
                            </div>
                            <div className="flex gap-1 rounded-xl bg-slate-50 p-1">
                                <button type="button" aria-pressed={!showArchived} onClick={() => setShowArchived(false)}
                                    className={toggleClass + (!showArchived ? ' ' + selectedClass : '')}>{t('common.active')} · {activeCount}</button>
                                <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived(true)}
                                    className={toggleClass + (showArchived ? ' ' + selectedClass : '')}>{t('factory_materials.archived')} · {materials.length - activeCount}</button>
                            </div>
                        </div>

                        {db.factoryMaterialsStatus === 'error' && (
                            <div role="alert" className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 text-sm text-amber-950 sm:mx-5">
                                {t('factory_materials.load_failed')}
                                <button type="button" onClick={() => void db.fetchFactoryMaterials()} className="min-h-11 font-bold underline">{t('common.refresh')}</button>
                            </div>
                        )}

                        {visibleMaterials.length === 0 ? (
                            <p className="border-t border-slate-100 px-5 py-10 text-center text-sm text-slate-600">
                                {t(search.trim() ? 'factory_materials.no_results' : showArchived ? 'factory_materials.no_archived' : 'factory_materials.empty')}
                            </p>
                        ) : (
                            <>
                                <div aria-hidden="true" className={'hidden border-y border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-600 sm:grid ' + materialGrid}>
                                    <span>{t('batch4.k705')}</span><span>{t('factory_materials.balance')}</span><span>{t('factory_tabs.inv_incoming')}</span><span>{t('factory_tabs.inv_dispatch')}</span>
                                    <span className="min-w-36 text-center">{t('common.actions')}</span>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {visibleMaterials.map(material => {
                                        const name = label(material.id);
                                        const stats = statsById.get(material.id) ?? emptyStats;
                                        const measure = unit(material.id);
                                        return (
                                            <li key={material.id} className={materialGrid + ' px-4 py-3 sm:px-5'}>
                                                <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-1">
                                                    <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0e3c63] lg:flex"><Box size={17} aria-hidden /></span>
                                                    <div className="min-w-0">
                                                        <button type="button" onClick={() => openHistory(material.id)} dir="auto"
                                                            className="min-h-8 text-start text-sm font-bold text-[#0e3c63] hover:underline focus-visible:outline-2 [overflow-wrap:anywhere]">{name}</button>
                                                        {stats.purchased > 0 && <p className="text-xs text-slate-600">{t('factory_materials.avg_price', { value: usd(stats.avg) })}</p>}
                                                    </div>
                                                </div>
                                                <MaterialFigure label={t('factory_materials.balance')} value={quantity(stats.stock) + ' ' + measure} detail={usd(stats.stock * stats.avg)} />
                                                <MaterialFigure label={t('factory_tabs.inv_incoming')} value={quantity(stats.inQty) + ' ' + measure} detail={usd(stats.inValue)} />
                                                <MaterialFigure label={t('factory_tabs.inv_dispatch')} value={quantity(stats.outQty) + ' ' + measure} detail={usd(stats.outQty * stats.avg)} />
                                                <div className="flex min-w-0 flex-wrap justify-end gap-1 sm:min-w-36 sm:justify-center">
                                                    {!material.archived_at && canAdd && (
                                                        <button type="button" className={actionClass + ' bg-blue-50 text-[#0e3c63]'} title={t('batch4.k693')} aria-label={t('factory_materials.movement_for', { name })}
                                                            onClick={() => onOpenModal('INVENTORY', { material: material.id })}><Plus size={18} aria-hidden /></button>
                                                    )}
                                                    {catalogReady && canEdit && !material.archived_at && (
                                                        <button type="button" className={actionClass} title={t('common.edit')} aria-label={t('factory_materials.edit_named', { name })}
                                                            onClick={() => setCatalogAction({ type: 'edit', material })}><Edit3 size={17} aria-hidden /></button>
                                                    )}
                                                    {catalogReady && canDelete && (
                                                        <button type="button" className={actionClass + (material.archived_at ? '' : ' hover:bg-red-50 hover:text-red-700')}
                                                            title={t(material.archived_at ? 'factory_materials.restore' : 'common.delete')}
                                                            aria-label={t(material.archived_at ? 'factory_materials.restore_named' : 'factory_materials.archive_named', { name })}
                                                            onClick={() => setCatalogAction({ type: material.archived_at ? 'restore' : 'archive', material })}>
                                                            {material.archived_at ? <RotateCcw size={17} aria-hidden /> : <Trash2 size={17} aria-hidden />}
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                            <div className="w-full sm:w-64">
                                <ModalModernSelect label={t('batch4.k705')} value={filter} icon={Box} onChange={value => {
                                    setFilter(value);
                                    setPage(0);
                                    if (!value) setView('movements');
                                }} options={[
                                    { value: '', label: t('factory_materials.all') },
                                    ...historyMaterialIds.map(id => ({
                                        value: id,
                                        label: label(id) + (byId.get(id)?.archived_at ? ' · ' + t('factory_materials.archived') : ''),
                                    })),
                                ]} />
                            </div>
                            {filter && (
                                <div className="flex flex-wrap items-center gap-1">
                                    <button type="button" aria-pressed={view === 'movements'} onClick={() => setView('movements')}
                                        className={toggleClass + (view === 'movements' ? ' ' + selectedClass : '')}><History size={15} className="me-1 inline" aria-hidden />{t('factory_materials.movements')}</button>
                                    <button type="button" aria-pressed={view === 'prices'} onClick={() => setView('prices')}
                                        className={toggleClass + (view === 'prices' ? ' ' + selectedClass : '')}><TrendingUp size={15} className="me-1 inline" aria-hidden />{t('factory_materials.prices')}</button>
                                </div>
                            )}
                        </div>

                        {view === 'prices' ? (
                            <ul className="divide-y divide-slate-100">
                                {priceHistory.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-600">{t('batch4.k709')}</li>}
                                {priceHistory.map(({ tx, price, change }) => (
                                    <li key={tx.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                                        <div>
                                            <p className="font-bold text-slate-900"><bdi>{usd(price)}</bdi> / {unit(tx.materialType)}</p>
                                            <p className="text-slate-600"><bdi className="tabular-nums">{formatDate(tx.date, dateDigits)}</bdi> · {quantity(tx.quantity || 0)} {unit(tx.materialType)}{tx.source ? ' · ' + tx.source : ''}</p>
                                        </div>
                                        {change !== 0 && <span className={'inline-flex items-center gap-1 font-semibold ' + (change > 0 ? 'text-red-700' : 'text-emerald-700')}>
                                            {change > 0 ? <ArrowUp size={15} /> : <ArrowDown size={15} />} <bdi>{change > 0 ? '+' : ''}{change.toFixed(1)}%</bdi>
                                        </span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-start text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                            <tr>{['k202', 'k705', 'k706', 'k389', 'k707', 'k708', 'k207'].map(key => <th key={key} scope="col" className="whitespace-nowrap px-4 py-3 text-start font-semibold">{t('batch4.' + key)}</th>)}</tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredTxs.length === 0 && <tr><td className="px-4 py-10 text-center text-slate-600" colSpan={7}>{t('batch4.k709')}</td></tr>}
                                            {filteredTxs.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage).map(tx => {
                                                const isOut = tx.transactionType === 'OUT';
                                                const materialLabel = label(tx.materialType);
                                                const value = isOut ? (tx.quantity || 0) * (statsById.get(tx.materialType)?.avg || 0) : tx.amount || 0;
                                                return (
                                                    <tr key={tx.id}>
                                                        <td className="whitespace-nowrap px-4 py-3 tabular-nums"><p><bdi>{formatDate(tx.date, dateDigits)}</bdi></p><p className="text-xs text-slate-600"><bdi>{formatTime(tx.date, dateDigits)}</bdi></p></td>
                                                        <td className="px-4 py-3 font-semibold text-[#0e3c63]">
                                                            <div className="flex items-center gap-2">
                                                                <bdi>{materialLabel}</bdi>
                                                                {tx.isLocked && <MovementLockIcon name={materialLabel} onUnlock={canLock ? () => unlockMovement(tx) : undefined} />}
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3"><Badge color={isOut ? 'orange' : 'green'}>{t(isOut ? 'factory_tabs.inv_type_out' : 'factory_tabs.inv_type_in')}</Badge></td>
                                                        <td className="whitespace-nowrap px-4 py-3 tabular-nums">{quantity(tx.quantity || 0)} {unit(tx.materialType)}</td>
                                                        <td className="min-w-28 px-4 py-3 text-slate-600 [overflow-wrap:anywhere]">{tx.source || tx.notes || '—'}</td>
                                                        <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums"><bdi>{usd(value)}</bdi></td>
                                                        <td className="px-2">
                                                            <div className="flex gap-1">
                                                                {canEdit && !tx.isLocked && <button type="button" className={actionClass} aria-label={t('batch4.k468')} title={t('batch4.k468')} onClick={() => onOpenModal('INVENTORY', { tx })}><Edit3 size={17} aria-hidden /></button>}
                                                                {canLock && !tx.isLocked && <button type="button" className={actionClass} aria-label={t('factory_materials.lock_movement')} title={t('factory_materials.lock_movement')} onClick={() => { setMovementError(''); setMovementAction({ type: 'lock', tx }); }}><Lock size={17} aria-hidden /></button>}
                                                                {canDelete && !tx.isLocked && <button type="button" className={actionClass + ' hover:bg-red-50 hover:text-red-700'} aria-label={t('batch4.k471')} title={t('batch4.k471')} onClick={() => { setMovementError(''); setMovementAction({ type: 'delete', tx }); }}><Trash2 size={17} aria-hidden /></button>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredTxs.length > 0 && <PaginationControl page={currentPage} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={filteredTxs.length} />}
                            </>
                        )}
                    </>
                )}
            </section>

            {catalogAction && <MaterialCatalogDialog action={catalogAction}
                unitInUse={'material' in catalogAction && statsById.has(catalogAction.material.id)} onClose={() => setCatalogAction(null)} />}
            {movementAction && (
                <InventoryDialog title={t(movementAction.type === 'lock' ? 'factory_tabs.inv_confirm_lock_title' : 'factory_tabs.inv_confirm_delete_title')}
                    busy={busy} onClose={() => setMovementAction(null)}>
                    <div className="space-y-4 p-5">
                        <div>
                            <p className="font-semibold">{label(movementAction.tx.materialType)} · {quantity(movementAction.tx.quantity || 0)} {unit(movementAction.tx.materialType)}</p>
                            <p className="text-sm tabular-nums text-slate-600"><bdi>{formatDate(movementAction.tx.date, dateDigits)}</bdi></p>
                        </div>
                        <p className="text-sm text-slate-600">{t(movementAction.type === 'lock' ? 'factory_materials.lock_movement_hint' : 'factory_tabs.inv_delete_warning')}</p>
                        {movementError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{movementError}</p>}
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="secondary" disabled={busy} onClick={() => setMovementAction(null)}>{t('common.cancel')}</Button>
                            <Button variant={movementAction.type === 'delete' ? 'danger' : 'primary'} disabled={busy} onClick={executeMovementAction}>
                                {t(movementAction.type === 'lock' ? 'factory_tabs.inv_confirm_lock_btn' : 'factory_tabs.inv_confirm_delete_btn')}
                            </Button>
                        </div>
                    </div>
                </InventoryDialog>
            )}
        </div>
    );
}

function MovementLockIcon({ name, onUnlock }: { name: string; onUnlock?: () => Promise<void> }) {
    const { t } = useTranslation();
    const [armed, setArmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const pending = useRef(false);
    const label = t(armed ? 'factory_materials.unlock_second_press' : 'factory_materials.unlock_two_presses', { name });

    if (!onUnlock) {
        const locked = t('factory_materials.movement_locked');
        return <span role="img" aria-label={locked} title={locked}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
            <Lock size={15} aria-hidden />
        </span>;
    }

    const pressLock = async () => {
        if (pending.current) return;
        if (!armed) {
            setArmed(true);
            return;
        }
        pending.current = true;
        setArmed(false);
        setBusy(true);
        try {
            await onUnlock();
        } finally {
            pending.current = false;
            setBusy(false);
        }
    };

    return (
        <>
            <button type="button" disabled={busy} aria-label={label} title={label} onClick={pressLock} onBlur={() => setArmed(false)}
                onKeyDown={event => {
                    if (event.key === 'Escape') setArmed(false);
                    if (event.key === 'Enter' && event.repeat) event.preventDefault();
                }}
                className={iconButtonClass + ' shrink-0 touch-manipulation select-none bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50' +
                    (armed ? ' ring-2 ring-amber-400' : '')}>
                <Lock size={16} aria-hidden />
            </button>
            <span role="status" className="sr-only">{armed ? label : ''}</span>
        </>
    );
}

function MaterialFigure({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-slate-600 sm:sr-only">{label}</p>
            <p className="font-semibold tabular-nums text-slate-900">{value}</p>
            <p className="text-xs tabular-nums text-slate-600"><bdi>{detail}</bdi></p>
        </div>
    );
}
