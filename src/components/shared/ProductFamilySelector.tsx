import React from 'react';
import { Box, Layers, PaintBucket } from 'lucide-react';
import type { ProductFamily } from '../../lib/productFamilies';

export const ProductFamilySelector = ({ value, onChange }: { value: ProductFamily; onChange: (value: ProductFamily) => void }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" aria-label="قسم المنتجات">
        {([
            { type: 'STYROFOAM', label: 'منتجات الفلين', icon: Box },
            { type: 'ADHESIVE', label: 'المادة اللاصقة', icon: Layers },
            { type: 'PAINT', label: 'أصباغ', icon: PaintBucket }
        ] as const).map(({ type, label, icon: Icon }) => (
            <button key={type} type="button" aria-pressed={value === type} onClick={() => onChange(type)}
                className={`min-h-16 px-5 py-4 rounded-2xl border font-black text-base flex items-center justify-center gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e3c63] ${value === type ? 'bg-[#0e3c63] text-white border-[#0e3c63]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <Icon size={24} aria-hidden="true" />{label}
            </button>
        ))}
    </div>
);
