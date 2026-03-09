import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

type BenefitStatus = 'On Track' | 'At Risk' | 'Achieved' | 'Not Started' | 'Delayed';

interface Benefit {
  id: string;
  name: string;
  project: string;
  category: string;
  type: 'Financial' | 'Non-Financial';
  expectedValue: string;
  realisedValue: string;
  targetDate: string;
  realisedDate: string;
  owner: string;
  status: BenefitStatus;
  measureMethod: string;
  notes: string;
  pctRealised: number;
}

const defaultItems: Benefit[] = [
  { id: 'B-001', name: 'Reduction in manual processing costs', project: 'Digital Transformation Programme', category: 'Cost Reduction', type: 'Financial', expectedValue: '£480,000 per year', realisedValue: '£210,000 per year', targetDate: '31 Dec 2025', realisedDate: '', owner: 'Sarah Chen', status: 'On Track', measureMethod: 'Finance team monthly cost reporting vs FY24 baseline', notes: 'On track to hit full annual saving by end of year as automation phases complete.', pctRealised: 44 },
  { id: 'B-002', name: 'Improved customer satisfaction score (NPS)', project: 'Customer Portal Redesign', category: 'Customer Experience', type: 'Non-Financial', expectedValue: 'NPS increase from 34 to 55', realisedValue: 'NPS currently 41', targetDate: '30 Sep 2025', realisedDate: '', owner: 'Priya Patel', status: 'At Risk', measureMethod: 'Quarterly customer NPS survey', notes: 'Portal still in development; early beta feedback positive but full rollout needed to move score.', pctRealised: 33 },
  { id: 'B-003', name: 'Infrastructure cost savings from cloud', project: 'Cloud Migration Initiative', category: 'Cost Reduction', type: 'Financial', expectedValue: '£320,000 per year', realisedValue: '£280,000 per year', targetDate: '31 Dec 2025', realisedDate: 'In progress', owner: 'James Wright', status: 'On Track', measureMethod: 'AWS cost explorer vs previous data centre invoices', notes: 'Migration 72% complete. Pro-rated savings already visible in monthly reporting.', pctRealised: 88 },
  { id: 'B-004', name: 'Reduction in data breach risk', project: 'Security Compliance Programme', category: 'Risk Reduction', type: 'Non-Financial', expectedValue: 'ISO 27001 certification achieved', realisedValue: 'Stage 1 audit passed', targetDate: '30 Nov 2025', realisedDate: '', owner: 'Emma Davis', status: 'At Risk', measureMethod: 'Certification body audit sign-off', notes: 'Critical pen test findings may delay certification. Stage 2 audit at risk.', pctRealised: 50 },
  { id: 'B-005', name: 'Faster time-to-insight for business decisions', project: 'Data Analytics Platform', category: 'Productivity', type: 'Non-Financial', expectedValue: 'Avg report generation from 3 days to 2 hours', realisedValue: 'Not yet realised — platform in build', targetDate: '31 Mar 2026', realisedDate: '', owner: 'Marcus Johnson', status: 'Not Started', measureMethod: 'Tracking time from data request to report delivery', notes: 'Platform in early build phase. Benefit will be measured post go-live.', pctRealised: 0 },
  { id: 'B-006', name: 'Increased field team productivity', project: 'Mobile App Launch', category: 'Productivity', type: 'Financial', expectedValue: '£150,000 per year in efficiency savings', realisedValue: '£0 (not yet launched)', targetDate: '15 Dec 2025', realisedDate: '', owner: 'Tom Nguyen', status: 'Not Started', measureMethod: 'Time-and-motion study comparing pre/post app workflows', notes: 'Baseline measurement study completed. Post-launch tracking plan agreed.', pctRealised: 0 },
  { id: 'B-007', name: 'Reduction in compliance penalties', project: 'Security Compliance Programme', category: 'Risk Reduction', type: 'Financial', expectedValue: 'Avoid £200,000+ in potential regulatory fines', realisedValue: 'No penalties incurred this year', targetDate: '31 Dec 2025', realisedDate: 'Ongoing', owner: 'Emma Davis', status: 'Achieved', measureMethod: 'Regulatory audit outcomes and penalty notices', notes: 'Compliance posture significantly improved. No fines in 12 months vs £85k previous year.', pctRealised: 100 },
];

const statusColors: Record<BenefitStatus, string> = {
  'On Track': 'bg-green-100 text-green-800',
  'At Risk': 'bg-amber-100 text-amber-800',
  'Achieved': 'bg-blue-100 text-blue-800',
  'Not Started': 'bg-gray-100 text-gray-600',
  'Delayed': 'bg-red-100 text-red-800',
};

type FormData = Omit<Benefit, 'id'>;

const emptyForm = (): FormData => ({
  name: '',
  project: '',
  category: '',
  type: 'Financial',
  expectedValue: '',
  realisedValue: '',
  targetDate: '',
  realisedDate: '',
  owner: '',
  status: 'Not Started',
  measureMethod: '',
  notes: '',
  pctRealised: 0,
});

