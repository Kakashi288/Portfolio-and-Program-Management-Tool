import React, { useState } from 'react';

interface StatusReport {
  id: string;
  title: string;
  project: string;
  period: string;
  type: 'Weekly' | 'Monthly';
  author: string;
  publishedDate: string;
  overallRag: 'green' | 'amber' | 'red';
  scheduleRag: 'green' | 'amber' | 'red';
  budgetRag: 'green' | 'amber' | 'red';
  resourceRag: 'green' | 'amber' | 'red';
  summary: string;
  accomplishments: string[];
  nextSteps: string[];
  risks: string[];
  decisions: string[];
  metrics: { label: string; value: string; trend: 'up' | 'down' | 'flat' }[];
}

const ragConfig = {
  green: { dot: 'bg-green-500', badge: 'bg-green-100 text-green-800', label: 'On Track' },
  amber: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800', label: 'At Risk' },
  red: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-800', label: 'Off Track' },
};

const dummyReports: StatusReport[] = [
  {
    id: 'SR-010',
    title: 'Digital Transformation Programme — Week 10 Status',
    project: 'Digital Transformation Programme',
    period: 'w/e 07 Mar 2025',
    type: 'Weekly',
    author: 'Sarah Chen',
    publishedDate: '07 Mar 2025',
    overallRag: 'green',
    scheduleRag: 'green',
    budgetRag: 'green',
    resourceRag: 'amber',
    summary: 'Phase 2 delivery milestone achieved this week ahead of schedule. Team capacity remains a concern with resource competition from other programmes in Q2.',
    accomplishments: [
      'Phase 2 milestone delivered — ERP integration complete and signed off by business',
      'Automated 3 manual workflows saving estimated 12 hrs/week',
      'Data migration dry run completed successfully — 98.7% record accuracy',
    ],
    nextSteps: [
      'Commence Phase 3 planning — kick-off scheduled w/c 17 Mar',
      'Resource levelling review with all PMs — scheduled 14 Mar',
      'Stakeholder update presentation to ExCo — 19 Mar',
    ],
    risks: [
      'Resource availability in Q2 — multiple programmes competing for same engineers (Owner: Sarah Chen, Due: 15 Mar)',
    ],
    decisions: [
      'Phase 3 scope confirmed as per approved business case (no changes)',
    ],
    metrics: [
      { label: 'Overall Progress', value: '48%', trend: 'up' },
      { label: 'Tasks Complete', value: '34/71', trend: 'up' },
      { label: 'Budget Consumed', value: '48%', trend: 'up' },
      { label: 'Open Risks', value: '2', trend: 'flat' },
    ],
  },
  {
    id: 'SR-009',
    title: 'Cloud Migration Initiative — Week 10 Status',
    project: 'Cloud Migration Initiative',
    period: 'w/e 07 Mar 2025',
    type: 'Weekly',
    author: 'James Wright',
    publishedDate: '07 Mar 2025',
    overallRag: 'amber',
    scheduleRag: 'amber',
    budgetRag: 'amber',
    resourceRag: 'green',
    summary: 'Test environment issue resolved after 6-day outage. UAT back on track for 10 Mar but schedule float has been consumed. DR site scope addition drawing on contingency budget.',
    accomplishments: [
      'Test environment restored — root cause identified as misconfigured security group',
      'DR site scope formally approved via CCB (CR-002)',
      'Workstream 3 (storage migration) 100% complete',
    ],
    nextSteps: [
      'UAT commences 10 Mar — all test cases documented and signed off',
      'DR site workstream kick-off — James Wright to lead',
      'Updated programme plan to be shared with CTO by 12 Mar',
    ],
    risks: [
      'No remaining schedule float — any further delay will impact go-live (Critical, Owner: James Wright)',
      'Budget at risk — DR scope addition draws on contingency (Owner: James Wright, Due: 15 Mar)',
    ],
    decisions: [
      'DR site migration approved via CCB — budget drawn from contingency',
      'CyberShield Ltd appointed as replacement pen test vendor',
    ],
    metrics: [
      { label: 'Overall Progress', value: '72%', trend: 'up' },
      { label: 'Workstreams Complete', value: '3/5', trend: 'up' },
      { label: 'Budget Consumed', value: '81%', trend: 'up' },
      { label: 'Days Delay', value: '6', trend: 'down' },
    ],
  },
  {
    id: 'SR-008',
    title: 'Customer Portal Redesign — Week 10 Status',
    project: 'Customer Portal Redesign',
    period: 'w/e 07 Mar 2025',
    type: 'Weekly',
    author: 'Priya Patel',
    publishedDate: '07 Mar 2025',
    overallRag: 'red',
    scheduleRag: 'red',
    budgetRag: 'red',
    resourceRag: 'amber',
    summary: 'Project remains off track. Budget overrun of 9% with no contingency remaining. Scope creep issue escalated to CCB meeting on 12 Mar. Business sponsor sign-off on Phase 2 designs still outstanding.',
    accomplishments: [
      'Phase 1 features deployed to staging — browser testing complete',
      'CCB meeting booked for 12 Mar to address scope creep',
      'UX accessibility audit completed — 2 minor issues to resolve',
    ],
    nextSteps: [
      'CCB meeting 12 Mar — critical for project future',
      'Business sponsor meeting 12 Mar to obtain Phase 2 sign-off',
      'Supplementary funding request to be submitted to Portfolio Board by 14 Mar',
    ],
    risks: [
      'Budget overrun — no contingency remaining, supplementary funding required (Critical)',
      'Scope creep continues without formal change control (High, escalated to CCB)',
      'Phase 2 sign-off delayed — 2-week impact to development start (High)',
    ],
    decisions: [
      'Escalation raised to Programme Director — Portfolio Board to review 14 Mar',
    ],
    metrics: [
      { label: 'Overall Progress', value: '60%', trend: 'flat' },
      { label: 'Budget vs Plan', value: '+9%', trend: 'down' },
      { label: 'Contingency Remaining', value: '£0', trend: 'down' },
      { label: 'Open Issues', value: '3', trend: 'down' },
    ],
  },
  {
    id: 'SR-M02',
    title: 'Portfolio Monthly Report — February 2025',
    project: 'Portfolio',
    period: 'February 2025',
    type: 'Monthly',
    author: 'Sarah Chen',
    publishedDate: '28 Feb 2025',
    overallRag: 'amber',
    scheduleRag: 'amber',
    budgetRag: 'amber',
    resourceRag: 'amber',
    summary: 'February saw continued progress across the portfolio with 3 of 6 projects on track. Key concerns are the Customer Portal budget position and Security Compliance pen test findings. Cloud Migration test environment issue identified late in month.',
    accomplishments: [
      'Cloud Migration Workstream 3 (storage) delivered ahead of schedule',
      'Data Analytics Platform vendor selected — procurement completed',
      'Security Compliance ISO Stage 1 audit passed',
      'Mobile App design phase 100% complete — build commencing March',
    ],
    nextSteps: [
      'Portfolio Board meeting — 14 Mar: Customer Portal funding decision',
      'Resource levelling review across all programmes — 14 Mar',
      'Q1 benefits review — scheduled 28 Mar',
    ],
    risks: [
      'Customer Portal budget overrun escalating',
      'Security Compliance pen test remediation required before Stage 2',
      'Cloud Migration test environment issue (now resolved)',
    ],
    decisions: [
      'Cloud migration DR scope approved',
      'Data Analytics Platform ML features deferred',
      'CyberShield Ltd appointed for pen testing',
    ],
    metrics: [
      { label: 'Projects On Track', value: '3/6', trend: 'flat' },
      { label: 'Portfolio Spend MTD', value: '£390k', trend: 'up' },
      { label: 'Open RAID Items', value: '11', trend: 'down' },
      { label: 'Change Requests', value: '4 approved', trend: 'up' },
    ],
  },
];

