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