function nextId(items: Benefit[]): string {
  const nums = items.map(i => parseInt(i.id.replace('B-', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `B-${String(max + 1).padStart(3, '0')}`;
}

interface Props { onBack: () => void; }

export const BenefitsRealisation: React.FC<Props> = ({ onBack }) => {
  const [items, setItems] = useState<Benefit[]>(() => loadFromStorage(STORAGE_KEYS.BENEFITS, defaultItems));
  const [selected, setSelected] = useState<Benefit | null>(null);
  const [filter, setFilter] = useState<'All' | BenefitStatus>('All');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.BENEFITS, items); }, [items]);

  const filtered = items.filter(b => filter === 'All' || b.status === filter);
  const achieved = items.filter(b => b.status === 'Achieved').length;
  const onTrack = items.filter(b => b.status === 'On Track').length;
  const atRisk = items.filter(b => b.status === 'At Risk').length;

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(b: Benefit) {
    setEditingId(b.id);
    const { id: _id, ...rest } = b;
    setForm(rest);
    setSelected(null);
    setShowForm(true);
  }

  function saveForm() {
    if (!form.name.trim() || !form.project.trim()) return;
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
      value={form[field] as string | number}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
  );
  const num = (field: keyof FormData) => (
    <input type="number" min={0} max={100} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] as number}
      onChange={e => setForm(p => ({ ...p, [field]: Number(e.target.value) }))} />
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
              <h1 className="text-2xl font-bold text-gray-900">Benefits Realisation</h1>
              <p className="text-sm text-gray-500">Tracking whether projects are delivering their expected outcomes</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Benefit
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Total Benefits</p><p className="text-3xl font-bold text-gray-900">{items.length}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Achieved</p><p className="text-3xl font-bold text-blue-600">{achieved}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">On Track</p><p className="text-3xl font-bold text-green-600">{onTrack}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">At Risk</p><p className="text-3xl font-bold text-amber-500">{atRisk}</p></div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['All', 'On Track', 'At Risk', 'Achieved', 'Not Started', 'Delayed'] as const).map(s => (
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Benefit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Realisation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(b)}>
                    <div className="font-medium text-gray-900 max-w-xs truncate">{b.name}</div>
                    <div className="text-xs text-gray-400">{b.category}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate cursor-pointer" onClick={() => setSelected(b)}>{b.project}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(b)}>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${b.type === 'Financial' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>{b.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelected(b)}>{b.owner}</td>
                  <td className="px-4 py-3 w-36 cursor-pointer" onClick={() => setSelected(b)}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${b.pctRealised}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{b.pctRealised}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(b)}>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[b.status]}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelected(b)}>{b.targetDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteId(b.id)} className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Delete">
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${selected.type === 'Financial' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>{selected.type}</span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">{selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.project}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">Edit</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Realisation Progress — {selected.pctRealised}%</p>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${selected.pctRealised}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><p className="text-gray-500">Expected Value</p><p className="font-medium">{selected.expectedValue}</p></div>
              <div><p className="text-gray-500">Realised Value</p><p className="font-medium">{selected.realisedValue}</p></div>
              <div><p className="text-gray-500">Owner</p><p className="font-medium">{selected.owner}</p></div>
              <div><p className="text-gray-500">Status</p><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selected.status]}`}>{selected.status}</span></div>
              <div><p className="text-gray-500">Target Date</p><p className="font-medium">{selected.targetDate}</p></div>
              <div><p className="text-gray-500">Category</p><p className="font-medium">{selected.category}</p></div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm mb-3">
              <p className="font-semibold text-blue-800 mb-1">Measurement Method</p>
              <p className="text-blue-700">{selected.measureMethod}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm">
              <p className="font-semibold text-gray-700 mb-1">Notes</p>
              <p className="text-gray-600">{selected.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Benefit' : 'Add Benefit'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>{f('Benefit Name', true)}{inp('name')}</div>
              <div>{f('Project', true)}{inp('project')}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Category')}{inp('category')}</div>
                <div>{f('Type')}{sel('type', ['Financial', 'Non-Financial'])}</div>
                <div>{f('Owner')}{inp('owner')}</div>
                <div>{f('Status')}{sel('status', ['Not Started', 'On Track', 'At Risk', 'Achieved', 'Delayed'])}</div>
                <div>{f('Target Date')}{inp('targetDate')}</div>
                <div>{f('% Realised (0–100)')}{num('pctRealised')}</div>
              </div>
              <div>{f('Expected Value')}{inp('expectedValue')}</div>
              <div>{f('Realised Value')}{inp('realisedValue')}</div>
              <div>{f('Measurement Method')}{ta('measureMethod')}</div>
              <div>{f('Notes')}{ta('notes')}</div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} disabled={!form.name.trim() || !form.project.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors">
                {editingId ? 'Save Changes' : 'Add Benefit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Benefit?</h3>
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
