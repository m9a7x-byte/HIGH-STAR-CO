import React from 'react';
import { XCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { Card, Button } from '../components/ui';

interface OperationFailedPageProps {
    title: string;
    message: string;
    onContinue: () => void;
}

export const OperationFailedPage: React.FC<OperationFailedPageProps> = ({ title, message, onContinue }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
            <div className="w-full max-w-md">
                <Card className="p-10 shadow-2xl border-t-4 border-red-500 animate-fade-in relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-[50px] -mr-16 -mt-16 opacity-50"></div>

                    <div className="text-center mb-8 relative z-10">
                        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
                            <XCircle size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 mb-3">{title}</h2>
                        <p className="text-gray-500 font-bold leading-relaxed">{message}</p>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                            <AlertTriangle size={24} className="text-red-500 shrink-0" />
                            <span className="text-xs font-bold text-red-800">صلاحية الرابط انتهت أو أنه غير صالح. يرجى إعادة المحاولة مرة أخرى.</span>
                        </div>

                        <Button
                            onClick={onContinue}
                            className="w-full h-16 bg-[#0e3c63] text-white hover:bg-[#1a4d7a] font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 group"
                        >
                            العودة للصفحة الرئيسية <ArrowRight size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
