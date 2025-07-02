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
  Progress,
  Tabs,
  Badge
} from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  TrophyOutlined,
  ApartmentOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCurrencySettings } from '../hooks/useCurrencySettings';
import { ImportService, ImportResult } from '../services/importService';
import { TreeNode, ImportWarning, UnifiedImportResult } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { TabPane } = Tabs;

interface ImportWBSProps {
  open: boolean;
  onClose: () => void;
  onImport: (result: ImportResult) => void;
  onImportUnified?: (result: UnifiedImportResult) => void;
}

const ImportWBS: React.FC<ImportWBSProps> = ({ open, onClose, onImport, onImportUnified }) => {
  const { t } = useTranslation();
  const { formatCurrency, getCurrencySymbol } = useCurrencySettings();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [unifiedResult, setUnifiedResult] = useState<UnifiedImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUnifiedFormat, setIsUnifiedFormat] = useState(false);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setSelectedFile(file);
    
    try {
      // Primeiro, tentar importar como formato unificado
      const unifiedImportResult = await ImportService.importUnifiedFromJSON(file);
      
      if (unifiedImportResult.success && unifiedImportResult.data) {
        // É formato unificado - usar o novo sistema
        setUnifiedResult(unifiedImportResult);
        setIsUnifiedFormat(true);
        setCurrentStep('preview');
      } else {
        // Tentar formato legado
        const legacyResult = await ImportService.importFile(file);
        setImportResult(legacyResult);
        setIsUnifiedFormat(false);
        
        if (legacyResult.success) {
          setCurrentStep('preview');
        }
      }
    } catch (error) {
      // Fallback para formato legado em caso de erro
      try {
        const legacyResult = await ImportService.importFile(file);
        setImportResult(legacyResult);
        setIsUnifiedFormat(false);
        
        if (legacyResult.success) {
          setCurrentStep('preview');
        }
      } catch (legacyError) {
        setImportResult({
          success: false,
          errors: [{
            message: `${t('importWBS.unexpectedError')} ${error instanceof Error ? error.message : t('messages.error.networkError')}`,
            severity: 'error'
          }],
          warnings: []
        });
        setIsUnifiedFormat(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (isUnifiedFormat && unifiedResult?.success && onImportUnified) {
      onImportUnified(unifiedResult);
    } else if (!isUnifiedFormat && importResult?.success) {
      onImport(importResult);
    }
    
    setCurrentStep('complete');
    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setCurrentStep('upload');
    setImportResult(null);
    setUnifiedResult(null);
    setSelectedFile(null);
    setIsUnifiedFormat(false);
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
    // Determinar dados baseado no formato detectado
    let rootNode: TreeNode | undefined;
    let summary: any;
    let warnings: ImportWarning[] = [];
    let risks: any[] = [];
    let meritFigures: any[] = [];
    let isFormatUnified = false;

    if (isUnifiedFormat && unifiedResult?.success && unifiedResult.data) {
      rootNode = unifiedResult.data.wbsStructure;
      summary = unifiedResult.summary;
      warnings = unifiedResult.warnings;
      risks = unifiedResult.data.risks || [];
      meritFigures = unifiedResult.data.meritFigures || [];
      isFormatUnified = true;
    } else if (!isUnifiedFormat && importResult?.success && importResult.data) {
      rootNode = importResult.data;
      summary = importResult.summary;
      warnings = importResult.warnings;
      risks = importResult.risks || [];
      meritFigures = importResult.meritFigures || [];
      isFormatUnified = false;
    }

    if (!rootNode) return null;
    
    // Debug: Log dos dados importados
    console.log('🔍 [ImportWBS Preview] Dados importados:', {
      rootNode: rootNode,
      summary: summary,
      rootNodeTotalCost: rootNode?.totalCost,
      rootNodeCost: rootNode?.cost,
      childrenCount: rootNode?.children?.length
    });

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
              <Statistic 
                title={t('importWBS.totalNodes')} 
                value={isFormatUnified ? summary?.wbs?.totalNodes : summary?.totalNodes} 
                prefix={<ApartmentOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title={t('navigation.risks')} 
                value={isFormatUnified ? summary?.risks?.totalRisks : risks.length} 
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: risks.length > 0 ? '#fa8c16' : '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title={t('navigation.meritFigures')} 
                value={isFormatUnified ? summary?.meritFigures?.totalFigures : meritFigures.length} 
                prefix={<TrophyOutlined />}
                valueStyle={{ color: meritFigures.length > 0 ? '#52c41a' : '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title={t('importWBS.totalCost')}
                value={isFormatUnified ? rootNode.totalCost : summary?.totalCost}
                prefix={getCurrencySymbol()}
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={t('importWBS.level1')}
                value={isFormatUnified ? summary?.wbs?.nodesByLevel?.[1] || 0 : summary?.level1Nodes}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={t('importWBS.level2')}
                value={isFormatUnified ? summary?.wbs?.nodesByLevel?.[2] || 0 : summary?.level2Nodes}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={t('importWBS.level3')}
                value={isFormatUnified ? summary?.wbs?.nodesByLevel?.[3] || 0 : summary?.level3Nodes}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Status e formato */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
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
          <Col span={12}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', color: isFormatUnified ? '#52c41a' : '#1890ff' }}>
                  {isFormatUnified ? '🚀' : '📊'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '8px' }}>
                  {isFormatUnified ? t('importWBS.unifiedFormat') : t('importWBS.legacyFormat')}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {isFormatUnified ? t('importWBS.unifiedFormatDesc') : t('importWBS.legacyFormatDesc')}
                </div>
              </div>
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

        {/* Tabs com detalhes da importação */}
        <Card style={{ marginBottom: 16 }}>
          <Tabs defaultActiveKey="wbs">
            <TabPane 
              tab={
                <span>
                  <ApartmentOutlined />
                  {' '}{t('navigation.wbs')} 
                  <Badge count={isFormatUnified ? summary?.wbs?.totalNodes : summary?.totalNodes} 
                         style={{ backgroundColor: '#1890ff', marginLeft: 8 }} />
                </span>
              } 
              key="wbs"
            >
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
            </TabPane>

            {risks.length > 0 && (
              <TabPane 
                tab={
                  <span>
                    <ExclamationCircleOutlined />
                    {' '}{t('navigation.risks')} 
                    <Badge count={risks.length} style={{ backgroundColor: '#fa8c16', marginLeft: 8 }} />
                  </span>
                } 
                key="risks"
              >
                <List
                  dataSource={risks.slice(0, 10)} // Mostrar apenas os primeiros 10
                  renderItem={(risk: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={risk.title}
                        description={
                          <div>
                            <Tag color={risk.category === 'technical' ? 'blue' : 
                                       risk.category === 'financial' ? 'green' : 
                                       risk.category === 'operational' ? 'orange' : 'red'}>
                              {risk.category}
                            </Tag>
                            <Tag color={risk.status === 'identified' ? 'default' :
                                       risk.status === 'assessed' ? 'processing' :
                                       risk.status === 'mitigated' ? 'success' : 'warning'}>
                              {risk.status}
                            </Tag>
                            <span style={{ marginLeft: 8, color: '#666' }}>
                              {risk.description}
                            </span>
                          </div>
                        }
                      />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', 
                                     color: risk.riskScore > 8 ? '#f5222d' : 
                                           risk.riskScore > 5 ? '#fa8c16' : '#52c41a' }}>
                          {risk.riskScore}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          Score
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
                {risks.length > 10 && (
                  <div style={{ textAlign: 'center', marginTop: 16, color: '#8c8c8c' }}>
                    {t('importWBS.showingFirstItems', { count: 10, total: risks.length })}
                  </div>
                )}
              </TabPane>
            )}

            {meritFigures.length > 0 && (
              <TabPane 
                tab={
                  <span>
                    <TrophyOutlined />
                    {' '}{t('navigation.meritFigures')} 
                    <Badge count={meritFigures.length} style={{ backgroundColor: '#52c41a', marginLeft: 8 }} />
                  </span>
                } 
                key="meritFigures"
              >
                <List
                  dataSource={meritFigures.slice(0, 10)} // Mostrar apenas os primeiros 10
                  renderItem={(figure: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={figure.name}
                        description={
                          <div>
                            <Tag color={figure.category === 'cost' ? 'blue' : 
                                       figure.category === 'time' ? 'green' : 
                                       figure.category === 'quality' ? 'orange' : 
                                       figure.category === 'scope' ? 'purple' : 'default'}>
                              {figure.category}
                            </Tag>
                            <Tag color={figure.status === 'on-track' ? 'success' :
                                       figure.status === 'at-risk' ? 'warning' :
                                       figure.status === 'off-track' ? 'error' : 'default'}>
                              {figure.status}
                            </Tag>
                            <span style={{ marginLeft: 8, color: '#666' }}>
                              {figure.description}
                            </span>
                          </div>
                        }
                      />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {figure.baselineValue} → {figure.currentValue} → {figure.targetValue} {figure.unit}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {t('meritFigures.form.weight')}: {figure.weight}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
                {meritFigures.length > 10 && (
                  <div style={{ textAlign: 'center', marginTop: 16, color: '#8c8c8c' }}>
                    {t('importWBS.showingFirstItems', { count: 10, total: meritFigures.length })}
                  </div>
                )}
              </TabPane>
            )}
          </Tabs>
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