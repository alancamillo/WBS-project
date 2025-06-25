import React, { useState, useEffect, useMemo } from 'react';
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

const RiskManagement: React.FC<RiskManagementProps> = ({ rootNode }) => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [filters, setFilters] = useState<RiskFilterOptions>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  // Constantes para probabilidade e impacto (Score de 1 a 25 - Matriz 5x5)
  const probabilityOptions = [
    { value: 'very-low', label: 'Muito Baixa (1)', score: 1 },
    { value: 'low', label: 'Baixa (2)', score: 2 },
    { value: 'medium', label: 'Média (3)', score: 3 },
    { value: 'high', label: 'Alta (4)', score: 4 },
    { value: 'very-high', label: 'Muito Alta (5)', score: 5 },
  ];

  const impactOptions = [
    { value: 'very-low', label: 'Muito Baixo (1)', score: 1 },
    { value: 'low', label: 'Baixo (2)', score: 2 },
    { value: 'medium', label: 'Médio (3)', score: 3 },
    { value: 'high', label: 'Alto (4)', score: 4 },
    { value: 'very-high', label: 'Muito Alto (5)', score: 5 },
  ];

  const categoryOptions = [
    { value: 'technical', label: 'Técnico', color: 'blue' },
    { value: 'financial', label: 'Financeiro', color: 'green' },
    { value: 'operational', label: 'Operacional', color: 'orange' },
    { value: 'external', label: 'Externo', color: 'purple' },
    { value: 'strategic', label: 'Estratégico', color: 'red' },
  ];

  const statusOptions = [
    { value: 'identified', label: 'Identificado', color: 'default' },
    { value: 'assessed', label: 'Avaliado', color: 'processing' },
    { value: 'mitigated', label: 'Mitigado', color: 'warning' },
    { value: 'closed', label: 'Fechado', color: 'success' },
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
    if (score <= 2) return 'Muito Baixo';
    if (score <= 5) return 'Baixo';
    if (score <= 8) return 'Médio';
    if (score <= 10) return 'Alto';
    return 'Muito Alto';
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
    message.success('Risco removido com sucesso!');
  };

  const handleLoadSampleRisks = () => {
    const sampleRisks = createSampleRisks();
    setRisks(sampleRisks);
    message.success('Dados de exemplo carregados com sucesso!');
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
        message.success('Risco atualizado com sucesso!');
      } else {
        setRisks(prev => [...prev, riskData]);
        message.success('Risco adicionado com sucesso!');
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
      title: 'Título',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      fixed: 'left',
    },
    {
      title: 'Categoria',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: Risk['category']) => {
        const option = categoryOptions.find(opt => opt.value === category);
        return <Tag color={option?.color}>{option?.label}</Tag>;
      },
    },
    {
      title: 'Probabilidade',
      dataIndex: 'probability',
      key: 'probability',
      width: 120,
      render: (probability: Risk['probability']) => {
        const option = probabilityOptions.find(opt => opt.value === probability);
        return <Text>{option?.label}</Text>;
      },
    },
    {
      title: 'Impacto',
      dataIndex: 'impact',
      key: 'impact',
      width: 120,
      render: (impact: Risk['impact']) => {
        const option = impactOptions.find(opt => opt.value === impact);
        return <Text>{option?.label}</Text>;
      },
    },
    {
      title: 'Score',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 100,
      render: (score: number) => (
        <Badge
          count={score}
          style={{ backgroundColor: getRiskColor(score) }}
          title={`Nível: ${getRiskLevel(score)}`}
        />
      ),
      sorter: (a, b) => a.riskScore - b.riskScore,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: Risk['status']) => {
        const option = statusOptions.find(opt => opt.value === status);
        return <Tag color={option?.color}>{option?.label}</Tag>;
      },
    },
    {
      title: 'Responsável',
      dataIndex: 'owner',
      key: 'owner',
      width: 150,
    },
    {
      title: 'Data Limite',
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
      title: 'Ações',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditRisk(record)}
            />
          </Tooltip>
          <Tooltip title="Excluir">
            <Popconfirm
              title="Tem certeza que deseja excluir este risco?"
              onConfirm={() => handleDeleteRisk(record.id)}
              okText="Sim"
              cancelText="Não"
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
              title="Total de Riscos"
              value={metrics.totalRisks}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Score Médio"
              value={metrics.averageRiskScore}
              precision={1}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Mitigados"
              value={metrics.risksByStatus.mitigated}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Em Aberto"
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
              title="Muito Alto (11-12)"
              value={metrics.criticalRisks}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#3B060A' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Alto (9-10)"
              value={metrics.highRisks}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#C83F12' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Médio (6-8)"
              value={metrics.mediumRisks}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#FFB200' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Baixo (1-5)"
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
              title="⏰ Riscos Vencidos"
              value={metrics.overdueRisks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#d32f2f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="📅 Vencimento em 7 dias"
              value={metrics.soonDueRisks}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ed6c02' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="✅ Dentro do Prazo"
              value={Math.max(0, (metrics.risksByStatus.identified || 0) + (metrics.risksByStatus.assessed || 0) - metrics.overdueRisks - metrics.soonDueRisks)}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#2e7d32' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="📋 Endereçados"
              value={metrics.risksByStatus.mitigated + metrics.risksByStatus.closed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alertas */}
      {(metrics.overdueRisks > 0 || metrics.criticalRisks > 0) && (
        <Alert
          message={`🚨 CRÍTICOS: ${[
            metrics.overdueRisks > 0 ? `${metrics.overdueRisks} vencido(s)` : '',
            metrics.criticalRisks > 0 ? `${metrics.criticalRisks} muito alto(s) (score 11-12)` : ''
          ].filter(Boolean).join(' • ')}`}
          description="Situações críticas que requerem ação imediata para evitar danos ao projeto."
          type="error"
          showIcon
          className="risk-alert-critical"
          style={{ marginBottom: 16, borderColor: '#d32f2f', backgroundColor: '#ffebee' }}
        />
      )}

      {(metrics.soonDueRisks > 0 || metrics.highRisks > 0) && (
        <Alert
          message={`⚠️ ALERTAS: ${[
            metrics.soonDueRisks > 0 ? `${metrics.soonDueRisks} próximo(s) do vencimento` : '',
            metrics.highRisks > 0 ? `${metrics.highRisks} alto(s) (score 9-10)` : ''
          ].filter(Boolean).join(' • ')}`}
          description="Situações que precisam de atenção e planejamento para mitigação."
          type="warning"
          showIcon
          className="risk-alert-warning"
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Cabeçalho */}
      <Card
        title="Gestão de Riscos"
        extra={
          <Space>
            <Button
              icon={<BulbOutlined />}
              onClick={handleLoadSampleRisks}
              type="dashed"
            >
              Carregar Exemplos
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddRisk}
            >
              Novo Risco
            </Button>
          </Space>
        }
      >
        {/* Filtros */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={5}>
            <Select
              placeholder="Filtrar por Status"
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
              placeholder="Filtrar por Categoria"
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
              placeholder="Filtrar por Responsável"
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
                  message.info(`${overdueRisks.length} riscos vencidos encontrados`);
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
                  message.info(`${soonDueRisks.length} riscos próximos do vencimento`);
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
              Limpar
            </Button>
          </Col>
        </Row>

        {/* Abas para Tabela e Matriz */}
        <Tabs defaultActiveKey="table">
          <TabPane 
            tab={
              <span>
                <TableOutlined />
                Lista de Riscos
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
                  `${range[0]}-${range[1]} de ${total} riscos`,
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
                    description="Nenhum risco encontrado"
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
                Matriz de Risco
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
        title={editingRisk ? 'Editar Risco' : 'Novo Risco'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        okText="Salvar"
        cancelText="Cancelar"
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
                label="Título"
                rules={[{ required: true, message: 'Por favor, insira o título do risco' }]}
              >
                <Input placeholder="Ex: Atraso na entrega do fornecedor" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Categoria"
                rules={[{ required: true, message: 'Por favor, selecione a categoria' }]}
              >
                <Select placeholder="Selecione a categoria">
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
                label="Status"
                rules={[{ required: true, message: 'Por favor, selecione o status' }]}
              >
                <Select placeholder="Selecione o status">
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
                label="Probabilidade"
                rules={[{ required: true, message: 'Por favor, selecione a probabilidade' }]}
              >
                <Select placeholder="Selecione a probabilidade">
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
                label="Impacto"
                rules={[{ required: true, message: 'Por favor, selecione o impacto' }]}
              >
                <Select placeholder="Selecione o impacto">
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
                label="Responsável"
                rules={[{ required: true, message: 'Por favor, insira o responsável' }]}
              >
                <Input placeholder="Nome do responsável" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Data Limite"
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Selecione a data limite"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="associatedNodeIds"
                label="Atividades WBS Relacionadas"
              >
                <Select 
                  mode="multiple"
                  placeholder="Selecione as atividades relacionadas"
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
                label="Custo Estimado (R$)"
              >
                <Input 
                  type="number" 
                  placeholder="0.00"
                  addonBefore="R$"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="actualCost"
                label="Custo Real (R$)"
              >
                <Input 
                  type="number" 
                  placeholder="0.00"
                  addonBefore="R$"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descrição"
            rules={[{ required: true, message: 'Por favor, insira a descrição do risco' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="Descreva detalhadamente o risco identificado..."
            />
          </Form.Item>

          <Form.Item
            name="mitigationPlan"
            label="Plano de Mitigação"
          >
            <TextArea 
              rows={3} 
              placeholder="Descreva as ações para reduzir a probabilidade ou impacto do risco..."
            />
          </Form.Item>

          <Form.Item
            name="contingencyPlan"
            label="Plano de Contingência"
          >
            <TextArea 
              rows={3} 
              placeholder="Descreva as ações a serem tomadas caso o risco se materialize..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RiskManagement; 