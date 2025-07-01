import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { 
  TreeNode, 
  ExportOptions, 
  UnifiedProjectData, 
  UnifiedExportOptions,
  Risk,
  MeritFigure,
  RiskMetrics,
  MeritFigureMetrics
} from '../types';
import { CostCalculator } from '../utils/costCalculator';
import { v4 as uuidv4 } from 'uuid';

// Versão atual do formato de dados
const CURRENT_DATA_VERSION = '2.0.0';
const APP_VERSION = '1.0.0'; // Versão da aplicação

export class ExportService {
  /**
   * Coleta todos os dados do localStorage e estrutura WBS
   */
  static collectAllProjectData(rootNode: TreeNode): UnifiedProjectData {
    // Carregar dados do localStorage
    const risks = this.loadRisksFromStorage();
    const meritFigures = this.loadMeritFiguresFromStorage();
    const groupingState = this.loadGroupingStateFromStorage();
    
    // Calcular estatísticas da WBS
    const wbsStats = this.calculateWbsStatistics(rootNode);
    
    // Calcular estatísticas de risco
    const riskStats = this.calculateRiskStatistics(risks);
    
    // Calcular estatísticas de figuras de mérito
    const meritStats = this.calculateMeritFigureStatistics(meritFigures);
    
    // Calcular estatísticas de TRL
    const trlStats = this.calculateTrlStatistics(rootNode);
    
    // Calcular informações do projeto
    const projectDates = this.calculateProjectDates(rootNode);
    
    const unifiedData: UnifiedProjectData = {
      projectInfo: {
        id: rootNode.id,
        name: rootNode.name,
        description: rootNode.description,
        version: CURRENT_DATA_VERSION,
        exportDate: new Date(),
        appVersion: APP_VERSION,
        totalNodes: wbsStats.totalNodes,
        totalCost: rootNode.totalCost,
        projectDuration: projectDates.duration,
        projectStartDate: projectDates.startDate,
        projectEndDate: projectDates.endDate,
      },
      wbsStructure: rootNode,
      risks: risks,
      meritFigures: meritFigures,
      groupingState: groupingState,
      projectSettings: {
        currency: localStorage.getItem('wbs-currency') || 'BRL',
        language: localStorage.getItem('i18nextLng') || 'pt',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      statistics: {
        wbs: wbsStats,
        risks: riskStats,
        meritFigures: meritStats,
        trl: trlStats,
      },
    };
    
    return unifiedData;
  }

  /**
   * Carrega riscos do localStorage
   */
  private static loadRisksFromStorage(): Risk[] {
    try {
      const stored = localStorage.getItem('wbs-project-risks');
      if (stored) {
        const parsedRisks = JSON.parse(stored);
        return parsedRisks.map((risk: any) => ({
          ...risk,
          createdAt: new Date(risk.createdAt),
          updatedAt: new Date(risk.updatedAt),
          dueDate: risk.dueDate ? new Date(risk.dueDate) : undefined,
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar riscos:', error);
    }
    return [];
  }

  /**
   * Carrega figuras de mérito do localStorage
   */
  private static loadMeritFiguresFromStorage(): MeritFigure[] {
    try {
      const stored = localStorage.getItem('wbs-merit-figures');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsedFigures = JSON.parse(stored);
        if (Array.isArray(parsedFigures)) {
          return parsedFigures.map((figure: any) => ({
            ...figure,
            createdAt: new Date(figure.createdAt),
            updatedAt: new Date(figure.updatedAt),
            phaseImpacts: figure.phaseImpacts || []
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar figuras de mérito:', error);
    }
    return [];
  }

  /**
   * Carrega estado de agrupamento do localStorage
   */
  private static loadGroupingStateFromStorage() {
    try {
      const saved = localStorage.getItem('wbs-grouping-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          groupedPhaseIds: parsed.groupedPhaseIds || [],
          groupedExpanded: parsed.groupedExpanded || false,
          lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : undefined,
        };
      }
    } catch (error) {
      console.warn('Erro ao carregar estado de agrupamento:', error);
    }
    return {
      groupedPhaseIds: [],
      groupedExpanded: false,
    };
  }

  /**
   * Calcula estatísticas da WBS
   */
  private static calculateWbsStatistics(rootNode: TreeNode) {
    let totalNodes = 0;
    const nodesByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let completedNodes = 0;
    let inProgressNodes = 0;
    let notStartedNodes = 0;

    const traverse = (node: TreeNode) => {
      totalNodes++;
      nodesByLevel[node.level]++;
      
      switch (node.status) {
        case 'completed':
          completedNodes++;
          break;
        case 'in-progress':
          inProgressNodes++;
          break;
        default:
          notStartedNodes++;
          break;
      }
      
      node.children.forEach(traverse);
    };

    traverse(rootNode);

    return {
      totalNodes,
      nodesByLevel,
      completedNodes,
      inProgressNodes,
      notStartedNodes,
    };
  }

  /**
   * Calcula estatísticas de riscos
   */
  private static calculateRiskStatistics(risks: Risk[]): RiskMetrics {
    const totalRisks = risks.length;
    
    const risksByStatus = risks.reduce((acc, risk) => {
      acc[risk.status] = (acc[risk.status] || 0) + 1;
      return acc;
    }, {
      identified: 0,
      assessed: 0,
      mitigated: 0,
      closed: 0
    } as Record<Risk['status'], number>);

    const risksByCategory = risks.reduce((acc, risk) => {
      acc[risk.category] = (acc[risk.category] || 0) + 1;
      return acc;
    }, {
      technical: 0,
      financial: 0,
      operational: 0,
      external: 0,
      strategic: 0
    } as Record<Risk['category'], number>);

    const averageRiskScore = totalRisks > 0 
      ? risks.reduce((sum, risk) => sum + risk.riskScore, 0) / totalRisks 
      : 0;

    // Categorizar por nível de risco
    let lowRisks = 0, mediumRisks = 0, highRisks = 0, criticalRisks = 0, catastrophicRisks = 0;
    let overdueRisks = 0, soonDueRisks = 0;
    
    const now = new Date();
    
    risks.forEach(risk => {
      // Categorizar por score
      if (risk.riskScore <= 2) lowRisks++;
      else if (risk.riskScore <= 5) mediumRisks++;
      else if (risk.riskScore <= 8) highRisks++;
      else if (risk.riskScore <= 10) criticalRisks++;
      else catastrophicRisks++;
      
      // Verificar datas
      if (risk.dueDate && (risk.status === 'identified' || risk.status === 'assessed')) {
        const timeDiff = risk.dueDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff < 0) overdueRisks++;
        else if (daysDiff <= 7) soonDueRisks++;
      }
    });

    return {
      totalRisks,
      risksByStatus,
      risksByCategory,
      averageRiskScore,
      lowRisks,
      mediumRisks,
      highRisks,
      criticalRisks,
      catastrophicRisks,
      overdueRisks,
      soonDueRisks,
    };
  }

  /**
   * Calcula estatísticas de figuras de mérito
   */
  private static calculateMeritFigureStatistics(meritFigures: MeritFigure[]): MeritFigureMetrics {
    const totalFigures = meritFigures.length;
    
    const figuresByCategory = meritFigures.reduce((acc, figure) => {
      acc[figure.category] = (acc[figure.category] || 0) + 1;
      return acc;
    }, {} as Record<MeritFigure['category'], number>);
    
    const figuresByStatus = meritFigures.reduce((acc, figure) => {
      acc[figure.status] = (acc[figure.status] || 0) + 1;
      return acc;
    }, {} as Record<MeritFigure['status'], number>);

    // Calcular progresso médio
    const averageProgress = totalFigures > 0 
      ? meritFigures.reduce((sum, figure) => {
          const progress = ((figure.currentValue - figure.baselineValue) / (figure.targetValue - figure.baselineValue)) * 100;
          return sum + Math.max(0, Math.min(100, progress));
        }, 0) / totalFigures
      : 0;

    const topPerformingFigures = [...meritFigures]
      .sort((a, b) => {
        const progressA = ((a.currentValue - a.baselineValue) / (a.targetValue - a.baselineValue)) * 100;
        const progressB = ((b.currentValue - b.baselineValue) / (b.targetValue - b.baselineValue)) * 100;
        return progressB - progressA;
      })
      .slice(0, 5);

    const criticalFigures = meritFigures.filter(figure => 
      figure.weight >= 8 || figure.status === 'off-track'
    );

    return {
      totalFigures,
      figuresByCategory,
      figuresByStatus,
      averageProgress,
      onTrackFigures: figuresByStatus['on-track'] || 0,
      atRiskFigures: figuresByStatus['at-risk'] || 0,
      offTrackFigures: figuresByStatus['off-track'] || 0,
      completedFigures: figuresByStatus['completed'] || 0,
      topPerformingFigures,
      criticalFigures,
    };
  }

  /**
   * Calcula estatísticas de TRL
   */
  private static calculateTrlStatistics(rootNode: TreeNode) {
    const phases = this.getPhases(rootNode);
    const phasesByTrl: Record<number, number> = {};
    let totalTrl = 0;
    let phasesWithTrl = 0;
    
    // Inicializar contadores
    for (let i = 1; i <= 9; i++) {
      phasesByTrl[i] = 0;
    }
    
    phases.forEach(phase => {
      if (phase.trl && phase.trl >= 1 && phase.trl <= 9) {
        phasesByTrl[phase.trl]++;
        totalTrl += phase.trl;
        phasesWithTrl++;
      }
    });
    
    const averageTrl = phasesWithTrl > 0 ? totalTrl / phasesWithTrl : 0;
    const phasesWithoutTrl = phases.length - phasesWithTrl;
    
    return {
      phasesByTrl,
      averageTrl,
      phasesWithoutTrl,
    };
  }

  /**
   * Obtém todas as fases (nível 2) do projeto
   */
  private static getPhases(rootNode: TreeNode): TreeNode[] {
    const phases: TreeNode[] = [];
    const traverse = (node: TreeNode) => {
      if (node.level === 2) {
        phases.push(node);
      }
      node.children.forEach(traverse);
    };
    traverse(rootNode);
    return phases;
  }

  /**
   * Calcula datas do projeto
   */
  private static calculateProjectDates(rootNode: TreeNode) {
    let earliestStart: Date | undefined;
    let latestEnd: Date | undefined;
    
    const traverse = (node: TreeNode) => {
      if (node.startDate) {
        if (!earliestStart || node.startDate < earliestStart) {
          earliestStart = node.startDate;
        }
      }
      
      if (node.endDate) {
        if (!latestEnd || node.endDate > latestEnd) {
          latestEnd = node.endDate;
        }
      }
      
      node.children.forEach(traverse);
    };
    
    traverse(rootNode);
    
    const duration = (earliestStart && latestEnd) 
      ? Math.ceil((latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;
    
    return {
      startDate: earliestStart,
      endDate: latestEnd,
      duration,
    };
  }

  /**
   * Exporta todos os dados unificados para JSON
   */
  static exportUnifiedJSON(
    rootNode: TreeNode, 
    filename: string = 'projeto-completo.json',
    options: Partial<UnifiedExportOptions> = {}
  ) {
    const defaultOptions: UnifiedExportOptions = {
      format: 'json',
      includeWbs: true,
      includeRisks: true,
      includeMeritFigures: true,
      includeGroupingState: true,
      includeStatistics: true,
      includeSettings: true,
      includeMetadata: true,
      includeCostBreakdown: true,
      includeGanttData: false,
      compressOutput: false,
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // Coletar todos os dados
    const allData = this.collectAllProjectData(rootNode);
    
    // Aplicar filtros baseados nas opções
    const filteredData: Partial<UnifiedProjectData> = {};
    
    // Sempre incluir informações básicas do projeto
    filteredData.projectInfo = allData.projectInfo;
    
    if (finalOptions.includeWbs) {
      filteredData.wbsStructure = allData.wbsStructure;
    }
    
    if (finalOptions.includeRisks) {
      filteredData.risks = finalOptions.riskStatusFilter 
        ? allData.risks.filter(risk => finalOptions.riskStatusFilter!.includes(risk.status))
        : allData.risks;
    }
    
    if (finalOptions.includeMeritFigures) {
      filteredData.meritFigures = finalOptions.meritFigureCategoryFilter
        ? allData.meritFigures.filter(figure => finalOptions.meritFigureCategoryFilter!.includes(figure.category))
        : allData.meritFigures;
    }
    
    if (finalOptions.includeGroupingState) {
      filteredData.groupingState = allData.groupingState;
    }
    
    if (finalOptions.includeSettings) {
      filteredData.projectSettings = allData.projectSettings;
    }
    
    if (finalOptions.includeStatistics) {
      filteredData.statistics = allData.statistics;
    }

    // Adicionar metadados de exportação
    const exportData = {
      ...filteredData,
      exportMetadata: {
        exportOptions: finalOptions,
        exportedSections: Object.keys(filteredData),
        dataIntegrity: {
          wbsNodes: filteredData.wbsStructure ? this.calculateWbsStatistics(filteredData.wbsStructure).totalNodes : 0,
          risksCount: filteredData.risks?.length || 0,
          meritFiguresCount: filteredData.meritFigures?.length || 0,
        },
      },
    };

    const jsonData = JSON.stringify(exportData, null, finalOptions.compressOutput ? 0 : 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    saveAs(blob, filename);
    
    return exportData;
  }

  /**
   * Manter compatibilidade com método antigo
   */
  static exportToJSON(
    rootNode: TreeNode,
    risks: Risk[] = [],
    meritFigures: MeritFigure[] = [],
    filename: string = 'wbs-project-data.json'
  ) {
    console.warn('exportToJSON is deprecated. Use exportUnifiedJSON for better functionality.');
    return this.exportUnifiedJSON(rootNode, filename);
  }

  /**
   * Prepara dados para Excel (mantido para compatibilidade)
   */
  static exportToExcel(rootNode: TreeNode, filename: string, options: ExportOptions) {
    const allData = this.collectAllProjectData(rootNode);
    
    // Preparar dados da WBS
    const wbsData = this.flattenWbsForExcel(rootNode);
    
    // Preparar dados de riscos
    const risksData = allData.risks.map(risk => ({
      'ID': risk.id,
      'Título': risk.title,
      'Descrição': risk.description,
      'Categoria': risk.category,
      'Probabilidade': risk.probability,
      'Impacto': risk.impact,
      'Score': risk.riskScore,
      'Status': risk.status,
      'Responsável': risk.owner,
      'Data de Vencimento': risk.dueDate ? risk.dueDate.toLocaleDateString('pt-BR') : '',
      'Custo Estimado': risk.estimatedCost || '',
      'Custo Real': risk.actualCost || '',
    }));
    
    // Preparar dados de figuras de mérito
    const meritData = allData.meritFigures.map(figure => ({
      'ID': figure.id,
      'Nome': figure.name,
      'Descrição': figure.description,
      'Categoria': figure.category,
      'Unidade': figure.unit,
      'Valor Base': figure.baselineValue,
      'Valor Atual': figure.currentValue,
      'Valor Meta': figure.targetValue,
      'Peso': figure.weight,
      'Direção': figure.direction,
      'Status': figure.status,
    }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Adicionar planilhas
    if (options.includeMetadata || true) {
      const wsWbs = XLSX.utils.json_to_sheet(wbsData);
      XLSX.utils.book_append_sheet(wb, wsWbs, 'WBS');
    }
    
    if (allData.risks.length > 0) {
      const wsRisks = XLSX.utils.json_to_sheet(risksData);
      XLSX.utils.book_append_sheet(wb, wsRisks, 'Riscos');
    }
    
    if (allData.meritFigures.length > 0) {
      const wsMerit = XLSX.utils.json_to_sheet(meritData);
      XLSX.utils.book_append_sheet(wb, wsMerit, 'Figuras de Mérito');
    }
    
    // Adicionar resumo estatístico
    if (allData.statistics) {
      const statsData = [
        { 'Métrica': 'Total de Nós', 'Valor': allData.statistics.wbs.totalNodes },
        { 'Métrica': 'Custo Total', 'Valor': allData.projectInfo.totalCost },
        { 'Métrica': 'Total de Riscos', 'Valor': allData.statistics.risks.totalRisks },
        { 'Métrica': 'Figuras de Mérito', 'Valor': allData.statistics.meritFigures.totalFigures },
        { 'Métrica': 'TRL Médio', 'Valor': allData.statistics.trl.averageTrl.toFixed(1) },
      ];
      const wsStats = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, wsStats, 'Estatísticas');
    }

    XLSX.writeFile(wb, filename);
  }

  /**
   * Converte WBS hierárquica para formato plano para Excel
   */
  private static flattenWbsForExcel(rootNode: TreeNode): any[] {
    const result: any[] = [];
    
    const traverse = (node: TreeNode, depth: number = 0) => {
      const prefix = '  '.repeat(depth);
      
      result.push({
        'Nível': node.level,
        'Nome': prefix + node.name,
        'Custo Próprio': node.cost,
        'Custo Total': node.totalCost,
        'Responsável': node.responsible || '',
        'Status': node.status || '',
        'Data Início': node.startDate ? node.startDate.toLocaleDateString('pt-BR') : '',
        'Data Fim': node.endDate ? node.endDate.toLocaleDateString('pt-BR') : '',
        'TRL': node.trl || '',
        'Descrição': node.description || '',
        'Dependências': (node.dependencies || []).length,
      });
      
      node.children.forEach(child => traverse(child, depth + 1));
    };
    
    traverse(rootNode);
    return result;
  }

  /**
   * Prepara dados para Gantt Chart (mantido para compatibilidade)
   */
  static prepareGanttData(rootNode: TreeNode) {
    const tasks: any[] = [];
    
    const traverse = (node: TreeNode, parentId?: string) => {
      tasks.push({
        id: node.id,
        name: node.name,
        start: node.startDate || new Date(),
        end: node.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        progress: node.status === 'completed' ? 100 : node.status === 'in-progress' ? 50 : 0,
        type: node.children.length > 0 ? 'project' : 'task',
        project: parentId || undefined,
        dependencies: node.dependencies || []
      });

      node.children.forEach(child => traverse(child, node.id));
    };

    traverse(rootNode);
    return tasks;
  }
} 