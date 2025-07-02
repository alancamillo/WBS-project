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
import { useTranslation } from 'react-i18next';
import { useCurrencySettings } from '../hooks/useCurrencySettings';
import { 
  BarChartOutlined, 
  DownloadOutlined, 
  InfoCircleOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { TreeNode, GanttViewOptions } from '../types';
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
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrencySettings();

  // Função para obter locale do Gantt
  const getGanttLocale = () => {
    switch (i18n.language) {
      case 'en': return 'en-US';
      case 'es': return 'es-ES';
      case 'zh': return 'zh-CN';
      default: return 'pt-BR';
    }
  };

  const [viewOptions, setViewOptions] = useState<GanttViewOptions>({
    showLevels: [1, 2, 3, 4],
    showCriticalPath: true,
    groupByLevel: false,
    showCosts: true,
    showProgress: true,
    viewMode: 'Day',
    ganttHeight: 'standard'
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
    return GanttService.generateProjectAnalysis(ganttTasks, t);
  }, [ganttTasks, t]);

  // Converte a opção de altura para pixels
  const getGanttHeight = (heightOption: string): number => {
    switch (heightOption) {
      case 'compact': return 300;
      case 'standard': return 400;
      case 'expanded': return 600;
      case 'full': return 800;
      default: return 400;
    }
  };

  // Calcula altura do container baseado na altura do Gantt
  const getContainerHeight = (heightOption: string): number => {
    return getGanttHeight(heightOption) + 200; // +200px para acomodar headers e controles
  };

  const handleViewOptionsChange = (key: keyof GanttViewOptions, value: any) => {
    setViewOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLevelChange = (levels: number[]) => {
    handleViewOptionsChange('showLevels', levels as (1 | 2 | 3 | 4)[]);
  };

  const handleExportGantt = (format: 'json' | 'csv') => {
    const exportData = GanttService.exportGanttData(ganttTasks, format, t);
    
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
      case 4: return 'magenta';
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
            {t('gantt.title')} - {rootNode.name}
          </Title>
        </Col>
        <Col>
          <Space>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={() => handleExportGantt('json')}
            >
              {t('gantt.exportJson')}
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleExportGantt('csv')}
            >
              {t('gantt.exportCsv')}
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Estatísticas do projeto */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('gantt.totalTasks')}
              value={projectAnalysis.summary.totalTasks}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('gantt.completionRate')}
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
              title={t('gantt.totalCost')}
              value={projectAnalysis.summary.totalCost}
              prefix={<DollarCircleOutlined />}
              formatter={(value) => formatCurrency(value as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('gantt.durationDays')}
              value={projectAnalysis.summary.totalDurationDays}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Controles de visualização */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>{t('gantt.viewSettings')}</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>{t('gantt.levelsToShow')}</Text>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder={t('gantt.selectLevels')}
                value={viewOptions.showLevels}
                onChange={handleLevelChange}
              >
                <Option value={1}>
                  <Tag color={getLevelColor(1)}>{t('gantt.level1Project')}</Tag>
                </Option>
                <Option value={2}>
                  <Tag color={getLevelColor(2)}>{t('gantt.level2Phase')}</Tag>
                </Option>
                <Option value={3}>
                  <Tag color={getLevelColor(3)}>{t('gantt.level3Activity')}</Tag>
                </Option>
                <Option value={4}>
                  <Tag color={getLevelColor(4)}>{t('gantt.level4SubActivity')}</Tag>
                </Option>
              </Select>
            </Space>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>{t('gantt.viewMode')}</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedView}
                onChange={(value) => {
                  setSelectedView(value);
                  handleViewOptionsChange('viewMode', value);
                }}
              >
                <Option value={ViewMode.QuarterDay}>{t('gantt.quarterDay')}</Option>
                <Option value={ViewMode.HalfDay}>{t('gantt.halfDay')}</Option>
                <Option value={ViewMode.Day}>{t('gantt.day')}</Option>
                <Option value={ViewMode.Week}>{t('gantt.week')}</Option>
                <Option value={ViewMode.Month}>{t('gantt.month')}</Option>
              </Select>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>{t('gantt.chartHeight')}</Text>
              <Select
                style={{ width: '100%' }}
                value={viewOptions.ganttHeight}
                onChange={(value) => handleViewOptionsChange('ganttHeight', value)}
              >
                <Option value="compact">{t('gantt.heightCompact')}</Option>
                <Option value="standard">{t('gantt.heightStandard')}</Option>
                <Option value="expanded">{t('gantt.heightExpanded')}</Option>
                <Option value="full">{t('gantt.heightFull')}</Option>
              </Select>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical">
              <Text strong>{t('gantt.advancedOptions')}</Text>
              <Space direction="vertical">
                <Tooltip title={t('gantt.criticalPathTooltip')}>
                  <Switch
                    checked={viewOptions.showCriticalPath}
                    onChange={(checked) => handleViewOptionsChange('showCriticalPath', checked)}
                    checkedChildren={t('gantt.criticalPath')}
                    unCheckedChildren={t('gantt.criticalPath')}
                  />
                </Tooltip>
                
                <Tooltip title={t('gantt.groupByLevelTooltip')}>
                  <Switch
                    checked={viewOptions.groupByLevel}
                    onChange={(checked) => handleViewOptionsChange('groupByLevel', checked)}
                    checkedChildren={t('gantt.groupByLevel')}
                    unCheckedChildren={t('gantt.groupByLevel')}
                  />
                </Tooltip>
                
                <Tooltip title={t('gantt.showCostsTooltip')}>
                  <Switch
                    checked={viewOptions.showCosts}
                    onChange={(checked) => handleViewOptionsChange('showCosts', checked)}
                    checkedChildren={t('gantt.showCosts')}
                    unCheckedChildren={t('gantt.showCosts')}
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
          message={t('gantt.systemRecommendations')}
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
            {t('gantt.criticalPath')}
          </Title>
          <Text type="secondary">
            {t('gantt.criticalPathDescription')}
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
        <div style={{ height: getContainerHeight(viewOptions.ganttHeight), overflowX: 'auto' }}>
          {tasks.length > 0 ? (
            <Gantt
              tasks={tasks}
              viewMode={selectedView}
              locale={getGanttLocale()}
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
              ganttHeight={getGanttHeight(viewOptions.ganttHeight)}
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
                    <div>{t('gantt.startDate')} {task.start.toLocaleDateString(getGanttLocale())}</div>
                    <div>{t('gantt.endDate')} {task.end.toLocaleDateString(getGanttLocale())}</div>
                    <div>{t('gantt.progress')} {task.progress}%</div>
                    {ganttTasks.find(t => t.id === task.id)?.responsible && (
                      <div>{t('gantt.responsible')} {ganttTasks.find(t => t.id === task.id)?.responsible}</div>
                    )}
                    {viewOptions.showCosts && (
                      <div>
                        {t('gantt.cost')} {formatCurrency(ganttTasks.find(t => t.id === task.id)?.cost || 0)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          ) : (
            <div style={{ 
              height: getContainerHeight(viewOptions.ganttHeight), 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999'
            }}>
              <Space direction="vertical" align="center">
                <BarChartOutlined style={{ fontSize: '48px' }} />
                <Text type="secondary">{t('gantt.noTasksFound')}</Text>
              </Space>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GanttChart; 