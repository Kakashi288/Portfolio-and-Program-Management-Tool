import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

type ChangeType = 'Scope' | 'Timeline' | 'Budget' | 'Resource' | 'Technical';
type ChangeStatus = 'Raised' | 'Under Review' | 'Approved' | 'Rejected' | 'Withdrawn' | 'Implemented';
type ImpactLevel = 'High' | 'Medium' | 'Low';

interface ChangeRequest {
  id: string;
  title: string;
  project: string;
  type: ChangeType;
  raisedBy: string;
  raisedDate: string;
  status: ChangeStatus;
  impact: ImpactLevel;
  description: string;
  justification: string;
  scopeImpact: string;
  timelineImpact: string;
  budgetImpact: string;
  resourceImpact: string;
  reviewedBy: string;
  reviewDate: string;
  decision: string;
}

const defaultItems: ChangeRequest[] = [
  {
    id: 'CR-001',
    title: 'Add multi-language support to Customer Portal',
    project: 'Customer Portal Redesign',
    type: 'Scope',
    raisedBy: 'Priya Patel',
    raisedDate: '05 Mar 2025',
    status: 'Under Review',
    impact: 'High',
    description: 'Business stakeholders are requesting French and Spanish language support be added to the portal for European market expansion.',
    justification: 'European expansion plan approved by board. Portal is key touchpoint for new markets.',
    scopeImpact: 'Significant — adds i18n framework, translation workflows, and locale-specific UX testing.',
    timelineImpact: '+6 weeks to go-live date (30 Sep 2025 → 11 Nov 2025)',
    budgetImpact: '+£45,000 for development and translation services',
    resourceImpact: '2 additional developer weeks, external translation agency required',
    reviewedBy: 'Change Control Board',
    reviewDate: '12 Mar 2025',
    decision: '',
  },
  {
    id: 'CR-002',
    title: 'Extend cloud migration scope to include DR site',
    project: 'Cloud Migration Initiative',
    type: 'Scope',
    raisedBy: 'James Wright',
    raisedDate: '20 Feb 2025',
    status: 'Approved',
    impact: 'Medium',
    description: 'Security and resilience team have requested the disaster recovery site be migrated to AWS as part of the same programme.',
    justification: 'DR site using same ageing infrastructure. Migrating together avoids a second migration programme in 12 months.',
    scopeImpact: 'Additional workstream of ~8 weeks added to programme plan.',
    timelineImpact: 'No impact to main go-live — DR migration can run in parallel on separate workstream.',
    budgetImpact: '+£65,000 (within programme contingency)',
    resourceImpact: 'James Wright to lead. 1 additional DevOps engineer required for 8 weeks.',
    reviewedBy: 'CTO — Alison Park',
    reviewDate: '01 Mar 2025',
    decision: 'Approved. Budget drawn from contingency. James Wright to update programme plan.',
  },
  {
    id: 'CR-003',
    title: 'Defer Phase 3 analytics features to v2',
    project: 'Data Analytics Platform',
    type: 'Scope',
    raisedBy: 'Marcus Johnson',
    raisedDate: '15 Mar 2025',
    status: 'Approved',
    impact: 'Medium',
    description: 'Predictive analytics and ML model features originally planned for Phase 3 are proposed to be deferred to a v2 release.',
    justification: 'Core BI and reporting features will deliver majority of business value. ML features require data quality work not yet complete.',
    scopeImpact: 'Reduces Phase 1 scope. ML features to be backlogged for v2 business case.',
    timelineImpact: 'Accelerates go-live by ~6 weeks',
    budgetImpact: '-£120,000 underspend returned to portfolio reserve',
    resourceImpact: 'Data science team capacity freed for Q3 — to be redeployed on Digital Transformation.',
    reviewedBy: 'CDO — Rachel Kim',
    reviewDate: '20 Mar 2025',
    decision: 'Approved. ML features to be formally scoped in a separate business case by Q3 2025.',
  },
  {
    id: 'CR-004',
    title: 'Replace planned pen test vendor',
    project: 'Security Compliance Programme',
    type: 'Technical',
    raisedBy: 'Emma Davis',
    raisedDate: '02 Mar 2025',
    status: 'Approved',
    impact: 'Low',
    description: 'Original pen test vendor unable to fulfil contract due to capacity constraints. Proposing replacement with certified alternative.',
    justification: 'Schedule cannot slip. Alternative vendor (CyberShield Ltd) is CREST certified and has immediate availability.',
    scopeImpact: 'None — same scope, same deliverables.',
    timelineImpact: 'No impact — new vendor starts same week.',
    budgetImpact: '+£4,000 (new vendor slightly higher day rate)',
    resourceImpact: 'None.',
    reviewedBy: 'Emma Davis / Procurement',
    reviewDate: '03 Mar 2025',
    decision: 'Approved same day via emergency CCB. Procurement waiver granted.',
  },
  {
    id: 'CR-005',
    title: 'Accelerate mobile app iOS launch to Q3',
    project: 'Mobile App Launch',
    type: 'Timeline',
    raisedBy: 'Tom Nguyen',
    raisedDate: '10 Mar 2025',
    status: 'Raised',
    impact: 'High',
    description: 'Commercial team requesting iOS app be launched in Q3 to coincide with annual sales conference rather than Q4.',
    justification: 'Sales conference is a key opportunity to demo the app to 200 field representatives. Q4 launch misses this window.',
    scopeImpact: 'Android version would be deferred to Q4 to achieve iOS accelerated timeline.',
    timelineImpact: 'iOS: 15 Dec 2025 → 30 Sep 2025. Android: new target 31 Jan 2026.',
    budgetImpact: '+£30,000 for additional sprint capacity to compress timeline',
    resourceImpact: 'Requires 2 additional iOS developers for 8 weeks — sourcing from agency partner.',
    reviewedBy: '',
    reviewDate: '',
    decision: '',
  },
  {
    id: 'CR-006',
    title: 'Remove offline mode from mobile app v1',
    project: 'Mobile App Launch',
    type: 'Scope',
    raisedBy: 'Tom Nguyen',
    raisedDate: '10 Mar 2025',
    status: 'Raised',
    impact: 'Medium',
    description: 'Offline sync mode is technically complex and not required for 80% of user journeys. Proposing to defer to v1.1.',
    justification: 'Removes 4 weeks of development risk from critical path. Most users have reliable connectivity.',
    scopeImpact: 'Offline mode removed from v1. To be delivered in v1.1 patch within 3 months of launch.',
    timelineImpact: 'Saves 4 weeks on critical path',
    budgetImpact: '−£22,000 from overall budget',
    resourceImpact: '2 developers freed up to support iOS acceleration (CR-005).',
    reviewedBy: '',
    reviewDate: '',
    decision: '',
  },
];

