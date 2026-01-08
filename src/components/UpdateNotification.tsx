import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X, AlertCircle, CheckCircle } from 'lucide-react';

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

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible || updateStatus.status === 'idle' || updateStatus.status === 'checking' || updateStatus.status === 'not-available') {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-5 duration-300" dir="rtl">
            {/* Header */}
            <div className="bg-[#0e3c63] p-3 flex justify-between items-center text-white">
                <div className="flex items-center gap-2 font-bold text-sm">
                    <RefreshCw size={16} className={updateStatus.status === 'downloading' ? 'animate-spin' : ''} />
                    تحديث النظام
                </div>
                <button onClick={handleClose} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Body */}
            <div className="p-4">
                {updateStatus.status === 'available' && (
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-800">تحديث جديد متوفر!</h3>
                            <p className="text-xs text-gray-500 mt-1 font-bold">إصدار {updateStatus.info?.version} جاهز للتنزيل.</p>
                        </div>
                        <button
                            onClick={handleDownload}
                            className="w-full py-2 bg-[#0e3c63] text-white rounded-lg font-bold hover:bg-[#1a4d7a] transition-colors text-sm"
                        >
                            تنزيل التحديث
                        </button>
                    </div>
                )}

                {updateStatus.status === 'downloading' && (
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-gray-600">
                            <span>جاري التنزيل...</span>
                            <span>{Math.round(updateStatus.progress?.percent || 0)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-[#0e3c63] h-full transition-all duration-300"
                                style={{ width: `${updateStatus.progress?.percent || 0}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center">
                            يرجى الانتظار، سيتم تثبيت التحديث تلقائياً.
                        </p>
                    </div>
                )}

                {updateStatus.status === 'downloaded' && (
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-800">تم التنزيل بنجاح!</h3>
                            <p className="text-xs text-gray-500 mt-1 font-bold">يجب إعادة تشغيل التطبيق لتثبيت التحديث.</p>
                        </div>
                        <button
                            onClick={handleInstall}
                            className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors text-sm"
                        >
                            إعادة التشغيل والتثبيت
                        </button>
                    </div>
                )}

                {updateStatus.status === 'error' && (
                    <div className="text-center space-y-3">
                        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-red-600">فشل التحديث</h3>
                            <p className="text-xs text-gray-500 mt-1 break-words">{updateStatus.error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
