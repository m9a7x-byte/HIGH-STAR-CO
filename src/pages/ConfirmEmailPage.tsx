import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { FloatingLanguageSwitcher } from '../components/shared/FloatingLanguageSwitcher';
import { supabase } from '../lib/supabase';

interface ConfirmEmailPageProps {
    onSuccess: () => void;
    onError?: (error: string) => void;
}

export const ConfirmEmailPage: React.FC<ConfirmEmailPageProps> = ({ onSuccess, onError }) => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const confirmEmail = async () => {
            try {
                // Supabase handles the token verification automatically via URL hash
                const { data, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (data.session) {
                    setStatus('success');
                    setMessage('تم تأكيد بريدك الإلكتروني بنجاح!');
                    setTimeout(() => onSuccess(), 2000);
                } else {
                    throw new Error('لم يتم التحقق من الجلسة');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'فشل تأكيد البريد الإلكتروني');
                onError?.(err.message);
            }
        };

        confirmEmail();
    }, [onSuccess, onError]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0e3c63] to-slate-900 p-4" dir="rtl">
            <FloatingLanguageSwitcher />
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <Card className="p-10 shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl transition-all duration-500 ${status === 'loading' ? 'bg-blue-50 text-blue-500' :
                            status === 'success' ? 'bg-emerald-50 text-emerald-500' :
                                'bg-red-50 text-red-500'
                            }`}>
                            {status === 'loading' && <Loader2 size={36} className="animate-spin" />}
                            {status === 'success' && <CheckCircle size={36} />}
                            {status === 'error' && <AlertCircle size={36} />}
                        </div>

                        <h2 className="text-2xl font-black text-gray-800 mb-2">
                            {status === 'loading' && 'جاري التحقق...'}
                            {status === 'success' && 'تم التأكيد!'}
                            {status === 'error' && 'فشل التأكيد'}
                        </h2>

                        <p className="text-gray-500 text-sm font-bold">
                            {status === 'loading' && 'يرجى الانتظار بينما نتحقق من بريدك الإلكتروني'}
                            {status === 'success' && message}
                            {status === 'error' && message}
                        </p>
                    </div>

                    {/* Success Animation */}
                    {status === 'success' && (
                        <div className="flex items-center justify-center gap-2 text-emerald-500 animate-pulse">
                            <Sparkles size={20} />
                            <span className="text-sm font-bold">{t('batch4.k859')}</span>
                        </div>
                    )}

                    {/* Error Retry */}
                    {status === 'error' && (
                        <Button
                            onClick={() => window.location.href = '/'}
                            className="w-full h-14 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white text-lg font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                        >
                            العودة للصفحة الرئيسية
                        </Button>
                    )}
                </Card>

                {/* Footer */}
                <p className="text-center text-white/40 text-xs font-bold mt-6">
                    VOGA System © 2026
                </p>
            </div>
        </div>
    );
};
