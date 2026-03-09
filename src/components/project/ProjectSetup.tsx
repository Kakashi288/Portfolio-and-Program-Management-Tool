import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { DEFAULT_TEAM_COLORS, STORAGE_KEYS } from '../../constants';
import { loadProjectsList, loadProjectFromStorage, saveProjectToStorage } from '../../utils/storageUtils';
import { formatDate } from '../../utils/dateUtils';

interface ProjectSetupProps {
  onBackToDashboard?: () => void;
}

export const ProjectSetup: React.FC<ProjectSetupProps> = ({ onBackToDashboard }) => {
  const { initializeProject, addTeam, addPerson, loadProject, deleteProject } = useProjectStore();

  // Load showCreateForm state from localStorage
  const [showCreateForm, setShowCreateForm] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROJECT_SETUP_VIEW);
    return saved === 'create';
  });
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string; description: string; updatedAt: Date }>>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  useEffect(() => {
    const projectsList = loadProjectsList();
    setProjects(projectsList);

    // Only auto-show create form if no projects exist and not already set in localStorage
    if (projectsList.length === 0 && !localStorage.getItem(STORAGE_KEYS.PROJECT_SETUP_VIEW)) {
      setShowCreateForm(true);
    }
  }, []);

  // Sync showCreateForm state to localStorage
  useEffect(() => {
    if (showCreateForm) {
      localStorage.setItem(STORAGE_KEYS.PROJECT_SETUP_VIEW, 'create');
    } else {
      localStorage.setItem(STORAGE_KEYS.PROJECT_SETUP_VIEW, 'list');
    }
  }, [showCreateForm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    if (editingProjectId) {
      // Load the full project, update it, and save it back
      const fullProject = loadProjectFromStorage(editingProjectId);
      if (fullProject) {
        const updatedProject = {
          ...fullProject,
          name: projectName,
          description: projectDescription,
          updatedAt: new Date(),
        };
        saveProjectToStorage(updatedProject);

        // Update the projects list display
        const updatedProjects = projects.map(p =>
          p.id === editingProjectId
            ? { ...p, name: projectName, description: projectDescription, updatedAt: new Date() }
            : p
        );
        setProjects(updatedProjects);
      }
      setEditingProjectId(null);
    } else {
      // Create new project
      initializeProject(projectName, projectDescription);

      addTeam({ name: 'Engineering', color: DEFAULT_TEAM_COLORS[0] });
      addTeam({ name: 'Design', color: DEFAULT_TEAM_COLORS[1] });
      addTeam({ name: 'Product', color: DEFAULT_TEAM_COLORS[2] });

      // Set section to projects when creating a new project
      localStorage.setItem(STORAGE_KEYS.CURRENT_SECTION, 'projects');
    }

    setProjectName('');
    setProjectDescription('');
    setShowCreateForm(false);
  };

  const handleLoadProject = (projectId: string) => {
    loadProject(projectId);
    // Clear the view state so we don't return to this page on refresh
    localStorage.removeItem(STORAGE_KEYS.PROJECT_SETUP_VIEW);
    // Set section to projects (not sre-dashboard) when loading a project
    localStorage.setItem(STORAGE_KEYS.CURRENT_SECTION, 'projects');
  };

  const handleEditProject = (projectId: string) => {
    const fullProject = loadProjectFromStorage(projectId);
    if (fullProject) {
      setProjectName(fullProject.name);
      setProjectDescription(fullProject.description);
      setEditingProjectId(projectId);
      setShowCreateForm(true);
    }
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      deleteProject(projectId);
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      if (updatedProjects.length === 0) {
        setShowCreateForm(true);
      }
    }
  };

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {editingProjectId ? 'Update Project' : projects.length === 0 ? 'Welcome to Project Manager' : 'Create New Project'}
            </h1>
            <p className="text-gray-600">
              {editingProjectId ? 'Update your project information' : projects.length === 0 ? "Let's set up your first project" : 'Set up a new project'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Awesome Project"
              error={error}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Description
              </label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of your project..."
              />
            </div>

            <div className="flex gap-3">
              {projects.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingProjectId(null);
                    setProjectName('');
                    setProjectDescription('');
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="primary" className="flex-1">
                {editingProjectId ? 'Save Changes' : 'Create Project'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              You'll be able to manage tasks, timelines, and teams
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full h-[75vh] bg-white rounded-lg shadow-xl p-8 flex flex-col">
        {onBackToDashboard && (
          <div className="mb-6 flex-shrink-0">
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Portfolio Management
            </button>
          </div>
        )}
        <div className="text-center mb-8 flex-shrink-0">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Projects
          </h1>
          <p className="text-gray-600">
            Select a project to continue or create a new one
          </p>
        </div>

        <div className="mb-6 flex-shrink-0">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowCreateForm(true)}
          >
            + Create New Project
          </Button>
        </div>

        <div className={`space-y-3 flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin ${projects.length <= 2 ? 'flex flex-col pb-4' : ''}`}>
          {projects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No projects yet. Create your first project to get started!</p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all ${
                  projects.length <= 2 ? 'flex-1' : ''
                }`}
              >
                <div className="flex-1 cursor-pointer" onClick={() => handleLoadProject(project.id)}>
                  <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {formatDate(project.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleLoadProject(project.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleEditProject(project.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id, project.name)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
