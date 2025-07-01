import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  Progress,
  Row,
  Col,
  Statistic,
  Alert,
  Tooltip,
  Popconfirm,
  Badge,
  Typography,
  message,
  Tabs,
  List,
  Avatar
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { MeritFigure, PhaseImpact, MeritFigureMetrics, TreeNode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import './MeritFigures.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, DotProps } from 'recharts';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface MeritFiguresProps {
  rootNode: TreeNode;
  onUpdate?: () => void;
}

const MeritFigures: React.FC<MeritFiguresProps> = ({ rootNode, onUpdate }) => {
  const { t } = useTranslation();
  
  // Chave para localStorage das figuras de mérito
  const MERIT_FIGURES_STORAGE_KEY = 'wbs-merit-figures';
  
  // Estados
  const [meritFigures, setMeritFigures] = useState<MeritFigure[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFigure, setEditingFigure] = useState<MeritFigure | null>(null);
  const [impactModalVisible, setImpactModalVisible] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<MeritFigure | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [timeGranularity, setTimeGranularity] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Carregar figuras de mérito do localStorage
  const loadMeritFigures = (): MeritFigure[] => {
    try {
      const stored = localStorage.getItem(MERIT_FIGURES_STORAGE_KEY);
      if (stored) {
        const parsedFigures = JSON.parse(stored);
        return parsedFigures.map((figure: any) => ({
          ...figure,
          createdAt: new Date(figure.createdAt),
          updatedAt: new Date(figure.updatedAt),
          phaseImpacts: figure.phaseImpacts || []
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar figuras de mérito:', error);
    }
    
    // Se não há dados, criar um exemplo para demonstração
    const phases = getProjectPhases();
    if (phases.length >= 2) {
      const exampleFigure: MeritFigure = {
        id: 'exemplo-teste',
        name: 'Teste',
        description: 'Indicador de exemplo para demonstração do gráfico',
        category: 'cost',
        unit: 'pontos',
        targetValue: 12,
        currentValue: 8,
        baselineValue: 5,
        weight: 8,
        direction: 'increase',
        status: 'on-track',
        createdAt: new Date(),
        updatedAt: new Date(),
        phaseImpacts: [
          {
            nodeId: phases[0].id,
            nodeName: phases[0].name,
            valorAgregado: 3,
            impactDescription: 'Contribuição da primeira fase',
            impactType: 'positive',
            weight: 7
          },
          {
            nodeId: phases[1].id,
            nodeName: phases[1].name,
            valorAgregado: 2,
            impactDescription: 'Contribuição da segunda fase',
            impactType: 'positive',
            weight: 6
          }
        ]
      };
      
      return [exampleFigure];
    }
    
    return [];
  };

  // Salvar figuras de mérito no localStorage
  const saveMeritFigures = useCallback((figures: MeritFigure[]) => {
    try {
      localStorage.setItem(MERIT_FIGURES_STORAGE_KEY, JSON.stringify(figures));
    } catch (error) {
      console.error('Erro ao salvar figuras de mérito:', error);
      message.error(t('meritFigures.messages.saveError'));
    }
  }, [t]);

  // Função utilitária para buscar um nó pelo id na árvore
  const findNodeById = useCallback((root: TreeNode, id: string): TreeNode | undefined => {
    if (root.id === id) return root;
    for (const child of root.children || []) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return undefined;
  }, []);

  // Obter todas as fases do projeto (níveis 2)
  const getProjectPhases = (): TreeNode[] => {
    const phases: TreeNode[] = [];
    const traverse = (node: TreeNode) => {
      if (node.level === 2) {
        phases.push(node);
      }
      node.children.forEach(traverse);
    };
    traverse(rootNode);
    return phases;
  };

  // Carregar dados iniciais
  useEffect(() => {
    const figures = loadMeritFigures();
    setMeritFigures(figures);
    // Selecionar automaticamente todas as figuras para mostrar o gráfico
    if (figures.length > 0) {
      setSelectedIndicators(figures.map(f => f.id));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualizar cálculo de progresso
  const calculateProgress = useCallback((figure: MeritFigure): number => {
    if (!figure.phaseImpacts || figure.phaseImpacts.length === 0) return 0;
    let totalAgregado = 0;
    for (const impact of figure.phaseImpacts) {
      const phaseNode = findNodeById(rootNode, impact.nodeId);
      if (phaseNode && phaseNode.status === 'completed') {
        totalAgregado += impact.valorAgregado || 0;
      }
    }
    return (totalAgregado / figure.targetValue) * 100;
  }, [findNodeById, rootNode]);

  // Determinar status baseado no progresso
  const determineStatus = (figure: MeritFigure): MeritFigure['status'] => {
    const progress = calculateProgress(figure);
    if (progress >= 100) return 'completed';
    if (progress >= 80) return 'on-track';
    if (progress >= 50) return 'at-risk';
    return 'off-track';
  };

  // Salvar automaticamente quando mudar
  useEffect(() => {
    if (meritFigures.length > 0) {
      saveMeritFigures(meritFigures);
    }
  }, [meritFigures, saveMeritFigures]);

  // Atualizar selectedIndicators quando figuras mudarem
  useEffect(() => {
    if (meritFigures.length > 0 && selectedIndicators.length === 0) {
      setSelectedIndicators(meritFigures.map(f => f.id));
    }
  }, [meritFigures, selectedIndicators]);

  // Calcular métricas
  const metrics: MeritFigureMetrics = useMemo(() => {
    const totalFigures = meritFigures.length;
    const figuresByCategory = meritFigures.reduce((acc, figure) => {
      acc[figure.category] = (acc[figure.category] || 0) + 1;
      return acc;
    }, {} as Record<MeritFigure['category'], number>);
    
    const figuresByStatus = meritFigures.reduce((acc, figure) => {
      acc[figure.status] = (acc[figure.status] || 0) + 1;
      return acc;
    }, {} as Record<MeritFigure['status'], number>);

    const averageProgress = totalFigures > 0 
      ? meritFigures.reduce((sum, figure) => {
          const progress = calculateProgress(figure);
          return sum + progress;
        }, 0) / totalFigures
      : 0;

    const topPerformingFigures = [...meritFigures]
      .sort((a, b) => calculateProgress(b) - calculateProgress(a))
      .slice(0, 5);

    const criticalFigures = meritFigures.filter(figure => 
      figure.weight >= 8 || figure.status === 'off-track'
    );

    return {
      totalFigures,
      figuresByCategory,
      figuresByStatus,
      averageProgress,
      onTrackFigures: figuresByStatus['on-track'] || 0,
      atRiskFigures: figuresByStatus['at-risk'] || 0,
      offTrackFigures: figuresByStatus['off-track'] || 0,
      completedFigures: figuresByStatus['completed'] || 0,
      topPerformingFigures,
      criticalFigures
    };
  }, [meritFigures, calculateProgress]);

  // Adicionar nova figura de mérito
  const handleAddFigure = () => {
    setEditingFigure(null);
    setModalVisible(true);
  };

  // Editar figura de mérito
  const handleEditFigure = (figure: MeritFigure) => {
    setEditingFigure(figure);
    setModalVisible(true);
  };

  // Excluir figura de mérito
  const handleDeleteFigure = (figureId: string) => {
    setMeritFigures(prev => prev.filter(f => f.id !== figureId));
    message.success(t('meritFigures.messages.deleted'));
  };

  // Salvar figura de mérito
  const handleSaveFigure = (values: any) => {
    const now = new Date();
    
    if (editingFigure) {
      // Editar existente
      setMeritFigures(prev => prev.map(f => 
        f.id === editingFigure.id 
          ? { ...f, ...values, updatedAt: now, status: determineStatus({ ...f, ...values }) }
          : f
      ));
      message.success(t('meritFigures.messages.updated'));
    } else {
      // Adicionar nova
      const newFigure: MeritFigure = {
        id: uuidv4(),
        ...values,
        status: determineStatus(values),
        createdAt: now,
        updatedAt: now,
        phaseImpacts: []
      };
      setMeritFigures(prev => [...prev, newFigure]);
      message.success(t('meritFigures.messages.added'));
    }
    
    setModalVisible(false);
    setEditingFigure(null);
  };

  // Configurar impactos das fases
  const handleConfigureImpacts = (figure: MeritFigure) => {
    setSelectedFigure(figure);
    setImpactModalVisible(true);
  };

  // Salvar impactos das fases
  const handleSaveImpacts = (impacts: PhaseImpact[]) => {
    if (selectedFigure) {
      setMeritFigures(prev => prev.map(f => 
        f.id === selectedFigure.id 
          ? { ...f, phaseImpacts: impacts, updatedAt: new Date() }
          : f
      ));
      message.success(t('meritFigures.messages.impactsUpdated'));
    }
    setImpactModalVisible(false);
    setSelectedFigure(null);
  };

  // Função removida - não estava sendo utilizada

  // Função utilitária para formatar datas conforme granularidade
  function formatDateByGranularity(date: Date, granularity: 'day' | 'week' | 'month' | 'year') {
    if (granularity === 'day') return date.toISOString().slice(0, 10); // YYYY-MM-DD
    if (granularity === 'year') return date.getFullYear().toString();
    if (granularity === 'month') return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    // week: retorna ano-semana
    const week = Math.ceil((date.getDate() + 6 - date.getDay()) / 7);
    return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  }

  // Montar dados para o gráfico
  const chartData = useMemo(() => {

    // Para cada indicador selecionado, montar um array de pontos (baseline + cada avanço por fase)
    const dataMap: Record<string, Record<string, any>> = {};
    const allDatesSet = new Set<string>();

    selectedIndicators.forEach(indicatorId => {
      const figure = meritFigures.find(f => f.id === indicatorId);
      if (!figure) return;
      
      const points: { 
        date: string, 
        value: number, 
        phaseName?: string, 
        valorAgregado?: number,
        figureUnit?: string,
        figureName?: string,
        phases?: Array<{phaseName: string, valorAgregado: number}>,
        totalContribution?: number
      }[] = [];
      
      // Para cada fase, verificar se tem impacto configurado
      const impactsWithDates = (figure.phaseImpacts || [])
        .map(impact => {
          const phaseNode = findNodeById(rootNode, impact.nodeId);
          
          if (phaseNode) {
            // Se a fase está concluída e tem endDate, usa endDate
            if (phaseNode.status === 'completed' && phaseNode.endDate) {
              return { 
                date: new Date(phaseNode.endDate), 
                valorAgregado: impact.valorAgregado, 
                phaseName: phaseNode.name 
              };
            }
            // Se não está concluída mas tem startDate, usa startDate + alguns dias
            else if (phaseNode.startDate) {
              const simulatedEndDate = new Date(phaseNode.startDate);
              simulatedEndDate.setDate(simulatedEndDate.getDate() + (phaseNode.durationDays || 30));
              return { 
                date: simulatedEndDate, 
                valorAgregado: impact.valorAgregado, 
                phaseName: phaseNode.name + ' (estimado)'
              };
            }
            // Se não tem datas, usa data atual como fallback
            else {
              const today = new Date();
              today.setDate(today.getDate() + Math.random() * 60); // Adiciona variação aleatória
              return { 
                date: today, 
                valorAgregado: impact.valorAgregado, 
                phaseName: phaseNode.name + ' (simulado)'
              };
            }
          }
          return null;
        })
        .filter(Boolean) as { date: Date, valorAgregado: number, phaseName?: string }[];
      
      // Ordena por data
      impactsWithDates.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Agrupar fases por data para mostrar todas as contribuições
      const phasesByDate: Record<string, Array<{phaseName: string, valorAgregado: number}>> = {};
      
      impactsWithDates.forEach(({ date, valorAgregado, phaseName }) => {
        const label = formatDateByGranularity(date, timeGranularity);
        
        // Agrupar fases pela mesma data
        if (!phasesByDate[label]) {
          phasesByDate[label] = [];
        }
        phasesByDate[label].push({ phaseName: phaseName || 'Fase desconhecida', valorAgregado });
        
        allDatesSet.add(label);
      });
      
      // Ordenar as datas para garantir acúmulo correto
      const sortedDates = Object.keys(phasesByDate).sort();

      // === NOVO: Determinar a menor data do período exibido ===
      let minDateLabel = sortedDates[0];
      if (!minDateLabel) {
        // Se não há fases, usar a menor data de todos os indicadores
        const allPhaseDates = Array.from(allDatesSet);
        if (allPhaseDates.length > 0) {
          minDateLabel = allPhaseDates.sort()[0];
        } else {
          // fallback: data atual formatada
          minDateLabel = formatDateByGranularity(new Date(), timeGranularity);
        }
      }

      let accumulatedValue = figure.baselineValue;
      // Só adiciona o baseline se não houver ponto para a menor data
      if (!phasesByDate[minDateLabel]) {
        points.push({
          date: minDateLabel,
          value: figure.baselineValue,
          phases: [],
          totalContribution: 0,
          figureUnit: figure.unit,
          figureName: figure.name
        });
      }
      sortedDates.forEach((dateLabel) => {
        const phases = phasesByDate[dateLabel];
        const totalContribution = phases.reduce((sum, phase) => sum + phase.valorAgregado, 0);
        accumulatedValue += totalContribution;
        points.push({
          date: dateLabel,
          value: accumulatedValue,
          phases: phases, // Array de todas as fases desta data
          totalContribution,
          figureUnit: figure.unit,
          figureName: figure.name
        });
      });
      
      // Monta map para merge - agora preservando todas as informações
      dataMap[figure.name] = {};
      points.forEach(p => {
        dataMap[figure.name][p.date] = {
          value: p.value,
          figureUnit: p.figureUnit,
          figureName: p.figureName,
          phases: p.phases,
          totalContribution: p.totalContribution
        };
      });
    });

    // Montar array final de datas
    const allDates = Array.from(allDatesSet);
    allDates.sort();
    
    // Montar array de objetos para o gráfico
    const chartRows = allDates.map(date => {
      const row: Record<string, any> = { date };
      Object.keys(dataMap).forEach(name => {
        const pointData = dataMap[name][date];
        if (pointData) {
          row[name] = pointData.value;
          // Adicionar metadados para o tooltip
          row[`${name}_figureUnit`] = pointData.figureUnit;
          row[`${name}_figureName`] = pointData.figureName;
          row[`${name}_phases`] = pointData.phases;
          row[`${name}_totalContribution`] = pointData.totalContribution;
        } else {
          row[name] = null;
        }
      });
      
      return row;
    });
    
    return chartRows;
  }, [selectedIndicators, timeGranularity, meritFigures, rootNode, findNodeById]);

  // Colunas da tabela
  const columns = [
    {
      title: t('meritFigures.table.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: MeritFigure) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.category} • {record.unit}
          </Text>
        </div>
      )
    },
    {
      title: t('meritFigures.table.values'),
      key: 'values',
      render: (record: MeritFigure) => {
        const isImproving = record.direction === 'increase' && record.currentValue > record.baselineValue;
        const isWorsening = record.direction === 'decrease' && record.currentValue < record.baselineValue;
        
        return (
          <div style={{ minWidth: '200px' }}>
            {/* Valor Base */}
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {t('meritFigures.form.baselineValue')}:
              </Text>
              <div>
                <Text strong style={{ color: '#8c8c8c' }}>
                  {record.baselineValue} {record.unit}
                </Text>
              </div>
            </div>
            
            {/* Valor Atual */}
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {t('meritFigures.table.currentValue')}:
              </Text>
              <div>
                <Text strong style={{ 
                  color: isImproving ? '#52c41a' : isWorsening ? '#f5222d' : '#1890ff',
                  fontSize: '16px'
                }}>
                  {record.currentValue} {record.unit}
                </Text>
                {isImproving && <ArrowUpOutlined style={{ color: '#52c41a', marginLeft: '4px' }} />}
                {isWorsening && <ArrowDownOutlined style={{ color: '#f5222d', marginLeft: '4px' }} />}
              </div>
            </div>
            
            {/* Valor Meta */}
            <div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {t('meritFigures.table.target')}:
              </Text>
              <div>
                <Text strong style={{ color: '#722ed1' }}>
                  {record.targetValue} {record.unit}
                </Text>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: t('meritFigures.table.progress'),
      key: 'progress',
      render: (record: MeritFigure) => {
        const progress = calculateProgress(record);
        const status = record.status;
        
        let color = 'blue';
        if (status === 'completed') color = 'green';
        else if (status === 'at-risk') color = 'orange';
        else if (status === 'off-track') color = 'red';

        // Calcular diferença em relação ao baseline
        const baselineDiff = record.currentValue - record.baselineValue;
        const baselineDiffPercent = record.baselineValue !== 0 
          ? ((baselineDiff / record.baselineValue) * 100)
          : 0; // Se baseline é zero, não calcula porcentagem
        
        return (
          <div>
            <Progress 
              percent={Math.round(progress)} 
              size="small" 
              status={status === 'completed' ? 'success' : undefined}
              strokeColor={color}
            />
            <div style={{ marginTop: '4px' }}>
              <Tag color={color === 'blue' ? 'blue' : color === 'green' ? 'green' : color === 'orange' ? 'orange' : 'red'}>
                {t(`meritFigures.status.${status}`)}
              </Tag>
            </div>
            <div style={{ marginTop: '4px' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {baselineDiff > 0 ? '+' : ''}{baselineDiff.toFixed(1)} {record.unit} 
                ({baselineDiffPercent > 0 ? '+' : ''}{baselineDiffPercent.toFixed(1)}%)
              </Text>
            </div>
          </div>
        );
      }
    },
    {
      title: t('meritFigures.table.phaseImpacts'),
      key: 'phaseImpacts',
      render: (record: MeritFigure) => {
        const impacts = record.phaseImpacts || [];
        let totalAgregado = 0;
        for (const impact of impacts) {
          const phaseNode = findNodeById(rootNode, impact.nodeId);
          if (phaseNode && phaseNode.status === 'completed') {
            totalAgregado += impact.valorAgregado || 0;
          }
        }
        
        return (
          <div>
            <div style={{ marginBottom: '4px' }}>
              <Text strong style={{ fontSize: '12px' }}>
                {impacts.length} {t('meritFigures.table.phaseImpacts')}
              </Text>
            </div>
            {impacts.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {t('meritFigures.impactModal.impactPercentage')}: {totalAgregado.toFixed(1)} {record.unit}
                </Text>
                <div style={{ marginTop: '4px' }}>
                  {impacts.slice(0, 2).map((impact, index) => (
                    <Tag key={index} style={{ marginBottom: '2px', fontSize: '10px' }}>
                      {impact.valorAgregado > 0 ? '+' : ''}{impact.valorAgregado} {record.unit}
                    </Tag>
                  ))}
                  {impacts.length > 2 && (
                    <Tag style={{ fontSize: '10px' }}>+{impacts.length - 2}</Tag>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: t('meritFigures.table.weight'),
      dataIndex: 'weight',
      key: 'weight',
      render: (weight: number) => (
        <Badge 
          count={weight} 
          style={{ 
            backgroundColor: weight >= 8 ? '#f5222d' : weight >= 6 ? '#fa8c16' : '#52c41a',
            fontSize: '12px'
          }} 
        />
      )
    },
    {
      title: t('meritFigures.table.actions'),
      key: 'actions',
      render: (record: MeritFigure) => (
        <Space>
          <Tooltip title={t('meritFigures.actions.view')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleConfigureImpacts(record)}
            />
          </Tooltip>
          <Tooltip title={t('meritFigures.actions.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditFigure(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t('meritFigures.delete.confirm')}
            onConfirm={() => handleDeleteFigure(record.id)}
            okText={t('buttons.yes')}
            cancelText={t('buttons.no')}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const renderOverviewTab = () => (
    <div>
      {/* Métricas gerais */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('meritFigures.metrics.total')}
              value={metrics.totalFigures}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('meritFigures.metrics.onTrack')}
              value={metrics.onTrackFigures}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('meritFigures.metrics.atRisk')}
              value={metrics.atRiskFigures}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('meritFigures.metrics.offTrack')}
              value={metrics.offTrackFigures}
              valueStyle={{ color: '#f5222d' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Progresso médio */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>{t('meritFigures.metrics.averageProgress')}</Title>
        <Progress 
          percent={Math.round(metrics.averageProgress)} 
          status={metrics.averageProgress >= 80 ? 'success' : metrics.averageProgress >= 50 ? 'normal' : 'exception'}
        />
      </Card>

      {/* Figuras críticas */}
      {metrics.criticalFigures.length > 0 && (
        <Card title={t('meritFigures.criticalFigures')} style={{ marginBottom: 24 }}>
          <List
            dataSource={metrics.criticalFigures}
            renderItem={(figure) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      style={{ 
                        backgroundColor: figure.status === 'off-track' ? '#f5222d' : 
                                       figure.status === 'at-risk' ? '#fa8c16' : '#52c41a' 
                      }}
                    >
                      {figure.weight}
                    </Avatar>
                  }
                  title={figure.name}
                  description={
                    <div>
                      <div style={{ marginBottom: '4px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {t('meritFigures.form.baselineValue')}: {figure.baselineValue} {figure.unit} | 
                          {t('meritFigures.table.currentValue')}: <Text strong>{figure.currentValue} {figure.unit}</Text> | 
                          {t('meritFigures.table.target')}: {figure.targetValue} {figure.unit}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {figure.phaseImpacts?.length || 0} {t('meritFigures.table.phaseImpacts')} • 
                          {t('meritFigures.direction.' + figure.direction)}
                        </Text>
                      </div>
                    </div>
                  }
                />
                <div style={{ textAlign: 'right' }}>
                  <Progress 
                    percent={Math.round(calculateProgress(figure))} 
                    size="small"
                    status={figure.status === 'completed' ? 'success' : undefined}
                    style={{ marginBottom: '8px' }}
                  />
                  <Tag color={figure.status === 'off-track' ? 'red' : figure.status === 'at-risk' ? 'orange' : 'green'}>
                    {t(`meritFigures.status.${figure.status}`)}
                  </Tag>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Tabela principal */}
      <Card title={t('meritFigures.table.title')}>
        {meritFigures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <TrophyOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#8c8c8c' }}>
              Nenhuma figura de mérito cadastrada
            </Title>
            <Paragraph style={{ color: '#8c8c8c', marginBottom: '24px' }}>
              Comece adicionando indicadores de performance para acompanhar o progresso do seu projeto.
            </Paragraph>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddFigure}
                size="large"
              >
                {t('meritFigures.addNew')}
              </Button>
            </Space>
          </div>
        ) : (
          <Table
            dataSource={meritFigures}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} de ${total} ${t('meritFigures.table.items')}`
            }}
          />
        )}
      </Card>
    </div>
  );



  const renderAnalysisTab = () => (
    <div>
      <Card title={t('meritFigures.analysis.title')}>
        <Paragraph>
          {t('meritFigures.analysis.description')}
        </Paragraph>
        
        {meritFigures.length === 0 ? (
          <Alert
            message={t('meritFigures.analysis.noData')}
            description={t('meritFigures.analysis.noDataDescription')}
            type="info"
            showIcon
          />
        ) : (
          <div>
            {/* Análise por categoria */}
            <Title level={4}>{t('meritFigures.analysis.byCategory')}</Title>
            <Row gutter={[16, 16]}>
              {Object.entries(metrics.figuresByCategory).map(([category, count]) => (
                <Col xs={24} sm={12} md={8} key={category}>
                  <Card size="small">
                    <Statistic
                      title={t(`meritFigures.categories.${category}`)}
                      value={count}
                      suffix={t('meritFigures.analysis.figures')}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Top performers */}
            <Title level={4} style={{ marginTop: 24 }}>
              {t('meritFigures.analysis.topPerformers')}
            </Title>
            <List
              dataSource={metrics.topPerformingFigures}
              renderItem={(figure, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: index === 0 ? '#ffd700' : 
                                              index === 1 ? '#c0c0c0' : 
                                              index === 2 ? '#cd7f32' : '#1890ff' }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={figure.name}
                    description={
                      <div>
                        <div style={{ marginBottom: '4px' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {figure.baselineValue} → <Text strong>{figure.currentValue}</Text> → {figure.targetValue} {figure.unit}
                          </Text>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {Math.round(calculateProgress(figure))}% {t('meritFigures.analysis.progress')} • 
                            {figure.phaseImpacts?.length || 0} {t('meritFigures.table.phaseImpacts')}
                          </Text>
                        </div>
                      </div>
                    }
                  />
                  <div style={{ textAlign: 'right' }}>
                    <Progress 
                      percent={Math.round(calculateProgress(figure))} 
                      size="small"
                      status={figure.status === 'completed' ? 'success' : undefined}
                      style={{ marginBottom: '8px' }}
                    />
                    <Tag color={figure.status === 'off-track' ? 'red' : figure.status === 'at-risk' ? 'orange' : 'green'}>
                      {t(`meritFigures.status.${figure.status}`)}
                    </Tag>
                  </div>
                </List.Item>
              )}
            />

            {/* Análise de contribuição das fases */}
            <Title level={4} style={{ marginTop: 24 }}>
              {t('meritFigures.analysis.phaseContributions')}
            </Title>
            <Row gutter={[16, 16]}>
              {meritFigures.filter(f => f.phaseImpacts && f.phaseImpacts.length > 0).map(figure => {
                const totalAgregado = figure.phaseImpacts?.reduce((sum, impact) => {
                  const phaseNode = findNodeById(rootNode, impact.nodeId);
                  return phaseNode && phaseNode.status === 'completed' ? sum + (impact.valorAgregado || 0) : sum;
                }, 0) || 0;
                return (
                  <Col xs={24} md={12} key={figure.id}>
                    <Card size="small" title={figure.name}>
                      <div style={{ marginBottom: '12px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {figure.baselineValue} → <Text strong>{figure.currentValue}</Text> → {figure.targetValue} {figure.unit}
                        </Text>
                      </div>
                      
                      {/* Gráfico de contribuição das fases */}
                      <div style={{ marginBottom: '12px' }}>
                        {figure.phaseImpacts?.map((impact, index) => {
                          const phase = getProjectPhases().find(p => p.id === impact.nodeId);
                          const barWidth = Math.abs(impact.valorAgregado) * 2; // Escala para visualização
                          const isPositive = (
                            (figure.direction === 'increase' && impact.valorAgregado > 0) ||
                            (figure.direction === 'decrease' && impact.valorAgregado < 0)
                          );
                          return (
                            <div key={index} style={{ marginBottom: '8px' }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '4px'
                              }}>
                                <Text style={{ fontSize: '12px', width: '120px' }}>{phase?.name || 'Fase'}</Text>
                                <div style={{ 
                                  width: '100px', 
                                  height: '8px', 
                                  backgroundColor: '#f0f0f0',
                                  borderRadius: '4px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${barWidth}%`,
                                    height: '100%',
                                    backgroundColor: isPositive ? '#52c41a' : '#f5222d',
                                    borderRadius: '4px',
                                    transition: 'width 0.3s ease'
                                  }} />
                                </div>
                                <Tag color={isPositive ? 'green' : 'red'} style={{ fontSize: '10px', marginLeft: '8px' }}>
                                  {impact.valorAgregado > 0 ? '+' : ''}{impact.valorAgregado} {figure.unit}
                                </Tag>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Resumo do impacto total */}
                      <div style={{ 
                        padding: '8px', 
                        backgroundColor: '#fafafa', 
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9'
                      }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {t('meritFigures.analysis.totalImpact')}: {totalAgregado} {figure.unit}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        )}
      </Card>

      {/* Controles e gráfico */}
      <Card title={t('meritFigures.analysis.chartTitle')} style={{ marginBottom: 24, background: '#fff', boxShadow: '0 2px 8px #f0f1f2' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Select
            mode="multiple"
            allowClear
            style={{ minWidth: 220 }}
            placeholder={t('meritFigures.analysis.selectIndicators')}
            value={selectedIndicators}
            onChange={setSelectedIndicators}
            options={meritFigures.map(f => ({ label: f.name, value: f.id }))}
          />
          <Select
            style={{ minWidth: 120 }}
            value={timeGranularity}
            onChange={setTimeGranularity}
            options={[
              { label: t('meritFigures.analysis.day'), value: 'day' },
              { label: t('meritFigures.analysis.week'), value: 'week' },
              { label: t('meritFigures.analysis.month'), value: 'month' },
              { label: t('meritFigures.analysis.year'), value: 'year' }
            ]}
          />
        </div>
        {selectedIndicators.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 16, right: 32, left: 40, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis 
                domain={['dataMin - (dataMax - dataMin) * 0.1', 'dataMax + (dataMax - dataMin) * 0.1']}
                tickFormatter={(value) => Number(value).toFixed(1)}
              />
              <RechartsTooltip content={CustomTooltip} />
              <Legend />
              {selectedIndicators.map((indicatorId, index) => {
                const figure = meritFigures.find(f => f.id === indicatorId);
                if (!figure) return null;
                
                const colors = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2'];
                const color = colors[index % colors.length];
                
                return (
                  <Line
                    key={figure.id}
                    type="monotone"
                    dataKey={figure.name}
                    stroke={color}
                    strokeWidth={3}
                    dot={props => { 
                      const { key, ...rest } = props; 
                      return <CustomDot key={key} {...rest} fill={color} />; 
                    }}
                    activeDot={{ r: 6, fill: color }}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ 
            height: 320, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px dashed #d9d9d9',
            borderRadius: '6px',
            color: '#8c8c8c'
          }}>
            <div style={{ textAlign: 'center' }}>
              <TrophyOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>{t('meritFigures.analysis.selectIndicatorsToView')}</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div className="merit-figures-container">
      <div className="merit-figures-header">
        <Title level={2}>
          <TrophyOutlined /> {t('meritFigures.title')}
        </Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddFigure}
        >
          {t('meritFigures.addNew')}
        </Button>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={t('meritFigures.tabs.overview')} key="overview">
          {renderOverviewTab()}
        </TabPane>

        <TabPane tab={t('meritFigures.tabs.analysis')} key="analysis">
          {renderAnalysisTab()}
        </TabPane>
      </Tabs>

      {/* Modal para adicionar/editar figura de mérito */}
      <Modal
        title={editingFigure ? t('meritFigures.modal.editTitle') : t('meritFigures.modal.addTitle')}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingFigure(null);
        }}
        footer={null}
        width={600}
      >
        <MeritFigureForm
          figure={editingFigure}
          onSave={handleSaveFigure}
          onCancel={() => {
            setModalVisible(false);
            setEditingFigure(null);
          }}
        />
      </Modal>

      {/* Modal para configurar impactos das fases */}
      {selectedFigure && (
        <Modal
          title={t('meritFigures.impactModal.title', { name: selectedFigure.name })}
          open={impactModalVisible}
          onCancel={() => {
            setImpactModalVisible(false);
            setSelectedFigure(null);
          }}
          footer={null}
          width={800}
        >
          <PhaseImpactForm
            figure={selectedFigure}
            phases={getProjectPhases()}
            onSave={handleSaveImpacts}
            onCancel={() => {
              setImpactModalVisible(false);
              setSelectedFigure(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

// Componente do formulário de figura de mérito
interface MeritFigureFormProps {
  figure?: MeritFigure | null;
  onSave: (values: any) => void;
  onCancel: () => void;
}

const MeritFigureForm: React.FC<MeritFigureFormProps> = ({ figure, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (figure) {
      form.setFieldsValue(figure);
    }
  }, [figure, form]);

  const handleSubmit = () => {
    form.validateFields()
      .then(onSave)
      .catch((errorInfo) => {
        // Não fazer nada - os erros de validação já são exibidos nos campos
        console.log('Validation failed:', errorInfo);
      });
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item
        name="name"
        label={t('meritFigures.form.name')}
        rules={[{ required: true, message: t('meritFigures.form.nameRequired') }]}
      >
        <Input placeholder={t('meritFigures.form.namePlaceholder')} />
      </Form.Item>

      <Form.Item
        name="description"
        label={t('meritFigures.form.description')}
        rules={[{ required: true, message: t('meritFigures.form.descriptionRequired') }]}
      >
        <TextArea 
          rows={3} 
          placeholder={t('meritFigures.form.descriptionPlaceholder')} 
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="category"
            label={t('meritFigures.form.category')}
            rules={[{ required: true, message: t('meritFigures.form.categoryRequired') }]}
          >
            <Select placeholder={t('meritFigures.form.categoryPlaceholder')}>
              <Option value="cost">{t('meritFigures.categories.cost')}</Option>
              <Option value="time">{t('meritFigures.categories.time')}</Option>
              <Option value="quality">{t('meritFigures.categories.quality')}</Option>
              <Option value="scope">{t('meritFigures.categories.scope')}</Option>
              <Option value="risk">{t('meritFigures.categories.risk')}</Option>
              <Option value="resource">{t('meritFigures.categories.resource')}</Option>
              <Option value="custom">{t('meritFigures.categories.custom')}</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="unit"
            label={t('meritFigures.form.unit')}
            rules={[{ required: true, message: t('meritFigures.form.unitRequired') }]}
          >
            <Input placeholder="%, $, dias, horas..." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="baselineValue"
            label={t('meritFigures.form.baselineValue')}
            rules={[{ required: true, message: t('meritFigures.form.baselineRequired') }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              placeholder="0"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="currentValue"
            label={t('meritFigures.form.currentValue')}
            rules={[{ required: true, message: t('meritFigures.form.currentRequired') }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              placeholder="0"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="targetValue"
            label={t('meritFigures.form.targetValue')}
            rules={[{ required: true, message: t('meritFigures.form.targetRequired') }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              placeholder="0"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="direction"
            label={t('meritFigures.form.direction')}
            rules={[{ required: true, message: t('meritFigures.form.directionRequired') }]}
          >
            <Select placeholder={t('meritFigures.form.directionPlaceholder')}>
              <Option value="increase">
                <ArrowUpOutlined style={{ color: '#52c41a' }} /> {t('meritFigures.direction.increase')}
              </Option>
              <Option value="decrease">
                <ArrowDownOutlined style={{ color: '#f5222d' }} /> {t('meritFigures.direction.decrease')}
              </Option>
              <Option value="maintain">
                <MinusOutlined style={{ color: '#8c8c8c' }} /> {t('meritFigures.direction.maintain')}
              </Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="weight"
            label={t('meritFigures.form.weight')}
            rules={[{ required: true, message: t('meritFigures.form.weightRequired') }]}
          >
            <InputNumber 
              min={1} 
              max={10} 
              style={{ width: '100%' }} 
              placeholder="1-10"
            />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Space>
          <Button onClick={onCancel}>
            {t('buttons.cancel')}
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            {figure ? t('buttons.save') : t('buttons.add')}
          </Button>
        </Space>
      </div>
    </Form>
  );
};

// Componente para configurar impactos das fases
interface PhaseImpactFormProps {
  figure: MeritFigure;
  phases: TreeNode[];
  onSave: (impacts: PhaseImpact[]) => void;
  onCancel: () => void;
}

const PhaseImpactForm: React.FC<PhaseImpactFormProps> = ({ figure, phases, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [impacts, setImpacts] = useState<PhaseImpact[]>(figure.phaseImpacts || []);

  const handleImpactChange = (nodeId: string, field: keyof PhaseImpact, value: any) => {
    setImpacts(prev => {
      const existing = prev.find(impact => impact.nodeId === nodeId);
      if (existing) {
        return prev.map(impact => 
          impact.nodeId === nodeId 
            ? { ...impact, [field]: value }
            : impact
        );
      } else {
        const phase = phases.find(p => p.id === nodeId);
        return [...prev, {
          nodeId,
          nodeName: phase?.name || '',
          valorAgregado: 0,
          impactDescription: '',
          impactType: 'neutral',
          weight: 5,
          [field]: value
        }];
      }
    });
  };

  const handleSave = () => {
    onSave(impacts);
  };

  return (
    <div>
      <Paragraph>
        {t('meritFigures.impactModal.description')}
      </Paragraph>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {phases.map(phase => {
          const impact = impacts.find(i => i.nodeId === phase.id);
          
          return (
            <Card 
              key={phase.id} 
              size="small" 
              style={{ marginBottom: 16 }}
              title={phase.name}
            >
              <Form.Item label={t('meritFigures.impactModal.impactPercentage')}>
                <InputNumber
                  min={-100}
                  max={100}
                  value={impact?.valorAgregado || 0}
                  onChange={(value) => handleImpactChange(phase.id, 'valorAgregado', value)}
                  addonAfter={figure.unit}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              <Form.Item label={t('meritFigures.impactModal.impactType')}>
                <Select
                  value={impact?.impactType || 'neutral'}
                  onChange={(value) => handleImpactChange(phase.id, 'impactType', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="positive">
                    <ArrowUpOutlined style={{ color: '#52c41a' }} /> 
                    {t('meritFigures.impactType.positive')}
                  </Option>
                  <Option value="negative">
                    <ArrowDownOutlined style={{ color: '#f5222d' }} /> 
                    {t('meritFigures.impactType.negative')}
                  </Option>
                  <Option value="neutral">
                    <MinusOutlined style={{ color: '#8c8c8c' }} /> 
                    {t('meritFigures.impactType.neutral')}
                  </Option>
                </Select>
              </Form.Item>
              
              <Form.Item label={t('meritFigures.impactModal.description')}>
                <TextArea
                  rows={2}
                  value={impact?.impactDescription || ''}
                  onChange={(e) => handleImpactChange(phase.id, 'impactDescription', e.target.value)}
                  placeholder={t('meritFigures.impactModal.descriptionPlaceholder')}
                />
              </Form.Item>
            </Card>
          );
        })}
      </div>

      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Space>
          <Button onClick={onCancel}>
            {t('buttons.cancel')}
          </Button>
          <Button type="primary" onClick={handleSave}>
            {t('buttons.save')}
          </Button>
        </Space>
      </div>
    </div>
  );
};

// Tooltip customizado para mostrar informações das fases
function CustomTooltip(props: any) {
  const { active, payload, label } = props;
  
  if (active && payload && payload.length > 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '6px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minWidth: '250px',
        maxWidth: '400px'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          {label}
        </div>
        
        {payload.map((entry: any, index: number) => {
          const data = entry.payload;
          const value = entry.value;
          const figureName = entry.dataKey;
          
          // Buscar os metadados específicos desta figura
          const phases = data[`${figureName}_phases`];
          const figureUnit = data[`${figureName}_figureUnit`];
          const fullFigureName = data[`${figureName}_figureName`];
          const totalContribution = data[`${figureName}_totalContribution`];
          
          return (
            <div key={index} style={{ marginBottom: index < payload.length - 1 ? '12px' : '0' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: entry.color }}>{fullFigureName || figureName}:</strong> {value} {figureUnit || ''}
              </div>
              
              {phases && phases.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>
                    Fases que contribuíram:
                  </div>
                  {phases.map((phase: any, phaseIndex: number) => (
                    <div key={phaseIndex} style={{ 
                      marginBottom: '2px', 
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: '#666' }}>{phase.phaseName}</span>
                      <span style={{ 
                        color: phase.valorAgregado > 0 ? '#52c41a' : phase.valorAgregado < 0 ? '#f5222d' : '#666',
                        fontWeight: 'bold'
                      }}>
                        {phase.valorAgregado > 0 ? '+' : ''}{phase.valorAgregado} {figureUnit || ''}
                      </span>
                    </div>
                  ))}
                  
                  {totalContribution !== undefined && phases.length > 1 && (
                    <div style={{ 
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid #eee',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>Total desta data:</span>
                      <span style={{ 
                        color: totalContribution > 0 ? '#52c41a' : totalContribution < 0 ? '#f5222d' : '#666'
                      }}>
                        {totalContribution > 0 ? '+' : ''}{totalContribution} {figureUnit || ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  
  return null;
}

// Exemplo de dot customizado
function CustomDot(props: DotProps) {
  const { cx, cy, stroke, fill } = props;
  // Sempre renderiza o ponto, independente do payload
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      stroke={stroke || '#1890ff'}
      strokeWidth={2}
      fill={fill || '#fff'}
    />
  );
}

export default MeritFigures; 