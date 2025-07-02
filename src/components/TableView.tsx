import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Table, Tag, Button, Space, Typography, Tooltip, Progress, Dropdown, message } from 'antd';
import { ColumnType } from 'antd/es/table';
import { Key } from 'antd/es/table/interface';
import { useTranslation } from 'react-i18next';
import { useCurrencySettings } from '../hooks/useCurrencySettings';
import { TreeNode } from '../types';
import { DateCalculator } from '../utils/dateCalculator';
import './TableView.css';
import { 
  FolderOutlined,
  FileOutlined,
  UserOutlined,
  CalendarOutlined,
  DownOutlined,
  RightOutlined,
  ExpandOutlined,
  CompressOutlined,
  FileImageOutlined,
  CameraOutlined,
  DownloadOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface TableViewProps {
  rootNode: TreeNode;
}

interface FlattenedNode extends TreeNode {
  key: string;
  hasChildren: boolean;
  depth: number;
  path: string;
}

const TableView: React.FC<TableViewProps> = ({ 
  rootNode
}) => {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrencySettings();
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());

  // Ref para captura da tabela para exportação
  const tableRef = useRef<HTMLDivElement>(null);

  // Função para exportar tabela como imagem
  const handleExportTableImage = async (format: 'png' | 'jpeg' = 'png') => {
    if (!tableRef.current) {
      message.error(t('tableView.exportError') || 'Error: Table not found');
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
      link.download = `wbs-table-${new Date().toISOString().split('T')[0]}.${format}`;
      link.click();

      message.success(t('tableView.tableExportSuccess') || 'WBS table exported successfully');
    } catch (error) {
      console.error('Error exporting WBS table:', error);
      message.error(t('tableView.exportError') || 'Error exporting WBS table');
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

  // Função para formatação de data baseada no idioma
  const formatDate = useCallback((date?: Date): string => {
    if (!date) return '-';
    
    const localeConfig = {
      pt: 'pt-BR',
      en: 'en-US',
      es: 'es-ES',
      zh: 'zh-CN'
    };

    const locale = localeConfig[i18n.language as keyof typeof localeConfig] || localeConfig.pt;
    
    return new Intl.DateTimeFormat(locale).format(date);
  }, [i18n.language]);

  // Função para encontrar um nó por ID na árvore
  const findNodeById = (node: TreeNode, id: string): TreeNode | null => {
    if (node.id === id) {
      return node;
    }
    
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) {
        return found;
      }
    }
    
    return null;
  };

  // Função para resolver dependências (IDs) para nomes
  const resolveDependencies = (dependencies?: string[]): string[] => {
    if (!dependencies || dependencies.length === 0) {
      return [];
    }
    
    return dependencies.map(depId => {
      const depNode = findNodeById(rootNode, depId);
      return depNode ? depNode.name : `ID: ${depId}`;
    });
  };

  // Função para contar itens dentro de uma fase
  const countItemsInPhase = (phaseNode: TreeNode): number => {
    let count = 0;
    const countRecursive = (node: TreeNode) => {
      count++;
      node.children.forEach(child => countRecursive(child));
    };
    phaseNode.children.forEach(child => countRecursive(child));
    return count;
  };

  // Função para "achatar" a árvore em uma lista linear com controle de colapso
  const flattenTree = useCallback((node: TreeNode, depth = 0, path = ''): FlattenedNode[] => {
    const currentPath = path ? `${path} > ${node.name}` : node.name;
    
    // Calcula duração automaticamente se não estiver definida mas tiver datas
    let calculatedDurationDays = node.durationDays;
    if (!calculatedDurationDays && node.startDate && node.endDate) {
      calculatedDurationDays = DateCalculator.calculateDurationDays(node.startDate, node.endDate);
    }
    
    const flattenedNode: FlattenedNode = {
      ...node,
      durationDays: calculatedDurationDays || node.durationDays,
      key: node.id,
      hasChildren: node.children.length > 0,
      depth,
      path: currentPath
    };

    let result = [flattenedNode];
    
    // Se é uma fase (nível 2) e está colapsada, não inclui os filhos
    if (node.level === 2 && collapsedPhases.has(node.id)) {
      return result;
    }
    
    // Para outros nós, ou fases expandidas, inclui os filhos
    if (node.children.length > 0) {
      for (const child of node.children) {
        result = result.concat(flattenTree(child, depth + 1, currentPath));
      }
    }

    return result;
  }, [collapsedPhases]);

  // Função para alternar o estado de colapso de uma fase
  const togglePhaseCollapse = (phaseId: string) => {
    setCollapsedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  // Função para expandir/colapsar todas as fases
  const toggleAllPhases = () => {
    const allPhases: string[] = [];
    
    const findAllPhases = (node: TreeNode) => {
      if (node.level === 2) {
        allPhases.push(node.id);
      }
      node.children.forEach(child => findAllPhases(child));
    };
    
    findAllPhases(rootNode);
    
    if (collapsedPhases.size === 0) {
      // Se nenhuma fase está colapsada, colapsa todas
      setCollapsedPhases(new Set(allPhases));
    } else {
      // Se algumas estão colapsadas, expande todas
      setCollapsedPhases(new Set());
    }
  };

  const flattenedData = useMemo(() => flattenTree(rootNode), [rootNode, flattenTree]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return '#1890ff';
      case 2: return '#52c41a';
      case 3: return '#faad14';
      default: return '#d9d9d9';
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 1: return t('tableView.levels.project');
      case 2: return t('tableView.levels.phase');
      case 3: return t('tableView.levels.activity');
      default: return t('tableView.levels.item');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in-progress': return 'blue';
      case 'not-started': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return t('tableView.status.completed');
      case 'in-progress': return t('tableView.status.inProgress');
              case 'not-started': return t('status.not-started');
      default: return t('tableView.status.undefined');
    }
  };

  // Função para calcular o percentual de conclusão baseado nas atividades filhas
  const calculateProgressPercentage = (node: TreeNode): number => {
    // Se não tem filhos, usa o status próprio
    if (node.children.length === 0) {
      switch (node.status) {
        case 'completed': return 100;
        case 'in-progress': return 50;
        case 'not-started': return 0;
        default: return 0;
      }
    }
    
    // Se tem filhos, calcula baseado nas atividades filhas
    let totalChildren = 0;
    let completedWeight = 0;
    
    const countChildrenRecursive = (childNode: TreeNode) => {
      if (childNode.children.length === 0) {
        // É uma folha (atividade final)
        totalChildren++;
        if (childNode.status === 'completed') {
          completedWeight++;
        } else if (childNode.status === 'in-progress') {
          completedWeight += 0.5;
        }
      } else {
        // Tem filhos, continua recursivamente
        childNode.children.forEach(grandChild => countChildrenRecursive(grandChild));
      }
    };
    
    node.children.forEach(child => countChildrenRecursive(child));
    
    if (totalChildren === 0) {
      return 0;
    }
    
    return Math.round((completedWeight / totalChildren) * 100);
  };

  const getProgressValue = (status?: string) => {
    switch (status) {
      case 'completed': return 100;
      case 'in-progress': return 50;
      case 'not-started': return 0;
      default: return 0;
    }
  };

  const columns: ColumnType<FlattenedNode>[] = [
    {
      title: t('tableView.columns.structure'),
      dataIndex: 'name',
      key: 'name',
      width: 350,
      render: (text: string, record: FlattenedNode) => (
        <div style={{ paddingLeft: record.depth * 20 }}>
          <Space>
            {/* Controle de colapso para fases (nível 2) */}
            {record.level === 2 && record.hasChildren ? (
              <Button
                type="text"
                size="small"
                icon={collapsedPhases.has(record.id) ? <RightOutlined /> : <DownOutlined />}
                onClick={() => togglePhaseCollapse(record.id)}
                className="collapse-button"
              />
            ) : (
              <span style={{ width: 20, display: 'inline-block' }} />
            )}
            
            {record.hasChildren ? (
              <FolderOutlined style={{ color: getLevelColor(record.level) }} />
            ) : (
              <FileOutlined style={{ color: getLevelColor(record.level) }} />
            )}
            
            <Text strong={record.level === 1} style={{ fontSize: record.level === 1 ? '14px' : '12px' }}>
              {text}
            </Text>
            
            {/* Contador de itens para fases colapsadas */}
            {record.level === 2 && collapsedPhases.has(record.id) && (
              <Tag color="orange" style={{ marginLeft: 8, fontSize: '10px' }}>
                {t('tableView.stats.itemsCount', { count: countItemsInPhase(record) })}
              </Tag>
            )}
          </Space>
        </div>
      ),
    },
    {
      title: t('tableView.columns.level'),
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => (
        <Tag color={getLevelColor(level)}>
          {getLevelLabel(level)}
        </Tag>
      ),
    },
    {
      title: t('tableView.columns.responsible'),
      dataIndex: 'responsible',
      key: 'responsible',
      width: 150,
      render: (responsible?: string) => responsible ? (
        <Space>
          <UserOutlined />
          <Text>{responsible}</Text>
        </Space>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: t('tableView.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status?: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: t('tableView.columns.progress'),
      dataIndex: 'status',
      key: 'progress',
      width: 120,
      render: (status?: string, record?: FlattenedNode) => {
        // Para nós que têm filhos, calcula o percentual baseado nas atividades filhas
        let percentage: number;
        let strokeColor: string;
        
        if (record && record.hasChildren) {
          // Encontra o nó original na árvore para calcular o progresso
          const originalNode = findNodeById(rootNode, record.id);
          if (originalNode) {
            percentage = calculateProgressPercentage(originalNode);
            // Define a cor baseada no percentual calculado
            if (percentage === 100) {
              strokeColor = 'green';
            } else if (percentage > 0) {
              strokeColor = 'blue';
            } else {
              strokeColor = 'default';
            }
          } else {
            percentage = getProgressValue(status);
            strokeColor = getStatusColor(status);
          }
        } else {
          // Para folhas (atividades finais), usa o status próprio
          percentage = getProgressValue(status);
          strokeColor = getStatusColor(status);
        }
        
        // Gera tooltip com informações detalhadas
        let tooltipTitle = '';
        if (record && record.hasChildren) {
          const originalNode = findNodeById(rootNode, record.id);
          if (originalNode) {
            let totalActivities = 0;
            let completedActivities = 0;
            let inProgressActivities = 0;
            
            const countActivities = (node: TreeNode) => {
              if (node.children.length === 0) {
                totalActivities++;
                if (node.status === 'completed') {
                  completedActivities++;
                } else if (node.status === 'in-progress') {
                  inProgressActivities++;
                }
              } else {
                node.children.forEach(child => countActivities(child));
              }
            };
            
            originalNode.children.forEach(child => countActivities(child));
            
            tooltipTitle = `${t('tableView.tooltips.progressBasedOnChildren')}\n` +
                          `• ${t('tableView.tooltips.completed', { count: completedActivities })}\n` +
                          `• ${t('tableView.tooltips.inProgress', { count: inProgressActivities })}\n` +
                          `• ${t('tableView.tooltips.total', { count: totalActivities })}\n` +
                          `• ${t('tableView.tooltips.percentage', { percent: percentage })}`;
          }
        } else {
          tooltipTitle = t('tableView.tooltips.ownStatus', { status: getStatusText(status) });
        }
        
        return (
          <Tooltip title={tooltipTitle}>
            <Progress 
              percent={percentage} 
              size="small" 
              strokeColor={strokeColor}
            />
          </Tooltip>
        );
      },
    },
    {
      title: t('tableView.columns.ownCost'),
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      align: 'right',
      render: (cost: number) => (
        <Text className="cost-value cost-own">
          {formatCurrency(cost)}
        </Text>
      ),
    },
    {
      title: t('tableView.columns.totalCost'),
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      align: 'right',
      render: (totalCost: number) => (
        <Text className="cost-value cost-total">
          {formatCurrency(totalCost)}
        </Text>
      ),
    },
    {
      title: t('tableView.columns.startDate'),
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (date?: Date) => date ? (
        <Space>
          <CalendarOutlined />
          <Text className="date-value">
            {formatDate(date)}
          </Text>
        </Space>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: t('tableView.columns.endDate'),
      dataIndex: 'endDate',
      key: 'endDate',
      width: 110,
      render: (date?: Date) => date ? (
        <Space>
          <CalendarOutlined />
          <Text className="date-value">
            {formatDate(date)}
          </Text>
        </Space>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: t('tableView.columns.duration'),
      dataIndex: 'durationDays',
      key: 'durationDays',
      width: 120,
      align: 'center',
      render: (days?: number, record?: FlattenedNode) => {
        // Se não há duração definida, tenta calcular das datas
        let finalDays = days;
        if (!finalDays && record?.startDate && record?.endDate) {
          finalDays = DateCalculator.calculateDurationDays(record.startDate, record.endDate);
        }
        
        if (finalDays) {
          return (
            <Tooltip title={t('tableView.tooltips.workingDays', { days: finalDays })}>
              <Tag color="blue" style={{ cursor: 'help' }}>
                {finalDays}d
              </Tag>
            </Tooltip>
          );
        }
        
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: t('tableView.columns.description'),
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (description?: string) => description ? (
        <Tooltip placement="topLeft" title={description}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {description}
          </Text>
        </Tooltip>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: t('tableView.columns.dependencies'),
      dataIndex: 'dependencies',
      key: 'dependencies',
      width: 200,
      render: (dependencies?: string[]) => {
        const dependencyNames = resolveDependencies(dependencies);
        
        if (dependencyNames.length === 0) {
          return <Text type="secondary" className="no-dependencies">{t('tableView.dependencies.none')}</Text>;
        }
        
        return (
          <div className="dependencies-container">
            {dependencyNames.map((depName, index) => (
              <Tag 
                key={index} 
                color="purple" 
                className="dependency-tag"
              >
                <Tooltip title={t('tableView.tooltips.dependsOn', { name: depName })}>
                  <span className="dependency-name">
                    {depName}
                  </span>
                </Tooltip>
              </Tag>
            ))}
            {dependencyNames.length > 0 && (
              <div className="dependencies-count">
                {dependencyNames.length === 1 
                  ? t('tableView.dependencies.single', { count: dependencyNames.length })
                  : t('tableView.dependencies.multiple', { count: dependencyNames.length })
                }
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="table-view-container">
      <div className="table-header-actions">
        <div className="table-stats">
          <div className="stat-item">
            <Text type="secondary">
              {t('tableView.stats.totalItems')} <span className="stat-value">{flattenedData.length}</span>
            </Text>
          </div>
          <div className="stat-item">
            <Text type="secondary">
              {t('tableView.stats.totalProjectCost')} <span className="stat-value cost-total">
                {formatCurrency(rootNode.totalCost)}
              </span>
            </Text>
          </div>
        </div>
        
        <div className="table-controls">
          <Dropdown
            menu={{ items: tableExportItems }}
            placement="bottomRight"
          >
            <Button 
              size="small"
              icon={<FileImageOutlined />}
            >
              {t('tableView.exportTable')} <DownloadOutlined />
            </Button>
          </Dropdown>
          
          <Button
            type="default"
            size="small"
            icon={collapsedPhases.size > 0 ? <ExpandOutlined /> : <CompressOutlined />}
            onClick={toggleAllPhases}
            style={{ marginLeft: 8 }}
          >
            {collapsedPhases.size > 0 ? t('tableView.controls.expandAll') : t('tableView.controls.collapsePhases')}
          </Button>
        </div>
      </div>
      
      <div ref={tableRef}>
        <Table<FlattenedNode>
        columns={columns}
        dataSource={flattenedData}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} ${t('tableView.pagination.of')} ${total} ${t('tableView.pagination.items')}`,
          pageSizeOptions: ['10', '25', '50', '100'],
          defaultPageSize: 25,
        }}
        scroll={{ x: 1500, y: 600 }}
        size="small"
        bordered
        rowClassName={(record) => {
          let className = `table-row-level-${record.level}`;
          if (record.level === 2 && collapsedPhases.has(record.id)) {
            className += ' collapsed';
          }
          return className;
        }}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: (keys: readonly Key[]) => setExpandedRowKeys([...keys]),
          expandRowByClick: false,
          showExpandColumn: false,
        }}
        />
      </div>
    </div>
  );
};

export default TableView; 