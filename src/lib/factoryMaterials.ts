import type { TFunction } from 'i18next';

export const materialUnits = {
    unit: 'common.unit',
    ton: 'factory_tabs.inv_unit_ton',
    kg: 'factory_materials.unit_kg',
    carton: 'factory_tabs.inv_unit_carton',
    bag: 'factory_tabs.inv_unit_bag',
    piece: 'factory_materials.unit_piece',
    liter: 'factory_materials.unit_liter',
    meter: 'common.meter',
};

export type MaterialUnit = keyof typeof materialUnits;

export interface FactoryMaterial {
    id: string;
    name: string | null;
    unit: MaterialUnit;
    sort_order: number;
    archived_at: string | null;
}

const legacyLabels = new Map(Object.entries({
    SAND_ADHESIVE: 'factory_shared.mat_sand_adhesive',
    SAND: 'factory_shared.mat_sand',
    SILICON_COLD: 'factory_shared.mat_silicon_cold',
    SILICON_HOT: 'factory_shared.mat_silicon_hot',
    CEMENT_BLACK: 'factory_shared.mat_cement_black',
    CEMENT_WHITE: 'factory_shared.mat_cement_white',
    EPS_RAW: 'factory_shared.mat_eps_raw',
    POLYMER_ADHESIVE: 'factory_shared.mat_polymer',
    SILOSH_ADHESIVE: 'factory_shared.mat_silosh',
    SHASTA_ADHESIVE: 'factory_shared.mat_shasta',
    CARTON_FOAM: 'factory_shared.mat_carton_foam',
    BAGS_1051: 'factory_shared.mat_bags_1051',
    BAGS_1052: 'factory_shared.mat_bags_1052',
    BAGS_1053: 'factory_shared.mat_bags_1053',
    BAGS_1054: 'factory_shared.mat_bags_1054',
    BAGS_1059: 'factory_shared.mat_bags_1059',
}));

export const legacyFactoryMaterials: FactoryMaterial[] = Array.from(legacyLabels.keys(), (id, index) => ({
    id,
    name: null,
    unit: id.startsWith('BAGS_') ? 'bag' : id === 'CARTON_FOAM' ? 'carton' : 'ton',
    sort_order: index + 1,
    archived_at: null,
}));

export const materialName = (t: TFunction, id?: string, material?: FactoryMaterial) => {
    const key = id ? legacyLabels.get(id) : undefined;
    return material?.name ?? (key ? t(key) : id || '—');
};

export const materialUnit = (t: TFunction, material?: FactoryMaterial) =>
    t(materialUnits[material?.unit ?? 'unit']);
