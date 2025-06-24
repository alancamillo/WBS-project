import React, { useState } from 'react';
import { Card, Input, Button, Space, InputNumber, Collapse, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { TreeNode as TreeNodeType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface TreeNodeProps {
  node: TreeNodeType;
  onUpdate: (node: TreeNodeType) => void;
  onDelete: (nodeId: string) => void;
  maxLevel?: number;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({ 
  node, 
  onUpdate, 
  onDelete, 
  maxLevel = 3 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(node.name);
  const [editedCost, setEditedCost] = useState(node.cost);

  const handleSave = () => {
    const updatedNode = {
      ...node,
      name: editedName,
      cost: editedCost
    };
    onUpdate(updatedNode);
    setIsEditing(false);
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
              style={{ width: 200 }}
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
          {isEditing ? (
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSave}
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
      <div style={{ marginBottom: 16 }}>
        <Space>
          <span>Custo próprio:</span>
          {isEditing ? (
            <InputNumber
              value={editedCost}
              onChange={(value) => setEditedCost(value || 0)}
              formatter={(value) => `R$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/R\$\s?|(,*)/g, ''))}
              style={{ width: 150 }}
            />
          ) : (
            <span style={{ fontWeight: 'bold' }}>
              {formatCurrency(node.cost)}
            </span>
          )}
        </Space>
      </div>

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