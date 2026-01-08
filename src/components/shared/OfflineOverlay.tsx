import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineOverlay = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-gray-900/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl border-t-8 border-red-500 animate-fade-in">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <WifiOff size={48} className="text-red-500" />
                </div>

                <h2 className="text-3xl font-black text-gray-800 mb-3">لا يوجد اتصال بالإنترنت</h2>
                <p className="text-gray-500 font-bold mb-8 leading-relaxed">
                    يرجى التحقق من اتصالك بالشبكة. سيتم استئناف العمل تلقائياً عند عودة الاتصال.
                </p>

                <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <RefreshCw size={18} className="text-gray-400 animate-spin" />
                    <span className="text-sm font-bold text-gray-500">جاري محاولة إعادة الاتصال...</span>
                </div>
            </div>
        </div>
    );
};
