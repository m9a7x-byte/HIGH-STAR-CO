
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { db } from '../../../lib/db';
import { ProductsSubTab } from '../catalog/ProductsSubTab';
import { CategoriesSubTab } from '../catalog/CategoriesSubTab';
import { Order, Product } from '../../../types';

interface CatalogTabProps {
    categories: any[];
    products: Product[];
    orders: Order[];
    canEdit: boolean;
    onViewOrder: (order: Order) => void;
    onDeleteProduct: (id: number) => void; // إضافة الدالة المفقودة هنا
}

export const CatalogTab: React.FC<CatalogTabProps> = (props) => {
    const [catalogSubTab, setCatalogSubTab] = useState<'products' | 'categories'>('products');
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Tab Switcher */}
            <div className="flex gap-2 bg-white/50 p-1.5 rounded-2xl border border-gray-100 w-fit">
                <button
                    onClick={() => {
                        setCatalogSubTab('products');
                        setIsLoading(true);
                        Promise.all([db.fetchCategories(), db.fetchProducts()]).then(() => setIsLoading(false));
                    }}
                    className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${catalogSubTab === 'products' ? 'bg-[#0e3c63] text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {isLoading && catalogSubTab === 'products' && <Loader2 className="animate-spin" size={16} />}
                    المنتجات والأسعار
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
                    إدارة التصنيفات
                </button>
            </div>

            {catalogSubTab === 'products' ? (
                <ProductsSubTab {...props} />
            ) : (
                <CategoriesSubTab
                    categories={props.categories}
                    products={props.products}
                    canEdit={props.canEdit}
                />
            )}
        </div>
    );
};
