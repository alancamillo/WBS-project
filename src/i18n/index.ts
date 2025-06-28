import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar os recursos de tradução
import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';

// Configuração de detecção de idioma
const detectionOptions = {
  // Ordem de detecção: 1) localStorage, 2) navigator, 3) fallback
  order: ['localStorage', 'navigator', 'htmlTag'],
  
  // Chave para armazenar no localStorage
  lookupLocalStorage: 'i18nextLng',
  
  // Cache no localStorage
  caches: ['localStorage'],
  
  // Não excluir do cache mesmo se não encontrar
  excludeCacheFor: ['cimode'],
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
      zh: { translation: zh },
    },
    
    // Idioma padrão se não conseguir detectar
    fallbackLng: 'pt',
    
    // Namespace padrão
    defaultNS: 'translation',
    
    // Configurações de detecção
    detection: detectionOptions,
    
    // Interpolação
    interpolation: {
      escapeValue: false, // React já escapa por padrão
    },
    
    // Configurações de debug (apenas em desenvolvimento)
    debug: process.env.NODE_ENV === 'development',
    
    // Configurações de formato
    pluralSeparator: '_',
    contextSeparator: '_',
    
    // Configurações para fallback
    parseMissingKeyHandler: (key: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation key: ${key}`);
      }
      return key;
    },
  });

export default i18n; 