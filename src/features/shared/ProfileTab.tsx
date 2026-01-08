import React, { useState } from 'react';
import { Save, User, Mail, Lock, Camera, Phone, Key, Shield, AlertTriangle, Edit3, X, Fingerprint, Globe, ShieldCheck } from 'lucide-react';
import { AvatarUploader } from '../../components/profile/AvatarUploader';
import { supabase } from '../../lib/supabase';
import { Card, Button, Input } from '../../components/ui';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { useToast } from '../../context/ToastContext';

import { MapPin, ChevronDown, Check, Search } from 'lucide-react';
import { PROVINCES_IRAQ } from '../../lib/constants';
import { useRef, useEffect } from 'react';

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
            <label className="block text-xs font-black text-gray-500 mr-1">المحافظة</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-14 flex items-center justify-between px-5 bg-gray-50 border-2 rounded-2xl transition-all duration-300 ${isOpen ? 'border-[#0e3c63] ring-4 ring-blue-50 shadow-lg bg-white' : 'border-gray-100 hover:border-blue-200'}`}
            >
                <div className="flex items-center gap-3">
                    <MapPin size={18} className={isOpen ? 'text-[#0e3c63]' : 'text-gray-400'} />
                    <span className={`font-bold text-sm ${value ? 'text-gray-800' : 'text-gray-400'}`}>{value || 'اختر المحافظة...'}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <input
                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-[#0e3c63]"
                                placeholder="بحث عن محافظة..."
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Security Validations
        if (isEditingPassword) {
            if (!formData.newPassword) {
                toast.error('تنبيه', 'يرجى كتابة كلمة المرور الجديدة');
                return;
            }
            if (formData.newPassword !== formData.confirmPassword) {
                toast.error('خطأ', 'كلمات المرور غير متطابقة');
                return;
            }
            if (!formData.currentPassword) {
                toast.error('تنبيه أمني', 'يرجى إدخال كلمة المرور الحالية لتأكيد التغيير');
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
                    toast.info('تم إرسال رابط التأكيد', `يرجى مراجعة البريد (${formData.email}) لتأكيد التغيير.`, { force: true });
                } else if (isEditingPassword) {
                    toast.success('تم تغيير كلمة المرور', 'تم تحديث كلمة المرور الخاصة بك بنجاح', { force: true });
                } else {
                    toast.success('تم التحديث', 'تم حفظ التغييرات بنجاح', { force: true });
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
            toast.error('فشل التحديث', error.message, { force: true });
        } finally {
            setIsLoading(false);
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
            toast.error('خطأ', 'فشل تحديث الرابط في قاعدة البيانات');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in" dir="rtl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 mb-2">الملف الشخصي</h1>
                    <p className="text-gray-500 font-bold">إدارة بيانات حسابك وتفضيلات الأمان</p>
                </div>
                {onBack && (
                    <button onClick={onBack} className="text-gray-400 hover:text-gray-600 font-bold transition-colors">
                        إغلاق
                    </button>
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
                                    <span className="text-[10px] font-black uppercase text-gray-400">رقم التعريف الرقمي</span>
                                    <span className="text-xs font-mono font-bold tracking-widest">
                                        {user?.role === 'AGENT' ? 'AGT' : 'USR'}-{String(user?.id).split('-')[0].toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                                <Globe size={16} className="text-[#0e3c63] opacity-40" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-gray-400">آخر ظهور مسجل</span>
                                    <span className="text-xs font-bold">نشط الآن</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex gap-4">
                        <ShieldCheck size={24} className="text-blue-500 shrink-0 mt-1" />
                        <p className="text-[11px] text-blue-800 font-bold leading-relaxed">
                            تأكد من استخدام بريد إلكتروني صحيح لتتمكن من استعادة حسابك في حال فقدان كلمة المرور.
                        </p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Public Info Card */}
                        <Card className="p-8 border-t-4 border-[#0e3c63] shadow-lg overflow-visible">
                            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                                <User className="text-[#0e3c63]" size={24} /> المعلومات الشخصية
                            </h3>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-500 mr-1">الاسم الكامل</label>
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
                                    <label className="block text-xs font-black text-gray-500 mr-1">رقم الهاتف</label>
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
                                            <label className="block text-xs font-black text-gray-500 mr-1">العنوان التفصيلي</label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                                className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-[#0e3c63] outline-none transition-all shadow-inner text-sm"
                                                placeholder="المنطقة، الشارع، أقرب نقطة دالة..."
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
                                <Shield className="text-amber-500" size={24} /> أمان الحساب
                            </h3>

                            <div className="space-y-8 relative z-10">
                                {/* Email */}
                                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                <Mail size={18} className="text-gray-400" /> البريد الإلكتروني
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-1 font-bold">يستخدم لتسجيل الدخول واستعادة الحساب</p>
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
                                            {isEditingEmail ? <><X size={16} /> إلغاء</> : <><Edit3 size={16} /> تغيير</>}
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
                                                <AlertTriangle size={12} /> سيطلب تأكيداً
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                <Key size={18} className="text-gray-400" /> كلمة المرور
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-1 font-bold">يجب أن تكون قوية وآمنة</p>
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
                                            {isEditingPassword ? <><X size={16} /> إلغاء</> : <><Edit3 size={16} /> تغيير</>}
                                        </Button>
                                    </div>

                                    {isEditingPassword && (
                                        <div className="space-y-5 animate-slide-down">
                                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-4">
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-black text-amber-800 mr-1">كلمة المرور الحالية (للتأكيد)</label>
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
                                                    <label className="block text-xs font-black text-gray-500 mr-1">كلمة المرور الجديدة</label>
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
                                                    <label className="block text-xs font-black text-gray-500 mr-1">تأكيد كلمة المرور</label>
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




                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white text-xl font-black rounded-2xl shadow-2xl transition-transform active:scale-[0.99] flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>جاري الحفظ...</span>
                                </>
                            ) : (
                                <><Save size={24} /> حفظ كافة التغييرات</>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
