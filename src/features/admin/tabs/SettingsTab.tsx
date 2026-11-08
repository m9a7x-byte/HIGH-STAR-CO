import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Settings, Factory, Bell, LayoutTemplate, Printer, Power, ShieldCheck, ListOrdered, BrainCircuit, Key, Eye,
    EyeOff, Smartphone, Monitor, Truck, Globe, Send, Image as ImageIcon, Link, X, ChevronDown
} from 'lucide-react';
import { Card, SettingsImageUploader } from '../../../components/ui';
import { ToastPosition } from '../../../types';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export const SettingsTab = ({ settings, onUpdateSettings }: any) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();
    const notificationImageRef = useRef<HTMLInputElement>(null);
    const [broadcastNotification, setBroadcastNotification] = useState({
        title: '',
        message: '',
        target: 'ALL' as 'ALL' | 'STAFF' | 'AGENTS',
        actionUrl: '',
        actionLabel: ''
    });
    const [notificationImage, setNotificationImage] = useState<File | null>(null);
    const [notificationImagePreview, setNotificationImagePreview] = useState('');
    const [isSendingNotification, setIsSendingNotification] = useState(false);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);

    const positions: { id: ToastPosition, label: string }[] = [
        { id: 'top-right', label: t('settings.top_right') },
        { id: 'top-left', label: t('settings.top_left') },
        { id: 'bottom-right', label: t('settings.bottom_right') },
        { id: 'bottom-left', label: t('settings.bottom_left') },
    ];

    const targetOptions: { id: 'ALL' | 'STAFF' | 'AGENTS'; label: string; desc: string }[] = [
        { id: 'ALL', label: 'الكل', desc: 'كل الموظفين والوكلاء الفعالين' },
        { id: 'STAFF', label: 'الموظفين فقط', desc: 'الإدارة والمشرفين والموظفين' },
        { id: 'AGENTS', label: 'الوكلاء فقط', desc: 'حسابات الوكلاء الفعالة' },
    ];
    const selectedTarget = targetOptions.find(option => option.id === broadcastNotification.target) || targetOptions[0];

    const handleNotificationImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('ملف غير صالح', 'اختار صورة فقط حتى ترفقها بالإشعار.');
            return;
        }
        setNotificationImage(file);
        setNotificationImagePreview(URL.createObjectURL(file));
        e.target.value = '';
    };

    const handleSendBroadcastNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!broadcastNotification.title.trim() || !broadcastNotification.message.trim()) {
            toast.error('معلومات ناقصة', 'اكتب عنوان الإشعار والوصف قبل الإرسال.');
            return;
        }

        try {
            setIsSendingNotification(true);
            const imageUrl = notificationImage
                ? await db.uploadNotificationImage(String(user.id), notificationImage)
                : undefined;

            const count = await db.sendBroadcastNotification(String(user.id), {
                title: broadcastNotification.title,
                message: broadcastNotification.message,
                target: broadcastNotification.target,
                actionUrl: broadcastNotification.actionUrl,
                actionLabel: broadcastNotification.actionLabel || (broadcastNotification.actionUrl ? 'فتح الرابط' : ''),
                imageUrl
            });

            toast.success('تم إرسال الإشعار', `وصل الإشعار إلى ${count.toLocaleString()} مستخدم.`);
            setBroadcastNotification({ title: '', message: '', target: 'ALL', actionUrl: '', actionLabel: '' });
            setNotificationImage(null);
            setNotificationImagePreview('');
            setIsBroadcastModalOpen(false);
            setIsTargetDropdownOpen(false);
        } catch (error: any) {
            toast.error('فشل إرسال الإشعار', error.message || 'حدث خطأ غير متوقع أثناء الإرسال.');
        } finally {
            setIsSendingNotification(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">

            <div className="px-2">
                <h3 className="font-black text-2xl text-gray-800 flex items-center gap-3">
                    <Settings size={28} className="text-[#0e3c63]" />
                    {t('settings.title')}
                </h3>
                <p className="text-gray-500 text-sm font-bold mt-1">{t('batch3.txt_kvpb79_7030')}</p>
            </div>

            <div className="grid grid-cols-1 gap-8">

                {/* 1. قسم الهوية الرسمية والطباعة */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Printer size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">{t('batch3.txt_sjdqs4_7030')}</h4>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <p className="font-black text-gray-800">{t('settings.toggle_print')}</p>
                                <p className="text-xs text-gray-400 font-bold mt-1">{t('batch3.txt_yl6jng_7030')}</p>
                            </div>
                            <button
                                onClick={() => onUpdateSettings(
                                    'enablePrint',
                                    !settings.enablePrint,
                                    t('settings.toggle_print'),
                                    settings.enablePrint ? t('settings.toggle_print_off_msg') : t('settings.toggle_print_on_msg'),
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
                                label={t('settings.header_image')}
                                description={t('settings.print_header_desc')}
                                currentUrl={settings.printHeaderUrl}
                                onUpload={(url: string) => onUpdateSettings('printHeaderUrl', url)}
                            />
                            <SettingsImageUploader
                                label={t('settings.footer_image')}
                                description={t('settings.print_footer_desc')}
                                currentUrl={settings.printFooterUrl}
                                onUpload={(url: string) => onUpdateSettings('printFooterUrl', url)}
                            />
                        </div>
                    </div>
                </Card>

                {/* 2. تجربة الوكيل والخصوصية */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-blue-50 text-[#0e3c63] rounded-xl"><LayoutTemplate size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">{t('batch3.txt_sb47v4_7030')}</h4>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-[#0e3c63]/5 rounded-3xl border-2 border-dashed border-[#0e3c63]/20">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${settings.showProductionQueueToAgents ? 'bg-[#0e3c63] text-white' : 'bg-gray-200 text-gray-400'}`}>
                                {settings.showProductionQueueToAgents ? <Eye size={24} /> : <EyeOff size={24} />}
                            </div>
                            <div>
                                <p className="font-black text-gray-800">{t('batch3.txt_ibodtg_7030')}</p>
                                <p className="text-xs text-gray-500 font-bold mt-1">{t('batch3.txt_tmui5m_7006')}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onUpdateSettings(
                                'showProductionQueueToAgents',
                                !settings.showProductionQueueToAgents,
                                t('settings.change_agent_view'),
                                settings.showProductionQueueToAgents ? t('settings.hide_queue_msg') : t('settings.show_queue_msg'),
                                LayoutTemplate,
                                'from-[#0e3c63] to-[#1a4d7a]'
                            )}
                            className={`w-16 h-9 rounded-full transition-all duration-300 relative ${settings.showProductionQueueToAgents ? 'bg-[#0e3c63]' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${settings.showProductionQueueToAgents ? 'right-8.5' : 'right-1.5'}`}></div>
                        </button>
                    </div>
                </Card>

                {/* 3. إعدادات اللغة */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl"><Globe size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">إعدادات اللغة</h4>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-cyan-50 rounded-3xl border-2 border-dashed border-cyan-200">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${settings.enableLanguageSwitcher !== false ? 'bg-cyan-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                <Globe size={24} />
                            </div>
                            <div>
                                <p className="font-black text-gray-800">اختيار اللغة بالنظام</p>
                                <p className="text-xs text-cyan-700 font-bold mt-1">
                                    {settings.enableLanguageSwitcher !== false ? 'مفعّل: تظهر أيقونة اختيار اللغة بالهيدر وصفحات الدخول.' : 'متوقف: قسم اللغة بوضع صيانة ومخفي عن المستخدمين.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onUpdateSettings(
                                'enableLanguageSwitcher',
                                settings.enableLanguageSwitcher === false,
                                'تغيير حالة قسم اللغة',
                                settings.enableLanguageSwitcher !== false ? 'راح يتم إخفاء اختيار اللغة من الهيدر وبوابات الدخول.' : 'راح يتم إرجاع اختيار اللغة للنظام والبوابات.',
                                Globe,
                                settings.enableLanguageSwitcher !== false ? 'from-cyan-600 to-cyan-800' : 'from-emerald-600 to-emerald-800'
                            )}
                            className={`w-16 h-9 rounded-full transition-all duration-300 relative ${settings.enableLanguageSwitcher !== false ? 'bg-cyan-600' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${settings.enableLanguageSwitcher !== false ? 'right-8.5' : 'right-1.5'}`}></div>
                        </button>
                    </div>
                </Card>

                {/* 3. نظام التنبيهات الفورية (Toasts) */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Bell size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">{t('settings.toast_system')}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-sm font-black text-gray-700">{t('batch3.txt_7j2m03_7030')}</p>
                                <button
                                    onClick={() => onUpdateSettings(
                                        'enableToasts',
                                        !settings.enableToasts,
                                        t('settings.toast_system'),
                                        settings.enableToasts ? t('settings.toast_off_msg') : t('settings.toast_on_msg'),
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
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">{t('batch3.txt_pw797l_7030')}</label>
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

                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <div className="p-5 rounded-[2rem] bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/10 flex items-center justify-center shadow-inner">
                                    <Send size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-lg">إرسال إشعار للمستخدمين</p>
                                    <p className="text-xs text-blue-100 font-bold mt-1">عنوان، وصف، رابط إجراء، وصورة اختيارية داخل نافذة واحدة.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBroadcastModalOpen(true)}
                                className="h-14 px-6 bg-white text-[#0e3c63] hover:bg-blue-50 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Send size={18} /> فتح نافذة الإرسال
                            </button>
                        </div>
                    </div>
                </Card>

                {/* 4. وضع الصيانة والذكاء الاصطناعي */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem]">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><BrainCircuit size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">{t('batch3.txt_6q9u2b_7030')}</h4>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between p-6 bg-red-50 rounded-3xl border-2 border-dashed border-red-200">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${settings.maintenanceMode ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <Power size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-gray-800">{t('batch3.txt_b5gz7m_7030')}</p>
                                    <p className="text-xs text-red-600 font-bold mt-1">{t('batch3.txt_5d6d0z_7030')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onUpdateSettings(
                                    'maintenanceMode',
                                    !settings.maintenanceMode,
                                    t('settings.change_system_state'),
                                    settings.maintenanceMode ? t('settings.open_system_msg') : t('settings.maintenance_on_msg'),
                                    Power,
                                    settings.maintenanceMode ? 'from-emerald-600 to-emerald-800' : 'from-red-600 to-red-800'
                                )}
                                className={`w-16 h-9 rounded-full transition-all duration-300 relative ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${settings.maintenanceMode ? 'right-8.5' : 'right-1.5'}`}></div>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">{t('batch3.txt_cdg3r6_7030')}</label>
                            <textarea
                                className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-red-500 outline-none transition-all"
                                rows={3}
                                defaultValue={settings.maintenanceMessage}
                                onBlur={(e) => onUpdateSettings('maintenanceMessage', e.target.value)}
                                placeholder={t('settings.maintenance_placeholder')}
                            />
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                    <Key size={14} /> {t('settings.update_ai_key')}
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
                                                t('settings.update_ai_key'),
                                                t('settings.update_ai_key_msg'),
                                                BrainCircuit,
                                                'from-purple-600 to-purple-800'
                                            );
                                        }
                                    }}
                                    className="w-full h-14 bg-white border-2 border-purple-100 rounded-xl px-5 font-mono text-sm focus:border-purple-600 outline-none shadow-sm"
                                    placeholder={t('settings.paste_code')}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 5. سعات مركبات الشحن */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem] bg-gradient-to-br from-white to-blue-50">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Factory size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">{t('batch3.txt_wp69qc_7030')}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { key: 'kiaCapacity', label: t('settings.vehicle_kia'), icon: Smartphone },
                            { key: 'canterCapacity', label: t('settings.vehicle_canter'), icon: Monitor },
                            { key: 'trailerCapacity', label: t('settings.vehicle_trailer'), icon: Truck }
                        ].map(v => (
                            <div key={v.key} className="bg-white p-6 rounded-[2rem] border-2 border-blue-100 shadow-sm text-center group hover:border-blue-400 transition-all">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{v.label}</p>
                                <div className="relative">
                                    <input
                                        type="number"
                                        defaultValue={settings[v.key as keyof typeof settings] as number}
                                        onBlur={(e) => onUpdateSettings(v.key, Number(e.target.value))}
                                        className="w-full text-4xl font-black font-mono text-[#0e3c63] text-center bg-transparent outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* 6. قيود الطلبات (Order Constraints) */}
                <Card className="p-8 border-0 shadow-xl rounded-[2.5rem] bg-gradient-to-br from-white to-red-50">
                    <div className="flex items-center gap-3 mb-8 border-b pb-4">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><ShieldCheck size={22} /></div>
                        <h4 className="font-black text-lg text-gray-800">{t('settings.order_constraints_title')}</h4>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-red-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${settings.orderConstraintMode === 'LOCKED' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <ListOrdered size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-gray-800">{t('settings.lock_max_capacity')}</p>
                                    <p className="text-xs text-gray-500 font-bold mt-1">{t('settings.lock_max_capacity_desc')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onUpdateSettings(
                                    'orderConstraintMode',
                                    settings.orderConstraintMode === 'LOCKED' ? 'OPEN' : 'LOCKED',
                                    t('settings.modify_order_constraints'),
                                    settings.orderConstraintMode === 'LOCKED' ? t('settings.unlock_capacity_warning') : t('settings.lock_capacity_warning'),
                                    ShieldCheck,
                                    'from-red-600 to-red-800'
                                )}
                                className={`w-16 h-9 rounded-full transition-all duration-300 relative ${settings.orderConstraintMode === 'LOCKED' ? 'bg-red-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${settings.orderConstraintMode === 'LOCKED' ? 'right-8.5' : 'right-1.5'}`}></div>
                            </button>
                        </div>
                        
                        {settings.orderConstraintMode === 'LOCKED' && (
                            <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm space-y-4">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1 mb-4">{t('settings.allowed_vehicles_per_order')}</label>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:border-red-300 transition-colors">
                                        <label className="text-sm font-bold text-gray-600">{t('settings.kia_vehicles')}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            defaultValue={settings.maxKiaVehicles || 1}
                                            onBlur={(e) => onUpdateSettings('maxKiaVehicles', Math.max(1, Number(e.target.value)))}
                                            className="w-full text-2xl font-black font-mono text-[#0e3c63] text-center bg-white border border-gray-200 rounded-xl outline-none p-3 shadow-sm focus:border-red-500"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:border-red-300 transition-colors">
                                        <label className="text-sm font-bold text-gray-600">{t('settings.canter_vehicles_container')}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            defaultValue={settings.maxCanterVehicles || 1}
                                            onBlur={(e) => onUpdateSettings('maxCanterVehicles', Math.max(1, Number(e.target.value)))}
                                            className="w-full text-2xl font-black font-mono text-[#0e3c63] text-center bg-white border border-gray-200 rounded-xl outline-none p-3 shadow-sm focus:border-red-500"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:border-red-300 transition-colors">
                                        <label className="text-sm font-bold text-gray-600">{t('settings.trailer_vehicles_trailer')}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            defaultValue={settings.maxTrailerVehicles || 1}
                                            onBlur={(e) => onUpdateSettings('maxTrailerVehicles', Math.max(1, Number(e.target.value)))}
                                            className="w-full text-2xl font-black font-mono text-[#0e3c63] text-center bg-white border border-gray-200 rounded-xl outline-none p-3 shadow-sm focus:border-red-500"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <span className="text-sm font-bold text-gray-500">{t('settings.capacity_example')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

            </div>

            {isBroadcastModalOpen && (
                <div className="fixed inset-0 z-[1000] bg-[#0e3c63]/45 backdrop-blur-md flex items-center justify-center p-4 !mt-0">
                    <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-[3rem] shadow-[0_30px_80px_rgba(14,60,99,0.35)] overflow-hidden border border-white/40 animate-fade-in flex flex-col">
                        <div className="p-7 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white flex items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/10 flex items-center justify-center shadow-inner">
                                    <Bell size={26} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">إرسال إشعار للمستخدمين</h3>
                                    <p className="text-[11px] text-blue-100 font-bold mt-1">يصل الإشعار إلى جرس التنبيهات للمستلمين المحددين</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setIsBroadcastModalOpen(false); setIsTargetDropdownOpen(false); }}
                                className="p-3 rounded-2xl bg-white/10 hover:bg-red-500 transition-all"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSendBroadcastNotification} className="p-7 md:p-8 space-y-5 overflow-y-auto custom-scrollbar bg-gray-50/60">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">عنوان الإشعار</label>
                                    <input
                                        value={broadcastNotification.title}
                                        onChange={(e) => setBroadcastNotification(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="مثلاً: تحديث مهم"
                                        className="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-[#0e3c63] shadow-sm"
                                    />
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المستلمين</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTargetDropdownOpen(prev => !prev)}
                                        className="w-full h-14 px-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm flex items-center justify-between gap-3 text-right hover:border-blue-200 transition-all"
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-sm font-black text-gray-800">{selectedTarget.label}</span>
                                            <span className="block text-[10px] font-bold text-gray-400 truncate">{selectedTarget.desc}</span>
                                        </span>
                                        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isTargetDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isTargetDropdownOpen && (
                                        <div className="absolute top-full mt-2 right-0 left-0 z-20 bg-white rounded-2xl border border-gray-100 shadow-2xl p-2">
                                            {targetOptions.map(option => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setBroadcastNotification(prev => ({ ...prev, target: option.id }));
                                                        setIsTargetDropdownOpen(false);
                                                    }}
                                                    className={`w-full p-3 rounded-xl text-right transition-all ${broadcastNotification.target === option.id ? 'bg-[#0e3c63] text-white shadow-md' : 'text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <span className="block text-sm font-black">{option.label}</span>
                                                    <span className={`block text-[10px] font-bold mt-0.5 ${broadcastNotification.target === option.id ? 'text-blue-100' : 'text-gray-400'}`}>{option.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">وصف الإشعار</label>
                                <textarea
                                    value={broadcastNotification.message}
                                    onChange={(e) => setBroadcastNotification(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="اكتب تفاصيل الإشعار..."
                                    rows={4}
                                    className="w-full p-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-[#0e3c63] shadow-sm resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">رابط الإجراء</label>
                                    <input
                                        value={broadcastNotification.actionUrl}
                                        onChange={(e) => setBroadcastNotification(prev => ({ ...prev, actionUrl: e.target.value }))}
                                        placeholder="https://..."
                                        className="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-[#0e3c63] shadow-sm"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نص الزر</label>
                                    <input
                                        value={broadcastNotification.actionLabel}
                                        onChange={(e) => setBroadcastNotification(prev => ({ ...prev, actionLabel: e.target.value }))}
                                        placeholder="فتح الرابط"
                                        className="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-[#0e3c63] shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="rounded-[2rem] border-2 border-dashed border-blue-100 bg-white p-4">
                                <input ref={notificationImageRef} type="file" accept="image/*" onChange={handleNotificationImageChange} className="hidden" />
                                {notificationImagePreview ? (
                                    <div className="relative h-52 rounded-2xl overflow-hidden bg-gray-50">
                                        <img src={notificationImagePreview} alt="معاينة صورة الإشعار" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => { setNotificationImage(null); setNotificationImagePreview(''); }}
                                            className="absolute top-3 left-3 p-2 bg-white/90 text-red-600 rounded-xl shadow-lg hover:bg-red-600 hover:text-white transition-all"
                                            title="حذف الصورة"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => notificationImageRef.current?.click()}
                                        className="w-full h-28 rounded-2xl bg-blue-50/60 text-[#0e3c63] hover:bg-blue-50 border border-blue-100 font-black text-sm flex flex-col items-center justify-center gap-2 transition-all"
                                    >
                                        <ImageIcon size={26} />
                                        إرفاق صورة اختيارية
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsBroadcastModalOpen(false); setIsTargetDropdownOpen(false); }}
                                    className="w-full md:w-40 h-14 bg-white text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm border border-gray-100 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSendingNotification}
                                    className="w-full flex-1 h-14 bg-[#0e3c63] hover:bg-[#1a4d7a] disabled:bg-gray-300 text-white rounded-2xl font-black text-base shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Send size={20} />
                                    {isSendingNotification ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
