
import React, { useState, useEffect } from 'react';
import { Package, X, Calendar, User, MapPin, Printer, Box, History, Wallet, Tag, Ruler, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '../ui';
import { Order } from '../../types';
import { db } from '../../lib/db';
import { formatDate } from '../../lib/dateUtils';

interface InvoiceModalProps {
    order: Order;
    onClose: () => void;
    onNavigateToOrder?: (orderId: number) => void;
    allowPrint?: boolean;
}

export const InvoiceModal = ({ order, onClose, allowPrint = true }: InvoiceModalProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const systemConfigs = db.vehicleConfig;

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (!order) return null;

    return (
        <>
            <style>
                {`
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    html, body { 
                        width: 210mm;
                        height: auto;
                        margin: 0 !important; 
                        padding: 0 !important; 
                        overflow: visible; 
                    }
                    body * { visibility: hidden; }
                    #invoice-modal, #invoice-modal * { visibility: visible; }
                    #invoice-modal { 
                        position: absolute !important; 
                        left: 0; 
                        top: 0; 
                        width: 210mm;
                        min-height: 297mm; /* Ensure it fills at least one page */
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white;
                        display: block !important;
                        overflow: visible !important;
                    }
                    /* Ensure headers/footers show and are full width */
                    .print-header-container { position: fixed; top: 0; left: 0; width: 100%; z-index: 50; }
                    .print-footer-container { position: fixed; bottom: 0; left: 0; width: 100%; z-index: 50; }
                    /* Avoid creating a second page if content fits */
                    .print-content-wrapper { height: auto !important; min-height: 0 !important; }
                }
                `}
            </style>
            <div id="invoice-modal" className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in print:animate-none print:p-0 print:static print:bg-white print:block print:h-auto print:overflow-visible">
                <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-auto print:shadow-none print:rounded-none print:w-full print:block print:relative print:overflow-visible">

                    {/* Print Header (Fixed) */}
                    {systemConfigs.printHeaderUrl && (
                        <div className="hidden print:block print-header-container">
                            <img src={systemConfigs.printHeaderUrl} className="w-full h-auto object-cover" alt="Header" />
                        </div>
                    )}

                    {/* Print Footer (Fixed) */}
                    {systemConfigs.printFooterUrl && (
                        <div className="hidden print:block print-footer-container">
                            <img src={systemConfigs.printFooterUrl} className="w-full h-auto object-cover" alt="Footer" />
                        </div>
                    )}

                    <div className={`bg-[#0e3c63] p-6 flex justify-between items-center text-white shrink-0 print:hidden`}>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <Package size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-xl">معاينة الفاتورة</h3>
                                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Order Details Preview</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="bg-white/10 hover:bg-red-500 p-2.5 rounded-xl transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Added padding for print to avoid overlap with fixed header/footer (adjust values as needed) */}
                    <div className="flex-1 overflow-y-auto p-8 print:p-8 print:overflow-visible print:pt-[160px] print:pb-[110px] print-content-wrapper">

                        {/* Formal Invoice Header Design (User Requested) */}
                        <div className="mb-8 print:mb-4 border-b pb-4 print:pb-2 border-gray-200 print:border-black">
                            {/* Centered Title */}
                            <div className="text-center mb-6 print:mb-6">
                                <h1 className="text-xl font-black text-black inline-block border-b-2 border-black pb-1">فاتورة مبيعات</h1>
                            </div>

                            <div className="flex justify-between items-start dir-rtl px-4 print:px-0">

                                {/* Right Side: Agent Info */}
                                <div className="space-y-1 text-right">
                                    <div className="flex items-center gap-2">
                                        <span className="text-black text-[12px] font-bold">اسم المكتب او الوكيل :</span>
                                        <span className="text-black text-[12px] font-bold">{order.agentName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-black text-[12px] font-bold">العنوان :</span>
                                        <span className="text-black text-[12px] font-bold">
                                            {order.agentProvince}
                                            {(() => {
                                                const agent = db.users.find(u => u.fullName === order.agentName);
                                                return agent?.address ? ` - ${agent.address}` : '';
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                {/* Left Side: Invoice Meta */}
                                <div className="space-y-1 text-left print:text-left">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-black text-[12px] font-bold">رقم الفاتورة :</span>
                                        <span className="text-black text-[12px] font-bold">{order.id}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-black text-[12px] font-bold">تاريخ الفاتورة :</span>
                                        <span className="text-black text-[12px] font-bold font-mono dir-ltr">
                                            {new Date().toLocaleDateString('en-GB')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8 print:hidden">
                            <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">المبلغ الصافي</p>
                                <p className="text-xl font-black font-mono text-gray-800">${(order.totalAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100 text-emerald-700">
                                <p className="text-[10px] font-black uppercase mb-1 opacity-70">الواصل</p>
                                <p className="text-xl font-black font-mono">${(order.paidAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-2xl text-center border border-red-100 text-red-700">
                                <p className="text-[10px] font-black uppercase mb-1 opacity-70">المتبقي</p>
                                <p className="text-xl font-black font-mono">${((order.totalAmount || 0) - (order.paidAmount || 0)).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="border border-gray-200 print:border-black rounded-3xl print:rounded-none overflow-hidden mb-6">
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-gray-50 print:bg-gray-100 border-b print:border-black">
                                    <tr className="text-gray-500 print:text-black font-black text-[10px] uppercase">
                                        <th className="p-4 print:p-2 w-16 text-center">ت</th>
                                        <th className="p-4 print:p-2 print:pr-2">كود المادة</th>
                                        <th className="p-4 print:p-2">الأبعاد / الوصف</th>
                                        <th className="p-4 text-center print:p-2">الكمية</th>
                                        <th className="p-4 text-left print:p-2">السعر</th>
                                        <th className="p-4 text-left print:p-2 print:pl-2">الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 print:divide-gray-400">
                                    {order.items.map((item, index) => (
                                        <React.Fragment key={item.id}>
                                            <tr className={`text-sm print:text-[11px] ${item.isSpecialRequest ? 'bg-amber-50 print:bg-white' : ''}`}>
                                                <td className="p-4 print:p-2 text-center font-mono font-bold text-gray-400 print:text-black border-l print:border-gray-300">
                                                    {index + 1}
                                                </td>
                                                <td className="p-4 print:p-2 print:pr-2 font-black text-gray-800 print:font-bold">
                                                    <div className="flex items-center gap-2">
                                                        {item.isSpecialRequest && <Sparkles size={12} className="text-amber-500 fill-amber-500 print:hidden" />}
                                                        {item.productCode}
                                                    </div>
                                                </td>
                                                <td className="p-4 print:p-2 text-gray-500 print:text-black">{item.productDimensions}</td>
                                                <td className="p-4 print:p-2 text-center font-bold">
                                                    {(() => {
                                                        const product = db.products.find((p: any) => p.id === item.productId || String(p.id) === String(item.productId));
                                                        const isAdhesive = product ? db.categories.find((c: any) => c.name === product.category)?.type === 'ADHESIVE' : false;
                                                        const unitLabel = isAdhesive ? 'كيس' : 'كرتون';
                                                        return (
                                                            <>
                                                                {item.quantityCartons} <span className="text-[10px] opacity-50">{unitLabel}</span>
                                                                {!isAdhesive && item.quantityMeters > 0 && <span className="mr-1 text-blue-600 print:text-black">+{item.quantityMeters}م</span>}
                                                            </>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 print:p-1 text-left font-mono">
                                                    {item.unitPriceCarton > 0 ? `$${item.unitPriceCarton}` : <span className="text-xs text-amber-600 font-black">قيد التسعير</span>}
                                                </td>
                                                <td className="p-4 print:p-1 text-left font-mono font-black print:pl-2">${(item.totalPrice || 0).toLocaleString()}</td>
                                            </tr>
                                            {item.isSpecialRequest && (
                                                <tr className="bg-amber-50/50 print:bg-white border-t border-amber-100 print:border-black">
                                                    <td colSpan={6} className="p-4 py-3 print:p-1 print:pr-2">
                                                        <div className="flex items-start gap-2">
                                                            <MessageSquare size={14} className="text-amber-400 shrink-0 mt-0.5 print:hidden" />
                                                            <p className="text-xs font-bold text-amber-800 print:text-black italic">وصف الطلب الخاص: {item.specialRequestNote}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 print:bg-white border-t-2 print:border-black">
                                    <tr className="print:text-[11px]">
                                        <td colSpan={5} className="p-4 print:p-1 print:pr-2 font-bold text-gray-500 print:text-black text-left">المجموع قبل الخصم:</td>
                                        <td className="p-4 print:p-1 text-left font-mono font-bold print:pl-2">${(order.subTotalAmount || order.totalAmount || 0).toLocaleString()}</td>
                                    </tr>
                                    {order.discountValue > 0 && (
                                        <tr className="text-red-600 print:text-black print:text-[11px]">
                                            <td colSpan={5} className="p-4 print:p-1 print:pr-2 font-black text-left">الخصم المستقطع:</td>
                                            <td className="p-4 print:p-1 text-left font-mono font-black print:pl-2">-${(order.discountType === 'PERCENT' ? (order.subTotalAmount * order.discountValue / 100) : order.discountValue).toLocaleString()}</td>
                                        </tr>
                                    )}
                                    <tr className="bg-[#0e3c63] text-white print:bg-gray-100 print:text-black">
                                        <td colSpan={5} className="p-4 print:p-1 print:pr-2 font-black text-lg print:text-[12px] text-left">الصافي النهائي للمطالبة:</td>
                                        <td className="p-4 print:p-1 text-left font-mono font-black text-xl print:text-[12px] print:pl-2">${(order.totalAmount || 0).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="space-y-3 mb-6 print:hidden">
                            <h4 className="font-black text-gray-800 text-sm flex items-center gap-2">
                                <History size={16} /> سجل التسديدات
                            </h4>
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-200 overflow-hidden">
                                {order.paymentHistory?.map((log) => {
                                    const user = db.users.find(u => u.id === log.addedById || u.id == log.addedById);
                                    return (
                                        <div key={log.id} className="p-3 flex justify-between items-center text-xs hover:bg-white transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex items-center justify-center shrink-0">
                                                    {user?.avatar_path || user?.imageUrl ? (
                                                        <img
                                                            src={user.avatar_path ? db.getPublicUrl(user.avatar_path) : user.imageUrl}
                                                            className="w-full h-full object-cover"
                                                            alt={user.fullName}
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                                                        />
                                                    ) : <User size={14} className="text-gray-400" />}
                                                    {(user?.avatar_path || user?.imageUrl) && <User size={14} className="text-gray-400 hidden" />}
                                                </div>
                                                <div className="text-right">
                                                    <span className="block font-bold text-gray-800">{user?.fullName || log.addedBy}</span>
                                                    <div className="text-sm font-bold text-gray-800">{formatDate(order.createdAt)}</div>
                                                </div>
                                            </div>
                                            <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg dir-ltr">+${(log.amountAdded || 0).toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                                {(!order.paymentHistory || order.paymentHistory.length === 0) && (
                                    <div className="p-4 text-center text-gray-400 italic">لا توجد دفعات مسجلة</div>
                                )}
                            </div>
                        </div>



                    </div>

                    <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 print:hidden">
                        <Button onClick={onClose} variant="secondary" className="px-8 rounded-xl font-bold">إغلاق</Button>
                        {allowPrint && systemConfigs.enablePrint && (
                            <Button onClick={handlePrint} className="px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black">
                                <Printer size={18} /> طباعة A4
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
