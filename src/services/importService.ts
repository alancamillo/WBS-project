import * as XLSX from 'xlsx';
import { TreeNode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { CostCalculator } from '../utils/costCalculator';

export interface ImportValidationError {
  line?: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult {
  success: boolean;
  data?: TreeNode;
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
  summary?: {
    totalNodes: number;
    level1Nodes: number;
    level2Nodes: number;
    level3Nodes: number;
    totalCost: number;
  };
}

export class ImportService {
  /**
   * Importa WBS de arquivo JSON
   */
  static async importFromJSON(file: File): Promise<ImportResult> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Valida e converte os dados
      const validationResult = this.validateAndConvertData(data);
      
      if (!validationResult.success) {
        return validationResult;
      }

      // Recalcula custos totais
      const rootNode = CostCalculator.updateAllTotalCosts(validationResult.data!);
      
      return {
        success: true,
        data: rootNode,
        errors: [],
        warnings: validationResult.warnings,
        summary: this.generateSummary(rootNode)
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `Erro ao processar arquivo JSON: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Importa WBS de arquivo Excel
   */
  static async importFromExcel(file: File): Promise<ImportResult> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      
      // Tenta encontrar a aba principal
      const sheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('estrutura') || 
        name.toLowerCase().includes('wbs') ||
        name.toLowerCase().includes('tree')
      ) || workbook.SheetNames[0];
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Converte dados do Excel para TreeNode
      const conversionResult = this.convertExcelToTreeNode(jsonData);
      
      if (!conversionResult.success) {
        return conversionResult;
      }

      const rootNode = CostCalculator.updateAllTotalCosts(conversionResult.data!);
      
      return {
        success: true,
        data: rootNode,
        errors: [],
        warnings: conversionResult.warnings,
        summary: this.generateSummary(rootNode)
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `Erro ao processar arquivo Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Importa WBS de arquivo CSV
   */
  static async importFromCSV(file: File): Promise<ImportResult> {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return {
          success: false,
          errors: [{
            message: 'Arquivo CSV deve conter pelo menos um cabeçalho e uma linha de dados',
            severity: 'error'
          }],
          warnings: []
        };
      }

      // Parse CSV manual (básico)
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // Converte para TreeNode
      const conversionResult = this.convertExcelToTreeNode(rows);
      
      if (!conversionResult.success) {
        return conversionResult;
      }

      const rootNode = CostCalculator.updateAllTotalCosts(conversionResult.data!);
      
      return {
        success: true,
        data: rootNode,
        errors: [],
        warnings: conversionResult.warnings,
        summary: this.generateSummary(rootNode)
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `Erro ao processar arquivo CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Converte dados tabulares (Excel/CSV) para TreeNode
   */
  private static convertExcelToTreeNode(data: any[]): ImportResult {
    const errors: ImportValidationError[] = [];
    const warnings: ImportValidationError[] = [];
    
    if (!data || data.length === 0) {
      return {
        success: false,
        errors: [{ message: 'Nenhum dado encontrado no arquivo', severity: 'error' }],
        warnings: []
      };
    }

    // Mapeia colunas possíveis
    const columnMappings = this.detectColumnMappings(data[0]);
    
    if (!columnMappings.name) {
      return {
        success: false,
        errors: [{ message: 'Coluna de nome não encontrada. Colunas esperadas: Nome, Name, Atividade, Task', severity: 'error' }],
        warnings: []
      };
    }

    // Agrupa por nível hierárquico
    const nodesByLevel: { [key: number]: any[] } = { 1: [], 2: [], 3: [] };
    const nodesMap = new Map<string, TreeNode>();

    data.forEach((row, index) => {
      const level = this.detectLevel(row, columnMappings);
      const name = String(row[columnMappings.name] || '').trim();
      const cost = this.parseCost(row[columnMappings.cost]);
      
      if (!name) {
        warnings.push({
          line: index + 2,
          field: 'name',
          message: `Nome vazio na linha ${index + 2}`,
          severity: 'warning'
        });
        return;
      }

      if (level < 1 || level > 3) {
        warnings.push({
          line: index + 2,
          field: 'level',
          message: `Nível inválido (${level}) na linha ${index + 2}. Usando nível 1.`,
          severity: 'warning'
        });
      }

      const startDate = this.parseDate(row[columnMappings.startDate]);
      const endDate = this.parseDate(row[columnMappings.endDate]);
      const duration = this.parseDuration(row[columnMappings.duration]);
      const dependencies = this.parseDependencies(row[columnMappings.dependencies]);

      const node: TreeNode = {
        id: uuidv4(),
        name: name.trim(),
        cost: isNaN(cost) ? 0 : cost,
        level: Math.max(1, Math.min(3, level)) as 1 | 2 | 3,
        children: [],
        totalCost: 0,
        description: row[columnMappings.description] ? String(row[columnMappings.description]).trim() : undefined,
        responsible: row[columnMappings.responsible] ? String(row[columnMappings.responsible]).trim() : undefined,
        startDate,
        endDate,
        durationDays: duration,
        dependencies: dependencies.length > 0 ? dependencies : undefined
      };

      nodesByLevel[node.level].push({ node, originalIndex: index });
      nodesMap.set(node.id, node);
    });

    // Constrói hierarquia
    const rootNode = this.buildHierarchy(nodesByLevel, nodesMap);
    
    if (!rootNode) {
      return {
        success: false,
        errors: [{ message: 'Não foi possível criar estrutura hierárquica. Verifique se há pelo menos um item de nível 1.', severity: 'error' }],
        warnings
      };
    }

    return {
      success: true,
      data: rootNode,
      errors,
      warnings
    };
  }

  /**
   * Detecta mapeamento de colunas
   */
  private static detectColumnMappings(firstRow: any): any {
    const keys = Object.keys(firstRow);
    const mappings: any = {};

    // Nome
    mappings.name = keys.find(key => 
      /^(nome|name|atividade|task|item|descrição|title)$/i.test(key.trim())
    );

    // Custo
    mappings.cost = keys.find(key => 
      /^(custo|cost|valor|value|price|preço|budget|orçamento)$/i.test(key.trim())
    );

    // Nível
    mappings.level = keys.find(key => 
      /^(nível|nivel|level|lvl|hierarquia)$/i.test(key.trim())
    );

    // Outros campos opcionais
    mappings.description = keys.find(key => 
      /^(descrição|description|desc|detalhes|details)$/i.test(key.trim())
    );

    mappings.responsible = keys.find(key => 
      /^(responsável|responsible|resp|owner|dono)$/i.test(key.trim())
    );

    mappings.startDate = keys.find(key => 
      /^(data.?início|start.?date|início|start|begin)$/i.test(key.trim())
    );

    mappings.endDate = keys.find(key => 
      /^(data.?fim|end.?date|fim|end|finish)$/i.test(key.trim())
    );

    mappings.duration = keys.find(key => 
      /^(duração|duration|dias|days|tempo)$/i.test(key.trim())
    );

    mappings.dependencies = keys.find(key => 
      /^(dependências|dependencies|deps|predecessor)$/i.test(key.trim())
    );

    return mappings;
  }

  /**
   * Detecta o nível hierárquico
   */
  private static detectLevel(row: any, mappings: any): number {
    // Se tem coluna de nível explícita
    if (mappings.level && row[mappings.level]) {
      const level = parseInt(String(row[mappings.level]));
      if (!isNaN(level)) return level;
    }

    // Detecta por indentação ou prefixos no nome
    const name = String(row[mappings.name] || '').trim();
    
    // Conta espaços/tabs no início
    const leadingSpaces = name.match(/^(\s*)/)?.[1]?.length || 0;
    if (leadingSpaces >= 8) return 3;
    if (leadingSpaces >= 4) return 2;
    
    // Detecta por prefixos (1., 1.1., 1.1.1., etc.)
    if (/^\d+\.\d+\.\d+/.test(name)) return 3;
    if (/^\d+\.\d+/.test(name)) return 2;
    if (/^\d+\./.test(name)) return 1;
    
    // Detecta por letras (A., a., I., i., etc.)
    if (/^[a-z]\./i.test(name)) return 3;
    if (/^[IVX]+\./i.test(name)) return 2;

    // Default: nível 1
    return 1;
  }

  /**
   * Parseia valores de custo
   */
  private static parseCost(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const cleanValue = String(value)
      .replace(/[^\d,.-]/g, '') // Remove caracteres não numéricos
      .replace(',', '.'); // Substitui vírgula por ponto
    
    return parseFloat(cleanValue) || 0;
  }

  /**
   * Parseia datas
   */
  private static parseDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }

  /**
   * Parseia duração em dias
   */
  private static parseDuration(value: any): number {
    if (!value) return 0;
    if (typeof value === 'number') return Math.max(0, value);
    
    const cleanValue = String(value).trim().toLowerCase();
    
    // Tenta extrair número do valor
    const numMatch = cleanValue.match(/(\d+(?:\.\d+)?)/);
    if (!numMatch) return 0;
    
    const num = parseFloat(numMatch[1]);
    
    // Detecta unidades e converte para dias
    if (cleanValue.includes('semana') || cleanValue.includes('week')) {
      return num * 7;
    } else if (cleanValue.includes('mês') || cleanValue.includes('month')) {
      return num * 30;
    } else if (cleanValue.includes('ano') || cleanValue.includes('year')) {
      return num * 365;
    }
    
    // Default: assume dias
    return Math.max(0, num);
  }

  /**
   * Parseia dependências (lista de IDs ou nomes separados por vírgula/ponto-e-vírgula)
   */
  private static parseDependencies(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    
    const cleanValue = String(value).trim();
    if (!cleanValue) return [];
    
    // Separa por vírgula, ponto-e-vírgula ou quebra de linha
    return cleanValue
      .split(/[,;\n|]/)
      .map(dep => dep.trim())
      .filter(Boolean);
  }

  /**
   * Constrói hierarquia a partir dos nós agrupados
   */
  private static buildHierarchy(nodesByLevel: { [key: number]: any[] }, nodesMap: Map<string, TreeNode>): TreeNode | null {
    // Precisa ter pelo menos um nó de nível 1
    if (nodesByLevel[1].length === 0) return null;

    // Se há apenas um nó de nível 1, usa como raiz
    let rootNode: TreeNode;
    if (nodesByLevel[1].length === 1) {
      rootNode = nodesByLevel[1][0].node;
    } else {
      // Cria um nó raiz artificial
      rootNode = {
        id: uuidv4(),
        name: 'Projeto Importado',
        cost: 0,
        level: 1,
        children: nodesByLevel[1].map(item => item.node),
        totalCost: 0
      };
    }

    // Garante que todos os nós tenham children como array
    const ensureChildrenArray = (node: TreeNode) => {
      if (!Array.isArray(node.children)) {
        node.children = [];
      }
    };

    // Associa nós de nível 2 aos de nível 1
    nodesByLevel[2].forEach(item => {
      const node = item.node;
      ensureChildrenArray(node);
      // Estratégia simples: associa ao primeiro nível 1 disponível
      // Em implementação mais sofisticada, poderia usar proximidade de índices
      const parent = nodesByLevel[1][0]?.node || rootNode;
      ensureChildrenArray(parent);
      parent.children.push(node);
      node.parentId = parent.id;
    });

    // Associa nós de nível 3 aos de nível 2
    nodesByLevel[3].forEach(item => {
      const node = item.node;
      ensureChildrenArray(node);
      // Associa ao primeiro nível 2 disponível
      const parent = nodesByLevel[2][0]?.node || nodesByLevel[1][0]?.node || rootNode;
      ensureChildrenArray(parent);
      parent.children.push(node);
      node.parentId = parent.id;
    });

    // Garante que o rootNode tenha children
    ensureChildrenArray(rootNode);

    return rootNode;
  }

  /**
   * Valida e converte dados de JSON
   */
  private static validateAndConvertData(data: any): ImportResult {
    const errors: ImportValidationError[] = [];
    const warnings: ImportValidationError[] = [];

    if (!data || typeof data !== 'object') {
      return {
        success: false,
        errors: [{ message: 'Dados inválidos: esperado um objeto JSON', severity: 'error' }],
        warnings: []
      };
    }

    // Converte para TreeNode se necessário
    const convertedNode = this.ensureTreeNodeStructure(data, errors, warnings);
    
    if (!convertedNode) {
      return {
        success: false,
        errors: errors.length > 0 ? errors : [{ message: 'Não foi possível converter os dados', severity: 'error' }],
        warnings
      };
    }

    return {
      success: true,
      data: convertedNode,
      errors,
      warnings
    };
  }

  /**
   * Garante que o objeto tenha estrutura de TreeNode
   */
  private static ensureTreeNodeStructure(data: any, errors: ImportValidationError[], warnings: ImportValidationError[]): TreeNode | null {
    if (!data || typeof data !== 'object') {
      errors.push({ message: 'Dados inválidos: esperado um objeto', severity: 'error' });
      return null;
    }

    if (!data.name) {
      errors.push({ message: 'Campo "name" é obrigatório', severity: 'error' });
      return null;
    }

    // Garante propriedades obrigatórias
    const node: TreeNode = {
      id: data.id || uuidv4(),
      name: String(data.name).trim(),
      cost: typeof data.cost === 'number' ? data.cost : (parseFloat(data.cost) || 0),
      level: [1, 2, 3].includes(data.level) ? data.level : 1,
      children: [],
      totalCost: 0,
      parentId: data.parentId,
      description: data.description ? String(data.description).trim() : undefined,
      responsible: data.responsible ? String(data.responsible).trim() : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      status: data.status && ['not-started', 'in-progress', 'completed'].includes(data.status) ? data.status : undefined
    };

    // Valida datas
    if (node.startDate && isNaN(node.startDate.getTime())) {
      warnings.push({
        message: `Data de início inválida no nó "${node.name}"`,
        severity: 'warning'
      });
      node.startDate = undefined;
    }

    if (node.endDate && isNaN(node.endDate.getTime())) {
      warnings.push({
        message: `Data de fim inválida no nó "${node.name}"`,
        severity: 'warning'
      });
      node.endDate = undefined;
    }

    // Processa filhos recursivamente
    if (data.children && Array.isArray(data.children)) {
      data.children.forEach((child: any, index: number) => {
        const childNode = this.ensureTreeNodeStructure(child, errors, warnings);
        if (childNode) {
          childNode.parentId = node.id;
          node.children.push(childNode);
        } else {
          warnings.push({
            message: `Filho ${index + 1} do nó "${node.name}" não pôde ser processado`,
            severity: 'warning'
          });
        }
      });
    }

    // Garante que children seja sempre um array
    if (!Array.isArray(node.children)) {
      node.children = [];
    }

    return node;
  }

  /**
   * Gera resumo da importação
   */
  private static generateSummary(rootNode: TreeNode): ImportResult['summary'] {
    let totalNodes = 0;
    let level1Nodes = 0;
    let level2Nodes = 0;
    let level3Nodes = 0;

    const traverse = (node: TreeNode) => {
      totalNodes++;
      if (node.level === 1) level1Nodes++;
      else if (node.level === 2) level2Nodes++;
      else if (node.level === 3) level3Nodes++;

      node.children.forEach(traverse);
    };

    traverse(rootNode);

    return {
      totalNodes,
      level1Nodes,
      level2Nodes,
      level3Nodes,
      totalCost: rootNode.totalCost
    };
  }

  /**
   * Detecta formato do arquivo
   */
  static detectFileFormat(file: File): 'json' | 'excel' | 'csv' | 'unknown' {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'json':
        return 'json';
      case 'xlsx':
      case 'xls':
        return 'excel';
      case 'csv':
        return 'csv';
      default:
        return 'unknown';
    }
  }

  /**
   * Importa arquivo automaticamente baseado no formato
   */
  static async importFile(file: File): Promise<ImportResult> {
    const format = this.detectFileFormat(file);
    
    switch (format) {
      case 'json':
        return this.importFromJSON(file);
      case 'excel':
        return this.importFromExcel(file);
      case 'csv':
        return this.importFromCSV(file);
      default:
        return {
          success: false,
          errors: [{
            message: `Formato de arquivo não suportado: ${file.name}. Formatos aceitos: JSON, Excel (.xlsx/.xls), CSV`,
            severity: 'error'
          }],
          warnings: []
        };
    }
  }
} 