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