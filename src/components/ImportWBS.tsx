import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Alert,
  Table,
  Typography,
  Space,
  Card,
  Statistic,
  Row,
  Col,
  List,
  Tag,
  Progress
} from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCurrencySettings } from '../hooks/useCurrencySettings';
import { ImportService, ImportResult } from '../services/importService';
import { TreeNode, ImportWarning } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface ImportWBSProps {
  open: boolean;
  onClose: () => void;
  onImport: (result: ImportResult) => void;
}

const ImportWBS: React.FC<ImportWBSProps> = ({ open, onClose, onImport }) => {
  const { t } = useTranslation();
  const { formatCurrency, getCurrencySymbol } = useCurrencySettings();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setSelectedFile(file);
    
    try {
      const result = await ImportService.importFile(file);
      setImportResult(result);
      
      if (result.success) {
        setCurrentStep('preview');
      }
    } catch (error) {
      setImportResult({
        success: false,
        errors: [{
          message: `${t('importWBS.unexpectedError')} ${error instanceof Error ? error.message : t('messages.error.networkError')}`,
          severity: 'error'
        }],
        warnings: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (importResult?.success) {
      onImport(importResult);
      setCurrentStep('complete');
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    setCurrentStep('upload');
    setImportResult(null);
    setSelectedFile(null);
    onClose();
  };

  const renderUploadStep = () => (
    <div>
      <Title level={4}>{t('importWBS.title')}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {t('importWBS.description')}
      </Text>

      <Dragger
        name="file"
        multiple={false}
        showUploadList={false}
        beforeUpload={(file) => {
          handleFileUpload(file);
          return false; // Impede upload automático
        }}
        disabled={loading}
      >
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">
          {t('importWBS.dragDropText')}
        </p>
        <p className="ant-upload-hint">
          {t('importWBS.supportedFormats')}
        </p>
      </Dragger>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Progress type="circle" percent={50} status="active" />
          <br />
          <Text>{t('importWBS.processing')}</Text>
        </div>
      )}

      {importResult && !importResult.success && (
        <Alert
          message={t('importWBS.importError')}
          description={
            <List
              size="small"
              dataSource={importResult.errors}
              renderItem={(error: ImportWarning) => (
                <List.Item>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                                      {error.message}
                </List.Item>
              )}
            />
          }
          type="error"
          style={{ marginTop: 16 }}
        />
      )}

      <Card title={t('importWBS.supportedFormatsTitle')} style={{ marginTop: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={5}>JSON</Title>
              <Text type="secondary">{t('importWBS.jsonDescription')}</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <Title level={5}>Excel</Title>
              <Text type="secondary">{t('importWBS.excelDescription')}</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <FileTextOutlined style={{ fontSize: 24, color: '#faad14' }} />
              <Title level={5}>CSV</Title>
              <Text type="secondary">{t('importWBS.csvDescription')}</Text>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );

  const renderPreviewStep = () => {
    if (!importResult?.success || !importResult.data) return null;

    const { data: rootNode, summary, warnings } = importResult;

    // Flattened data for table
    const tableData: any[] = [];
        const flattenTree = (node: TreeNode, level: number = 0) => {
      if (!node || !node.id || !node.name) return;
      
      const tableRow = {
        key: node.id,
        name: '  '.repeat(level) + node.name,
        level: node.level || 1,
        cost: typeof node.cost === 'number' ? node.cost : 0,
        totalCost: typeof node.totalCost === 'number' ? node.totalCost : 0,
        childrenCount: Array.isArray(node.children) ? node.children.length : 0,
        description: node.description || '-',
        responsible: node.responsible || '-'
      };
      
      tableData.push(tableRow);
      
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
          if (child) {
            flattenTree(child, level + 1);
          }
        });
      }
    };
    
    if (rootNode) {
      flattenTree(rootNode);
    }

    const columns = [
      {
        title: t('importWBS.columns.name'),
        dataIndex: 'name',
        key: 'name',
        width: '30%',
      },
      {
        title: t('importWBS.columns.level'),
        dataIndex: 'level',
        key: 'level',
        width: '8%',
        render: (level: number) => <Tag color={level === 1 ? 'blue' : level === 2 ? 'green' : 'orange'}>{level}</Tag>
      },
      {
        title: t('importWBS.columns.ownCost'),
        dataIndex: 'cost',
        key: 'cost',
        width: '12%',
        render: (cost: number) => formatCurrency(cost)
      },
      {
        title: t('importWBS.columns.totalCost'),
        dataIndex: 'totalCost',
        key: 'totalCost',
        width: '12%',
        render: (cost: number) => formatCurrency(cost)
      },
      {
        title: t('importWBS.columns.children'),
        dataIndex: 'childrenCount',
        key: 'childrenCount',
        width: '8%',
      },
      {
        title: t('importWBS.columns.responsible'),
        dataIndex: 'responsible',
        key: 'responsible',
        width: '15%',
      }
    ];

    return (
      <div>
        <Title level={4}>{t('importWBS.previewTitle')}</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          {t('importWBS.file')} <strong>{selectedFile?.name}</strong>
        </Text>

        {/* Summary Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title={t('importWBS.totalNodes')} value={summary?.totalNodes} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title={t('importWBS.level1')} value={summary?.level1Nodes} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title={t('importWBS.level2')} value={summary?.level2Nodes} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title={t('importWBS.level3')} value={summary?.level3Nodes} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title={t('importWBS.totalCost')}
                value={summary?.totalCost}
                prefix={getCurrencySymbol()}
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title={t('importWBS.status')}
                value={t('importWBS.readyToImport')}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Warnings */}
        {warnings.length > 0 && (
          <Alert
            message={`${warnings.length} ${t('importWBS.warningsFound')}`}
            description={
              <List
                size="small"
                dataSource={warnings.slice(0, 5)}
                renderItem={(warning: ImportWarning) => (
                  <List.Item>
                    <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    {warning.message}
                  </List.Item>
                )}
              />
            }
            type="warning"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Structure Preview Table */}
        <Card title={t('importWBS.importedStructure')} style={{ marginBottom: 16 }}>
          {Array.isArray(tableData) && tableData.length > 0 ? (
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ y: 400 }}
              rowKey="key"
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">{t('importWBS.noDataToDisplay')}</Text>
            </div>
          )}
        </Card>

        <Space>
          <Button onClick={() => setCurrentStep('upload')}>
            {t('importWBS.back')}
          </Button>
          <Button type="primary" onClick={handleConfirmImport}>
            {t('importWBS.confirmImport')}
          </Button>
        </Space>
      </div>
    );
  };

  const renderCompleteStep = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a', marginBottom: 24 }} />
      <Title level={3}>{t('importWBS.importCompleted')}</Title>
      <Text type="secondary">
        {t('importWBS.importSuccess')}
      </Text>
      <div style={{ marginTop: 32 }}>
        <Progress percent={100} status="success" />
      </div>
    </div>
  );

  return (
    <Modal
      title={t('importWBS.modalTitle')}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={currentStep === 'preview' ? 1200 : 800}
      destroyOnHidden
    >
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'preview' && renderPreviewStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </Modal>
  );
};

export default ImportWBS; 