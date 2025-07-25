import React, { useState } from 'react';
import { Modal, Tabs, Form, Select, Switch, Card, Space, Button, message, Divider, Tag, Typography } from 'antd';
import { SettingOutlined, GlobalOutlined, ReloadOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useI18nSettings } from '../hooks/useI18nSettings';
import { useCurrencySettings } from '../hooks/useCurrencySettings';

// Removed TabPane destructuring - using items format now
const { Text, Title } = Typography;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { settings, changeLanguage, resetToAutoDetect, getCurrentLanguageInfo, availableLanguages } = useI18nSettings();
  const { settings: currencySettings, changeCurrency, getCurrentCurrencyInfo, availableCurrencies } = useCurrencySettings();
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    setLoading(true);
    try {
      const success = await changeLanguage(languageCode);
      if (success) {
        message.success(t('messages.success.settingsUpdated'));
      } else {
        message.error(t('messages.error.networkError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetToAutoDetect = async () => {
    setLoading(true);
    try {
      const success = await resetToAutoDetect();
      if (success) {
        message.success(t('messages.success.settingsUpdated'));
      } else {
        message.error(t('messages.error.networkError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const success = changeCurrency(currencyCode);
    if (success) {
      message.success(t('messages.success.settingsUpdated'));
    } else {
      message.error(t('messages.error.networkError'));
    }
  };

  const currentLanguageInfo = getCurrentLanguageInfo();
  const detectedLanguageInfo = availableLanguages.find(lang => lang.code === settings.detectedLanguage);

  const languageTabContent = (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Informações sobre idioma atual */}
      <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>{t('language.current')}: </Text>
            <Tag color="green">
              {currentLanguageInfo?.nativeName} ({currentLanguageInfo?.code?.toUpperCase()})
            </Tag>
            {settings.isAutoDetected && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {t('settings.autoDetect')} ✓
              </Tag>
            )}
          </div>
          {detectedLanguageInfo && (
            <div>
              <Text type="secondary">
                {t('language.detected')}: {detectedLanguageInfo.nativeName} ({detectedLanguageInfo.code.toUpperCase()})
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {/* Seletor de idioma */}
      <Form layout="vertical">
        <Form.Item label={t('language.select')}>
          <Select
            value={settings.language}
            onChange={handleLanguageChange}
            loading={loading}
            size="large"
            style={{ width: '100%' }}
          >
            {availableLanguages.map((language) => (
              <Select.Option key={language.code} value={language.code}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <span>{language.nativeName}</span>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {language.name}
                  </Text>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Opção de reset para detecção automática */}
        {!settings.isAutoDetected && (
          <Form.Item>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetToAutoDetect}
              loading={loading}
              type="dashed"
              style={{ width: '100%' }}
            >
              {t('settings.resetToAutoDetect')}
            </Button>
          </Form.Item>
        )}
      </Form>

      <Divider />

      {/* Informações sobre os idiomas suportados */}
      <div>
        <Title level={5}>{t('language.supportedLanguages')}:</Title>
        <Space wrap>
          {availableLanguages.map((language) => (
            <Tag 
              key={language.code}
              color={language.code === settings.language ? 'green' : 'default'}
              style={{ marginBottom: 8 }}
            >
              {language.nativeName}
            </Tag>
          ))}
        </Space>
      </div>

      {/* Informações sobre persistência */}
      <Card size="small" style={{ backgroundColor: '#f0f5ff' }}>
        <Space direction="vertical" size="small">
          <Text strong style={{ color: '#1890ff' }}>
            💾 {t('settings.persistence')}
          </Text>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {t('settings.persistenceDescription')}
          </Text>
        </Space>
      </Card>
    </Space>
  );

  const generalTabContent = (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Form layout="vertical">
        <Form.Item label={t('settings.autoSave')}>
          <Switch 
            checked={true} 
            disabled
            checkedChildren={t('settings.enabled')}
            unCheckedChildren={t('settings.disabled')}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {t('settings.autoSaveDescription')}
            </Text>
          </div>
        </Form.Item>

        <Form.Item label={t('settings.theme')}>
          <Select 
            defaultValue="light" 
            disabled
            style={{ width: '100%' }}
          >
            <Select.Option value="light">{t('settings.lightTheme')}</Select.Option>
            <Select.Option value="dark">{t('settings.darkTheme')}</Select.Option>
          </Select>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {t('settings.themeDescription')}
            </Text>
          </div>
        </Form.Item>

        <Divider />

        <Form.Item label={t('settings.currency')}>
          <Card size="small" style={{ backgroundColor: '#f6ffed', marginBottom: 16 }}>
            <div>
              <Text strong>{t('settings.currentCurrency')} </Text>
              <Tag color="green" icon={<DollarCircleOutlined />}>
                {getCurrentCurrencyInfo().name} ({getCurrentCurrencyInfo().symbol})
              </Tag>
            </div>
          </Card>
          <Select
            value={currencySettings.currency.code}
            onChange={handleCurrencyChange}
            size="large"
            style={{ width: '100%' }}
          >
            {availableCurrencies.map((currency) => (
              <Select.Option key={currency.code} value={currency.code}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <span>{currency.symbol} {currency.name}</span>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {currency.code}
                  </Text>
                </Space>
              </Select.Option>
            ))}
          </Select>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {t('settings.currencyDescription')}
            </Text>
          </div>
        </Form.Item>
      </Form>
    </Space>
  );

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          {t('settings.title')}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('buttons.close')}
        </Button>
      ]}
      width={600}
    >
      <Tabs 
        defaultActiveKey="language"
        items={[
          {
            key: 'language',
            label: (
              <Space>
                <GlobalOutlined />
                {t('settings.language')}
              </Space>
            ),
            children: languageTabContent
          },
          {
            key: 'general',
            label: (
              <Space>
                <SettingOutlined />
                {t('settings.general')}
              </Space>
            ),
            children: generalTabContent
          }
        ]}
      />
    </Modal>
  );
};

export default SettingsModal; 