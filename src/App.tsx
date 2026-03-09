import { useEffect, useState } from 'react';
import { useProjectStore } from './store/projectStore';
import { useUIStore } from './store/uiStore';
import { Layout } from './components/layout/Layout';
import { ProjectSetup } from './components/project/ProjectSetup';
import { SREDashboard } from './components/dashboard/SREDashboard';
import {
  SectionLanding,
  portfolioTiles,
  governanceTiles,
  resourcesTiles,
  reportingTiles,
} from './components/dashboard/SectionLanding';
import { EditableTaskTable } from './components/tasks/EditableTaskTable';
import { TaskForm } from './components/tasks/TaskForm';
import { GanttChart } from './components/gantt/GanttChart';
import { Dashboard } from './components/dashboard/Dashboard';
import { ResourceCalendar } from './components/calendar/ResourceCalendar';
import { PathMilestone } from './components/common/PathMilestone';
import { PortfolioOverview } from './components/portfolio/PortfolioOverview';
import { BenefitsRealisation } from './components/portfolio/BenefitsRealisation';
import { BusinessCases } from './components/portfolio/BusinessCases';
import { RisksIssues } from './components/risks/RisksIssues';
import { ChangeControl } from './components/governance/ChangeControl';
import { DecisionsRegister } from './components/governance/DecisionsRegister';
import { ResourceManagement } from './components/resources/ResourceManagement';
import { CapacityManagement } from './components/resources/CapacityManagement';
import { FinancialTracking } from './components/finance/FinancialTracking';
import { ExecutiveDashboard } from './components/reporting/ExecutiveDashboard';
import { StatusReports } from './components/reporting/StatusReports';
import { STORAGE_KEYS } from './constants';

type Section =
  | 'sre-dashboard'
  | 'portfolio-section' | 'governance-section' | 'resources-section' | 'reporting-section'
  | 'projects' | 'portfolio' | 'benefits' | 'businesscases'
  | 'risks' | 'changecontrol' | 'decisions'
  | 'resources' | 'capacity' | 'financial'
  | 'executive' | 'statusreports';

// Which section page each module lives under
const parentSection: Partial<Record<Section, Section>> = {
  portfolio: 'portfolio-section',
  projects: 'portfolio-section',
  benefits: 'portfolio-section',
  businesscases: 'portfolio-section',
  risks: 'governance-section',
  changecontrol: 'governance-section',
  decisions: 'governance-section',
  resources: 'resources-section',
  capacity: 'resources-section',
  financial: 'resources-section',
  executive: 'reporting-section',
  statusreports: 'reporting-section',
};

function App() {
  const project = useProjectStore(state => state.project);
  const loadProject = useProjectStore(state => state.loadFromStorage);
  const view = useUIStore(state => state.view);
  const loadUIState = useUIStore(state => state.loadFromStorage);

  const [currentSection, setCurrentSection] = useState<Section>('sre-dashboard');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_SECTION) as Section | null;
    // Only restore top-level section pages on reload, not deep module pages
    const topLevel: Section[] = ['sre-dashboard', 'portfolio-section', 'governance-section', 'resources-section', 'reporting-section'];
    if (saved && topLevel.includes(saved)) {
      setCurrentSection(saved);
    }
    const projectSetupView = localStorage.getItem(STORAGE_KEYS.PROJECT_SETUP_VIEW);
    if (projectSetupView !== 'list' && projectSetupView !== 'create') {
      loadProject();
    }
    loadUIState();
  }, [loadProject, loadUIState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SECTION, currentSection);
  }, [currentSection]);

  const goHome = () => setCurrentSection('sre-dashboard');

  const goToParent = (section: Section) => {
    const parent = parentSection[section];
    setCurrentSection(parent || 'sre-dashboard');
  };

  // ── Main landing ──────────────────────────────────────────────────────────
  if (currentSection === 'sre-dashboard') {
    return (
      <SREDashboard
        onNavigate={(section) => setCurrentSection(section)}
      />
    );
  }

  // ── Section landing pages ─────────────────────────────────────────────────
  if (currentSection === 'portfolio-section') {
    return (
      <SectionLanding
        sectionTitle="Portfolio Management"
        sectionDescription="Oversee all projects and programmes, track benefits and manage business cases."
        tiles={portfolioTiles}
        onNavigate={(module) => {
          if (module === 'projects') {
            setCurrentSection('projects');
            localStorage.setItem(STORAGE_KEYS.PROJECT_SETUP_VIEW, 'list');
          } else {
            setCurrentSection(module as Section);
          }
        }}
        onBack={goHome}
      />
    );
  }

  if (currentSection === 'governance-section') {
    return (
      <SectionLanding
        sectionTitle="Governance & Oversight"
        sectionDescription="Manage risks, issues, change requests and key decisions across all programmes."
        tiles={governanceTiles}
        onNavigate={(module) => setCurrentSection(module as Section)}
        onBack={goHome}
      />
    );
  }

  if (currentSection === 'resources-section') {
    return (
      <SectionLanding
        sectionTitle="Resources & Finance"
        sectionDescription="Plan team capacity, track utilisation and manage budgets across the portfolio."
        tiles={resourcesTiles}
        onNavigate={(module) => setCurrentSection(module as Section)}
        onBack={goHome}
      />
    );
  }

  if (currentSection === 'reporting-section') {
    return (
      <SectionLanding
        sectionTitle="Reporting"
        sectionDescription="Executive dashboards and weekly/monthly programme health reports."
        tiles={reportingTiles}
        onNavigate={(module) => setCurrentSection(module as Section)}
        onBack={goHome}
      />
    );
  }

  // ── Module pages ──────────────────────────────────────────────────────────
  if (currentSection === 'portfolio') return <PortfolioOverview onBack={() => goToParent('portfolio')} />;
  if (currentSection === 'benefits') return <BenefitsRealisation onBack={() => goToParent('benefits')} />;
  if (currentSection === 'businesscases') return <BusinessCases onBack={() => goToParent('businesscases')} />;
  if (currentSection === 'risks') return <RisksIssues onBack={() => goToParent('risks')} />;
  if (currentSection === 'changecontrol') return <ChangeControl onBack={() => goToParent('changecontrol')} />;
  if (currentSection === 'decisions') return <DecisionsRegister onBack={() => goToParent('decisions')} />;
  if (currentSection === 'resources') return <ResourceManagement onBack={() => goToParent('resources')} />;
  if (currentSection === 'capacity') return <CapacityManagement onBack={() => goToParent('capacity')} />;
  if (currentSection === 'financial') return <FinancialTracking onBack={() => goToParent('financial')} />;
  if (currentSection === 'executive') return <ExecutiveDashboard onBack={() => goToParent('executive')} />;
  if (currentSection === 'statusreports') return <StatusReports onBack={() => goToParent('statusreports')} />;

  if (!project && currentSection === 'projects') {
    return <ProjectSetup onBackToDashboard={() => goToParent('projects')} />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard />;
      case 'list': return <EditableTaskTable />;
      case 'gantt': return <GanttChart />;
      case 'calendar': return <ResourceCalendar />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderView()}
      <TaskForm />
      <PathMilestone />
    </Layout>
  );
}

export default App;
