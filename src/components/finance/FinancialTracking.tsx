import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

interface ProjectFinancials {
  id: string;
  name: string;
  rag: 'green' | 'amber' | 'red';
  budget: number;
  approved: number;
  spent: number;
  committed: number;
  forecast: number;
  contingency: number;
  owner: string;
  lastUpdated: string;
  monthlySpend: number[];
  notes: string;
}

const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const defaultFinancials: ProjectFinancials[] = [
  { id: 'f1', name: 'Digital Transformation Programme', rag: 'green', budget: 2500000, approved: 2500000, spent: 1200000, committed: 420000, forecast: 2450000, contingency: 250000, owner: 'Sarah Chen', lastUpdated: '07 Mar 2025', monthlySpend: [95000, 110000, 130000, 145000, 160000, 175000, 195000, 190000], notes: 'On track. Forecast underspend of £50k vs budget due to deferred Phase 3 scope.' },
  { id: 'f2', name: 'Cloud Migration Initiative', rag: 'amber', budget: 800000, approved: 800000, spent: 650000, committed: 95000, forecast: 820000, contingency: 80000, owner: 'James Wright', lastUpdated: '07 Mar 2025', monthlySpend: [55000, 70000, 85000, 90000, 100000, 95000, 80000, 75000], notes: 'Forecast over budget by £20k. DR site scope addition drawing on contingency.' },
  { id: 'f3', name: 'Customer Portal Redesign', rag: 'red', budget: 350000, approved: 350000, spent: 380000, committed: 40000, forecast: 420000, contingency: 0, owner: 'Priya Patel', lastUpdated: '07 Mar 2025', monthlySpend: [28000, 35000, 40000, 48000, 55000, 62000, 58000, 54000], notes: 'Over budget. Scope creep has consumed all contingency. Supplementary funding request in progress.' },
  { id: 'f4', name: 'Data Analytics Platform', rag: 'green', budget: 1200000, approved: 1200000, spent: 420000, committed: 180000, forecast: 1150000, contingency: 120000, owner: 'Marcus Johnson', lastUpdated: '07 Mar 2025', monthlySpend: [20000, 30000, 45000, 55000, 65000, 75000, 70000, 60000], notes: 'Forecast underspend of £50k. Deferred ML features freed budget. Contingency intact.' },
  { id: 'f5', name: 'Security Compliance Programme', rag: 'amber', budget: 600000, approved: 600000, spent: 310000, committed: 85000, forecast: 610000, contingency: 60000, owner: 'Emma Davis', lastUpdated: '07 Mar 2025', monthlySpend: [30000, 38000, 42000, 48000, 52000, 50000, 28000, 22000], notes: 'Slight overspend forecast due to pen test vendor change and remediation work.' },
  { id: 'f6', name: 'Mobile App Launch', rag: 'green', budget: 450000, approved: 450000, spent: 180000, committed: 65000, forecast: 435000, contingency: 45000, owner: 'Tom Nguyen', lastUpdated: '07 Mar 2025', monthlySpend: [15000, 18000, 22000, 25000, 30000, 35000, 20000, 15000], notes: 'On track. Offline mode deferral saved £22k. CR-005 iOS acceleration adds £30k back.' },
];

const ragColors = {
  green: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  red: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

const fmt = (n: number) => n >= 1000000 ? `£${(n / 1000000).toFixed(2)}m` : `£${(n / 1000).toFixed(0)}k`;

const SparkBar: React.FC<{ values: number[] }> = ({ values }) => {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} className="w-4 bg-blue-400 rounded-sm" style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
};

type FormData = {
  name: string;
  rag: 'green' | 'amber' | 'red';
  budget: number;
  approved: number;
  spent: number;
  committed: number;
  forecast: number;
  contingency: number;
  owner: string;
  lastUpdated: string;
  monthlySpendRaw: string;
  notes: string;
};

const emptyForm = (): FormData => ({
  name: '',
  rag: 'green',
  budget: 0,
  approved: 0,
  spent: 0,
  committed: 0,
  forecast: 0,
  contingency: 0,
  owner: '',
  lastUpdated: '',
  monthlySpendRaw: '',
  notes: '',
});

