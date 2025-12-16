import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCn from './locales/zh-cn.json';
import en from './locales/en.json';

// Detect VS Code language
const getVSCodeLanguage = (): string => {
  // VS Code exposes the language through the DOM attribute or we can default to 'en'
  const htmlLang = document.documentElement.lang || 'en';
  return htmlLang.startsWith('zh') ? 'zh-CN' : 'en';
};

i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCn },
    },
    lng: getVSCodeLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18next;
