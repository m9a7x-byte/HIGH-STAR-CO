import React, { useState } from 'react';
import { ArrowRight, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { db } from '../lib/db';

interface ForgotPasswordPageProps {
    onBack: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await db.sendPasswordResetEmail(email);
            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء إرسال البريد');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
            <div className="w-full max-w-md">
                <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-500 font-bold hover:text-gray-800 transition-colors">
                    <ArrowRight size={18} /> العودة
                </button>

                <Card className="p-8 shadow-xl border-t-4 border-[#0e3c63]">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-[#0e3c63] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">نسيت كلمة المرور؟</h2>
                        <p className="text-gray-500 text-sm mt-2 font-bold">أدخل بريدك الإلكتروني لاستعادة الوصول لحسابك</p>
                    </div>

                    {isSuccess ? (
                        <div className="text-center space-y-6">
                            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3">
                                <CheckCircle size={24} className="shrink-0" />
                                <p className="text-sm font-bold">تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد (أو Spam).</p>
                            </div>
                            <Button onClick={onBack} className="w-full h-14 bg-[#0e3c63] text-white hover:bg-[#1a4d7a] font-black rounded-xl shadow-lg transition-all">
                                العودة لتسجيل الدخول
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-bold">
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-500 mr-1">البريد الإلكتروني</label>
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
                                {isLoading ? 'جاري الإرسال...' : 'إرسال رابط التعيين'}
                            </Button>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};