function nextId(items: ProjectFinancials[]): string {
  const nums = items.map(i => parseInt(i.id.replace('f', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `f${max + 1}`;
}

interface Props { onBack: () => void; }

export const FinancialTracking: React.FC<Props> = ({ onBack }) => {
  const [financials, setFinancials] = useState<ProjectFinancials[]>(() => loadFromStorage(STORAGE_KEYS.FINANCIALS, defaultFinancials));
  const [selected, setSelected] = useState<ProjectFinancials | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.FINANCIALS, financials); }, [financials]);

  const totals = {
    budget: financials.reduce((s, p) => s + p.budget, 0),
    spent: financials.reduce((s, p) => s + p.spent, 0),
    committed: financials.reduce((s, p) => s + p.committed, 0),
    forecast: financials.reduce((s, p) => s + p.forecast, 0),
  };
  const overBudget = financials.filter(p => p.forecast > p.budget).length;

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(p: ProjectFinancials) {
    setEditingId(p.id);
    setForm({ name: p.name, rag: p.rag, budget: p.budget, approved: p.approved, spent: p.spent, committed: p.committed, forecast: p.forecast, contingency: p.contingency, owner: p.owner, lastUpdated: p.lastUpdated, monthlySpendRaw: p.monthlySpend.join(', '), notes: p.notes });
    setSelected(null);
    setShowForm(true);
  }

  function saveForm() {
    if (!form.name.trim()) return;
    const monthlySpend = form.monthlySpendRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const item: ProjectFinancials = { ...form, id: editingId || nextId(financials), monthlySpend };
    if (editingId) {
      setFinancials(prev => prev.map(i => i.id === editingId ? item : i));
    } else {
      setFinancials(prev => [...prev, item]);
    }
    setShowForm(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setFinancials(prev => prev.filter(i => i.id !== deleteId));
    if (selected?.id === deleteId) setSelected(null);
    setDeleteId(null);
  }

  const f = (label: string) => <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>;
  const inp = (field: keyof FormData) => (
    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] as string | number}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
  );
  const num = (field: keyof FormData) => (
    <input type="number" min={0} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] as number}
      onChange={e => setForm(p => ({ ...p, [field]: Number(e.target.value) }))} />
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
              <h1 className="text-2xl font-bold text-gray-900">Financial Tracking</h1>
              <p className="text-sm text-gray-500">Budgets, actuals, commitments and forecasts across the portfolio</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Project Budget
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Total Budget</p><p className="text-2xl font-bold text-gray-900">{fmt(totals.budget)}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Spent to Date</p><p className="text-2xl font-bold text-blue-600">{fmt(totals.spent)}</p><p className="text-xs text-gray-400 mt-1">{totals.budget ? Math.round((totals.spent / totals.budget) * 100) : 0}% of budget</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Full Year Forecast</p><p className={`text-2xl font-bold ${totals.forecast > totals.budget ? 'text-red-600' : 'text-green-600'}`}>{fmt(totals.forecast)}</p><p className="text-xs text-gray-400 mt-1">{totals.forecast > totals.budget ? `+${fmt(totals.forecast - totals.budget)} over` : `${fmt(totals.budget - totals.forecast)} under`}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Projects Over Budget</p><p className="text-2xl font-bold text-red-600">{overBudget}</p></div>
        </div>

        {totals.budget > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Portfolio Spend vs Budget</h2>
            <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
              <div className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(totals.spent / totals.budget) * 100}%` }}>Spent</div>
              <div className="bg-blue-200 flex items-center justify-center text-xs text-blue-700 font-medium" style={{ width: `${(totals.committed / totals.budget) * 100}%` }}>Committed</div>
              <div className="bg-gray-100 flex-1" />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Spent {fmt(totals.spent)}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-200 inline-block" />Committed {fmt(totals.committed)}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Remaining {fmt(totals.budget - totals.spent - totals.committed)}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">RAG</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Spent</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Committed</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Forecast</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Trend</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {financials.map(p => {
                const variance = p.budget - p.forecast;
                const rag = ragColors[p.rag];
                return (
                  <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 cursor-pointer" onClick={() => setSelected(p)}>{p.name}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(p)}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rag.bg} ${rag.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${rag.dot}`} />
                        {p.rag === 'green' ? 'On Track' : p.rag === 'amber' ? 'At Risk' : 'Off Track'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 cursor-pointer" onClick={() => setSelected(p)}>{fmt(p.budget)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 cursor-pointer" onClick={() => setSelected(p)}>{fmt(p.spent)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 cursor-pointer" onClick={() => setSelected(p)}>{fmt(p.committed)}</td>
                    <td className={`px-4 py-3 text-right font-medium cursor-pointer ${p.forecast > p.budget ? 'text-red-600' : 'text-gray-700'}`} onClick={() => setSelected(p)}>{fmt(p.forecast)}</td>
                    <td className={`px-4 py-3 text-right font-medium cursor-pointer ${variance < 0 ? 'text-red-600' : 'text-green-600'}`} onClick={() => setSelected(p)}>
                      {variance >= 0 ? `+${fmt(variance)}` : fmt(variance)}
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(p)}>{p.monthlySpend.length > 0 && <SparkBar values={p.monthlySpend} />}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500">Owner: {selected.owner} · Updated: {selected.lastUpdated}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">Edit</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><p className="text-gray-500">Approved Budget</p><p className="font-bold text-gray-900">{fmt(selected.approved)}</p></div>
              <div><p className="text-gray-500">Full Year Forecast</p><p className={`font-bold ${selected.forecast > selected.budget ? 'text-red-600' : 'text-green-600'}`}>{fmt(selected.forecast)}</p></div>
              <div><p className="text-gray-500">Spent to Date</p><p className="font-bold text-blue-600">{fmt(selected.spent)}</p></div>
              <div><p className="text-gray-500">Committed</p><p className="font-bold text-gray-700">{fmt(selected.committed)}</p></div>
              <div><p className="text-gray-500">Contingency</p><p className={`font-bold ${selected.contingency === 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmt(selected.contingency)}</p></div>
              <div><p className="text-gray-500">Variance</p><p className={`font-bold ${selected.forecast > selected.budget ? 'text-red-600' : 'text-green-600'}`}>{selected.forecast > selected.budget ? `-${fmt(selected.forecast - selected.budget)}` : `+${fmt(selected.budget - selected.forecast)}`}</p></div>
            </div>
            {selected.monthlySpend.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Monthly Spend Trend</p>
                <div className="flex items-end gap-1 h-16 bg-gray-50 rounded-lg p-2">
                  {selected.monthlySpend.map((v, i) => {
                    const max = Math.max(...selected.monthlySpend);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-blue-400 rounded-sm" style={{ height: `${(v / max) * 100}%` }} />
                        <span className="text-xs text-gray-400">{months[i] || i + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-gray-700 mb-1">Finance Notes</p>
              <p className="text-gray-600">{selected.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Project Financials' : 'Add Project Budget'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>{f('Project Name')}<input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div>{f('RAG Status')}
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.rag} onChange={e => setForm(p => ({ ...p, rag: e.target.value as 'green' | 'amber' | 'red' }))}>
                    <option value="green">On Track</option>
                    <option value="amber">At Risk</option>
                    <option value="red">Off Track</option>
                  </select>
                </div>
                <div>{f('Owner')}{inp('owner')}</div>
                <div>{f('Last Updated')}{inp('lastUpdated')}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Budget (£)')}{num('budget')}</div>
                <div>{f('Approved (£)')}{num('approved')}</div>
                <div>{f('Spent to Date (£)')}{num('spent')}</div>
                <div>{f('Committed (£)')}{num('committed')}</div>
                <div>{f('Forecast (£)')}{num('forecast')}</div>
                <div>{f('Contingency (£)')}{num('contingency')}</div>
              </div>
              <div>
                {f('Monthly Spend (comma-separated £ values)')}
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="95000, 110000, 130000, 145000, 160000, 175000, 195000, 190000"
                  value={form.monthlySpendRaw}
                  onChange={e => setForm(p => ({ ...p, monthlySpendRaw: e.target.value }))} />
              </div>
              <div>{f('Finance Notes')}<textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} disabled={!form.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors">
                {editingId ? 'Save Changes' : 'Add Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Project Financials?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently remove <strong>{financials.find(i => i.id === deleteId)?.name}</strong> from financial tracking. This cannot be undone.</p>
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
