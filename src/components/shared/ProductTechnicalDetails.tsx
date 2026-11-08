import React from 'react';
import { FileText } from 'lucide-react';
import type { Product } from '../../types';

export const ProductTechnicalDetails = ({ product, compact = false }: { product: Product; compact?: boolean }) => {
    if (!product.description && !product.technicalSheetUrl) return null;
    let sheetUrl: string | undefined;
    try {
        const parsed = new URL(product.technicalSheetUrl || '');
        if (parsed.protocol === 'https:') sheetUrl = parsed.href;
    } catch { /* A missing or invalid sheet URL leaves the text description available. */ }
    const content = <div className="space-y-3 text-sm leading-7 text-gray-600">
        {product.description && <p className="whitespace-pre-line">{product.description}</p>}
        {sheetUrl && <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-black text-[#0e3c63] underline underline-offset-4"><FileText size={17} />نشرة المنتج الكاملة PDF</a>}
    </div>;
    return compact ? <details className="mb-4 rounded-xl border border-gray-100 p-3"><summary className="cursor-pointer font-black text-sm text-[#0e3c63]">مواصفات المنتج</summary><div className="mt-3">{content}</div></details>
        : <section className="bg-white rounded-2xl border border-gray-100 p-6"><h3 className="font-black text-xl text-gray-800 mb-3">معلومات المنتج</h3>{content}{product.imageNote && <p className="mt-4 text-xs text-gray-500">{product.imageNote}</p>}</section>;
};
