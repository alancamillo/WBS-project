import React, { useMemo, useState } from 'react';
import { Card, Collapse, List, Tag, Typography, Empty, Button, Space, Row, Col, Progress, Statistic, Badge, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { TreeNode as TreeNodeType } from '../types';

import { ExpandOutlined, CompressOutlined, ExperimentOutlined, InfoCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

// Removed Panel destructuring - using items format now
const { Text } = Typography;

interface TrlViewProps {
  rootNode: TreeNodeType;
}

const TRL_COLORS = [
  '#722ed1', // TRL-1 - Roxo (Pesquisa Básica)
  '#9254de', // TRL-2 - Roxo claro
  '#b37feb', // TRL-3 - Roxo muito claro
  '#1890ff', // TRL-4 - Azul (Desenvolvimento)
  '#40a9ff', // TRL-5 - Azul claro
  '#52c41a', // TRL-6 - Verde (Prototipagem)
  '#73d13d', // TRL-7 - Verde claro
  '#faad14', // TRL-8 - Amarelo (Validação)
  '#f5222d'  // TRL-9 - Vermelho (Implementação)
];

const TrlView: React.FC<TrlViewProps> = ({ rootNode }) => {
  const { t } = useTranslation();
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const trlGroupedPhases = useMemo(() => {
    const phases = rootNode.children.filter(node => node.level === 2);
    
    const grouped: { [key: number]: TreeNodeType[] } = {};
    for (let i = 1; i <= 9; i++) {
      grouped[i] = [];
    }

    phases.forEach(phase => {
      if (phase.trl && phase.trl >= 1 && phase.trl <= 9) {
        grouped[phase.trl].push(phase);
      } else {
        // Handle phases without a TRL or invalid TRL
        if (!grouped[0]) grouped[0] = []; // Use 0 for undefined/invalid TRLs
        grouped[0].push(phase);
      }
    });

    return grouped;
  }, [rootNode]);

  const hasPhases = useMemo(() => {
    return Object.values(trlGroupedPhases).some(list => list.length > 0);
  }, [trlGroupedPhases]);

  // Calcular estatísticas
  const statistics = useMemo(() => {
    const phases = rootNode.children.filter(node => node.level === 2);
    const totalPhases = phases.length;
    const phasesWithTrl = phases.filter(p => p.trl && p.trl >= 1 && p.trl <= 9).length;
    const phasesWithoutTrl = totalPhases - phasesWithTrl;
    
    // TRL médio ponderado
    const trlSum = phases.reduce((sum, phase) => {
      return sum + (phase.trl && phase.trl >= 1 && phase.trl <= 9 ? phase.trl : 0);
    }, 0);
    const averageTrl = phasesWithTrl > 0 ? trlSum / phasesWithTrl : 0;
    
    // Fases concluídas vs pendentes
    const completedPhases = phases.filter(p => p.status === 'completed').length;
    const inProgressPhases = phases.filter(p => p.status === 'in-progress').length;
    
    return {
      totalPhases,
      phasesWithTrl,
      phasesWithoutTrl,
      averageTrl,
      completedPhases,
      inProgressPhases,
      completionRate: totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0
    };
  }, [rootNode]);

  const handleToggleExpandCollapse = () => {
    const allKeys = Object.keys(trlGroupedPhases).filter(key => trlGroupedPhases[parseInt(key)].length > 0);
    if (activeKeys.length === 0) {
      setActiveKeys(allKeys);
    } else {
      setActiveKeys([]);
    }
  };

  const isAllExpanded = activeKeys.length > 0 && activeKeys.length === Object.keys(trlGroupedPhases).filter(key => trlGroupedPhases[parseInt(key)].length > 0).length;

  return (
    <div style={{ margin: 16 }}>
      {/* Header com estatísticas */}
      <Card 
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#1890ff' }} />
            {t('trlView.title')}
          </Space>
        }
        extra={
          <Button 
            onClick={handleToggleExpandCollapse}
            icon={isAllExpanded ? <CompressOutlined /> : <ExpandOutlined />}
          >
            {isAllExpanded ? t('trlView.collapseAll') : t('trlView.expandAll')}
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {/* Estatísticas Gerais */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Statistic
              title={t('trlView.statistics.totalPhases')}
              value={statistics.totalPhases}
              prefix={<ExperimentOutlined />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title={t('trlView.statistics.phasesWithTrl')}
              value={statistics.phasesWithTrl}
              suffix={`/ ${statistics.totalPhases}`}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title={t('trlView.statistics.averageTrl')}
              value={statistics.averageTrl}
              precision={1}
              prefix={<InfoCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <div>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">{t('trlView.statistics.completionRate')}</Text>
              </div>
              <Progress 
                percent={statistics.completionRate} 
                size="small"
                format={(percent) => `${Math.round(percent || 0)}%`}
              />
            </div>
          </Col>
        </Row>

        {statistics.phasesWithoutTrl > 0 && (
          <Row style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Card 
                size="small" 
                style={{ 
                  border: '1px dashed #faad14',
                  backgroundColor: '#fffbe6'
                }}
              >
                                 <Space>
                   <ClockCircleOutlined style={{ color: '#faad14' }} />
                   <Text>
                     <strong>{statistics.phasesWithoutTrl}</strong> {t('trlView.statistics.phasesWithoutTrl')}
                   </Text>
                 </Space>
              </Card>
            </Col>
          </Row>
        )}
      </Card>

      {/* Visualização TRL */}
      {!hasPhases ? (
        <Card>
          <Empty
            description={t('trlView.noPhasesFound')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {Object.keys(trlGroupedPhases).sort((a, b) => parseInt(a) - parseInt(b)).map(trlKey => {
            const trl = parseInt(trlKey);
            const phasesInTrl = trlGroupedPhases[trl];
            
            // Pular TRLs vazios no modo compacto
            if (phasesInTrl.length === 0) return null;

            const headerText = trl === 0 
              ? t('trlView.undefinedTrl') 
              : `TRL-${trl}`;

            const headerColor = trl > 0 && trl <= TRL_COLORS.length 
              ? TRL_COLORS[trl - 1] 
              : '#d9d9d9';
            
            // Usar traduções para informações TRL
            const trlTitle = trl > 0 && trl <= 9 ? t(`trlView.info.level${trl}.title`) : null;
            const trlDescription = trl > 0 && trl <= 9 ? t(`trlView.info.level${trl}.description`) : null;

            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={trl}>
                <Card
                  size="small"
                  style={{ 
                    borderColor: headerColor,
                    borderWidth: 2,
                    height: '100%'
                  }}
                  bodyStyle={{ padding: 0 }}
                >
                  {/* Header colorido */}
                  <div 
                    style={{ 
                      backgroundColor: headerColor,
                      padding: '12px 16px',
                      color: 'white'
                    }}
                  >
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong style={{ color: 'white', fontSize: '16px' }}>
                          {headerText}
                        </Text>
                      </Col>
                      <Col>
                        <Badge 
                          count={phasesInTrl.length} 
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.5)'
                          }} 
                        />
                      </Col>
                    </Row>
                    {trlTitle && (
                      <div style={{ marginTop: 4 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>
                          {trlTitle}
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div style={{ padding: '12px 16px' }}>
                    {trlDescription && (
                      <Tooltip title={trlDescription}>
                        <Text 
                          type="secondary" 
                          style={{ 
                            fontSize: '11px',
                            display: 'block',
                            marginBottom: 8,
                            lineHeight: '1.3'
                          }}
                        >
                          {trlDescription.length > 50 
                            ? `${trlDescription.substring(0, 50)}...`
                            : trlDescription
                          }
                        </Text>
                      </Tooltip>
                    )}
                    
                    <Collapse 
                      ghost 
                      size="small"
                      activeKey={activeKeys.includes(trl.toString()) ? ['phases'] : []}
                      onChange={(keys) => {
                        if (keys.length > 0) {
                          setActiveKeys([...activeKeys, trl.toString()]);
                        } else {
                          setActiveKeys(activeKeys.filter(k => k !== trl.toString()));
                        }
                      }}
                      items={[
                        {
                          key: 'phases',
                          label: (
                            <Text style={{ fontSize: '12px' }}>
                              {t('trlView.viewPhases', { count: phasesInTrl.length })}
                            </Text>
                          ),
                          style: { border: 'none' },
                          children: (
                            <List
                              size="small"
                              dataSource={phasesInTrl}
                              renderItem={phase => (
                                <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                                  <div style={{ width: '100%' }}>
                                    <div style={{ marginBottom: 4 }}>
                                      <Text strong style={{ fontSize: '12px' }}>
                                        {phase.name}
                                      </Text>
                                    </div>
                                    <Space size="small" wrap>
                                      {phase.responsible && (
                                        <Tag color="blue" style={{ fontSize: '11px' }}>
                                          {phase.responsible}
                                        </Tag>
                                      )}
                                      <Tag 
                                        color={
                                          phase.status === 'completed' ? 'green' :
                                          phase.status === 'in-progress' ? 'orange' : 'default'
                                        }
                                        style={{ fontSize: '11px' }}
                                      >
                                        {t(`status.${phase.status || 'not-started'}`)}
                                      </Tag>
                                    </Space>
                                  </div>
                                </List.Item>
                              )}
                            />
                          )
                        }
                      ]}
                    />
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default TrlView;