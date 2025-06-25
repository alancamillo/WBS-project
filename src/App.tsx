import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Space, Card, Statistic, Row, Col } from 'antd';
import { DownloadOutlined, FileExcelOutlined, ProjectOutlined, ApartmentOutlined, UnorderedListOutlined, BulbOutlined, UploadOutlined, BarChartOutlined, TableOutlined } from '@ant-design/icons';
import TreeNodeComponent from './components/TreeNode';
import TreeView from './components/TreeView';
import FlowTreeView from './components/FlowTreeView';
import ImportWBS from './components/ImportWBS';
import GanttChart from './components/GanttChart';
import TableView from './components/TableView';
import { TreeNode, ExportOptions } from './types/index';
import { CostCalculator } from './utils/costCalculator';
import { ExportService } from './services/exportService';
import { createSampleProject } from './data/sampleData';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const [rootNode, setRootNode] = useState<TreeNode>(() => ({
    id: uuidv4(),
    name: 'Projeto Principal',
    cost: 0,
    level: 1,
    children: [],
    totalCost: 0
  }));

  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'flow' | 'gantt' | 'table'>('list');
  const [importModalVisible, setImportModalVisible] = useState(false);

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
    setRootNode(sampleProject);
  };

  const handleImportWBS = (importedNode: TreeNode) => {
    setRootNode(importedNode);
    setImportModalVisible(false);
  };

  const costBreakdown = CostCalculator.getCostBreakdown(rootNode);

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
                title="Custo Total"
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
                title="Nível 1"
                value={costBreakdown.level1}
                prefix="R$"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Nível 2"
                value={costBreakdown.level2}
                prefix="R$"
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Nível 3"
                value={costBreakdown.level3}
                prefix="R$"
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="Estrutura do Projeto"
          extra={
            <Space>
              <Button
                icon={<BulbOutlined />}
                onClick={handleLoadSampleData}
                type="dashed"
              >
                Carregar Exemplo
              </Button>
              
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
          {viewMode === 'list' ? (
            <TreeNodeComponent
              node={rootNode}
              onUpdate={handleRootUpdate}
              onDelete={() => {}} // Root não pode ser deletado
              rootNode={rootNode} // Passando rootNode para acesso às dependências
            />
          ) : viewMode === 'table' ? (
            <TableView rootNode={rootNode} />
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