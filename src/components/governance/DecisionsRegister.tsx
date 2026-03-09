import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

type DecisionStatus = 'Active' | 'Superseded' | 'Under Review';

interface Decision {
  id: string;
  title: string;
  project: string;
  madeBy: string;
  date: string;
  category: string;
  rationale: string;
  alternatives: string;
  impact: string;
  status: DecisionStatus;
  reviewDate: string;
  linkedRisks: string;
}

const defaultItems: Decision[] = [
  {
    id: 'DEC-001',
    title: 'Adopt AWS as primary cloud provider',
    project: 'Cloud Migration Initiative',
    madeBy: 'CTO — Alison Park',
    date: '10 Jan 2025',
    category: 'Technical Architecture',
    rationale: 'AWS offers the best combination of existing team expertise, enterprise support, and compliance tooling for our requirements. Existing AWS credits reduce Year 1 cost.',
    alternatives: 'Azure evaluated — comparable capability but team reskilling cost prohibitive. GCP ruled out due to limited enterprise support in EMEA.',
    impact: 'All new infrastructure to be built on AWS. Existing Azure dev environment to be migrated by Q2 2025.',
    status: 'Active',
    reviewDate: '',
    linkedRisks: 'R-001',
  },
  {
    id: 'DEC-002',
    title: 'Use Snowflake as the enterprise data warehouse',
    project: 'Data Analytics Platform',
    madeBy: 'CDO — Rachel Kim',
    date: '15 Feb 2025',
    category: 'Technical Architecture',
    rationale: 'Snowflake provides best-in-class query performance, native support for semi-structured data, and seamless dbt integration. Cost model is predictable at current data volumes.',
    alternatives: 'Redshift assessed — AWS-native advantage offset by higher admin overhead. BigQuery strong but Google ecosystem lock-in undesirable.',
    impact: 'Data warehouse vendor selected. Procurement to raise PO. Marcus Johnson to lead implementation.',
    status: 'Active',
    reviewDate: '',
    linkedRisks: '',
  },
  {
    id: 'DEC-003',
    title: 'Adopt Agile delivery methodology across all programmes',
    project: 'Digital Transformation Programme',
    madeBy: 'Programme Board',
    date: '05 Jan 2025',
    category: 'Delivery Approach',
    rationale: 'Waterfall approach has led to late-stage change requests and poor stakeholder engagement on previous programmes. Agile enables iterative delivery and faster feedback loops.',
    alternatives: 'Hybrid PRINCE2/Agile considered — adds governance overhead without equivalent benefit at programme scale.',
    impact: 'All programme workstreams to adopt 2-week sprints. Programme Manager to establish Agile coaching support.',
    status: 'Active',
    reviewDate: '',
    linkedRisks: '',
  },
  {
    id: 'DEC-004',
    title: 'Defer offline mode to Mobile App v1.1',
    project: 'Mobile App Launch',
    madeBy: 'Product Director — Tom Nguyen',
    date: '10 Mar 2025',
    category: 'Scope',
    rationale: 'Offline sync represents 4 weeks of critical path work for a feature used by <20% of field team journeys. Deferral enables earlier go-live for 80% of value.',
    alternatives: 'Retaining offline mode within v1 scope was assessed — modelling showed 4-week delay to all users to serve minority use case.',
    impact: 'v1 goes live without offline mode. v1.1 roadmap item committed with 3-month post-launch target.',
    status: 'Active',
    reviewDate: '',
    linkedRisks: '',
  },
  {
    id: 'DEC-005',
    title: 'Centralise RAID management in portfolio tool',
    project: 'Digital Transformation Programme',
    madeBy: 'Sarah Chen',
    date: '15 Jan 2025',
    category: 'Governance',
    rationale: 'Risks and issues tracked in disparate spreadsheets with no programme-level visibility. Centralised RAID enables early escalation and portfolio-level risk reporting.',
    alternatives: 'JIRA-based risk tracking considered — integration complexity and license cost outweigh benefits.',
    impact: 'All programme managers to migrate existing RAID items to central register by 31 Jan 2025.',
    status: 'Active',
    reviewDate: '',
    linkedRisks: '',
  },
  {
    id: 'DEC-006',
    title: 'Select React Native for mobile cross-platform development',
    project: 'Mobile App Launch',
    madeBy: 'CTO — Alison Park',
    date: '01 May 2025',
    category: 'Technical Architecture',
    rationale: 'React Native enables single codebase for iOS and Android, reducing build cost by ~40% vs native. Existing TypeScript skills in team directly transferable.',
    alternatives: 'Native iOS/Android — 40% higher cost, double the maintenance. Flutter assessed — smaller talent pool increases hiring risk.',
    impact: 'Tom Nguyen to lead React Native build. Single codebase to be maintained post-launch.',
    status: 'Active',
    reviewDate: '',
    linkedRisks: '',
  },
  {
    id: 'DEC-007',
    title: 'Outsource penetration testing to CyberShield Ltd',
    project: 'Security Compliance Programme',
    madeBy: 'Emma Davis',
    date: '03 Mar 2025',
    category: 'Procurement',
    rationale: 'Original vendor unavailable. CyberShield is CREST certified, has immediate capacity, and references from peer organisations. Marginal cost premium is justified to maintain schedule.',
    alternatives: 'Delay pen test by 6 weeks to wait for original vendor — unacceptable given ISO certification timeline.',
    impact: 'PO to be raised immediately. Emma Davis to onboard CyberShield by 10 Mar.',
    status: 'Active',
    reviewDate: '',
    linkedRisks: '',
  },
];

