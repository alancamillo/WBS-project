import React, { useState, useMemo } from 'react';
import { Card, Input, Button, Space, InputNumber, Collapse, Tag, Popconfirm, DatePicker, Select, Row, Col, Divider, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CalendarOutlined, UserOutlined, LinkOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCurrencySettings } from '../hooks/useCurrencySettings';
import { TreeNode as TreeNodeType } from '../types';
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
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencySettings();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(node.name);
  const [editedCost, setEditedCost] = useState(node.cost);
  const [editedDescription, setEditedDescription] = useState(node.description || '');
  const [editedResponsible, setEditedResponsible] = useState(node.responsible || '');
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
      dateRangeMessage = t('messages.validation.endDateAfterStart', { 
        endDate: endDate.toLocaleDateString('pt-BR'),
        startDate: startDate.toLocaleDateString('pt-BR')
      });
      // Sugere uma data fim 7 dias após o início
      suggestedEndDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Se não temos data de início ou dependências, retorna apenas validação de intervalo
    if (!startDate || !rootNode || dependencies.length === 0) {
      return {
        isValid: !hasDateRangeError,
        message: hasDateRangeError ? dateRangeMessage : t('messages.validation.validDates'),
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
      message = t('messages.validation.combinedProblems', { dateRangeMessage });
    } else if (hasDateRangeError) {
      message = dateRangeMessage;
    } else if (hasDependencyConflicts) {
      message = t('messages.validation.startDateAfterDependencies', { 
        startDate: startDate.toLocaleDateString('pt-BR')
      });
    } else {
      message = t('messages.validation.validDatesWithDependencies');
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
      return task ? task.name : `${t('wbs.taskNotFound')} (${id})`;
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
    onUpdate(updatedNode);
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
      name: `${t('wbs.item')} ${node.children.length + 1}`,
      cost: 0,
      level: (node.level + 1) as 1 | 2 | 3,
      parentId: node.id,
      children: [],
      totalCost: 0
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
      case 'completed': return t('status.completed');
      case 'in-progress': return t('status.inProgress');
      case 'not-started': return t('status.notStarted');
      default: return t('wbs.notDefined');
    }
  };



  const formatDate = (date?: Date) => {
    if (!date) return t('wbs.dateNotDefined');
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
          <Tag color={getLevelColor(node.level)}>{t('wbs.level')} {node.level}</Tag>
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
              {node.dependencies.length} {t('wbs.dependencies').toLowerCase()}
            </Tag>
          )}
          {/* Alerta visual para conflitos de data */}
          {!currentDateValidation.isValid && !isEditing && (
            <Tag color="red" icon={<WarningOutlined />}>
              {t('wbs.schedulingConflict')}
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {t('wbs.totalCost')}: {formatCurrency(node.totalCost)}
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
              title={t('wbs.deleteConfirmation')}
              onConfirm={() => onDelete(node.id)}
              okText={t('buttons.yes')}
              cancelText={t('buttons.no')}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
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
          message={t('wbs.schedulingConflict')}
          description={
            <div>
              <p>{currentDateValidation.message}</p>
              <div style={{ marginTop: 8 }}>
                <strong>{t('wbs.conflictingDependencies')}:</strong>
                <ul style={{ marginTop: 4, marginBottom: 0 }}>
                  {currentDateValidation.conflictingDependencies.map((dep, index) => (
                    <li key={index}>
                      {t('messages.validation.dependencyConflict', { 
                        taskName: dep.name, 
                        endDate: dep.endDate.toLocaleDateString('pt-BR') 
                      })}
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
              message={editedDateValidation.hasDateRangeError ? t('wbs.dateRangeConflict') : t('wbs.schedulingConflict')}
              description={
                <div>
                  <p>{editedDateValidation.message}</p>
                  
                  {/* Seção de dependências conflitantes */}
                  {editedDateValidation.conflictingDependencies.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>{t('wbs.conflictingDependencies')}:</strong>
                      <ul style={{ marginTop: 4, marginBottom: 8 }}>
                        {editedDateValidation.conflictingDependencies.map((dep, index) => (
                          <li key={index}>
                            {t('messages.validation.dependencyConflict', { 
                              taskName: dep.name, 
                              endDate: dep.endDate.toLocaleDateString('pt-BR') 
                            })}
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
                            {t('wbs.suggestStartDate')}: {editedDateValidation.suggestedStartDate.toLocaleDateString('pt-BR')}
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
                        {t('wbs.suggestEndDate')}: {editedDateValidation.suggestedEndDate.toLocaleDateString('pt-BR')}
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
                  {t('wbs.ownCost')}:
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
                  {t('wbs.status')}:
                </label>
                <Select
                  value={editedStatus}
                  onChange={setEditedStatus}
                  style={{ width: '100%' }}
                >
                  <Option value="not-started">{t('status.notStarted')}</Option>
                  <Option value="in-progress">{t('status.inProgress')}</Option>
                  <Option value="completed">{t('status.completed')}</Option>
                </Select>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  {t('wbs.startDate')}:
                  {!editedDateValidation.isValid && (
                    <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />
                  )}
                  {node.children.length > 0 && (
                    <Tag 
                      color="lime" 
                      style={{ marginLeft: 8, fontSize: '10px' }}
                      title={t('wbs.inheritanceTooltip')}
                    >
                      {t('wbs.autoInheritance')}
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
                  placeholder={node.children.length > 0 ? t('wbs.leaveEmptyToInherit') : t('wbs.selectDate')}
                />
                {node.children.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    💡 <em>{t('wbs.inheritanceHelpStart')}</em>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  {t('wbs.endDate')}:
                  {editedDateValidation.hasDateRangeError && (
                    <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />
                  )}
                  {node.children.length > 0 && (
                    <Tag 
                      color="cyan" 
                      style={{ marginLeft: 8, fontSize: '10px' }}
                      title={t('wbs.inheritanceTooltip')}
                    >
                      {t('wbs.autoInheritance')}
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
                  placeholder={node.children.length > 0 ? t('wbs.leaveEmptyToInherit') : t('wbs.selectDate')}
                />
                {editedDateValidation.hasDateRangeError && editedDateValidation.suggestedEndDate && (
                  <div style={{ marginTop: 4 }}>
                    <Button 
                      type="link" 
                      size="small"
                      icon={<InfoCircleOutlined />}
                      onClick={handleSuggestEndDate}
                    >
                      {t('wbs.suggestEndDate')}: {editedDateValidation.suggestedEndDate.toLocaleDateString('pt-BR')}
                    </Button>
                  </div>
                )}
                {node.children.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    💡 <em>{t('wbs.inheritanceHelpEnd')}</em>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  {t('wbs.responsible')}:
                </label>
                <Input
                  value={editedResponsible}
                  onChange={(e) => setEditedResponsible(e.target.value)}
                  placeholder={t('wbs.responsiblePlaceholder')}
                  prefix={<UserOutlined />}
                />
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: 4, display: 'block' }}>
                  <LinkOutlined style={{ marginRight: 4 }} />
                  {t('wbs.dependencies')}:
                </label>
                <Select
                  mode="multiple"
                  value={editedDependencies}
                  onChange={setEditedDependencies}
                  style={{ width: '100%' }}
                  placeholder={t('wbs.selectDependencies')}
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
                  {t('wbs.description')}:
                </label>
                <TextArea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  placeholder={t('wbs.descriptionPlaceholder')}
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
                <span style={{ fontWeight: 'bold' }}>{t('wbs.ownCost')}: </span>
                <span style={{ color: '#1890ff' }}>{formatCurrency(node.cost)}</span>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <span style={{ fontWeight: 'bold' }}>{t('wbs.responsible')}: </span>
                <span>{node.responsible || t('wbs.notDefined')}</span>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <span style={{ fontWeight: 'bold' }}>{t('wbs.status')}: </span>
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
                <span style={{ fontWeight: 'bold' }}>{t('wbs.startDate')}: </span>
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
                        title={`${t('wbs.inheritedFrom')}: ${inheritanceInfo.sourceChild}`}
                      >
                        {t('wbs.inheritedDate')}
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
                <span style={{ fontWeight: 'bold' }}>{t('wbs.endDate')}: </span>
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
                        title={`${t('wbs.inheritedFrom')}: ${inheritanceInfo.sourceChild}`}
                      >
                        {t('wbs.inheritedDate')}
                      </Tag>
                    );
                  }
                  return null;
                })()}
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <span style={{ fontWeight: 'bold' }}>{t('wbs.duration')}: </span>
                <span>
                  {node.startDate && node.endDate 
                    ? `${Math.ceil((new Date(node.endDate).getTime() - new Date(node.startDate).getTime()) / (1000 * 60 * 60 * 24))} ${t('wbs.days')}`
                    : t('wbs.notCalculated')
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
                  <span style={{ fontWeight: 'bold' }}>{t('wbs.dependencies')}: </span>
                  <div style={{ marginTop: 4 }}>
                    {getDependencyNames(node.dependencies).map((depName, index) => (
                      <Tag key={index} color="orange" style={{ marginBottom: 4 }}>
                        {depName}
                      </Tag>
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    {t('wbs.dependenciesHelp')}
                  </span>
                </div>
              </Col>
            </Row>
          )}

          {node.description && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontWeight: 'bold' }}>{t('wbs.description')}: </span>
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
          {t('wbs.addSubitem')}
        </Button>
      )}

      {node.children.length > 0 && (
        <Collapse
          size="small"
          defaultActiveKey={node.level === 1 ? ['children'] : []}
        >
          <Collapse.Panel
            key="children"
            header={`${t('wbs.subitems')} (${node.children.length})`}
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
                />
              ))}
            </div>
          </Collapse.Panel>
        </Collapse>
      )}
    </Card>
  );
};

export default TreeNodeComponent; 