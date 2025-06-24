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
  durationDays?: number; // Duração em dias
  // Dependências
  dependencies?: string[]; // IDs dos nós que devem ser concluídos antes desta atividade
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