interface Props { onBack: () => void; }

export const StatusReports: React.FC<Props> = ({ onBack }) => {
  const [selected, setSelected] = useState<StatusReport | null>(null);
  const [filter, setFilter] = useState<'All' | 'Weekly' | 'Monthly'>('All');

  const filtered = dummyReports.filter(r => filter === 'All' || r.type === filter);

  const trendIcon = (t: 'up' | 'down' | 'flat') =>
    t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  const trendColor = (t: 'up' | 'down' | 'flat') =>
    t === 'up' ? 'text-green-600' : t === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Status Reports</h1>
            <p className="text-sm text-gray-500">Weekly and monthly programme health reports across the portfolio</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex gap-2">
          {(['All', 'Weekly', 'Monthly'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {filtered.map(r => {
            const rag = ragConfig[r.overallRag];
            return (
              <div key={r.id} onClick={() => setSelected(r)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md cursor-pointer transition-all hover:border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.type === 'Monthly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{r.type}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rag.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${rag.dot}`} />
                        {rag.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{r.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{r.summary}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 ml-4 min-w-fit">
                    <div className="font-medium">{r.period}</div>
                    <div>{r.author}</div>
                  </div>
                </div>
                <div className="flex gap-3 mt-3">
                  {[
                    { label: 'Schedule', rag: r.scheduleRag },
                    { label: 'Budget', rag: r.budgetRag },
                    { label: 'Resource', rag: r.resourceRag },
                  ].map(item => (
                    <span key={item.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${ragConfig[item.rag].badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ragConfig[item.rag].dot}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${selected.type === 'Monthly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{selected.type}</span>
                  <span className="text-xs text-gray-400">{selected.period} · {selected.author}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 ml-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* RAG indicators */}
            <div className="flex gap-2 mb-4">
              {[
                { label: 'Overall', rag: selected.overallRag },
                { label: 'Schedule', rag: selected.scheduleRag },
                { label: 'Budget', rag: selected.budgetRag },
                { label: 'Resource', rag: selected.resourceRag },
              ].map(item => (
                <span key={item.label} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${ragConfig[item.rag].badge}`}>
                  <span className={`w-2 h-2 rounded-full ${ragConfig[item.rag].dot}`} />
                  {item.label}
                </span>
              ))}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selected.metrics.map(m => (
                <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="font-bold text-gray-900">{m.value} <span className={`text-sm ${trendColor(m.trend)}`}>{trendIcon(m.trend)}</span></p>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600 mb-4">{selected.summary}</p>

            <div className="space-y-3 text-sm">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="font-semibold text-green-800 mb-2">Accomplishments This Period</p>
                <ul className="space-y-1">{selected.accomplishments.map((a, i) => <li key={i} className="text-green-700 flex gap-2"><span>✓</span>{a}</li>)}</ul>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="font-semibold text-blue-800 mb-2">Next Steps</p>
                <ul className="space-y-1">{selected.nextSteps.map((n, i) => <li key={i} className="text-blue-700 flex gap-2"><span>→</span>{n}</li>)}</ul>
              </div>
              {selected.risks.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="font-semibold text-red-800 mb-2">Risks & Issues</p>
                  <ul className="space-y-1">{selected.risks.map((r, i) => <li key={i} className="text-red-700 flex gap-2"><span>⚠</span>{r}</li>)}</ul>
                </div>
              )}
              {selected.decisions.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="font-semibold text-amber-800 mb-2">Decisions Made</p>
                  <ul className="space-y-1">{selected.decisions.map((d, i) => <li key={i} className="text-amber-700 flex gap-2"><span>•</span>{d}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
