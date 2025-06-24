# WBS Dynamic Tree: Hierarchical Cost Management Platform

[![React](https://img.shields.io/badge/React-18+-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5+-blue.svg?style=for-the-badge&logo=antdesign)](https://ant.design/)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

WBS Dynamic Tree is a powerful web application designed to help project managers and teams create, manage, and visualize hierarchical Work Breakdown Structures (WBS) with automatic cost aggregation and advanced export capabilities.

---

## 🎯 Key Features

- **📊 Dynamic Hierarchical Structure**: Create unlimited 3-level hierarchical structures with parent-child relationships
- **💰 Automatic Cost Aggregation**: Real-time cost calculation and rollup from child to parent nodes
- **📤 Multi-format Export**: Export to Excel (.xlsx), JSON, and CSV with professional formatting
- **📥 Smart Import**: Import existing structures from Excel, CSV, or JSON with automatic column detection
- **📈 Gantt Visualization**: Timeline view of your project structure with dependencies
- **🎨 Modern Interface**: Clean, intuitive UI built with Ant Design components
- **⚡ Real-time Updates**: Instant recalculation of costs and totals as you edit
- **🔍 Data Validation**: Built-in validation to ensure data consistency and integrity

<img src="screenshots/main-dashboard.png" alt="WBS Dynamic Tree Dashboard" width="100%">

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/wbs-dynamic-tree.git

# Navigate to project directory
cd wbs-dynamic-tree

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3000`

## 📚 Usage

### Creating a Project Structure

1. **Add Root Level Items**: Start by creating your main project phases or categories
2. **Build Hierarchy**: Add sub-items under each main category
3. **Add Details**: Include costs, descriptions, and responsible parties
4. **Automatic Calculation**: Watch as costs automatically roll up to parent levels

<img src="screenshots/tree-editing.png" alt="Creating and editing tree structure" width="100%">

### Example Structure

```
Software Development Project
├── 📋 Planning Phase                    ($8,000)
│   ├── Requirements Analysis           ($5,000)
│   └── Technical Documentation         ($3,000)
├── 💻 Development Phase                 ($35,000)
│   ├── Frontend Development            ($15,000)
│   ├── Backend Development             ($12,000)
│   └── Database Design                 ($8,000)
└── 🧪 Testing Phase                     ($10,000)
    ├── Unit Testing                    ($4,000)
    └── Integration Testing             ($6,000)

Total Project Cost: $53,000 (auto-calculated)
```

### Importing Data

WBS Dynamic Tree supports multiple import formats:

**Excel/CSV Import**
- Automatic column detection for Name, Level, Cost, Description
- Hierarchical structure recognition through indentation or numbering
- Data validation and preview before import confirmation

<img src="screenshots/import-process.png" alt="Import data from Excel or CSV" width="100%">

<img src="screenshots/import-process-data.png" alt="Import data from Excel or CSV" width="100%">

**JSON Import**
- Complete structure import with all metadata
- Preserves all custom fields and relationships
- Perfect for backing up and restoring projects

### Exporting Your Work

**Excel Export**: Professional spreadsheets with:
- Hierarchical formatting and indentation
- Cost breakdown and summary tables
- Formulas for automatic calculations
- Custom styling and colors

**JSON Export**: Complete data export for:
- System integration and API usage
- Backup and version control
- Data migration between environments

### Gantt Chart Visualization

View your project structure as a timeline with:
- Task dependencies and relationships
- Duration and milestone tracking
- Critical path visualization
- Resource allocation overview

<img src="screenshots/gantt-chart.png" alt="Gantt chart visualization" width="100%">

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript for type-safe, modern UI
- **UI Components**: Ant Design for professional, accessible interface
- **Data Processing**: XLSX.js for Excel manipulation without backend
- **Visualization**: Gantt-Task-React for project timeline views
- **State Management**: React Context and Hooks for efficient data flow

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── TreeView.tsx     # Main tree display component
│   ├── TreeNode.tsx     # Individual node component
│   ├── GanttChart.tsx   # Timeline visualization
│   └── ImportWBS.tsx    # Data import interface
├── services/            # Business logic and utilities
│   ├── exportService.ts # Export functionality
│   ├── importService.ts # Import processing
│   └── ganttService.ts  # Gantt chart data processing
├── types/               # TypeScript type definitions
├── utils/               # Helper functions
└── data/                # Sample data and templates
```

## 📊 Performance & Scalability

- **Handles 1000+ nodes** without performance degradation
- **Real-time calculations** with optimized algorithms
- **Memory efficient** tree traversal and updates
- **Responsive design** works on desktop, tablet, and mobile

## 🤝 Contributing

We welcome contributions to WBS Dynamic Tree! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check our [Wiki](https://github.com/your-username/wbs-dynamic-tree/wiki) for detailed guides
- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/your-username/wbs-dynamic-tree/issues)
- **Discussions**: Join the community in [GitHub Discussions](https://github.com/your-username/wbs-dynamic-tree/discussions)

---

**Built with ❤️ using React, TypeScript, and Ant Design** 