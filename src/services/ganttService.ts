import { TreeNode, GanttTask, GanttViewOptions, GanttDependency } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class GanttService {
  /**
   * Converte árvore WBS para tarefas Gantt
   */
  static convertTreeToGanttTasks(
    rootNode: TreeNode, 
    options: GanttViewOptions
  ): GanttTask[] {
    const tasks: GanttTask[] = [];
    const taskMap = new Map<string, GanttTask>();

    // Primeira passagem: cria todas as tarefas
    const traverse = (node: TreeNode, parentId?: string) => {
      // Filtra por níveis selecionados
      if (!options.showLevels.includes(node.level)) {
        // Se não está no nível selecionado, continua com os filhos
        node.children.forEach(child => traverse(child, parentId));
        return;
      }

      const task: GanttTask = {
        id: node.id,
        name: node.name,
        start: this.getNodeStartDate(node, rootNode),
        end: this.getNodeEndDate(node, rootNode),
        progress: this.calculateProgress(node),
        type: this.getTaskType(node),
        project: parentId,
        dependencies: node.dependencies || [],
        level: node.level,
        cost: node.cost,
        totalCost: node.totalCost,
        responsible: node.responsible,
        status: node.status,
        styles: this.getTaskStyles(node.level, node.status)
      };

      tasks.push(task);
      taskMap.set(node.id, task);

      // Processa filhos
      node.children.forEach(child => 
        traverse(child, node.id)
      );
    };

    traverse(rootNode);

    // Segunda passagem: adiciona dependências automáticas baseadas em hierarquia
    this.addHierarchicalDependencies(tasks, rootNode, options);

    // Calcula caminho crítico se solicitado
    if (options.showCriticalPath) {
      this.calculateCriticalPath(tasks);
    }

    return tasks;
  }

  /**
   * Obtém data de início do nó, priorizando herança para nós com filhos
   */
  private static getNodeStartDate(node: TreeNode, rootNode: TreeNode): Date {
    // Prioritize the node's own startDate if it exists
    if (node.startDate) {
      return node.startDate;
    }

    // If node has children and no explicit startDate, calculate inherited start from children
    if (node.children.length > 0 && node.level >= 2) {
      const inheritedStart = this.calculateInheritedStartDate(node, rootNode);
      if (inheritedStart) {
        return inheritedStart;
      }
    }
    
    // Fallback: calculate a default start date
    return this.calculateStartDate(node, rootNode);
  }

  /**
   * Obtém data de fim do nó, priorizando herança para nós com filhos
   */
  private static getNodeEndDate(node: TreeNode, rootNode: TreeNode): Date {
    // Prioritize the node's own endDate if it exists
    if (node.endDate) {
      return node.endDate;
    }

    // If node has children and no explicit endDate, calculate inherited end from children
    if (node.children.length > 0 && node.level >= 2) {
      const inheritedEnd = this.calculateInheritedEndDate(node, rootNode);
      if (inheritedEnd) {
        return inheritedEnd;
      }
    }
    
    // Fallback: calculate a default end date
    return this.calculateEndDate(node, rootNode);
  }

  /**
   * Calcula data de início herdada dos filhos
   */
  private static calculateInheritedStartDate(node: TreeNode, rootNode: TreeNode): Date | null {
    if (node.children.length === 0) return null;
    
    const childrenStartDates = node.children
      .map(child => this.getNodeStartDate(child, rootNode))
      .filter(date => date);
    
    if (childrenStartDates.length === 0) return null;
    
    return new Date(Math.min(...childrenStartDates.map(d => d.getTime())));
  }

  /**
   * Calcula data de fim herdada dos filhos
   */
  private static calculateInheritedEndDate(node: TreeNode, rootNode: TreeNode): Date | null {
    if (node.children.length === 0) return null;
    
    const childrenEndDates = node.children
      .map(child => this.getNodeEndDate(child, rootNode))
      .filter(date => date);
    
    if (childrenEndDates.length === 0) return null;
    
    return new Date(Math.max(...childrenEndDates.map(d => d.getTime())));
  }

  /**
   * Calcula data de início padrão quando não há herança ou dados
   */
  private static calculateStartDate(node: TreeNode, rootNode: TreeNode): Date {
    if (node.startDate) return node.startDate;

    // Se é nó raiz, usa data atual
    if (node.level === 1) {
      return new Date();
    }

    // Busca o parent para calcular data baseada na hierarquia
    const parent = this.findNodeById(rootNode, node.parentId || '');
    if (parent?.startDate) {
      return parent.startDate;
    }

    return new Date();
  }

  /**
   * Calcula data de fim padrão baseada na duração estimada
   */
  private static calculateEndDate(node: TreeNode, rootNode: TreeNode): Date {
    if (node.endDate) return node.endDate;

    const startDate = this.calculateStartDate(node, rootNode);
    const durationDays = this.estimateDuration(node);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    
    return endDate;
  }

  /**
   * Estima duração baseada no custo e complexidade
   */
  private static estimateDuration(node: TreeNode): number {
    // Algoritmo simples: 1 dia por R$ 1000 de custo
    // Mínimo 1 dia, máximo 90 dias por tarefa
    const baseDays = Math.max(1, Math.floor(node.cost / 1000));
    
    // Ajusta baseado no nível
    switch (node.level) {
      case 1: return Math.min(365, baseDays * 3); // Projetos podem durar até 1 ano
      case 2: return Math.min(90, baseDays * 2);  // Fases até 3 meses
      case 3: return Math.min(30, baseDays);      // Atividades até 1 mês
      case 4: return Math.min(15, baseDays);      // Sub-atividades até 2 semanas
      default: return baseDays;
    }
  }

  /**
   * Calcula progresso baseado no status
   */
  private static calculateProgress(node: TreeNode): number {
    switch (node.status) {
      case 'completed': return 100;
      case 'in-progress': return 50;
      case 'not-started': 
      default: return 0;
    }
  }

  /**
   * Determina o tipo de tarefa baseado na estrutura
   */
  private static getTaskType(node: TreeNode): 'task' | 'milestone' | 'project' {
    if (node.level === 1) return 'project';
    // All other nodes are considered 'task' type to allow duration,
    // even if they have children (which will inherit dates from children)
    return 'task';
  }

  /**
   * Define estilos baseados no nível e status
   */
  private static getTaskStyles(level: number, status?: string) {
    const levelColors = {
      1: { bg: '#1890ff', selected: '#096dd9', progress: '#40a9ff', progressSelected: '#1890ff' },
      2: { bg: '#52c41a', selected: '#389e0d', progress: '#73d13d', progressSelected: '#52c41a' },
      3: { bg: '#faad14', selected: '#d48806', progress: '#ffc53d', progressSelected: '#faad14' },
      4: { bg: '#f759ab', selected: '#c41d7f', progress: '#ff85c0', progressSelected: '#f759ab' }
    };

    const colors = levelColors[level as keyof typeof levelColors] || levelColors[4];
    
    // Ajusta opacidade baseado no status
    const opacity = status === 'completed' ? '0.7' : '1';

    return {
      backgroundColor: colors.bg + (opacity === '0.7' ? 'B3' : ''),
      backgroundSelectedColor: colors.selected,
      progressColor: colors.progress,
      progressSelectedColor: colors.progressSelected
    };
  }

  /**
   * Adiciona dependências automáticas baseadas na hierarquia
   */
  private static addHierarchicalDependencies(
    tasks: GanttTask[], 
    rootNode: TreeNode, 
    options: GanttViewOptions
  ): void {
    // COMENTADO: Esta lógica estava forçando sequência automática e sobrescrevendo datas herdadas
    // Apenas adiciona dependências explícitas do WBS, não força sequências automáticas
    
    // Adiciona apenas dependências explicitamente definidas no WBS
    tasks.forEach(task => {
      const sourceNode = this.findNodeById(rootNode, task.id);
      if (sourceNode?.dependencies) {
        task.dependencies = [...(sourceNode.dependencies || [])];
      }
    });
    
    // REMOVIDO: lógica que forçava dependências sequenciais entre irmãos
    // pois estava sobrescrevendo as datas originais/herdadas calculadas
  }

  /**
   * Calcula e marca o caminho crítico
   */
  private static calculateCriticalPath(tasks: GanttTask[]): void {
    // Implementação simplificada do algoritmo CPM
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    // Calcula early start e early finish (para análise, não para modificar datas)
    // As datas de início e fim das tarefas já devem ter sido definidas pela herança ou valores explícitos.

    // Marca tarefas críticas (implementação simplificada)
    tasks.forEach(task => {
      const isOnCriticalPath = this.isOnCriticalPath(task, taskMap);
      if (isOnCriticalPath && task.styles) {
        task.styles.backgroundColor = '#ff4d4f'; // Vermelho para caminho crítico
      }
    });
  }

  /**
   * Calcula early start de uma tarefa
   */
  private static calculateEarlyStart(task: GanttTask, taskMap: Map<string, GanttTask>): number {
    if (!task.dependencies || task.dependencies.length === 0) {
      return task.start.getTime();
    }

    let maxEarlyFinish = task.start.getTime();
    
    task.dependencies.forEach(depId => {
      const depTask = taskMap.get(depId);
      if (depTask) {
        maxEarlyFinish = Math.max(maxEarlyFinish, depTask.end.getTime());
      }
    });

    return maxEarlyFinish;
  }

  /**
   * Verifica se a tarefa está no caminho crítico
   */
  private static isOnCriticalPath(task: GanttTask, taskMap: Map<string, GanttTask>): boolean {
    // Implementação simplificada - considera críticas as tarefas sem folga
    const duration = task.end.getTime() - task.start.getTime();
    const earlyStart = this.calculateEarlyStart(task, taskMap);
    const lateStart = task.start.getTime();
    
    return Math.abs(earlyStart - lateStart) < 86400000; // Menos de 1 dia de folga
  }

  /**
   * Encontra nó por ID na árvore
   */
  private static findNodeById(node: TreeNode, id: string): TreeNode | null {
    if (node.id === id) return node;
    
    for (const child of node.children) {
      const found = this.findNodeById(child, id);
      if (found) return found;
    }
    
    return null;
  }

  /**
   * Exporta dados para diferentes formatos de visualização
   */
  static exportGanttData(tasks: GanttTask[], format: 'json' | 'csv' | 'mpp', t?: (key: string) => string): any {
    switch (format) {
      case 'json':
        return {
          tasks: tasks.map(task => ({
            ...task,
            start: task.start.toISOString(),
            end: task.end.toISOString()
          })),
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };
      
      case 'csv':
        const headers = t ? [
          t('gantt.csvHeaders.id'),
          t('gantt.csvHeaders.name'),
          t('gantt.csvHeaders.start'),
          t('gantt.csvHeaders.end'),
          t('gantt.csvHeaders.durationDays'),
          t('gantt.csvHeaders.progressPercent'),
          t('gantt.csvHeaders.level'),
          t('gantt.csvHeaders.responsible'),
          t('gantt.csvHeaders.status'),
          t('gantt.csvHeaders.dependencies')
        ] : [
          'ID', 'Nome', 'Início', 'Fim', 'Duração (dias)', 
          'Progresso (%)', 'Nível', 'Responsável', 'Status', 'Dependências'
        ];
        
        const rows = tasks.map(task => [
          task.id,
          task.name,
          task.start.toLocaleDateString('pt-BR'),
          task.end.toLocaleDateString('pt-BR'),
          Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24)),
          task.progress,
          task.level,
          task.responsible || '',
          task.status || '',
          task.dependencies?.join(';') || ''
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      default:
        return tasks;
    }
  }

  /**
   * Gera relatório de análise do projeto
   */
  static generateProjectAnalysis(tasks: GanttTask[], t?: (key: string) => string): any {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'not-started').length;

    const projectTask = tasks.find(t => t.level === 1);
    const totalCost = projectTask ? projectTask.totalCost : 0;
    const totalDuration = Math.max(
      ...tasks.map(task => task.end.getTime())
    ) - Math.min(
      ...tasks.map(task => task.start.getTime())
    );

    const tasksByLevel = {
      level1: tasks.filter(t => t.level === 1).length,
      level2: tasks.filter(t => t.level === 2).length,
      level3: tasks.filter(t => t.level === 3).length,
      level4: tasks.filter(t => t.level === 4).length
    };

    return {
      summary: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        completionRate: (completedTasks / totalTasks) * 100,
        totalCost,
        totalDurationDays: Math.ceil(totalDuration / (1000 * 60 * 60 * 24)),
        tasksByLevel
      },
      criticalPath: tasks.filter(t => 
        t.styles?.backgroundColor === '#ff4d4f'
      ).map(t => ({
        id: t.id,
        name: t.name,
        start: t.start,
        end: t.end
      })),
      recommendations: this.generateRecommendations(tasks, t),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Gera recomendações baseadas na análise
   */
  private static generateRecommendations(tasks: GanttTask[], t?: (key: string) => string): string[] {
    const recommendations: string[] = [];
    
    const overdueTasks = tasks.filter(t => 
      t.end < new Date() && t.status !== 'completed'
    );
    
    if (overdueTasks.length > 0) {
      const message = t 
        ? `${overdueTasks.length} ${t('gantt.recommendations.overdueTasks')}`
        : `${overdueTasks.length} tarefa(s) em atraso precisam de atenção imediata`;
      recommendations.push(message);
    }

    const tasksWithoutResponsible = tasks.filter(t => !t.responsible);
    if (tasksWithoutResponsible.length > 0) {
      const message = t 
        ? `${tasksWithoutResponsible.length} ${t('gantt.recommendations.tasksWithoutResponsible')}`
        : `${tasksWithoutResponsible.length} tarefa(s) sem responsável definido`;
      recommendations.push(message);
    }

    const longTasks = tasks.filter(t => {
      const duration = (t.end.getTime() - t.start.getTime()) / (1000 * 60 * 60 * 24);
      return duration > 30; // Mais de 30 dias
    });
    
    if (longTasks.length > 0) {
      const message = t 
        ? `${longTasks.length} ${t('gantt.recommendations.longTasks')}`
        : `${longTasks.length} tarefa(s) com duração superior a 30 dias - considere subdividir`;
      recommendations.push(message);
    }

    return recommendations;
  }
} 