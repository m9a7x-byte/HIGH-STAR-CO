import type { Category, Product } from '../types';

import type { ProductFamily } from './productFamilies';
export type { ProductFamily } from './productFamilies';
export type ProductRow = {
    id: string;
    code: string;
    name: string;
    paintType: string;
    category: string;
    dimensions: string;
    packageUnits: number;
    normalMeter: number;
    vipMeter: number;
    normalUnit: number;
    vipUnit: number;
    isActive: string;
};
export type ImportedProductRow = Partial<Record<keyof ProductRow, string | number>>;

const commonLabels: Record<keyof ProductRow, string> = {
    id: 'ID', code: 'كود المنتج', name: 'اسم المادة', paintType: 'نوع الصبغ', category: 'التصنيف', dimensions: 'الابعاد / الوزن',
    packageUnits: 'عدد الأمتار في الكارتون', normalMeter: 'عادي - سعر المتر', vipMeter: 'VIP - سعر المتر',
    normalUnit: 'عادي - سعر الكيس', vipUnit: 'VIP - سعر الكيس', isActive: 'الحالة'
};

export const transferLabels = (family: ProductFamily) => ({
    ...commonLabels,
    packageUnits: family === 'ADHESIVE' ? 'عدد الأكياس في الباليت' : commonLabels.packageUnits,
    normalUnit: family === 'PAINT' ? 'عادي - سعر السطلة' : commonLabels.normalUnit,
    vipUnit: family === 'PAINT' ? 'VIP - سعر السطلة' : commonLabels.vipUnit,
    dimensions: family === 'PAINT' ? 'الوزن / الحجم' : commonLabels.dimensions
});

export const transferFields = (family: ProductFamily): (keyof ProductRow)[] => [
    'id', 'code', ...(family === 'PAINT' ? ['name', 'paintType'] as const : []), 'category', 'dimensions',
    ...(family === 'PAINT' ? [] : ['packageUnits'] as const),
    ...(family !== 'STYROFOAM' ? ['normalUnit', 'vipUnit'] as const : ['normalMeter', 'vipMeter'] as const),
    'isActive'
];

export const getCategoryType = (categories: Category[], name: string): ProductFamily =>
    categories.find(category => category.name === name)?.type || 'STYROFOAM';

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const nonBlank = (value: unknown) => value !== undefined && String(value).trim() !== '';
const numberValue = (value: unknown, fallback: number, label: string, positive = false) => {
    if (!nonBlank(value)) return fallback;
    const normalized = String(value).trim()
        .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
        .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
        .replace(/[٬,\s$]/g, '').replace(/٫/g, '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0 || (positive && parsed === 0)) {
        throw new Error(`${label}: أدخل رقماً ${positive ? 'أكبر من صفر' : 'صحيحاً غير سالب'}`);
    }
    return parsed;
};

export const buildProductRow = (product: Product, categories: Category[]): ProductRow => ({
    id: String(product.id), code: product.code, name: product.name || '', paintType: product.paintType || '', category: product.category, dimensions: product.dimensions,
    packageUnits: Number(product.metersPerCarton ?? (getCategoryType(categories, product.category) === 'ADHESIVE' ? 80 : 1)),
    normalMeter: Number(product.prices['عادي']?.pricePerMeter || 0),
    vipMeter: Number(product.prices.VIP?.pricePerMeter || 0),
    normalUnit: Number(product.prices['عادي']?.pricePerCarton || 0),
    vipUnit: Number(product.prices.VIP?.pricePerCarton || 0),
    isActive: product.isActive === false ? 'متوقف' : 'فعال'
});

