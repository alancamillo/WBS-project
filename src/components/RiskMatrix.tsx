import React from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Risk } from '../types';
import './RiskMatrix.css';

const { Title } = Typography;

interface RiskMatrixProps {
  risks: Risk[];
  matrixRef?: React.RefObject<HTMLDivElement>;
}

const RiskMatrix: React.FC<RiskMatrixProps> = ({ risks, matrixRef }) => {
  const { t } = useTranslation();

  // Função para obter cor baseada no score específico (1-12)
  const getMatrixColor = (score: number): string => {
    // Cores específicas para cada score
    const scoreColors: Record<number, string> = {
      1: '#4682A9',
      2: '#749BC2',
      3: '#91C8E4',
      4: '#06923E',
      5: '#A7C1A8',
      6: '#FFB200',
      7: '#FFB200',
      8: '#C83F12',
      9: '#C83F12',
      10: '#8A0000',
      11: '#3B060A',
      12: '#3B060A'
    };
    
    return scoreColors[score] || '#4682A9'; // Default para score 1
  };

  // Função para obter cor do texto baseada no background específico
  const getTextColor = (score: number): string => {
    // Texto branco para backgrounds escuros, texto escuro para backgrounds claros
    const darkBackgrounds = [1, 4, 8, 9, 10, 11, 12]; // Cores escuras que precisam texto branco
    return darkBackgrounds.includes(score) ? '#ffffff' : '#333333';
  };

  // Matriz de mapeamento 5x5 para scores 1-12 (mesma do RiskManagement)
  const scoreMatrix: Record<number, Record<number, number>> = {
    1: { 1: 1, 2: 1, 3: 2, 4: 3, 5: 5 },    // Muito Baixa
    2: { 1: 1, 2: 2, 3: 3, 4: 5, 5: 8 },    // Baixa
    3: { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10 },   // Média
    4: { 1: 2, 2: 3, 3: 5, 4: 8, 5: 11 },   // Alta
    5: { 1: 2, 2: 3, 3: 6, 4: 9, 5: 12 }    // Muito Alta
  };

  // Função para converter texto para número
  const getProbabilityValue = (probability: Risk['probability']): number => {
    const mapping = {
      'very-low': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'very-high': 5
    };
    return mapping[probability] || 1;
  };

  const getImpactValue = (impact: Risk['impact']): number => {
    const mapping = {
      'very-low': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'very-high': 5
    };
    return mapping[impact] || 1;
  };

  // Criar matriz 5x5 com scores mapeados
  const matrix = [];
  for (let probability = 5; probability >= 1; probability--) {
    const row = [];
    for (let impact = 1; impact <= 5; impact++) {
      const score = scoreMatrix[probability][impact];
      
      // Filtrar riscos pelos valores originais de probabilidade e impacto
      const cellRisks = risks.filter(risk => {
        const riskProbValue = getProbabilityValue(risk.probability);
        const riskImpactValue = getImpactValue(risk.impact);
        return riskProbValue === probability && riskImpactValue === impact;
      });
      
      row.push({
        probability,
        impact,
        score,
        color: getMatrixColor(score),
        riskCount: cellRisks.length,
        risks: cellRisks
      });
    }
    matrix.push(row);
  }

  const probabilityLabels = [
    t('riskMatrix.probabilityLabels.veryHigh'),
    t('riskMatrix.probabilityLabels.high'),
    t('riskMatrix.probabilityLabels.medium'),
    t('riskMatrix.probabilityLabels.low'),
    t('riskMatrix.probabilityLabels.veryLow')
  ];

  const impactLabels = [
    t('riskMatrix.impactLabels.veryLow'),
    t('riskMatrix.impactLabels.low'),
    t('riskMatrix.impactLabels.medium'),
    t('riskMatrix.impactLabels.high'),
    t('riskMatrix.impactLabels.veryHigh')
  ];

  return (
    <div className="risk-matrix-wrapper" ref={matrixRef}>
      <div className="matrix-title-container">
        <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
          {t('riskMatrix.title')}
        </Title>
      </div>
      
      <div className="matrix-with-labels">
        {/* Label vertical da Probabilidade */}
        <div className="probability-axis">
          <div className="axis-title vertical">{t('riskMatrix.probability')}</div>
        </div>

        {/* Matriz principal */}
        <div className="matrix-content">
          {/* Cabeçalho do Impacto */}
          <div className="impact-header-row">
            <div className="corner-cell"></div>
            {impactLabels.map((label, index) => (
              <div key={index} className="impact-header-cell">
                {label}
              </div>
            ))}
          </div>

          {/* Linhas da matriz */}
          {matrix.map((row, probIndex) => (
            <div key={probIndex} className="matrix-data-row">
              {/* Label da Probabilidade */}
              <div className="probability-cell">
                {probabilityLabels[probIndex]}
              </div>
              
              {/* Células de dados */}
              {row.map((cell, impIndex) => (
                <div
                  key={impIndex}
                  className="data-cell"
                  style={{ backgroundColor: cell.color }}
                  title={`${t('riskMatrix.tooltip.score')} ${cell.score} | ${t('riskMatrix.tooltip.risks')} ${cell.riskCount}`}
                >
                  <div 
                    className="score-number" 
                    style={{ color: getTextColor(cell.score) }}
                  >
                    {cell.score}
                  </div>
                  {cell.riskCount > 0 && (
                    <div className="risk-count-badge">{cell.riskCount}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Label horizontal do Impacto */}
      <div className="impact-axis">
        <div className="axis-title horizontal">{t('riskMatrix.impact')}</div>
      </div>

      {/* Legenda */}
      <div className="matrix-legend">
        <div className="legend-row">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#4682A9' }}></div>
            <span>{t('riskMatrix.legend.score')} 1</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#749BC2' }}></div>
            <span>{t('riskMatrix.legend.score')} 2</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#91C8E4' }}></div>
            <span>{t('riskMatrix.legend.score')} 3</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#06923E' }}></div>
            <span>{t('riskMatrix.legend.score')} 4</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#A7C1A8' }}></div>
            <span>{t('riskMatrix.legend.score')} 5</span>
          </div>
        </div>
        <div className="legend-row">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FFB200' }}></div>
            <span>{t('riskMatrix.legend.scoreRange', { range: '6-7' })}</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#C83F12' }}></div>
            <span>{t('riskMatrix.legend.scoreRange', { range: '8-9' })}</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#8A0000' }}></div>
            <span>{t('riskMatrix.legend.score')} 10</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#3B060A' }}></div>
            <span>{t('riskMatrix.legend.scoreRange', { range: '11-12' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMatrix; 