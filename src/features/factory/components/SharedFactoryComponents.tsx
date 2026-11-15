
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
const t = i18n.t.bind(i18n);

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Search, X, ChevronRight, ChevronLeft, CalendarDays, type LucideIcon } from 'lucide-react';
import type { MaterialType } from '../../../types';
import { getTodayDateString } from '../../../lib/dateUtils';
import { FactoryFieldPopover, factoryFieldInput } from './FactoryFieldPopover';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

export const MONTHS_AR = (i18n.t('factory_shared.months', { returnObjects: true }) as string[]) || [
    'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

export const materialLabels: Record<string, string> = {
    'SILICON_HOT': 'factory_shared.mat_silicon_hot',
    'SILICON_COLD': 'factory_shared.mat_silicon_cold',
    'SAND': 'factory_shared.mat_sand',
    'SAND_ADHESIVE': 'factory_shared.mat_sand_adhesive',
    'CEMENT_BLACK': 'factory_shared.mat_cement_black',
    'CEMENT_WHITE': 'factory_shared.mat_cement_white',
    'EPS_RAW': 'factory_shared.mat_eps_raw',
    'POLYMER_ADHESIVE': 'factory_shared.mat_polymer',
    'SILOSH_ADHESIVE': 'factory_shared.mat_silosh',
    'SHASTA_ADHESIVE': 'factory_shared.mat_shasta',
    'CARTON_FOAM': 'factory_shared.mat_carton_foam',
    'BAGS_1051': 'factory_shared.mat_bags_1051',
    'BAGS_1052': 'factory_shared.mat_bags_1052',
    'BAGS_1053': 'factory_shared.mat_bags_1053',
    'BAGS_1054': 'factory_shared.mat_bags_1054',
    'BAGS_1059': 'factory_shared.mat_bags_1059',
};

export const materials: MaterialType[] = Object.keys(materialLabels) as MaterialType[];

export const ModalHeader = ({ title, subtitle, titleId, busy, onClose }: {
    title: string;
    subtitle?: string;
    titleId?: string;
    busy?: boolean;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] p-5 text-white sm:p-7">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url(${carbonFibre})` }} />
            <div className="relative flex items-center justify-between gap-3">
                <div>
                    <h3 id={titleId} className="text-xl font-black sm:text-2xl">{title}</h3>
                    {subtitle && <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-200">{subtitle}</p>}
                </div>
                <button type="button" onClick={onClose} disabled={busy} aria-label={t('common.close')}
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-50"><X size={20} aria-hidden /></button>
            </div>
        </div>
    );
};

const calendarDateKey = (date: Date) =>
    [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(part => String(part).padStart(2, '0')).join('-');

const calendarDate = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export function ModernSingleDatePicker({ label, value, onChange, min, max, disabled }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    const [viewDate, setViewDate] = useState(() => new Date());
    const [viewMode, setViewMode] = useState<'DAYS' | 'MONTHS' | 'YEARS'>('DAYS');
    const today = getTodayDateString();
    const months = t('factory_shared.months', { returnObjects: true }) as string[];
    const weekdays = t('factory_shared.weekdays', { returnObjects: true }) as string[];
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const outsideRange = (date: string) => (min && date < min) || (max && date > max);
    const display = (key: string) => {
        const date = calendarDate(key);
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const openCalendar = () => {
        const preferred = value || today;
        const initial = min && preferred < min ? min : max && preferred > max ? max : preferred;
        setViewDate(calendarDate(initial));
        setViewMode('DAYS');
    };

    const navigate = (offset: number) => {
        if (viewMode === 'DAYS') setViewDate(new Date(year, month + offset, 1));
        else setViewDate(new Date(year + offset * (viewMode === 'YEARS' ? 12 : 1), month, 1));
    };

    const calendarButton = 'rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-blue-100';
    return (
        <FactoryFieldPopover label={label} value={value ? display(value) : undefined} placeholder={t('factory_shared.pick_date')}
            icon={CalendarDays} disabled={disabled} panelWidth={324} panelHeight={410} onOpen={openCalendar}>
            {close => (
                <div className="space-y-3 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-1">
                        <button type="button" onClick={() => navigate(-1)} aria-label={t('common.back')}
                            className="flex min-h-10 min-w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><ChevronLeft size={18} className="rtl:rotate-180" aria-hidden /></button>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setViewMode(viewMode === 'MONTHS' ? 'DAYS' : 'MONTHS')}
                                className={calendarButton + ' bg-blue-50 text-[#0e3c63]'}>{months[month]}</button>
                            <button type="button" onClick={() => setViewMode(viewMode === 'YEARS' ? 'DAYS' : 'YEARS')}
                                className={calendarButton + ' bg-slate-100 tabular-nums text-slate-800'}>{year}</button>
                        </div>
                        <button type="button" onClick={() => navigate(1)} aria-label={t('common.next')}
                            className="flex min-h-10 min-w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><ChevronRight size={18} className="rtl:rotate-180" aria-hidden /></button>
                    </div>
                    {viewMode === 'DAYS' && (
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {weekdays.map((day, index) => <span key={index} className="py-1 text-xs font-bold text-slate-500">{day}</span>)}
                            {Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} />)}
                            {Array.from({ length: dayCount }, (_, index) => {
                                const day = index + 1;
                                const key = calendarDateKey(new Date(year, month, day));
                                const selected = value === key;
                                return (
                                    <button key={key} type="button" disabled={!!outsideRange(key)} aria-label={display(key)}
                                        aria-pressed={selected} aria-current={key === today ? 'date' : undefined}
                                        onClick={() => { onChange(key); close(); }}
                                        className={'min-h-9 min-w-0 rounded-xl text-sm font-bold tabular-nums transition-colors disabled:text-slate-300 ' +
                                            (selected ? 'bg-[#0e3c63] text-white' : 'enabled:hover:bg-blue-50 ' + (key === today ? 'bg-blue-50 text-[#0e3c63]' : 'text-slate-700'))}>
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {viewMode === 'MONTHS' && (
                        <div className="grid grid-cols-3 gap-1.5">
                            {months.map((name, index) => (
                                <button key={name} type="button" onClick={() => { setViewDate(new Date(year, index, 1)); setViewMode('DAYS'); }}
                                    className={calendarButton + (index === month ? ' bg-blue-50 text-[#0e3c63]' : ' bg-slate-50 text-slate-700')}>{name}</button>
                            ))}
                        </div>
                    )}
                    {viewMode === 'YEARS' && (
                        <div className="grid grid-cols-3 gap-1.5">
                            {Array.from({ length: 12 }, (_, index) => {
                                const entry = year - 5 + index;
                                return (
                                    <button key={entry} type="button" onClick={() => { setViewDate(new Date(entry, month, 1)); setViewMode('DAYS'); }}
                                        className={calendarButton + ' tabular-nums' + (entry === year ? ' bg-blue-50 text-[#0e3c63]' : ' bg-slate-50 text-slate-700')}>{entry}</button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex justify-end border-t border-slate-100 pt-2">
                        <button type="button" disabled={!!outsideRange(today)} onClick={() => { onChange(today); close(); }}
                            className={calendarButton + ' bg-blue-50 text-[#0e3c63] disabled:opacity-40'}>{t('batch4.k135')}</button>
                    </div>
                </div>
            )}
        </FactoryFieldPopover>
    );
}

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
        : t('factory_shared.pick_month');

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

export function ModalModernSelect<T extends string>({ label, value, options, onChange, icon, disabled, placeholder }: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    icon?: LucideIcon;
    disabled?: boolean;
    placeholder?: string;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const searchText = search.trim().toLocaleLowerCase();
    const filtered = options.filter(option => option.label.toLocaleLowerCase().includes(searchText));
    const selectedLabel = options.find(option => option.value === value)?.label;

    return (
        <FactoryFieldPopover label={label} value={selectedLabel} placeholder={placeholder ?? t('factory_shared.pick_from_list')}
            icon={icon} disabled={disabled} onOpen={() => setSearch('')}>
            {close => (
                <>
                    {options.length > 8 && (
                        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-2">
                            <div className="relative">
                                <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
                                <input type="text" aria-label={t('common.search')} placeholder={t('batch4.k659')}
                                    className={factoryFieldInput + ' ps-9'} value={search} onChange={event => setSearch(event.target.value)}
                                    onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} />
                            </div>
                        </div>
                    )}
                    <div className="space-y-0.5 p-1.5">
                        {filtered.map(option => {
                            const selected = value === option.value;
                            return (
                                <button key={option.value} type="button" aria-pressed={selected} onClick={() => { onChange(option.value); close(); }}
                                    className={'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-sm font-bold transition-colors ' +
                                        (selected ? 'bg-blue-50 text-[#0e3c63]' : 'text-slate-700 hover:bg-slate-50')}>
                                    <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
                                    {selected && <Check size={16} className="shrink-0" aria-hidden />}
                                </button>
                            );
                        })}
                        {filtered.length === 0 && <p className="px-3 py-5 text-center text-sm text-slate-600">{t('batch4.k660')}</p>}
                    </div>
                </>
            )}
        </FactoryFieldPopover>
    );
}
