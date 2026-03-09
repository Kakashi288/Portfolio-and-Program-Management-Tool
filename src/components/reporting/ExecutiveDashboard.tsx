import React from 'react';

const kpis = [
  { label: 'Projects On Track', value: '3', sub: 'of 6 total', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  { label: 'Portfolio Budget', value: '£5.9m', sub: '46% consumed', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { label: 'Open Critical Risks', value: '3', sub: '2 need escalation', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  { label: 'Benefits On Track', value: '57%', sub: '4 of 7 benefits', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
  { label: 'Pending Change Requests', value: '3', sub: 'awaiting decision', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  { label: 'Avg Team Utilisation', value: '86%', sub: '1 team over-allocated', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
];

const projectHealth = [
  { name: 'Digital Transformation Programme', rag: 'green', phase: 'Delivery', progress: 48, owner: 'Sarah Chen', highlight: 'On track. Phase 2 delivery milestone achieved this week.' },
  { name: 'Cloud Migration Initiative', rag: 'amber', phase: 'Testing', progress: 72, owner: 'James Wright', highlight: 'Test environment restored. UAT resumes 10 Mar. 6-day delay absorbed into float.' },
  { name: 'Customer Portal Redesign', rag: 'red', phase: 'Development', progress: 60, owner: 'Priya Patel', highlight: 'Over budget by 9%. Scope creep unresolved. CCB convening 12 Mar.' },
  { name: 'Data Analytics Platform', rag: 'green', phase: 'Planning', progress: 35, owner: 'Marcus Johnson', highlight: 'Vendor selected. Architecture approved. Build commences w/c 17 Mar.' },
  { name: 'Security Compliance Programme', rag: 'amber', phase: 'Delivery', progress: 55, owner: 'Emma Davis', highlight: 'Critical pen test findings being remediated. ISO Stage 2 audit at risk of slipping 4 weeks.' },
  { name: 'Mobile App Launch', rag: 'green', phase: 'Design', progress: 40, owner: 'Tom Nguyen', highlight: 'iOS acceleration CR under consideration. Design sign-off achieved this week.' },
];

const ragConfig = {
  green: { dot: 'bg-green-500', badge: 'bg-green-100 text-green-800', label: 'On Track' },
  amber: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800', label: 'At Risk' },
  red: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-800', label: 'Off Track' },
};

const topRisks = [
  { id: 'R-001', title: 'Key vendor contract expiry', project: 'Cloud Migration', severity: 'Critical', owner: 'Emma Davis' },
  { id: 'I-003', title: 'Third-party pen test failed', project: 'Security Compliance', severity: 'Critical', owner: 'Emma Davis' },
  { id: 'R-003', title: 'Scope creep on Customer Portal', project: 'Customer Portal', severity: 'High', owner: 'Priya Patel' },
];

const keyDecisions = [
  { date: '10 Mar 2025', title: 'iOS app acceleration approved (CR-005)', owner: 'Product Director' },
  { date: '03 Mar 2025', title: 'CyberShield Ltd appointed for pen testing', owner: 'Emma Davis' },
  { date: '20 Mar 2025', title: 'Phase 3 ML features deferred to v2', owner: 'CDO' },
];

interface Props { onBack: () => void; }

export const ExecutiveDashboard: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Reporting
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
              <p className="text-sm text-gray-500">Portfolio-level KPIs and programme health — as of 09 Mar 2025</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Week 10, 2025</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map(k => (
            <div key={k.label} className={`rounded-xl border p-5 ${k.bg} ${k.border}`}>
              <p className="text-sm text-gray-600 mb-1">{k.label}</p>
              <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Portfolio RAG Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-900">Portfolio RAG Summary</h2>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />On Track: 3</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />At Risk: 2</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Off Track: 1</span>
            </div>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden mt-3 mb-1">
            <div className="bg-green-500 flex-1" style={{ flex: 3 }} />
            <div className="bg-amber-400" style={{ flex: 2 }} />
            <div className="bg-red-500" style={{ flex: 1 }} />
          </div>
          <div className="text-xs text-gray-400 text-center mt-1">50% On Track · 33% At Risk · 17% Off Track</div>
        </div>

        {/* Project Health Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Programme Health</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {projectHealth.map(p => {
              const rag = ragConfig[p.rag as keyof typeof ragConfig];
              return (
                <div key={p.name} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rag.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rag.dot}`} />
                          {rag.label}
                        </span>
                        <span className="text-xs text-gray-400">{p.phase}</span>
                      </div>
                      <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.highlight}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{p.progress}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two columns: Top Risks + Key Decisions */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Top Risks Requiring Attention</h2>
            <div className="space-y-3">
              {topRisks.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <span className="font-mono text-xs text-red-400 mt-0.5">{r.id}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.project} · {r.owner}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">{r.severity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Key Decisions This Period</h2>
            <div className="space-y-3">
              {keyDecisions.map((d, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-400 mt-0.5 shrink-0">{d.date}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{d.title}</p>
                    <p className="text-xs text-gray-500">{d.owner}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
