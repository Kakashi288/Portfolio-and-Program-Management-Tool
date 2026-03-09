import React from 'react';

type ModuleKey =
  | 'portfolio' | 'projects' | 'benefits' | 'businesscases'
  | 'risks' | 'changecontrol' | 'decisions'
  | 'resources' | 'financial' | 'capacity'
  | 'executive' | 'statusreports';

interface TileConfig {
  key: ModuleKey;
  title: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
}

interface SectionLandingProps {
  sectionTitle: string;
  sectionDescription: string;
  tiles: TileConfig[];
  onNavigate: (module: ModuleKey) => void;
  onBack: () => void;
}

export const SectionLanding: React.FC<SectionLandingProps> = ({
  sectionTitle,
  sectionDescription,
  tiles,
  onNavigate,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Portfolio and Program Management</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-700 font-medium">{sectionTitle}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{sectionTitle}</h1>
          <p className="text-gray-500">{sectionDescription}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-5 max-w-5xl">
          {tiles.map(tile => (
            <button
              key={tile.key}
              onClick={() => onNavigate(tile.key)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 group text-left flex flex-col w-56"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${tile.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {tile.icon}
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{tile.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed flex-1">{tile.description}</p>
              <div className="mt-4 flex items-center text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Open <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Section configs ──────────────────────────────────────────────────────────

export const portfolioTiles: TileConfig[] = [
  {
    key: 'portfolio',
    title: 'Portfolio Overview',
    description: 'High-level RAG status, budgets and timelines across all projects and programmes.',
    gradient: 'from-emerald-500 to-teal-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  },
  {
    key: 'projects',
    title: 'Projects & Programs',
    description: 'Create and manage projects with Gantt charts, task lists, calendars and dashboards.',
    gradient: 'from-blue-500 to-blue-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
  },
  {
    key: 'benefits',
    title: 'Benefits Realisation',
    description: 'Track whether projects are delivering their expected outcomes and business value.',
    gradient: 'from-cyan-500 to-blue-500',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  },
  {
    key: 'businesscases',
    title: 'Business Cases',
    description: 'Repository of project proposals, investment decisions and approvals.',
    gradient: 'from-sky-500 to-indigo-500',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
];

export const governanceTiles: TileConfig[] = [
  {
    key: 'risks',
    title: 'Risks & Issues',
    description: 'Centralised RAID log — risks, assumptions, issues and dependencies across programmes.',
    gradient: 'from-orange-500 to-red-500',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
  },
  {
    key: 'changecontrol',
    title: 'Change Control',
    description: 'Change requests, approvals and impact assessments across all programmes.',
    gradient: 'from-amber-500 to-orange-500',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
  },
  {
    key: 'decisions',
    title: 'Decisions Register',
    description: 'Log of key decisions made across programmes with full rationale and impact.',
    gradient: 'from-yellow-500 to-amber-500',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  },
];

export const resourcesTiles: TileConfig[] = [
  {
    key: 'resources',
    title: 'Resource Management',
    description: 'Team capacity planning and utilisation tracking across projects and programmes.',
    gradient: 'from-violet-500 to-purple-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
  },
  {
    key: 'capacity',
    title: 'Capacity Management',
    description: 'Current and forecast project demand vs team supply across remaining quarters.',
    gradient: 'from-teal-500 to-cyan-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    key: 'financial',
    title: 'Financial Tracking',
    description: 'Budgets, actuals, commitments and forecasts across the portfolio.',
    gradient: 'from-fuchsia-500 to-pink-500',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
];

export const reportingTiles: TileConfig[] = [
  {
    key: 'executive',
    title: 'Executive Dashboard',
    description: 'C-suite level portfolio KPIs, programme health and key escalations.',
    gradient: 'from-slate-600 to-gray-700',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />,
  },
  {
    key: 'statusreports',
    title: 'Status Reports',
    description: 'Weekly and monthly programme health reports across the portfolio.',
    gradient: 'from-rose-500 to-pink-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
];
