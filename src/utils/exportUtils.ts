import type { Project, LineItem, SubTask } from '../types';
import { format } from 'date-fns';

export const exportToExcel = (project: Project): void => {
  // Create CSV content
  const headers = [
    'Task #',
    'Task Name',
    'Start Date',
    'End Date',
    'Duration (days)',
    'Status',
    'Team',
    'DRI',
    'Progress %',
    'Predecessor',
    'Notes'
  ];

  const rows: string[][] = [];

  project.lineItems.forEach((item, itemIndex) => {
    // Add parent task
    const predecessors = item.dependencies
      .map(dep => {
        const taskNum = getTaskNumber(project, dep.taskId);
        return `${taskNum} (${dep.type})`;
      })
      .join('; ');

    rows.push([
      `${itemIndex + 1}`,
      item.name,
      format(item.startDate, 'yyyy-MM-dd'),
      format(item.endDate, 'yyyy-MM-dd'),
      item.duration.toString(),
      item.status,
      getTeamName(project, item.teamId),
      getPersonName(project, item.driId),
      item.progress.toString(),
      predecessors,
      item.notes || ''
    ]);

    // Add subtasks
    item.subtasks.forEach((subtask, subIndex) => {
      const subPredecessors = subtask.dependencies
        .map(dep => {
          const taskNum = getTaskNumber(project, dep.taskId);
          return `${taskNum} (${dep.type})`;
        })
        .join('; ');

      rows.push([
        `${itemIndex + 1}.${subIndex + 1}`,
        `  ${subtask.name}`,
        format(subtask.startDate, 'yyyy-MM-dd'),
        format(subtask.endDate, 'yyyy-MM-dd'),
        subtask.duration.toString(),
        subtask.status,
        getTeamName(project, subtask.teamId),
        getPersonName(project, subtask.driId),
        subtask.progress.toString(),
        subPredecessors,
        subtask.notes || ''
      ]);
    });
  });

  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${project.name.replace(/\s+/g, '-')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (project: Project): void => {
  // For PDF export, we'll use the browser's print functionality
  // Create a printable view
  const printWindow = window.open('', '', 'height=600,width=800');

  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${project.name} - Project Plan</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        h1 {
          color: #333;
          border-bottom: 2px solid #4CAF50;
          padding-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #4CAF50;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        .subtask {
          padding-left: 30px;
          font-style: italic;
        }
        .project-info {
          margin-bottom: 20px;
          color: #666;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <h1>${project.name}</h1>
      <div class="project-info">
        <p><strong>Description:</strong> ${project.description}</p>
        <p><strong>Start Date:</strong> ${format(project.startDate, 'MMM dd, yyyy')}</p>
        <p><strong>End Date:</strong> ${format(project.endDate, 'MMM dd, yyyy')}</p>
        <p><strong>Exported:</strong> ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Task Name</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Duration</th>
            <th>Status</th>
            <th>Team</th>
            <th>DRI</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${generateTableRows(project)}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 250);
};

const generateTableRows = (project: Project): string => {
  let html = '';

  project.lineItems.forEach((item, itemIndex) => {
    html += `
      <tr>
        <td>${itemIndex + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${format(item.startDate, 'MMM dd, yyyy')}</td>
        <td>${format(item.endDate, 'MMM dd, yyyy')}</td>
        <td>${item.duration}</td>
        <td>${item.status}</td>
        <td>${getTeamName(project, item.teamId)}</td>
        <td>${getPersonName(project, item.driId)}</td>
        <td>${item.progress}%</td>
      </tr>
    `;

    item.subtasks.forEach((subtask, subIndex) => {
      html += `
        <tr>
          <td>${itemIndex + 1}.${subIndex + 1}</td>
          <td class="subtask">${subtask.name}</td>
          <td>${format(subtask.startDate, 'MMM dd, yyyy')}</td>
          <td>${format(subtask.endDate, 'MMM dd, yyyy')}</td>
          <td>${subtask.duration}</td>
          <td>${subtask.status}</td>
          <td>${getTeamName(project, subtask.teamId)}</td>
          <td>${getPersonName(project, subtask.driId)}</td>
          <td>${subtask.progress}%</td>
        </tr>
      `;
    });
  });

  return html;
};

const getTaskNumber = (project: Project, taskId: string): string => {
  for (let i = 0; i < project.lineItems.length; i++) {
    const item = project.lineItems[i];
    if (item.id === taskId) {
      return `${i + 1}`;
    }
    for (let j = 0; j < item.subtasks.length; j++) {
      if (item.subtasks[j].id === taskId) {
        return `${i + 1}.${j + 1}`;
      }
    }
  }
  return '';
};

const getTeamName = (project: Project, teamId: string): string => {
  const team = project.teams.find(t => t.id === teamId);
  return team?.name || '';
};

const getPersonName = (project: Project, personId: string): string => {
  const person = project.people.find(p => p.id === personId);
  return person?.name || '';
};
