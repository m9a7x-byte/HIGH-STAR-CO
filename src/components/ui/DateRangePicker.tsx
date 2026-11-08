import { useTranslation } from 'react-i18next';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, X, ArrowLeft, ChevronRight, ChevronLeft, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { formatDate as formatDateUtil } from '../../lib/dateUtils';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChangeFrom: (date: string) => void;
  onChangeTo: (date: string) => void;
  placeholder?: string;
}

const MONTHS_AR = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

const WEEKDAYS_AR = ['أ', 'إ', 'ث', 'ر', 'خ', 'ج', 'س'];

type CalendarView = 'DAYS' | 'MONTHS' | 'YEARS';

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ from, to, onChangeFrom, onChangeTo }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<'FROM' | 'TO' | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarView>('DAYS');
  const containerRef = useRef<HTMLDivElement>(null);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  useEffect(() => {
    if (isOpen) {
      setViewMode('DAYS');
      let initialDate = new Date();
      if (isOpen === 'FROM' && from) initialDate = parseDate(from) || new Date();
      else if (isOpen === 'TO' && to) initialDate = parseDate(to) || new Date();
      setViewDate(initialDate);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    const date = parseDate(dateString);
    if (!date) return null;
    return formatDateUtil(date, { day: '2-digit', month: 'long' });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChangeFrom('');
    onChangeTo('');
    setIsOpen(null);
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    if (isOpen === 'FROM') {
      onChangeFrom(dateStr);
      setIsOpen(null);
    } else {
      onChangeTo(dateStr);
      setIsOpen(null);
    }
  };

  const navigate = (offset: number) => {
    if (viewMode === 'DAYS') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    } else if (viewMode === 'YEARS') {
      setViewDate(new Date(viewDate.getFullYear() + (offset * 12), viewDate.getMonth(), 1));
    } else {
      setViewDate(new Date(viewDate.getFullYear() + offset, viewDate.getMonth(), 1));
    }
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`pad-${i}`} className="w-10 h-10" />);
    }

    const today = new Date();
    const activeDateStr = isOpen === 'FROM' ? from : to;
    const activeDate = parseDate(activeDateStr);

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      const isSelected = activeDate?.getDate() === d && activeDate?.getMonth() === month && activeDate?.getFullYear() === year;

      let isInRange = false;
      if (from && to) {
        const currTime = new Date(year, month, d).getTime();
        const fromTime = parseDate(from)!.getTime();
        const toTime = parseDate(to)!.getTime();
        const start = Math.min(fromTime, toTime);
        const end = Math.max(fromTime, toTime);
        if (currTime > start && currTime < end) isInRange = true;
      }

      days.push(
        <button
          key={d}
          onClick={(e) => { e.preventDefault(); handleDateSelect(d); }}
          className={`
            w-10 h-10 flex items-center justify-center text-sm font-black rounded-xl transition-all duration-300 relative
            ${isSelected
              ? 'bg-[#0e3c63] text-white shadow-lg scale-110 z-20'
              : isToday
                ? 'text-[#0e3c63] bg-blue-50 ring-2 ring-[#0e3c63]/20'
                : isInRange
                  ? 'bg-[#0e3c63]/10 text-[#0e3c63] rounded-none'
                  : 'text-gray-600 hover:bg-gray-100'
            }
          `}
        >
          {d}
        </button>
      );
    }
    return <div className="grid grid-cols-7 gap-y-1 justify-items-center animate-fade-in">{days}</div>;
  };

  return (
    <div ref={containerRef} className="relative inline-block" dir="rtl">
      <div className={`
        flex items-center bg-white border-2 rounded-[1.5rem] transition-all duration-500 h-[56px] min-w-[320px] shadow-sm
        ${isOpen ? 'border-[#0e3c63] shadow-xl ring-4 ring-blue-50' : 'border-gray-100 hover:border-blue-200 hover:shadow-md'}
      `}>

        <div
          onClick={() => setIsOpen(isOpen === 'FROM' ? null : 'FROM')}
          className={`flex-1 h-full flex items-center px-4 cursor-pointer transition-colors rounded-r-[1.5rem] ${isOpen === 'FROM' ? 'bg-blue-50/50' : ''}`}
        >
          <div className="flex items-center gap-3">
            <CalendarDays size={18} className={from ? 'text-[#0e3c63]' : 'text-gray-300'} />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('batch4.k133')}</span>
              <span className={`text-xs font-black truncate max-w-[80px] ${from ? 'text-gray-800' : 'text-gray-300'}`}>
                {formatDate(from) || t('datepicker.start', 'البداية')}
              </span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-200"></div>

        <div
          onClick={() => setIsOpen(isOpen === 'TO' ? null : 'TO')}
          className={`flex-1 h-full flex items-center justify-between px-4 cursor-pointer transition-colors rounded-l-[1.5rem] ${isOpen === 'TO' ? 'bg-blue-50/50' : ''}`}
        >
          <ArrowLeft size={18} className={to ? 'text-[#0e3c63]' : 'text-gray-300'} />
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('batch4.k134')}</span>
            <span className={`text-xs font-black truncate max-w-[80px] ${to ? 'text-gray-800' : 'text-gray-300'}`}>
              {formatDate(to) || t('datepicker.end', 'النهاية')}
            </span>
          </div>
        </div>

        {(from || to) && (
          <button onClick={handleClear} className="mx-2 p-1.5 bg-gray-100 text-gray-400 hover:bg-red-500 hover:text-white rounded-lg transition-all">
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-3 right-0 z-[100] animate-fade-in-up origin-top-right">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-5 w-[340px] overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-[#0e3c63] transition-all">
                <ChevronRight size={20} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode(viewMode === 'MONTHS' ? 'DAYS' : 'MONTHS')}
                  className="px-3 py-1.5 rounded-xl text-sm font-black text-[#0e3c63] bg-blue-50 hover:bg-blue-100 transition-all"
                >
                  {MONTHS_AR[viewDate.getMonth()]}
                </button>
                <button
                  onClick={() => setViewMode(viewMode === 'YEARS' ? 'DAYS' : 'YEARS')}
                  className="px-3 py-1.5 rounded-xl text-sm font-black text-gray-700 bg-gray-50 hover:bg-gray-100 transition-all font-mono"
                >
                  {viewDate.getFullYear()}
                </button>
              </div>

              <button onClick={() => navigate(1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-[#0e3c63] transition-all">
                <ChevronLeft size={20} />
              </button>
            </div>

            <div className="min-h-fit">
              {viewMode === 'DAYS' && (
                <>
                  <div className="grid grid-cols-7 mb-3">
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
                    <button key={idx} onClick={() => { setViewDate(new Date(viewDate.getFullYear(), idx, 1)); setViewMode('DAYS'); }} className={`py-4 rounded-2xl text-xs font-black transition-all ${viewDate.getMonth() === idx ? 'bg-[#0e3c63] text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#0e3c63]'}`}>{m}</button>
                  ))}
                </div>
              )}
              {viewMode === 'YEARS' && (
                <div className="grid grid-cols-3 gap-2 animate-fade-in">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const y = viewDate.getFullYear() - 5 + i;
                    return <button key={y} onClick={() => { setViewDate(new Date(y, viewDate.getMonth(), 1)); setViewMode('DAYS'); }} className={`py-4 rounded-2xl text-sm font-black font-mono transition-all ${viewDate.getFullYear() === y ? 'bg-[#0e3c63] text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#0e3c63]'}`}>{y}</button>
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {isOpen === 'FROM' ? t('datepicker.select_start', 'تحديد البداية') : t('datepicker.select_end', 'تحديد النهاية')}
              </span>
              <button onClick={() => { handleDateSelect(new Date().getDate()); setViewDate(new Date()); }} className="text-[10px] font-black text-[#0e3c63] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">{t('batch4.k135')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
