import { TreeNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const createSampleProject = (): TreeNode => {
  // Pre-generate IDs for dependencies
  const projectId = uuidv4();
  const planPhaseId = uuidv4();
  const executePhaseId = uuidv4();
  const monitorPhaseId = uuidv4();
  const concludePhaseId = uuidv4();
  
  // Plan phase task IDs
  const scopeTaskId = uuidv4();
  const deliverablesTaskId = uuidv4();
  const wbsTaskId = uuidv4();
  const resourcesTaskId = uuidv4();
  const timelineTaskId = uuidv4();
  const budgetTaskId = uuidv4();
  
  // Execute phase task IDs
  const reportingTaskId = uuidv4();
  const executeDeliverablesTaskId = uuidv4();
  const monitorTasksTaskId = uuidv4();
  
  // Monitor phase task IDs
  const measureTaskId = uuidv4();
  const correctiveTaskId = uuidv4();
  const changesTaskId = uuidv4();
  
  // Conclude phase task IDs
  const evaluationTaskId = uuidv4();
  const disseminateTaskId = uuidv4();
  
  return {
    id: projectId,
    name: 'Project Management System',
    cost: 5000,
    level: 1,
    description: 'Sistema completo de gerenciamento de projetos',
    responsible: 'João Silva',
    status: 'in-progress',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    durationDays: 180,
    dependencies: [],
    children: [
      {
        id: planPhaseId,
        name: '1. Planejamento e Design',
        cost: 2000,
        level: 2,
        parentId: projectId,
        description: 'Fase de planejamento detalhado do projeto',
        responsible: 'Maria Santos',
        status: 'completed',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-15'),
        durationDays: 45,
        dependencies: [],
        children: [
          {
            id: scopeTaskId,
            name: 'A. Definição do Escopo',
            cost: 3000,
            level: 3,
            parentId: planPhaseId,
            description: 'Levantamento e definição completa do escopo do projeto',
            responsible: 'Ana Costa',
            status: 'completed',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-07'),
            durationDays: 7,
            dependencies: [],
            children: [],
            totalCost: 3000
          },
          {
            id: deliverablesTaskId,
            name: 'B. Identificação de Entregas',
            cost: 2500,
            level: 3,
            parentId: planPhaseId,
            description: 'Mapeamento de todos os entregáveis do projeto',
            responsible: 'Carlos Lima',
            status: 'completed',
            startDate: new Date('2024-01-08'),
            endDate: new Date('2024-01-15'),
            durationDays: 8,
            dependencies: [scopeTaskId],
            children: [],
            totalCost: 2500
          },
          {
            id: wbsTaskId,
            name: 'C. Estrutura Analítica',
            cost: 1800,
            level: 3,
            parentId: planPhaseId,
            description: 'Criação da estrutura analítica do projeto (WBS)',
            responsible: 'Pedro Reis',
            status: 'completed',
            startDate: new Date('2024-01-16'),
            endDate: new Date('2024-01-22'),
            durationDays: 7,
            dependencies: [deliverablesTaskId],
            children: [],
            totalCost: 1800
          },
          {
            id: resourcesTaskId,
            name: 'D. Definição de Recursos',
            cost: 2200,
            level: 3,
            parentId: planPhaseId,
            description: 'Identificação e alocação de recursos necessários',
            responsible: 'Amanda Souza',
            status: 'completed',
            startDate: new Date('2024-01-23'),
            endDate: new Date('2024-01-30'),
            durationDays: 8,
            dependencies: [wbsTaskId],
            children: [],
            totalCost: 2200
          },
          {
            id: timelineTaskId,
            name: 'E. Cronograma',
            cost: 1500,
            level: 3,
            parentId: planPhaseId,
            description: 'Elaboração do cronograma detalhado',
            responsible: 'Lucas Ferreira',
            status: 'completed',
            startDate: new Date('2024-01-31'),
            endDate: new Date('2024-02-07'),
            durationDays: 8,
            dependencies: [resourcesTaskId],
            children: [],
            totalCost: 1500
          },
          {
            id: budgetTaskId,
            name: 'F. Orçamento',
            cost: 1200,
            level: 3,
            parentId: planPhaseId,
            description: 'Definição do orçamento completo do projeto',
            responsible: 'Roberto Alves',
            status: 'completed',
            startDate: new Date('2024-02-08'),
            endDate: new Date('2024-02-15'),
            durationDays: 8,
            dependencies: [timelineTaskId],
            children: [],
            totalCost: 1200
          }
        ],
        totalCost: 14200
      },
      {
        id: executePhaseId,
        name: '2. Execução',
        cost: 1500,
        level: 2,
        parentId: projectId,
        description: 'Fase de execução das atividades planejadas',
        responsible: 'João Silva',
        status: 'in-progress',
        startDate: new Date('2024-02-16'),
        endDate: new Date('2024-04-30'),
        durationDays: 74,
        dependencies: [planPhaseId],
        children: [
          {
            id: reportingTaskId,
            name: 'A. Relatórios da Equipe',
            cost: 4000,
            level: 3,
            parentId: executePhaseId,
            description: 'Sistema de relatórios e acompanhamento da equipe',
            responsible: 'Fernanda Lima',
            status: 'in-progress',
            startDate: new Date('2024-02-16'),
            endDate: new Date('2024-03-15'),
            durationDays: 28,
            dependencies: [budgetTaskId],
            children: [],
            totalCost: 4000
          },
          {
            id: executeDeliverablesTaskId,
            name: 'B. Entregáveis',
            cost: 3500,
            level: 3,
            parentId: executePhaseId,
            description: 'Desenvolvimento dos entregáveis definidos',
            responsible: 'Bruno Costa',
            status: 'not-started',
            startDate: new Date('2024-03-01'),
            endDate: new Date('2024-04-15'),
            durationDays: 46,
            dependencies: [reportingTaskId],
            children: [],
            totalCost: 3500
          },
          {
            id: monitorTasksTaskId,
            name: 'C. Monitoramento de Tarefas',
            cost: 2800,
            level: 3,
            parentId: executePhaseId,
            description: 'Acompanhamento da aderência aos prazos e tarefas',
            responsible: 'Carla Mendes',
            status: 'not-started',
            startDate: new Date('2024-03-16'),
            endDate: new Date('2024-04-30'),
            durationDays: 46,
            dependencies: [reportingTaskId],
            children: [],
            totalCost: 2800
          }
        ],
        totalCost: 11800
      },
      {
        id: monitorPhaseId,
        name: '3. Monitoramento e Controle',
        cost: 1000,
        level: 2,
        parentId: projectId,
        description: 'Fase de monitoramento e controle do projeto',
        responsible: 'Maria Santos',
        status: 'not-started',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-31'),
        durationDays: 92,
        dependencies: [executePhaseId],
        children: [
          {
            id: measureTaskId,
            name: 'A. Medição de Resultados',
            cost: 2000,
            level: 3,
            parentId: monitorPhaseId,
            description: 'Medição e análise dos resultados das atividades',
            responsible: 'Ana Costa',
            status: 'not-started',
            startDate: new Date('2024-03-01'),
            endDate: new Date('2024-04-01'),
            durationDays: 31,
            dependencies: [executeDeliverablesTaskId],
            children: [],
            totalCost: 2000
          },
          {
            id: correctiveTaskId,
            name: 'B. Ações Corretivas',
            cost: 1800,
            level: 3,
            parentId: monitorPhaseId,
            description: 'Identificação da necessidade de ações corretivas',
            responsible: 'Carlos Lima',
            status: 'not-started',
            startDate: new Date('2024-04-02'),
            endDate: new Date('2024-04-30'),
            durationDays: 29,
            dependencies: [measureTaskId],
            children: [],
            totalCost: 1800
          },
          {
            id: changesTaskId,
            name: 'C. Implementação de Mudanças',
            cost: 2200,
            level: 3,
            parentId: monitorPhaseId,
            description: 'Identificação e implementação de mudanças necessárias',
            responsible: 'Pedro Reis',
            status: 'not-started',
            startDate: new Date('2024-05-01'),
            endDate: new Date('2024-05-31'),
            durationDays: 31,
            dependencies: [correctiveTaskId],
            children: [],
            totalCost: 2200
          }
        ],
        totalCost: 7000
      },
      {
        id: concludePhaseId,
        name: '4. Conclusão',
        cost: 800,
        level: 2,
        parentId: projectId,
        description: 'Fase de conclusão e encerramento do projeto',
        responsible: 'João Silva',
        status: 'not-started',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        durationDays: 30,
        dependencies: [monitorPhaseId],
        children: [
          {
            id: evaluationTaskId,
            name: 'A. Plano de Avaliação',
            cost: 1500,
            level: 3,
            parentId: concludePhaseId,
            description: 'Elaboração do plano de avaliação final',
            responsible: 'Amanda Souza',
            status: 'not-started',
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-15'),
            durationDays: 15,
            dependencies: [changesTaskId],
            children: [],
            totalCost: 1500
          },
          {
            id: disseminateTaskId,
            name: 'B. Disseminação',
            cost: 1200,
            level: 3,
            parentId: concludePhaseId,
            description: 'Disseminação dos resultados e lições aprendidas',
            responsible: 'Lucas Ferreira',
            status: 'not-started',
            startDate: new Date('2024-06-16'),
            endDate: new Date('2024-06-30'),
            durationDays: 15,
            dependencies: [evaluationTaskId],
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