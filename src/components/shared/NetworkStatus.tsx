import i18n from 'i18next';
const t = i18n.t.bind(i18n);

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      // إخفاء رسالة "عاد الاتصال" بعد 4 ثواني
      setTimeout(() => setShowBackOnline(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // إذا كان متصل ولا يوجد رسالة "عاد الاتصال" للعرض، لا ترجع شيء
  if (isOnline && !showBackOnline) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-md animate-fade-in-up pointer-events-none">
      
      {!isOnline && (
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border-2 border-red-400 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-xl animate-pulse">
              <WifiOff size={24} />
            </div>
            <div>
              <h4 className="font-black text-sm">{t('batch4.k108')}</h4>
              <p className="text-[11px] font-bold opacity-90 mt-0.5">{t('batch4.k109')}</p>
            </div>
          </div>
        </div>
      )}

      {isOnline && showBackOnline && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-emerald-400 backdrop-blur-md pointer-events-auto">
           <div className="p-2 bg-white/20 rounded-xl">
              <Wifi size={24} />
            </div>
            <div>
              <h4 className="font-black text-sm">{t('batch4.k110')}</h4>
              <p className="text-[11px] font-bold opacity-90 mt-0.5">{t('batch4.k111')}</p>
            </div>
        </div>
      )}
    </div>
  );
};
