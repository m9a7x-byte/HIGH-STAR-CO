
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { LanguageCode } from '../../i18n';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/db';

// SVG Flags Component
const FlagSVG = ({ code, size = 20 }: { code: LanguageCode; size?: number }) => {
    const { t } = useTranslation();
  const flags: Record<LanguageCode, React.ReactNode> = {
    ar: (
      // Iraq Flag
      <svg viewBox="0 0 36 24" width={size} height={size * 0.67} className="rounded-[3px] shadow-sm border border-black/10">
        <rect width="36" height="8" fill="#CE1126" />
        <rect y="8" width="36" height="8" fill="#FFFFFF" />
        <rect y="16" width="36" height="8" fill="#000000" />
        <text x="18" y="14.5" textAnchor="middle" fill="#007A3D" fontSize="4" fontFamily="serif" fontWeight="bold">{t('batch3.txt_n9ouv2_7052')}</text>
      </svg>
    ),
    ku: (
      // Kurdistan Flag
      <svg viewBox="0 0 36 24" width={size} height={size * 0.67} className="rounded-[3px] shadow-sm border border-black/10">
        <rect width="36" height="8" fill="#ED2939" />
        <rect y="8" width="36" height="8" fill="#FFFFFF" />
        <rect y="16" width="36" height="8" fill="#00843D" />
        <circle cx="18" cy="12" r="4.5" fill="#FEDD00" />
        {/* Sun rays */}
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={i} x1="18" y1="12" x2={18 + 6.5 * Math.cos((i * 360 / 21) * Math.PI / 180)} y2={12 + 6.5 * Math.sin((i * 360 / 21) * Math.PI / 180)} stroke="#FEDD00" strokeWidth="0.6" />
        ))}
      </svg>
    ),
    tkm: (
      // Turkmen Flag (light blue with crescent & star)
      <svg viewBox="0 0 360 240" width={size} height={size * 0.67} className="rounded-[3px] shadow-sm border border-black/10">
        <rect width="360" height="240" fill="#20c6ed" />
        <rect y="24" width="360" height="24" fill="#fff" />
        <rect y="192" width="360" height="24" fill="#fff" />
        <circle cx="120" cy="120" r="60" fill="#fff" />
        <circle cx="135" cy="120" r="48" fill="#20c6ed" />
        <g transform="rotate(-90 160.35 -40.35)" fill="#fff">
          <g id="tkm-b">
            <path d="M0-30V0h15" transform="rotate(18 0 -30)" />
            <path d="M0-30V0h-15" transform="rotate(-18 0 -30)" />
          </g>
          <use xlinkHref="#tkm-b" transform="rotate(72)" />
          <use xlinkHref="#tkm-b" transform="rotate(144)" />
          <use xlinkHref="#tkm-b" transform="rotate(216)" />
          <use xlinkHref="#tkm-b" transform="rotate(288)" />
        </g>
      </svg>
    ),
    tr: (
      // Turkey Flag
      <svg viewBox="0 0 36 24" width={size} height={size * 0.67} className="rounded-[3px] shadow-sm border border-black/10">
        <rect width="36" height="24" fill="#E30A17" />
        <circle cx="13.5" cy="12" r="6" fill="#FFFFFF" />
        <circle cx="15" cy="12" r="4.8" fill="#E30A17" />
        <polygon points="20,12 22.5,10 21,12.5 23.5,12 21,13.5 22.5,14" fill="#FFFFFF" />
      </svg>
    ),
    en: (
      // UK Flag
      <svg viewBox="0 0 36 24" width={size} height={size * 0.67} className="rounded-[3px] shadow-sm border border-black/10">
        <rect width="36" height="24" fill="#012169" />
        <path d="M0,0 L36,24 M36,0 L0,24" stroke="#FFF" strokeWidth="4" />
        <path d="M0,0 L36,24 M36,0 L0,24" stroke="#C8102E" strokeWidth="2.5" />
        <path d="M18,0 V24 M0,12 H36" stroke="#FFF" strokeWidth="6" />
        <path d="M18,0 V24 M0,12 H36" stroke="#C8102E" strokeWidth="3.5" />
      </svg>
    ),
  };

  return <span className="inline-flex shrink-0">{flags[code]}</span>;
};

export { FlagSVG };

export const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [isEnabled, setIsEnabled] = useState(db.isLanguageSwitcherEnabled());
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      const enabled = db.isLanguageSwitcherEnabled();
      setIsEnabled(enabled);
      if (!enabled) setIsOpen(false);
    };
    const unsubscribe = db.subscribe(refresh);
    refresh();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languageEntries = Object.entries(languages) as [LanguageCode, typeof languages[LanguageCode]][];

  if (!isEnabled) return null;

  return (
    <>
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 active:scale-95 border ${
          isOpen 
            ? 'bg-white/15 text-white border-white/20 shadow-lg' 
            : 'bg-white/5 text-white/80 hover:text-white hover:bg-white/10 border-white/0 hover:border-white/10'
        }`}
      >
        <FlagSVG code={currentLanguage} size={22} />
        <span className="text-[11px] font-black uppercase tracking-wider hidden sm:inline">
          {currentLanguage.toUpperCase()}
        </span>
        <ChevronDown size={14} className={`transition-transform duration-300 opacity-60 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full mt-2.5 left-0 bg-white rounded-2xl overflow-hidden z-[100] min-w-[220px]"
          style={{ 
            boxShadow: '0 25px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
            animation: 'dropIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0e3c63] to-[#1a5a8a] flex items-center gap-2">
            <Globe size={14} className="text-white/70" />
            <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.15em]">
              {t('common.select_language')}
            </span>
          </div>

          {/* Language Options */}
          <div className="p-1.5">
            {languageEntries.map(([code, config]) => {
              const isActive = currentLanguage === code;
              return (
                <button
                  key={code}
                  onClick={() => {
                    setIsOpen(false);
                    setIsLoading(true);
                    setTimeout(() => {
                        changeLanguage(code);
                        setTimeout(() => setIsLoading(false), 400);
                    }, 50);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0e3c63] to-[#1a5a8a] text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <div className={`transition-transform duration-200 ${!isActive ? 'group-hover:scale-110' : ''}`}>
                    <FlagSVG code={code} size={24} />
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className={`font-black text-[13px] leading-tight ${isActive ? 'text-white' : 'text-gray-800'}`}>
                      {config.nativeName}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                      {code.toUpperCase()} • {config.dir.toUpperCase()}
                    </span>
                  </div>
                  {isActive && (
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyframe for dropdown animation */}
      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>

    {isLoading && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-white border border-white/10 shadow-2xl">
            <div className="w-16 h-16 border-4 border-sky-500/30 border-t-sky-400 rounded-full animate-spin shadow-[0_0_30px_rgba(56,189,248,0.3)]"></div>
            <p className="mt-6 font-black tracking-[0.2em] uppercase text-sky-300 animate-pulse text-sm" dir="ltr">
              {t('common.loading')}
            </p>
        </div>
    )}
    </>
  );
};
