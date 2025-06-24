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
import { ImportService, ImportResult, ImportValidationError } from '../services/importService';
import { TreeNode } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface ImportWBSProps {
  visible: boolean;
  onClose: () => void;
  onImport: (rootNode: TreeNode) => void;
}

const ImportWBS: React.FC<ImportWBSProps> = ({ visible, onClose, onImport }) => {
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
          message: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          severity: 'error'
        }],
        warnings: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (importResult?.success && importResult.data) {
      onImport(importResult.data);
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
      <Title level={4}>Importar Estrutura WBS</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Selecione um arquivo para importar sua estrutura de trabalho. Formatos suportados: JSON, Excel (.xlsx/.xls), CSV
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
          Clique ou arraste um arquivo para esta área
        </p>
        <p className="ant-upload-hint">
          Suporte para JSON, Excel (.xlsx/.xls) e CSV
        </p>
      </Dragger>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Progress type="circle" percent={50} status="active" />
          <br />
          <Text>Processando arquivo...</Text>
        </div>
      )}

      {importResult && !importResult.success && (
        <Alert
          message="Erro na Importação"
          description={
            <List
              size="small"
              dataSource={importResult.errors}
              renderItem={(error: ImportValidationError) => (
                <List.Item>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                  {error.line && `Linha ${error.line}: `}
                  {error.message}
                </List.Item>
              )}
            />
          }
          type="error"
          style={{ marginTop: 16 }}
        />
      )}

      <Card title="Formatos Suportados" style={{ marginTop: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={5}>JSON</Title>
              <Text type="secondary">Estrutura WBS completa com metadados</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <Title level={5}>Excel</Title>
              <Text type="secondary">Planilhas .xlsx/.xls com hierarquia</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <FileTextOutlined style={{ fontSize: 24, color: '#faad14' }} />
              <Title level={5}>CSV</Title>
              <Text type="secondary">Dados tabulares separados por vírgula</Text>
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
        title: 'Nome',
        dataIndex: 'name',
        key: 'name',
        width: '30%',
      },
      {
        title: 'Nível',
        dataIndex: 'level',
        key: 'level',
        width: '8%',
        render: (level: number) => <Tag color={level === 1 ? 'blue' : level === 2 ? 'green' : 'orange'}>{level}</Tag>
      },
      {
        title: 'Custo Próprio',
        dataIndex: 'cost',
        key: 'cost',
        width: '12%',
        render: (cost: number) => `R$ ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      {
        title: 'Custo Total',
        dataIndex: 'totalCost',
        key: 'totalCost',
        width: '12%',
        render: (cost: number) => `R$ ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      {
        title: 'Filhos',
        dataIndex: 'childrenCount',
        key: 'childrenCount',
        width: '8%',
      },
      {
        title: 'Responsável',
        dataIndex: 'responsible',
        key: 'responsible',
        width: '15%',
      }
    ];

    return (
      <div>
        <Title level={4}>Preview da Importação</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Arquivo: <strong>{selectedFile?.name}</strong>
        </Text>

        {/* Summary Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Total de Nós" value={summary?.totalNodes} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Nível 1" value={summary?.level1Nodes} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Nível 2" value={summary?.level2Nodes} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Nível 3" value={summary?.level3Nodes} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="Custo Total"
                value={summary?.totalCost}
                prefix="R$"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="Status"
                value="Pronto para Importar"
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Warnings */}
        {warnings.length > 0 && (
          <Alert
            message={`${warnings.length} Aviso(s) Encontrado(s)`}
            description={
              <List
                size="small"
                dataSource={warnings.slice(0, 5)}
                renderItem={(warning: ImportValidationError) => (
                  <List.Item>
                    <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    {warning.line && `Linha ${warning.line}: `}
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
        <Card title="Estrutura Importada" style={{ marginBottom: 16 }}>
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
              <Text type="secondary">Nenhum dado para exibir</Text>
            </div>
          )}
        </Card>

        <Space>
          <Button onClick={() => setCurrentStep('upload')}>
            Voltar
          </Button>
          <Button type="primary" onClick={handleConfirmImport}>
            Confirmar Importação
          </Button>
        </Space>
      </div>
    );
  };

  const renderCompleteStep = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a', marginBottom: 24 }} />
      <Title level={3}>Importação Concluída!</Title>
      <Text type="secondary">
        Sua estrutura WBS foi importada com sucesso.
      </Text>
      <div style={{ marginTop: 32 }}>
        <Progress percent={100} status="success" />
      </div>
    </div>
  );

  return (
    <Modal
      title="Importar WBS"
      visible={visible}
      onCancel={handleClose}
      footer={null}
      width={currentStep === 'preview' ? 1200 : 800}
      destroyOnClose
    >
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'preview' && renderPreviewStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </Modal>
  );
};

export default ImportWBS; 