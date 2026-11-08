import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mail, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { db } from '../lib/db';
import { FloatingLanguageSwitcher } from '../components/shared/FloatingLanguageSwitcher';

const OTP_LENGTH = 8;

interface ForgotPasswordPageProps {
    onBack: () => void;
    onVerified?: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBack, onVerified }) => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'email' | 'code'>('email');
    const [error, setError] = useState('');
    const { t } = useTranslation();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await db.sendPasswordResetCode(email.trim());
            setStep('code');
        } catch (err: any) {
            setError(err.message || t('auth.error_sending_email'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await db.verifyPasswordResetCode(email.trim(), code.trim());
            onVerified?.();
        } catch (err: any) {
            setError(err.message || 'الكود غير صحيح');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
            <FloatingLanguageSwitcher />
            <div className="w-full max-w-md">
                <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-500 font-bold hover:text-gray-800 transition-colors">
                    <ArrowRight size={18} /> {t('auth.return')}
                </button>

                <Card className="p-8 shadow-xl border-t-4 border-[#0e3c63]">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-[#0e3c63] rounded-full flex items-center justify-center mx-auto mb-4">
                            {step === 'email' ? <Mail size={32} /> : <KeyRound size={32} />}
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">
                            {step === 'email' ? t('auth.forgot_password_title') : 'أدخل كود التحقق'}
                        </h2>
                        <p className="text-gray-500 text-sm mt-2 font-bold">
                            {step === 'email'
                                ? 'أدخل بريدك الإلكتروني وسنرسل لك كود استعادة كلمة المرور'
                                : `أرسلنا كود التحقق إلى ${email}`}
                        </p>
                    </div>

                    {step === 'email' ? (
                        <form onSubmit={handleSendCode} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-bold">
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-500 mr-1">{t('auth.email')}</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-[#0e3c63] outline-none transition-all text-sm"
                                        placeholder="name@company.com"
                                    />
                                    <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white text-lg font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                            >
                                {isLoading ? t('common.sending') : 'إرسال كود التحقق'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3">
                                <CheckCircle size={22} className="shrink-0" />
                                <p className="text-sm font-bold">افتح بريدك الإلكتروني وانسخ كود التحقق المكون من 8 أرقام.</p>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-bold">
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-500 mr-1">كود التحقق</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    required
                                    maxLength={OTP_LENGTH}
                                    value={code}
                                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                                    className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 text-center font-black text-2xl tracking-[0.2em] focus:bg-white focus:border-[#0e3c63] outline-none transition-all"
                                    placeholder="OTP"
                                    dir="ltr"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading || code.length !== OTP_LENGTH}
                                className="w-full h-14 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white text-lg font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                            >
                                {isLoading ? 'جاري التحقق...' : 'تأكيد الكود'}
                            </Button>

                            <button
                                type="button"
                                onClick={() => {
                                    setStep('email');
                                    setCode('');
                                    setError('');
                                }}
                                className="w-full text-sm font-bold text-gray-500 hover:text-[#0e3c63] transition-colors"
                            >
                                تغيير البريد الإلكتروني
                            </button>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};
