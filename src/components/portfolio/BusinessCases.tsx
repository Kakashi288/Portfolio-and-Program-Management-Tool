import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

type BCStatus = 'Draft' | 'Under Review' | 'Approved' | 'Rejected' | 'On Hold';

interface BCOption {
  label: string;
  cost: string;
  recommendation: boolean;
}

interface BusinessCase {
  id: string;
  title: string;
  project: string;
  submittedBy: string;
  submittedDate: string;
  reviewDate: string;
  status: BCStatus;
  investment: string;
  expectedROI: string;
  paybackPeriod: string;
  strategicAlignment: string;
  summary: string;
  problem: string;
  proposedSolution: string;
  options: BCOption[];
  approver: string;
  approvalNotes: string;
}

const defaultItems: BusinessCase[] = [
  {
    id: 'BC-001',
    title: 'Digital Transformation Programme — Full Business Case',
    project: 'Digital Transformation Programme',
    submittedBy: 'Sarah Chen',
    submittedDate: '01 Nov 2024',
    reviewDate: '15 Nov 2024',
    status: 'Approved',
    investment: '£2,500,000',
    expectedROI: '£4.2m over 3 years',
    paybackPeriod: '28 months',
    strategicAlignment: 'Cost Optimisation, Customer Experience, Operational Efficiency',
    summary: 'End-to-end modernisation of core business systems to reduce operating costs and improve service delivery.',
    problem: 'Legacy systems are causing £1.2m in annual inefficiencies, frequent outages, and inability to scale to meet demand.',
    proposedSolution: 'Replace core ERP and CRM with cloud-native solutions, automate key manual workflows, and establish a data platform.',
    options: [
      { label: 'Do Nothing', cost: '£0 capex, £1.2m annual inefficiency', recommendation: false },
      { label: 'Phased Modernisation', cost: '£2.5m over 18 months', recommendation: true },
      { label: 'Full Big-Bang Replacement', cost: '£4.1m over 12 months', recommendation: false },
    ],
    approver: 'CFO — David Marshall',
    approvalNotes: 'Approved subject to quarterly benefit reviews and Programme Board oversight.',
  },
  {
    id: 'BC-002',
    title: 'Cloud Migration Initiative — Outline Business Case',
    project: 'Cloud Migration Initiative',
    submittedBy: 'James Wright',
    submittedDate: '15 Jan 2025',
    reviewDate: '05 Feb 2025',
    status: 'Approved',
    investment: '£800,000',
    expectedROI: '£320,000 per year recurring',
    paybackPeriod: '30 months',
    strategicAlignment: 'Cost Optimisation, Resilience, Security',
    summary: 'Migration of all on-premise infrastructure to AWS to reduce data centre costs and improve availability.',
    problem: 'Data centre contract expiring Q3 2025. Renewal cost exceeds cloud migration investment within 2 years.',
    proposedSolution: 'Lift-and-shift migration with targeted re-architecture of critical workloads to leverage cloud-native services.',
    options: [
      { label: 'Renew Data Centre Contract (5 years)', cost: '£1.4m over 5 years', recommendation: false },
      { label: 'Cloud Migration', cost: '£800k migration + £180k/yr', recommendation: true },
    ],
    approver: 'CTO — Alison Park',
    approvalNotes: 'Approved. Architecture review board sign-off required before execution.',
  },
  {
    id: 'BC-003',
    title: 'AI-Powered Customer Support — Outline Business Case',
    project: 'AI Customer Support Initiative',
    submittedBy: 'Priya Patel',
    submittedDate: '01 Mar 2025',
    reviewDate: '',
    status: 'Under Review',
    investment: '£420,000',
    expectedROI: '£280,000 per year via reduced support headcount',
    paybackPeriod: '18 months',
    strategicAlignment: 'Customer Experience, Cost Optimisation',
    summary: 'Implementation of an AI chatbot and case routing system to deflect 40% of Tier-1 support queries.',
    problem: 'Support centre handling 12,000 queries/month. 38% are repetitive Tier-1 queries that could be automated.',
    proposedSolution: 'Deploy LLM-powered chatbot integrated with the new Customer Portal, trained on support knowledge base.',
    options: [
      { label: 'Hire Additional Support Staff', cost: '£320k per year recurring', recommendation: false },
      { label: 'AI Chatbot Implementation', cost: '£420k + £60k/yr maintenance', recommendation: true },
      { label: 'Outsource Support Function', cost: '£240k per year', recommendation: false },
    ],
    approver: '',
    approvalNotes: '',
  },
  {
    id: 'BC-004',
    title: 'Enterprise Data Warehouse Consolidation',
    project: 'Data Analytics Platform',
    submittedBy: 'Marcus Johnson',
    submittedDate: '10 Feb 2025',
    reviewDate: '',
    status: 'Approved',
    investment: '£1,200,000',
    expectedROI: '£600,000 per year in analyst productivity',
    paybackPeriod: '24 months',
    strategicAlignment: 'Data-Driven Decision Making, Operational Efficiency',
    summary: 'Consolidate 6 disparate data sources into a single Snowflake-based analytics platform with self-service BI.',
    problem: 'Data analysts spend 60% of time on data extraction and cleansing. No single source of truth exists.',
    proposedSolution: 'Build a Snowflake data warehouse, implement dbt for transformation, and deploy Tableau for self-service analytics.',
    options: [
      { label: 'Incremental Improvement to Existing Tools', cost: '£200k per year ongoing', recommendation: false },
      { label: 'New Analytics Platform', cost: '£1.2m over 18 months', recommendation: true },
    ],
    approver: 'CDO — Rachel Kim',
    approvalNotes: 'Approved. Vendor selection to follow procurement process.',
  },
  {
    id: 'BC-005',
    title: 'Employee Wellbeing Platform',
    project: 'HR Systems Modernisation',
    submittedBy: 'HR Director — Nina Roberts',
    submittedDate: '20 Mar 2025',
    reviewDate: '',
    status: 'Draft',
    investment: '£180,000',
    expectedROI: 'Reduction in attrition saving ~£250k per year',
    paybackPeriod: '12 months',
    strategicAlignment: 'People & Culture, Talent Retention',
    summary: 'Implement a digital wellbeing and engagement platform to reduce attrition and improve employee satisfaction.',
    problem: 'Attrition rate of 18% vs 11% industry average. Exit interviews cite poor manager support and lack of development tools.',
    proposedSolution: 'Deploy SaaS wellbeing platform with pulse surveys, 1:1 tooling, and learning pathway integration.',
    options: [
      { label: 'No Change', cost: '£450k annual attrition cost', recommendation: false },
      { label: 'SaaS Wellbeing Platform', cost: '£180k year 1, £90k/yr thereafter', recommendation: true },
    ],
    approver: '',
    approvalNotes: '',
  },
];

