import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Space, Card, Statistic, Row, Col, Modal, Badge, message, Popconfirm } from 'antd';
import { DownloadOutlined, FileExcelOutlined, ProjectOutlined, ApartmentOutlined, UnorderedListOutlined, BulbOutlined, UploadOutlined, BarChartOutlined, TableOutlined, PieChartOutlined, ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import TreeNodeComponent from './components/TreeNode';
import TreeView from './components/TreeView';
import FlowTreeView from './components/FlowTreeView';
import ImportWBS from './components/ImportWBS';
import GanttChart from './components/GanttChart';
import TableView from './components/TableView';
import BudgetAllocationView from './components/BudgetAllocationView';
import RiskManagement from './components/RiskManagement';
import { TreeNode, ExportOptions } from './types/index';
import { CostCalculator } from './utils/costCalculator';
import { ExportService } from './services/exportService';
import { createSampleProject } from './data/sampleData';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

// Chave para localStorage da estrutura WBS
const WBS_STORAGE_KEY = 'wbs-project-structure';

function App() {
  // Função para carregar estrutura WBS do localStorage
  const loadWBSFromStorage = (): TreeNode => {
    try {
      const stored = localStorage.getItem(WBS_STORAGE_KEY);
      if (stored) {
        const parsedWBS = JSON.parse(stored);
        
        // Função recursiva para converter strings de data de volta para objetos Date
        const convertDates = (node: any): TreeNode => {
          return {
            ...node,
            startDate: node.startDate ? new Date(node.startDate) : undefined,
            endDate: node.endDate ? new Date(node.endDate) : undefined,
            children: node.children ? node.children.map((child: any) => convertDates(child)) : []
          };
        };
        
        return convertDates(parsedWBS);
      }
    } catch (error) {
      console.error('Erro ao carregar estrutura WBS do localStorage:', error);
    }
    
    // Retorna estrutura padrão se não houver dados salvos
    return {
      id: uuidv4(),
      name: 'Projeto Principal',
      cost: 0,
      level: 1,
      children: [],
      totalCost: 0
    };
  };

  // Função para salvar estrutura WBS no localStorage
  const saveWBSToStorage = (wbs: TreeNode) => {
    try {
      localStorage.setItem(WBS_STORAGE_KEY, JSON.stringify(wbs));
    } catch (error) {
      console.error('Erro ao salvar estrutura WBS no localStorage:', error);
      
      // Verificar se é erro de quota excedida
      if (error instanceof DOMException && error.code === 22) {
        message.error('Armazenamento local cheio! A estrutura WBS pode não ter sido salva.');
      } else {
        message.warning('Não foi possível salvar a estrutura WBS automaticamente.');
      }
    }
  };

  const [rootNode, setRootNode] = useState<TreeNode>(() => loadWBSFromStorage());

  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'flow' | 'gantt' | 'table' | 'budget' | 'risks'>('list');
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Salvar no localStorage sempre que a estrutura WBS mudar
  useEffect(() => {
    saveWBSToStorage(rootNode);
  }, [rootNode]);

  // Recalcula custos, datas e durações automaticamente quando a estrutura muda
  useEffect(() => {
    const processedRoot = CostCalculator.processCompleteNode(rootNode);
    if (processedRoot.totalCost !== rootNode.totalCost || 
        JSON.stringify(processedRoot) !== JSON.stringify(rootNode)) {
      setRootNode(processedRoot);
    }
  }, [rootNode]);

  const handleRootUpdate = (updatedNode: TreeNode) => {
    setRootNode(updatedNode);
    // A persistência acontece automaticamente via useEffect
  };

  const handleExportExcel = () => {
    const options: ExportOptions = {
      format: 'excel',
      includeMetadata: true,
      includeCostBreakdown: true
    };
    ExportService.exportToExcel(rootNode, 'estrutura-wbs.xlsx', options);
  };

  const handleExportJSON = () => {
    ExportService.exportToJSON(rootNode, 'estrutura-wbs.json');
  };

  const handleLoadSampleData = () => {
    const sampleProject = createSampleProject();
    
    // Contar nós existentes (excluindo o nó raiz vazio)
    const countNodes = (node: TreeNode): number => {
      return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
    };
    
    const existingNodes = countNodes(rootNode);
    const hasExistingData = existingNodes > 1 || rootNode.children.length > 0;
    
    if (hasExistingData) {
      Modal.confirm({
        title: 'Carregar Dados de Exemplo',
        content: (
          <div>
            <p>Você já possui uma estrutura WBS com {existingNodes} nó(s).</p>
            <p>Carregar o exemplo irá substituir a estrutura atual.</p>
            <p>Deseja continuar?</p>
          </div>
        ),
        okText: 'Sim, substituir',
        cancelText: 'Cancelar',
        onOk: () => {
          setRootNode(sampleProject);
          message.success('Dados de exemplo carregados com sucesso!');
        },
      });
    } else {
      setRootNode(sampleProject);
      message.success('Dados de exemplo carregados com sucesso!');
    }
  };

  const handleClearWBS = () => {
    const emptyProject: TreeNode = {
      id: uuidv4(),
      name: 'Projeto Principal',
      cost: 0,
      level: 1,
      children: [],
      totalCost: 0
    };
    
    setRootNode(emptyProject);
    localStorage.removeItem(WBS_STORAGE_KEY);
    message.success('Estrutura WBS limpa com sucesso!');
  };

  const handleImportWBS = (importedNode: TreeNode) => {
    setRootNode(importedNode);
    setImportModalVisible(false);
    message.success('Estrutura WBS importada e salva automaticamente!');
  };

  const costBreakdown = CostCalculator.getCostBreakdown(rootNode);

  // Função para contar diferentes tipos de nós na estrutura
  const getWBSStatistics = () => {
    let totalNodes = 0;
    let phases = 0; // Nível 2
    let activities = 0; // Nível 3
    let hasChildren = 0;
    let leafNodes = 0;

    const traverse = (node: TreeNode) => {
      totalNodes++;
      
      if (node.level === 2) phases++;
      if (node.level === 3) activities++;
      
      if (node.children.length > 0) {
        hasChildren++;
        node.children.forEach(child => traverse(child));
      } else if (node.level > 1) { // Não contar o projeto raiz como folha se não tiver filhos
        leafNodes++;
      }
    };

    traverse(rootNode);
    
    return {
      totalNodes,
      phases,
      activities,
      hasChildren,
      leafNodes,
      hasData: totalNodes > 1 || rootNode.children.length > 0
    };
  };

  const wbsStats = getWBSStatistics();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ backgroundColor: '#001529', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <ProjectOutlined style={{ fontSize: '24px', color: 'white', marginRight: '12px' }} />
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            WBS - Work Breakdown Structure
          </Title>
        </div>
      </Header>

      <Content style={{ padding: '24px' }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="💰 Custo Total"
                value={costBreakdown.total}
                prefix="R$"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="📊 Total de Nós"
                value={wbsStats.totalNodes}
                suffix={wbsStats.hasData ? '(Salvos)' : ''}
                valueStyle={{ color: wbsStats.hasData ? '#52c41a' : '#999' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="🎯 Fases (Nível 2)"
                value={wbsStats.phases}
                prefix="📁"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="⚡ Atividades (Nível 3)"
                value={wbsStats.activities}
                prefix="📝"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <span>Estrutura do Projeto</span>
              {wbsStats.hasData && (
                <Badge 
                  count={wbsStats.totalNodes} 
                  style={{ backgroundColor: '#1890ff' }}
                  title={`${wbsStats.totalNodes} nó(s) na estrutura WBS (${wbsStats.phases} fases, ${wbsStats.activities} atividades)`}
                />
              )}
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<BulbOutlined />}
                onClick={handleLoadSampleData}
                type="dashed"
              >
                Carregar Exemplo
              </Button>
              
              <Popconfirm
                title="Limpar Estrutura WBS"
                description="Esta ação irá remover toda a estrutura do projeto. Tem certeza?"
                onConfirm={handleClearWBS}
                okText="Sim, limpar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  type="dashed"
                  icon={<DeleteOutlined />}
                  disabled={rootNode.children.length === 0}
                >
                  Limpar WBS
                </Button>
              </Popconfirm>
              
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalVisible(true)}
                type="default"
              >
                Importar WBS
              </Button>
              
              <Button.Group>
                <Button
                  icon={<UnorderedListOutlined />}
                  onClick={() => setViewMode('list')}
                  type={viewMode === 'list' ? 'primary' : 'default'}
                >
                  Lista
                </Button>
                <Button
                  icon={<TableOutlined />}
                  onClick={() => setViewMode('table')}
                  type={viewMode === 'table' ? 'primary' : 'default'}
                >
                  Tabela
                </Button>
                <Button
                  icon={<ApartmentOutlined />}
                  onClick={() => setViewMode('flow')}
                  type={viewMode === 'flow' ? 'primary' : 'default'}
                >
                  Diagrama
                </Button>
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => setViewMode('gantt')}
                  type={viewMode === 'gantt' ? 'primary' : 'default'}
                >
                  Gantt
                </Button>
                <Button
                  icon={<PieChartOutlined />}
                  onClick={() => setViewMode('budget')}
                  type={viewMode === 'budget' ? 'primary' : 'default'}
                >
                  Budget
                </Button>
                <Button
                  icon={<ExclamationCircleOutlined />}
                  onClick={() => setViewMode('risks')}
                  type={viewMode === 'risks' ? 'primary' : 'default'}
                >
                  Riscos
                </Button>
              </Button.Group>
              
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={handleExportExcel}
              >
                Exportar Excel
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportJSON}
              >
                Exportar JSON
              </Button>
            </Space>
          }
        >
          {/* Informação sobre persistência automática */}
          {!wbsStats.hasData && (
            <div style={{ marginBottom: 16, padding: 16, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
              <Space direction="vertical" size="small">
                <div style={{ fontWeight: 'bold', color: '#389e0d' }}>
                  💾 Armazenamento Automático Ativado
                </div>
                <div style={{ color: '#666', fontSize: 14 }}>
                  Sua estrutura WBS é automaticamente salva no navegador. Todas as modificações, 
                  incluindo adição/edição de fases e atividades, permanecerão disponíveis mesmo 
                  depois de navegar entre as telas ou recarregar a página.
                </div>
              </Space>
            </div>
          )}

          {viewMode === 'list' ? (
            <TreeNodeComponent
              node={rootNode}
              onUpdate={handleRootUpdate}
              onDelete={() => {}} // Root não pode ser deletado
              rootNode={rootNode} // Passando rootNode para acesso às dependências
            />
          ) : viewMode === 'table' ? (
            <TableView rootNode={rootNode} />
          ) : viewMode === 'budget' ? (
            <BudgetAllocationView rootNode={rootNode} />
          ) : viewMode === 'risks' ? (
            <RiskManagement rootNode={rootNode} />
          ) : viewMode === 'flow' ? (
            <FlowTreeView rootNode={rootNode} />
          ) : viewMode === 'gantt' ? (
            <GanttChart rootNode={rootNode} />
          ) : (
            <TreeView rootNode={rootNode} />
          )}
        </Card>

        <ImportWBS
          visible={importModalVisible}
          onClose={() => setImportModalVisible(false)}
          onImport={handleImportWBS}
        />
      </Content>
    </Layout>
  );
}

export default App; 