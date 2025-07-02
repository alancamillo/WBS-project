import * as XLSX from 'xlsx';
import { 
  TreeNode, 
  UnifiedProjectData, 
  UnifiedImportResult, 
  ImportError, 
  ImportWarning, 
  ImportSummary,
  ImportValidationError,
  Risk,
  MeritFigure
} from '../types';
import { CostCalculator } from '../utils/costCalculator';
import { DateCalculator } from '../utils/dateCalculator';
import { v4 as uuidv4 } from 'uuid';

// Versões suportadas do formato de dados
const SUPPORTED_VERSIONS = ['1.0.0', '2.0.0'];
const CURRENT_VERSION = '2.0.0';

// Interface legada para compatibilidade
export interface ImportResult {
  success: boolean;
  data?: TreeNode;
  risks?: Risk[];
  meritFigures?: MeritFigure[];
  errors: ImportError[];
  warnings: ImportWarning[];
  summary?: any;
}

export class ImportService {
  /**
   * Método unificado para importar arquivos de diferentes formatos
   * Detecta automaticamente o tipo de arquivo e chama o método apropriado
   */
  static async importFile(file: File): Promise<ImportResult> {
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    try {
      switch (fileExtension) {
        case 'json':
          return await this.importFromJSON(file);
        
        case 'xlsx':
        case 'xls':
          // Para futuras implementações de Excel
          throw new Error('Importação de Excel ainda não implementada');
        
        case 'csv':
          // Para futuras implementações de CSV
          throw new Error('Importação de CSV ainda não implementada');
        
        default:
          // Tentar como JSON por padrão
          return await this.importFromJSON(file);
      }
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `Erro ao importar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Importa projeto unificado de arquivo JSON
   */
  static async importFromURL(url: string): Promise<UnifiedImportResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch from URL: ${response.statusText}`);
      }
      const blob = await response.blob();
      const file = new File([blob], "wbs.json", { type: "application/json" });
      return await this.importUnifiedFromJSON(file);
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `Error importing from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          section: 'general'
        }],
        warnings: []
      };
    }
  }

  /**
   * Importa projeto unificado de arquivo JSON
   */
  static async importUnifiedFromJSON(file: File): Promise<UnifiedImportResult> {
    try {
      const text = await file.text();
      const rawData = JSON.parse(text);
      
      // Detectar formato e versão
      const formatInfo = this.detectFormatVersion(rawData);
      
      if (!formatInfo.isSupported) {
        return {
          success: false,
          errors: [{
            message: `Versão do formato não suportada: ${formatInfo.version}. Versões suportadas: ${SUPPORTED_VERSIONS.join(', ')}`,
            severity: 'error',
            section: 'general'
          }],
          warnings: []
        };
      }

      // Processar dados baseado na versão
      let unifiedData: UnifiedProjectData;
      const errors: ImportError[] = [];
      const warnings: ImportWarning[] = [];

      if (formatInfo.version === '2.0.0' && rawData.projectInfo) {
        // Formato novo unificado
        unifiedData = await this.processUnifiedFormat(rawData, errors, warnings);
      } else {
        // Formato legado ou estrutura simples
        unifiedData = await this.migrateLegacyFormat(rawData, errors, warnings);
      }

      // Validar dados importados
      const validationResult = this.validateUnifiedData(unifiedData);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      // Gerar resumo
      const summary = this.generateUnifiedSummary(unifiedData);

      return {
        success: errors.filter(e => e.severity === 'error').length === 0,
        data: unifiedData,
        errors,
        warnings,
        summary
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `Erro ao processar arquivo JSON: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          severity: 'error',
          section: 'general'
        }],
        warnings: []
      };
    }
  }

  /**
   * Detecta versão e formato dos dados
   */
  private static detectFormatVersion(data: any): { 
    version: string; 
    isSupported: boolean; 
    format: 'unified' | 'legacy' | 'simple' 
  } {
    // Formato unificado novo
    if (data.projectInfo && data.projectInfo.version) {
      return {
        version: data.projectInfo.version,
        isSupported: SUPPORTED_VERSIONS.includes(data.projectInfo.version),
        format: 'unified'
      };
    }

    // Formato legado (apenas estrutura WBS com risks/meritFigures opcionais)
    if (data.projectStructure || (data.id && data.children && Array.isArray(data.children))) {
      return {
        version: '1.0.0',
        isSupported: true,
        format: 'legacy'
      };
    }

    // Formato simples (apenas TreeNode)
    return {
      version: '1.0.0',
      isSupported: true,
      format: 'simple'
    };
  }

  /**
   * Processa formato unificado novo (v2.0.0)
   */
  private static async processUnifiedFormat(
    data: any, 
    errors: ImportError[], 
    warnings: ImportWarning[]
  ): Promise<UnifiedProjectData> {
    
    // Validar estrutura obrigatória
    if (!data.wbsStructure) {
      errors.push({
        message: 'Estrutura WBS obrigatória não encontrada',
        severity: 'error',
        section: 'wbs'
      });
    }

    // Processar WBS
    const wbsResult = data.wbsStructure ? this.validateAndConvertWbsData(data.wbsStructure) : null;
    if (wbsResult && !wbsResult.success) {
      errors.push(...(wbsResult.errors || []));
      warnings.push(...(wbsResult.warnings || []));
    }

    // Processar riscos
    const risks = this.processRisksData(data.risks || [], errors, warnings);

    // Processar figuras de mérito
    const meritFigures = this.processMeritFiguresData(data.meritFigures || [], errors, warnings);

    // Processar estado de agrupamento
    const groupingState = data.groupingState || {
      groupedPhaseIds: [],
      groupedExpanded: false
    };

    // Aplicar herança de datas igual ao App.tsx
    const processedWbsStructure = wbsResult?.data || this.createEmptyProject();
    const wbsWithDateInheritance = DateCalculator.applyDateInheritanceRecursively(processedWbsStructure);

    // Montar dados unificados
    const unifiedData: UnifiedProjectData = {
      projectInfo: {
        ...data.projectInfo,
        exportDate: new Date(data.projectInfo.exportDate),
        projectStartDate: data.projectInfo.projectStartDate ? new Date(data.projectInfo.projectStartDate) : undefined,
        projectEndDate: data.projectInfo.projectEndDate ? new Date(data.projectInfo.projectEndDate) : undefined,
      },
      wbsStructure: wbsWithDateInheritance,
      risks,
      meritFigures,
      groupingState,
      projectSettings: data.projectSettings || {},
      statistics: data.statistics || undefined
    };

    return unifiedData;
  }

  /**
   * Migra formato legado para novo formato
   */
  private static async migrateLegacyFormat(
    data: any, 
    errors: ImportError[], 
    warnings: ImportWarning[]
  ): Promise<UnifiedProjectData> {
    
    warnings.push({
      message: 'Detectado formato legado. Realizando migração automática para nova versão.',
      section: 'general'
    });

    let wbsData: TreeNode;
    let risks: Risk[] = [];
    let meritFigures: MeritFigure[] = [];

    // Detectar estrutura WBS
    if (data.projectStructure) {
      wbsData = data.projectStructure;
      risks = data.risks || [];
      meritFigures = data.meritFigures || [];
    } else {
      wbsData = data;
    }

    // Validar e converter WBS
    const wbsResult = this.validateAndConvertWbsData(wbsData);
    if (!wbsResult.success) {
      errors.push(...(wbsResult.errors || []));
      warnings.push(...(wbsResult.warnings || []));
    }

    // Processar dados auxiliares
    const processedRisks = this.processRisksData(risks, errors, warnings);
    const processedMeritFigures = this.processMeritFiguresData(meritFigures, errors, warnings);

    // Aplicar herança de datas igual ao App.tsx
    const rootNode = wbsResult.data || this.createEmptyProject();
    const rootNodeWithDateInheritance = DateCalculator.applyDateInheritanceRecursively(rootNode);
    const projectDates = this.calculateProjectDates(rootNodeWithDateInheritance);

    const unifiedData: UnifiedProjectData = {
      projectInfo: {
        id: rootNodeWithDateInheritance.id,
        name: rootNodeWithDateInheritance.name,
        description: rootNodeWithDateInheritance.description,
        version: CURRENT_VERSION,
        exportDate: new Date(),
        totalNodes: this.countNodes(rootNodeWithDateInheritance),
        totalCost: rootNodeWithDateInheritance.totalCost,
        projectDuration: projectDates.duration,
        projectStartDate: projectDates.startDate,
        projectEndDate: projectDates.endDate,
      },
      wbsStructure: rootNodeWithDateInheritance,
      risks: processedRisks,
      meritFigures: processedMeritFigures,
      groupingState: {
        groupedPhaseIds: [],
        groupedExpanded: false
      },
      projectSettings: {
        currency: 'BRL',
        language: 'pt'
      }
    };

    return unifiedData;
  }

  /**
   * Processa dados de riscos
   */
  private static processRisksData(
    risksData: any[], 
    errors: ImportError[], 
    warnings: ImportWarning[]
  ): Risk[] {
    if (!Array.isArray(risksData)) {
      warnings.push({
        message: 'Dados de riscos não são um array válido. Ignorando.',
        section: 'risks'
      });
      return [];
    }

    return risksData
      .map((risk, index) => {
        try {
          return {
            ...risk,
            id: risk.id || uuidv4(),
            createdAt: risk.createdAt ? new Date(risk.createdAt) : new Date(),
            updatedAt: risk.updatedAt ? new Date(risk.updatedAt) : new Date(),
            dueDate: risk.dueDate ? new Date(risk.dueDate) : undefined,
          };
        } catch (error) {
          warnings.push({
            message: `Erro ao processar risco na posição ${index}: ${error}`,
            section: 'risks'
          });
          return null;
        }
      })
      .filter(Boolean) as Risk[];
  }

  /**
   * Processa dados de figuras de mérito
   */
  private static processMeritFiguresData(
    meritData: any[], 
    errors: ImportError[], 
    warnings: ImportWarning[]
  ): MeritFigure[] {
    if (!Array.isArray(meritData)) {
      warnings.push({
        message: 'Dados de figuras de mérito não são um array válido. Ignorando.',
        section: 'meritFigures'
      });
      return [];
    }

    return meritData
      .map((figure, index) => {
        try {
          return {
            ...figure,
            id: figure.id || uuidv4(),
            createdAt: figure.createdAt ? new Date(figure.createdAt) : new Date(),
            updatedAt: figure.updatedAt ? new Date(figure.updatedAt) : new Date(),
            phaseImpacts: figure.phaseImpacts || []
          };
        } catch (error) {
          warnings.push({
            message: `Erro ao processar figura de mérito na posição ${index}: ${error}`,
            section: 'meritFigures'
          });
          return null;
        }
      })
      .filter(Boolean) as MeritFigure[];
  }

  /**
   * Valida dados unificados
   */
  private static validateUnifiedData(data: UnifiedProjectData): {
    errors: ImportError[];
    warnings: ImportWarning[];
  } {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Validar informações do projeto
    if (!data.projectInfo.name || data.projectInfo.name.trim() === '') {
      errors.push({
        message: 'Nome do projeto é obrigatório',
        severity: 'error',
        section: 'general'
      });
    }

    // Validar estrutura WBS
    if (!data.wbsStructure) {
      errors.push({
        message: 'Estrutura WBS é obrigatória',
        severity: 'error',
        section: 'wbs'
      });
    }

    // Validar vinculações entre dados
    if (data.meritFigures.length > 0 && data.wbsStructure) {
      const nodeIds = this.getAllNodeIds(data.wbsStructure);
      data.meritFigures.forEach((figure, index) => {
        figure.phaseImpacts?.forEach(impact => {
          if (!nodeIds.includes(impact.nodeId)) {
            warnings.push({
              message: `Figura de mérito "${figure.name}" referencia nó inexistente: ${impact.nodeId}`,
              section: 'meritFigures'
            });
          }
        });
      });
    }

    return { errors, warnings };
  }

  /**
   * Gera resumo unificado da importação
   */
  private static generateUnifiedSummary(data: UnifiedProjectData): ImportSummary {
    const wbsStats = this.countNodesByLevel(data.wbsStructure);
    const riskStats = this.countRisksByStatus(data.risks);
    const meritStats = this.countMeritFiguresByCategory(data.meritFigures);

    return {
      wbs: {
        totalNodes: wbsStats.total,
        nodesByLevel: wbsStats.byLevel
      },
      risks: {
        totalRisks: data.risks.length,
        risksByStatus: riskStats
      },
      meritFigures: {
        totalFigures: data.meritFigures.length,
        figuresByCategory: meritStats
      },
      compatibility: {
        formatVersion: data.projectInfo.version,
        isCompatible: SUPPORTED_VERSIONS.includes(data.projectInfo.version),
        migrationRequired: data.projectInfo.version !== CURRENT_VERSION
      }
    };
  }

  /**
   * Aplica dados unificados importados ao sistema
   */
  static applyUnifiedData(data: UnifiedProjectData): void {
    try {
      // Salvar estrutura WBS
      localStorage.setItem('wbs-project-structure', JSON.stringify(data.wbsStructure));

      // Salvar riscos
      if (data.risks.length > 0) {
        localStorage.setItem('wbs-project-risks', JSON.stringify(data.risks));
      }

      // Salvar figuras de mérito
      if (data.meritFigures.length > 0) {
        localStorage.setItem('wbs-merit-figures', JSON.stringify(data.meritFigures));
      }

      // Salvar estado de agrupamento
      if (data.groupingState) {
        localStorage.setItem('wbs-grouping-state', JSON.stringify(data.groupingState));
      }

      // Salvar configurações do projeto
      if (data.projectSettings) {
        if (data.projectSettings.currency) {
          localStorage.setItem('wbs-currency', data.projectSettings.currency);
        }
        if (data.projectSettings.language) {
          localStorage.setItem('i18nextLng', data.projectSettings.language);
        }
      }

    } catch (error) {
      console.error('Erro ao aplicar dados importados:', error);
      throw new Error('Falha ao salvar dados importados no localStorage');
    }
  }

  // ============== MÉTODOS DE COMPATIBILIDADE LEGADA ==============

  /**
   * Método legado para importação de JSON (mantido para compatibilidade)
   */
  static async importFromJSON(file: File): Promise<ImportResult> {
    const unifiedResult = await this.importUnifiedFromJSON(file);
    
    // Criar summary específico para o preview com formato esperado pelo ImportWBS.tsx
    let previewSummary = null;
    if (unifiedResult.data?.wbsStructure && unifiedResult.summary) {
      const wbsData = unifiedResult.data.wbsStructure;
      const originalSummary = unifiedResult.summary;
      
      previewSummary = {
        totalNodes: originalSummary.wbs.totalNodes,
        level1Nodes: originalSummary.wbs.nodesByLevel[1] || 0,
        level2Nodes: originalSummary.wbs.nodesByLevel[2] || 0,
        level3Nodes: originalSummary.wbs.nodesByLevel[3] || 0,
        totalCost: wbsData.totalCost || 0
      };
    }
    
    return {
      success: unifiedResult.success,
      data: unifiedResult.data?.wbsStructure,
      risks: unifiedResult.data?.risks,
      meritFigures: unifiedResult.data?.meritFigures,
      errors: unifiedResult.errors,
      warnings: unifiedResult.warnings,
      summary: previewSummary
    };
  }

  // ============== MÉTODOS AUXILIARES ==============

  /**
   * Valida e converte dados da WBS
   */
  private static validateAndConvertWbsData(rawData: any): {
    success: boolean;
    data?: TreeNode;
    errors?: ImportError[];
    warnings?: ImportWarning[];
  } {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    try {
      // Conversão de datas
      const convertedData = this.convertDatesRecursively(rawData);
      
      // Validações básicas
      if (!convertedData.id) {
        errors.push({
          message: 'ID do nó raiz é obrigatório',
          severity: 'error',
          section: 'wbs'
        });
      }

      if (!convertedData.name) {
        errors.push({
          message: 'Nome do nó raiz é obrigatório',
          severity: 'error',
          section: 'wbs'
        });
      }

      // Aplicar processamento completo (custos + datas) igual ao App.tsx
      const processedData = CostCalculator.processCompleteNode(convertedData);

      return {
        success: errors.length === 0,
        data: processedData,
        errors,
        warnings
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `Erro na validação da WBS: ${error}`,
          severity: 'error',
          section: 'wbs'
        }],
        warnings
      };
    }
  }

  /**
   * Converte strings de data para objetos Date recursivamente
   */
  private static convertDatesRecursively(node: any): TreeNode {
    return {
      ...node,
      startDate: node.startDate ? new Date(node.startDate) : undefined,
      endDate: node.endDate ? new Date(node.endDate) : undefined,
      children: node.children ? node.children.map((child: any) => this.convertDatesRecursively(child)) : []
    };
  }

  /**
   * Cria projeto vazio
   */
  private static createEmptyProject(): TreeNode {
    return {
      id: uuidv4(),
      name: 'Projeto Importado',
      cost: 0,
      level: 1,
      children: [],
      totalCost: 0
    };
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
   * Conta total de nós
   */
  private static countNodes(rootNode: TreeNode): number {
    let count = 1;
    rootNode.children.forEach(child => {
      count += this.countNodes(child);
    });
    return count;
  }

  /**
   * Obtém todos os IDs de nós
   */
  private static getAllNodeIds(rootNode: TreeNode): string[] {
    const ids = [rootNode.id];
    rootNode.children.forEach(child => {
      ids.push(...this.getAllNodeIds(child));
    });
    return ids;
  }

  /**
   * Conta nós por nível
   */
  private static countNodesByLevel(rootNode: TreeNode): {
    total: number;
    byLevel: Record<number, number>;
  } {
    const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let total = 0;

    const traverse = (node: TreeNode) => {
      total++;
      byLevel[node.level]++;
      node.children.forEach(traverse);
    };

    traverse(rootNode);

    return { total, byLevel };
  }

  /**
   * Conta riscos por status
   */
  private static countRisksByStatus(risks: Risk[]): Record<string, number> {
    return risks.reduce((acc, risk) => {
      acc[risk.status] = (acc[risk.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Conta figuras de mérito por categoria
   */
  private static countMeritFiguresByCategory(meritFigures: MeritFigure[]): Record<string, number> {
    return meritFigures.reduce((acc, figure) => {
      acc[figure.category] = (acc[figure.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
} 