
import React from 'react';
import { Users, ShieldCheck, ArrowLeft } from 'lucide-react';

interface LandingPageProps {
    onNavigate: (view: 'LOGIN_AGENT' | 'LOGIN_STAFF') => void;
}

import carbonFibre from '../assets/patterns/carbon-fibre.png';
import cubes from '../assets/patterns/cubes.png';

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative overflow-hidden" dir="rtl">

            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-full h-full opacity-5" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#0e3c63]/20 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-5xl relative z-10">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-5xl md:text-7xl font-black text-[#0e3c63] tracking-tighter drop-shadow-sm">نظام معمل فوكا</h1>
                    <p className="text-xl text-gray-500 font-bold tracking-widest">VOGA FACTORY ERP SYSTEM</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">

                    {/* Agent Portal Button */}
                    <button
                        onClick={() => onNavigate('LOGIN_AGENT')}
                        className="group relative bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-transparent hover:border-emerald-400 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col items-center text-center"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                        <div className="w-28 h-28 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            <Users size={48} className="text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 mb-3 group-hover:text-emerald-700 transition-colors">بوابة الوكلاء</h2>
                        <p className="text-gray-400 font-bold leading-relaxed mb-8 px-4">
                            تسجيل الدخول المخصص للوكلاء المعتمدين لمتابعة الطلبات والحسابات.
                        </p>
                        <div className="mt-auto w-full py-4 bg-gray-50 rounded-2xl font-black text-gray-400 group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center justify-center gap-3">
                            دخول النظام <ArrowLeft size={20} className="transform group-hover:-translate-x-1 transition-transform" />
                        </div>
                    </button>

                    {/* Staff Portal Button */}
                    <button
                        onClick={() => onNavigate('LOGIN_STAFF')}
                        className="group relative bg-[#0e3c63] rounded-[3rem] p-10 shadow-2xl border-4 border-transparent hover:border-blue-400 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(14,60,99,0.3)] overflow-hidden flex flex-col items-center text-center"
                    >
                        <div className="absolute top-0 right-0 w-full h-full opacity-10" style={{ backgroundImage: `url(${cubes})` }}></div>
                        <div className="w-28 h-28 bg-white/10 rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner backdrop-blur-sm relative z-10">
                            <ShieldCheck size={48} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-3 relative z-10">بوابة الإدارة والموظفين</h2>
                        <p className="text-blue-200/60 font-bold leading-relaxed mb-8 px-4 relative z-10">
                            الدخول الإداري المخصص لطاقم العمل والمشرفين والمدير العام.
                        </p>
                        <div className="mt-auto w-full py-4 bg-white/5 rounded-2xl font-black text-blue-200 group-hover:bg-white group-hover:text-[#0e3c63] transition-all flex items-center justify-center gap-3 relative z-10">
                            دخول آمن <ArrowLeft size={20} className="transform group-hover:-translate-x-1 transition-transform" />
                        </div>
                    </button>

                </div>

                <div className="mt-20 text-center text-gray-400 text-xs font-black uppercase tracking-[0.3em]" dir="ltr">
                    &copy; {new Date().getFullYear()} High Star Co. - Secure Access
                </div>
            </div>
        </div>
    );
};
