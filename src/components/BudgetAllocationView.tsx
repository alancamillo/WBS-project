import React, { useState, useMemo, useRef } from 'react';
import { Card, Row, Col, Select, DatePicker, Space, Typography, Table, Switch, Button, Dropdown, message } from 'antd';
import { ReloadOutlined, FileImageOutlined, CameraOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCurrencySettings } from '../hooks/useCurrencySettings';
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
  ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, eachQuarterOfInterval, eachYearOfInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR, enUS, es, zhCN } from 'date-fns/locale';
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
  const { t, i18n } = useTranslation();
  const { formatCurrency, getCurrencySymbol } = useCurrencySettings();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([2, 3]); // Padrão: mostrar fases e atividades
  const [chartGroupMode, setChartGroupMode] = useState<'grouped' | 'separated'>('grouped'); // Modo de agrupamento do gráfico
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set()); // Séries ocultas no gráfico
  const [chartKey, setChartKey] = useState<number>(0); // Key para forçar re-render do gráfico
  const [pageSize, setPageSize] = useState<number>(10); // Tamanho da página
  const [currentPage, setCurrentPage] = useState<number>(1); // Página atual

  // Refs para captura de elementos para exportação
  const tableRef = useRef<HTMLDivElement>(null);
  const areaChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);

  // Função para exportar tabela como imagem
  const handleExportTableImage = async (format: 'png' | 'jpeg' = 'png') => {
    if (!tableRef.current) {
      message.error(t('budgetAllocation.exportError') || 'Error: Table not found');
      return;
    }

    try {
      // Dynamic import to avoid TypeScript issues
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(tableRef.current, {
        useCORS: true,
        allowTaint: true
      });
      
      const dataUrl = canvas.toDataURL(`image/${format}`, 0.9);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `budget-allocation-table-${new Date().toISOString().split('T')[0]}.${format}`;
      link.click();

      message.success(t('budgetAllocation.tableExportSuccess') || 'Budget table exported successfully');
    } catch (error) {
      console.error('Error exporting budget table:', error);
      message.error(t('budgetAllocation.exportError') || 'Error exporting budget table');
    }
  };

  // Função para exportar gráfico de área como imagem
  const handleExportAreaChartImage = async (format: 'png' | 'jpeg' = 'png') => {
    if (!areaChartRef.current) {
      message.error(t('budgetAllocation.exportError') || 'Error: Area chart not found');
      return;
    }

    try {
      // Dynamic import to avoid TypeScript issues
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(areaChartRef.current, {
        useCORS: true,
        allowTaint: true
      });
      
      const dataUrl = canvas.toDataURL(`image/${format}`, 0.9);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `budget-allocation-area-chart-${new Date().toISOString().split('T')[0]}.${format}`;
      link.click();

      message.success(t('budgetAllocation.areaChartExportSuccess') || 'Area chart exported successfully');
    } catch (error) {
      console.error('Error exporting area chart:', error);
      message.error(t('budgetAllocation.exportError') || 'Error exporting area chart');
    }
  };

  // Função para exportar gráfico de linha como imagem
  const handleExportLineChartImage = async (format: 'png' | 'jpeg' = 'png') => {
    if (!lineChartRef.current) {
      message.error(t('budgetAllocation.exportError') || 'Error: Line chart not found');
      return;
    }

    try {
      // Dynamic import to avoid TypeScript issues
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(lineChartRef.current, {
        useCORS: true,
        allowTaint: true
      });
      
      const dataUrl = canvas.toDataURL(`image/${format}`, 0.9);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `budget-allocation-cumulative-chart-${new Date().toISOString().split('T')[0]}.${format}`;
      link.click();

      message.success(t('budgetAllocation.lineChartExportSuccess') || 'Cumulative chart exported successfully');
    } catch (error) {
      console.error('Error exporting cumulative chart:', error);
      message.error(t('budgetAllocation.exportError') || 'Error exporting cumulative chart');
    }
  };

  // Items do dropdown para exportação da tabela
  const tableExportItems = [
    {
      key: 'png',
      label: 'PNG',
      icon: <FileImageOutlined />,
      onClick: () => handleExportTableImage('png')
    },
    {
      key: 'jpeg',
      label: 'JPEG',
      icon: <CameraOutlined />,
      onClick: () => handleExportTableImage('jpeg')
    }
  ];

  // Items do dropdown para exportação do gráfico de área
  const areaChartExportItems = [
    {
      key: 'png',
      label: 'PNG',
      icon: <FileImageOutlined />,
      onClick: () => handleExportAreaChartImage('png')
    },
    {
      key: 'jpeg',
      label: 'JPEG',
      icon: <CameraOutlined />,
      onClick: () => handleExportAreaChartImage('jpeg')
    }
  ];

  // Items do dropdown para exportação do gráfico de linha
  const lineChartExportItems = [
    {
      key: 'png',
      label: 'PNG',
      icon: <FileImageOutlined />,
      onClick: () => handleExportLineChartImage('png')
    },
    {
      key: 'jpeg',
      label: 'JPEG',
      icon: <CameraOutlined />,
      onClick: () => handleExportLineChartImage('jpeg')
    }
  ];

  // Função para obter o locale do date-fns baseado no idioma atual
  const getDateFnsLocale = React.useCallback(() => {
    switch (i18n.language) {
      case 'pt':
        return ptBR;
      case 'en':
        return enUS;
      case 'es':
        return es;
      case 'zh':
        return zhCN;
      default:
        return ptBR;
    }
  }, [i18n.language]);

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
  const getProjectDateRange = React.useCallback((): [Date, Date] => {
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
  }, [rootNode]);

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
  const formatPeriod = React.useCallback((date: Date, type: PeriodType): string => {
    const locale = getDateFnsLocale();
    switch (type) {
      case 'month':
        return format(date, 'MMM/yy', { locale });
      case 'quarter':
        return format(date, 'QQQ/yy', { locale });
      case 'year':
        return format(date, 'yyyy', { locale });
      default:
        return format(date, 'MMM/yy', { locale });
    }
  }, [getDateFnsLocale]);

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

        // Normalize node dates to start and end of day for consistent calculation
        const nodeStart = startOfDay(node.startDate);
        const nodeEnd = endOfDay(node.endDate);
        
        // Calculate intersection between the period and the node's duration
        const intersectionStart = new Date(Math.max(intervalStart.getTime(), nodeStart.getTime()));
        const intersectionEnd = new Date(Math.min(intervalEnd.getTime(), nodeEnd.getTime()));
        
        // If there's no valid intersection, return 0
        if (intersectionStart.getTime() >= intersectionEnd.getTime()) return 0;

        // Calculate proportion of cost based on the intersection duration
        const nodeDuration = nodeEnd.getTime() - nodeStart.getTime();
        const intersectionDuration = intersectionEnd.getTime() - intersectionStart.getTime();
        const proportion = nodeDuration > 0 ? intersectionDuration / nodeDuration : 0;
        
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
  }, [rootNode, periodType, dateRange, selectedLevels, i18n.language, getProjectDateRange, formatPeriod]);

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

        const nodeStart = startOfDay(node.startDate);
        const nodeEnd = endOfDay(node.endDate);
        
        const intersectionStart = new Date(Math.max(intervalStart.getTime(), nodeStart.getTime()));
        const intersectionEnd = new Date(Math.min(intervalEnd.getTime(), nodeEnd.getTime()));
        
        if (intersectionStart.getTime() >= intersectionEnd.getTime()) return 0;

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
  }, [rootNode, periodType, dateRange, selectedLevels, i18n.language, getProjectDateRange, formatPeriod]);

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

      const nodeStart = startOfDay(node.startDate);
      const nodeEnd = endOfDay(node.endDate);
      
      const intersectionStart = new Date(Math.max(intervalStart.getTime(), nodeStart.getTime()));
      const intersectionEnd = new Date(Math.min(intervalEnd.getTime(), nodeEnd.getTime()));
      
      if (intersectionStart.getTime() >= intersectionEnd.getTime()) return 0;

      const nodeDuration = nodeEnd.getTime() - nodeStart.getTime();
      const intersectionDuration = intersectionEnd.getTime() - intersectionStart.getTime();
      const proportion = nodeDuration > 0 ? intersectionDuration / nodeDuration : 0;
      
      // Para nós folha, usar custo próprio; para nós pai, usar totalCost se não especificado diferente
      const costToUse = (useOwnCostOnly || node.children.length === 0 ? node.cost : node.totalCost) || 0;
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
  }, [rootNode, periodType, dateRange, i18n.language, getProjectDateRange, formatPeriod]);

  // Colunas da tabela transposta
  const tableColumns: ColumnType<any>[] = useMemo(() => {
    const [projectStart, projectEnd] = dateRange || getProjectDateRange();
    const periods = generatePeriods(projectStart, projectEnd, periodType);
    
    const baseColumns: ColumnType<any>[] = [
      {
        title: t('budgetAllocation.wbsStructure'),
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
                  {t('budgetAllocation.consolidated')}
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
      title: t('budgetAllocation.total'),
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
  }, [periodType, dateRange, t, i18n.language, getProjectDateRange, formatPeriod]);

  return (
    <div style={{ padding: '0 16px' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <PieChartOutlined style={{ marginRight: 8 }} />
        {t('budgetAllocation.title')}
      </Title>

      {/* Controles */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">{t('budgetAllocation.period')}</Text>
              <Select
                value={periodType}
                onChange={setPeriodType}
                style={{ width: '100%' }}
                options={[
                  { value: 'month', label: t('budgetAllocation.monthly') },
                  { value: 'quarter', label: t('budgetAllocation.quarterly') },
                  { value: 'year', label: t('budgetAllocation.yearly') }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">{t('budgetAllocation.dateRange')}</Text>
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
                placeholder={[t('budgetAllocation.startDate'), t('budgetAllocation.endDate')]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">{t('budgetAllocation.wbsLevels')}</Text>
              <Select
                mode="multiple"
                value={selectedLevels}
                onChange={setSelectedLevels}
                style={{ width: '100%' }}
                options={[
                  { value: 1, label: t('budgetAllocation.wbsLevel1') },
                  { value: 2, label: t('budgetAllocation.wbsLevel2') },
                  { value: 3, label: t('budgetAllocation.wbsLevel3') }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">{t('budgetAllocation.chartGrouping')}</Text>
              <Space align="center">
                <Text style={{ fontSize: '12px', color: chartGroupMode === 'grouped' ? '#1890ff' : '#999' }}>
                  {t('budgetAllocation.byLevel')}
                </Text>
                <Switch
                  checked={chartGroupMode === 'separated'}
                  onChange={(checked) => setChartGroupMode(checked ? 'separated' : 'grouped')}
                  size="small"
                />
                <Text style={{ fontSize: '12px', color: chartGroupMode === 'separated' ? '#1890ff' : '#999' }}>
                  {t('budgetAllocation.byPhase')}
                </Text>
              </Space>
            </Space>
          </Col>

        </Row>
      </Card>



      {/* Tabela de Detalhes */}
      <Card 
        title={t('budgetAllocation.periodDetail')} 
        extra={
          <Dropdown
            menu={{ items: tableExportItems }}
            placement="bottomRight"
          >
            <Button icon={<FileImageOutlined />}>
              {t('budgetAllocation.exportTable')} <DownloadOutlined />
            </Button>
          </Dropdown>
        }
        style={{ marginBottom: 24 }}
      >
        <div ref={tableRef}>
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
              `${range[0]}-${range[1]} ${t('budgetAllocation.of')} ${total} ${t('budgetAllocation.items')}`,
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
            const totalSum = rootNode.totalCost;
            

            
            // Calcula soma por período de TODOS os nós
            const periodSums: Record<string, number> = {};
            periods.forEach(periodDate => {
              const periodKey = formatPeriod(periodDate, periodType);
              periodSums[periodKey] = data.reduce((sum, record) => sum + (record[periodKey] || 0), 0);
            });

            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                <Table.Summary.Cell index={0}>
                  <Text strong>{t('budgetAllocation.consolidatedTotal')}</Text>
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
        </div>
      </Card>

      {/* Gráficos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={`${t('budgetAllocation.areaChart')} - ${chartGroupMode === 'grouped' ? t('budgetAllocation.groupedByLevel') : t('budgetAllocation.separatedByPhase')}`}
            extra={
              <Space size={8} align="center">
                <Dropdown
                  menu={{ items: areaChartExportItems }}
                  placement="bottomRight"
                >
                  <Button 
                    size="small"
                    icon={<FileImageOutlined />}
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                  >
                    {t('budgetAllocation.exportChart')} <DownloadOutlined />
                  </Button>
                </Dropdown>
                <Button 
                  size="small" 
                  type="text" 
                  icon={<ReloadOutlined />}
                  onClick={() => setChartKey(prev => prev + 1)}
                  title={t('budgetAllocation.updateChart')}
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
                  {t('budgetAllocation.showAll')}
                </Button>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {t('budgetAllocation.clickLegend')}
                </Text>
              </Space>
            }
            style={{ height: 400, position: 'relative' }}
          >
            <div ref={areaChartRef}>
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
                📊 {hiddenSeries.size} {hiddenSeries.size > 1 ? t('budgetAllocation.seriesHiddenPlural') : t('budgetAllocation.seriesHidden')}
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
                  tickFormatter={(value) => `${getCurrencySymbol()} ${(value / 1000).toFixed(0)}k`}
                  domain={getYAxisDomain}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (chartGroupMode === 'grouped') {
                      return [formatCurrency(value), name.replace('level', t('budgetAllocation.level') + ' ')];
                    } else {
                      // Encontrar o nome da fase pelo ID
                      const phaseId = name.replace('phase_', '');
                      const phase = calculateSeparatedBudgetAllocation.phases.find(p => p.id === phaseId);
                      return [formatCurrency(value), phase?.name || name];
                    }
                  }}
                  labelFormatter={(label) => `${t('budgetAllocation.periodLabel')} ${label}`}
                />
                <Legend 
                  formatter={(value: string) => {
                    const isHidden = hiddenSeries.has(value);
                    const displayName = chartGroupMode === 'grouped' 
                      ? value.replace('level', t('budgetAllocation.level') + ' ')
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
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={t('budgetAllocation.cumulativeBudget')} 
            extra={
              <Dropdown
                menu={{ items: lineChartExportItems }}
                placement="bottomRight"
              >
                <Button 
                  size="small"
                  icon={<FileImageOutlined />}
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  {t('budgetAllocation.exportChart')} <DownloadOutlined />
                </Button>
              </Dropdown>
            }
            style={{ height: 400 }}
          >
            <div ref={lineChartRef}>
              <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${getCurrencySymbol()} ${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), t('budgetAllocation.accumulated')]}
                  labelFormatter={(label) => `${t('budgetAllocation.periodLabel')} ${label}`}
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
            </div>
          </Card>
        </Col>
      </Row>


    </div>
  );
};

export default BudgetAllocationView; 