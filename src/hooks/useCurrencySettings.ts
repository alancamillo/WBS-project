import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface CurrencyConfig {
  code: string;
  locale: string;
  name: string;
  symbol: string;
}

export interface CurrencySettings {
  currency: CurrencyConfig;
  availableCurrencies: CurrencyConfig[];
}

const CURRENCY_STORAGE_KEY = 'wbs-currency-settings';

// Configurações base das moedas (sem tradução)
const baseCurrencies = [
  { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  { code: 'USD', locale: 'en-US', symbol: '$' },
  { code: 'EUR', locale: 'es-ES', symbol: '€' },
  { code: 'CNY', locale: 'zh-CN', symbol: '¥' },
  { code: 'GBP', locale: 'en-GB', symbol: '£' },
  { code: 'JPY', locale: 'ja-JP', symbol: '¥' },
];

export const useCurrencySettings = () => {
  const { t } = useTranslation();
  
  // Carrega a moeda salva do localStorage (apenas o código)
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        const currencyCode = parsedSettings.currency?.code;
        // Verifica se o código existe na lista de moedas base
        if (currencyCode && baseCurrencies.find(c => c.code === currencyCode)) {
          return currencyCode;
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações de moeda:', error);
    }
    
    // Padrão: BRL
    return 'BRL';
  });

  // Cria o array de moedas disponíveis com traduções
  const availableCurrencies: CurrencyConfig[] = useMemo(() => [
    { code: 'BRL', locale: 'pt-BR', name: t('settings.currencies.BRL'), symbol: 'R$' },
    { code: 'USD', locale: 'en-US', name: t('settings.currencies.USD'), symbol: '$' },
    { code: 'EUR', locale: 'es-ES', name: t('settings.currencies.EUR'), symbol: '€' },
    { code: 'CNY', locale: 'zh-CN', name: t('settings.currencies.CNY'), symbol: '¥' },
    { code: 'GBP', locale: 'en-GB', name: t('settings.currencies.GBP'), symbol: '£' },
    { code: 'JPY', locale: 'ja-JP', name: t('settings.currencies.JPY'), symbol: '¥' },
  ], [t]);

  // Cria o objeto de configurações baseado na moeda selecionada
  const settings: CurrencySettings = useMemo(() => {
    const currency = availableCurrencies.find(c => c.code === selectedCurrencyCode) || availableCurrencies[0];
    return {
      currency,
      availableCurrencies,
    };
  }, [selectedCurrencyCode, availableCurrencies]);

  // Função para salvar configurações no localStorage
  const saveCurrencyCode = useCallback((currencyCode: string) => {
    try {
      const settingsToSave = {
        currency: { code: currencyCode },
      };
      localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Erro ao salvar configurações de moeda:', error);
    }
  }, []);

  // Função para alterar moeda
  const changeCurrency = useCallback((currencyCode: string) => {
    const currencyExists = baseCurrencies.find(c => c.code === currencyCode);
    if (!currencyExists) {
      console.error('Moeda não encontrada:', currencyCode);
      return false;
    }

    setSelectedCurrencyCode(currencyCode);
    saveCurrencyCode(currencyCode);
    return true;
  }, [saveCurrencyCode]);

  // Função para formatar valor monetário
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat(settings.currency.locale, {
      style: 'currency',
      currency: settings.currency.code
    }).format(value);
  }, [settings.currency]);

  // Função para obter símbolo da moeda
  const getCurrencySymbol = useCallback(() => {
    return settings.currency.symbol;
  }, [settings.currency]);

  // Função para obter informações da moeda atual
  const getCurrentCurrencyInfo = useCallback(() => {
    return settings.currency;
  }, [settings.currency]);

  return {
    settings,
    changeCurrency,
    formatCurrency,
    getCurrencySymbol,
    getCurrentCurrencyInfo,
    availableCurrencies,
    isCurrencySupported: (currencyCode: string) => 
      availableCurrencies.some(c => c.code === currencyCode),
  };
}; 