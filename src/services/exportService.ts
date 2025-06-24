import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { TreeNode, ExportOptions } from '../types';
import { CostCalculator } from '../utils/costCalculator';

export class ExportService {
  /**
   * Exporta para Excel
   */
  static exportToExcel(rootNode: TreeNode, filename: string = 'wbs-structure.xlsx', options: ExportOptions) {
    const workbook = XLSX.utils.book_new();
    
    // Aba principal com estrutura hierárquica
    const mainData = this.flattenTreeForExcel(rootNode, options.includeMetadata);
    const mainSheet = XLSX.utils.json_to_sheet(mainData);
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Estrutura WBS');

    // Aba com breakdown de custos se solicitado
    if (options.includeCostBreakdown) {
      const costBreakdown = CostCalculator.getCostBreakdown(rootNode);
      const costData = [
        { Nível: 'Nível 1', Custo: costBreakdown.level1 },
        { Nível: 'Nível 2', Custo: costBreakdown.level2 },
        { Nível: 'Nível 3', Custo: costBreakdown.level3 },
        { Nível: 'Total', Custo: costBreakdown.total }
      ];
      const costSheet = XLSX.utils.json_to_sheet(costData);
      XLSX.utils.book_append_sheet(workbook, costSheet, 'Breakdown Custos');
    }

    // Gera e baixa o arquivo
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  }

  /**
   * Converte árvore para formato plano para Excel
   */
  private static flattenTreeForExcel(node: TreeNode, includeMetadata: boolean = false): any[] {
    const result: any[] = [];
    
    const traverse = (currentNode: TreeNode, path: string = '') => {
      const currentPath = path ? `${path} > ${currentNode.name}` : currentNode.name;
      
      const baseData = {
        ID: currentNode.id,
        Nível: currentNode.level,
        Caminho: currentPath,
        Nome: currentNode.name,
        'Custo Próprio': currentNode.cost,
        'Custo Total': currentNode.totalCost,
        'Possui Filhos': currentNode.children.length > 0 ? 'Sim' : 'Não'
      };

      if (includeMetadata) {
        Object.assign(baseData, {
          Descrição: currentNode.description || '',
          'Data Início': currentNode.startDate ? currentNode.startDate.toLocaleDateString() : '',
          'Data Fim': currentNode.endDate ? currentNode.endDate.toLocaleDateString() : '',
          Responsável: currentNode.responsible || '',
          Status: currentNode.status || ''
        });
      }

      result.push(baseData);
      
      currentNode.children.forEach(child => traverse(child, currentPath));
    };

    traverse(node);
    return result;
  }

  /**
   * Prepara dados para Gantt Chart
   */
  static prepareGanttData(rootNode: TreeNode) {
    const tasks: any[] = [];
    
    const traverse = (node: TreeNode, parentId?: string) => {
      tasks.push({
        id: node.id,
        name: node.name,
        start: node.startDate || new Date(),
        end: node.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias default
        progress: node.status === 'completed' ? 100 : node.status === 'in-progress' ? 50 : 0,
        type: node.children.length > 0 ? 'project' : 'task',
        project: parentId || undefined,
        dependencies: []
      });

      node.children.forEach(child => traverse(child, node.id));
    };

    traverse(rootNode);
    return tasks;
  }

  /**
   * Exporta para JSON
   */
  static exportToJSON(rootNode: TreeNode, filename: string = 'wbs-structure.json') {
    const jsonData = JSON.stringify(rootNode, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    saveAs(blob, filename);
  }
} 