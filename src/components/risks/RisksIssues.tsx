import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

type RAIDType = 'Risk' | 'Assumption' | 'Issue' | 'Dependency';
type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type RAIDStatus = 'Open' | 'In Progress' | 'Closed' | 'Mitigated' | 'Accepted';

interface RAIDItem {
  id: string;
  type: RAIDType;
  title: string;
  description: string;
  severity: Severity;
  probability?: string;
  impact: string;
  owner: string;
  project: string;
  status: RAIDStatus;
  raised: string;
  dueDate: string;
  mitigation: string;
}

const defaultItems: RAIDItem[] = [
  { id: 'R-001', type: 'Risk', title: 'Key vendor contract expiry', description: 'Primary cloud vendor contract expires in Q3 with no renewal agreed.', severity: 'Critical', probability: 'High', impact: 'Programme delivery halt and significant cost overrun', owner: 'Emma Davis', project: 'Cloud Migration Initiative', status: 'Open', raised: '15 Jan 2025', dueDate: '30 Apr 2025', mitigation: 'Engage procurement to fast-track renewal negotiations.' },
  { id: 'R-002', type: 'Risk', title: 'Resource availability — Q2 peak', description: 'Multiple projects competing for the same engineering resources during Q2.', severity: 'High', probability: 'High', impact: 'Delayed deliverables across 3 programmes', owner: 'James Wright', project: 'Digital Transformation Programme', status: 'In Progress', raised: '20 Jan 2025', dueDate: '15 Mar 2025', mitigation: 'Resource levelling review scheduled with all programme managers.' },
  { id: 'R-003', type: 'Risk', title: 'Scope creep on Customer Portal', description: 'Stakeholders continue to add requirements outside agreed scope baseline.', severity: 'High', probability: 'High', impact: 'Budget overrun and missed go-live date', owner: 'Priya Patel', project: 'Customer Portal Redesign', status: 'Open', raised: '10 Feb 2025', dueDate: '20 Mar 2025', mitigation: 'Formal change control board to be convened.' },
  { id: 'A-001', type: 'Assumption', title: 'Business-as-usual funding confirmed', description: 'Assuming FY26 BAU budget is approved at the same level as FY25.', severity: 'High', impact: 'If not confirmed, 2 projects will need to pause', owner: 'Sarah Chen', project: 'Digital Transformation Programme', status: 'Open', raised: '01 Jan 2025', dueDate: '31 Mar 2025', mitigation: 'CFO sign-off expected by end of Q1.' },
  { id: 'I-001', type: 'Issue', title: 'Test environment unavailable', description: 'The shared test environment has been down for 6 days causing testing delays.', severity: 'Critical', impact: '6-day delay to UAT schedule', owner: 'James Wright', project: 'Cloud Migration Initiative', status: 'In Progress', raised: '01 Mar 2025', dueDate: '10 Mar 2025', mitigation: 'Infra team engaged. Temporary environment being provisioned.' },
  { id: 'D-001', type: 'Dependency', title: 'Identity platform upgrade', description: 'Mobile App Launch depends on the Identity Platform upgrade completing by end of April.', severity: 'High', impact: 'Mobile app cannot go live without SSO capability', owner: 'Tom Nguyen', project: 'Mobile App Launch', status: 'Open', raised: '10 Feb 2025', dueDate: '30 Apr 2025', mitigation: 'Weekly sync with Identity team.' },
];

const emptyForm = (): Omit<RAIDItem, 'id'> => ({
  type: 'Risk', title: '', description: '', severity: 'Medium', probability: '',
  impact: '', owner: '', project: '', status: 'Open',
  raised: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  dueDate: '', mitigation: '',
});

const severityColors: Record<Severity, string> = { Critical: 'bg-red-100 text-red-800', High: 'bg-orange-100 text-orange-800', Medium: 'bg-yellow-100 text-yellow-800', Low: 'bg-green-100 text-green-800' };
const statusColors: Record<RAIDStatus, string> = { Open: 'bg-red-50 text-red-700', 'In Progress': 'bg-blue-50 text-blue-700', Closed: 'bg-gray-100 text-gray-600', Mitigated: 'bg-green-50 text-green-700', Accepted: 'bg-purple-50 text-purple-700' };
const typeColors: Record<RAIDType, string> = { Risk: 'bg-red-100 text-red-700', Assumption: 'bg-purple-100 text-purple-700', Issue: 'bg-orange-100 text-orange-700', Dependency: 'bg-blue-100 text-blue-700' };

interface Props { onBack: () => void; }

