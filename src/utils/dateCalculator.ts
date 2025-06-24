import { TreeNode } from '../types';

export class DateCalculator {
  /**
   * Calcula a duração em dias entre duas datas
   */
  static calculateDurationDays(startDate: Date, endDate: Date): number {
    if (!startDate || !endDate) return 0;
    
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(0, daysDiff);
  }

  /**
   * Calcula a data de fim baseada na data de início e duração
   */
  static calculateEndDate(startDate: Date, durationDays: number): Date {
    if (!startDate || !durationDays) return startDate;
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    
    return endDate;
  }

  /**
   * Calcula a data de início baseada na data de fim e duração
   */
  static calculateStartDate(endDate: Date, durationDays: number): Date {
    if (!endDate || !durationDays) return endDate;
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - durationDays);
    
    return startDate;
  }

  /**
   * Atualiza automaticamente datas e durações em um nó
   */
  static updateNodeDates(node: TreeNode, changedField: 'startDate' | 'endDate' | 'duration'): TreeNode {
    const updatedNode = { ...node };

    switch (changedField) {
      case 'startDate':
        if (updatedNode.startDate && updatedNode.durationDays) {
          updatedNode.endDate = this.calculateEndDate(updatedNode.startDate, updatedNode.durationDays);
        } else if (updatedNode.startDate && updatedNode.endDate) {
          updatedNode.durationDays = this.calculateDurationDays(updatedNode.startDate, updatedNode.endDate);
        }
        break;

      case 'endDate':
        if (updatedNode.endDate && updatedNode.durationDays) {
          updatedNode.startDate = this.calculateStartDate(updatedNode.endDate, updatedNode.durationDays);
        } else if (updatedNode.startDate && updatedNode.endDate) {
          updatedNode.durationDays = this.calculateDurationDays(updatedNode.startDate, updatedNode.endDate);
        }
        break;

      case 'duration':
        if (updatedNode.startDate && updatedNode.durationDays) {
          updatedNode.endDate = this.calculateEndDate(updatedNode.startDate, updatedNode.durationDays);
        } else if (updatedNode.endDate && updatedNode.durationDays) {
          updatedNode.startDate = this.calculateStartDate(updatedNode.endDate, updatedNode.durationDays);
        }
        break;
    }

    return updatedNode;
  }

  /**
   * Calcula datas agregadas de um nó baseado nos filhos
   */
  static calculateAggregatedDates(node: TreeNode): TreeNode {
    if (!node.children || node.children.length === 0) {
      return node;
    }

    const updatedNode = { ...node };
    const childrenWithDates = node.children.filter(child => child.startDate || child.endDate);

    if (childrenWithDates.length === 0) {
      return updatedNode;
    }

    // Data de início mais cedo dos filhos
    const earliestStart = childrenWithDates
      .filter(child => child.startDate)
      .map(child => child.startDate!)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    // Data de fim mais tarde dos filhos
    const latestEnd = childrenWithDates
      .filter(child => child.endDate)
      .map(child => child.endDate!)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (earliestStart) {
      updatedNode.startDate = earliestStart;
    }

    if (latestEnd) {
      updatedNode.endDate = latestEnd;
    }

    // Recalcula duração baseada nas datas agregadas
    if (updatedNode.startDate && updatedNode.endDate) {
      updatedNode.durationDays = this.calculateDurationDays(updatedNode.startDate, updatedNode.endDate);
    }

    return updatedNode;
  }

  /**
   * Encontra um nó na árvore pelo ID
   */
  static findNodeById(rootNode: TreeNode, nodeId: string): TreeNode | null {
    if (rootNode.id === nodeId) {
      return rootNode;
    }

    for (const child of rootNode.children) {
      const found = this.findNodeById(child, nodeId);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Valida se as dependências são válidas (não circulares e existem)
   */
  static validateDependencies(rootNode: TreeNode, nodeId: string, dependencies: string[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Verifica se o nó não depende de si mesmo
    if (dependencies.includes(nodeId)) {
      errors.push('Um nó não pode depender de si mesmo');
    }

    // Verifica se todas as dependências existem
    for (const depId of dependencies) {
      const depNode = this.findNodeById(rootNode, depId);
      if (!depNode) {
        errors.push(`Dependência não encontrada: ${depId}`);
      }
    }

    // Verifica dependências circulares (básico)
    const node = this.findNodeById(rootNode, nodeId);
    if (node) {
      for (const depId of dependencies) {
        const depNode = this.findNodeById(rootNode, depId);
        if (depNode?.dependencies?.includes(nodeId)) {
          errors.push(`Dependência circular detectada com: ${depNode.name}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcula a data de início mais cedo possível baseada nas dependências
   */
  static calculateEarliestStartDate(rootNode: TreeNode, nodeId: string): Date | null {
    const node = this.findNodeById(rootNode, nodeId);
    
    if (!node?.dependencies || node.dependencies.length === 0) {
      return null; // Não há restrições de dependência
    }

    let latestDependencyEnd: Date | null = null;

    for (const depId of node.dependencies) {
      const depNode = this.findNodeById(rootNode, depId);
      if (depNode?.endDate) {
        if (!latestDependencyEnd || depNode.endDate > latestDependencyEnd) {
          latestDependencyEnd = depNode.endDate;
        }
      }
    }

    // Adiciona 1 dia após a última dependência terminar
    if (latestDependencyEnd) {
      const earliestStart = new Date(latestDependencyEnd);
      earliestStart.setDate(earliestStart.getDate() + 1);
      return earliestStart;
    }

    return null;
  }

  /**
   * Obtém lista de todos os nós para seleção de dependências
   */
  static getAllNodesForDependencies(rootNode: TreeNode, excludeNodeId?: string): Array<{
    id: string;
    name: string;
    level: number;
    path: string;
  }> {
    const nodes: Array<{ id: string; name: string; level: number; path: string }> = [];

    const traverse = (node: TreeNode, path: string = '') => {
      const currentPath = path ? `${path} > ${node.name}` : node.name;
      
      if (node.id !== excludeNodeId) {
        nodes.push({
          id: node.id,
          name: node.name,
          level: node.level,
          path: currentPath
        });
      }

      node.children.forEach(child => traverse(child, currentPath));
    };

    traverse(rootNode);
    return nodes;
  }

  /**
   * Formata duração para exibição legível
   */
  static formatDuration(days: number): string {
    if (days === 0) return '0 dias';
    if (days === 1) return '1 dia';
    
    if (days >= 7) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      
      let result = `${weeks} semana${weeks > 1 ? 's' : ''}`;
      if (remainingDays > 0) {
        result += ` e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`;
      }
      return result;
    }
    
    return `${days} dias`;
  }

  /**
   * Converte duração de diferentes unidades para dias
   */
  static convertToDays(value: number, unit: 'days' | 'weeks' | 'months'): number {
    switch (unit) {
      case 'days':
        return value;
      case 'weeks':
        return value * 7;
      case 'months':
        return value * 30; // Aproximação
      default:
        return value;
    }
  }
} 