import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';

interface SessionConflictOverlayProps {
    onLogout: () => void;
}

export const SessionConflictOverlay: React.FC<SessionConflictOverlayProps> = ({ onLogout }) => {
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onLogout]);

    return (
        <div className="fixed inset-0 z-[99999] bg-gray-900/95 backdrop-blur-md flex items-center justify-center p-6" dir="rtl">
            <div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl border-t-8 border-orange-500 animate-fade-in relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 opacity-50"></div>

                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce relative z-10">
                    <ShieldAlert size={48} className="text-orange-500" />
                </div>

                <h2 className="text-3xl font-black text-gray-800 mb-3 relative z-10">تنبيه أمني</h2>
                <p className="text-gray-500 font-bold mb-8 leading-relaxed relative z-10">
                    تم اكتشاف تسجيل دخول جديد من جهاز آخر.
                    <br />
                    سيتم تسجيل خروجك من هذا الجهاز خلال <span className="text-orange-600 font-extrabold text-lg mx-1">{countdown}</span> ثواني.
                </p>

                <div className="flex flex-col gap-3 relative z-10">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                    >
                        <LogOut size={20} />
                        تسجيل الخروج الآن
                    </button>
                    <p className="text-[10px] text-gray-400 font-bold">
                        للحفاظ على أمان حسابك، لا يُسمح بفتح الحساب من أكثر من جهاز في نفس الوقت.
                    </p>
                </div>
            </div>
        </div>
    );
};
