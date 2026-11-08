
import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { FlagSVG } from './LanguageSwitcher';
import type { LanguageCode } from '../../i18n';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/db';

/**
 * Floating Language Switcher - Modern dropdown for login/landing pages
 */
export const FloatingLanguageSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [isEnabled, setIsEnabled] = useState(db.isLanguageSwitcherEnabled());
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="fixed top-12 left-4 z-[200]" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-4 py-2.5 backdrop-blur-xl rounded-2xl shadow-lg border transition-all duration-300 group active:scale-95 ${
          isOpen 
            ? 'bg-white shadow-2xl border-gray-200 scale-105' 
            : 'bg-white/90 border-gray-200/50 hover:bg-white hover:shadow-xl hover:scale-105'
        }`}
      >
        <FlagSVG code={currentLanguage} size={20} />
        <span className="text-xs font-black text-gray-700">
          {languages[currentLanguage]?.nativeName}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full mt-2 left-0 bg-white rounded-2xl overflow-hidden min-w-[240px]"
          style={{ 
            boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            animation: 'floatDropIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
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
                    changeLanguage(code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0e3c63] to-[#1a5a8a] text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <div className={`transition-transform duration-200 ${!isActive ? 'group-hover:scale-110' : ''}`}>
                    <FlagSVG code={code} size={26} />
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className={`font-black text-[13px] leading-tight ${isActive ? 'text-white' : 'text-gray-800'}`}>
                      {config.nativeName}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                      {config.name !== config.nativeName ? config.name : code.toUpperCase()}
                    </span>
                  </div>
                  {isActive ? (
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100">
            <p className="text-[8px] font-bold text-gray-400 text-center uppercase tracking-[0.2em]">
              VOGA • {t('common.multilingual_system')}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatDropIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
