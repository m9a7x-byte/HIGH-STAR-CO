
import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, languageFonts, type LanguageCode } from '../i18n';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  changeLanguage: (lang: LanguageCode) => void;
  dir: 'rtl' | 'ltr';
  languages: typeof supportedLanguages;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

// Dynamic CSS injection for font overrides per language
const FONT_STYLE_ID = 'voga-dynamic-font';

function applyFontToDocument(lang: LanguageCode) {
  const font = languageFonts[lang] || languageFonts.ar;
  
  // Remove previous dynamic style
  let styleEl = document.getElementById(FONT_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = FONT_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  
  // Override font on ALL elements - this takes priority over index.html defaults
  styleEl.textContent = `
    *:not(.voga-brand-logo):not(.voga-brand-logo *), *:not(.voga-brand-logo):not(.voga-brand-logo *)::before, *:not(.voga-brand-logo):not(.voga-brand-logo *)::after {
      font-family: ${font} !important;
    }
    .voga-brand-logo, .voga-brand-logo * {
      font-family: 'Times New Roman', Times, serif !important;
    }
  `;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const currentLanguage = (i18n.language || 'ar') as LanguageCode;
  const langConfig = supportedLanguages[currentLanguage] || supportedLanguages.ar;
  const dir = langConfig.dir;

  const updateDocumentSettings = useCallback((lang: LanguageCode) => {
    const config = supportedLanguages[lang] || supportedLanguages.ar;
    
    document.documentElement.dir = config.dir;
    document.documentElement.lang = lang;
    
    // Apply font using dynamic CSS injection for full coverage
    applyFontToDocument(lang);
  }, []);

  const changeLanguage = useCallback((lang: LanguageCode) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('voga-language', lang);
    updateDocumentSettings(lang);
  }, [i18n, updateDocumentSettings]);

  useEffect(() => {
    updateDocumentSettings(currentLanguage);
  }, [currentLanguage, updateDocumentSettings]);

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, dir, languages: supportedLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
