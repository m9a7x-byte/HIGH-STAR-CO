import React from 'react';
import { Box, Layers, PaintBucket } from 'lucide-react';
import type { ProductFamily } from '../../lib/productFamilies';

export const ProductFamilySelector = ({ value, onChange, compactOnMobile = false }: { value: ProductFamily; onChange: (value: ProductFamily) => void; compactOnMobile?: boolean }) => (
    <div className={`grid ${compactOnMobile ? 'grid-cols-3 gap-2 lg:gap-3' : 'grid-cols-1 sm:grid-cols-3 gap-3'}`} role="group" aria-label="قسم المنتجات">
        {([
            { type: 'STYROFOAM', label: 'منتجات الفلين', icon: Box },
            { type: 'ADHESIVE', label: 'المادة اللاصقة', icon: Layers },
            { type: 'PAINT', label: 'أصباغ', icon: PaintBucket }
        ] as const).map(({ type, label, icon: Icon }) => (
            <button key={type} type="button" aria-pressed={value === type} onClick={() => onChange(type)}
                className={`rounded-2xl border font-black flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e3c63] ${compactOnMobile ? 'min-h-[58px] min-w-0 flex-col gap-1 px-1 py-2 text-center text-[11px] leading-tight lg:min-h-16 lg:flex-row lg:gap-3 lg:px-5 lg:py-4 lg:text-base' : 'min-h-16 gap-3 px-5 py-4 text-base'} ${value === type ? 'bg-[#0e3c63] text-white border-[#0e3c63]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <Icon size={24} className={compactOnMobile ? 'size-4 shrink-0 lg:size-6' : undefined} aria-hidden="true" />{label}
            </button>
        ))}
    </div>
);
