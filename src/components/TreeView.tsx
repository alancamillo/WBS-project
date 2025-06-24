import React from 'react';
import { Card, Tag, Space } from 'antd';
import { TreeNode } from '../types';
import './TreeView.css';

interface TreeViewProps {
  rootNode: TreeNode;
}

interface TreeNodeViewProps {
  node: TreeNode;
  isRoot?: boolean;
  isLast?: boolean;
  parentConnectors?: boolean[];
}

const TreeNodeView: React.FC<TreeNodeViewProps> = ({ 
  node, 
  isRoot = false, 
  isLast = false,
  parentConnectors = []
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  return (
    <div className="tree-node-container">
      {!isRoot && (
        <div className="tree-connectors">
          {parentConnectors.map((hasConnector, index) => (
            <div
              key={index}
              className={`tree-connector ${hasConnector ? 'has-line' : ''}`}
            />
          ))}
          <div className={`tree-connector ${isLast ? 'last-child' : 'has-child'}`} />
        </div>
      )}
      
      <Card
        size="small"
        className={`tree-node-card level-${node.level}`}
        style={{
          borderColor: getLevelColor(node.level),
          borderWidth: '2px',
          minWidth: '200px',
          maxWidth: '250px'
        }}
      >
        <div className="tree-node-header">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tag color={getLevelColor(node.level)}>
                {getLevelLabel(node.level)}
              </Tag>
              <Tag color="blue">
                Nível {node.level}
              </Tag>
            </div>
            
            <div className="node-title" style={{ 
              fontWeight: 'bold', 
              fontSize: '12px',
              wordBreak: 'break-word',
              lineHeight: '1.2'
            }}>
              {node.name}
            </div>
            
            <div style={{ fontSize: '10px', color: '#666' }}>
              <div>Custo Próprio: <strong style={{ color: '#1890ff' }}>{formatCurrency(node.cost)}</strong></div>
              <div>Custo Total: <strong style={{ color: '#52c41a' }}>{formatCurrency(node.totalCost)}</strong></div>
              {node.children.length > 0 && (
                <div>Subitens: <strong>{node.children.length}</strong></div>
              )}
            </div>
          </Space>
        </div>
      </Card>

      {node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map((child, index) => (
            <TreeNodeView
              key={child.id}
              node={child}
              isLast={index === node.children.length - 1}
              parentConnectors={[
                ...parentConnectors,
                !isRoot && !isLast
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeView: React.FC<TreeViewProps> = ({ rootNode }) => {
  return (
    <div className="tree-view-container">
      <div className="tree-view-header" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h3 style={{ margin: 0, color: '#1890ff' }}>Visualização em Árvore - Estrutura WBS</h3>
      </div>
      <div className="tree-view-content">
        <TreeNodeView node={rootNode} isRoot={true} />
      </div>
    </div>
  );
};

export default TreeView; 