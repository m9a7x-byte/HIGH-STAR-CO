
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Search, X, ChevronRight, ChevronLeft, CalendarDays, RotateCcw, ArrowLeft } from 'lucide-react';
import { MaterialType } from '../../../types';
import { formatDate } from '../../../lib/dateUtils';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

export const MONTHS_AR = [
    'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

const WEEKDAYS_AR = ['أ', 'إ', 'ث', 'ر', 'خ', 'ج', 'س'];

export const materialLabels: Record<string, string> = {
    'SILICON_HOT': 'سليكون حار',
    'SILICON_COLD': 'سليكون بارد',
    'SAND': 'رمل فلين',
    'SAND_ADHESIVE': 'رمل لاصق',
    'CEMENT_BLACK': 'سمنت أسود',
    'CEMENT_WHITE': 'سمنت أبيض',
    'EPS_RAW': 'حبيبات الفلين',
    'POLYMER_ADHESIVE': 'بوليمر ( للمادة اللاصقة )',
    'SILOSH_ADHESIVE': 'سليليوز ( للمادة اللاصقة )',
    'SHASTA_ADHESIVE': 'نشاسته ( للمادة اللاصقة )',
    'CARTON_FOAM': 'كارتون فلين',
    'CHEMICAL': 'أكياس المادة اللاصقة',
};

export const materials: MaterialType[] = Object.keys(materialLabels) as MaterialType[];

export const ModalHeader = ({ title, subtitle, onClose }: { title: string, subtitle: string, onClose: () => void }) => (
    <div className="p-8 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
        <div className="relative z-10 flex justify-between items-center">
            <div>
                <h3 className="font-black text-2xl">{title}</h3>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">{subtitle}</p>
            </div>
            <button type="button" onClick={onClose} className="bg-white/10 hover:bg-red-500 p-3 rounded-2xl transition-all shadow-inner"><X size={20} /></button>
        </div>
    </div>
);

// --- COMPONENT: PREMIUM SINGLE DATE PICKER ---
export const ModernSingleDatePicker = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'DAYS' | 'MONTHS' | 'YEARS'>('DAYS');
    const containerRef = useRef<HTMLDivElement>(null);

    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    useEffect(() => {
        if (isOpen) {
            setViewMode('DAYS');
            setViewDate(parseDate(value));
        }
    }, [isOpen, value]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleDateSelect = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const y = newDate.getFullYear();
        const m = String(newDate.getMonth() + 1).padStart(2, '0');
        const d = String(newDate.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
        setIsOpen(false);
    };

    const navigate = (offset: number) => {
        if (viewMode === 'DAYS') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
        else if (viewMode === 'YEARS') setViewDate(new Date(viewDate.getFullYear() + (offset * 12), viewDate.getMonth(), 1));
        else setViewDate(new Date(viewDate.getFullYear() + offset, viewDate.getMonth(), 1));
    };

    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`pad-${i}`} className="w-9 h-9" />);
        }

        const selectedDate = parseDate(value);
        const today = new Date();

        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;

            days.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => handleDateSelect(d)}
                    className={`w-9 h-9 flex items-center justify-center text-[11px] font-black rounded-xl transition-all ${isSelected
                        ? 'bg-[#0e3c63] text-white shadow-lg scale-110 z-10'
                        : isToday
                            ? 'bg-blue-50 text-[#0e3c63] border border-[#0e3c63]/20'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    {d}
                </button>
            );
        }
        return <div className="grid grid-cols-7 gap-1 animate-fade-in">{days}</div>;
    };

    const displayValue = value ? formatDate(value, { day: '2-digit', month: 'long', year: 'numeric' }) : 'اختر التاريخ...';

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[60px] flex items-center justify-between px-5 bg-white border-2 rounded-2xl transition-all duration-300 ${isOpen ? 'border-[#0e3c63] ring-4 ring-blue-50 shadow-lg' : 'border-gray-100 hover:border-blue-200 shadow-sm'}`}
            >
                <div className="flex items-center gap-3">
                    <CalendarDays size={20} className={isOpen ? 'text-[#0e3c63]' : 'text-gray-300'} />
                    <span className={`font-black text-sm ${value ? 'text-gray-800' : 'text-gray-300'}`}>{displayValue}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-3 w-[320px] left-0 md:right-0 md:left-auto z-[500] animate-fade-in-up origin-top">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-5 overflow-hidden">
                        <div className="flex items-center justify-between mb-5">
                            <button type="button" onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-[#0e3c63] transition-all">
                                <ChevronRight size={20} />
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setViewMode(viewMode === 'MONTHS' ? 'DAYS' : 'MONTHS')}
                                    className="px-3 py-1.5 rounded-xl text-xs font-black text-[#0e3c63] bg-blue-50 hover:bg-blue-100 transition-all"
                                >
                                    {MONTHS_AR[viewDate.getMonth()]}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode(viewMode === 'YEARS' ? 'DAYS' : 'YEARS')}
                                    className="px-3 py-1.5 rounded-xl text-xs font-black text-gray-700 bg-gray-50 hover:bg-gray-100 transition-all font-mono"
                                >
                                    {viewDate.getFullYear()}
                                </button>
                            </div>

                            <button type="button" onClick={() => navigate(1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-[#0e3c63] transition-all">
                                <ChevronLeft size={20} />
                            </button>
                        </div>

                        <div className="min-h-fit">
                            {viewMode === 'DAYS' && (
                                <>
                                    <div className="grid grid-cols-7 mb-2">
                                        {WEEKDAYS_AR.map(day => (
                                            <div key={day} className="text-[10px] font-black text-gray-300 text-center uppercase">{day}</div>
                                        ))}
                                    </div>
                                    {renderDays()}
                                </>
                            )}
                            {viewMode === 'MONTHS' && (
                                <div className="grid grid-cols-3 gap-2 animate-fade-in">
                                    {MONTHS_AR.map((m, idx) => (
                                        <button key={idx} type="button" onClick={() => { setViewDate(new Date(viewDate.getFullYear(), idx, 1)); setViewMode('DAYS'); }} className={`py-3 rounded-xl text-[10px] font-black transition-all ${viewDate.getMonth() === idx ? 'bg-[#0e3c63] text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#0e3c63]'}`}>{m}</button>
                                    ))}
                                </div>
                            )}
                            {viewMode === 'YEARS' && (
                                <div className="grid grid-cols-3 gap-2 animate-fade-in">
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const y = viewDate.getFullYear() - 5 + i;
                                        return <button key={y} type="button" onClick={() => { setViewDate(new Date(y, viewDate.getMonth(), 1)); setViewMode('DAYS'); }} className={`py-3 rounded-xl text-xs font-black font-mono transition-all ${viewDate.getFullYear() === y ? 'bg-[#0e3c63] text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#0e3c63]'}`}>{y}</button>
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">اختر تاريخاً</span>
                            <button type="button" onClick={() => { handleDateSelect(new Date().getDate()); setViewDate(new Date()); }} className="text-[10px] font-black text-[#0e3c63] bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">اليوم</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT: PREMIUM MONTH YEAR PICKER (With Month Number Support) ---
export const ModernMonthYearPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    useEffect(() => {
        if (isOpen) setViewDate(parseDate(value));
    }, [isOpen, value]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleMonthSelect = (idx: number) => {
        const y = viewDate.getFullYear();
        const m = String(idx + 1).padStart(2, '0');
        onChange(`${y}-${m}-01`);
        setIsOpen(false);
    };

    const d = parseDate(value);
    const displayValue = value
        ? `${MONTHS_AR[d.getMonth()]} (${d.getMonth() + 1}) ${d.getFullYear()}`
        : 'اختر الشهر...';

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[60px] flex items-center justify-between px-5 bg-white border-2 rounded-2xl transition-all duration-300 ${isOpen ? 'border-[#0e3c63] ring-4 ring-blue-50 shadow-lg' : 'border-gray-100 hover:border-blue-200 shadow-sm'}`}
            >
                <div className="flex items-center gap-3">
                    <Calendar size={20} className={isOpen ? 'text-[#0e3c63]' : 'text-gray-300'} />
                    <span className={`font-black text-sm ${value ? 'text-gray-800' : 'text-gray-300'}`}>{displayValue}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-3 w-[300px] left-0 md:right-0 md:left-auto z-[500] animate-fade-in-up origin-top">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-5 overflow-hidden">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, 0, 1))} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"><ChevronRight size={18} /></button>
                            <span className="font-black text-gray-800 font-mono text-lg">{viewDate.getFullYear()}</span>
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, 0, 1))} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"><ChevronLeft size={18} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {MONTHS_AR.map((m, idx) => {
                                const isSelected = parseDate(value).getMonth() === idx && parseDate(value).getFullYear() === viewDate.getFullYear();
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleMonthSelect(idx)}
                                        className={`py-3 rounded-xl text-[10px] font-black transition-all flex flex-col items-center justify-center ${isSelected ? 'bg-[#0e3c63] text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#0e3c63]'}`}
                                    >
                                        <span>{m}</span>
                                        <span className={`text-[8px] mt-0.5 opacity-60 ${isSelected ? 'text-blue-200' : ''}`}>({idx + 1})</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ModalModernSelect = ({ label, value, options, onChange, icon: Icon }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
    const selectedLabel = options.find((o: any) => o.value === value)?.label || 'اختر من القائمة...';

    return (
        <div className="relative w-full" ref={containerRef}>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[60px] flex items-center justify-between px-5 bg-white border-2 rounded-2xl transition-all duration-300 ${isOpen ? 'border-[#0e3c63] ring-4 ring-blue-50 shadow-lg' : 'border-gray-100 hover:border-blue-200 shadow-sm'}`}
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon size={20} className={isOpen ? 'text-[#0e3c63]' : 'text-gray-400'} />}
                    <span className={`font-black text-sm ${value ? 'text-gray-800' : 'text-gray-300'}`}>{selectedLabel}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-[1.8rem] shadow-2xl border border-gray-100 z-[500] overflow-hidden animate-fade-in-up">
                    {options.length > 8 && (
                        <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                            <div className="relative">
                                <input
                                    className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold outline-none focus:border-[#0e3c63] shadow-inner"
                                    placeholder="بحث سريع..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    autoFocus
                                />
                                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                        </div>
                    )}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
                        {filtered.map((opt: any) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                                className={`w-full text-right px-4 py-3.5 rounded-xl text-sm font-black flex justify-between items-center transition-all ${value === opt.value ? 'bg-blue-50 text-[#0e3c63]' : 'hover:bg-gray-50 text-gray-600'}`}
                            >
                                {opt.label}
                                {value === opt.value && <Check size={16} />}
                            </button>
                        ))}
                        {filtered.length === 0 && <p className="p-8 text-center text-xs text-gray-300 font-bold italic">لا توجد نتائج مطابقة</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
