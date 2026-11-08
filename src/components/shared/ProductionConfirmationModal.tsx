import { getProductUnit, isUnitPricedProduct } from '../../lib/productFamilies';
import { useTranslation } from 'react-i18next';
import React from 'react';
import { X, PlayCircle, MapPin, AlertTriangle, Box, Package } from 'lucide-react';
import { Order, OrderItem } from '../../types';
import { Button } from '../ui';
import { db } from '../../lib/db';

interface ProductionConfirmationModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    subtitle?: string;
    confirmLabel?: string;
    icon?: React.ElementType;
}

export const ProductionConfirmationModal: React.FC<ProductionConfirmationModalProps> = ({
    order,
    onClose,
    onConfirm,
    title = "ترحيل الطلب للإنتاج",
    subtitle = "Order Workflow Confirmation",
    confirmLabel = "تأكيد الإجراء",
    icon: Icon = PlayCircle
}) => {
    const { t } = useTranslation();
    const finalTitle = title === "ترحيل الطلب للإنتاج" ? t('production.modal_title_default') : title;
    const finalSubtitle = subtitle === "Order Workflow Confirmation" ? t('production.modal_subtitle') : subtitle;
    const finalConfirmLabel = confirmLabel === "تأكيد الإجراء" ? t('production.modal_confirm') : confirmLabel;

    // Calculate outstanding debt for this order (Total - Paid)
    const remainingDebt = order.totalAmount - order.paidAmount;
    const isFullyPaid = remainingDebt <= 0;

    // Helper to determine unit label
    const getUnitLabel = (item: OrderItem) => {
        if (item.isSpecialRequest) {
            return `${item.quantityCartons} ${item.quantityCartons > 0 && item.quantityCartons <= 10 ? t('production.units') : t('production.unit')}`;
        }

        // Find product to determine type
        const product = db.products.find(p => p.id === item.productId);
        const isAdhesive = isUnitPricedProduct(product, db.categories, item.productSaleMode) || !!item.productPaintType;

        if (isAdhesive) {
            return `${item.quantityCartons} ${item.productPaintType ? 'سطلة' : getProductUnit(product, db.categories, item.productSaleMode)}`;
        } else {
            const parts = [];
            if (item.quantityCartons > 0) parts.push(`${item.quantityCartons} ${t('production.carton')}`);
            if (item.quantityMeters > 0) parts.push(`${item.quantityMeters} ${t('production.meter')}`);
            return parts.length > 0 ? parts.join(' + ') : '0';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
            {/* Modal Container */}
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-scale-in">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white flex justify-between items-center relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] bg-[length:20px_20px]"></div>

                    <div className="relative z-10">
                        <p className="text-blue-200 text-xs font-bold mb-1">{t('production.order_number')}</p>
                        <h2 className="text-4xl font-black font-mono">#{order.id}</h2>
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                        <h3 className="text-2xl font-black mb-1">{finalTitle}</h3>
                        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em]">{finalSubtitle}</p>
                    </div>

                    <div className="relative z-10 w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center bg-white/10 backdrop-blur-md">
                        <PlayCircle size={32} />
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col lg:flex-row gap-8">

                    {/* Left Side: Order Contents */}
                    <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 flex-1 relative">
                        <div className="absolute top-0 right-0 bg-[#0e3c63] text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl">
                            {t('production.order_contents')}
                        </div>

                        <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {order.items.map((item: OrderItem, idx: number) => (
                                <div key={idx} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-800 text-sm font-mono">{item.productName || db.products.find(p => String(p.id) === String(item.productId))?.name || item.productCode}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold">{item.isSpecialRequest ? t('production.custom_dimensions') : item.productDimensions}</p>
                                            {item.paintColor && <p className="mt-1 text-xs font-bold text-[#0e3c63] whitespace-pre-line">الألوان: {item.paintColor}</p>}
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 text-xs font-black px-3 py-1.5 rounded-lg font-mono" dir="ltr">
                                        {getUnitLabel(item)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Agent Info & Summary */}
                    <div className="flex-1 space-y-6">

                        {/* Agent Card */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-xs font-bold mb-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span>{t('production.agent_info')}</p>
                                <h3 className="text-2xl font-black text-gray-800 mb-1">{order.agentName}</h3>
                                <div className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                                    <MapPin size={12} />
                                    {order.agentProvince}
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-400 font-bold mb-1">{t('production.total_value')}</p>
                                <h2 className="text-2xl font-black font-mono text-[#0e3c63]">${order.totalAmount.toLocaleString()}</h2>
                            </div>
                        </div>

                        {/* Financial Alert */}
                        {!isFullyPaid ? (
                            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-amber-800 text-lg mb-1">{t('production.financial_alert')}</h4>
                                    <p className="text-sm text-amber-900/80 font-bold leading-relaxed">
                                        {t('production.unpaid_warning')} <span className="font-mono font-black text-amber-700">${remainingDebt.toLocaleString()}</span>{t('production.are_you_sure')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <Box size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-emerald-800 text-lg mb-1">{t('production.order_ready')}</h4>
                                    <p className="text-sm text-emerald-900/80 font-bold">
                                        {t('production.fully_paid_msg')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50/50">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        className="h-14 px-8 rounded-2xl text-base font-bold bg-white border border-gray-200 hover:bg-gray-50 flex-1"
                    >
                        {t('production.cancel')}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="h-14 px-8 rounded-2xl text-base font-bold bg-[#0e3c63] hover:bg-blue-900 text-white flex-[2] shadow-xl shadow-blue-900/20"
                    >
                        <Icon size={20} className="mr-2" />
                        {finalConfirmLabel}
                    </Button>
                </div>

            </div>
        </div>
    );
};
