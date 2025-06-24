import { TreeNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const createSampleProject = (): TreeNode => {
  const projectId = uuidv4();
  
  return {
    id: projectId,
    name: 'Project Management',
    cost: 5000,
    level: 1,
    children: [
      {
        id: uuidv4(),
        name: '1. Plan and Design',
        cost: 2000,
        level: 2,
        parentId: projectId,
        children: [
          {
            id: uuidv4(),
            name: 'A. Scope of Project',
            cost: 3000,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 3000
          },
          {
            id: uuidv4(),
            name: 'B. Identify Deliverables',
            cost: 2500,
            level: 3,
            parentId: uuidv4(),
            children: [],
            totalCost: 2500
          },
          {
            id: uuidv4(),
            name: 'C. Work Breakdown',
            cost: 1800,
            level: 3,
            parentId: uuidv4(),
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