export const buildImportPayload = (row: ImportedProductRow, target: Product, categories: Category[], family: ProductFamily) => {
    const category = nonBlank(row.category) ? String(row.category).trim() : target.category;
    if (!categories.some(item => item.name === category)) throw new Error(`التصنيف غير موجود: ${category}`);
    if (getCategoryType(categories, target.category) !== family || getCategoryType(categories, category) !== family) {
        throw new Error('نوع المنتج لا يطابق القسم المختار؛ استورد ملف الفلين واللاصقة كل واحد بقسمه');
    }
    const adhesive = family !== 'STYROFOAM';
    const quantity = family === 'PAINT' ? 1 : numberValue(row.packageUnits, Number(target.metersPerCarton ?? (adhesive ? 80 : 1)), 'عدد وحدات العبوة');
    if (family === 'ADHESIVE' && !Number.isInteger(quantity)) throw new Error('عدد الأكياس في الباليت يجب أن يكون عدداً صحيحاً');
    const normal = numberValue(adhesive ? row.normalUnit : row.normalMeter,
        adhesive ? target.prices['عادي'].pricePerCarton : target.prices['عادي'].pricePerMeter, 'سعر العادي');
    const vip = numberValue(adhesive ? row.vipUnit : row.vipMeter,
        adhesive ? target.prices.VIP.pricePerCarton : target.prices.VIP.pricePerMeter, 'سعر VIP');
    if (!Number.isFinite(normal * quantity) || !Number.isFinite(vip * quantity)) throw new Error('قيمة السعر أو الكمية كبيرة جداً');
    const status = nonBlank(row.isActive) ? String(row.isActive).trim() : undefined;
    if (status && !['فعال', 'متوقف'].includes(status)) throw new Error('الحالة يجب أن تكون فعال أو متوقف');
    return {
        code: nonBlank(row.code) ? String(row.code).trim() : target.code,
        name: nonBlank(row.name) ? String(row.name).trim() : target.name || null,
        paint_type: nonBlank(row.paintType) ? String(row.paintType).trim() : target.paintType || null,
        category,
        dimensions: nonBlank(row.dimensions) ? String(row.dimensions).trim() : target.dimensions,
        meters_per_carton: quantity,
        is_active: status ? status === 'فعال' : target.isActive !== false,
        prices: {
            'عادي': { pricePerMeter: adhesive ? 0 : normal, pricePerCarton: adhesive ? normal : roundMoney(normal * quantity) },
            VIP: { pricePerMeter: adhesive ? 0 : vip, pricePerCarton: adhesive ? vip : roundMoney(vip * quantity) }
        }
    };
};

export const findImportTarget = (row: ImportedProductRow, products: Product[], categories: Category[], family: ProductFamily) => {
    if (nonBlank(row.id)) return products.find(product => String(product.id) === String(row.id).trim());
    const matches = products.filter(product => getCategoryType(categories, product.category) === family &&
        product.code.trim() === String(row.code || '').trim() &&
        (!nonBlank(row.category) || product.category === String(row.category).trim()) &&
        (!nonBlank(row.dimensions) || product.dimensions.trim() === String(row.dimensions).trim()));
    if (matches.length > 1) throw new Error(`الكود ${row.code} مكرر؛ أبقِ ID أو حدد التصنيف والأبعاد`);
    return matches[0];
};

export const rowsFromCells = (cells: string[][], family: ProductFamily): ImportedProductRow[] => {
    const aliases = new Map<string, keyof ProductRow>();
    for (const type of ['STYROFOAM', 'ADHESIVE', 'PAINT'] as const) {
        for (const [field, label] of Object.entries(transferLabels(type))) aliases.set(label, field as keyof ProductRow);
    }
    aliases.set('متر/كارتون أو أكياس/باليت', 'packageUnits');
    aliases.set('عادي - سعر الكارتون/الكيس', 'normalUnit');
    aliases.set('VIP - سعر الكارتون/الكيس', 'vipUnit');
    const header = (cells[0] || []).map(value => aliases.get(value.replace(/^\uFEFF/, '').trim()));
    const required = family !== 'STYROFOAM' ? ['normalUnit', 'vipUnit'] : ['normalMeter', 'vipMeter'];
    if ((!header.includes('id') && !header.includes('code')) || required.some(field => !header.includes(field as keyof ProductRow))) {
        throw new Error('أعمدة الملف لا تطابق القسم؛ صدّر ملفاً جديداً من قسم الفلين أو المادة اللاصقة ثم عدّله');
    }
    const known = header.filter(Boolean);
    if (new Set(known).size !== known.length) throw new Error('الملف يحتوي أعمدة مكررة');
    return cells.slice(1).map(values => {
        const row: ImportedProductRow = {};
        header.forEach((field, index) => { if (field) row[field] = values[index]?.trim() || ''; });
        return row;
    }).filter(row => nonBlank(row.id) || nonBlank(row.code));
};

export const parseDelimitedRows = (text: string): string[][] => {
    const delimiter = text.split(/\r?\n/, 1)[0].includes('\t') ? '\t' : ',';
    const rows: string[][] = [];
    let row: string[] = [], cell = '', quoted = false;
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (char === '"') {
            if (quoted && text[index + 1] === '"') { cell += '"'; index++; }
            else quoted = !quoted;
        } else if (char === delimiter && !quoted) { row.push(cell); cell = ''; }
        else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && text[index + 1] === '\n') index++;
            row.push(cell); if (row.some(value => value.trim())) rows.push(row);
            row = []; cell = '';
        } else cell += char;
    }
    if (quoted) throw new Error('علامات الاقتباس في ملف CSV غير مكتملة');
    row.push(cell); if (row.some(value => value.trim())) rows.push(row);
    return rows;
};