const statusColors: Record<BCStatus, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  'Under Review': 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-700',
  'On Hold': 'bg-amber-100 text-amber-700',
};

type FormData = Omit<BusinessCase, 'id' | 'options'> & { optionsRaw: string };

const emptyForm = (): FormData => ({
  title: '',
  project: '',
  submittedBy: '',
  submittedDate: '',
  reviewDate: '',
  status: 'Draft',
  investment: '',
  expectedROI: '',
  paybackPeriod: '',
  strategicAlignment: '',
  summary: '',
  problem: '',
  proposedSolution: '',
  optionsRaw: '',
  approver: '',
  approvalNotes: '',
});

function optionsFromRaw(raw: string): BCOption[] {
  return raw.split('\n').filter(l => l.trim()).map(line => {
    const rec = line.startsWith('*');
    return { label: line.replace(/^\*/, '').split('|')[0]?.trim() || line.replace(/^\*/, '').trim(), cost: line.split('|')[1]?.trim() || '', recommendation: rec };
  });
}

function rawFromOptions(opts: BCOption[]): string {
  return opts.map(o => `${o.recommendation ? '*' : ''}${o.label}${o.cost ? ` | ${o.cost}` : ''}`).join('\n');
}

function nextId(items: BusinessCase[]): string {
  const nums = items.map(i => parseInt(i.id.replace('BC-', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `BC-${String(max + 1).padStart(3, '0')}`;
}

interface Props { onBack: () => void; }

export const BusinessCases: React.FC<Props> = ({ onBack }) => {
  const [items, setItems] = useState<BusinessCase[]>(() => loadFromStorage(STORAGE_KEYS.BUSINESS_CASES, defaultItems));
  const [selected, setSelected] = useState<BusinessCase | null>(null);
  const [filter, setFilter] = useState<'All' | BCStatus>('All');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.BUSINESS_CASES, items); }, [items]);

  const filtered = items.filter(c => filter === 'All' || c.status === filter);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(bc: BusinessCase) {
    setEditingId(bc.id);
    setForm({ title: bc.title, project: bc.project, submittedBy: bc.submittedBy, submittedDate: bc.submittedDate, reviewDate: bc.reviewDate, status: bc.status, investment: bc.investment, expectedROI: bc.expectedROI, paybackPeriod: bc.paybackPeriod, strategicAlignment: bc.strategicAlignment, summary: bc.summary, problem: bc.problem, proposedSolution: bc.proposedSolution, optionsRaw: rawFromOptions(bc.options), approver: bc.approver, approvalNotes: bc.approvalNotes });
    setSelected(null);
    setShowForm(true);
  }

  function saveForm() {
    if (!form.title.trim() || !form.project.trim()) return;
    const item: BusinessCase = { ...form, id: editingId || nextId(items), options: optionsFromRaw(form.optionsRaw) };
    if (editingId) {
      setItems(prev => prev.map(i => i.id === editingId ? item : i));
    } else {
      setItems(prev => [...prev, item]);
    }
    setShowForm(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setItems(prev => prev.filter(i => i.id !== deleteId));
    if (selected?.id === deleteId) setSelected(null);
    setDeleteId(null);
  }

  const f = (label: string, req = false) => (
    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{req && <span className="text-red-500 ml-1">*</span>}</label>
  );
  const inp = (field: keyof FormData) => (
    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] as string}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
  );
  const sel = (field: keyof FormData, opts: string[]) => (
    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] as string}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );
  const ta = (field: keyof FormData, rows = 2) => (
    <textarea rows={rows} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      value={form[field] as string}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Cases</h1>
              <p className="text-sm text-gray-500">Repository of project proposals, approvals and investment decisions</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Submit Business Case
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['All', 'Approved', 'Under Review', 'Draft'] as const).map(s => {
            const count = s === 'All' ? items.length : items.filter(c => c.status === s).length;
            return (
              <div key={s} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">{s === 'All' ? 'Total Cases' : s}</p>
                <p className="text-3xl font-bold text-gray-900">{count}</p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['All', 'Approved', 'Under Review', 'Draft', 'On Hold', 'Rejected'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {filtered.map(bc => (
            <div key={bc.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all hover:border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => setSelected(bc)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{bc.id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[bc.status]}`}>{bc.status}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base mb-1">{bc.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">{bc.summary}</p>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <div><span className="text-gray-400">Investment: </span><span className="font-medium text-gray-700">{bc.investment}</span></div>
                    <div><span className="text-gray-400">ROI: </span><span className="font-medium text-gray-700">{bc.expectedROI}</span></div>
                    <div><span className="text-gray-400">Payback: </span><span className="font-medium text-gray-700">{bc.paybackPeriod}</span></div>
                  </div>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {bc.strategicAlignment.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="text-right text-xs text-gray-400">
                    <div>{bc.submittedBy}</div>
                    <div>{bc.submittedDate}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(bc)} className="p-1.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteId(bc.id)} className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{selected.id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selected.status]}`}>{selected.status}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">Edit</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><p className="text-gray-500">Submitted By</p><p className="font-medium">{selected.submittedBy}</p></div>
              <div><p className="text-gray-500">Submitted Date</p><p className="font-medium">{selected.submittedDate}</p></div>
              <div><p className="text-gray-500">Investment Required</p><p className="font-medium">{selected.investment}</p></div>
              <div><p className="text-gray-500">Expected ROI</p><p className="font-medium">{selected.expectedROI}</p></div>
              <div><p className="text-gray-500">Payback Period</p><p className="font-medium">{selected.paybackPeriod}</p></div>
              {selected.approver && <div><p className="text-gray-500">Approved By</p><p className="font-medium">{selected.approver}</p></div>}
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-4"><p className="font-semibold text-gray-700 mb-1">Problem Statement</p><p className="text-gray-600">{selected.problem}</p></div>
              <div className="bg-blue-50 rounded-xl p-4"><p className="font-semibold text-blue-800 mb-1">Proposed Solution</p><p className="text-blue-700">{selected.proposedSolution}</p></div>
              {selected.options.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <p className="font-semibold text-gray-700 mb-2">Options Considered</p>
                  <div className="space-y-2">
                    {selected.options.map(o => (
                      <div key={o.label} className={`flex items-start gap-2 p-2 rounded-lg ${o.recommendation ? 'bg-green-50 border border-green-100' : ''}`}>
                        {o.recommendation && <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded font-medium mt-0.5">Recommended</span>}
                        <div><p className="font-medium text-gray-800">{o.label}</p>{o.cost && <p className="text-gray-500">{o.cost}</p>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.approvalNotes && (
                <div className="bg-green-50 rounded-xl p-4"><p className="font-semibold text-green-800 mb-1">Approval Notes</p><p className="text-green-700">{selected.approvalNotes}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Business Case' : 'Submit Business Case'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>{f('Title', true)}{inp('title')}</div>
              <div>{f('Project', true)}{inp('project')}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Submitted By')}{inp('submittedBy')}</div>
                <div>{f('Submitted Date')}{inp('submittedDate')}</div>
                <div>{f('Status')}{sel('status', ['Draft', 'Under Review', 'Approved', 'Rejected', 'On Hold'])}</div>
                <div>{f('Review Date')}{inp('reviewDate')}</div>
              </div>
              <div>{f('Summary')}{ta('summary', 2)}</div>
              <div className="grid grid-cols-3 gap-4">
                <div>{f('Investment')}{inp('investment')}</div>
                <div>{f('Expected ROI')}{inp('expectedROI')}</div>
                <div>{f('Payback Period')}{inp('paybackPeriod')}</div>
              </div>
              <div>{f('Strategic Alignment (comma-separated)')}{inp('strategicAlignment')}</div>
              <div>{f('Problem Statement')}{ta('problem', 3)}</div>
              <div>{f('Proposed Solution')}{ta('proposedSolution', 3)}</div>
              <div>
                {f('Options Considered')}
                <p className="text-xs text-gray-400 mb-1">One per line. Start with * to mark as recommended. Use | to separate label from cost.</p>
                <textarea rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  placeholder="*Option A | £500k (recommended)&#10;Option B | £800k&#10;Do Nothing | £0 capex"
                  value={form.optionsRaw}
                  onChange={e => setForm(p => ({ ...p, optionsRaw: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Approver')}{inp('approver')}</div>
                <div>{f('Approval Notes')}{inp('approvalNotes')}</div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} disabled={!form.title.trim() || !form.project.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors">
                {editingId ? 'Save Changes' : 'Submit Case'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Business Case?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently remove <strong>{items.find(i => i.id === deleteId)?.id}</strong>. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
