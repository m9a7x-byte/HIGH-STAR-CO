import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { db } from '../lib/db';

interface ResetPasswordPageProps {
    onSuccess: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
            await db.updatePassword(password);
            // Success logic handled by parent or toast
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'فشل تحديث كلمة المرور');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
            <div className="w-full max-w-md">
                <Card className="p-8 shadow-xl border-t-4 border-[#0e3c63]">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-[#0e3c63] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">تعيين كلمة المرور الجديدة</h2>
                        <p className="text-gray-500 text-sm mt-2 font-bold">أدخل كلمة المرور الجديدة لحسابك</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-bold">
                                <AlertCircle size={18} /> {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-500 mr-1">كلمة المرور الجديدة</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-[#0e3c63] outline-none transition-all"
                                placeholder="••••••"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-500 mr-1">تأكيد كلمة المرور</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-[#0e3c63] outline-none transition-all"
                                placeholder="••••••"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-[#0e3c63] hover:bg-[#1a4d7a] text-white text-lg font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                        >
                            {isLoading ? 'جاري التحديث...' : 'حفظ كلمة المرور'}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};
