import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Box, Globe, MapPin } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { TIMEZONE, getTodayDateString } from '../../../lib/dateUtils';
import { db } from '../../../lib/db';
import { materialName, materialUnit } from '../../../lib/factoryMaterials';
import type { FactoryTransaction, MaterialType } from '../../../types';
import { InventoryDialog } from './InventoryDialog';
import { ModernSingleDatePicker, ModalModernSelect } from './SharedFactoryComponents';
import { factoryFieldInput, factoryFieldLabel } from './FactoryFieldPopover';

interface InventoryModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialMaterial?: MaterialType;
    transaction?: FactoryTransaction;
}

const dateKey = new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE, dateStyle: 'short' });
const timeKey = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, timeStyle: 'medium', hourCycle: 'h23' });
const numberFieldClass = factoryFieldInput + ' [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export function InventoryModal({ onClose, onSuccess, initialMaterial, transaction }: InventoryModalProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();
    const materials = db.getFactoryMaterials().filter(material => !material.archived_at || material.id === transaction?.materialType);
    const [txType, setTxType] = useState(transaction?.transactionType ?? 'IN');
    const [date, setDate] = useState(() => transaction ? dateKey.format(new Date(transaction.date)) : getTodayDateString());
    const [materialType, setMaterialType] = useState(transaction?.materialType ?? initialMaterial ?? materials[0]?.id ?? '');
    const [quantity, setQuantity] = useState(transaction?.quantity?.toString() ?? '');
    const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '');
    const [source, setSource] = useState(transaction?.source || t('batch4.k635'));
    const [region, setRegion] = useState(transaction?.subType || t('batch4.k639'));
    const [notes, setNotes] = useState(transaction?.notes ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const material = materials.find(item => item.id === materialType);
    const unchangedMaterial = !!materialType && materialType === transaction?.materialType;
    const hasMaterial = !!material || unchangedMaterial;
    const measure = materialUnit(t, material);
    const inputQty = Number(quantity);
    const isOutgoing = txType === 'OUT';
    const showRegion = !isOutgoing && materialType === 'SAND_ADHESIVE';
    const sources = ['k635', 'k636', 'k637'].map(key => t('batch4.' + key));
    const regions = ['k639', 'k640'].map(key => t('batch4.' + key));
    const materialOptions = materials.map(item => ({ value: item.id, label: materialName(t, item.id, item) }));
    if (unchangedMaterial && !material) materialOptions.unshift({ value: materialType, label: materialName(t, materialType) });

    const currentStock = db.getMaterialStock(materialType);
    const available = currentStock + (isOutgoing && unchangedMaterial ? transaction?.quantity || 0 : 0);
    const stockExceeded = isOutgoing && (available <= 0 || inputQty > available + 1e-9);
    const purchases = db.getFactoryTransactions('INVENTORY').filter(tx => tx.materialType === materialType && tx.transactionType === 'IN');
    const totalPurchased = purchases.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
    const averagePrice = totalPurchased > 0 ? purchases.reduce((sum, tx) => sum + (tx.amount || 0), 0) / totalPurchased : 0;
    const estimatedCost = averagePrice * inputQty;

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (busy || !user || !hasMaterial || stockExceeded) return;
        if (!Number.isFinite(inputQty) || inputQty < 0.0001) {
            setError(t('factory_materials.invalid_quantity'));
            return;
        }
        const finalAmount = isOutgoing ? estimatedCost : Number(amount);
        if ((!isOutgoing && !amount.trim()) || !Number.isFinite(finalAmount) || finalAmount < 0) {
            setError(t('factory_materials.invalid_amount'));
            return;
        }

        setBusy(true);
        setError('');
        try {
            const previousDate = transaction ? new Date(transaction.date) : undefined;
            const txDate = new Date(date + 'T' + timeKey.format(previousDate ?? new Date()) + '+03:00');
            const payload = {
                category: 'INVENTORY',
                date: txDate.toISOString(),
                amount: finalAmount,
                paidAmount: finalAmount,
                notes,
                materialType,
                quantity: inputQty,
                transactionType: txType,
                subType: showRegion ? region : null,
                source: isOutgoing ? null : source,
            };
            if (transaction) {
                await db.updateFactoryTransaction(user.id, transaction.id, payload, true);
            } else {
                await db.addFactoryTransaction(user.id, payload);
            }
            toast.success(t(transaction ? 'batch4.k623' : 'batch4.k624'));
            onSuccess();
        } catch (failure) {
            const unavailable = (failure as { message?: string })?.message === 'factory_material_unavailable';
            setError(t(unavailable ? 'factory_materials.unavailable' : 'factory_materials.save_failed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <InventoryDialog title={t(transaction ? 'factory_materials.edit_movement' : 'batch4.k703')} busy={busy} onClose={onClose}>
            <form noValidate onSubmit={submit} className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={!!transaction || busy} aria-pressed={!isOutgoing} onClick={() => setTxType('IN')}
                        className={'flex min-h-11 items-center justify-center gap-2 rounded-lg border font-semibold ' + (!isOutgoing ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600')}>
                        <ArrowDown size={17} aria-hidden />{t('factory_tabs.inv_type_in')}
                    </button>
                    <button type="button" disabled={!!transaction || busy} aria-pressed={isOutgoing} onClick={() => setTxType('OUT')}
                        className={'flex min-h-11 items-center justify-center gap-2 rounded-lg border font-semibold ' + (isOutgoing ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600')}>
                        <ArrowUp size={17} aria-hidden />{t('factory_tabs.inv_type_out')}
                    </button>
                </div>

                <ModalModernSelect label={t('batch4.k628')} value={materialType} options={materialOptions} onChange={setMaterialType}
                    icon={Box} placeholder={t('factory_materials.select')} disabled={busy} />

                <div className="grid gap-3 sm:grid-cols-2">
                    <ModernSingleDatePicker label={t('batch4.k202')} value={date} onChange={setDate} disabled={busy} />
                    <label className="block min-w-0 space-y-2">
                        <span className={factoryFieldLabel}>{t('factory_modals.inv_qty_label')} ({measure})</span>
                        <input type="number" inputMode="decimal" min="0.0001" step="any" className={numberFieldClass} value={quantity} onChange={event => setQuantity(event.target.value)} required />
                    </label>
                </div>

                {isOutgoing ? (
                    <dl className={'space-y-2 rounded-lg p-3 text-sm ' + (stockExceeded ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-800')}>
                        <div className="flex justify-between gap-2"><dt>{t('batch4.k625')}</dt><dd className="font-semibold">{available.toLocaleString()} {measure}</dd></div>
                        <div className="flex justify-between gap-2"><dt>{t('batch4.k631')}</dt><dd dir="ltr">${averagePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd></div>
                        <div className="flex justify-between gap-2"><dt>{t('batch4.k632')}</dt><dd dir="ltr">${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd></div>
                        {stockExceeded && <div role="status">{t('factory_modals.inv_qty_limit')}</div>}
                    </dl>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block min-w-0 space-y-2">
                            <span className={factoryFieldLabel}>{t('batch4.k629')}</span>
                            <input type="number" inputMode="decimal" min="0" step="any" className={numberFieldClass} value={amount} onChange={event => setAmount(event.target.value)} required />
                        </label>
                        <ModalModernSelect label={t('batch4.k634')} value={source} onChange={setSource} icon={Globe} disabled={busy}
                            options={Array.from(new Set([...sources, source]), option => ({ value: option, label: option }))} />
                        {showRegion && (
                            <ModalModernSelect label={t('batch4.k638')} value={region} onChange={setRegion} icon={MapPin} disabled={busy}
                                options={Array.from(new Set([...regions, region]), option => ({ value: option, label: option }))} />
                        )}
                    </div>
                )}

                <label className="block space-y-2">
                    <span className={factoryFieldLabel}>{t(isOutgoing ? 'factory_modals.inv_notes_prod' : 'factory_modals.inv_notes_purch')}</span>
                    <textarea className={factoryFieldInput + ' min-h-24 resize-none py-3'} value={notes} onChange={event => setNotes(event.target.value)}
                        placeholder={t(isOutgoing ? 'factory_modals.inv_ph_prod' : 'factory_modals.inv_ph_purch')} />
                </label>

                {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
                    <Button type="submit" disabled={busy || stockExceeded || !hasMaterial}>{t(busy ? 'common.saving' : 'common.save')}</Button>
                </div>
            </form>
        </InventoryDialog>
    );
}