const statusColors: Record<DecisionStatus, string> = {
  Active: 'bg-green-100 text-green-800',
  Superseded: 'bg-gray-100 text-gray-500',
  'Under Review': 'bg-amber-100 text-amber-700',
};

const categoryColors: Record<string, string> = {
  'Technical Architecture': 'bg-blue-100 text-blue-700',
  'Delivery Approach': 'bg-purple-100 text-purple-700',
  Scope: 'bg-indigo-100 text-indigo-700',
  Governance: 'bg-teal-100 text-teal-700',
  Procurement: 'bg-orange-100 text-orange-700',
};

type FormData = Omit<Decision, 'id'>;

const emptyForm = (): FormData => ({
  title: '',
  project: '',
  madeBy: '',
  date: '',
  category: 'Technical Architecture',
  rationale: '',
  alternatives: '',
  impact: '',
  status: 'Active',
  reviewDate: '',
  linkedRisks: '',
});

function nextId(items: Decision[]): string {
  const nums = items.map(i => parseInt(i.id.replace('DEC-', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `DEC-${String(max + 1).padStart(3, '0')}`;
}

interface Props { onBack: () => void; }

export const DecisionsRegister: React.FC<Props> = ({ onBack }) => {
  const [items, setItems] = useState<Decision[]>(() => loadFromStorage(STORAGE_KEYS.DECISIONS, defaultItems));
  const [selected, setSelected] = useState<Decision | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.DECISIONS, items); }, [items]);

  const allCategories = Array.from(new Set(items.map(d => d.category)));
  const categories = ['All', ...allCategories];

  const filtered = items.filter(d => {
    const matchCat = filterCategory === 'All' || d.category === filterCategory;
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.project.toLowerCase().includes(search.toLowerCase()) || d.madeBy.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(d: Decision) {
    setEditingId(d.id);
    setForm({ title: d.title, project: d.project, madeBy: d.madeBy, date: d.date, category: d.category, rationale: d.rationale, alternatives: d.alternatives, impact: d.impact, status: d.status, reviewDate: d.reviewDate, linkedRisks: d.linkedRisks });
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
              <h1 className="text-2xl font-bold text-gray-900">Decisions Register</h1>
              <p className="text-sm text-gray-500">Log of key decisions made across programmes with rationale and impact</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Log Decision
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Total Decisions</p><p className="text-3xl font-bold text-gray-900">{items.length}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Active</p><p className="text-3xl font-bold text-green-600">{items.filter(d => d.status === 'Active').length}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Categories</p><p className="text-3xl font-bold text-blue-600">{allCategories.length}</p></div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Search decisions..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid gap-4">
          {filtered.map(d => (
            <div key={d.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all hover:border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => setSelected(d)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{d.id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[d.category] || 'bg-gray-100 text-gray-600'}`}>{d.category}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[d.status]}`}>{d.status}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base mb-1">{d.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{d.rationale}</p>
                  <p className="text-xs text-blue-600 mt-2">{d.project}</p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="text-right text-xs text-gray-400">
                    <div>{d.madeBy}</div>
                    <div>{d.date}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteId(d.id)} className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Delete">
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
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[selected.category] || 'bg-gray-100 text-gray-600'}`}>{selected.category}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selected.status]}`}>{selected.status}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
                <p className="text-sm text-gray-500">{selected.project} — {selected.madeBy} on {selected.date}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">Edit</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 rounded-xl p-4"><p className="font-semibold text-blue-800 mb-1">Rationale</p><p className="text-blue-700">{selected.rationale}</p></div>
              <div className="bg-gray-50 rounded-xl p-4"><p className="font-semibold text-gray-700 mb-1">Alternatives Considered</p><p className="text-gray-600">{selected.alternatives}</p></div>
              <div className="bg-amber-50 rounded-xl p-4"><p className="font-semibold text-amber-800 mb-1">Impact</p><p className="text-amber-700">{selected.impact}</p></div>
              {selected.linkedRisks && (
                <div className="bg-red-50 rounded-xl p-4"><p className="font-semibold text-red-800 mb-1">Linked Risks</p><p className="text-red-700">{selected.linkedRisks}</p></div>
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
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Decision' : 'Log Decision'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>{f('Title', true)}{inp('title')}</div>
              <div>{f('Project', true)}{inp('project')}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Made By')}{inp('madeBy')}</div>
                <div>{f('Date')}{inp('date')}</div>
                <div>{f('Category')}{sel('category', ['Technical Architecture', 'Delivery Approach', 'Scope', 'Governance', 'Procurement', 'Financial', 'Risk', 'Vendor', 'Other'])}</div>
                <div>{f('Status')}{sel('status', ['Active', 'Under Review', 'Superseded'])}</div>
              </div>
              <div>{f('Rationale')}{ta('rationale', 3)}</div>
              <div>{f('Alternatives Considered')}{ta('alternatives', 2)}</div>
              <div>{f('Impact')}{ta('impact', 2)}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Review Date')}{inp('reviewDate')}</div>
                <div>{f('Linked Risks (e.g. R-001)')}{inp('linkedRisks')}</div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} disabled={!form.title.trim() || !form.project.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors">
                {editingId ? 'Save Changes' : 'Log Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Decision?</h3>
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
