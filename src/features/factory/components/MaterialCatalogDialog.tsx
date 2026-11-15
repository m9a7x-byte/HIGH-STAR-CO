import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Ruler } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import { db } from '../../../lib/db';
import { materialName, materialUnits, type FactoryMaterial, type MaterialUnit } from '../../../lib/factoryMaterials';
import { InventoryDialog } from './InventoryDialog';
import { ModalModernSelect } from './SharedFactoryComponents';
import { factoryFieldInput, factoryFieldLabel } from './FactoryFieldPopover';

export type CatalogAction = { type: 'add' } | { type: 'edit' | 'archive' | 'restore'; material: FactoryMaterial };

export function MaterialCatalogDialog({ action, unitInUse, onClose }: {
    action: CatalogAction;
    unitInUse: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const toast = useToast();
    const material = 'material' in action ? action.material : undefined;
    const originalName = material ? materialName(t, material.id, material) : '';
    const [name, setName] = useState(originalName);
    const [unit, setUnit] = useState<MaterialUnit>(material?.unit ?? 'unit');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const editing = action.type === 'add' || action.type === 'edit';

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (busy || (editing && !name.trim())) return;
        setBusy(true);
        setError('');
        try {
            if (editing) {
                await db.saveFactoryMaterial({
                    name: material && name.trim() === originalName ? material.name : name.trim(),
                    unit,
                }, material?.id);
            } else if (material) {
                await db.setFactoryMaterialArchived(material.id, action.type === 'archive');
            }
            toast.success(t(`factory_materials.${action.type}_done`));
            onClose();
        } catch (failure) {
            const unitConflict = (failure as { message?: string })?.message === 'factory_material_unit_in_use';
            setError(t(unitConflict ? 'factory_materials.unit_in_use' : 'factory_materials.save_failed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <InventoryDialog title={t(`factory_materials.${action.type}`)} busy={busy} onClose={onClose}>
            <form noValidate onSubmit={submit} className="space-y-4 p-5">
                {editing ? (
                    <>
                        <label className="block space-y-2">
                            <span className={factoryFieldLabel}>{t('factory_materials.name')}</span>
                            <input data-initial-focus required maxLength={120} value={name} onChange={event => setName(event.target.value)}
                                className={factoryFieldInput} />
                        </label>
                        <ModalModernSelect label={t('common.unit')} value={unit} disabled={unitInUse || busy} onChange={setUnit} icon={Ruler}
                            options={(Object.keys(materialUnits) as MaterialUnit[]).map(value => ({ value, label: t(materialUnits[value]) }))} />
                        {unitInUse && <p className="text-sm text-slate-600">{t('factory_materials.unit_in_use')}</p>}
                    </>
                ) : (
                    <div className="space-y-2">
                        <p className="font-semibold [overflow-wrap:anywhere]" dir="auto">{originalName}</p>
                        <p className="text-sm leading-relaxed text-slate-600">{t(`factory_materials.${action.type}_hint`)}</p>
                    </div>
                )}
                {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button variant="secondary" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
                    <Button type="submit" variant={action.type === 'archive' ? 'danger' : 'primary'}
                        disabled={busy || (editing && !name.trim())}>
                        {t(busy ? 'common.saving' : editing ? 'common.save' : action.type === 'archive' ? 'common.delete' : 'factory_materials.restore')}
                    </Button>
                </div>
            </form>
        </InventoryDialog>
    );
}
