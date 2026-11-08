import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, AlertCircle, CheckCircle, ShieldAlert, X } from 'lucide-react';

interface UpdateStatus {
    status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'idle';
    info?: any;
    progress?: {
        percent: number;
        transferred: number;
        total: number;
        bytesPerSecond: number;
    };
    error?: string;
}

export const UpdateNotification: React.FC = () => {
    const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Listen for update messages from Main Process
        if (window.electronAPI) {
            window.electronAPI.onUpdateStatus((data: any) => {
                console.log('Update Status:', data);
                setUpdateStatus(data);

                // Show notification on relevant statuses
                if (['available', 'downloading', 'downloaded', 'error'].includes(data.status)) {
                    setIsVisible(true);
                }
            });
        }
    }, []);

    const handleDownload = () => {
        if (window.electronAPI) {
            window.electronAPI.downloadUpdate();
        }
    };

    const handleInstall = () => {
        if (window.electronAPI) {
            window.electronAPI.quitAndInstall();
        }
    };

    const handleRetry = () => {
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
            setUpdateStatus({ status: 'checking' });
            window.electronAPI.checkForUpdates();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible || updateStatus.status === 'idle' || updateStatus.status === 'checking' || updateStatus.status === 'not-available') {
        return null;
    }

    // Only allow closure if it's an error, otherwise it's a mandatory update block.
    const canClose = updateStatus.status === 'error';

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300" dir="rtl">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                {/* Header */}
                <div className="bg-[#0e3c63] p-4 flex justify-between items-center text-white relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none blur-2xl"></div>
                    
                    <div className="flex items-center gap-3 relative z-10 w-full justify-center">
                        <ShieldAlert size={20} className="text-blue-200" />
                        <span className="font-black text-lg tracking-wide">تحديث إجباري للنظام</span>
                    </div>

                    {canClose && (
                        <button onClick={handleClose} className="absolute left-4 top-1/2 -translate-y-1/2 hover:bg-white/10 p-1.5 rounded-lg transition-colors z-10">
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6">
                    {updateStatus.status === 'available' && (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto relative group">
                                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                                <Download size={36} className="group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-800">{t('batch4.k144')}</h3>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    تتوفر نسخة جديدة من النظام (إصدار {updateStatus.info?.version}).<br/>
                                    لضمان أعلى معايير الأمان والأداء، يجب عليك تحديث التطبيق الآن للمتابعة.
                                </p>
                            </div>
                            <button
                                onClick={handleDownload}
                                className="w-full py-3.5 bg-[#0e3c63] text-white rounded-xl font-bold hover:bg-[#1a4d7a] transition-all text-base shadow-lg shadow-[#0e3c63]/25 flex items-center justify-center gap-2"
                            >
                                <Download size={20} />
                                بدء تنزيل التحديث
                            </button>
                        </div>
                    )}

                    {updateStatus.status === 'downloading' && (
                        <div className="space-y-6 py-4">
                            <div className="text-center space-y-2">
                                <RefreshCw size={36} className="mx-auto text-[#0e3c63] animate-spin mb-4" />
                                <h3 className="text-lg font-black text-gray-800">{t('batch4.k145')}</h3>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-bold text-gray-600">
                                    <span>جاري التنزيل...</span>
                                    <span className="text-[#0e3c63]">{Math.round(updateStatus.progress?.percent || 0)}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="bg-gradient-to-r from-[#0e3c63] to-blue-500 h-full transition-all duration-300 relative"
                                        style={{ width: `${updateStatus.progress?.percent || 0}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, .15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .15) 50%, rgba(255, 255, 255, .15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 text-center mt-3 font-medium">
                                    الرجاء الانتظار، سيتم تثبيت التحديث تلقائياً بعد اكتمال التنزيل. الرجاء عدم إغلاق التطبيق.
                                </p>
                            </div>
                        </div>
                    )}

                    {updateStatus.status === 'downloaded' && (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle size={36} className="animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-800">{t('batch4.k146')}</h3>
                                <p className="text-sm text-gray-500 mt-2">{t('batch4.k147')}</p>
                            </div>
                            <button
                                onClick={handleInstall}
                                className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors text-base shadow-lg shadow-emerald-500/25"
                            >
                                إعادة التشغيل والتثبيت الآن
                            </button>
                        </div>
                    )}

                    {updateStatus.status === 'error' && (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle size={36} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-red-600">{t('batch4.k148')}</h3>
                                <p className="text-sm text-gray-500 mt-3 p-3 bg-red-50 rounded-lg border border-red-100 font-mono text-left" dir="ltr">
                                    {updateStatus.error}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRetry}
                                    className="flex-1 py-3 bg-[#0e3c63] text-white rounded-xl font-bold hover:bg-[#1a4d7a] transition-colors shadow-lg shadow-[#0e3c63]/25"
                                >
                                    إعادة المحاولة
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    إلغاء وتخطي
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
