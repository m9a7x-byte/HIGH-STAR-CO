import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import ku from './locales/ku.json';
import tkm from './locales/tkm.json';
import tr from './locales/tr.json';
import en from './locales/en.json';

// Language codes type
export type LanguageCode = 'ar' | 'ku' | 'tkm' | 'tr' | 'en';

// Font families for each language (all loaded locally from src/assets/fonts/)
export const languageFonts: Record<LanguageCode, string> = {
  ar: '"Cairo", sans-serif',
  ku: '"Vazirmatn", "Cairo", sans-serif',
  tkm: '"Vazirmatn", "Cairo", sans-serif',
  tr: '"Inter", "Segoe UI", sans-serif',
  en: '"Inter", "Segoe UI", sans-serif',
};

// Supported languages configuration (ordered: Arabic, Kurdish, Turkmen, Turkish, English)
// NOTE: Language names are intentionally hardcoded - they always display in their native script
export const supportedLanguages: Record<LanguageCode, { name: string; nativeName: string; flag: string; dir: 'rtl' | 'ltr'; font: string }> = {
  ar: { name: 'العربية', nativeName: 'العربية', flag: 'iq', dir: 'rtl', font: languageFonts.ar },
  ku: { name: 'كوردی', nativeName: 'کوردی', flag: 'iq', dir: 'rtl', font: languageFonts.ku },
  tkm: { name: 'تركمانی', nativeName: 'تورکمانجه', flag: 'iq', dir: 'rtl', font: languageFonts.tkm },
  tr: { name: 'تركی', nativeName: 'Türkçe', flag: 'tr', dir: 'ltr', font: languageFonts.tr },
  en: { name: 'English', nativeName: 'English', flag: 'gb', dir: 'ltr', font: languageFonts.en },
};

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    ku: { translation: ku },
    tkm: { translation: tkm },
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: localStorage.getItem('voga-language') || 'ar',
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

export default i18n;
