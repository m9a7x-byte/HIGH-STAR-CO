import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import React, { useState, useEffect } from 'react';
import { UserPlus, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Sparkles, Mail } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { FloatingLanguageSwitcher } from '../components/shared/FloatingLanguageSwitcher';
import { supabase } from '../lib/supabase';

interface AcceptInvitePageProps {
    onSuccess: () => void;
    onError?: (error: string) => void;
}

export const AcceptInvitePage: React.FC<AcceptInvitePageProps> = ({ onSuccess, onError }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const verifyInvite = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (data.session?.user?.email) {
                    setUserEmail(data.session.user.email);
                    setVerifying(false);
                } else {
                    throw new Error('رابط الدعوة غير صالح أو منتهي الصلاحية');
                }
            } catch (err: any) {
                setError(err.message || 'فشل التحقق من الدعوة');
                setVerifying(false);
            }
        };

        verifyInvite();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 رموز على الأقل');
            return;
        }

        if (password !== confirmPassword) {
            setError('كلمتي المرور غير متطابقتين');
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'فشل إعداد كلمة المرور');
        } finally {
            setIsLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0e3c63] to-slate-900 p-4" dir="rtl">
            <FloatingLanguageSwitcher />
                <div className="text-center text-white">
                    <Loader2 size={48} className="animate-spin mx-auto mb-4" />
                    <p className="font-bold">{t('batch4.k852')}</p>
                </div>
            </div>
        );
    }

    if (error && !userEmail) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0e3c63] to-slate-900 p-4" dir="rtl">
                <Card className="p-10 shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-[2.5rem] max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={36} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">{t('batch4.k853')}</h2>
                    <p className="text-gray-500 text-sm font-bold mb-6">{error}</p>
                    <Button
                        onClick={() => window.location.href = '/'}
                        className="w-full h-14 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white font-black rounded-2xl"
                    >
                        العودة للصفحة الرئيسية
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0e3c63] to-slate-900 p-4" dir="rtl">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <Card className="p-10 shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
                            <UserPlus size={36} />
                        </div>

                        <h2 className="text-2xl font-black text-gray-800 mb-2">{t('batch4.k854')}</h2>
                        <p className="text-gray-500 text-sm font-bold">{t('batch4.k855')}</p>

                        {/* Email Badge */}
                        <div className="mt-4 inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                            <Mail size={16} className="text-gray-400" />
                            <span className="text-sm font-bold text-gray-600">{userEmail}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mr-1">
                                كلمة المرور الجديدة
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 pr-12 font-bold focus:bg-white focus:border-[#0e3c63] outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mr-1">
                                تأكيد كلمة المرور
                            </label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-[#0e3c63] outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-lg font-black rounded-2xl shadow-xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={24} className="animate-spin" />
                                    جاري الإعداد...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={24} />
                                    إكمال التسجيل
                                </>
                            )}
                        </Button>
                    </form>
                </Card>

                {/* Footer */}
                <p className="text-center text-white/40 text-xs font-bold mt-6">
                    VOGA System © 2026
                </p>
            </div>
        </div>
    );
};
