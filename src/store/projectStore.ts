import { create } from 'zustand';
import type { Project, Team, Person } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { saveProjectToStorage, loadProjectFromStorage, deleteProjectFromStorage } from '../utils/storageUtils';
import { STORAGE_KEYS } from '../constants';

// Sentinel date to indicate "no date set"
const SENTINEL_DATE = new Date(1900, 0, 1);

interface ProjectStore {
  project: Project | null;
  setProject: (project: Project) => void;
  loadProject: (projectId: string) => void;
  initializeProject: (name: string, description: string) => void;
  updateProjectInfo: (updates: Partial<Pick<Project, 'name' | 'description'>>) => void;
  addTeam: (team: Omit<Team, 'id'>) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  addPerson: (person: Omit<Person, 'id'>) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  deleteProject: (projectId: string) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,

  setProject: (project) => {
    set({ project });
    get().saveToStorage();
  },

  loadProject: (projectId) => {
    const project = loadProjectFromStorage(projectId);
    if (project) {
      set({ project });
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, project.id);
    }
  },

  initializeProject: (name, description) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      description,
      startDate: SENTINEL_DATE,
      endDate: SENTINEL_DATE,
      lineItems: [],
      teams: [],
      people: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set({ project: newProject });
    get().saveToStorage();
  },

  updateProjectInfo: (updates) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        ...updates,
        updatedAt: new Date(),
      },
    });
    get().saveToStorage();
  },

  addTeam: (teamData) => {
    const { project } = get();
    if (!project) return;

    const newTeam: Team = {
      id: uuidv4(),
      ...teamData,
    };

    set({
      project: {
        ...project,
        teams: [...project.teams, newTeam],
        updatedAt: new Date(),
      },
    });
    get().saveToStorage();
  },

  updateTeam: (id, updates) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        teams: project.teams.map(team =>
          team.id === id ? { ...team, ...updates } : team
        ),
        updatedAt: new Date(),
      },
    });
    get().saveToStorage();
  },

  deleteTeam: (id) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        teams: project.teams.filter(team => team.id !== id),
        updatedAt: new Date(),
      },
    });
    get().saveToStorage();
  },

  addPerson: (personData) => {
    const { project } = get();
    if (!project) return;

    const newPerson: Person = {
      id: uuidv4(),
      ...personData,
    };

    set({
      project: {
        ...project,
        people: [...project.people, newPerson],
        updatedAt: new Date(),
      },
    });
    get().saveToStorage();
  },

  updatePerson: (id, updates) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        people: project.people.map(person =>
          person.id === id ? { ...person, ...updates } : person
        ),
        updatedAt: new Date(),
      },
    });
    get().saveToStorage();
  },

  deletePerson: (id) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        people: project.people.filter(person => person.id !== id),
        updatedAt: new Date(),
      },
    });
    get().saveToStorage();
  },

  loadFromStorage: () => {
    const project = loadProjectFromStorage();
    if (project) {
      set({ project });
    }
  },

  saveToStorage: () => {
    const { project } = get();
    if (project) {
      saveProjectToStorage(project);
    }
  },

  deleteProject: (projectId) => {
    deleteProjectFromStorage(projectId);
    const { project } = get();
    if (project && project.id === projectId) {
      set({ project: null });
    }
  },

  clearProject: () => {
    set({ project: null });
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    localStorage.removeItem(STORAGE_KEYS.PROJECT_SETUP_VIEW);
    localStorage.removeItem(STORAGE_KEYS.PROJECT); // Remove legacy project key
    // Don't remove CURRENT_SECTION here - let the caller decide where to navigate
  },
}));