export const RisksIssues: React.FC<Props> = ({ onBack }) => {
  const [items, setItems] = useState<RAIDItem[]>(() => loadFromStorage(STORAGE_KEYS.RAID_ITEMS, defaultItems));
  const [activeTab, setActiveTab] = useState<RAIDType | 'All'>('All');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RAIDStatus | 'All'>('All');
  const [selected, setSelected] = useState<RAIDItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RAIDItem | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.RAID_ITEMS, items); }, [items]);

  const openAdd = () => { setForm(emptyForm()); setEditing(null); setFormOpen(true); };
  const openEdit = (item: RAIDItem) => { setEditing(item); setForm({ ...item }); setSelected(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      setItems(prev => prev.map(i => i.id === editing.id ? { ...form, id: editing.id } : i));
    } else {
      const prefix = form.type === 'Risk' ? 'R' : form.type === 'Assumption' ? 'A' : form.type === 'Issue' ? 'I' : 'D';
      setItems(prev => [...prev, { ...form, id: `${prefix}-${String(prev.filter(i => i.type === form.type).length + 1).padStart(3, '0')}` }]);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelected(null);
    setDeleteConfirm(null);
  };

  const filtered = items.filter(item => {
    const matchTab = activeTab === 'All' || item.type === activeTab;
    const matchStatus = filterStatus === 'All' || item.status === filterStatus;
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.owner.toLowerCase().includes(search.toLowerCase()) || item.project.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchStatus && matchSearch;
  });

  const counts = { All: items.length, Risk: items.filter(i => i.type === 'Risk').length, Issue: items.filter(i => i.type === 'Issue').length, Assumption: items.filter(i => i.type === 'Assumption').length, Dependency: items.filter(i => i.type === 'Dependency').length };
  const openCritical = items.filter(i => i.status === 'Open' && i.severity === 'Critical').length;
  const openHigh = items.filter(i => i.status === 'Open' && i.severity === 'High').length;
  const totalOpen = items.filter(i => i.status === 'Open' || i.status === 'In Progress').length;

  const field = (label: string, children: React.ReactNode) => (
    <div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>
  );
  const input = (key: keyof typeof form, placeholder = '') => (
    <input value={(form[key] as string) || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
  );
  const select = (key: keyof typeof form, options: string[]) => (
    <select value={(form[key] as string) || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
  const textarea = (key: keyof typeof form, placeholder = '') => (
    <textarea value={(form[key] as string) || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} rows={2}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Governance & Oversight
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Risks & Issues</h1>
              <p className="text-sm text-gray-500">RAID Log — Risks, Assumptions, Issues & Dependencies</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add RAID Item
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Total Items</p><p className="text-3xl font-bold text-gray-900">{items.length}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Open / In Progress</p><p className="text-3xl font-bold text-blue-600">{totalOpen}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Critical Open</p><p className="text-3xl font-bold text-red-600">{openCritical}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">High Open</p><p className="text-3xl font-bold text-orange-500">{openHigh}</p></div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(['All', 'Risk', 'Issue', 'Assumption', 'Dependency'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              {tab} <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{counts[tab]}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="All">All Statuses</option>
            {['Open', 'In Progress', 'Mitigated', 'Accepted', 'Closed'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 cursor-pointer" onClick={() => setSelected(item)}>{item.id}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(item)}><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[item.type]}`}>{item.type}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate cursor-pointer" onClick={() => setSelected(item)}>{item.title}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(item)}><span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[item.severity]}`}>{item.severity}</span></td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate cursor-pointer" onClick={() => setSelected(item)}>{item.project}</td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelected(item)}>{item.owner}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(item)}><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status]}`}>{item.status}</span></td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelected(item)}>{item.dueDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors" title="Edit">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 hover:bg-red-100 rounded text-red-500 transition-colors" title="Delete">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No items match your filters.</div>}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[selected.type]}`}>{selected.type}</span>
                <span className="font-mono text-xs text-gray-500">{selected.id}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{selected.title}</h2>
            <p className="text-gray-600 text-sm mb-4">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><p className="text-gray-500">Severity</p><span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[selected.severity]}`}>{selected.severity}</span></div>
              <div><p className="text-gray-500">Status</p><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selected.status]}`}>{selected.status}</span></div>
              {selected.probability && <div><p className="text-gray-500">Probability</p><p className="font-medium">{selected.probability}</p></div>}
              <div><p className="text-gray-500">Owner</p><p className="font-medium">{selected.owner}</p></div>
              <div><p className="text-gray-500">Project</p><p className="font-medium">{selected.project}</p></div>
              <div><p className="text-gray-500">Raised</p><p className="font-medium">{selected.raised}</p></div>
              <div><p className="text-gray-500">Due Date</p><p className="font-medium">{selected.dueDate}</p></div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm mb-3"><p className="font-semibold text-amber-800 mb-1">Impact</p><p className="text-amber-700">{selected.impact}</p></div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm"><p className="font-semibold text-blue-800 mb-1">Mitigation / Action</p><p className="text-blue-700">{selected.mitigation}</p></div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit RAID Item' : 'Add RAID Item'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field('Type', select('type', ['Risk', 'Assumption', 'Issue', 'Dependency']))}
                {field('Severity', select('severity', ['Critical', 'High', 'Medium', 'Low']))}
              </div>
              {field('Title *', input('title', 'Brief title for this item'))}
              {field('Description', textarea('description', 'Describe the risk, issue or assumption...'))}
              <div className="grid grid-cols-2 gap-4">
                {field('Project', input('project', 'Project name'))}
                {field('Owner', input('owner', 'Responsible owner'))}
              </div>
              {form.type === 'Risk' && field('Probability', select('probability', ['', 'High', 'Medium', 'Low']))}
              {field('Impact', textarea('impact', 'What is the impact if this occurs?'))}
              {field('Mitigation / Action', textarea('mitigation', 'What action is being taken?'))}
              <div className="grid grid-cols-2 gap-4">
                {field('Status', select('status', ['Open', 'In Progress', 'Mitigated', 'Accepted', 'Closed']))}
                {field('Due Date', input('dueDate', 'e.g. 30 Apr 2025'))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
                  {editing ? 'Save Changes' : 'Add Item'}
                </button>
                <button type="button" onClick={closeForm} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete RAID Item?</h3>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
