import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { supabase } from '../lib/supabase';

interface ConfirmEmailChangePageProps {
    onSuccess: () => void;
    onError?: (error: string) => void;
}

export const ConfirmEmailChangePage: React.FC<ConfirmEmailChangePageProps> = ({ onSuccess, onError }) => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [oldEmail, setOldEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');

    useEffect(() => {
        const confirmEmailChange = async () => {
            try {
                // Supabase handles the token verification automatically via URL hash
                const { data, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (data.session) {
                    // Get the new email from session
                    setNewEmail(data.session.user?.email || '');

                    // Try to get old email from user metadata if available
                    const metadata = data.session.user?.user_metadata;
                    if (metadata?.old_email) {
                        setOldEmail(metadata.old_email);
                    }

                    setStatus('success');
                    setMessage('تم تأكيد تغيير البريد الإلكتروني بنجاح!');
                    setTimeout(() => onSuccess(), 3000);
                } else {
                    throw new Error('رابط التأكيد غير صالح أو منتهي الصلاحية');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'فشل تأكيد تغيير البريد الإلكتروني');
                onError?.(err.message);
            }
        };

        confirmEmailChange();
    }, [onSuccess, onError]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0e3c63] to-slate-900 p-4" dir="rtl">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <Card className="p-10 shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl transition-all duration-500 ${status === 'loading' ? 'bg-gradient-to-br from-blue-400 to-cyan-500' :
                            status === 'success' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                                'bg-gradient-to-br from-red-400 to-red-600'
                            }`}>
                            {status === 'loading' && <RefreshCw size={36} className="text-white animate-spin" />}
                            {status === 'success' && <CheckCircle size={36} className="text-white" />}
                            {status === 'error' && <AlertCircle size={36} className="text-white" />}
                        </div>

                        <h2 className="text-2xl font-black text-gray-800 mb-2">
                            {status === 'loading' && 'جاري التحقق...'}
                            {status === 'success' && 'تم التغيير بنجاح!'}
                            {status === 'error' && 'فشل التأكيد'}
                        </h2>

                        <p className="text-gray-500 text-sm font-bold">
                            {status === 'loading' && 'يرجى الانتظار بينما نؤكد تغيير بريدك الإلكتروني'}
                            {status === 'success' && message}
                            {status === 'error' && message}
                        </p>
                    </div>

                    {/* Success State - Email Change Visualization */}
                    {status === 'success' && (
                        <div className="space-y-6">
                            {/* Email Transition */}
                            <div className="bg-gradient-to-r from-gray-50 to-emerald-50 p-6 rounded-2xl">
                                <div className="flex items-center justify-center gap-4 flex-wrap">
                                    {oldEmail && (
                                        <>
                                            <div className="text-center">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">البريد القديم</p>
                                                <p className="text-gray-500 font-bold text-sm line-through">{oldEmail}</p>
                                            </div>
                                            <ArrowRight size={20} className="text-emerald-500" />
                                        </>
                                    )}
                                    <div className="text-center">
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">البريد الجديد</p>
                                        <p className="text-emerald-700 font-black">{newEmail}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-emerald-500 animate-pulse">
                                <Sparkles size={20} />
                                <span className="text-sm font-bold">جاري توجيهك...</span>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {status === 'error' && (
                        <div className="space-y-4">
                            <p className="text-center text-gray-500 text-sm">
                                قد يكون رابط التأكيد منتهي الصلاحية أو تم استخدامه مسبقاً
                            </p>
                            <Button
                                onClick={() => window.location.href = '/'}
                                className="w-full h-14 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white text-lg font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                            >
                                العودة للصفحة الرئيسية
                            </Button>
                        </div>
                    )}

                    {/* Loading State */}
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-4">
                            <Mail size={48} className="text-blue-300 animate-bounce" />
                            <p className="text-xs text-gray-400 font-bold">جاري التحقق من الرابط...</p>
                        </div>
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
