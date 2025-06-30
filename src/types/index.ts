export interface TreeNode {
  id: string;
  name: string;
  cost: number;
  level: 1 | 2 | 3;
  parentId?: string;
  children: TreeNode[];
  // Agregação automática de custos
  totalCost: number;
  // Metadados adicionais
  description?: string;
  responsible?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
  // Gestão de tempo
  startDate?: Date;
  endDate?: Date;
  durationDays?: number;
  // Dependências para Gantt
  dependencies?: string[]; // IDs dos nós que devem ser concluídos antes
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  rootNode: TreeNode;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportOptions {
  format: 'excel' | 'gantt' | 'json';
  includeMetadata: boolean;
  includeCostBreakdown: boolean;
}

// Novos tipos para Gantt Chart
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'task' | 'milestone' | 'project';
  project?: string;
  dependencies?: string[];
  level: 1 | 2 | 3;
  cost: number;
  totalCost: number;
  responsible?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
  styles?: {
    backgroundColor?: string;
    backgroundSelectedColor?: string;
    progressColor?: string;
    progressSelectedColor?: string;
  };
}

export interface GanttViewOptions {
  showLevels: (1 | 2 | 3)[];
  showCriticalPath: boolean;
  groupByLevel: boolean;
  showCosts: boolean;
  showProgress: boolean;
  viewMode: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month';
}

export interface GanttDependency {
  from: string;
  to: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
}

// Tipos para Gestão de Riscos
export interface Risk {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'financial' | 'operational' | 'external' | 'strategic';
  probability: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  impact: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  riskScore: number; // Calculado automaticamente (probability * impact)
  status: 'identified' | 'assessed' | 'mitigated' | 'closed';
  owner: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  mitigationPlan?: string;
  contingencyPlan?: string;
  actualCost?: number;
  estimatedCost?: number;
  // Vinculação com WBS
  associatedNodeIds?: string[]; // IDs dos nós da WBS relacionados
}

export interface RiskMatrix {
  probability: number;
  impact: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
}

export interface RiskMetrics {
  totalRisks: number;
  risksByStatus: Record<Risk['status'], number>;
  risksByCategory: Record<Risk['category'], number>;
  averageRiskScore: number;
  lowRisks: number;
  mediumRisks: number;
  highRisks: number;
  criticalRisks: number;
  catastrophicRisks: number;
  overdueRisks: number;
  soonDueRisks: number;
}

export interface RiskFilterOptions {
  status?: Risk['status'][];
  category?: Risk['category'][];
  probability?: Risk['probability'][];
  impact?: Risk['impact'][];
  owner?: string;
  associatedNodeId?: string;
}

// Tipos para Figuras de Mérito (Indicadores de Performance)
export interface MeritFigure {
  id: string;
  name: string;
  description: string;
  category: 'cost' | 'time' | 'quality' | 'scope' | 'risk' | 'resource' | 'custom';
  unit: string; // %, $, days, hours, etc.
  targetValue: number;
  currentValue: number;
  baselineValue: number; // Valor inicial/referência
  weight: number; // Peso/importância do indicador (1-10)
  direction: 'increase' | 'decrease' | 'maintain'; // Se queremos aumentar, diminuir ou manter
  status: 'on-track' | 'at-risk' | 'off-track' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  // Vinculação com WBS
  associatedNodeIds?: string[]; // IDs dos nós da WBS relacionados
  // Impacto das fases do projeto
  phaseImpacts?: PhaseImpact[];
}

export interface PhaseImpact {
  nodeId: string;
  nodeName: string;
  // impactPercentage: number; // Obsoleto: agora usamos valorAgregado
  valorAgregado: number; // Valor real que a fase agrega ao indicador
  impactDescription: string;
  impactType: 'positive' | 'negative' | 'neutral';
  weight: number; // Peso da fase neste indicador (1-10)
}

export interface MeritFigureMetrics {
  totalFigures: number;
  figuresByCategory: Record<MeritFigure['category'], number>;
  figuresByStatus: Record<MeritFigure['status'], number>;
  averageProgress: number;
  onTrackFigures: number;
  atRiskFigures: number;
  offTrackFigures: number;
  completedFigures: number;
  topPerformingFigures: MeritFigure[];
  criticalFigures: MeritFigure[];
}

export interface MeritFigureFilterOptions {
  category?: MeritFigure['category'][];
  status?: MeritFigure['status'][];
  associatedNodeId?: string;
  direction?: MeritFigure['direction'][];
}

export interface MeritFigureCalculation {
  figureId: string;
  calculatedValue: number;
  progressPercentage: number;
  variance: number;
  trend: 'improving' | 'declining' | 'stable';
  lastUpdate: Date;
} 