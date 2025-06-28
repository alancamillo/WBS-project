import React from 'react';
import { Select, Tooltip } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

interface LanguageSelectorProps {
  className?: string;
  size?: 'small' | 'middle' | 'large';
  showLabel?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className, 
  size = 'middle',
  showLabel = false 
}) => {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'pt', name: t('language.languages.pt'), nativeName: 'Português' },
    { code: 'en', name: t('language.languages.en'), nativeName: 'English' },
    { code: 'es', name: t('language.languages.es'), nativeName: 'Español' },
    { code: 'zh', name: t('language.languages.zh'), nativeName: '中文' },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === i18n.language);
  };

  const currentLang = getCurrentLanguage();

  return (
    <div className={className}>
      {showLabel && (
        <span style={{ marginRight: 8, fontSize: '14px' }}>
          {t('language.title')}:
        </span>
      )}
      <Tooltip title={t('language.select')}>
        <Select
          value={i18n.language}
          onChange={handleLanguageChange}
          size={size}
          style={{ minWidth: 120 }}
          suffixIcon={<GlobalOutlined />}
        >
          {languages.map((language) => (
            <Option key={language.code} value={language.code}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{language.nativeName}</span>
                {language.code === i18n.language && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#1890ff', 
                    fontWeight: 'bold' 
                  }}>
                    ✓
                  </span>
                )}
              </span>
            </Option>
          ))}
        </Select>
      </Tooltip>
      
      {currentLang && (
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginTop: 4,
          display: showLabel ? 'block' : 'none'
        }}>
          {t('language.current')}: {currentLang.nativeName}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector; 