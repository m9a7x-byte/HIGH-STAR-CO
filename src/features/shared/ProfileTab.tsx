import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import React, { useState } from 'react';
import { Save, User, Mail, Lock, Camera, Phone, Key, Shield, AlertTriangle, Edit3, X, Fingerprint, Globe, ShieldCheck, Bell, BellOff, Smartphone } from 'lucide-react';
import { AvatarUploader } from '../../components/profile/AvatarUploader';
import { supabase } from '../../lib/supabase';
import { Card, Button, Input } from '../../components/ui';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { useToast } from '../../context/ToastContext';
import {
    disablePushNotifications,
    enablePushNotifications,
    getPushSubscriptionStatus
} from '../../lib/pushNotifications';

import { MapPin, ChevronDown, Check, Search } from 'lucide-react';
import { PROVINCES_IRAQ } from '../../lib/constants';
import { useRef, useEffect } from 'react';

const OTP_LENGTH = 8;

// --- MODERN PROVINCE SELECTOR WITH SEARCH ---
const ModernProvinceSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = PROVINCES_IRAQ.filter(p => p.includes(search));

    return (
        <div className="relative w-full z-50 isolate" ref={containerRef}>
            <label className="block text-xs font-black text-gray-500 mr-1">{t('batch4.k252')}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-14 flex items-center justify-between px-5 bg-gray-50 border-2 rounded-2xl transition-all duration-300 ${isOpen ? 'border-[#0e3c63] ring-4 ring-blue-50 shadow-lg bg-white' : 'border-gray-100 hover:border-blue-200'}`}
            >
                <div className="flex items-center gap-3">
                    <MapPin size={18} className={isOpen ? 'text-[#0e3c63]' : 'text-gray-400'} />
                    <span className={`font-bold text-sm ${value ? 'text-gray-800' : 'text-gray-400'}`}>{value || t('profile_tab.choose_province')}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <input
                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-[#0e3c63]"
                                placeholder={t('batch4.k253')}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                        {filtered.map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => { onChange(p); setIsOpen(false); setSearch(''); }}
                                className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-all ${value === p ? 'bg-blue-50 text-[#0e3c63]' : 'hover:bg-gray-50 text-gray-600'}`}
                            >
                                {p}
                                {value === p && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface ProfileTabProps {
    onBack?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ onBack }) => {
    const { user, updateUser } = useAuth();
    const { toast: _toast } = useToast(); // Prevent lint usage
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Explicit Toggles for Security Fields
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [pendingEmailChange, setPendingEmailChange] = useState<{ currentEmail: string; newEmail: string } | null>(null);
    const [emailChangeCode, setEmailChangeCode] = useState('');
    const [isVerifyingEmailCode, setIsVerifyingEmailCode] = useState(false);
    const [pushStatus, setPushStatus] = useState({ supported: false, permission: 'unsupported', subscribed: false });
    const [isUpdatingPush, setIsUpdatingPush] = useState(false);

    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        imageUrl: user?.imageUrl || '',
        phone: user?.phone || user?.agentDetails?.phone || '',
        province: user?.province || user?.agentDetails?.province || '',
        address: user?.address || user?.agentDetails?.address || '',
        // Password fields
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const refreshPushStatus = async () => {
        const status = await getPushSubscriptionStatus();
        setPushStatus(status);
    };

    useEffect(() => {
        refreshPushStatus();
    }, []);

    const handleEnablePushNotifications = async () => {
        if (!user) return;

        setIsUpdatingPush(true);
        try {
            await enablePushNotifications(user);
            await refreshPushStatus();
            toast.success('تم تفعيل إشعارات الجهاز', 'راح توصلك الإشعارات على هذا الجهاز حتى إذا التطبيق بالخلفية.', { force: true });
        } catch (error: any) {
            await refreshPushStatus();
            toast.error('فشل تفعيل الإشعارات', error.message || 'تأكد من صلاحيات المتصفح.', { force: true });
        } finally {
            setIsUpdatingPush(false);
        }
    };

    const handleDisablePushNotifications = async () => {
        setIsUpdatingPush(true);
        try {
            await disablePushNotifications();
            await refreshPushStatus();
            toast.info('تم تعطيل إشعارات الجهاز', 'هذا الجهاز بعد ما راح يستلم إشعارات بالخلفية.', { force: true });
        } catch (error: any) {
            toast.error('فشل تعطيل الإشعارات', error.message || 'حاول مرة ثانية.', { force: true });
        } finally {
            setIsUpdatingPush(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Security Validations
        if (isEditingPassword) {
            if (!formData.newPassword) {
                toast.error(t('batch4.k774'), t('batch4.k775'));
                return;
            }
            if (formData.newPassword !== formData.confirmPassword) {
                toast.error(t('batch4.k528'), t('batch4.k776'));
                return;
            }
            if (!formData.currentPassword) {
                toast.error(t('batch4.k777'), t('batch4.k778'));
                return;
            }
        }

        // If changing email, current password might be good practice too, but let's stick to password change for now.
        // Actually, for email change, Supabase might not strictly require password if we use the implicit flow, 
        // but it's good for our custom check in db.ts if we wanted. 
        // For now, only enforce currentPassword if isEditingPassword is true OR if we decide to enforce it for email too.

        setIsLoading(true);
        try {
            // Prepare update object. 
            // We only send email/password if the user EXPLICITLY unlocked them.
            const updatePayload: any = {
                fullName: formData.fullName,
                phone: formData.phone,
                province: formData.province,
                address: formData.address
                // We do NOT send imageUrl here because we use avatar_path for the new system.
                // Sending empty string might not hurt if backend ignores it, but let's be clean.
            };

            if (isEditingEmail && formData.email !== user?.email) {
                updatePayload.email = formData.email;
            }

            if (isEditingPassword) {
                updatePayload.password = formData.newPassword;
                updatePayload.currentPassword = formData.currentPassword;
            }

            const result: any = await db.updateProfile(user!.id, updatePayload);

            // Check result type
            const updatedUser = result.user || result;
            const isPending = result.confirmationPending;

            if (updatedUser) {
                updateUser(updatedUser);

                if (isPending) {
                    setPendingEmailChange({
                        currentEmail: user?.email || '',
                        newEmail: formData.email
                    });
                    setEmailChangeCode('');
                    toast.info(t('profile_tab.confirmation_sent'), `${t('profile_tab.check_email')} (${formData.email})`, { force: true });
                } else if (isEditingPassword) {
                    toast.success(t('profile_tab.password_changed'), t('profile_tab.password_updated'), { force: true });
                } else {
                    toast.success(t('profile_tab.updated'), t('profile_tab.changes_saved'), { force: true });
                }

                // Reset Security Fields
                setIsEditingPassword(false);
                setIsEditingEmail(false);
                setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                }));
            }
        } catch (error: any) {
            toast.error(t('profile_tab.update_failed'), error.message, { force: true });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyEmailChangeCode = async () => {
        if (!pendingEmailChange || emailChangeCode.length !== OTP_LENGTH) return;

        setIsVerifyingEmailCode(true);
        try {
            const result = await db.verifyEmailChangeCode(
                pendingEmailChange.currentEmail,
                pendingEmailChange.newEmail,
                emailChangeCode
            );

            if (result.completed) {
                const updatedUser = db.users.find(u => u.id === user?.id);
                if (updatedUser) updateUser(updatedUser);
                setPendingEmailChange(null);
                setEmailChangeCode('');
                toast.success('تم تأكيد البريد', 'تم تغيير البريد الإلكتروني بنجاح', { force: true });
            } else {
                setEmailChangeCode('');
                toast.info('تم قبول الكود', 'إذا وصلك كود ثاني على البريد الآخر، أدخله هنا لإكمال التغيير', { force: true });
            }
        } catch (error: any) {
            toast.error('فشل تأكيد البريد', error.message, { force: true });
        } finally {
            setIsVerifyingEmailCode(false);
        }
    };

    const handleAvatarUploadSuccess = async (path: string) => {
        try {
            // Update profile in DB with the new path
            await supabase.from('profiles').update({ avatar_path: path }).eq('id', user!.id);

            // Update local state
            const updatedUser = { ...user, avatar_path: path };
            updateUser(updatedUser as any);

            // Refresh global DB state for other tabs (Staff, etc.)
            await db.fetchUsers();

            // Clear legacy URL if needed
            setFormData(prev => ({ ...prev, imageUrl: '' }));

        } catch (error) {
            console.error('Failed to update profile avatar path', error);
            toast.error(t('batch4.k528'), t('batch4.k779'));
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in" dir="rtl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 mb-2">{t('batch4.k780')}</h1>
                    <p className="text-gray-500 font-bold">{t('batch4.k781')}</p>
                </div>
                {onBack && (
                    <button onClick={onBack} className="text-gray-400 hover:text-gray-600 font-bold transition-colors">{t('profile_tab.close')}</button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Side: Avatar & Preview */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a]"></div>
                        <div className="relative z-10 pt-4">

                            <AvatarUploader
                                userName={user?.fullName || 'User'}
                                currentAvatarPath={user?.avatar_path}
                                currentAvatarUrl={user?.imageUrl}
                                onUploadSuccess={handleAvatarUploadSuccess}
                            />

                            <h3 className="mt-6 font-black text-xl text-gray-800">{formData.fullName}</h3>
                            <p className="text-gray-400 text-xs font-mono mt-1">{formData.email}</p>
                        </div>

                        {/* Status Badges */}
                        <div className="mt-8 pt-6 border-t border-gray-50 text-right space-y-4">
                            <div className="flex items-center gap-3 text-gray-500">
                                <Fingerprint size={16} className="text-[#0e3c63] opacity-40" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-gray-400">{t('batch4.k782')}</span>
                                    <span className="text-xs font-mono font-bold tracking-widest">
                                        {user?.role === 'AGENT' ? 'AGT' : 'USR'}-{String(user?.id).split('-')[0].toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                                <Globe size={16} className="text-[#0e3c63] opacity-40" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-gray-400">{t('batch4.k783')}</span>
                                    <span className="text-xs font-bold">{t('batch4.k784')}</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex gap-4">
                        <ShieldCheck size={24} className="text-blue-500 shrink-0 mt-1" />
                        <p className="text-[11px] text-blue-800 font-bold leading-relaxed">
                            {t('profile_tab.email_warning')}
                        </p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Public Info Card */}
                        <Card className="p-8 border-t-4 border-[#0e3c63] shadow-lg overflow-visible">
                            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                                <User className="text-[#0e3c63]" size={24} /> {t("profile_tab.personal_info")}
                            </h3>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 mr-1">{t('batch4.k563')}</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-[#0e3c63] outline-none transition-all shadow-inner"
                                        />
                                        <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 mr-1">{t('batch4.k283')}</label>
                                    <PhoneInput
                                        value={formData.phone}
                                        onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))}
                                        placeholder="7xxxxxxxxx"
                                    />
                                </div>

                                {/* Agent-Specific Fields */}
                                {user?.role === 'AGENT' && (
                                    <>
                                        <div className="space-y-2">
                                            <ModernProvinceSelector
                                                value={formData.province}
                                                onChange={(val) => setFormData(prev => ({ ...prev, province: val }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black text-gray-500 mr-1">{t('batch4.k284')}</label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                                className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-[#0e3c63] outline-none transition-all shadow-inner text-sm"
                                                placeholder={t('batch4.k285')}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </Card>

                        {/* Security Card */}
                        <Card className="p-8 border-t-4 border-amber-500 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-50 rounded-full blur-[50px] -ml-16 -mt-16 opacity-50"></div>

                            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2 relative z-10">
                                <Shield className="text-amber-500" size={24} /> {t("profile_tab.account_security")}
                            </h3>

                            <div className="space-y-8 relative z-10">
                                {/* Email */}
                                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                <Mail size={18} className="text-gray-400" /> {t("profile_tab.email")}
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-1 font-bold">{t('batch4.k570')}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setIsEditingEmail(!isEditingEmail);
                                                if (isEditingEmail) setFormData(prev => ({ ...prev, email: user?.email || '' }));
                                            }}
                                            className={`rounded-xl px-4 h-10 font-bold border-2 ${isEditingEmail ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-gray-600 border-gray-200'}`}
                                        >
                                            {isEditingEmail ? <><X size={16} />{t('batch4.k156')}</> : <><Edit3 size={16} />{t('batch4.k138')}</>}
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={formData.email}
                                            disabled={!isEditingEmail}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className={`w-full h-14 rounded-2xl px-5 font-bold outline-none transition-all font-mono
                                                    ${isEditingEmail
                                                    ? 'bg-white border-2 border-amber-400 text-gray-800 shadow-lg scale-[1.01]'
                                                    : 'bg-gray-100 border-2 border-transparent text-gray-500 cursor-not-allowed opacity-70'
                                                }`}
                                        />
                                        {isEditingEmail && (
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                                <AlertTriangle size={12} /> {t("profile_tab.requires_confirmation")}
                                            </div>
                                        )}
                                    </div>

                                    {pendingEmailChange && (
                                        <div className="mt-5 bg-cyan-50 border border-cyan-100 rounded-2xl p-5 space-y-4">
                                            <div>
                                                <p className="text-sm font-black text-cyan-900">تأكيد تغيير البريد</p>
                                                <p className="text-xs text-cyan-700 font-bold mt-1">
                                                    أدخل الكود المرسل إلى {pendingEmailChange.newEmail}. إذا وصلك كود ثاني على البريد الحالي، أدخله بعد قبول الأول.
                                                </p>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    maxLength={OTP_LENGTH}
                                                    value={emailChangeCode}
                                                    onChange={e => setEmailChangeCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                                                    className="h-14 flex-1 bg-white border-2 border-cyan-100 rounded-2xl px-5 text-center font-black text-2xl tracking-[0.2em] focus:border-cyan-500 outline-none transition-all"
                                                    placeholder="OTP"
                                                    dir="ltr"
                                                />
                                                <Button
                                                    type="button"
                                                    disabled={isVerifyingEmailCode || emailChangeCode.length !== OTP_LENGTH}
                                                    onClick={handleVerifyEmailChangeCode}
                                                    className="h-14 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-2xl"
                                                >
                                                    {isVerifyingEmailCode ? 'جاري التحقق...' : 'تأكيد الكود'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Password */}
                                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                <Key size={18} className="text-gray-400" /> {t("profile_tab.password")}
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-1 font-bold">{t('batch4.k785')}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setIsEditingPassword(!isEditingPassword);
                                                if (isEditingPassword) setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
                                            }}
                                            className={`rounded-xl px-4 h-10 font-bold border-2 ${isEditingPassword ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-gray-600 border-gray-200'}`}
                                        >
                                            {isEditingPassword ? <><X size={16} />{t('batch4.k156')}</> : <><Edit3 size={16} />{t('batch4.k138')}</>}
                                        </Button>
                                    </div>

                                    {isEditingPassword && (
                                        <div className="space-y-5 animate-slide-down">
                                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-4">
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-black text-amber-800 mr-1">{t('batch4.k786')}</label>
                                                    <div className="relative">
                                                        <input
                                                            type="password"
                                                            value={formData.currentPassword}
                                                            onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                                                            className="w-full h-12 bg-white border-2 border-amber-200 rounded-xl px-4 font-bold focus:border-amber-500 outline-none transition-all"
                                                            placeholder="********"
                                                        />
                                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-300" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-black text-gray-500 mr-1">{t('batch4.k574')}</label>
                                                    <div className="relative">
                                                        <input
                                                            type="password"
                                                            value={formData.newPassword}
                                                            onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                                            className="w-full h-12 bg-white border-2 border-gray-200 rounded-xl px-4 font-bold focus:border-[#0e3c63] outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-black text-gray-500 mr-1">{t('batch4.k572')}</label>
                                                    <div className="relative">
                                                        <input
                                                            type="password"
                                                            value={formData.confirmPassword}
                                                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                            className="w-full h-12 bg-white border-2 border-gray-200 rounded-xl px-4 font-bold focus:border-[#0e3c63] outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {!isEditingPassword && (
                                        <div className="flex items-center gap-2 text-gray-400 bg-gray-100 p-3 rounded-xl select-none">
                                            <span className="text-xl leading-none mt-2">••••••••••••••</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 border-t-4 border-emerald-500 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-50 rounded-full blur-[50px] -ml-16 -mt-16 opacity-60"></div>

                            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${pushStatus.subscribed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {pushStatus.subscribed ? <Bell size={26} /> : <BellOff size={26} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-800 mb-2 flex items-center gap-2">
                                            إشعارات هذا الجهاز
                                        </h3>
                                        <p className="text-sm text-gray-500 font-bold leading-relaxed">
                                            فعّلها حتى توصلك الإشعارات على الموبايل أو الحاسبة حتى إذا التطبيق بالخلفية.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className={`px-3 py-1.5 rounded-xl text-[11px] font-black border ${pushStatus.supported ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                                {pushStatus.supported ? 'الجهاز يدعم إشعارات الخلفية' : 'هذا الجهاز لا يدعم إشعارات الخلفية'}
                                            </span>
                                            <span className={`px-3 py-1.5 rounded-xl text-[11px] font-black border ${pushStatus.subscribed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {pushStatus.subscribed ? 'مفعلة لهذا الجهاز' : 'غير مفعلة لهذا الجهاز'}
                                            </span>
                                            {pushStatus.permission === 'denied' && (
                                                <span className="px-3 py-1.5 rounded-xl text-[11px] font-black border bg-red-50 text-red-700 border-red-100">
                                                    الصلاحية مقفلة من إعدادات المتصفح
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 md:w-52">
                                    {pushStatus.subscribed ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={isUpdatingPush}
                                            onClick={handleDisablePushNotifications}
                                            className="h-12 rounded-2xl border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-black"
                                        >
                                            <BellOff size={18} />
                                            {isUpdatingPush ? 'جاري التعطيل...' : 'تعطيل الإشعارات'}
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            disabled={isUpdatingPush || !pushStatus.supported || pushStatus.permission === 'denied'}
                                            onClick={handleEnablePushNotifications}
                                            className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                                        >
                                            <Smartphone size={18} />
                                            {isUpdatingPush ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}
                                        </Button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={refreshPushStatus}
                                        className="h-10 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 font-black text-xs transition-all"
                                    >
                                        تحديث الحالة
                                    </button>
                                </div>
                            </div>
                        </Card>




                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white text-xl font-black rounded-2xl shadow-2xl transition-transform active:scale-[0.99] flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t('batch4.k787')}</span>
                                </>
                            ) : (
                                <><Save size={24} />{t('batch4.k788')}</>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
