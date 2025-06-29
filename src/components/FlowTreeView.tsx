import React, { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import { useTranslation } from 'react-i18next';
import { useCurrencySettings } from '../hooks/useCurrencySettings';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { TreeNode } from '../types';
import { Tooltip } from 'antd';
import { FolderOutlined } from '@ant-design/icons';

interface FlowTreeViewProps {
  rootNode: TreeNode;
  groupingState?: { groupedPhaseIds: string[]; groupedExpanded: boolean };
}

interface CustomNodeData {
  label: string;
  level: number;
  cost: number;
  totalCost: number;
  childrenCount: number;
  isGroupedNode?: boolean;
  groupedPhases?: string[];
}

const CustomNode: React.FC<{ data: CustomNodeData }> = ({ data }) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencySettings();

  const getLevelColor = (level: number, isGroupedNode?: boolean) => {
    if (isGroupedNode) {
      return { bg: '#f9f0ff', border: '#722ed1', text: '#722ed1' };
    }
    
    switch (level) {
      case 1: return { bg: '#e6f7ff', border: '#1890ff', text: '#1890ff' };
      case 2: return { bg: '#f6ffed', border: '#52c41a', text: '#52c41a' };
      case 3: return { bg: '#fffbe6', border: '#faad14', text: '#faad14' };
      default: return { bg: '#f5f5f5', border: '#d9d9d9', text: '#666' };
    }
  };

  const getLevelLabel = (level: number, isGroupedNode?: boolean) => {
    if (isGroupedNode) return t('treeView.groupedPhases');
    
    switch (level) {
      case 1: return t('flowTree.project');
      case 2: return t('flowTree.phase');
      case 3: return t('flowTree.activity');
      default: return t('flowTree.item');
    }
  };

  const colors = getLevelColor(data.level, data.isGroupedNode);

  // Tooltip para nó agrupado
  const groupedTooltip = data.isGroupedNode && data.groupedPhases ? (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {t('treeView.groupedPhases')}:
      </div>
      <ul style={{ margin: 0, paddingLeft: '16px' }}>
        {data.groupedPhases.map((phase, index) => (
          <li key={index} style={{ marginBottom: '4px' }}>
            {phase}
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  const nodeContent = (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        maxWidth: '250px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        ...(data.isGroupedNode && {
          borderStyle: 'dashed',
          borderWidth: '3px',
        }),
      }}
    >
      {/* Handle de entrada (top) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: colors.border,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />
      
      {/* Handle de saída (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: colors.border,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span
          style={{
            background: colors.border,
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {data.isGroupedNode && <FolderOutlined />}
          {getLevelLabel(data.level, data.isGroupedNode)}
        </span>
        <span
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold'
          }}
        >
          {t('flowTree.level')} {data.level}
        </span>
      </div>
      
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '12px',
        marginBottom: '8px',
        wordBreak: 'break-word',
        lineHeight: '1.2',
        textAlign: 'center'
      }}>
        {data.label}
      </div>
      
      <div style={{ fontSize: '10px', color: '#666' }}>
        <div>{t('flowTree.ownCost')} <strong style={{ color: colors.text }}>{formatCurrency(data.cost)}</strong></div>
        <div>{t('flowTree.totalCostLabel')} <strong style={{ color: '#52c41a' }}>{formatCurrency(data.totalCost)}</strong></div>
        {data.childrenCount > 0 && (
          <div>{t('flowTree.subitems')} <strong>{data.childrenCount}</strong></div>
        )}
      </div>
    </div>
  );

  return data.isGroupedNode ? (
    <Tooltip title={groupedTooltip} placement="top">
      {nodeContent}
    </Tooltip>
  ) : (
    nodeContent
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// Função para calcular layout hierárquico usando Dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 120;

  dagreGraph.setGraph({ 
    rankdir: direction, 
    ranksep: 100, 
    nodesep: 50,
    marginx: 50,
    marginy: 50
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};

const FlowTreeView: React.FC<FlowTreeViewProps> = ({ rootNode, groupingState = { groupedPhaseIds: [], groupedExpanded: false } }) => {
  const { nodes, edges } = useMemo(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // Função recursiva para processar nós e criar arestas
    const processNode = (node: TreeNode) => {
      // Verificar se é um nó agrupado
      const isGroupedNode = node.id === 'grouped-others';
      let groupedPhases: string[] = [];
      
      if (isGroupedNode) {
        // Extrair nomes das fases agrupadas
        groupedPhases = node.children.map(child => child.name);
      }

      // Criar nó
      initialNodes.push({
        id: node.id,
        type: 'custom',
        position: { x: 0, y: 0 }, // Posição inicial será calculada pelo Dagre
        data: {
          label: node.name,
          level: node.level,
          cost: node.cost,
          totalCost: node.totalCost,
          childrenCount: node.children.length,
          isGroupedNode,
          groupedPhases,
        },
      });

      // Para nós agrupados, não processar os filhos individualmente
      if (isGroupedNode) {
        return;
      }

      // Se é o nó raiz e há agrupamento ativo, aplicar lógica de agrupamento
      if (node.level === 1 && groupingState.groupedPhaseIds.length > 0) {
        const phases = node.children.filter(child => child.level === 2);
        const groupedPhases = phases.filter(phase => groupingState.groupedPhaseIds.includes(phase.id));
        const visiblePhases = phases.filter(phase => !groupingState.groupedPhaseIds.includes(phase.id));
        const otherChildren = node.children.filter(child => child.level !== 2);

        // Criar nó agrupado se há fases para agrupar
        if (groupedPhases.length > 0) {
          const totalCost = groupedPhases.reduce((sum, phase) => sum + phase.cost, 0);
          const totalChildrenCost = groupedPhases.reduce((sum, phase) => sum + phase.totalCost, 0);
          
          const groupedNode: TreeNode = {
            id: 'grouped-others',
            name: `Outras (${groupedPhases.length} fases)`,
            cost: totalCost,
            level: 2,
            children: groupedPhases,
            totalCost: totalChildrenCost,
            description: 'Fases agrupadas para simplificar a visualização'
          };

          // Criar aresta para o nó agrupado
          initialEdges.push({
            id: `edge-${node.id}-${groupedNode.id}`,
            source: node.id,
            target: groupedNode.id,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#8c8c8c',
              strokeWidth: 3,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: '#8c8c8c',
            },
          });

          // Processar nó agrupado
          processNode(groupedNode);

          // Criar arestas e processar fases visíveis
          visiblePhases.forEach(phase => {
            initialEdges.push({
              id: `edge-${node.id}-${phase.id}`,
              source: node.id,
              target: phase.id,
              type: 'smoothstep',
              animated: false,
              style: {
                stroke: '#8c8c8c',
                strokeWidth: 3,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 15,
                height: 15,
                color: '#8c8c8c',
              },
            });
            processNode(phase);
          });

          // Criar arestas e processar outros filhos
          otherChildren.forEach(child => {
            initialEdges.push({
              id: `edge-${node.id}-${child.id}`,
              source: node.id,
              target: child.id,
              type: 'smoothstep',
              animated: false,
              style: {
                stroke: '#8c8c8c',
                strokeWidth: 3,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 15,
                height: 15,
                color: '#8c8c8c',
              },
            });
            processNode(child);
          });
        } else {
          // Sem agrupamento, processar normalmente
          node.children.forEach((child) => {
            initialEdges.push({
              id: `edge-${node.id}-${child.id}`,
              source: node.id,
              target: child.id,
              type: 'smoothstep',
              animated: false,
              style: {
                stroke: '#8c8c8c',
                strokeWidth: 3,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 15,
                height: 15,
                color: '#8c8c8c',
              },
            });
            processNode(child);
          });
        }
      } else {
        // Para nós não-raiz ou sem agrupamento, processar normalmente
        node.children.forEach((child) => {
          initialEdges.push({
            id: `edge-${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#8c8c8c',
              strokeWidth: 3,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: '#8c8c8c',
            },
          });
          processNode(child);
        });
      }
    };

    // Processar toda a árvore
    processNode(rootNode);

    // Aplicar layout hierárquico usando Dagre
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'TB' // Top to Bottom (de cima para baixo)
    );

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [rootNode, groupingState.groupedPhaseIds]);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

  return (
    <div style={{ width: '100%', height: '600px', background: '#f9f9f9', borderRadius: '8px' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#8c8c8c', strokeWidth: 3 }
        }}
      >
        <Background color="#ddd" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

const FlowTreeViewWrapper: React.FC<FlowTreeViewProps> = ({ rootNode, groupingState }) => {
  return (
    <ReactFlowProvider>
      <FlowTreeView rootNode={rootNode} groupingState={groupingState} />
    </ReactFlowProvider>
  );
};

export default FlowTreeViewWrapper; 