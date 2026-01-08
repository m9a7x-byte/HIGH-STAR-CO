import React from 'react';
import {
    Settings, Factory, Bell, Check, LayoutTemplate, Printer, Image as ImageIcon,
    Link as LinkIcon, Power, ShieldCheck, ListOrdered, BrainCircuit, Key, Eye,
    EyeOff, MousePointer2, Smartphone, Monitor, Truck
} from 'lucide-react';
import { Card, Input, Button, SettingsImageUploader } from '../../../components/ui';
import { ToastPosition } from '../../../types';

export const SettingsTab = ({ settings, onUpdateSettings }: any) => {

    const positions: { id: ToastPosition, label: string }[] = [
        { id: 'top-right', label: 'أعلى اليمين' },
        { id: 'top-left', label: 'أعلى اليسار' },
        { id: 'bottom-right', label: 'أسفل اليمين' },
        { id: 'bottom-left', label: 'أسفل اليسار' },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">

            <div className="px-2">
                <h3 className="font-black text-2xl text-gray-800 flex items-center gap-3">
                    <Settings size={28} className="text-[#0e3c63]" />
                    إعدادات النظام العامة
                </h3>
                <p className="text-gray-500 text-sm font-bold mt-1">تخصيص معايير العمل، الهوية البصرية، وصلاحيات الوصول العامة</p>
            </div>

            <div className="grid grid-cols-1 gap-8">

                {/* 1. قسم الهوية الرسمية والطباعة */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Printer size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">الهوية الرسمية والطباعة</h4>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <p className="font-black text-gray-800">تفعيل نظام الطباعة A4</p>
                                <p className="text-xs text-gray-400 font-bold mt-1">إظهار زر الطباعة في فواتير الوكلاء والمصنع</p>
                            </div>
                            <button
                                onClick={() => onUpdateSettings(
                                    'enablePrint',
                                    !settings.enablePrint,
                                    'تفعيل/إيقاف الطباعة',
                                    settings.enablePrint ? 'هل أنت متأكد من إيقاف خيار الطباعة في النظام؟' : 'تفعيل خيار الطباعة سيجعل زر الطباعة متاحاً في الفواتير.',
                                    Printer,
                                    'from-emerald-600 to-emerald-800'
                                )}
                                className={`w-14 h-8 rounded-full transition-all duration-300 relative ${settings.enablePrint ? 'bg-emerald-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${settings.enablePrint ? 'right-7' : 'right-1'}`}></div>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SettingsImageUploader
                                label="صورة الهيدر (Header Image)"
                                description="يظهر في أعلى الفاتورة المطبوعة A4"
                                currentUrl={settings.printHeaderUrl}
                                onUpload={(url) => onUpdateSettings('printHeaderUrl', url)}
                            />
                            <SettingsImageUploader
                                label="صورة الفوتر (Footer Image)"
                                description="يظهر في أسفل الفاتورة المطبوعة A4"
                                currentUrl={settings.printFooterUrl}
                                onUpload={(url) => onUpdateSettings('printFooterUrl', url)}
                            />
                        </div>
                    </div>
                </Card>

                {/* 2. تجربة الوكيل والخصوصية */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-blue-50 text-[#0e3c63] rounded-xl"><LayoutTemplate size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">إعدادات تجربة الوكيل</h4>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-[#0e3c63]/5 rounded-3xl border-2 border-dashed border-[#0e3c63]/20">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${settings.showProductionQueueToAgents ? 'bg-[#0e3c63] text-white' : 'bg-gray-200 text-gray-400'}`}>
                                {settings.showProductionQueueToAgents ? <Eye size={24} /> : <EyeOff size={24} />}
                            </div>
                            <div>
                                <p className="font-black text-gray-800">عرض طابور الإنتاج للوكلاء</p>
                                <p className="text-xs text-gray-500 font-bold mt-1">عند التفعيل، سيتمكن الوكلاء من رؤية تسلسل الطلبات المباشر.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onUpdateSettings(
                                'showProductionQueueToAgents',
                                !settings.showProductionQueueToAgents,
                                'تغيير إعدادات العرض للوكيل',
                                settings.showProductionQueueToAgents ? 'هل تريد إخفاء طابور الإنتاج عن الوكلاء؟' : 'هل تريد السماح للوكلاء برؤية طابور الإنتاج المباشر؟',
                                LayoutTemplate,
                                'from-[#0e3c63] to-[#1a4d7a]'
                            )}
                            className={`w-16 h-9 rounded-full transition-all duration-300 relative ${settings.showProductionQueueToAgents ? 'bg-[#0e3c63]' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${settings.showProductionQueueToAgents ? 'right-8.5' : 'right-1.5'}`}></div>
                        </button>
                    </div>
                </Card>

                {/* 3. نظام التنبيهات الفورية (Toasts) */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Bell size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">نظام التنبيهات الفورية</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-sm font-black text-gray-700">تفعيل التنبيهات المنبثقة</p>
                                <button
                                    onClick={() => onUpdateSettings(
                                        'enableToasts',
                                        !settings.enableToasts,
                                        'نظام التنبيهات',
                                        settings.enableToasts ? 'إيقاف التنبيهات الفورية قد يؤثر على تجربة المستخدم.' : 'تفعيل التنبيهات سيظهر إشعارات منبثقة لكل الإجراءات.',
                                        Bell,
                                        'from-amber-500 to-amber-700'
                                    )}
                                    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${settings.enableToasts ? 'bg-amber-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${settings.enableToasts ? 'right-6' : 'right-1'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">موضع التنبيهات في الشاشة</label>
                            <div className="grid grid-cols-2 gap-2">
                                {positions.map(pos => (
                                    <button
                                        key={pos.id}
                                        onClick={() => onUpdateSettings('toastPosition', pos.id)}
                                        className={`py-3 px-4 rounded-xl text-[11px] font-black border-2 transition-all ${settings.toastPosition === pos.id ? 'bg-[#0e3c63] border-[#0e3c63] text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'}`}
                                    >
                                        {pos.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 4. وضع الصيانة والذكاء الاصطناعي */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><BrainCircuit size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">الصيانة والذكاء الاصطناعي</h4>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between p-6 bg-red-50 rounded-3xl border-2 border-dashed border-red-200">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${settings.maintenanceMode ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <Power size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-gray-800">وضع الصيانة العام</p>
                                    <p className="text-xs text-red-600 font-bold mt-1">عند التفعيل، يتم إغلاق النظام عن كافة الوكلاء فوراً.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onUpdateSettings(
                                    'maintenanceMode',
                                    !settings.maintenanceMode,
                                    'تغيير حالة النظام',
                                    settings.maintenanceMode ? 'هل تريد إعادة تفعيل استقبال الطلبات وفتح النظام للوكلاء؟' : 'هل أنت متأكد من إيقاف استقبال الطلبات وتفعيل وضع الصيانة؟',
                                    Power,
                                    settings.maintenanceMode ? 'from-emerald-600 to-emerald-800' : 'from-red-600 to-red-800'
                                )}
                                className={`w-16 h-9 rounded-full transition-all duration-300 relative ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${settings.maintenanceMode ? 'right-8.5' : 'right-1.5'}`}></div>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">رسالة الصيانة (تظهر للوكلاء عند الإغلاق)</label>
                            <textarea
                                className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-red-500 outline-none transition-all"
                                rows={3}
                                defaultValue={settings.maintenanceMessage}
                                onBlur={(e) => onUpdateSettings('maintenanceMessage', e.target.value)}
                                placeholder="مثلاً: النظام متوقف حالياً لغرض الجرد السنوي..."
                            />
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                    <Key size={14} /> مفتاح الذكاء الاصطناعي (Gemini API Key)
                                </label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    defaultValue={settings.geminiApiKey}
                                    onBlur={(e) => {
                                        if (e.target.value !== settings.geminiApiKey) {
                                            onUpdateSettings(
                                                'geminiApiKey',
                                                e.target.value,
                                                'تحديث مفتاح الذكاء الاصطناعي',
                                                'هل أنت متأكد من تحديث API Key؟ هذا المفتاح حساس جداً.',
                                                BrainCircuit,
                                                'from-purple-600 to-purple-800'
                                            );
                                        }
                                    }}
                                    className="w-full h-14 bg-white border-2 border-purple-100 rounded-xl px-5 font-mono text-sm focus:border-purple-600 outline-none shadow-sm"
                                    placeholder="لصق الكود هنا..."
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 5. سعات مركبات الشحن */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem] bg-gradient-to-br from-white to-blue-50">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Factory size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">سعات مركبات الشحن (بالكرتون)</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { key: 'kiaCapacity', label: 'أتيكو (Kia)', icon: Smartphone },
                            { key: 'canterCapacity', label: 'حاوية (Canter)', icon: Monitor },
                            // FIX: Missing 'Truck' icon from lucide-react import
                            { key: 'trailerCapacity', label: 'تريلة (Trailer)', icon: Truck }
                        ].map(v => (
                            <div key={v.key} className="bg-white p-6 rounded-[2rem] border-2 border-blue-100 shadow-sm text-center group hover:border-blue-400 transition-all">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{v.label}</p>
                                <div className="relative">
                                    <input
                                        type="number"
                                        defaultValue={settings[v.key]}
                                        onBlur={(e) => onUpdateSettings(v.key, Number(e.target.value))}
                                        className="w-full text-4xl font-black font-mono text-[#0e3c63] text-center bg-transparent outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};