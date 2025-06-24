import { TreeNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const createSampleProject = (): TreeNode => {
  const projectId = uuidv4();
  
  return {
    id: projectId,
    name: 'Project Management',
    cost: 5000,
    level: 1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    status: 'in-progress',
    responsible: 'Gerente de Projeto',
    description: 'Projeto principal de desenvolvimento e gestão',
    children: [
      {
        id: uuidv4(),
        name: '1. Plan and Design',
        cost: 2000,
        level: 2,
        parentId: projectId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        status: 'completed',
        responsible: 'Analista de Sistemas',
        description: 'Fase de planejamento e design do projeto',
        children: [
          {
            id: uuidv4(),
            name: 'A. Scope of Project',
            cost: 3000,
            level: 3,
            parentId: uuidv4(),
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-15'),
            status: 'completed',
            responsible: 'Analista de Negócios',
            description: 'Definição do escopo detalhado do projeto',
            children: [],
            totalCost: 3000
          },
          {
            id: uuidv4(),
            name: 'B. Identify Deliverables',
            cost: 2500,
            level: 3,
            parentId: uuidv4(),
            startDate: new Date('2024-01-16'),
            endDate: new Date('2024-02-15'),
            status: 'completed',
            responsible: 'Product Owner',
            description: 'Identificação e documentação dos entregáveis',
            children: [],
            totalCost: 2500
          },
          {
            id: uuidv4(),
            name: 'C. Work Breakdown',
            cost: 1800,
            level: 3,
            parentId: uuidv4(),
            startDate: new Date('2024-02-16'),
            endDate: new Date('2024-03-15'),
            status: 'completed',
            responsible: 'Arquiteto de Soluções',
            description: 'Decomposição das atividades em tarefas menores',
            children: [],
            totalCost: 1800
          },
          {
            id: uuidv4(),
            name: 'D. Determine Resources',
            cost: 2200,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 2200
          },
          {
            id: uuidv4(),
            name: 'E. Create Timeline',
            cost: 1500,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 1500
          },
          {
            id: uuidv4(),
            name: 'F. Costs/Budget',
            cost: 1200,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 1200
          }
        ],
        totalCost: 14200
      },
      {
        id: uuidv4(),
        name: '2. Execute',
        cost: 1500,
        level: 2,
        parentId: projectId,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-09-30'),
        status: 'in-progress',
        responsible: 'Gerente de Desenvolvimento',
        description: 'Fase de execução e desenvolvimento do projeto',
        children: [
          {
            id: uuidv4(),
            name: 'A. Team Member Reporting',
            cost: 4000,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 4000
          },
          {
            id: uuidv4(),
            name: 'B. Deliverables',
            cost: 3500,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 3500
          },
          {
            id: uuidv4(),
            name: 'C. Monitor Adherence to Timelines/Tasks',
            cost: 2800,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 2800
          }
        ],
        totalCost: 11800
      },
      {
        id: uuidv4(),
        name: '3. Monitor/Control',
        cost: 1000,
        level: 2,
        parentId: projectId,
        children: [
          {
            id: uuidv4(),
            name: 'A. Measure Activity Outcomes',
            cost: 2000,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 2000
          },
          {
            id: uuidv4(),
            name: 'B. Determine Need for Corrective Actions',
            cost: 1800,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 1800
          },
          {
            id: uuidv4(),
            name: 'C. Identify and Implement Changes Needed',
            cost: 2200,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 2200
          }
        ],
        totalCost: 7000
      },
      {
        id: uuidv4(),
        name: '4. Conclude',
        cost: 800,
        level: 2,
        parentId: projectId,
        children: [
          {
            id: uuidv4(),
            name: 'A. Evaluation Plan',
            cost: 1500,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 1500
          },
          {
            id: uuidv4(),
            name: 'B. Disseminate',
            cost: 1200,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 1200
          }
        ],
        totalCost: 3500
      }
    ],
    totalCost: 41500
  };
}; 