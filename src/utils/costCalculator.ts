import { TreeNode } from '../types';
import { DateCalculator } from './dateCalculator';

export class CostCalculator {
  /**
   * Calcula o custo total de um nó e seus filhos
   */
  static calculateTotalCost(node: TreeNode): number {
    // Se é nó folha (nível 3), retorna apenas o custo próprio
    if (node.level === 3 || node.children.length === 0) {
      return node.cost;
    }

    // Para nós intermediários, soma o custo próprio + custos dos filhos
    const childrenCost = node.children.reduce((total, child) => {
      return total + this.calculateTotalCost(child);
    }, 0);

    return node.cost + childrenCost;
  }

  /**
   * Atualiza todos os custos totais na árvore
   */
  static updateAllTotalCosts(rootNode: TreeNode): TreeNode {
    const updateNode = (node: TreeNode): TreeNode => {
      const updatedChildren = node.children.map(child => updateNode(child));
      
      // Calcula duração automaticamente se não estiver definida
      let updatedDurationDays = node.durationDays;
      if (!updatedDurationDays && node.startDate && node.endDate) {
        updatedDurationDays = DateCalculator.calculateDurationDays(node.startDate, node.endDate);
      }
      
      return {
        ...node,
        children: updatedChildren,
        durationDays: updatedDurationDays,
        totalCost: this.calculateTotalCost({
          ...node,
          children: updatedChildren
        })
      };
    };

    return updateNode(rootNode);
  }

  /**
   * Obtém breakdown de custos por nível
   */
  static getCostBreakdown(node: TreeNode): {
    level1: number;
    level2: number;
    level3: number;
    total: number;
  } {
    let level1Cost = 0;
    let level2Cost = 0;
    let level3Cost = 0;

    const traverse = (currentNode: TreeNode) => {
      switch (currentNode.level) {
        case 1:
          level1Cost += currentNode.cost;
          break;
        case 2:
          level2Cost += currentNode.cost;
          break;
        case 3:
          level3Cost += currentNode.cost;
          break;
      }

      currentNode.children.forEach(child => traverse(child));
    };

    traverse(node);

    return {
      level1: level1Cost,
      level2: level2Cost,
      level3: level3Cost,
      total: level1Cost + level2Cost + level3Cost
    };
  }

  /**
   * Processa completamente um nó da árvore, calculando custos, datas e durações
   */
  static processCompleteNode(rootNode: TreeNode): TreeNode {
    // Primeiro, atualiza custos e durações
    let processedNode = this.updateAllTotalCosts(rootNode);
    
    // Depois, calcula datas agregadas para nós pais
    const updateDatesRecursively = (node: TreeNode): TreeNode => {
      const updatedChildren = node.children.map(child => updateDatesRecursively(child));
      
      let updatedNode = {
        ...node,
        children: updatedChildren
      };
      
      // Se é um nó pai com filhos, calcula datas agregadas
      if (updatedChildren.length > 0) {
        updatedNode = DateCalculator.calculateAggregatedDates(updatedNode);
      }
      
      return updatedNode;
    };
    
    return updateDatesRecursively(processedNode);
  }
} 