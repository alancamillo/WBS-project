import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Select, 
  Switch, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Button, 
  Statistic, 
  Tag,
  Divider,
  Alert,
  Tooltip
} from 'antd';
import { 
  BarChartOutlined, 
  DownloadOutlined, 
  InfoCircleOutlined,
  CalendarOutlined,
  TeamOutlined,
  DollarCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { TreeNode, GanttViewOptions, GanttTask } from '../types';
import { GanttService } from '../services/ganttService';

const { Title, Text } = Typography;
const { Option } = Select;

interface GanttChartProps {
  rootNode: TreeNode;
  onTaskChange?: (task: Task) => void;
  onTaskDelete?: (task: Task) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ 
  rootNode, 
  onTaskChange, 
  onTaskDelete 
}) => {
  const [viewOptions, setViewOptions] = useState<GanttViewOptions>({
    showLevels: [1, 2, 3],
    showCriticalPath: true,
    groupByLevel: false,
    showCosts: true,
    showProgress: true,
    viewMode: 'Day'
  });

  const [selectedView, setSelectedView] = useState<ViewMode>(ViewMode.Day);

  // Converte para tarefas Gantt
  const ganttTasks = useMemo(() => {
    return GanttService.convertTreeToGanttTasks(rootNode, viewOptions);
  }, [rootNode, viewOptions]);

  // Converte para formato da biblioteca gantt-task-react
  const tasks: Task[] = useMemo(() => {
    return ganttTasks.map(task => ({
      id: task.id,
      name: task.name,
      start: task.start,
      end: task.end,
      type: task.type as any,
      progress: task.progress,
      isDisabled: false,
      project: task.project,
      dependencies: task.dependencies,
      styles: task.styles
    }));
  }, [ganttTasks]);

  // Análise do projeto
  const projectAnalysis = useMemo(() => {
    return GanttService.generateProjectAnalysis(ganttTasks);
  }, [ganttTasks]);

  const handleViewOptionsChange = (key: keyof GanttViewOptions, value: any) => {
    setViewOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLevelChange = (levels: number[]) => {
    handleViewOptionsChange('showLevels', levels as (1 | 2 | 3)[]);
  };

  const handleExportGantt = (format: 'json' | 'csv') => {
    const exportData = GanttService.exportGanttData(ganttTasks, format);
    
    const blob = new Blob(
      [typeof exportData === 'string' ? exportData : JSON.stringify(exportData, null, 2)],
      { type: format === 'csv' ? 'text/csv' : 'application/json' }
    );
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-chart-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'blue';
      case 2: return 'green';
      case 3: return 'orange';
      default: return 'default';
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

  return (
    <div style={{ padding: '24px' }}>
      {/* Cabeçalho com título e controles */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: '8px' }} />
            Gantt Chart - {rootNode.name}
          </Title>
        </Col>
        <Col>
          <Space>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={() => handleExportGantt('json')}
            >
              Exportar JSON
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleExportGantt('csv')}
            >
              Exportar CSV
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Estatísticas do projeto */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total de Tarefas"
              value={projectAnalysis.summary.totalTasks}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Taxa de Conclusão"
              value={projectAnalysis.summary.completionRate}
              precision={1}
              suffix="%"
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Custo Total"
              value={projectAnalysis.summary.totalCost}
              prefix={<DollarCircleOutlined />}
              formatter={(value) => 
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(value as number)
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Duração (dias)"
              value={projectAnalysis.summary.totalDurationDays}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Controles de visualização */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>Configurações de Visualização</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Níveis para Exibir:</Text>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Selecione os níveis"
                value={viewOptions.showLevels}
                onChange={handleLevelChange}
              >
                <Option value={1}>
                  <Tag color={getLevelColor(1)}>Nível 1 - Projeto</Tag>
                </Option>
                <Option value={2}>
                  <Tag color={getLevelColor(2)}>Nível 2 - Fase</Tag>
                </Option>
                <Option value={3}>
                  <Tag color={getLevelColor(3)}>Nível 3 - Atividade</Tag>
                </Option>
              </Select>
            </Space>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Modo de Visualização:</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedView}
                onChange={(value) => {
                  setSelectedView(value);
                  handleViewOptionsChange('viewMode', value);
                }}
              >
                <Option value={ViewMode.QuarterDay}>Quarto de Dia</Option>
                <Option value={ViewMode.HalfDay}>Meio Dia</Option>
                <Option value={ViewMode.Day}>Dia</Option>
                <Option value={ViewMode.Week}>Semana</Option>
                <Option value={ViewMode.Month}>Mês</Option>
              </Select>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical">
              <Text strong>Opções Avançadas:</Text>
              <Space direction="vertical">
                <Tooltip title="Destacar tarefas no caminho crítico do projeto">
                  <Switch
                    checked={viewOptions.showCriticalPath}
                    onChange={(checked) => handleViewOptionsChange('showCriticalPath', checked)}
                    checkedChildren="Caminho Crítico"
                    unCheckedChildren="Caminho Crítico"
                  />
                </Tooltip>
                
                <Tooltip title="Agrupar tarefas por nível hierárquico">
                  <Switch
                    checked={viewOptions.groupByLevel}
                    onChange={(checked) => handleViewOptionsChange('groupByLevel', checked)}
                    checkedChildren="Agrupar por Nível"
                    unCheckedChildren="Agrupar por Nível"
                  />
                </Tooltip>
                
                <Tooltip title="Exibir informações de custo nas tarefas">
                  <Switch
                    checked={viewOptions.showCosts}
                    onChange={(checked) => handleViewOptionsChange('showCosts', checked)}
                    checkedChildren="Mostrar Custos"
                    unCheckedChildren="Mostrar Custos"
                  />
                </Tooltip>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Recomendações */}
      {projectAnalysis.recommendations.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
          message="Recomendações do Sistema"
          description={
            <ul style={{ marginBottom: 0 }}>
              {projectAnalysis.recommendations.map((rec: string, index: number) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          }
        />
      )}

      {/* Informações sobre caminho crítico */}
      {viewOptions.showCriticalPath && projectAnalysis.criticalPath.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <Title level={4}>
            <InfoCircleOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
            Caminho Crítico
          </Title>
          <Text type="secondary">
            Tarefas que, se atrasadas, impactarão diretamente o prazo final do projeto:
          </Text>
          <Divider />
          <Row gutter={[8, 8]}>
            {projectAnalysis.criticalPath.map((task: any) => (
              <Col key={task.id}>
                <Tag color="red" style={{ marginBottom: '4px' }}>
                  {task.name}
                </Tag>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Gráfico Gantt */}
      <Card>
        <div style={{ height: '600px', overflowX: 'auto' }}>
          {tasks.length > 0 ? (
            <Gantt
              tasks={tasks}
              viewMode={selectedView}
              locale="pt-BR"
              listCellWidth="200px"
              columnWidth={65}
              onDateChange={onTaskChange}
              onDelete={onTaskDelete}
              barBackgroundColor="#1890ff"
              barBackgroundSelectedColor="#096dd9"
              barProgressColor="#52c41a"
              barProgressSelectedColor="#389e0d"
              projectBackgroundColor="#722ed1"
              projectProgressColor="#9254de"
              milestoneBackgroundColor="#faad14"
              rtl={false}
              headerHeight={50}
              rowHeight={50}
              ganttHeight={400}
              preStepsCount={1}
              todayColor="rgba(252, 58, 48, 0.5)"
              TooltipContent={({ task, fontSize, fontFamily }) => (
                <div style={{ 
                  padding: '8px', 
                  backgroundColor: 'white', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {task.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div>Início: {task.start.toLocaleDateString('pt-BR')}</div>
                    <div>Fim: {task.end.toLocaleDateString('pt-BR')}</div>
                    <div>Progresso: {task.progress}%</div>
                    {ganttTasks.find(t => t.id === task.id)?.responsible && (
                      <div>Responsável: {ganttTasks.find(t => t.id === task.id)?.responsible}</div>
                    )}
                    {viewOptions.showCosts && (
                      <div>
                        Custo: {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(ganttTasks.find(t => t.id === task.id)?.cost || 0)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          ) : (
            <div style={{ 
              height: '400px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999'
            }}>
              <Space direction="vertical" align="center">
                <BarChartOutlined style={{ fontSize: '48px' }} />
                <Text type="secondary">Nenhuma tarefa encontrada para os níveis selecionados</Text>
              </Space>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GanttChart; 