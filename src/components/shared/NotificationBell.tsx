import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check, X, Clock, Info, CheckCircle2, AlertCircle, AlertTriangle, Trash2, ExternalLink, Smartphone } from 'lucide-react';
import { db } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { AppNotification } from '../../types';
import { enablePushNotifications, getPushPermission, isPushNotificationSupported } from '../../lib/pushNotifications';
import { useToast } from '../../context/ToastContext';

export const NotificationBell = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const toast = useToast();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [pushPermission, setPushPermission] = useState(getPushPermission());
    const [isEnablingPush, setIsEnablingPush] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const refreshData = useCallback(() => {
        setNotifications([...db.notifications]);
    }, []);

    useEffect(() => {
        refreshData();
        const unsubscribe = db.subscribe(refreshData);
        return () => unsubscribe();
    }, [refreshData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = (id: string) => {
        db.markNotificationAsRead(id);
    };

    const handleMarkAllAsRead = () => {
        db.markAllNotificationsAsRead();
    };

    const handleDeleteAll = () => {
        db.deleteAllNotifications();
    };

    const handleEnablePush = async () => {
        if (!user) return;

        try {
            setIsEnablingPush(true);
            await enablePushNotifications(user);
            setPushPermission(getPushPermission());
            toast.success('تم تفعيل إشعارات الموبايل', 'راح توصلك الإشعارات حتى إذا التطبيق بالخلفية.');
        } catch (err: any) {
            setPushPermission(getPushPermission());
            toast.error('تعذر تفعيل إشعارات الموبايل', err.message || 'تأكد من صلاحيات المتصفح.');
        } finally {
            setIsEnablingPush(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><CheckCircle2 size={16} /></div>;
            case 'warning': return <div className="p-2 bg-amber-100 text-amber-600 rounded-full"><AlertTriangle size={16} /></div>;
            case 'error': return <div className="p-2 bg-red-100 text-red-600 rounded-full"><AlertCircle size={16} /></div>;
            default: return <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Info size={16} /></div>;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('ar-IQ', { month: 'numeric', day: 'numeric' });
    };

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`relative p-2.5 rounded-xl transition-all duration-300 active:scale-95 shadow-inner border ${isOpen ? 'bg-sky-500 text-white border-sky-400/50' : 'bg-white/5 text-white hover:bg-white/10 border-white/10'}`}
                title={t('notifications.bell')}
            >
                <Bell 
                    size={22} 
                    strokeWidth={unreadCount > 0 ? 2.5 : 2}
                    className={unreadCount > 0 && !isOpen ? "animate-pulse" : ""} 
                    fill={unreadCount > 0 ? "currentColor" : "none"}
                />
                {unreadCount > 0 && (
                    <span className="absolute -top-2.5 -right-2.5 min-w-[22px] h-[22px] bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-[3px] border-[#0e3c63] shadow-lg px-1 z-10 transition-transform hover:scale-110">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 flex flex-col max-h-[85vh] animate-scale-in origin-top-left overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-gray-800 text-lg">{t('notifications.title')}</h3>
                            {unreadCount > 0 && <span className="bg-blue-100 text-[#0e3c63] text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-blue-200">{unreadCount} {t('notifications.new')}</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {unreadCount > 0 && (
                                <button 
                                    onClick={handleMarkAllAsRead} 
                                    className="text-[10px] font-black text-gray-400 hover:text-[#0e3c63] flex items-center gap-1 transition-colors bg-gray-50 hover:bg-blue-50 px-2 py-1.5 rounded-lg border border-transparent shadow-sm"
                                >
                                    <Check size={14} /> {t('notifications.mark_all_read')}
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button 
                                    onClick={handleDeleteAll} 
                                    className="text-[10px] font-black text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors bg-gray-50 hover:bg-red-50 px-2 py-1.5 rounded-lg border border-transparent shadow-sm"
                                >
                                    <Trash2 size={14} /> {t('notifications.delete_all')}
                                </button>
                            )}
                        </div>
                    </div>

                    {isPushNotificationSupported() && pushPermission !== 'granted' && (
                        <div className="p-3 bg-orange-50 border-b border-orange-100">
                            <button
                                type="button"
                                onClick={handleEnablePush}
                                disabled={isEnablingPush || pushPermission === 'denied'}
                                className="w-full min-h-11 px-4 rounded-xl bg-white text-orange-700 border border-orange-100 hover:bg-orange-600 hover:text-white hover:border-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all font-black text-xs flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Smartphone size={16} />
                                {pushPermission === 'denied'
                                    ? 'الإشعارات مقفلة من إعدادات المتصفح'
                                    : isEnablingPush
                                        ? 'جاري التفعيل...'
                                        : 'تفعيل إشعارات الموبايل والخلفية'}
                            </button>
                        </div>
                    )}
                    
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <Bell size={28} className="text-gray-300" />
                                </div>
                                <p className="font-bold text-gray-500 text-sm">{t('notifications.no_notifications')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(notif => {
                                    let translatedTitle = notif.title;
                                    let translatedMessage = notif.message;
                                    
                                    if (notif.title === 'طلب جديد') {
                                        translatedTitle = t('notifications.new_order_title', 'طلب جديد');
                                    } else if (notif.title === 'تحديث حالة الطلب') {
                                        translatedTitle = t('notifications.status_update_title', 'تحديث حالة الطلب');
                                    } else if (notif.title === 'قيد التحضير') {
                                        translatedTitle = t('notifications.in_production', 'قيد التحضير');
                                    } else if (notif.title === 'تم التجهيز') {
                                        translatedTitle = t('notifications.completed', 'تم التجهيز');
                                    } else {
                                        translatedTitle = t(notif.title, notif.title);
                                    }
                                    
                                    const newOrderMatch = notif.message.match(/تم تقديم طلب جديد #(\d+) من قبل (.+)/);
                                    const statusMatch = notif.message.match(/تم تغيير حالة طلبك #(\d+) إلى: (.+)/);
                                    
                                    if (newOrderMatch) {
                                        translatedMessage = t('notifications.new_order_msg', { orderId: newOrderMatch[1], agentName: newOrderMatch[2], defaultValue: notif.message });
                                    } else if (statusMatch) {
                                        // Some statuses are keys or direct arabic values. Just attempt to translate text or use it directly.
                                        const statusArabic = statusMatch[2].trim();
                                        // Attempt to find translation or fallback
                                        let trStatus = statusArabic;
                                        if (statusArabic === 'قيد الانتظار') { trStatus = t('status.working', statusArabic) || t('batch4.k287', statusArabic); }
                                        else if (statusArabic === 'في التصنيع') trStatus = t('status.working', statusArabic);
                                        else if (statusArabic === 'اكتمل') trStatus = t('status.completed', statusArabic);
                                        else if (statusArabic === 'مرفوض') trStatus = t('status.rejected', statusArabic);
                                        else trStatus = t(statusArabic, statusArabic); 
                                        
                                        translatedMessage = t('notifications.status_change_msg', { orderId: statusMatch[1], status: trStatus, defaultValue: notif.message });
                                    } else {
                                        translatedMessage = t(notif.message, notif.message);
                                    }

                                    return (
                                    <div 
                                        key={notif.id} 
                                        className={`p-4 transition-all hover:bg-blue-50/50 flex gap-3 cursor-pointer group ${!notif.isRead ? 'bg-blue-50/20' : ''}`}
                                        onClick={() => handleMarkAsRead(notif.id)}
                                    >
                                        <div className="shrink-0 pt-0.5">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-black truncate w-full ${!notif.isRead ? 'text-[#0e3c63]' : 'text-gray-700'}`}>{translatedTitle}</h4>
                                                {!notif.isRead && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1.5 ml-1 shadow-sm border border-white"></span>}
                                            </div>
                                            {notif.imageUrl && (
                                                <div className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                                                    <img src={notif.imageUrl} alt={translatedTitle} className="w-full max-h-40 object-cover" />
                                                </div>
                                            )}
                                            <p className={`text-xs leading-relaxed mb-2 font-bold ${!notif.isRead ? 'text-gray-700' : 'text-gray-500'}`}>{translatedMessage}</p>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                                                    <Clock size={12} />
                                                    <span>{formatTimestamp(notif.createdAt)}</span>
                                                </div>
                                                {notif.actionUrl && (
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleMarkAsRead(notif.id);
                                                            window.open(notif.actionUrl, '_blank', 'noopener,noreferrer');
                                                        }}
                                                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e3c63] text-white text-[10px] font-black hover:bg-[#1a4d7a] transition-all"
                                                    >
                                                        <ExternalLink size={12} />
                                                        {notif.actionLabel || 'فتح الرابط'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