const statusColors: Record<ChangeStatus, string> = {
  Raised: 'bg-gray-100 text-gray-600',
  'Under Review': 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-700',
  Withdrawn: 'bg-gray-100 text-gray-400',
  Implemented: 'bg-teal-100 text-teal-700',
};

const impactColors: Record<ImpactLevel, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
};

const typeColors: Record<ChangeType, string> = {
  Scope: 'bg-purple-100 text-purple-700',
  Timeline: 'bg-blue-100 text-blue-700',
  Budget: 'bg-emerald-100 text-emerald-700',
  Resource: 'bg-orange-100 text-orange-700',
  Technical: 'bg-indigo-100 text-indigo-700',
};

type FormData = Omit<ChangeRequest, 'id'>;

const emptyForm = (): FormData => ({
  title: '',
  project: '',
  type: 'Scope',
  raisedBy: '',
  raisedDate: '',
  status: 'Raised',
  impact: 'Medium',
  description: '',
  justification: '',
  scopeImpact: '',
  timelineImpact: '',
  budgetImpact: '',
  resourceImpact: '',
  reviewedBy: '',
  reviewDate: '',
  decision: '',
});

function nextId(items: ChangeRequest[]): string {
  const nums = items.map(i => parseInt(i.id.replace('CR-', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `CR-${String(max + 1).padStart(3, '0')}`;
}

interface Props { onBack: () => void; }

export const ChangeControl: React.FC<Props> = ({ onBack }) => {
  const [items, setItems] = useState<ChangeRequest[]>(() => loadFromStorage(STORAGE_KEYS.CHANGE_REQUESTS, defaultItems));
  const [selected, setSelected] = useState<ChangeRequest | null>(null);
  const [filter, setFilter] = useState<'All' | ChangeStatus>('All');

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.CHANGE_REQUESTS, items); }, [items]);

  const filtered = items.filter(c => filter === 'All' || c.status === filter);
  const pending = items.filter(c => c.status === 'Raised' || c.status === 'Under Review').length;
  const approved = items.filter(c => c.status === 'Approved').length;

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(cr: ChangeRequest) {
    setEditingId(cr.id);
    setForm({ title: cr.title, project: cr.project, type: cr.type, raisedBy: cr.raisedBy, raisedDate: cr.raisedDate, status: cr.status, impact: cr.impact, description: cr.description, justification: cr.justification, scopeImpact: cr.scopeImpact, timelineImpact: cr.timelineImpact, budgetImpact: cr.budgetImpact, resourceImpact: cr.resourceImpact, reviewedBy: cr.reviewedBy, reviewDate: cr.reviewDate, decision: cr.decision });
    setSelected(null);
    setShowForm(true);
  }

  function saveForm() {
    if (!form.title.trim() || !form.project.trim()) return;
    if (editingId) {
      setItems(prev => prev.map(i => i.id === editingId ? { ...form, id: editingId } : i));
    } else {
      setItems(prev => [...prev, { ...form, id: nextId(items) }]);
    }
    setShowForm(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setItems(prev => prev.filter(i => i.id !== deleteId));
    setDeleteId(null);
    if (selected?.id === deleteId) setSelected(null);
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
  const ta = (field: keyof FormData) => (
    <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              <h1 className="text-2xl font-bold text-gray-900">Change Control</h1>
              <p className="text-sm text-gray-500">Change requests, approvals and impact assessments across the portfolio</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Raise Change Request
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Total Changes</p><p className="text-3xl font-bold text-gray-900">{items.length}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Pending Review</p><p className="text-3xl font-bold text-blue-600">{pending}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Approved</p><p className="text-3xl font-bold text-green-600">{approved}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">High Impact</p><p className="text-3xl font-bold text-red-600">{items.filter(c => c.impact === 'High').length}</p></div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['All', 'Raised', 'Under Review', 'Approved', 'Rejected', 'Implemented'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Impact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Raised By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(cr => (
                <tr key={cr.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 cursor-pointer" onClick={() => setSelected(cr)}>{cr.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate cursor-pointer" onClick={() => setSelected(cr)}>{cr.title}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate cursor-pointer" onClick={() => setSelected(cr)}>{cr.project}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(cr)}><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[cr.type]}`}>{cr.type}</span></td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(cr)}><span className={`px-2 py-0.5 rounded text-xs font-medium ${impactColors[cr.impact]}`}>{cr.impact}</span></td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelected(cr)}>{cr.raisedBy}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(cr)}><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[cr.status]}`}>{cr.status}</span></td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelected(cr)}>{cr.raisedDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(cr)} className="p-1.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteId(cr.id)} className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[selected.type]}`}>{selected.type}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${impactColors[selected.impact]}`}>{selected.impact} Impact</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selected.status]}`}>{selected.status}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
                <p className="text-sm text-gray-500">{selected.project}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">Edit</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-4"><p className="font-semibold text-gray-700 mb-1">Description</p><p className="text-gray-600">{selected.description}</p></div>
              <div className="bg-blue-50 rounded-xl p-4"><p className="font-semibold text-blue-800 mb-1">Justification</p><p className="text-blue-700">{selected.justification}</p></div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="font-semibold text-gray-700 mb-3">Impact Assessment</p>
                <div className="space-y-2">
                  {[
                    { label: 'Scope', value: selected.scopeImpact },
                    { label: 'Timeline', value: selected.timelineImpact },
                    { label: 'Budget', value: selected.budgetImpact },
                    { label: 'Resource', value: selected.resourceImpact },
                  ].map(i => (
                    <div key={i.label} className="flex gap-3">
                      <span className="font-medium text-gray-500 w-20 shrink-0">{i.label}</span>
                      <span className="text-gray-700">{i.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selected.decision && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4"><p className="font-semibold text-green-800 mb-1">Decision — {selected.reviewedBy} ({selected.reviewDate})</p><p className="text-green-700">{selected.decision}</p></div>
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
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Change Request' : 'Raise Change Request'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">{f('Title', true)}{inp('title')}</div>
                <div className="col-span-2">{f('Project', true)}{inp('project')}</div>
                <div>{f('Type')}{sel('type', ['Scope', 'Timeline', 'Budget', 'Resource', 'Technical'])}</div>
                <div>{f('Impact')}{sel('impact', ['High', 'Medium', 'Low'])}</div>
                <div>{f('Raised By')}{inp('raisedBy')}</div>
                <div>{f('Raised Date')}{inp('raisedDate')}</div>
                <div>{f('Status')}{sel('status', ['Raised', 'Under Review', 'Approved', 'Rejected', 'Withdrawn', 'Implemented'])}</div>
              </div>
              <div>{f('Description')}{ta('description')}</div>
              <div>{f('Justification')}{ta('justification')}</div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Impact Assessment</p>
              <div>{f('Scope Impact')}{inp('scopeImpact')}</div>
              <div>{f('Timeline Impact')}{inp('timelineImpact')}</div>
              <div>{f('Budget Impact')}{inp('budgetImpact')}</div>
              <div>{f('Resource Impact')}{inp('resourceImpact')}</div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Review / Decision</p>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Reviewed By')}{inp('reviewedBy')}</div>
                <div>{f('Review Date')}{inp('reviewDate')}</div>
              </div>
              <div>{f('Decision')}{ta('decision')}</div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} disabled={!form.title.trim() || !form.project.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors">
                {editingId ? 'Save Changes' : 'Raise Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Change Request?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently remove <strong>{items.find(i => i.id === deleteId)?.id}</strong> from the register. This cannot be undone.</p>
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
