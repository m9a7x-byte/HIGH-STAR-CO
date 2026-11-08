
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { db } from '../../../lib/db';
import { ProductsSubTab } from '../catalog/ProductsSubTab';
import { CategoriesSubTab } from '../catalog/CategoriesSubTab';
import { ProductImportExportSubTab } from '../catalog/ProductImportExportSubTab';
import { Order, Product } from '../../../types';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet } from 'lucide-react';

interface CatalogTabProps {
    categories: any[];
    products: Product[];
    orders: Order[];
    canEdit: boolean;
    onViewOrder: (order: Order) => void;
    onDeleteProduct: (id: number) => void; // إضافة الدالة المفقودة هنا
}

export const CatalogTab: React.FC<CatalogTabProps> = (props) => {
    const { t } = useTranslation();
    const [catalogSubTab, setCatalogSubTab] = useState<'products' | 'categories' | 'importExport'>('products');
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Tab Switcher */}
            <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-2xl border border-gray-100 w-fit max-w-full">
                <button
                    onClick={() => {
                        setCatalogSubTab('products');
                        setIsLoading(true);
                        Promise.all([db.fetchCategories(), db.fetchProducts()]).then(() => setIsLoading(false));
                    }}
                    className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${catalogSubTab === 'products' ? 'bg-[#0e3c63] text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {isLoading && catalogSubTab === 'products' && <Loader2 className="animate-spin" size={16} />}
                    {t('products_tab.products_and_prices')}
                </button>
                <button
                    onClick={() => {
                        setCatalogSubTab('categories');
                        setIsLoading(true);
                        Promise.all([db.fetchCategories(), db.fetchProducts()]).then(() => setIsLoading(false));
                    }}
                    className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${catalogSubTab === 'categories' ? 'bg-[#0e3c63] text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {isLoading && catalogSubTab === 'categories' && <Loader2 className="animate-spin" size={16} />}
                    {t('products_tab.category_management')}
                </button>
                <button
                    onClick={() => {
                        setCatalogSubTab('importExport');
                        setIsLoading(true);
                        Promise.all([db.fetchCategories(), db.fetchProducts()]).then(() => setIsLoading(false));
                    }}
                    className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${catalogSubTab === 'importExport' ? 'bg-[#0e3c63] text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {isLoading && catalogSubTab === 'importExport' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                    تصدير واستيراد المنتجات
                </button>
            </div>

            {catalogSubTab === 'products' ? (
                <ProductsSubTab {...props} />
            ) : catalogSubTab === 'categories' ? (
                <CategoriesSubTab
                    categories={props.categories}
                    products={props.products}
                    canEdit={props.canEdit}
                />
            ) : (
                <ProductImportExportSubTab
                    categories={props.categories}
                    products={props.products}
                    canEdit={props.canEdit}
                />
            )}
        </div>
    );
};
