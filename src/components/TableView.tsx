import React, { useState, useMemo } from 'react';
import { Table, Tag, Button, Space, Typography, Tooltip, Progress } from 'antd';
import { ColumnType } from 'antd/es/table';
import { Key } from 'antd/es/table/interface';
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
  CompressOutlined
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
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());

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

  // Função para encontrar a fase (nível 2) pai de um nó
  const findParentPhase = (nodeId: string): TreeNode | null => {
    const findPhaseRecursive = (node: TreeNode, targetId: string): TreeNode | null => {
      // Se é uma fase (nível 2) e tem o nó como filho direto ou indireto
      if (node.level === 2) {
        const hasTargetAsChild = (parent: TreeNode): boolean => {
          return parent.children.some(child => 
            child.id === targetId || hasTargetAsChild(child)
          );
        };
        
        if (hasTargetAsChild(node)) {
          return node;
        }
      }
      
      // Continua procurando nos filhos
      for (const child of node.children) {
        const result = findPhaseRecursive(child, targetId);
        if (result) return result;
      }
      
      return null;
    };
    
    return findPhaseRecursive(rootNode, nodeId);
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
  const flattenTree = (node: TreeNode, depth = 0, path = ''): FlattenedNode[] => {
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
  };

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

  const flattenedData = useMemo(() => flattenTree(rootNode), [rootNode, collapsedPhases]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

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
      case 1: return 'Projeto';
      case 2: return 'Fase';
      case 3: return 'Atividade';
      default: return 'Item';
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
      case 'completed': return 'Concluído';
      case 'in-progress': return 'Em Progresso';
      case 'not-started': return 'Não Iniciado';
      default: return 'Indefinido';
    }
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
      title: 'Estrutura',
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
                {countItemsInPhase(record)} itens
              </Tag>
            )}
          </Space>
        </div>
      ),
    },
    {
      title: 'Nível',
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
      title: 'Responsável',
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
      title: 'Status',
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
      title: 'Progresso',
      dataIndex: 'status',
      key: 'progress',
      width: 120,
      render: (status?: string) => (
        <Progress 
          percent={getProgressValue(status)} 
          size="small" 
          strokeColor={getStatusColor(status)}
        />
      ),
    },
    {
      title: 'Custo Próprio',
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
      title: 'Custo Total',
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
      title: 'Data Início',
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
      title: 'Data Fim',
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
      title: 'Duração',
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
          const formatted = DateCalculator.formatDuration(finalDays);
          return (
            <Tooltip title={`${finalDays} dias corridos`}>
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
      title: 'Descrição',
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
      title: 'Dependências',
      dataIndex: 'dependencies',
      key: 'dependencies',
      width: 200,
      render: (dependencies?: string[]) => {
        const dependencyNames = resolveDependencies(dependencies);
        
        if (dependencyNames.length === 0) {
          return <Text type="secondary" className="no-dependencies">Nenhuma</Text>;
        }
        
        return (
          <div className="dependencies-container">
            {dependencyNames.map((depName, index) => (
              <Tag 
                key={index} 
                color="purple" 
                className="dependency-tag"
              >
                <Tooltip title={`Depende de: ${depName}`}>
                  <span className="dependency-name">
                    {depName}
                  </span>
                </Tooltip>
              </Tag>
            ))}
            {dependencyNames.length > 0 && (
              <div className="dependencies-count">
                {dependencyNames.length} dependência{dependencyNames.length > 1 ? 's' : ''}
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
              Total de itens: <span className="stat-value">{flattenedData.length}</span>
            </Text>
          </div>
          <div className="stat-item">
            <Text type="secondary">
              Custo total do projeto: <span className="stat-value cost-total">
                {formatCurrency(rootNode.totalCost)}
              </span>
            </Text>
          </div>
        </div>
        
        <div className="table-controls">
          <Button
            type="default"
            size="small"
            icon={collapsedPhases.size > 0 ? <ExpandOutlined /> : <CompressOutlined />}
            onClick={toggleAllPhases}
          >
            {collapsedPhases.size > 0 ? 'Expandir Todas' : 'Colapsar Fases'}
          </Button>
        </div>
      </div>
      
      <Table<FlattenedNode>
        columns={columns}
        dataSource={flattenedData}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} de ${total} itens`,
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
  );
};

export default TableView; 