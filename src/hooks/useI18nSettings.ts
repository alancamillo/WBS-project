import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface I18nSettings {
  language: string;
  detectedLanguage: string;
  isAutoDetected: boolean;
  availableLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;
}

const SETTINGS_STORAGE_KEY = 'wbs-i18n-settings';

export const useI18nSettings = () => {
  const { i18n, t } = useTranslation();
  
  const availableLanguages = [
    { code: 'pt', name: t('language.languages.pt'), nativeName: 'Português' },
    { code: 'en', name: t('language.languages.en'), nativeName: 'English' },
    { code: 'es', name: t('language.languages.es'), nativeName: 'Español' },
    { code: 'zh', name: t('language.languages.zh'), nativeName: '中文' },
  ];

  const [settings, setSettings] = useState<I18nSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        return {
          ...parsedSettings,
          availableLanguages,
        };
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações de i18n:', error);
    }

    // Configurações padrão
    const detectedLanguage = getDetectedLanguage();
    return {
      language: i18n.language,
      detectedLanguage,
      isAutoDetected: i18n.language === detectedLanguage,
      availableLanguages,
    };
  });

  // Função para detectar o idioma do navegador
  function getDetectedLanguage(): string {
    const browserLanguage = navigator.language || (navigator as any).userLanguage;
    const languageCode = browserLanguage.split('-')[0].toLowerCase();
    
    // Verificar se o idioma detectado está disponível
    const isAvailable = availableLanguages.some(lang => lang.code === languageCode);
    return isAvailable ? languageCode : 'pt'; // fallback para português
  }

  // Função para alterar idioma
  const changeLanguage = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      
      const newSettings = {
        ...settings,
        language: languageCode,
        isAutoDetected: languageCode === settings.detectedLanguage,
      };
      
      setSettings(newSettings);
      saveSettings(newSettings);
      
      return true;
    } catch (error) {
      console.error('Erro ao alterar idioma:', error);
      return false;
    }
  };

  // Função para salvar configurações
  const saveSettings = (newSettings: I18nSettings) => {
    try {
      const settingsToSave = {
        language: newSettings.language,
        detectedLanguage: newSettings.detectedLanguage,
        isAutoDetected: newSettings.isAutoDetected,
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Erro ao salvar configurações de i18n:', error);
    }
  };

  // Função para resetar para detecção automática
  const resetToAutoDetect = async () => {
    const detectedLanguage = getDetectedLanguage();
    return await changeLanguage(detectedLanguage);
  };

  // Função para obter informações do idioma atual
  const getCurrentLanguageInfo = () => {
    return availableLanguages.find(lang => lang.code === i18n.language);
  };

  // Atualizar configurações quando o idioma mudar
  useEffect(() => {
    const handleLanguageChange = (language: string) => {
      setSettings(prev => ({
        ...prev,
        language,
        isAutoDetected: language === prev.detectedLanguage,
      }));
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, settings.detectedLanguage]);

  // Detectar mudanças no idioma do navegador
  useEffect(() => {
    const handleLanguageChange = () => {
      const newDetectedLanguage = getDetectedLanguage();
      if (newDetectedLanguage !== settings.detectedLanguage) {
        setSettings(prev => ({
          ...prev,
          detectedLanguage: newDetectedLanguage,
          isAutoDetected: prev.language === newDetectedLanguage,
        }));
      }
    };

    window.addEventListener('languagechange', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, [settings.detectedLanguage]);

  return {
    settings,
    changeLanguage,
    resetToAutoDetect,
    getCurrentLanguageInfo,
    availableLanguages,
    isLanguageSupported: (languageCode: string) => 
      availableLanguages.some(lang => lang.code === languageCode),
  };
}; 