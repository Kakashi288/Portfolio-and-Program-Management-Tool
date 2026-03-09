import React from 'react';

type SectionKey = 'portfolio-section' | 'governance-section' | 'resources-section' | 'reporting-section';

interface SREDashboardProps {
  onNavigate: (section: SectionKey) => void;
}

const sections = [
  {
    key: 'portfolio-section' as SectionKey,
    title: 'Portfolio Management',
    description: 'Project and programme oversight, benefits tracking and business case management.',
    gradient: 'from-blue-500 to-indigo-600',
    count: 4,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    ),
    modules: ['Portfolio Overview', 'Projects & Programs', 'Benefits Realisation', 'Business Cases'],
  },
  {
    key: 'governance-section' as SectionKey,
    title: 'Governance & Oversight',
    description: 'Risks, issues, change control and key decision management across programmes.',
    gradient: 'from-orange-500 to-red-500',
    count: 3,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
    modules: ['Risks & Issues', 'Change Control', 'Decisions Register'],
  },
  {
    key: 'resources-section' as SectionKey,
    title: 'Resources & Finance',
    description: 'Team capacity planning, utilisation and financial tracking across the portfolio.',
    gradient: 'from-violet-500 to-purple-600',
    count: 3,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    ),
    modules: ['Resource Management', 'Capacity Management', 'Financial Tracking'],
  },
  {
    key: 'reporting-section' as SectionKey,
    title: 'Reporting',
    description: 'Executive dashboards and weekly/monthly status reporting across programmes.',
    gradient: 'from-slate-600 to-gray-700',
    count: 2,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
    modules: ['Executive Dashboard', 'Status Reports'],
  },
];

export const SREDashboard: React.FC<SREDashboardProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12 pt-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Portfolio and Program Management
          </h1>
          <p className="text-lg text-gray-500">Select a area to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sections.map(section => (
            <button
              key={section.key}
              onClick={() => onNavigate(section.key)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 group text-left"
            >
              <div className="flex items-start gap-5">
                <div className={`w-14 h-14 bg-gradient-to-br ${section.gradient} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {section.icon}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {section.count} modules
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{section.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {section.modules.map(m => (
                      <span key={m} className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
