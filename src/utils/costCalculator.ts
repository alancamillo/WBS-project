import { TreeNode } from '../types';
import { DateCalculator } from './dateCalculator';

export class CostCalculator {
  /**
   * Calcula o custo total de um nó e seus filhos
   */
  static calculateTotalCost(node: TreeNode): number {
    const ownCost = node.cost || 0;

    // Se não tiver filhos, o custo total é apenas o seu próprio custo.
    if (!node.children || node.children.length === 0) {
      return ownCost;
    }

    // Se tiver filhos, o custo total é o seu próprio custo mais o custo total de cada filho.
    const childrenCost = node.children.reduce((total, child) => {
      return total + this.calculateTotalCost(child);
    }, 0);

    return ownCost + childrenCost;
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
      const currentCost = currentNode.cost || 0;
      switch (currentNode.level) {
        case 1:
          level1Cost += currentCost;
          break;
        case 2:
          level2Cost += currentCost;
          break;
        case 3:
          level3Cost += currentCost;
          break;
      }

      currentNode.children.forEach(child => traverse(child));
    };

    traverse(node);

    return {
      level1: level1Cost,
      level2: level2Cost,
      level3: level3Cost,
      total: node.totalCost || 0
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