import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Card,
  Statistic,
  Tag,
  Space,
  Tabs,
  Typography,
  Tooltip,
  Badge,
  Empty,
  message,
  Alert,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  BarChartOutlined,
  TableOutlined,
  BulbOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Risk, RiskMetrics, RiskFilterOptions, TreeNode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { createSampleRisks } from '../data/sampleRisks';
import type { ColumnsType } from 'antd/es/table';
import RiskMatrix from './RiskMatrix';
import './RiskManagement.css';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;
const { TabPane } = Tabs;

interface RiskManagementProps {
  rootNode: TreeNode;
}

// Chave para localStorage
const RISKS_STORAGE_KEY = 'wbs-project-risks';

const RiskManagement: React.FC<RiskManagementProps> = ({ rootNode }) => {
  const { t } = useTranslation();

  // Função para carregar riscos do localStorage
  const loadRisksFromStorage = (): Risk[] => {
    try {
      const stored = localStorage.getItem(RISKS_STORAGE_KEY);
      if (stored) {
        const parsedRisks = JSON.parse(stored);
        // Converter strings de data de volta para objetos Date
        return parsedRisks.map((risk: any) => ({
          ...risk,
          createdAt: new Date(risk.createdAt),
          updatedAt: new Date(risk.updatedAt),
          dueDate: risk.dueDate ? new Date(risk.dueDate) : undefined,
        }));
      }
    } catch (error) {
      console.error(t('riskManagement.messages.loadError'), error);
    }
    return [];
  };

  // Função para salvar riscos no localStorage
  const saveRisksToStorage = useCallback((risks: Risk[]) => {
    try {
      localStorage.setItem(RISKS_STORAGE_KEY, JSON.stringify(risks));
    } catch (error) {
      console.error(t('riskManagement.messages.storageError'), error);
      
      // Verificar se é erro de quota excedida
      if (error instanceof DOMException && error.code === 22) {
        message.error(t('riskManagement.messages.storageFull'));
      } else {
        message.warning(t('riskManagement.messages.saveError'));
      }
    }
  }, [t]);

  const [risks, setRisks] = useState<Risk[]>(() => loadRisksFromStorage());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [filters, setFilters] = useState<RiskFilterOptions>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  // Opções de probabilidade e impacto traduzidas
  const probabilityOptions = [
    { value: 'very-low', label: t('riskManagement.probability.veryLow'), score: 1 },
    { value: 'low', label: t('riskManagement.probability.low'), score: 2 },
    { value: 'medium', label: t('riskManagement.probability.medium'), score: 3 },
    { value: 'high', label: t('riskManagement.probability.high'), score: 4 },
    { value: 'very-high', label: t('riskManagement.probability.veryHigh'), score: 5 },
  ];

  const impactOptions = [
    { value: 'very-low', label: t('riskManagement.impact.veryLow'), score: 1 },
    { value: 'low', label: t('riskManagement.impact.low'), score: 2 },
    { value: 'medium', label: t('riskManagement.impact.medium'), score: 3 },
    { value: 'high', label: t('riskManagement.impact.high'), score: 4 },
    { value: 'very-high', label: t('riskManagement.impact.veryHigh'), score: 5 },
  ];

  const categoryOptions = [
    { value: 'technical', label: t('riskManagement.categories.technical'), color: 'blue' },
    { value: 'financial', label: t('riskManagement.categories.financial'), color: 'green' },
    { value: 'operational', label: t('riskManagement.categories.operational'), color: 'orange' },
    { value: 'external', label: t('riskManagement.categories.external'), color: 'purple' },
    { value: 'strategic', label: t('riskManagement.categories.strategic'), color: 'red' },
  ];

  const statusOptions = [
    { value: 'identified', label: t('riskManagement.status.identified'), color: 'default' },
    { value: 'assessed', label: t('riskManagement.status.assessed'), color: 'processing' },
    { value: 'mitigated', label: t('riskManagement.status.mitigated'), color: 'warning' },
    { value: 'closed', label: t('riskManagement.status.closed'), color: 'success' },
  ];

  // Função para calcular score do risco (mapeando para escala 1-12)
  const calculateRiskScore = (probability: Risk['probability'], impact: Risk['impact']): number => {
    const probScore = probabilityOptions.find(p => p.value === probability)?.score || 1;
    const impactScore = impactOptions.find(i => i.value === impact)?.score || 1;
    
    // Matriz de mapeamento 5x5 para scores 1-12 baseada na imagem
    const scoreMatrix: Record<number, Record<number, number>> = {
      1: { 1: 1, 2: 1, 3: 2, 4: 3, 5: 5 },    // Muito Baixa
      2: { 1: 1, 2: 2, 3: 3, 4: 5, 5: 8 },    // Baixa
      3: { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10 },   // Média
      4: { 1: 2, 2: 3, 3: 5, 4: 8, 5: 11 },   // Alta
      5: { 1: 2, 2: 3, 3: 6, 4: 9, 5: 12 }    // Muito Alta
    };
    
    return scoreMatrix[probScore]?.[impactScore] || 1;
  };

  // Função para obter cor do risco baseado no score específico (1-12)
  const getRiskColor = (score: number): string => {
    // Cores específicas para cada score
    const scoreColors: Record<number, string> = {
      1: '#4682A9',
      2: '#749BC2',
      3: '#91C8E4',
      4: '#06923E',
      5: '#A7C1A8',
      6: '#FFB200',
      7: '#FFB200',
      8: '#C83F12',
      9: '#C83F12',
      10: '#8A0000',
      11: '#3B060A',
      12: '#3B060A'
    };
    
    return scoreColors[score] || '#4682A9'; // Default para score 1
  };

  // Função para obter nível do risco
  const getRiskLevel = (score: number): string => {
    if (score <= 2) return t('riskManagement.riskLevels.veryLow');
    if (score <= 5) return t('riskManagement.riskLevels.low');
    if (score <= 8) return t('riskManagement.riskLevels.medium');
    if (score <= 10) return t('riskManagement.riskLevels.high');
    return t('riskManagement.riskLevels.veryHigh');
  };

  // Função para verificar status da data limite
  const getDateStatus = (dueDate?: Date, status?: Risk['status']) => {
    if (!dueDate || status === 'mitigated' || status === 'closed') return 'normal';
    
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) return 'overdue';
    if (daysDiff <= 7) return 'warning';
    return 'normal';
  };

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Salvar no localStorage sempre que risks mudarem
  useEffect(() => {
    saveRisksToStorage(risks);
  }, [risks, saveRisksToStorage]);

  // Métricas calculadas
  const metrics: RiskMetrics = useMemo(() => {
    // Função para aplicar filtros
    const applyFilters = (risksToFilter: Risk[]): Risk[] => {
      return risksToFilter.filter(risk => {
        if (filters.status?.length && !filters.status.includes(risk.status)) return false;
        if (filters.category?.length && !filters.category.includes(risk.category)) return false;
        if (filters.probability?.length && !filters.probability.includes(risk.probability)) return false;
        if (filters.impact?.length && !filters.impact.includes(risk.impact)) return false;
        if (filters.owner && !risk.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false;
        return true;
      });
    };
    const filteredRisks = applyFilters(risks);
    
    // Riscos não endereçados (apenas identified e assessed)
    const openRisks = filteredRisks.filter(risk => 
      risk.status === 'identified' || risk.status === 'assessed'
    );
    
    // Garantir valores padrão para evitar NaN
    const statusCounts = filteredRisks.reduce((acc, risk) => {
      acc[risk.status] = (acc[risk.status] || 0) + 1;
      return acc;
    }, {
      identified: 0,
      assessed: 0,
      mitigated: 0,
      closed: 0
    } as Record<Risk['status'], number>);

    return {
      totalRisks: filteredRisks.length,
      risksByStatus: statusCounts,
      risksByCategory: filteredRisks.reduce((acc, risk) => {
        acc[risk.category] = (acc[risk.category] || 0) + 1;
        return acc;
      }, {} as Record<Risk['category'], number>),
      averageRiskScore: filteredRisks.length > 0 
        ? filteredRisks.reduce((sum, risk) => sum + risk.riskScore, 0) / filteredRisks.length 
        : 0,
      lowRisks: filteredRisks.filter(risk => risk.riskScore >= 1 && risk.riskScore <= 5).length, // Muito Baixo + Baixo
      mediumRisks: filteredRisks.filter(risk => risk.riskScore >= 6 && risk.riskScore <= 8).length,
      highRisks: filteredRisks.filter(risk => risk.riskScore >= 9 && risk.riskScore <= 10).length,
      criticalRisks: filteredRisks.filter(risk => risk.riskScore >= 11 && risk.riskScore <= 12).length, // Muito Alto
      catastrophicRisks: 0, // Removido para escala 1-12
      overdueRisks: openRisks.filter(risk => getDateStatus(risk.dueDate, risk.status) === 'overdue').length,
      soonDueRisks: openRisks.filter(risk => getDateStatus(risk.dueDate, risk.status) === 'warning').length,
    };
  }, [risks, filters]);

  // Função para extrair nós da árvore WBS
  const getAllWBSNodes = (node: TreeNode): TreeNode[] => {
    let nodes = [node];
    if (node.children) {
      node.children.forEach(child => {
        nodes = nodes.concat(getAllWBSNodes(child));
      });
    }
    return nodes;
  };

  const wbsNodes = getAllWBSNodes(rootNode);

  // Handlers
  const handleAddRisk = () => {
    setEditingRisk(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk(risk);
    form.setFieldsValue({
      ...risk,
      dueDate: risk.dueDate ? dayjs(risk.dueDate) : null,
    });
    setIsModalVisible(true);
  };

  const handleDeleteRisk = (riskId: string) => {
    setRisks(prev => prev.filter(risk => risk.id !== riskId));
    message.success(t('riskManagement.messages.riskDeleted'));
  };

  const handleLoadSampleRisks = () => {
    const sampleRisks = createSampleRisks();
    
    if (risks.length > 0) {
      Modal.confirm({
        title: t('riskManagement.sampleData.confirmTitle'),
        content: (
          <div>
            <p>{t('riskManagement.sampleData.confirmContent', { count: risks.length })}</p>
            <p>{t('riskManagement.sampleData.confirmQuestion')}</p>
          </div>
        ),
        okText: t('riskManagement.sampleData.replace'),
        cancelText: t('riskManagement.sampleData.add'),
        onOk: () => {
          setRisks(sampleRisks);
          message.success(t('riskManagement.messages.sampleDataLoadedReplace'));
        },
        onCancel: () => {
          setRisks(prev => [...prev, ...sampleRisks]);
          message.success(`${sampleRisks.length} ${t('riskManagement.messages.sampleDataLoadedAdd')}`);
        },
      });
    } else {
      setRisks(sampleRisks);
      message.success(t('riskManagement.messages.sampleDataLoaded'));
    }
  };

  const handleClearAllRisks = () => {
    setRisks([]);
    localStorage.removeItem(RISKS_STORAGE_KEY);
    message.success(t('riskManagement.messages.allRisksCleared'));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const riskScore = calculateRiskScore(values.probability, values.impact);
      
      const riskData: Risk = {
        id: editingRisk?.id || uuidv4(),
        title: values.title,
        description: values.description,
        category: values.category,
        probability: values.probability,
        impact: values.impact,
        riskScore,
        status: values.status || 'identified',
        owner: values.owner,
        createdAt: editingRisk?.createdAt || new Date(),
        updatedAt: new Date(),
        dueDate: values.dueDate ? values.dueDate.toDate() : undefined,
        mitigationPlan: values.mitigationPlan,
        contingencyPlan: values.contingencyPlan,
        estimatedCost: values.estimatedCost,
        actualCost: values.actualCost,
        associatedNodeIds: values.associatedNodeIds,
      };

      if (editingRisk) {
        setRisks(prev => prev.map(risk => risk.id === editingRisk.id ? riskData : risk));
        message.success(t('riskManagement.messages.riskUpdated'));
      } else {
        setRisks(prev => [...prev, riskData]);
        message.success(t('riskManagement.messages.riskAdded'));
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Erro ao salvar risco:', error);
    }
  };

  // Colunas da tabela
  const columns: ColumnsType<Risk> = [
    {
      title: t('riskManagement.table.title'),
      dataIndex: 'title',
      key: 'title',
      width: 200,
      fixed: 'left',
    },
    {
      title: t('riskManagement.table.category'),
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: Risk['category']) => {
        const option = categoryOptions.find(opt => opt.value === category);
        return <Tag color={option?.color}>{option?.label}</Tag>;
      },
    },
    {
      title: t('riskManagement.table.probability'),
      dataIndex: 'probability',
      key: 'probability',
      width: 120,
      render: (probability: Risk['probability']) => {
        const option = probabilityOptions.find(opt => opt.value === probability);
        return <Text>{option?.label}</Text>;
      },
    },
    {
      title: t('riskManagement.table.impact'),
      dataIndex: 'impact',
      key: 'impact',
      width: 120,
      render: (impact: Risk['impact']) => {
        const option = impactOptions.find(opt => opt.value === impact);
        return <Text>{option?.label}</Text>;
      },
    },
    {
      title: t('riskManagement.table.score'),
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 100,
      render: (score: number) => (
        <Badge
          count={score}
          style={{ backgroundColor: getRiskColor(score) }}
          title={`${t('riskManagement.table.level')}: ${getRiskLevel(score)}`}
        />
      ),
      sorter: (a, b) => a.riskScore - b.riskScore,
    },
    {
      title: t('riskManagement.table.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: Risk['status']) => {
        const option = statusOptions.find(opt => opt.value === status);
        return <Tag color={option?.color}>{option?.label}</Tag>;
      },
    },
    {
      title: t('riskManagement.table.owner'),
      dataIndex: 'owner',
      key: 'owner',
      width: 150,
    },
    {
      title: t('riskManagement.table.dueDate'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: Date | undefined, record: Risk) => {
        if (!date) return '-';
        
        const dateStatus = getDateStatus(date, record.status);
        const formattedDate = dayjs(date).format('DD/MM/YYYY');
        
        let className = 'risk-date-normal';
        let icon = null;
        
        if (dateStatus === 'overdue') {
          className = 'risk-date-overdue';
          icon = '⏰';
        } else if (dateStatus === 'warning') {
          className = 'risk-date-warning';
          icon = '⚠️';
        }
        
        return (
          <span className={className}>
            {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
            {formattedDate}
          </span>
        );
      },
      sorter: (a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      },
    },
    {
      title: t('riskManagement.table.actions'),
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('riskManagement.table.editTooltip')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditRisk(record)}
            />
          </Tooltip>
          <Tooltip title={t('riskManagement.table.deleteTooltip')}>
            <Popconfirm
              title={t('riskManagement.table.deleteConfirm')}
              onConfirm={() => handleDeleteRisk(record.id)}
              okText={t('riskManagement.table.yes')}
              cancelText={t('riskManagement.table.no')}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Dados já filtrados estão disponíveis através das métricas calculadas
  const filteredRisks = useMemo(() => {
    return risks.filter(risk => {
      if (filters.status?.length && !filters.status.includes(risk.status)) return false;
      if (filters.category?.length && !filters.category.includes(risk.category)) return false;
      if (filters.probability?.length && !filters.probability.includes(risk.probability)) return false;
      if (filters.impact?.length && !filters.impact.includes(risk.impact)) return false;
      if (filters.owner && !risk.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false;
      return true;
    });
  }, [risks, filters]);

  return (
    <div style={{ padding: '0 24px' }}>
      {/* Métricas - Linha 1: Visão Geral */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.totalRisks')}
              value={metrics.totalRisks}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.averageScore')}
              value={metrics.averageRiskScore}
              precision={1}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.mitigated')}
              value={metrics.risksByStatus.mitigated}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.open')}
              value={metrics.risksByStatus.identified + metrics.risksByStatus.assessed}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Métricas - Linha 2: Níveis de Risco (Escala 1-12) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.veryHigh')}
              value={metrics.criticalRisks}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#3B060A' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.high')}
              value={metrics.highRisks}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#C83F12' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.medium')}
              value={metrics.mediumRisks}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#FFB200' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.low')}
              value={metrics.lowRisks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#91C8E4' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Métricas - Linha 3: Status de Prazos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.overdueRisks')}
              value={metrics.overdueRisks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#d32f2f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.nearDueRisks')}
              value={metrics.soonDueRisks}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ed6c02' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.onTimeRisks')}
              value={Math.max(0, (metrics.risksByStatus.identified || 0) + (metrics.risksByStatus.assessed || 0) - metrics.overdueRisks - metrics.soonDueRisks)}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#2e7d32' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('riskManagement.statistics.addressedRisks')}
              value={metrics.risksByStatus.mitigated + metrics.risksByStatus.closed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Informação sobre persistência */}
      {risks.length === 0 && (
        <Alert
          message={t('riskManagement.localStorage.title')}
          description={t('riskManagement.localStorage.description')}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* Alertas */}
      {(metrics.overdueRisks > 0 || metrics.criticalRisks > 0) && (
        <Alert
          message={`${t('riskManagement.alerts.critical')} ${[
            metrics.overdueRisks > 0 ? `${metrics.overdueRisks} ${t('riskManagement.alerts.overdue')}` : '',
            metrics.criticalRisks > 0 ? `${metrics.criticalRisks} ${t('riskManagement.alerts.veryHigh')}` : ''
          ].filter(Boolean).join(' • ')}`}
          description={t('riskManagement.alerts.criticalDescription')}
          type="error"
          showIcon
          className="risk-alert-critical"
          style={{ marginBottom: 16, borderColor: '#d32f2f', backgroundColor: '#ffebee' }}
        />
      )}

      {(metrics.soonDueRisks > 0 || metrics.highRisks > 0) && (
        <Alert
          message={`${t('riskManagement.alerts.warning')} ${[
            metrics.soonDueRisks > 0 ? `${metrics.soonDueRisks} ${t('riskManagement.alerts.nearDue')}` : '',
            metrics.highRisks > 0 ? `${metrics.highRisks} ${t('riskManagement.alerts.high')}` : ''
          ].filter(Boolean).join(' • ')}`}
          description={t('riskManagement.alerts.warningDescription')}
          type="warning"
          showIcon
          className="risk-alert-warning"
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Cabeçalho */}
      <Card
        title={
          <Space>
            <span>{t('riskManagement.title')}</span>
            {risks.length > 0 && (
              <Badge 
                count={risks.length} 
                style={{ backgroundColor: '#52c41a' }}
                title={`${risks.length} risco(s) salvos localmente`}
              />
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<BulbOutlined />}
              onClick={handleLoadSampleRisks}
              type="dashed"
            >
              {t('riskManagement.loadExamples')}
            </Button>
            <Popconfirm
              title={t('riskManagement.clearAllConfirmTitle')}
              description={t('riskManagement.clearAllConfirmDescription')}
              onConfirm={handleClearAllRisks}
              okText={t('riskManagement.clearAllConfirmOk')}
              cancelText={t('riskManagement.clearAllConfirmCancel')}
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                type="dashed"
                icon={<DeleteOutlined />}
                disabled={risks.length === 0}
              >
                {t('riskManagement.clearAll')}
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddRisk}
            >
              {t('riskManagement.newRisk')}
            </Button>
          </Space>
        }
      >
        {/* Filtros */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={5}>
            <Select
              placeholder={t('riskManagement.filters.filterByStatus')}
              mode="multiple"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              {statusOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <Select
              placeholder={t('riskManagement.filters.filterByCategory')}
              mode="multiple"
              style={{ width: '100%' }}
              value={filters.category}
              onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              {categoryOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <Input
              placeholder={t('riskManagement.filters.filterByOwner')}
              value={filters.owner}
              onChange={(e) => setFilters(prev => ({ ...prev, owner: e.target.value }))}
            />
          </Col>
          <Col span={5}>
            <Space size="small" style={{ width: '100%' }}>
              <Button
                size="small"
                type="default"
                danger={metrics.overdueRisks > 0}
                onClick={() => {
                  // Filtrar apenas riscos vencidos não endereçados
                  const overdueRisks = risks.filter(risk => 
                    (risk.status === 'identified' || risk.status === 'assessed') &&
                    getDateStatus(risk.dueDate, risk.status) === 'overdue'
                  );
                  // Esta é uma forma visual de highlighting, não um filtro real
                  message.info(`${overdueRisks.length} ${t('riskManagement.messages.overdueRisksFound')}`);
                }}
                style={{ fontSize: '11px' }}
              >
                ⏰{metrics.overdueRisks}
              </Button>
              <Button
                size="small"
                type="default"
                style={{ 
                  fontSize: '11px',
                  borderColor: metrics.soonDueRisks > 0 ? '#ed6c02' : undefined,
                  color: metrics.soonDueRisks > 0 ? '#ed6c02' : undefined
                }}
                onClick={() => {
                  const soonDueRisks = risks.filter(risk => 
                    (risk.status === 'identified' || risk.status === 'assessed') &&
                    getDateStatus(risk.dueDate, risk.status) === 'warning'
                  );
                  message.info(`${soonDueRisks.length} ${t('riskManagement.messages.nearDueRisksFound')}`);
                }}
              >
                📅{metrics.soonDueRisks}
              </Button>
            </Space>
          </Col>
          <Col span={4}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setFilters({});
                setCurrentPage(1);
              }}
              style={{ width: '100%' }}
            >
              {t('riskManagement.filters.clear')}
            </Button>
          </Col>
        </Row>

        {/* Abas para Tabela e Matriz */}
        <Tabs defaultActiveKey="table">
          <TabPane 
            tab={
              <span>
                <TableOutlined />
                {t('riskManagement.tabs.risksList')}
              </span>
            } 
            key="table"
          >
            <Table
              columns={columns}
              dataSource={filteredRisks}
              rowKey="id"
              scroll={{ x: 1200 }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: filteredRisks.length,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} ${t('riskManagement.table.pagination')} ${total} ${t('riskManagement.table.risks')}`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  if (size !== pageSize) {
                    setPageSize(size);
                    setCurrentPage(1); // Reset to first page when changing page size
                  }
                },
                onShowSizeChange: (current, size) => {
                  setPageSize(size);
                  setCurrentPage(1); // Reset to first page when changing page size
                },
              }}
              locale={{
                emptyText: (
                  <Empty
                    description={t('riskManagement.table.noRisksFound')}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
              size="middle"
            />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                {t('riskManagement.tabs.riskMatrix')}
              </span>
            } 
            key="matrix"
          >
            <RiskMatrix risks={filteredRisks} />
          </TabPane>
        </Tabs>
      </Card>

      {/* Modal de Criação/Edição */}
      <Modal
        title={editingRisk ? t('riskManagement.editRisk') : t('riskManagement.newRisk')}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        okText={t('riskManagement.form.save')}
        cancelText={t('riskManagement.form.cancel')}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'identified',
            probability: 'medium',
            impact: 'medium',
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="title"
                label={t('riskManagement.form.title')}
                rules={[{ required: true, message: t('riskManagement.form.titleRequired') }]}
              >
                <Input placeholder={t('riskManagement.form.titlePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label={t('riskManagement.form.category')}
                rules={[{ required: true, message: t('riskManagement.form.categoryRequired') }]}
              >
                <Select placeholder={t('riskManagement.form.categoryPlaceholder')}>
                  {categoryOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t('riskManagement.form.status')}
                rules={[{ required: true, message: t('riskManagement.form.statusRequired') }]}
              >
                <Select placeholder={t('riskManagement.form.statusPlaceholder')}>
                  {statusOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="probability"
                label={t('riskManagement.form.probability')}
                rules={[{ required: true, message: t('riskManagement.form.probabilityRequired') }]}
              >
                <Select placeholder={t('riskManagement.form.probabilityPlaceholder')}>
                  {probabilityOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="impact"
                label={t('riskManagement.form.impact')}
                rules={[{ required: true, message: t('riskManagement.form.impactRequired') }]}
              >
                <Select placeholder={t('riskManagement.form.impactPlaceholder')}>
                  {impactOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="owner"
                label={t('riskManagement.form.owner')}
                rules={[{ required: true, message: t('riskManagement.form.ownerRequired') }]}
              >
                <Input placeholder={t('riskManagement.form.ownerPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label={t('riskManagement.form.dueDate')}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder={t('riskManagement.form.dueDatePlaceholder')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="associatedNodeIds"
                label={t('riskManagement.form.associatedNodes')}
              >
                <Select 
                  mode="multiple"
                  placeholder={t('riskManagement.form.associatedNodesPlaceholder')}
                  optionFilterProp="children"
                >
                  {wbsNodes.map(node => (
                    <Option key={node.id} value={node.id}>
                      {`${'  '.repeat(node.level - 1)}${node.name}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="estimatedCost"
                label={t('riskManagement.form.estimatedCost')}
              >
                <Input 
                  type="number" 
                  placeholder={t('riskManagement.form.estimatedCostPlaceholder')}
                  addonBefore="R$"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="actualCost"
                label={t('riskManagement.form.actualCost')}
              >
                <Input 
                  type="number" 
                  placeholder={t('riskManagement.form.actualCostPlaceholder')}
                  addonBefore="R$"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label={t('riskManagement.form.description')}
            rules={[{ required: true, message: t('riskManagement.form.descriptionRequired') }]}
          >
            <TextArea 
              rows={3} 
              placeholder={t('riskManagement.form.descriptionPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            name="mitigationPlan"
            label={t('riskManagement.form.mitigationPlan')}
          >
            <TextArea 
              rows={3} 
              placeholder={t('riskManagement.form.mitigationPlanPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            name="contingencyPlan"
            label={t('riskManagement.form.contingencyPlan')}
          >
            <TextArea 
              rows={3} 
              placeholder={t('riskManagement.form.contingencyPlanPlaceholder')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RiskManagement; 