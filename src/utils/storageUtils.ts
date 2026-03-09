import type { Project, UIState } from '../types';
import { STORAGE_KEYS } from '../constants';

interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  updatedAt: Date;
}

const DATE_FIELDS = ['startDate', 'endDate', 'createdAt', 'updatedAt'];

const dateReplacer = (_key: string, value: unknown): unknown => {
  return value instanceof Date ? value.toISOString() : value;
};

const dateReviver = (key: string, value: unknown): unknown => {
  if (typeof value === 'string' && DATE_FIELDS.includes(key)) {
    return new Date(value);
  }
  return value;
};

export const saveProjectToStorage = (project: Project): void => {
  try {
    const serialized = JSON.stringify(project, dateReplacer);
    localStorage.setItem(`${STORAGE_KEYS.PROJECT}-${project.id}`, serialized);

    // Update projects list
    const projectsList = loadProjectsList();
    const existingIndex = projectsList.findIndex(p => p.id === project.id);
    const projectListItem: ProjectListItem = {
      id: project.id,
      name: project.name,
      description: project.description,
      updatedAt: project.updatedAt,
    };

    if (existingIndex >= 0) {
      projectsList[existingIndex] = projectListItem;
    } else {
      projectsList.push(projectListItem);
    }

    localStorage.setItem(STORAGE_KEYS.PROJECTS_LIST, JSON.stringify(projectsList, dateReplacer));
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, project.id);
  } catch (error) {
    console.error('Failed to save project to localStorage:', error);
    throw new Error('Failed to save project data');
  }
};

export const loadProjectFromStorage = (projectId?: string): Project | null => {
  try {
    let id = projectId;

    // If no ID provided, try to load the current project
    if (!id) {
      id = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT_ID) || undefined;
    }

    if (!id) {
      // Try to load the legacy single project
      const legacyProject = localStorage.getItem(STORAGE_KEYS.PROJECT);
      if (legacyProject) {
        return JSON.parse(legacyProject, dateReviver) as Project;
      }
      return null;
    }

    const serialized = localStorage.getItem(`${STORAGE_KEYS.PROJECT}-${id}`);
    if (!serialized) return null;
    return JSON.parse(serialized, dateReviver) as Project;
  } catch (error) {
    console.error('Failed to load project from localStorage:', error);
    return null;
  }
};

export const loadProjectsList = (): ProjectListItem[] => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.PROJECTS_LIST);
    if (!serialized) return [];
    return JSON.parse(serialized, dateReviver) as ProjectListItem[];
  } catch (error) {
    console.error('Failed to load projects list from localStorage:', error);
    return [];
  }
};

export const deleteProjectFromStorage = (projectId: string): void => {
  try {
    // Remove the project data
    localStorage.removeItem(`${STORAGE_KEYS.PROJECT}-${projectId}`);

    // Update projects list
    const projectsList = loadProjectsList();
    const updatedList = projectsList.filter(p => p.id !== projectId);
    localStorage.setItem(STORAGE_KEYS.PROJECTS_LIST, JSON.stringify(updatedList, dateReplacer));

    // Clear current project ID if it's the one being deleted
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    if (currentId === projectId) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    }
  } catch (error) {
    console.error('Failed to delete project from localStorage:', error);
  }
};

export const saveUIStateToStorage = (uiState: UIState): void => {
  try {
    const serialized = JSON.stringify(uiState);
    localStorage.setItem(STORAGE_KEYS.UI_STATE, serialized);
  } catch (error) {
    console.error('Failed to save UI state to localStorage:', error);
  }
};

export const loadUIStateFromStorage = (): UIState | null => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.UI_STATE);
    if (!serialized) return null;
    return JSON.parse(serialized) as UIState;
  } catch (error) {
    console.error('Failed to load UI state from localStorage:', error);
    return null;
  }
};

export const clearStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROJECT);
    localStorage.removeItem(STORAGE_KEYS.UI_STATE);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

export const exportProjectAsJSON = (project: Project): void => {
  const dataStr = JSON.stringify(project, dateReplacer, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().getTime()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importProjectFromJSON = (file: File): Promise<Project> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const project = JSON.parse(content, dateReviver) as Project;
        resolve(project);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
