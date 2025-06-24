import React, { useState, useMemo } from 'react';
import { Card, Input, Button, Space, InputNumber, Collapse, Tag, Popconfirm, DatePicker, Select, Row, Col, Divider, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CalendarOutlined, UserOutlined, LinkOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { TreeNode as TreeNodeType } from '../types';
import { DateCalculator } from '../utils/dateCalculator';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface TreeNodeProps {
  node: TreeNodeType;
  onUpdate: (node: TreeNodeType) => void;
  onDelete: (nodeId: string) => void;
  maxLevel?: number;
  rootNode?: TreeNodeType;
}

interface DateValidation {
  isValid: boolean;
  message: string;
  suggestedStartDate?: Date;
  suggestedEndDate?: Date;
  conflictingDependencies: { name: string; endDate: Date }[];
  hasDateRangeError: boolean;
  dateRangeMessage?: string;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({ 
  node, 
  onUpdate, 
  onDelete, 
  maxLevel = 3,
  rootNode 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(node.name);
  const [editedCost, setEditedCost] = useState(node.cost);
  const [editedDescription, setEditedDescription] = useState(node.description || '');
  const [editedResponsible, setEditedResponsible] = useState(node.responsible || '');
<<<<<<< HEAD
  const [editedStatus, setEditedStatus] = useState(node.status || 'not-started');
  const [editedStartDate, setEditedStartDate] = useState(node.startDate);
  const [editedEndDate, setEditedEndDate] = useState(node.endDate);
  const [editedDependencies, setEditedDependencies] = useState(node.dependencies || []);

  // Verifica se um nó é descendente de outro (para evitar dependências circulares)
  const isDescendantOf = (potentialDescendant: TreeNodeType, ancestor: TreeNodeType): boolean => {
    for (const child of ancestor.children) {
      if (child.id === potentialDescendant.id || isDescendantOf(potentialDescendant, child)) {
        return true;
      }
    }
    return false;
  };

  // Encontra nó por ID
  const findNodeById = (searchNode: TreeNodeType, id: string): TreeNodeType | null => {
    if (searchNode.id === id) return searchNode;
    
    for (const child of searchNode.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  // Valida as datas (dependências + intervalo início/fim)
  const validateDependencyDates = (startDate: Date | undefined, endDate: Date | undefined, dependencies: string[]): DateValidation => {
    let hasDateRangeError = false;
    let dateRangeMessage = '';
    let suggestedEndDate: Date | undefined;

    // Validação 1: Data de fim deve ser posterior à data de início
    if (startDate && endDate && endDate <= startDate) {
      hasDateRangeError = true;
      dateRangeMessage = `A data de fim (${endDate.toLocaleDateString('pt-BR')}) deve ser posterior à data de início (${startDate.toLocaleDateString('pt-BR')}).`;
      // Sugere uma data fim 7 dias após o início
      suggestedEndDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Se não temos data de início ou dependências, retorna apenas validação de intervalo
    if (!startDate || !rootNode || dependencies.length === 0) {
      return {
        isValid: !hasDateRangeError,
        message: hasDateRangeError ? dateRangeMessage : 'Datas válidas.',
        conflictingDependencies: [],
        hasDateRangeError,
        dateRangeMessage,
        suggestedEndDate
      };
    }

    // Validação 2: Dependências
    const conflictingDeps: { name: string; endDate: Date }[] = [];
    let latestEndDate: Date | null = null;

    for (const depId of dependencies) {
      const depTask = findNodeById(rootNode, depId);
      if (depTask && depTask.endDate) {
        const depEndDate = new Date(depTask.endDate);
        
        // Verifica se a data de início é anterior ao fim da dependência
        if (startDate <= depEndDate) {
          conflictingDeps.push({
            name: depTask.name,
            endDate: depEndDate
          });
        }

        // Mantém track da data de fim mais tardia
        if (!latestEndDate || depEndDate > latestEndDate) {
          latestEndDate = depEndDate;
        }
      }
    }

    const hasDependencyConflicts = conflictingDeps.length > 0;
    const suggestedStartDate = latestEndDate ? new Date(latestEndDate.getTime() + 24 * 60 * 60 * 1000) : undefined;

    // Monta mensagem combinada
    let message = '';
    if (hasDateRangeError && hasDependencyConflicts) {
      message = `Problemas detectados: ${dateRangeMessage} Além disso, a data de início conflita com as dependências.`;
    } else if (hasDateRangeError) {
      message = dateRangeMessage;
    } else if (hasDependencyConflicts) {
      message = `A data de início (${startDate.toLocaleDateString('pt-BR')}) deve ser posterior ao fim de todas as dependências.`;
    } else {
      message = 'Datas válidas em relação às dependências e intervalo.';
    }

    return {
      isValid: !hasDateRangeError && !hasDependencyConflicts,
      message,
      suggestedStartDate,
      suggestedEndDate,
      conflictingDependencies: conflictingDeps,
      hasDateRangeError,
      dateRangeMessage
    };
  };

  // Validação para data de início editada
  const editedDateValidation = useMemo(() => {
    return validateDependencyDates(editedStartDate, editedEndDate, editedDependencies);
  }, [editedStartDate, editedEndDate, editedDependencies, rootNode]);

  // Validação para dados atuais do nó
  const currentDateValidation = useMemo(() => {
    return validateDependencyDates(node.startDate, node.endDate, node.dependencies || []);
  }, [node.startDate, node.endDate, node.dependencies, rootNode]);

  // Função para coletar todas as tarefas da árvore (exceto a atual)
  const getAllAvailableTasks = useMemo(() => {
    if (!rootNode) return [];
    
    const tasks: { id: string; name: string; level: number }[] = [];
    
    const traverse = (currentNode: TreeNodeType, path: string = '') => {
      const currentPath = path ? `${path} > ${currentNode.name}` : currentNode.name;
      
      if (currentNode.id !== node.id && !isDescendantOf(currentNode, node)) {
        tasks.push({
          id: currentNode.id,
          name: currentPath,
          level: currentNode.level
        });
      }
      
      currentNode.children.forEach(child => traverse(child, currentPath));
    };
    
    traverse(rootNode);
    return tasks;
  }, [rootNode, node]);

  // Obtém nomes das tarefas dependentes
  const getDependencyNames = (dependencyIds: string[]): string[] => {
    if (!rootNode) return [];
    
    return dependencyIds.map(id => {
      const task = findNodeById(rootNode, id);
      return task ? task.name : `Tarefa não encontrada (${id})`;
    });
  };

  // Função para calcular a data de fim mais distante dos filhos
  const calculateInheritedEndDate = (nodeToCheck: TreeNodeType): Date | undefined => {
    if (nodeToCheck.children.length === 0) {
      // Nó folha: retorna sua própria data de fim
      return nodeToCheck.endDate;
    }

    // Nó pai: encontra a data de fim mais distante dos filhos
    let latestEndDate: Date | undefined;
    
    for (const child of nodeToCheck.children) {
      const childEndDate = calculateInheritedEndDate(child);
      if (childEndDate) {
        if (!latestEndDate || childEndDate > latestEndDate) {
          latestEndDate = childEndDate;
        }
      }
    }

    return latestEndDate;
  };

  // Função para calcular a data de início mais cedo dos filhos
  const calculateInheritedStartDate = (nodeToCheck: TreeNodeType): Date | undefined => {
    if (nodeToCheck.children.length === 0) {
      // Nó folha: retorna sua própria data de início
      return nodeToCheck.startDate;
    }

    // Nó pai: encontra a data de início mais cedo dos filhos
    let earliestStartDate: Date | undefined;
    
    for (const child of nodeToCheck.children) {
      const childStartDate = calculateInheritedStartDate(child);
      if (childStartDate) {
        if (!earliestStartDate || childStartDate < earliestStartDate) {
          earliestStartDate = childStartDate;
        }
      }
    }

    return earliestStartDate;
  };

  const handleSave = () => {
    let finalStartDate = editedStartDate;
    let finalEndDate = editedEndDate;

    // Se o nó tem filhos, herda datas dos filhos
    if (node.children.length > 0) {
      const tempNode = {
        ...node,
        name: editedName,
        cost: editedCost,
        description: editedDescription || undefined,
        responsible: editedResponsible || undefined,
        status: editedStatus as 'not-started' | 'in-progress' | 'completed',
        startDate: editedStartDate,
        endDate: editedEndDate,
        dependencies: editedDependencies.length > 0 ? editedDependencies : undefined
      };

      // Herda data de início mais cedo
      const inheritedStartDate = calculateInheritedStartDate(tempNode);
      if (inheritedStartDate) {
        // Se não há data manual ou a herdada é mais cedo, usa a herdada
        if (!editedStartDate || inheritedStartDate < editedStartDate) {
          finalStartDate = inheritedStartDate;
        }
      }

      // Herda data de fim mais distante
      const inheritedEndDate = calculateInheritedEndDate(tempNode);
      if (inheritedEndDate) {
        // Se não há data manual ou a herdada é mais distante, usa a herdada
        if (!editedEndDate || inheritedEndDate > editedEndDate) {
          finalEndDate = inheritedEndDate;
        }
      }
    }

    const updatedNode = {
=======
  const [editedStartDate, setEditedStartDate] = useState<dayjs.Dayjs | null>(
    node.startDate ? dayjs(node.startDate) : null
  );
  const [editedEndDate, setEditedEndDate] = useState<dayjs.Dayjs | null>(
    node.endDate ? dayjs(node.endDate) : null
  );
  const [editedDuration, setEditedDuration] = useState(node.durationDays || 0);
  const [editedDependencies, setEditedDependencies] = useState<string[]>(node.dependencies || []);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const treeContext = useContext(TreeContext);
  const currentRootNode = rootNode || treeContext?.rootNode;

  const handleSave = () => {
    const updatedNode: TreeNodeType = {
>>>>>>> 8979284681656e8448e605129b5e08cab8bee40d
      ...node,
      name: editedName,
      cost: editedCost,
      description: editedDescription || undefined,
      responsible: editedResponsible || undefined,
      status: editedStatus as 'not-started' | 'in-progress' | 'completed',
      startDate: finalStartDate,
      endDate: finalEndDate,
      dependencies: editedDependencies.length > 0 ? editedDependencies : undefined
    };

    // Recalcula datas automaticamente
    const nodeWithDates = DateCalculator.updateNodeDates(updatedNode, 'startDate');
    
    onUpdate(nodeWithDates);
    setIsEditing(false);
  };

  const handleSuggestStartDate = () => {
    if (editedDateValidation.suggestedStartDate) {
      setEditedStartDate(editedDateValidation.suggestedStartDate);
    }
  };

  const handleSuggestEndDate = () => {
    if (editedDateValidation.suggestedEndDate) {
      setEditedEndDate(editedDateValidation.suggestedEndDate);
    }
  };

  const handleAddChild = () => {
    if (node.level >= maxLevel) return;

    const newChild: TreeNodeType = {
      id: uuidv4(),
      name: `Novo Item ${node.children.length + 1}`,
      cost: 0,
      level: (node.level + 1) as 1 | 2 | 3,
      parentId: node.id,
      children: [],
      totalCost: 0,
      durationDays: 1,
      dependencies: []
    };

    const updatedNode = {
      ...node,
      children: [...node.children, newChild]
    };

    onUpdate(updatedNode);
  };

  const handleChildUpdate = (updatedChild: TreeNodeType) => {
    const updatedChildren = node.children.map(child =>
      child.id === updatedChild.id ? updatedChild : child
    );

    // Recalcula as datas herdadas após atualização do filho
    const tempNode = {
      ...node,
      children: updatedChildren
    };

    let finalStartDate = node.startDate;
    let finalEndDate = node.endDate;

    // Herda data de início mais cedo
    const inheritedStartDate = calculateInheritedStartDate(tempNode);
    if (inheritedStartDate) {
      if (!node.startDate || inheritedStartDate < node.startDate) {
        finalStartDate = inheritedStartDate;
      }
    }

    // Herda data de fim mais distante
    const inheritedEndDate = calculateInheritedEndDate(tempNode);
    if (inheritedEndDate) {
      if (!node.endDate || inheritedEndDate > node.endDate) {
        finalEndDate = inheritedEndDate;
      }
    }

    const updatedNode = {
      ...tempNode,
      startDate: finalStartDate,
      endDate: finalEndDate
    };

    onUpdate(updatedNode);
  };

  const handleChildDelete = (childId: string) => {
    const updatedChildren = node.children.filter(child => child.id !== childId);
    
    const updatedNode = {
      ...node,
      children: updatedChildren
    };

    onUpdate(updatedNode);
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return '#1890ff';
      case 2: return '#52c41a';
      case 3: return '#faad14';
      default: return '#d9d9d9';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'processing';
      case 'not-started': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in-progress': return 'Em Andamento';
      case 'not-started': return 'Não Iniciado';
      default: return 'Não Definido';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date?: Date) => {
<<<<<<< HEAD
    if (!date) return 'Não definida';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Verifica se a data de fim é herdada dos filhos
  const isEndDateInherited = (nodeToCheck: TreeNodeType): boolean => {
    if (nodeToCheck.children.length === 0) return false;
    
    const inheritedEndDate = calculateInheritedEndDate(nodeToCheck);
    if (!inheritedEndDate || !nodeToCheck.endDate) return false;
    
    // Compara as datas (considera herdada se são iguais)
    return Math.abs(inheritedEndDate.getTime() - nodeToCheck.endDate.getTime()) < 1000; // 1 segundo de tolerância
  };

  // Obtém informações sobre a herança da data de fim
  const getEndDateInheritanceInfo = (nodeToCheck: TreeNodeType): { isInherited: boolean; sourceChild?: string } => {
    if (nodeToCheck.children.length === 0) return { isInherited: false };
    
    const inheritedEndDate = calculateInheritedEndDate(nodeToCheck);
    if (!inheritedEndDate || !nodeToCheck.endDate) return { isInherited: false };
    
    const isInherited = Math.abs(inheritedEndDate.getTime() - nodeToCheck.endDate.getTime()) < 1000;
    
    if (isInherited) {
      // Encontra qual filho tem a data mais distante
      const findSourceChild = (searchNode: TreeNodeType): string | undefined => {
        for (const child of searchNode.children) {
          const childEndDate = calculateInheritedEndDate(child);
          if (childEndDate && Math.abs(childEndDate.getTime() - inheritedEndDate.getTime()) < 1000) {
            if (child.children.length === 0) {
              return child.name;
            } else {
              return findSourceChild(child) || child.name;
            }
          }
        }
        return undefined;
      };
      
      return { isInherited: true, sourceChild: findSourceChild(nodeToCheck) };
    }
    
    return { isInherited: false };
  };

  // Obtém informações sobre a herança da data de início
  const getStartDateInheritanceInfo = (nodeToCheck: TreeNodeType): { isInherited: boolean; sourceChild?: string } => {
    if (nodeToCheck.children.length === 0) return { isInherited: false };
    
    const inheritedStartDate = calculateInheritedStartDate(nodeToCheck);
    if (!inheritedStartDate || !nodeToCheck.startDate) return { isInherited: false };
    
    const isInherited = Math.abs(inheritedStartDate.getTime() - nodeToCheck.startDate.getTime()) < 1000;
    
    if (isInherited) {
      // Encontra qual filho tem a data mais cedo
      const findSourceChild = (searchNode: TreeNodeType): string | undefined => {
        for (const child of searchNode.children) {
          const childStartDate = calculateInheritedStartDate(child);
          if (childStartDate && Math.abs(childStartDate.getTime() - inheritedStartDate.getTime()) < 1000) {
            if (child.children.length === 0) {
              return child.name;
            } else {
              return findSourceChild(child) || child.name;
            }
          }
        }
        return undefined;
      };
      
      return { isInherited: true, sourceChild: findSourceChild(nodeToCheck) };
    }
    
    return { isInherited: false };
  };

  return (
    <Card
      size="small"
      style={{ 
        marginBottom: 8,
        borderLeft: `4px solid ${getLevelColor(node.level)}`,
        backgroundColor: node.level === 1 ? '#f0f9ff' : node.level === 2 ? '#f6ffed' : '#fffbe6'
      }}
      title={
        <Space>
          <Tag color={getLevelColor(node.level)}>Nível {node.level}</Tag>
          {isEditing ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onPressEnter={handleSave}
              style={{ width: 300 }}
            />
          ) : (
            <span style={{ fontWeight: 'bold' }}>{node.name}</span>
          )}
          {node.status && (
            <Tag color={getStatusColor(node.status)}>
              {getStatusText(node.status)}
            </Tag>
          )}
          {node.dependencies && node.dependencies.length > 0 && (
            <Tag color="orange" icon={<LinkOutlined />}>
              {node.dependencies.length} dependência(s)
            </Tag>
          )}
          {/* Alerta visual para conflitos de data */}
          {!currentDateValidation.isValid && !isEditing && (
            <Tag color="red" icon={<WarningOutlined />}>
              Conflito de datas
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            Total: {formatCurrency(node.totalCost)}
          </span>
          {isEditing ? (
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!editedDateValidation.isValid} // Desabilita salvar se há conflitos
            />
          ) : (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
            />
          )}
          {node.level > 1 && (
            <Popconfirm
              title="Tem certeza que deseja excluir este item?"
              onConfirm={() => onDelete(node.id)}
              okText="Sim"
              cancelText="Não"
            >
=======
    if (!date) return '-';
    return dayjs(date).format('DD/MM/YYYY');
  };

  const getAvailableDependencies = () => {
    if (!currentRootNode) return [];
    return DateCalculator.getAllNodesForDependencies(currentRootNode, node.id);
  };

  const validateDependencies = () => {
    if (!currentRootNode || !editedDependencies.length) return { isValid: true, errors: [] };
    return DateCalculator.validateDependencies(currentRootNode, node.id, editedDependencies);
  };

  const getEarliestStartDate = () => {
    if (!currentRootNode) return null;
    return DateCalculator.calculateEarliestStartDate(currentRootNode, node.id);
  };

  const dependencyValidation = validateDependencies();
  const earliestStart = getEarliestStartDate();

  return (
    <TreeContext.Provider value={currentRootNode ? { rootNode: currentRootNode, onTreeUpdate: onTreeUpdate || onUpdate } : null}>
      <Card
        size="small"
        style={{ 
          marginBottom: 8,
          borderLeft: `4px solid ${getLevelColor(node.level)}`,
          backgroundColor: node.level === 1 ? '#f0f9ff' : node.level === 2 ? '#f6ffed' : '#fffbe6'
        }}
        title={
          <Space>
            <Tag color={getLevelColor(node.level)}>Nível {node.level}</Tag>
            {isEditing ? (
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onPressEnter={handleSave}
                style={{ width: 200 }}
                placeholder="Nome da atividade"
              />
            ) : (
              <span style={{ fontWeight: 'bold' }}>{node.name}</span>
            )}
          </Space>
        }
        extra={
          <Space>
            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
              Total: {formatCurrency(node.totalCost)}
            </span>
            {node.durationDays && (
              <Tooltip title="Duração">
                <Tag icon={<ClockCircleOutlined />} color="blue">
                  {DateCalculator.formatDuration(node.durationDays)}
                </Tag>
              </Tooltip>
            )}
            {node.dependencies && node.dependencies.length > 0 && (
              <Tooltip title="Possui dependências">
                <Tag icon={<LinkOutlined />} color="orange">
                  {node.dependencies.length} dep
                </Tag>
              </Tooltip>
            )}
            {isEditing ? (
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={handleSave}
                disabled={!dependencyValidation.isValid}
              />
            ) : (
>>>>>>> 8979284681656e8448e605129b5e08cab8bee40d
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
              />
<<<<<<< HEAD
            </Popconfirm>
          )}
        </Space>
      }
    >
      {/* Alerta de conflito de datas no modo de visualização */}
      {!currentDateValidation.isValid && !isEditing && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message="Conflito de Cronograma"
          description={
            <div>
              <p>{currentDateValidation.message}</p>
              <div style={{ marginTop: 8 }}>
                <strong>Dependências conflitantes:</strong>
                <ul style={{ marginTop: 4, marginBottom: 0 }}>
                  {currentDateValidation.conflictingDependencies.map((dep, index) => (
                    <li key={index}>
                      {dep.name} (termina em {dep.endDate.toLocaleDateString('pt-BR')})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {isEditing ? (
        // Modo de Edição
        <div>
          {/* Alerta de validação durante edição */}
          {!editedDateValidation.isValid && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={editedDateValidation.hasDateRangeError ? "Problema com Intervalo de Datas" : "Conflito de Cronograma"}
              description={
                <div>
                  <p>{editedDateValidation.message}</p>
                  
                  {/* Seção de dependências conflitantes */}
                  {editedDateValidation.conflictingDependencies.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Dependências conflitantes:</strong>
                      <ul style={{ marginTop: 4, marginBottom: 8 }}>
                        {editedDateValidation.conflictingDependencies.map((dep, index) => (
                          <li key={index}>
                            {dep.name} (termina em {dep.endDate.toLocaleDateString('pt-BR')})
                          </li>
                        ))}
                      </ul>
                      {editedDateValidation.suggestedStartDate && (
                        <div>
                          <Button 
                            type="link" 
                            size="small"
                            icon={<InfoCircleOutlined />}
                            onClick={handleSuggestStartDate}
                          >
                            Sugerir data início: {editedDateValidation.suggestedStartDate.toLocaleDateString('pt-BR')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seção de sugestão de data fim */}
                  {editedDateValidation.hasDateRangeError && editedDateValidation.suggestedEndDate && (
                    <div style={{ marginTop: 8 }}>
                      <Button 
                        type="link" 
                        size="small"
                        icon={<InfoCircleOutlined />}
                        onClick={handleSuggestEndDate}
                      >
                        Sugerir data fim: {editedDateValidation.suggestedEndDate.toLocaleDateString('pt-BR')}
                      </Button>
                    </div>
                  )}
                </div>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  Custo próprio:
                </label>
                <InputNumber
                  value={editedCost}
                  onChange={(value) => setEditedCost(value || 0)}
                  formatter={(value) => `R$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/R\$\s?|(,*)/g, ''))}
                  style={{ width: '100%' }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  Status:
                </label>
                <Select
                  value={editedStatus}
                  onChange={setEditedStatus}
                  style={{ width: '100%' }}
                >
                  <Option value="not-started">Não Iniciado</Option>
                  <Option value="in-progress">Em Andamento</Option>
                  <Option value="completed">Concluído</Option>
                </Select>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  Data de Início:
                  {!editedDateValidation.isValid && (
                    <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />
                  )}
                  {node.children.length > 0 && (
                    <Tag 
                      color="lime" 
                      style={{ marginLeft: 8, fontSize: '10px' }}
                      title="Esta data pode ser herdada automaticamente dos filhos"
                    >
                      Auto-herança
                    </Tag>
                  )}
                </label>
                <DatePicker
                  value={editedStartDate ? dayjs(editedStartDate) : null}
                  onChange={(date) => setEditedStartDate(date?.toDate())}
                  style={{ 
                    width: '100%',
                    borderColor: !editedDateValidation.isValid ? '#ff4d4f' : undefined
                  }}
                  format="DD/MM/YYYY"
                  status={!editedDateValidation.isValid ? 'error' : undefined}
                  placeholder={node.children.length > 0 ? "Deixe vazio para herdar dos filhos" : "Selecione uma data"}
                />
                {node.children.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    💡 <em>Dica: Se deixar vazio ou definir uma data posterior aos filhos, será herdada automaticamente a data mais cedo dos filhos.</em>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  Data de Fim:
                  {editedDateValidation.hasDateRangeError && (
                    <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />
                  )}
                  {node.children.length > 0 && (
                    <Tag 
                      color="cyan" 
                      style={{ marginLeft: 8, fontSize: '10px' }}
                      title="Esta data pode ser herdada automaticamente dos filhos"
                    >
                      Auto-herança
                    </Tag>
                  )}
                </label>
                <DatePicker
                  value={editedEndDate ? dayjs(editedEndDate) : null}
                  onChange={(date) => setEditedEndDate(date?.toDate())}
                  style={{ 
                    width: '100%',
                    borderColor: editedDateValidation.hasDateRangeError ? '#ff4d4f' : undefined
                  }}
                  format="DD/MM/YYYY"
                  status={editedDateValidation.hasDateRangeError ? 'error' : undefined}
                  placeholder={node.children.length > 0 ? "Deixe vazio para herdar dos filhos" : "Selecione uma data"}
                />
                {editedDateValidation.hasDateRangeError && editedDateValidation.suggestedEndDate && (
                  <div style={{ marginTop: 4 }}>
                    <Button 
                      type="link" 
                      size="small"
                      icon={<InfoCircleOutlined />}
                      onClick={handleSuggestEndDate}
                    >
                      Sugerir data: {editedDateValidation.suggestedEndDate.toLocaleDateString('pt-BR')}
                    </Button>
                  </div>
                )}
                {node.children.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    💡 <em>Dica: Se deixar vazio ou definir uma data anterior aos filhos, será herdada automaticamente a data mais distante dos filhos.</em>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  Responsável:
                </label>
                <Input
                  value={editedResponsible}
                  onChange={(e) => setEditedResponsible(e.target.value)}
                  placeholder="Nome do responsável"
                  prefix={<UserOutlined />}
                />
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  <LinkOutlined style={{ marginRight: 4 }} />
                  Dependências:
                </label>
                <Select
                  mode="multiple"
                  value={editedDependencies}
                  onChange={setEditedDependencies}
                  style={{ width: '100%' }}
                  placeholder="Selecione tarefas que devem ser concluídas antes"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {getAllAvailableTasks.map(task => (
                    <Option key={task.id} value={task.id}>
                      <Tag color={getLevelColor(task.level)} style={{ marginRight: 4, fontSize: '11px' }}>
                        N{task.level}
                      </Tag>
                      {task.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  Descrição:
                </label>
                <TextArea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  placeholder="Descrição detalhada da atividade"
                />
              </div>
            </Col>
          </Row>
        </div>
      ) : (
        // Modo de Visualização
        <div>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <div>
                <span style={{ fontWeight: 'bold' }}>Custo próprio: </span>
                <span style={{ color: '#1890ff' }}>{formatCurrency(node.cost)}</span>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <span style={{ fontWeight: 'bold' }}>Responsável: </span>
                <span>{node.responsible || 'Não definido'}</span>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <span style={{ fontWeight: 'bold' }}>Status: </span>
                <Tag color={getStatusColor(node.status)}>
                  {getStatusText(node.status)}
                </Tag>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
            <Col xs={24} sm={8}>
              <div>
                <CalendarOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                <span style={{ fontWeight: 'bold' }}>Início: </span>
                <span style={{ 
                  color: !currentDateValidation.isValid ? '#ff4d4f' : 'inherit',
                  fontWeight: !currentDateValidation.isValid ? 'bold' : 'normal'
                }}>
                  {formatDate(node.startDate)}
                </span>
                {(() => {
                  const inheritanceInfo = getStartDateInheritanceInfo(node);
                  if (inheritanceInfo.isInherited) {
                    return (
                      <Tag 
                        color="green" 
                        style={{ marginLeft: 4, fontSize: '10px' }}
                        title={`Data herdada de: ${inheritanceInfo.sourceChild}`}
                      >
                        Herdada
                      </Tag>
                    );
                  }
                  return null;
                })()}
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <CalendarOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />
                <span style={{ fontWeight: 'bold' }}>Fim: </span>
                <span style={{ 
                  color: currentDateValidation.hasDateRangeError ? '#ff4d4f' : 'inherit',
                  fontWeight: currentDateValidation.hasDateRangeError ? 'bold' : 'normal'
                }}>
                  {formatDate(node.endDate)}
                </span>
                {currentDateValidation.hasDateRangeError && (
                  <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />
                )}
                {(() => {
                  const inheritanceInfo = getEndDateInheritanceInfo(node);
                  if (inheritanceInfo.isInherited) {
                    return (
                      <Tag 
                        color="blue" 
                        style={{ marginLeft: 4, fontSize: '10px' }}
                        title={`Data herdada de: ${inheritanceInfo.sourceChild}`}
                      >
                        Herdada
                      </Tag>
                    );
                  }
                  return null;
                })()}
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <span style={{ fontWeight: 'bold' }}>Duração: </span>
                <span>
                  {node.startDate && node.endDate 
                    ? `${Math.ceil((new Date(node.endDate).getTime() - new Date(node.startDate).getTime()) / (1000 * 60 * 60 * 24))} dias`
                    : 'Não calculada'
                  }
                </span>
              </div>
            </Col>
          </Row>

          {/* Dependências */}
          {node.dependencies && node.dependencies.length > 0 && (
            <Row style={{ marginTop: 8 }}>
              <Col xs={24}>
                <div>
                  <LinkOutlined style={{ marginRight: 4, color: '#fa8c16' }} />
                  <span style={{ fontWeight: 'bold' }}>Dependências: </span>
                  <div style={{ marginTop: 4 }}>
                    {getDependencyNames(node.dependencies).map((depName, index) => (
                      <Tag key={index} color="orange" style={{ marginBottom: 4 }}>
                        {depName}
                      </Tag>
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    Estas tarefas devem ser concluídas antes desta atividade começar.
                  </span>
                </div>
              </Col>
            </Row>
          )}

          {node.description && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontWeight: 'bold' }}>Descrição: </span>
              <span style={{ fontStyle: 'italic', color: '#666' }}>{node.description}</span>
            </div>
          )}
        </div>
      )}

      <Divider style={{ margin: '16px 0' }} />

      {node.level < maxLevel && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddChild}
          style={{ marginBottom: 16 }}
        >
          Adicionar Subitem
        </Button>
      )}

      {node.children.length > 0 && (
        <Collapse
          size="small"
          defaultActiveKey={node.level === 1 ? ['children'] : []}
        >
          <Collapse.Panel
            key="children"
            header={`Subitens (${node.children.length})`}
          >
            <div style={{ paddingLeft: 16 }}>
              {node.children.map(child => (
                <TreeNodeComponent
                  key={child.id}
                  node={child}
                  onUpdate={handleChildUpdate}
                  onDelete={handleChildDelete}
                  maxLevel={maxLevel}
                  rootNode={rootNode} // Propagando o rootNode para os filhos
=======
            )}
            {node.level > 1 && (
              <Popconfirm
                title="Tem certeza que deseja excluir este item?"
                onConfirm={() => onDelete(node.id)}
                okText="Sim"
                cancelText="Não"
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
>>>>>>> 8979284681656e8448e605129b5e08cab8bee40d
                />
              </Popconfirm>
            )}
          </Space>
        }
      >
        {/* Informações básicas */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span>Custo próprio:</span>
              {isEditing ? (
                <InputNumber
                  value={editedCost}
                  onChange={(value) => setEditedCost(value || 0)}
                  formatter={(value) => `R$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/R\$\s?|(,*)/g, ''))}
                  style={{ width: '100%' }}
                />
              ) : (
                <span style={{ fontWeight: 'bold' }}>
                  {formatCurrency(node.cost)}
                </span>
              )}
            </Space>
          </Col>
          
          <Col span={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span>Data início:</span>
              {isEditing ? (
                <DatePicker
                  value={editedStartDate}
                  onChange={(value) => handleDateChange('startDate', value)}
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  placeholder="Selecionar data"
                />
              ) : (
                <span>{formatDate(node.startDate)}</span>
              )}
            </Space>
          </Col>
          
          <Col span={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span>Data fim:</span>
              {isEditing ? (
                <DatePicker
                  value={editedEndDate}
                  onChange={(value) => handleDateChange('endDate', value)}
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  placeholder="Selecionar data"
                />
              ) : (
                <span>{formatDate(node.endDate)}</span>
              )}
            </Space>
          </Col>
        </Row>

        {/* Duração */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span>Duração (dias):</span>
              {isEditing ? (
                <InputNumber
                  value={editedDuration}
                  onChange={handleDurationChange}
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Duração em dias"
                />
              ) : (
                <span>
                  {node.durationDays ? DateCalculator.formatDuration(node.durationDays) : '-'}
                </span>
              )}
            </Space>
          </Col>
          
          <Col span={16}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span>Responsável:</span>
              {isEditing ? (
                <Input
                  value={editedResponsible}
                  onChange={(e) => setEditedResponsible(e.target.value)}
                  placeholder="Nome do responsável"
                  style={{ width: '100%' }}
                />
              ) : (
                <span>{node.responsible || '-'}</span>
              )}
            </Space>
          </Col>
        </Row>

        {/* Avisos sobre dependências */}
        {isEditing && earliestStart && editedStartDate && editedStartDate.toDate() < earliestStart && (
          <Alert
            message="Conflito de dependência"
            description={`Esta atividade não pode começar antes de ${dayjs(earliestStart).format('DD/MM/YYYY')} devido às suas dependências.`}
            type="warning"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {isEditing && !dependencyValidation.isValid && (
          <Alert
            message="Dependências inválidas"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {dependencyValidation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Campos avançados */}
        {isEditing && (
          <>
            <Divider />
            <Button
              type="link"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ padding: 0, marginBottom: 8 }}
            >
              {showAdvanced ? 'Ocultar' : 'Mostrar'} campos avançados
            </Button>

            {showAdvanced && (
              <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
                <div>
                  <span>Descrição:</span>
                  <Input.TextArea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Descrição detalhada da atividade"
                    rows={2}
                    style={{ marginTop: 4 }}
                  />
                </div>

                <div>
                  <span>Dependências:</span>
                  <Select
                    mode="multiple"
                    value={editedDependencies}
                    onChange={setEditedDependencies}
                    placeholder="Selecione atividades que devem terminar antes desta começar"
                    style={{ width: '100%', marginTop: 4 }}
                    options={getAvailableDependencies().map(dep => ({
                      value: dep.id,
                      label: `${dep.path}`,
                      disabled: dep.id === node.id
                    }))}
                  />
                </div>
              </Space>
            )}
          </>
        )}

        {/* Botão para adicionar filhos */}
        {node.level < maxLevel && (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddChild}
            style={{ marginBottom: 16 }}
          >
            Adicionar Subitem
          </Button>
        )}

        {/* Filhos */}
        {node.children.length > 0 && (
          <Collapse
            size="small"
            defaultActiveKey={node.level === 1 ? ['children'] : []}
          >
            <Collapse.Panel
              key="children"
              header={`Subitens (${node.children.length})`}
            >
              <div style={{ paddingLeft: 16 }}>
                {node.children.map(child => (
                  <TreeNodeComponent
                    key={child.id}
                    node={child}
                    onUpdate={handleChildUpdate}
                    onDelete={handleChildDelete}
                    maxLevel={maxLevel}
                    rootNode={currentRootNode}
                    onTreeUpdate={onTreeUpdate}
                  />
                ))}
              </div>
            </Collapse.Panel>
          </Collapse>
        )}
      </Card>
    </TreeContext.Provider>
  );
};

export default TreeNodeComponent; 