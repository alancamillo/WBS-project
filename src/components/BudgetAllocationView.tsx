import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Select, DatePicker, Space, Typography, Table, Tag, Switch, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ColumnType } from 'antd/es/table';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, eachQuarterOfInterval, eachYearOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TreeNode } from '../types';
import { PieChartOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface BudgetAllocationViewProps {
  rootNode: TreeNode;
}

type PeriodType = 'month' | 'quarter' | 'year';

interface PeriodData {
  period: string;
  date: Date;
  total: number;
  [key: string]: any; // Para permitir propriedades dinâmicas dos níveis
}



const BudgetAllocationView: React.FC<BudgetAllocationViewProps> = ({ rootNode }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([2, 3]); // Padrão: mostrar fases e atividades
  const [chartGroupMode, setChartGroupMode] = useState<'grouped' | 'separated'>('grouped'); // Modo de agrupamento do gráfico
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set()); // Séries ocultas no gráfico
  const [chartKey, setChartKey] = useState<number>(0); // Key para forçar re-render do gráfico
  const [pageSize, setPageSize] = useState<number>(10); // Tamanho da página
  const [currentPage, setCurrentPage] = useState<number>(1); // Página atual

  // Função para alternar visibilidade de uma série
  const toggleSeriesVisibility = (seriesKey: string) => {
    setHiddenSeries(prev => {
      const newSet = new Set(prev);
      const isRemoving = newSet.has(seriesKey);
      
      if (isRemoving) {
        newSet.delete(seriesKey);
      } else {
        newSet.add(seriesKey);
      }
      return newSet;
    });
    // Forçar re-render do gráfico
    setChartKey(prev => prev + 1);
  };

  // Limpar séries ocultas quando mudar de modo
  React.useEffect(() => {
    setHiddenSeries(new Set());
    setChartKey(prev => prev + 1); // Regenerar gráfico ao mudar modo
  }, [chartGroupMode]);

  // Regenerar gráfico quando filtros principais mudarem
  React.useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [periodType, selectedLevels]);

  // Reset da paginação quando dados da tabela mudarem
  React.useEffect(() => {
    setCurrentPage(1);
  }, [periodType, dateRange]);







  // Função para obter todas as datas do projeto
  const getProjectDateRange = (): [Date, Date] => {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const traverse = (node: TreeNode) => {
      if (node.startDate) {
        if (!minDate || node.startDate < minDate) {
          minDate = node.startDate;
        }
      }
      if (node.endDate) {
        if (!maxDate || node.endDate > maxDate) {
          maxDate = node.endDate;
        }
      }
      node.children.forEach(child => traverse(child));
    };

    traverse(rootNode);

    const result: [Date, Date] = [
      minDate || new Date(),
      maxDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    ];



    return result;
  };

  // Função para gerar períodos baseado no tipo selecionado
  const generatePeriods = (startDate: Date, endDate: Date, type: PeriodType): Date[] => {
    const adjustedStart = startDate;
    const adjustedEnd = endDate;

    switch (type) {
      case 'month':
        return eachMonthOfInterval({ start: adjustedStart, end: adjustedEnd });
      case 'quarter':
        return eachQuarterOfInterval({ start: adjustedStart, end: adjustedEnd });
      case 'year':
        return eachYearOfInterval({ start: adjustedStart, end: adjustedEnd });
      default:
        return eachMonthOfInterval({ start: adjustedStart, end: adjustedEnd });
    }
  };

  // Função para obter o intervalo de um período
  const getPeriodInterval = (date: Date, type: PeriodType): [Date, Date] => {
    switch (type) {
      case 'month':
        return [startOfMonth(date), endOfMonth(date)];
      case 'quarter':
        return [startOfQuarter(date), endOfQuarter(date)];
      case 'year':
        return [startOfYear(date), endOfYear(date)];
      default:
        return [startOfMonth(date), endOfMonth(date)];
    }
  };

  // Função para formatar período
  const formatPeriod = (date: Date, type: PeriodType): string => {
    switch (type) {
      case 'month':
        return format(date, 'MMM/yy', { locale: ptBR });
      case 'quarter':
        return format(date, 'QQQ/yy', { locale: ptBR });
      case 'year':
        return format(date, 'yyyy');
      default:
        return format(date, 'MMM/yy', { locale: ptBR });
    }
  };

  // Função para obter cor por nível
  const getLevelColor = (level: number): string => {
    const colors = {
      1: '#1890ff',
      2: '#52c41a', 
      3: '#faad14',
      4: '#f5222d',
      5: '#722ed1'
    };
    return colors[level as keyof typeof colors] || '#d9d9d9';
  };

  // Função para calcular alocação de budget por período (modo agrupado)
  const calculateBudgetAllocation = useMemo(() => {
    const [projectStart, projectEnd] = dateRange || getProjectDateRange();
    const periods = generatePeriods(projectStart, projectEnd, periodType);
    
    const data: PeriodData[] = periods.map(periodDate => {
      const [intervalStart, intervalEnd] = getPeriodInterval(periodDate, periodType);
      const periodData: PeriodData = {
        period: formatPeriod(periodDate, periodType),
        date: periodDate,
        total: 0
      };

      // Função para calcular custos de um nó no período
      const calculateNodeCostInPeriod = (node: TreeNode): number => {
        if (!node.startDate || !node.endDate) return 0;

        // Verifica se o nó tem interseção com o período
        const nodeStart = node.startDate;
        const nodeEnd = node.endDate;
        
        // Calcula interseção entre o período e o nó
        const intersectionStart = new Date(Math.max(intervalStart.getTime(), nodeStart.getTime()));
        const intersectionEnd = new Date(Math.min(intervalEnd.getTime(), nodeEnd.getTime()));
        
        if (intersectionStart > intersectionEnd) return 0;

        // Calcula proporção do custo baseado na interseção
        const nodeDuration = nodeEnd.getTime() - nodeStart.getTime();
        const intersectionDuration = intersectionEnd.getTime() - intersectionStart.getTime();
        const proportion = intersectionDuration / nodeDuration;
        
        return node.cost * proportion;
      };

      // Função recursiva para processar nós
      const processNode = (node: TreeNode, level: number = 1) => {
        if (selectedLevels.includes(level)) {
          const costInPeriod = calculateNodeCostInPeriod(node);
          const levelKey = `level${level}`;
          
          if (!periodData[levelKey]) {
            periodData[levelKey] = 0;
          }
          
          periodData[levelKey] += costInPeriod;
          periodData.total += costInPeriod;
        }

        // Processa filhos
        node.children.forEach(child => processNode(child, level + 1));
      };

      processNode(rootNode);
      return periodData;
    });

    return data;
  }, [rootNode, periodType, dateRange, selectedLevels]);

  // Função para calcular alocação separada por fases individuais
  const calculateSeparatedBudgetAllocation = useMemo(() => {
    const [projectStart, projectEnd] = dateRange || getProjectDateRange();
    const periods = generatePeriods(projectStart, projectEnd, periodType);
    
    // Primeiro, obter todas as fases (nível 2)
    const phases: TreeNode[] = [];
    const collectPhases = (node: TreeNode) => {
      if (node.level === 2) {
        phases.push(node);
      }
      node.children.forEach(child => collectPhases(child));
    };
    collectPhases(rootNode);

    const data: PeriodData[] = periods.map(periodDate => {
      const [intervalStart, intervalEnd] = getPeriodInterval(periodDate, periodType);
      const periodData: PeriodData = {
        period: formatPeriod(periodDate, periodType),
        date: periodDate,
        total: 0
      };

      // Função para calcular custos de um nó no período
      const calculateNodeCostInPeriod = (node: TreeNode): number => {
        if (!node.startDate || !node.endDate) return 0;

        const nodeStart = node.startDate;
        const nodeEnd = node.endDate;
        
        const intersectionStart = new Date(Math.max(intervalStart.getTime(), nodeStart.getTime()));
        const intersectionEnd = new Date(Math.min(intervalEnd.getTime(), nodeEnd.getTime()));
        
        if (intersectionStart > intersectionEnd) return 0;

        const nodeDuration = nodeEnd.getTime() - nodeStart.getTime();
        const intersectionDuration = intersectionEnd.getTime() - intersectionStart.getTime();
        const proportion = nodeDuration > 0 ? intersectionDuration / nodeDuration : 0;
        
        return node.cost * proportion;
      };

      // Calcular custo de cada fase separadamente
      phases.forEach(phase => {
        const phaseKey = `phase_${phase.id}`;
        let phaseCost = 0;

        // Incluir custo da própria fase
        phaseCost += calculateNodeCostInPeriod(phase);

        // Incluir custos dos filhos (atividades) se nível 3 estiver selecionado
        if (selectedLevels.includes(3)) {
          const calculateChildrenCost = (node: TreeNode): number => {
            let childrenCost = 0;
            node.children.forEach(child => {
              childrenCost += calculateNodeCostInPeriod(child);
              childrenCost += calculateChildrenCost(child);
            });
            return childrenCost;
          };
          phaseCost += calculateChildrenCost(phase);
        }

        periodData[phaseKey] = phaseCost;
        periodData.total += phaseCost;
      });

      return periodData;
    });

    return { data, phases };
  }, [rootNode, periodType, dateRange, selectedLevels]);

  // Função para calcular dados cumulativos
  const cumulativeData = useMemo(() => {
    const sourceData = chartGroupMode === 'grouped' 
      ? calculateBudgetAllocation 
      : calculateSeparatedBudgetAllocation.data;
      
    let cumulative = 0;
    return sourceData.map(item => {
      cumulative += (item.total || 0);
      return {
        ...item,
        cumulative
      };
    });
  }, [calculateBudgetAllocation, calculateSeparatedBudgetAllocation, chartGroupMode]);

  // Calcular valor máximo do eixo Y baseado nas séries visíveis
  const getYAxisDomain = useMemo(() => {
    const sourceData = chartGroupMode === 'grouped' 
      ? calculateBudgetAllocation 
      : calculateSeparatedBudgetAllocation.data;

    if (hiddenSeries.size === 0) {
      return ['dataMin', 'dataMax'];
    }

    // Calcular máximo considerando apenas séries visíveis
    let maxValue = 0;
    sourceData.forEach(item => {
      let visibleTotal = 0;
      
      if (chartGroupMode === 'grouped') {
        selectedLevels.forEach(level => {
          const key = `level${level}`;
          if (!hiddenSeries.has(key) && item[key]) {
            visibleTotal += item[key];
          }
        });
      } else {
        calculateSeparatedBudgetAllocation.phases.forEach(phase => {
          const key = `phase_${phase.id}`;
          if (!hiddenSeries.has(key) && item[key]) {
            visibleTotal += item[key];
          }
        });
      }
      
      maxValue = Math.max(maxValue, visibleTotal);
    });

    return [0, Math.max(maxValue * 1.1, 1000)]; // Adiciona 10% de margem
  }, [calculateBudgetAllocation, calculateSeparatedBudgetAllocation, chartGroupMode, hiddenSeries, selectedLevels]);

  // Função para determinar quais séries têm dados relevantes (valores > 0)
  const getSeriesWithData = useMemo(() => {
    const sourceData = chartGroupMode === 'grouped' 
      ? calculateBudgetAllocation 
      : calculateSeparatedBudgetAllocation.data;

    const seriesWithData = new Set<string>();

    if (chartGroupMode === 'grouped') {
      selectedLevels.forEach(level => {
        const key = `level${level}`;
        const hasData = sourceData.some(item => item[key] && item[key] > 0);
        if (hasData) {
          seriesWithData.add(key);
        }
      });
    } else {
      calculateSeparatedBudgetAllocation.phases.forEach(phase => {
        const key = `phase_${phase.id}`;
        const hasData = sourceData.some(item => item[key] && item[key] > 0);
        if (hasData) {
          seriesWithData.add(key);
        }
      });
    }

    return seriesWithData;
  }, [calculateBudgetAllocation, calculateSeparatedBudgetAllocation, chartGroupMode, selectedLevels]);







  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };



  // Função para calcular dados da tabela transposta com hierarquia completa sem duplicação
  const tableData = useMemo(() => {
    const [projectStart, projectEnd] = dateRange || getProjectDateRange();
    

    
    const periods = generatePeriods(projectStart, projectEnd, periodType);
    
    const result: any[] = [];

    // Função para calcular custo de um nó em um período específico
    const calculateNodeCostInPeriod = (node: TreeNode, intervalStart: Date, intervalEnd: Date, useOwnCostOnly = false): number => {
      if (!node.startDate || !node.endDate) {
        return 0;
      }

      const nodeStart = node.startDate;
      const nodeEnd = node.endDate;
      
      const intersectionStart = new Date(Math.max(intervalStart.getTime(), nodeStart.getTime()));
      const intersectionEnd = new Date(Math.min(intervalEnd.getTime(), nodeEnd.getTime()));
      
      if (intersectionStart > intersectionEnd) return 0;

      const nodeDuration = nodeEnd.getTime() - nodeStart.getTime();
      const intersectionDuration = intersectionEnd.getTime() - intersectionStart.getTime();
      const proportion = nodeDuration > 0 ? intersectionDuration / nodeDuration : 0;
      
      // Para nós folha, usar custo próprio; para nós pai, usar totalCost se não especificado diferente
      const costToUse = useOwnCostOnly || node.children.length === 0 ? node.cost : node.totalCost;
      const result = costToUse * proportion;
      

      
      return result;
    };

    // Função recursiva para processar nós e criar linhas da tabela
    const processNode = (node: TreeNode, parentPath = '') => {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      
      // Criar linha para este nó
      const rowData: any = {
        key: node.id,
        name: node.name,
        level: node.level,
        path: currentPath,
        total: 0,
        isLeaf: node.children.length === 0
      };

      // Calcular valores para cada período
      periods.forEach(periodDate => {
        const [intervalStart, intervalEnd] = getPeriodInterval(periodDate, periodType);
        const periodKey = formatPeriod(periodDate, periodType);
        
        let periodCost = 0;
        
        // SEMPRE usar apenas o custo próprio de cada nó para evitar duplicação
        // O totalCost já será refletido pela soma de todos os nós individuais
        periodCost = calculateNodeCostInPeriod(node, intervalStart, intervalEnd, true);
        

        
        rowData[periodKey] = periodCost;
        rowData.total += periodCost;
      });

      result.push(rowData);

      // Processar filhos recursivamente
      node.children.forEach(child => {
        processNode(child, currentPath);
      });
    };

    // Começar do nó raiz
    processNode(rootNode);



    return result;
  }, [rootNode, periodType, dateRange]);

  // Colunas da tabela transposta
  const tableColumns: ColumnType<any>[] = useMemo(() => {
    const [projectStart, projectEnd] = dateRange || getProjectDateRange();
    const periods = generatePeriods(projectStart, projectEnd, periodType);
    
    const baseColumns: ColumnType<any>[] = [
      {
        title: 'Estrutura WBS',
        dataIndex: 'name',
        key: 'name',
        width: 250,
        fixed: 'left',
        render: (text: string, record: any) => (
          <div style={{ paddingLeft: (record.level - 1) * 20 }}>
            <Space>
              {record.level === 1 ? (
                <FileOutlined style={{ color: getLevelColor(1) }} />
              ) : record.level === 2 ? (
                <FolderOutlined style={{ color: getLevelColor(2) }} />
              ) : (
                <FileOutlined style={{ color: getLevelColor(3) }} />
              )}
              <Text 
                strong={record.level <= 2} 
                style={{ 
                  fontSize: record.level === 1 ? '14px' : record.level === 2 ? '13px' : '12px',
                  color: record.level === 1 ? '#1890ff' : record.level === 2 ? '#333' : '#666',
                  fontWeight: record.isLeaf ? 'normal' : 'bold'
                }}
              >
                {text}
              </Text>
              {!record.isLeaf && (
                <Text type="secondary" style={{ fontSize: '10px', marginLeft: 4 }}>
                  (consolidado)
                </Text>
              )}
            </Space>
          </div>
        ),
      }
    ];

    // Adiciona coluna para cada período
    const periodColumns: ColumnType<any>[] = periods.map(periodDate => {
      const periodKey = formatPeriod(periodDate, periodType);
      return {
        title: periodKey,
        dataIndex: periodKey,
        key: periodKey,
        width: 100,
        align: 'right' as const,
        render: (value: number, record: any) => (
          <Text style={{ 
            color: value > 0 ? '#1890ff' : '#999',
            fontWeight: record.level <= 2 && value > 0 ? 'bold' : 'normal',
            fontSize: '11px',
            opacity: record.isLeaf ? 1 : 0.9
          }}>
            {value > 0 ? formatCurrency(value) : '-'}
          </Text>
        )
      };
    });

    // Adiciona coluna de total
    const totalColumn: ColumnType<any> = {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      fixed: 'right',
      render: (value: number, record: any) => (
        <Text strong={record.level <= 2} style={{ 
          color: getLevelColor(record.level),
          fontSize: record.level === 1 ? '13px' : '12px',
          opacity: record.isLeaf ? 1 : 0.9
        }}>
          {formatCurrency(value)}
        </Text>
      )
    };

    return [...baseColumns, ...periodColumns, totalColumn];
  }, [periodType, dateRange]);

  return (
    <div style={{ padding: '0 16px' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <PieChartOutlined style={{ marginRight: 8 }} />
        Alocação de Budget
      </Title>

      {/* Controles */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">Período</Text>
              <Select
                value={periodType}
                onChange={setPeriodType}
                style={{ width: '100%' }}
                options={[
                  { value: 'month', label: 'Mensal' },
                  { value: 'quarter', label: 'Trimestral' },
                  { value: 'year', label: 'Anual' }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">Intervalo de Datas</Text>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0].toDate(), dates[1].toDate()]);
                  } else {
                    setDateRange(null);
                  }
                }}
                placeholder={['Data Início', 'Data Fim']}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">Níveis WBS</Text>
              <Select
                mode="multiple"
                value={selectedLevels}
                onChange={setSelectedLevels}
                style={{ width: '100%' }}
                options={[
                  { value: 1, label: 'Nível 1 (Projeto)' },
                  { value: 2, label: 'Nível 2 (Fase)' },
                  { value: 3, label: 'Nível 3 (Atividade)' }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">Agrupamento do Gráfico</Text>
              <Space align="center">
                <Text style={{ fontSize: '12px', color: chartGroupMode === 'grouped' ? '#1890ff' : '#999' }}>
                  Por Nível
                </Text>
                <Switch
                  checked={chartGroupMode === 'separated'}
                  onChange={(checked) => setChartGroupMode(checked ? 'separated' : 'grouped')}
                  size="small"
                />
                <Text style={{ fontSize: '12px', color: chartGroupMode === 'separated' ? '#1890ff' : '#999' }}>
                  Por Fase
                </Text>
              </Space>
            </Space>
          </Col>

        </Row>
      </Card>



      {/* Tabela de Detalhes */}
      <Card title="Detalhamento por Período" style={{ marginBottom: 24 }}>
        <Table
          columns={tableColumns}
          dataSource={tableData}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${total} itens`,
            size: 'small',
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
                setCurrentPage(1); // Reset para primeira página quando mudar o tamanho
              }
            },
            onShowSizeChange: (current, size) => {
              setPageSize(size);
              setCurrentPage(1); // Reset para primeira página quando mudar o tamanho
            }
          }}
          scroll={{ x: 800 }}
          size="small"
          rowKey="key"
          summary={(data) => {
            const [projectStart, projectEnd] = dateRange || getProjectDateRange();
            const periods = generatePeriods(projectStart, projectEnd, periodType);
            
            // Calcular totais de TODOS os nós (cada um representa apenas seu custo próprio)
            const totalSum = data.reduce((sum, record) => sum + (record.total || 0), 0);
            

            
            // Calcula soma por período de TODOS os nós
            const periodSums: Record<string, number> = {};
            periods.forEach(periodDate => {
              const periodKey = formatPeriod(periodDate, periodType);
              periodSums[periodKey] = data.reduce((sum, record) => sum + (record[periodKey] || 0), 0);
            });

            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                <Table.Summary.Cell index={0}>
                  <Text strong>Total Consolidado</Text>
                </Table.Summary.Cell>
                {periods.map((periodDate, index) => {
                  const periodKey = formatPeriod(periodDate, periodType);
                  return (
                    <Table.Summary.Cell key={periodKey} index={index + 1} align="right">
                      <Text strong style={{ color: '#1890ff', fontSize: '11px' }}>
                        {formatCurrency(periodSums[periodKey])}
                      </Text>
                    </Table.Summary.Cell>
                  );
                })}
                <Table.Summary.Cell index={1 + periods.length} align="right">
                  <Text strong style={{ color: '#1890ff', fontSize: '12px' }}>
                    {formatCurrency(totalSum)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* Gráficos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={`Gráfico de Áreas - ${chartGroupMode === 'grouped' ? 'Agrupado por Nível' : 'Separado por Fase'}`}
            extra={
              <Space size={8} align="center">
                <Button 
                  size="small" 
                  type="text" 
                  icon={<ReloadOutlined />}
                  onClick={() => setChartKey(prev => prev + 1)}
                  title="Atualizar gráfico"
                  style={{ padding: '4px', minWidth: '24px' }}
                />
                <Button 
                  size="small" 
                  type="link" 
                  onClick={() => {
                    setHiddenSeries(new Set());
                    setChartKey(prev => prev + 1); // Regenerar gráfico
                  }}
                  disabled={hiddenSeries.size === 0}
                  style={{ padding: '0 4px', fontSize: '11px' }}
                >
                  Mostrar Todas
                </Button>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  💡 Clique na legenda
                </Text>
              </Space>
            }
            style={{ height: 400, position: 'relative' }}
          >
            {hiddenSeries.size > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: 35, 
                left: 8, 
                zIndex: 10,
                background: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                📊 {hiddenSeries.size} série{hiddenSeries.size > 1 ? 's' : ''} oculta{hiddenSeries.size > 1 ? 's' : ''}
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart 
                key={`chart-${chartKey}`}
                data={chartGroupMode === 'grouped' ? calculateBudgetAllocation : calculateSeparatedBudgetAllocation.data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis 
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  domain={getYAxisDomain}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (chartGroupMode === 'grouped') {
                      return [formatCurrency(value), name.replace('level', 'Nível ')];
                    } else {
                      // Encontrar o nome da fase pelo ID
                      const phaseId = name.replace('phase_', '');
                      const phase = calculateSeparatedBudgetAllocation.phases.find(p => p.id === phaseId);
                      return [formatCurrency(value), phase?.name || name];
                    }
                  }}
                  labelFormatter={(label) => `Período: ${label}`}
                />
                <Legend 
                  formatter={(value: string) => {
                    const isHidden = hiddenSeries.has(value);
                    const displayName = chartGroupMode === 'grouped' 
                      ? value.replace('level', 'Nível ')
                      : (() => {
                          const phaseId = value.replace('phase_', '');
                          const phase = calculateSeparatedBudgetAllocation.phases.find(p => p.id === phaseId);
                          return phase?.name || value;
                        })();
                    
                    return (
                      <span style={{ 
                        opacity: isHidden ? 0.5 : 1,
                        color: isHidden ? '#bfbfbf' : 'inherit',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.2s ease'
                      }}>
                        {isHidden ? '◯ ' : '● '}{displayName}
                      </span>
                    );
                  }}
                  onClick={(e) => {
                    if (e.dataKey) {
                      toggleSeriesVisibility(String(e.dataKey));
                    }
                  }}
                />
                {chartGroupMode === 'grouped' 
                  ? selectedLevels.map(level => {
                      const isHidden = hiddenSeries.has(`level${level}`);
                      const hasData = getSeriesWithData.has(`level${level}`);
                      
                      // Só renderizar se tem dados ou se não está oculta (para manter na legenda)
                      if (!hasData && isHidden) return null;
                      
                      return (
                        <Area
                          key={level}
                          type="monotone"
                          dataKey={`level${level}`}
                          stroke={getLevelColor(level)}
                          fill={getLevelColor(level)}
                          fillOpacity={isHidden || !hasData ? 0 : 0.3}
                          strokeOpacity={isHidden || !hasData ? 0 : 0.8}
                          strokeWidth={2}
                          name={`level${level}`}
                          connectNulls={false}
                        />
                      );
                    }).filter(Boolean)
                  : calculateSeparatedBudgetAllocation.phases.map((phase) => {
                      const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];
                      const originalIndex = calculateSeparatedBudgetAllocation.phases.findIndex(p => p.id === phase.id);
                      const color = colors[originalIndex % colors.length];
                      const isHidden = hiddenSeries.has(`phase_${phase.id}`);
                      const hasData = getSeriesWithData.has(`phase_${phase.id}`);
                      
                      // Só renderizar se tem dados ou se não está oculta (para manter na legenda)
                      if (!hasData && isHidden) return null;
                      
                      return (
                        <Area
                          key={phase.id}
                          type="monotone"
                          dataKey={`phase_${phase.id}`}
                          stroke={color}
                          fill={color}
                          fillOpacity={isHidden || !hasData ? 0 : 0.3}
                          strokeOpacity={isHidden || !hasData ? 0 : 0.8}
                          strokeWidth={2}
                          name={`phase_${phase.id}`}
                          connectNulls={false}
                        />
                      );
                    }).filter(Boolean)
                }
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Orçamento Cumulativo" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Acumulado']}
                  labelFormatter={(label) => `Período: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#1890ff"
                  strokeWidth={3}
                  dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>


    </div>
  );
};

export default BudgetAllocationView; 