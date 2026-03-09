# Project Management Tool

A Microsoft Project-style project management application built with React, TypeScript, and Tailwind CSS. Manage multiple projects with tasks, inline editing, and visualize your project timeline with an integrated Gantt chart.

## Features

- **Multiple Projects**: Create, manage, and switch between multiple projects
- **Project List**: View all your projects with quick access to open or delete them
- **Auto-Date Calculations**:
  - Enter start date + end date → duration auto-calculates in work days
  - Enter start date + duration → end date auto-calculates
  - Duration calculated excluding weekends (business days only)
- **Inline Editing**: Click any cell to edit directly - no modals needed for quick edits
- **Tab Views**: Switch between List view (task table) and Gantt chart view
- **Quick Task Creation**: Click "+ Add New Task" to instantly add a row
- **Unlimited Subtasks**: Add as many subtasks as needed under any task
- **Expandable Tasks**: Click ▶ to expand tasks and see their subtasks
- **Detailed Task View**: Click "Details" button to open detailed editing modal with notes and external links
- **Dependency Visualization**: Visual lines with arrows in Gantt chart showing task dependencies

## Task Fields

Each task includes:
- **#**: Auto-numbered rows (1, 1.1, 1.2 for subtasks)
- **Name**: Task name (click to edit inline)
- **Start Date**: Date picker for easy selection
- **End Date**: Editable date field (auto-calculates from start + duration if not set)
- **Duration (days)**: Number of work days (auto-calculates from start + end dates, or calculates end date from start + duration)
- **Status**: Dropdown with 5 statuses (Not Started, In Progress, Blocked, Complete, On Hold)
- **Team**: Text input for team name
- **DRI**: Text input for person name
- **Predecessor**: Shows task dependencies (dependencies visible in Gantt chart)
- **Actions**: Details button, add subtasks, or delete tasks
- **Notes**: Additional notes in detail view
- **External Links**: External ticket links, JIRA tickets, or other references in detail view

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser

### Build

```bash
npm run build
```

## How to Use

### First Time Setup

1. Enter your project name and description
2. Click "Create Project"

### Managing Multiple Projects

1. Click "Back to Projects" button in the header to return to the project list
2. From the project list, you can:
   - Click "+ Create New Project" to start a new project
   - Click on any project card or "Open" button to open an existing project
   - Click "Delete" to remove a project permanently
3. Projects are auto-saved to your browser's Local Storage

### Adding Tasks

1. Click "+ Add New Task" at the bottom of the table
2. A new row appears with default values
3. Click any cell to edit inline
4. Press Enter to save, Escape to cancel

### Editing Tasks Inline

- **Quick Edit**: Click any cell (Name, Start Date, End Date, Duration, Status, Team, DRI)
- Input appears inline for immediate editing
- Press Enter to save, Escape to cancel
- Changes save automatically
- **Auto-Calculations**:
  - Change Start Date + End Date → Duration updates in work days
  - Change Start Date + Duration → End Date calculates automatically
  - Weekends are excluded from duration calculations

### Detailed Task Editing

- **Click "Details" button** in the Actions column to open the detailed edit modal
- Edit all fields including notes and external links
- View and edit start date, end date, duration, status, team, DRI
- Add notes for additional context
- Add external links/tickets (JIRA, GitHub issues, etc.)
- Save changes or cancel

### Adding Subtasks

1. Click "+Sub" button on any task row
2. A subtask appears indented under the parent task
3. Edit the subtask just like a regular task
4. Parent task automatically expands to show subtasks

### Expanding/Collapsing Tasks

- Click the ▶ arrow next to a task name to expand
- Click ▼ to collapse and hide subtasks
- Subtasks are indented and numbered (e.g., 1.1, 1.2)

### Viewing the Gantt Chart

- Click the Gantt icon in the header to switch to timeline view
- Shows all tasks positioned by start/end dates
- Color-coded by status
- Displays progress percentage
- Weekend days are highlighted
- Subtasks appear below their parent tasks
- **Dependency lines with arrows** connect predecessor tasks to dependent tasks
- Click the List icon to return to table view

### Deleting Tasks

- Click "Del" button on any row
- Confirm deletion
- Deleting a parent task removes all its subtasks

## Column Order

1. **#** - Row number
2. **Name** - Task name
3. **Start Date** - When the task starts
4. **End Date** - When the task ends (editable)
5. **Duration (days)** - Work days to complete (excluding weekends)
6. **Status** - Current status (dropdown)
7. **Team** - Team name (text input)
8. **DRI** - Person responsible (text input)
9. **Predecessor** - Task dependencies
10. **Actions** - Details / Add subtask / Delete

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **date-fns** - Date manipulation
- **framer-motion** - Animations

## Data Storage

- All projects are saved automatically to browser Local Storage
- Each project is stored separately with a unique ID
- Your projects persist between sessions
- No server or database required
- Works completely offline
- Project list shows all your projects with last updated timestamp

## Tips

- **Keyboard Navigation**: Use Tab to move between cells
- **Quick Edit**: Single-click any cell to edit inline
- **Detailed Edit**: Click "Details" button to open full edit modal with notes and external links
- **Progress Tracking**: Parent task progress is auto-calculated from subtasks
- **Date Calculations**:
  - Duration updates when you change both start and end dates
  - End date updates when you change start date or duration
  - All calculations use business days (excluding weekends)
- **Visual Feedback**: Hover over cells to see edit cursor
- **Project Switching**: Use "Back to Projects" button to switch between projects
- **Dependency Tracking**: Set predecessors and see visual connections in Gantt view

## Future Enhancements

- Editable predecessor/dependency field with dropdown selector
- Advanced dependency line visualization in Gantt
- Drag-and-drop task reordering
- Gantt bar drag-and-drop for timeline adjustments
- Critical path highlighting
- Export to Excel/CSV
- Import from MS Project
- Project templates
- Dark mode
- Undo/Redo
- Search and filter
- Custom fields
- Resource allocation
- Team collaboration features
- Cloud sync option

## License

MIT
