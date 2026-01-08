
import React, { useState } from 'react';
import { LifeBuoy, Phone, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import vogaLogo from '../assets/logo/voga-logo.svg';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { db } from '../lib/db';
import { UserRole } from '../types';

interface AgentLoginPageProps {
    onBack?: () => void;
    onForgot?: () => void;
}

export const AgentLoginPage: React.FC<AgentLoginPageProps> = ({ onBack, onForgot }) => {
    const { login, updateUser } = useAuth();
    const toast = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // محاكاة تأخير الشبكة للأمان وتجربة المستخدم
            await new Promise(resolve => setTimeout(resolve, 800));

            // 1. التحقق من البيانات أولاً
            const tempUser = await db.login(email, password);

            // 2. التحقق الأمني: هل المستخدم وكيل فعلاً؟
            if (tempUser.role !== UserRole.AGENT) {
                throw new Error('هذا الحساب غير مصرح له بالدخول من بوابة الوكلاء.');
            }

            // 3. إتمام الدخول
            updateUser(tempUser);
        } catch (err: any) {
            // Translate common Supabase errors to Arabic
            let errorMessage = err.message;
            if (err.message?.includes('banned')) {
                errorMessage = 'هذا الحساب مجمد. تواصل مع الإدارة لفك التجميد.';
            } else if (err.message?.includes('Invalid login credentials')) {
                errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            }
            toast.error('فشل الدخول', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative overflow-hidden" dir="rtl">
            {/* خلفية خاصة بالوكلاء (لون Voga Orange) */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 bg-orange-200"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-[#dd5b30]"></div>

            <div className="w-full max-w-md relative z-10">
                {/* زر العودة - يظهر فقط إذا كان onBack معرّف (النسخة الكاملة) */}
                {onBack && (
                    <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-500 font-bold hover:text-gray-800 transition-colors group">
                        <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all"><ArrowRight size={18} /></div>
                        العودة للرئيسية
                    </button>
                )}

                <Card className="p-10 shadow-2xl border-t-4 border-voga-primary">
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center justify-center p-4 bg-transparent">
                            <img src={vogaLogo} alt="Voga Logo" className="w-52 h-auto" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-center mb-2 text-gray-800">
                        دخول الوكلاء
                    </h2>
                    <p className="text-center text-gray-400 mb-10 font-bold text-xs uppercase tracking-widest">
                        Authorized Agent Access
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-500 mr-1">البريد الإلكتروني</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-voga-primary outline-none transition-all shadow-inner font-mono text-sm"
                                    placeholder="name@company.com"
                                />
                                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-black text-gray-500 mr-1">كلمة المرور</label>
                                {onForgot && (
                                    <button type="button" onClick={onForgot} className="text-[10px] font-bold text-voga-secondary hover:underline">
                                        نسيت كلمة المرور؟
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold focus:bg-white focus:border-voga-primary outline-none transition-all shadow-inner text-lg tracking-widest"
                                    placeholder="••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full text-lg h-14 rounded-2xl shadow-xl font-black active:scale-95 transition-all bg-voga-primary hover:bg-voga-secondary text-white"
                        >
                            {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                        </Button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 gap-2 opacity-70 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2 font-bold text-voga-primary">
                            <LifeBuoy size={16} /> الدعم الفني
                        </div>
                        <div className="flex-1 text-center">
                            <a href="mailto:tech@high-star.iq" className="hover:text-voga-primary transition-colors font-mono font-bold text-xs">tech@high-star.iq</a>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs" dir="ltr">
                            <Phone size={14} className="text-voga-primary" />
                            <a href="tel:07762007070" className="hover:text-voga-primary transition-colors font-bold">07762007070</a>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
