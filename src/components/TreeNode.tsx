import React, { useState, useContext, createContext } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Space, 
  InputNumber, 
  Collapse, 
  Tag, 
  Popconfirm, 
  DatePicker, 
  Select, 
  Row, 
  Col, 
  Divider,
  Alert,
  Tooltip,
  Modal
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  SaveOutlined, 
  CalendarOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { TreeNode as TreeNodeType } from '../types';
import { DateCalculator } from '../utils/dateCalculator';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Context para acessar a árvore completa para dependências
const TreeContext = createContext<{
  rootNode: TreeNodeType;
  onTreeUpdate: (node: TreeNodeType) => void;
} | null>(null);

interface TreeNodeProps {
  node: TreeNodeType;
  onUpdate: (node: TreeNodeType) => void;
  onDelete: (nodeId: string) => void;
  maxLevel?: number;
  rootNode?: TreeNodeType; // Para dependências
  onTreeUpdate?: (node: TreeNodeType) => void;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({ 
  node, 
  onUpdate, 
  onDelete, 
  maxLevel = 3,
  rootNode,
  onTreeUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(node.name);
  const [editedCost, setEditedCost] = useState(node.cost);
  const [editedDescription, setEditedDescription] = useState(node.description || '');
  const [editedResponsible, setEditedResponsible] = useState(node.responsible || '');
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
      ...node,
      name: editedName,
      cost: editedCost,
      description: editedDescription || undefined,
      responsible: editedResponsible || undefined,
      startDate: editedStartDate?.toDate(),
      endDate: editedEndDate?.toDate(),
      durationDays: editedDuration,
      dependencies: editedDependencies.length > 0 ? editedDependencies : undefined
    };

    // Recalcula datas automaticamente
    const nodeWithDates = DateCalculator.updateNodeDates(updatedNode, 'startDate');
    
    onUpdate(nodeWithDates);
    setIsEditing(false);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: dayjs.Dayjs | null) => {
    const tempNode = {
      ...node,
      startDate: field === 'startDate' && value ? value.toDate() : editedStartDate?.toDate(),
      endDate: field === 'endDate' && value ? value.toDate() : editedEndDate?.toDate(),
      durationDays: editedDuration
    };

    const updatedNode = DateCalculator.updateNodeDates(tempNode, field);

    if (field === 'startDate') {
      setEditedStartDate(value);
      if (updatedNode.endDate) {
        setEditedEndDate(dayjs(updatedNode.endDate));
      }
    } else {
      setEditedEndDate(value);
      if (updatedNode.startDate) {
        setEditedStartDate(dayjs(updatedNode.startDate));
      }
    }
    
    setEditedDuration(updatedNode.durationDays || 0);
  };

  const handleDurationChange = (value: number | null) => {
    const duration = value || 0;
    setEditedDuration(duration);

    if (editedStartDate) {
      const tempNode = {
        ...node,
        startDate: editedStartDate.toDate(),
        durationDays: duration
      };
      
      const updatedNode = DateCalculator.updateNodeDates(tempNode, 'duration');
      if (updatedNode.endDate) {
        setEditedEndDate(dayjs(updatedNode.endDate));
      }
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

    const updatedNode = {
      ...node,
      children: updatedChildren
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date?: Date) => {
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