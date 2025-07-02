import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Space, Card, Statistic, Row, Col, Modal, Badge, message, Popconfirm, Dropdown, Menu } from 'antd';
import { DownloadOutlined, FileExcelOutlined, ProjectOutlined, ApartmentOutlined, UnorderedListOutlined, BulbOutlined, UploadOutlined, BarChartOutlined, TableOutlined, PieChartOutlined, ExclamationCircleOutlined, DeleteOutlined, SettingOutlined, EllipsisOutlined, TrophyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import TreeNodeComponent from './components/TreeNode';
import FlowTreeView from './components/FlowTreeView';
import ImportWBS from './components/ImportWBS';
import GanttChart from './components/GanttChart';
import TableView from './components/TableView';
import BudgetAllocationView from './components/BudgetAllocationView';
import RiskManagement from './components/RiskManagement';
import MeritFigures from './components/MeritFigures';
import TrlView from './components/TrlView';
import LanguageSelector from './components/LanguageSelector';
import SettingsModal from './components/SettingsModal';
import { TreeNode, ExportOptions, UnifiedExportOptions } from './types/index';
import { ImportResult, ImportService } from './services/importService';
import { CostCalculator } from './utils/costCalculator';
import { DateCalculator } from './utils/dateCalculator';
import { ExportService } from './services/exportService';
import { createSampleProject } from './data/sampleData';
import { useCurrencySettings } from './hooks/useCurrencySettings';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

// Chave para localStorage da estrutura WBS
const WBS_STORAGE_KEY = 'wbs-project-structure';
const GROUPING_STORAGE_KEY = 'wbs-grouping-state';

function App() {
  const { t } = useTranslation();
  const { formatCurrency, getCurrencySymbol } = useCurrencySettings();
  
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
        
        const convertedWBS = convertDates(parsedWBS);
        // Aplica herança e cálculo de custos imediatamente ao carregar
        const processedRoot = CostCalculator.processCompleteNode(convertedWBS);
        return DateCalculator.applyDateInheritanceRecursively(processedRoot);
      }
    } catch (error) {
      console.error(t('messages.error.loadFailed'), error);
    }
    
    // Retorna estrutura padrão se não houver dados salvos
    return {
      id: uuidv4(),
      name: t('wbs.project'),
      cost: 0,
      level: 1,
      children: [],
      totalCost: 0
    };
  };

  // Função para carregar estado de agrupamento do localStorage
  const loadGroupingFromStorage = () => {
    try {
      const savedGrouping = localStorage.getItem(GROUPING_STORAGE_KEY);
      if (savedGrouping) {
        const parsedGrouping = JSON.parse(savedGrouping);
        if (parsedGrouping.groupedPhaseIds && Array.isArray(parsedGrouping.groupedPhaseIds)) {
          return {
            groupedPhaseIds: parsedGrouping.groupedPhaseIds,
            groupedExpanded: parsedGrouping.groupedExpanded || false
          };
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar estado de agrupamento:', error);
    }
    return { groupedPhaseIds: [], groupedExpanded: false };
  };

  // Função para salvar estrutura WBS no localStorage
  const saveWBSToStorage = (wbs: TreeNode) => {
    try {
      // Sempre aplicar herança e cálculo de custos antes de persistir
      const processedRoot = CostCalculator.processCompleteNode(wbs);
      const processedWithInheritance = DateCalculator.applyDateInheritanceRecursively(processedRoot);
      localStorage.setItem(WBS_STORAGE_KEY, JSON.stringify(processedWithInheritance));
    } catch (error) {
      console.error(t('messages.error.saveFailed'), error);
      
      // Verificar se é erro de quota excedida
      if (error instanceof DOMException && error.code === 22) {
        message.error(t('messages.error.storageQuotaExceeded'));
      } else {
        message.warning(t('messages.error.autoSaveFailed'));
      }
    }
  };

  const [rootNode, setRootNode] = useState<TreeNode>(() => loadWBSFromStorage());
  const [groupingState, setGroupingState] = useState(() => loadGroupingFromStorage());

  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'flow' | 'gantt' | 'table' | 'budget' | 'risks' | 'meritFigures' | 'trl'>('list');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Salvar no localStorage sempre que a estrutura WBS mudar
  useEffect(() => {
    saveWBSToStorage(rootNode);
  }, [rootNode]);

  // Salvar estado de agrupamento no localStorage
  useEffect(() => {
    try {
      const groupingData = {
        ...groupingState,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(GROUPING_STORAGE_KEY, JSON.stringify(groupingData));
    } catch (error) {
      console.warn('Erro ao salvar estado de agrupamento:', error);
    }
  }, [groupingState]);

  // REMOVIDO: useEffect que reprocessava dados após mudanças - agora é feito na atualização

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const wbsUrl = urlParams.get('url');

    if (wbsUrl) {
      const importWBSFromURL = async () => {
        message.loading({ content: t('messages.loading.importingFromUrl'), key: 'import' });
        const result = await ImportService.importFromURL(wbsUrl);

        if (result.success && result.data) {
          ImportService.applyUnifiedData(result.data);
          // Aplica processamento completo nos dados da URL
          const processedRoot = CostCalculator.processCompleteNode(result.data.wbsStructure);
          const wbsWithInheritance = DateCalculator.applyDateInheritanceRecursively(processedRoot);
          setRootNode(wbsWithInheritance);
          if (result.data.groupingState) {
            setGroupingState(result.data.groupingState);
          }
          message.success({ content: t('messages.success.wbsImported'), key: 'import', duration: 2 });
        } else {
          message.error({ content: t('messages.error.importFailed', { error: result.errors.map(e => e.message).join(', ') }), key: 'import', duration: 5 });
        }
      };

      importWBSFromURL();
    }
  }, [t]);

  const handleRootUpdate = (updatedNode: TreeNode) => {
    // Aplica processamento completo (custos + herança) antes de atualizar o estado
    const processedRoot = CostCalculator.processCompleteNode(updatedNode);
    const nodeWithDateInheritance = DateCalculator.applyDateInheritanceRecursively(processedRoot);
    setRootNode(nodeWithDateInheritance);
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



  /**
   * Export unificado completo com todas as opções
   */
  const handleExportUnified = () => {
    ExportService.exportUnifiedJSON(rootNode, 'projeto-completo-unificado.json', {
      format: 'json',
      includeWbs: true,
      includeRisks: true,
      includeMeritFigures: true,
      includeGroupingState: true,
      includeStatistics: true,
      includeSettings: true,
      includeMetadata: true,
      includeCostBreakdown: true,
      includeGanttData: false,
      compressOutput: false
    });
    
    message.success({
      content: (
        <div>
          <div><strong>{t('export.unifiedExportComplete')}</strong></div>
          <div>{t('export.wbsStructureComplete')}</div>
          <div>{t('export.allRisks')}</div>
          <div>{t('export.allMeritFigures')}</div>
          <div>{t('export.groupingState')}</div>
          <div>{t('export.settingsAndStatistics')}</div>
        </div>
      ),
      duration: 5
    });
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
        title: t('modals.loadSampleData.title'),
        content: (
          <div>
            <p>{t('modals.loadSampleData.content', { count: existingNodes })}</p>
            <p>{t('modals.loadSampleData.warning')}</p>
            <p>{t('modals.loadSampleData.question')}</p>
          </div>
        ),
        okText: t('modals.loadSampleData.replaceButton'),
        cancelText: t('buttons.cancel'),
        onOk: () => {
          const processedRoot = CostCalculator.processCompleteNode(sampleProject);
          const sampleWithInheritance = DateCalculator.applyDateInheritanceRecursively(processedRoot);
          setRootNode(sampleWithInheritance);
          message.success(t('messages.success.sampleDataLoaded'));
        },
      });
    } else {
      const processedRoot = CostCalculator.processCompleteNode(sampleProject);
      const sampleWithInheritance = DateCalculator.applyDateInheritanceRecursively(processedRoot);
      setRootNode(sampleWithInheritance);
      message.success(t('messages.success.sampleDataLoaded'));
    }
  };

  const handleClearWBS = () => {
    const emptyProject: TreeNode = {
      id: uuidv4(),
      name: t('wbs.project'),
      cost: 0,
      level: 1,
      children: [],
      totalCost: 0
    };
    
    setRootNode(emptyProject);
    setGroupingState({ groupedPhaseIds: [], groupedExpanded: false });

    // Limpar todos os dados do projeto do localStorage
    localStorage.removeItem(WBS_STORAGE_KEY);
    localStorage.removeItem('wbs-project-risks');
    localStorage.removeItem('wbs-merit-figures');
    localStorage.removeItem(GROUPING_STORAGE_KEY);
    
    message.success(t('messages.success.wbsCleared'));

    // Forçar recarga para garantir um estado limpo em todos os componentes
    setTimeout(() => window.location.reload(), 500);
  };

  const handleImportWBS = (result: ImportResult) => {
    if (result.data) {
      // Aplica processamento completo nos dados importados
      const processedRoot = CostCalculator.processCompleteNode(result.data);
      const dataWithInheritance = DateCalculator.applyDateInheritanceRecursively(processedRoot);
      setRootNode(dataWithInheritance);
    }

    if (result.risks) {
      localStorage.setItem('wbs-project-risks', JSON.stringify(result.risks));
    }

    if (result.meritFigures) {
      localStorage.setItem('wbs-merit-figures', JSON.stringify(result.meritFigures));
    }

    setImportModalVisible(false);
    message.success(t('messages.success.wbsImported'));
    // Forçar a recarga da página para garantir que todos os componentes leiam os novos dados do localStorage
    window.location.reload();
  };

  /**
   * Método para importação usando o novo sistema unificado
   */
  const handleImportWBSUnified = async (file: File) => {
    try {
      const unifiedResult = await ImportService.importUnifiedFromJSON(file);
      
      if (unifiedResult.success && unifiedResult.data) {
        // Aplicar dados usando o novo método
        ImportService.applyUnifiedData(unifiedResult.data);
        
        // Atualizar estado local com WBS com herança de datas aplicada
        const wbsWithInheritance = DateCalculator.applyDateInheritanceRecursively(unifiedResult.data.wbsStructure);
        setRootNode(wbsWithInheritance);
        
        // Atualizar estado de agrupamento se presente
        if (unifiedResult.data.groupingState) {
          setGroupingState(unifiedResult.data.groupingState);
        }
        
        setImportModalVisible(false);
        
        // Mostrar resumo da importação
        const summary = unifiedResult.summary;
        if (summary) {
          message.success({
            content: (
              <div>
                <div><strong>{t('messages.success.wbsImported')}</strong></div>
                <div>WBS: {summary.wbs.totalNodes} {t('unifiedImport.nodesImported')}</div>
                <div>{t('navigation.risks')}: {summary.risks.totalRisks} {t('unifiedImport.risksImported')}</div>
                <div>{t('navigation.meritFigures')}: {summary.meritFigures.totalFigures} {t('unifiedImport.meritFiguresImported')}</div>
                {summary.compatibility.migrationRequired && (
                  <div style={{ color: '#faad14' }}>{t('unifiedImport.migrationPerformed')}</div>
                )}
              </div>
            ),
            duration: 6
          });
        } else {
          message.success(t('messages.success.wbsImported'));
        }
        
        // Forçar recarga para garantir sincronização
        setTimeout(() => window.location.reload(), 1000);
      } else {
        // Mostrar erros
        const errorMessages = unifiedResult.errors
          .filter(e => e.severity === 'error')
          .map(e => e.message)
          .join('; ');
        
        message.error(`${t('unifiedImport.importError')} ${errorMessages}`);
        
        // Mostrar warnings se houver
        const warnings = unifiedResult.warnings;
        if (warnings.length > 0) {
          message.warning(`${t('unifiedImport.warnings')} ${warnings.map(w => w.message).join('; ')}`);
        }
      }
    } catch (error) {
      message.error(`${t('unifiedImport.fileProcessError')} ${error instanceof Error ? error.message : t('unifiedImport.unknownError')}`);
    }
  };

  // Funções para gerenciar agrupamento
  const handleGroupingUpdate = (newGroupingState: { groupedPhaseIds: string[]; groupedExpanded: boolean }) => {
    setGroupingState(newGroupingState);
  };

  const handleClearGrouping = () => {
    setGroupingState({ groupedPhaseIds: [], groupedExpanded: false });
    try {
      localStorage.removeItem(GROUPING_STORAGE_KEY);
    } catch (error) {
      console.warn('Erro ao limpar estado de agrupamento:', error);
    }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ProjectOutlined style={{ fontSize: '24px', color: 'white', marginRight: '12px' }} />
            <Title level={3} style={{ color: 'white', margin: 0 }}>
              {t('app.title')}
            </Title>
          </div>
          <Space>
            <LanguageSelector size="small" />
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setSettingsModalVisible(true)}
              style={{ color: 'white' }}
              title={t('settings.title')}
            />
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '24px' }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={`💰 ${t('statistics.totalCost')}`}
                value={costBreakdown.total}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={`📊 ${t('statistics.totalNodes')}`}
                value={wbsStats.totalNodes}
                suffix={wbsStats.hasData ? '(Salvos)' : ''}
                valueStyle={{ color: wbsStats.hasData ? '#52c41a' : '#999' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={`🎯 ${t('statistics.phases')} (${t('wbs.phase')})`}
                value={wbsStats.phases}
                prefix="📁"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={`⚡ ${t('statistics.activities')} (${t('wbs.activity')})`}
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
              <span>{t('wbs.project')} - {t('app.subtitle')}</span>
              {wbsStats.hasData && (
                <Badge 
                  count={wbsStats.totalNodes} 
                  style={{ backgroundColor: '#1890ff' }}
                  title={`${wbsStats.totalNodes} nó(s) na estrutura WBS (${wbsStats.phases} ${t('statistics.phases').toLowerCase()}, ${wbsStats.activities} ${t('statistics.activities').toLowerCase()})`}
                />
              )}
            </Space>
          }
          extra={
            <Space>
              <Space.Compact>
                <Button
                  icon={<UnorderedListOutlined />}
                  onClick={() => setViewMode('list')}
                  type={viewMode === 'list' ? 'primary' : 'default'}
                >
                  {t('navigation.list')}
                </Button>
                <Button
                  icon={<TableOutlined />}
                  onClick={() => setViewMode('table')}
                  type={viewMode === 'table' ? 'primary' : 'default'}
                >
                  {t('navigation.table')}
                </Button>
                <Button
                  icon={<ApartmentOutlined />}
                  onClick={() => setViewMode('flow')}
                  type={viewMode === 'flow' ? 'primary' : 'default'}
                >
                  {t('navigation.flow')}
                </Button>
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => setViewMode('gantt')}
                  type={viewMode === 'gantt' ? 'primary' : 'default'}
                >
                  {t('navigation.gantt')}
                </Button>
                <Button
                  icon={<PieChartOutlined />}
                  onClick={() => setViewMode('budget')}
                  type={viewMode === 'budget' ? 'primary' : 'default'}
                >
                  {t('navigation.budget')}
                </Button>
                <Button
                  icon={<ExclamationCircleOutlined />}
                  onClick={() => setViewMode('risks')}
                  type={viewMode === 'risks' ? 'primary' : 'default'}
                >
                  {t('navigation.risks')}
                </Button>
                <Button
                  icon={<TrophyOutlined />}
                  onClick={() => setViewMode('meritFigures')}
                  type={viewMode === 'meritFigures' ? 'primary' : 'default'}
                >
                  {t('navigation.meritFigures')}
                </Button>
                <Button
                  icon={<BulbOutlined />}
                  onClick={() => setViewMode('trl')}
                  type={viewMode === 'trl' ? 'primary' : 'default'}
                >
                  {t('navigation.trl')}
                </Button>
              </Space.Compact>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'loadSample',
                      icon: <BulbOutlined />,
                      label: t('buttons.loadSampleData'),
                      onClick: handleLoadSampleData
                    },
                    {
                      key: 'clearWBS',
                      icon: <DeleteOutlined />,
                      disabled: rootNode.children.length === 0,
                      label: (
                        <Popconfirm
                          title={t('modals.clearWBS.title')}
                          description={t('modals.clearWBS.question')}
                          onConfirm={handleClearWBS}
                          okText={t('buttons.yes')}
                          cancelText={t('buttons.cancel')}
                          okButtonProps={{ danger: true }}
                        >
                          <span>{t('buttons.clearWBS')}</span>
                        </Popconfirm>
                      )
                    },
                    {
                      key: 'importWBS',
                      icon: <UploadOutlined />,
                      label: t('buttons.importExcel'),
                      onClick: () => setImportModalVisible(true)
                    },
                    {
                      key: 'exportExcel',
                      icon: <FileExcelOutlined />,
                      label: `${t('buttons.export')} Excel`,
                      onClick: handleExportExcel
                    },
                    {
                      key: 'exportUnified',
                      icon: <ProjectOutlined />,
                      label: t('export.exportWbs'),
                      onClick: handleExportUnified
                    },
                    {
                      key: 'settings',
                      icon: <SettingOutlined />,
                      label: t('settings.title'),
                      onClick: () => setSettingsModalVisible(true)
                    }
                  ]
                }}
                trigger={['click']}
              >
                <Button icon={<EllipsisOutlined />} />
              </Dropdown>
            </Space>
          }
        >
          {/* Informação sobre persistência automática */}
          {!wbsStats.hasData && (
            <div style={{ marginBottom: 16, padding: 16, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
              <Space direction="vertical" size="small">
                <div style={{ fontWeight: 'bold', color: '#389e0d' }}>
                  💾 {t('settings.autoSave')} {t('settings.enabled')}
                </div>
                <div style={{ color: '#666', fontSize: 14 }}>
                  {t('wbsAutoSave')}
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
              groupingState={groupingState}
              onGroupingUpdate={handleGroupingUpdate}
              onClearGrouping={handleClearGrouping}
            />
          ) : viewMode === 'table' ? (
            <TableView rootNode={rootNode} />
          ) : viewMode === 'budget' ? (
            <BudgetAllocationView rootNode={rootNode} />
          ) : viewMode === 'risks' ? (
            <RiskManagement rootNode={rootNode} />
          ) : viewMode === 'flow' ? (
            <FlowTreeView rootNode={rootNode} groupingState={groupingState} />
          ) : viewMode === 'gantt' ? (
            <GanttChart rootNode={rootNode} />
          ) : viewMode === 'meritFigures' ? (
            <MeritFigures rootNode={rootNode} />
          ) : viewMode === 'trl' ? (
            <TrlView rootNode={rootNode} />
          ) : (
            <TreeNodeComponent
              node={rootNode}
              onUpdate={handleRootUpdate}
              onDelete={() => {}}
              rootNode={rootNode}
              groupingState={groupingState}
              onGroupingUpdate={handleGroupingUpdate}
              onClearGrouping={handleClearGrouping}
            />
          )}
        </Card>

        <ImportWBS
          open={importModalVisible}
          onClose={() => setImportModalVisible(false)}
          onImport={handleImportWBS}
        />

        <SettingsModal
          open={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
        />
      </Content>
    </Layout>
  );
}

export default App; 