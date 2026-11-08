import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import React, { useState, useEffect } from 'react';
import { Wand2, CheckCircle, AlertCircle, Loader2, Sparkles, Shield } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { FloatingLanguageSwitcher } from '../components/shared/FloatingLanguageSwitcher';
import { supabase } from '../lib/supabase';

interface MagicLinkPageProps {
    onSuccess: () => void;
    onError?: (error: string) => void;
}

export const MagicLinkPage: React.FC<MagicLinkPageProps> = ({ onSuccess, onError }) => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const verifyMagicLink = async () => {
            try {
                // Supabase handles the token verification automatically via URL hash
                const { data, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (data.session) {
                    setUserEmail(data.session.user?.email || '');
                    setStatus('success');
                    setMessage('تم تسجيل الدخول بنجاح!');
                    setTimeout(() => onSuccess(), 2500);
                } else {
                    throw new Error('الرابط السحري غير صالح أو منتهي الصلاحية');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'فشل تسجيل الدخول بالرابط السحري');
                onError?.(err.message);
            }
        };

        verifyMagicLink();
    }, [onSuccess, onError]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4" dir="rtl">
            <FloatingLanguageSwitcher />
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <Card className="p-10 shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl transition-all duration-700 ${status === 'loading' ? 'bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse' :
                            status === 'success' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                                'bg-gradient-to-br from-red-400 to-red-600'
                            }`}>
                            {status === 'loading' && <Wand2 size={42} className="text-white animate-bounce" />}
                            {status === 'success' && <CheckCircle size={42} className="text-white" />}
                            {status === 'error' && <AlertCircle size={42} className="text-white" />}
                        </div>

                        <h2 className="text-2xl font-black text-gray-800 mb-2">
                            {status === 'loading' && 'تسجيل دخول سحري ✨'}
                            {status === 'success' && 'مرحباً بعودتك!'}
                            {status === 'error' && 'رابط غير صالح'}
                        </h2>

                        <p className="text-gray-500 text-sm font-bold">
                            {status === 'loading' && 'جاري التحقق من الرابط السحري...'}
                            {status === 'success' && message}
                            {status === 'error' && message}
                        </p>
                    </div>

                    {/* Loading Animation */}
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <p className="text-xs text-gray-400 font-bold">{t('batch4.k861')}</p>
                        </div>
                    )}

                    {/* Success State */}
                    {status === 'success' && (
                        <div className="space-y-6">
                            {userEmail && (
                                <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                                    <p className="text-xs text-emerald-600 font-bold mb-1">{t('batch4.k862')}</p>
                                    <p className="text-emerald-700 font-black">{userEmail}</p>
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-2 text-emerald-500">
                                <Sparkles size={20} className="animate-pulse" />
                                <span className="text-sm font-bold">{t('batch4.k863')}</span>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                                <Shield size={14} />
                                <span>{t('batch4.k864')}</span>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {status === 'error' && (
                        <div className="space-y-4">
                            <p className="text-center text-gray-500 text-sm">
                                قد يكون الرابط منتهي الصلاحية أو تم استخدامه مسبقاً
                            </p>
                            <Button
                                onClick={() => window.location.href = '/'}
                                className="w-full h-14 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white text-lg font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                            >
                                طلب رابط جديد
                            </Button>
                        </div>
                    )}
                </Card>

                {/* Footer */}
                <p className="text-center text-white/40 text-xs font-bold mt-6">
                    VOGA System © 2026 • Secure Magic Link Login
                </p>
            </div>
        </div>
    );
};
