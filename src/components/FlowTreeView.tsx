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
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { TreeNode } from '../types';

interface FlowTreeViewProps {
  rootNode: TreeNode;
}

interface CustomNodeData {
  label: string;
  level: number;
  cost: number;
  totalCost: number;
  childrenCount: number;
}

const CustomNode: React.FC<{ data: CustomNodeData }> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return { bg: '#e6f7ff', border: '#1890ff', text: '#1890ff' };
      case 2: return { bg: '#f6ffed', border: '#52c41a', text: '#52c41a' };
      case 3: return { bg: '#fffbe6', border: '#faad14', text: '#faad14' };
      default: return { bg: '#f5f5f5', border: '#d9d9d9', text: '#666' };
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

  const colors = getLevelColor(data.level);

  return (
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
            fontWeight: 'bold'
          }}
        >
          {getLevelLabel(data.level)}
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
          Nível {data.level}
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
        <div>Custo Próprio: <strong style={{ color: colors.text }}>{formatCurrency(data.cost)}</strong></div>
        <div>Custo Total: <strong style={{ color: '#52c41a' }}>{formatCurrency(data.totalCost)}</strong></div>
        {data.childrenCount > 0 && (
          <div>Subitens: <strong>{data.childrenCount}</strong></div>
        )}
      </div>
    </div>
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

const FlowTreeView: React.FC<FlowTreeViewProps> = ({ rootNode }) => {
  const { nodes, edges } = useMemo(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // Função recursiva para processar nós e criar arestas
    const processNode = (node: TreeNode) => {
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
        },
      });

      // Criar arestas para os filhos
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

        // Processar filho recursivamente
        processNode(child);
      });
    };

    // Processar toda a árvore
    processNode(rootNode);

    // Aplicar layout hierárquico usando Dagre
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'TB' // Top to Bottom (de cima para baixo)
    );

    // Debug removido - funcionando corretamente

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [rootNode]);

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

const FlowTreeViewWrapper: React.FC<FlowTreeViewProps> = ({ rootNode }) => {
  return (
    <ReactFlowProvider>
      <FlowTreeView rootNode={rootNode} />
    </ReactFlowProvider>
  );
};

export default FlowTreeViewWrapper; 