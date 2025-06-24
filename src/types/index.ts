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
  startDate?: Date;
  endDate?: Date;
  responsible?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
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