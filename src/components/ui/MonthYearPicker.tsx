
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronRight, ChevronLeft, X, ChevronDown } from 'lucide-react';

interface MonthYearPickerProps {
    selectedDate: Date | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
}

const MONTHS_AR = [
    'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({ selectedDate, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedDate) setViewYear(selectedDate.getFullYear());
        else setViewYear(new Date().getFullYear());
    }, [selectedDate, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(viewYear, monthIndex, 1);
        onChange(newDate);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative inline-block" dir="rtl">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-between bg-white border h-[50px] min-w-[160px] px-2 cursor-pointer transition-all duration-300 rounded-[1.5rem] shadow-sm select-none
                    ${isOpen ? 'border-[#0e3c63] ring-4 ring-[#0e3c63]/5' : 'border-gray-200 hover:border-gray-300'}
                `}
            >
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${selectedDate ? 'bg-blue-50 text-[#0e3c63]' : 'bg-gray-50 text-gray-400'}`}>
                        <Calendar size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400">الفترة الزمنية</span>
                        <span className={`text-xs font-black ${selectedDate ? 'text-gray-800' : 'text-gray-400'}`}>
                            {selectedDate ? `${MONTHS_AR[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : 'كل الفترات'}
                        </span>
                    </div>
                </div>

                {selectedDate ? (
                    <button onClick={handleClear} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                        <X size={16} />
                    </button>
                ) : (
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full min-w-[280px] left-0 bg-white rounded-[1.5rem] shadow-xl border border-gray-100 p-4 z-[60] animate-fade-in-up">
                    {/* Year Selector */}
                    <div className="flex items-center justify-between mb-4 bg-gray-50 p-2 rounded-xl">
                        <button onClick={() => setViewYear(y => y - 1)} className="p-1 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 transition-all">
                            <ChevronRight size={20} />
                        </button>
                        <span className="font-black text-lg text-[#0e3c63] font-mono">{viewYear}</span>
                        <button onClick={() => setViewYear(y => y + 1)} className="p-1 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 transition-all">
                            <ChevronLeft size={20} />
                        </button>
                    </div>

                    {/* Months Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {MONTHS_AR.map((month, idx) => (
                            <button
                                key={month}
                                onClick={() => handleMonthSelect(idx)}
                                className={`
                                    py-2 px-1 rounded-xl text-xs font-bold transition-all
                                    ${(selectedDate?.getMonth() === idx && selectedDate?.getFullYear() === viewYear)
                                        ? 'bg-[#0e3c63] text-white shadow-md transform scale-105'
                                        : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-[#0e3c63] border border-transparent hover:border-blue-100'
                                    }
                                `}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
