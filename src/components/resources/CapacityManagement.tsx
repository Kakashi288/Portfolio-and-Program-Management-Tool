import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

// ── Types ────────────────────────────────────────────────────────────────────

interface TeamCapacity {
  team: string;
  color: string;
  headcount: number;
  daysPerQuarter: number;
}

interface PipelineProject {
  id: string;
  name: string;
  status: 'Pipeline' | 'Proposed' | 'Approved';
  startQuarter: string;
  endQuarter: string;
  probability: number;
  demand: { team: string; days: number }[];
  owner: string;
  investment: string;
  description: string;
}

// ── Static data ───────────────────────────────────────────────────────────────

const quarters = ['Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'];

const teams: TeamCapacity[] = [
  { team: 'Engineering', color: 'bg-blue-500', headcount: 8, daysPerQuarter: 480 },
  { team: 'Infrastructure', color: 'bg-teal-500', headcount: 4, daysPerQuarter: 240 },
  { team: 'Product', color: 'bg-purple-500', headcount: 5, daysPerQuarter: 300 },
  { team: 'Data', color: 'bg-indigo-500', headcount: 4, daysPerQuarter: 240 },
  { team: 'Security', color: 'bg-red-500', headcount: 3, daysPerQuarter: 180 },
];

const committedDemand: Record<string, Record<string, number>> = {
  Engineering: { 'Q2 2025': 380, 'Q3 2025': 290, 'Q4 2025': 180, 'Q1 2026': 120 },
  Infrastructure: { 'Q2 2025': 220, 'Q3 2025': 180, 'Q4 2025': 80, 'Q1 2026': 60 },
  Product: { 'Q2 2025': 240, 'Q3 2025': 190, 'Q4 2025': 130, 'Q1 2026': 80 },
  Data: { 'Q2 2025': 160, 'Q3 2025': 130, 'Q4 2025': 80, 'Q1 2026': 60 },
  Security: { 'Q2 2025': 190, 'Q3 2025': 120, 'Q4 2025': 60, 'Q1 2026': 30 },
};

const defaultPipelineProjects: PipelineProject[] = [
  { id: 'P-001', name: 'AI Customer Support Initiative', status: 'Approved', startQuarter: 'Q3 2025', endQuarter: 'Q4 2025', probability: 90, owner: 'Priya Patel', investment: '£420k', description: 'AI-powered chatbot and case routing to deflect 40% of Tier-1 support queries.', demand: [{ team: 'Engineering', days: 120 }, { team: 'Product', days: 60 }, { team: 'Data', days: 40 }] },
  { id: 'P-002', name: 'Employee Wellbeing Platform', status: 'Approved', startQuarter: 'Q3 2025', endQuarter: 'Q3 2025', probability: 80, owner: 'Nina Roberts', investment: '£180k', description: 'SaaS wellbeing and engagement platform to reduce attrition and improve satisfaction.', demand: [{ team: 'Engineering', days: 40 }, { team: 'Product', days: 50 }] },
  { id: 'P-003', name: 'Data Governance Framework', status: 'Pipeline', startQuarter: 'Q4 2025', endQuarter: 'Q1 2026', probability: 60, owner: 'Marcus Johnson', investment: '£350k', description: 'Enterprise data governance, lineage and quality framework across all data products.', demand: [{ team: 'Data', days: 130 }, { team: 'Engineering', days: 60 }, { team: 'Security', days: 30 }] },
  { id: 'P-004', name: 'Infrastructure Refresh Phase 2', status: 'Pipeline', startQuarter: 'Q4 2025', endQuarter: 'Q1 2026', probability: 70, owner: 'James Wright', investment: '£290k', description: 'Second phase of network and compute refresh across regional offices.', demand: [{ team: 'Infrastructure', days: 150 }, { team: 'Security', days: 40 }] },
  { id: 'P-005', name: 'Customer Analytics Enhancement', status: 'Proposed', startQuarter: 'Q4 2025', endQuarter: 'Q4 2025', probability: 45, owner: 'Marcus Johnson', investment: '£160k', description: 'Extended customer segmentation and behavioural analytics on top of the new data platform.', demand: [{ team: 'Data', days: 90 }, { team: 'Product', days: 40 }] },
  { id: "P-006", name: "DevOps Toolchain Modernisation", status: 'Proposed', startQuarter: 'Q1 2026', endQuarter: 'Q1 2026', probability: 50, owner: "Liam O'Brien", investment: '£120k', description: 'Consolidate CI/CD tooling and introduce platform engineering team model.', demand: [{ team: 'Engineering', days: 80 }, { team: 'Infrastructure', days: 60 }] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusColors: Record<PipelineProject['status'], string> = {
  Approved: 'bg-green-100 text-green-800',
  Pipeline: 'bg-blue-100 text-blue-700',
  Proposed: 'bg-gray-100 text-gray-600',
};

const getRAG = (used: number, capacity: number) => {
  const pct = (used / capacity) * 100;
  if (pct > 100) return { label: 'Over', bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500', border: 'border-red-200' };
  if (pct > 85) return { label: 'At Risk', bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-400', border: 'border-amber-200' };
  return { label: 'OK', bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500', border: 'border-green-200' };
};

function parseDemand(raw: string): { team: string; days: number }[] {
  return raw.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split(':').map(s => s.trim());
    return { team: parts[0] || '', days: parseInt(parts[1] || '0', 10) || 0 };
  }).filter(d => d.team);
}

function demandToRaw(demand: { team: string; days: number }[]): string {
  return demand.map(d => `${d.team}: ${d.days}`).join('\n');
}

function nextId(items: PipelineProject[]): string {
  const nums = items.map(i => parseInt(i.id.replace('P-', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `P-${String(max + 1).padStart(3, '0')}`;
}

type FormData = Omit<PipelineProject, 'id' | 'demand'> & { demandRaw: string };

const emptyForm = (): FormData => ({
  name: '',
  status: 'Proposed',
  startQuarter: 'Q2 2025',
  endQuarter: 'Q2 2025',
  probability: 50,
  owner: '',
  investment: '',
  description: '',
  demandRaw: '',
});

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onBack: () => void; }

export const CapacityManagement: React.FC<Props> = ({ onBack }) => {
  const [pipelineProjects, setPipelineProjects] = useState<PipelineProject[]>(() => loadFromStorage(STORAGE_KEYS.PIPELINE_PROJECTS, defaultPipelineProjects));
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(pipelineProjects.filter(p => p.status === 'Approved').map(p => p.id))
  );
  const [selectedProject, setSelectedProject] = useState<PipelineProject | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.PIPELINE_PROJECTS, pipelineProjects); }, [pipelineProjects]);

  const toggleProject = (id: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getPipelineDemand = (team: string, quarter: string): number => {
    let total = 0;
    pipelineProjects.forEach(project => {
      if (!selectedProjects.has(project.id)) return;
      const startIdx = quarters.indexOf(project.startQuarter);
      const endIdx = quarters.indexOf(project.endQuarter);
      if (startIdx === -1 || endIdx === -1) return;
      const span = endIdx - startIdx + 1;
      const qIdx = quarters.indexOf(quarter);
      if (qIdx >= startIdx && qIdx <= endIdx) {
        const teamDemand = project.demand.find(d => d.team === team);
        if (teamDemand) total += Math.round(teamDemand.days / span);
      }
    });
    return total;
  };

  const overCapacityCount = teams.reduce((count, t) => {
    return count + quarters.filter(q => {
      const used = (committedDemand[t.team]?.[q] ?? 0) + getPipelineDemand(t.team, q);
      return used > t.daysPerQuarter;
    }).length;
  }, 0);

  const totalPipelineDays = pipelineProjects
    .filter(p => selectedProjects.has(p.id))
    .reduce((s, p) => s + p.demand.reduce((d, r) => d + r.days, 0), 0);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(p: PipelineProject) {
    setEditingId(p.id);
    setForm({ name: p.name, status: p.status, startQuarter: p.startQuarter, endQuarter: p.endQuarter, probability: p.probability, owner: p.owner, investment: p.investment, description: p.description, demandRaw: demandToRaw(p.demand) });
    setSelectedProject(null);
    setShowForm(true);
  }

  function saveForm() {
    if (!form.name.trim()) return;
    const item: PipelineProject = { ...form, id: editingId || nextId(pipelineProjects), demand: parseDemand(form.demandRaw) };
    if (editingId) {
      setPipelineProjects(prev => prev.map(i => i.id === editingId ? item : i));
    } else {
      setPipelineProjects(prev => [...prev, item]);
      setSelectedProjects(prev => new Set([...prev, item.id]));
    }
    setShowForm(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setPipelineProjects(prev => prev.filter(i => i.id !== deleteId));
    setSelectedProjects(prev => { const n = new Set(prev); n.delete(deleteId); return n; });
    if (selectedProject?.id === deleteId) setSelectedProject(null);
    setDeleteId(null);
  }

  const f = (label: string) => <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>;
  const inp = (field: keyof FormData) => (
    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] as string | number}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
  );
  const sel = (field: keyof FormData, opts: string[]) => (
    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] as string}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Resources & Finance
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Capacity Management</h1>
              <p className="text-sm text-gray-500">Current project demand vs team supply — Q2 2025 to Q1 2026</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Pipeline Project
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Teams</p><p className="text-3xl font-bold text-gray-900">{teams.length}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Over-Capacity Slots</p><p className="text-3xl font-bold text-red-600">{overCapacityCount}</p><p className="text-xs text-gray-400 mt-1">team × quarter</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Pipeline Projects</p><p className="text-3xl font-bold text-blue-600">{pipelineProjects.length}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Modelled Pipeline Days</p><p className="text-3xl font-bold text-purple-600">{totalPipelineDays}</p><p className="text-xs text-gray-400 mt-1">from selected projects</p></div>
        </div>

        {/* Capacity grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Capacity Overview</h2>
              <p className="text-xs text-gray-400 mt-0.5">Committed + modelled pipeline demand vs available capacity per team per quarter</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />OK (&lt;85%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />At Risk (85–100%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Over (&gt;100%)</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Team</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity/Qtr</th>
                  {quarters.map(q => <th key={q} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{q}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teams.map(team => (
                  <tr key={team.team} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${team.color} shrink-0`} />
                        <span className="font-medium text-gray-800">{team.team}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 pl-4">{team.headcount} people</div>
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-600">{team.daysPerQuarter}d</td>
                    {quarters.map(q => {
                      const committed = committedDemand[team.team]?.[q] ?? 0;
                      const pipeline = getPipelineDemand(team.team, q);
                      const total = committed + pipeline;
                      const rag = getRAG(total, team.daysPerQuarter);
                      return (
                        <td key={q} className="px-4 py-3 text-center">
                          <div className={`rounded-lg px-2 py-2 border ${rag.bg} ${rag.border} min-w-24 mx-auto`}>
                            <div className="text-xs font-bold text-gray-700 mb-1.5">
                              {total}d
                              <span className={`ml-1 font-normal ${rag.text}`}>({Math.round((total / team.daysPerQuarter) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                              <div className="h-2 flex rounded-full overflow-hidden">
                                <div className="bg-blue-400 h-2" style={{ width: `${Math.min((committed / team.daysPerQuarter) * 100, 100)}%` }} />
                                {pipeline > 0 && <div className="bg-purple-400 h-2" style={{ width: `${Math.min((pipeline / team.daysPerQuarter) * 100, 100 - (committed / team.daysPerQuarter) * 100)}%` }} />}
                              </div>
                            </div>
                            {pipeline > 0 && <div className="text-xs text-gray-400 mt-1">+{pipeline}d pipeline</div>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-blue-400 inline-block" />Committed (active projects)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-purple-400 inline-block" />Pipeline (modelled)</span>
          </div>
        </div>

        {/* Scenario modeller + pipeline table */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Scenario Modeller</h2>
              <p className="text-xs text-gray-400 mt-0.5">Toggle pipeline projects on/off to model capacity impact</p>
            </div>
            <div className="space-y-3">
              {pipelineProjects.map(project => {
                const isSelected = selectedProjects.has(project.id);
                const totalDays = project.demand.reduce((s, d) => s + d.days, 0);
                return (
                  <label key={project.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleProject(project.id)} className="mt-0.5 accent-blue-600" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">{project.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColors[project.status]}`}>{project.status}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {project.startQuarter}{project.startQuarter !== project.endQuarter ? ` → ${project.endQuarter}` : ''} · {totalDays}d total · {project.probability}%
                      </div>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {project.demand.map(d => (
                          <span key={d.team} className="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">{d.team}: {d.days}d</span>
                        ))}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Pipeline Projects</h2>
              <p className="text-xs text-gray-400 mt-0.5">Click a project for full details</p>
            </div>
            <div className="divide-y divide-gray-50">
              {pipelineProjects.map(project => {
                const totalDays = project.demand.reduce((s, d) => s + d.days, 0);
                const isSelected = selectedProjects.has(project.id);
                return (
                  <div key={project.id} className={`px-5 py-4 transition-colors ${isSelected ? '' : 'opacity-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedProject(project)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-400">{project.id}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColors[project.status]}`}>{project.status}</span>
                          <span className="text-xs text-gray-400">{project.probability}%</span>
                        </div>
                        <p className="font-medium text-gray-900 text-sm">{project.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{project.owner} · {project.startQuarter}{project.startQuarter !== project.endQuarter ? ` → ${project.endQuarter}` : ''} · {project.investment}</p>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {project.demand.map(d => (
                            <span key={d.team} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{d.team}: {d.days}d</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-700">{totalDays}d</p>
                          <p className="text-xs text-gray-400">total demand</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(project)} className="p-1.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => setDeleteId(project.id)} className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Project detail modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{selectedProject.id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selectedProject.status]}`}>{selectedProject.status}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selectedProject.name}</h2>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => openEdit(selectedProject)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">Edit</button>
                <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selectedProject.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><p className="text-gray-400">Owner</p><p className="font-medium">{selectedProject.owner}</p></div>
              <div><p className="text-gray-400">Investment</p><p className="font-medium">{selectedProject.investment}</p></div>
              <div><p className="text-gray-400">Start Quarter</p><p className="font-medium">{selectedProject.startQuarter}</p></div>
              <div><p className="text-gray-400">End Quarter</p><p className="font-medium">{selectedProject.endQuarter}</p></div>
              <div><p className="text-gray-400">Probability</p><p className="font-medium">{selectedProject.probability}%</p></div>
              <div><p className="text-gray-400">Total Demand</p><p className="font-medium">{selectedProject.demand.reduce((s, d) => s + d.days, 0)} days</p></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Resource Demand Breakdown</p>
              <div className="space-y-2">
                {selectedProject.demand.map(d => {
                  const team = teams.find(t => t.team === d.team);
                  const pct = team ? Math.round((d.days / team.daysPerQuarter) * 100) : 0;
                  return (
                    <div key={d.team} className="flex items-center gap-3 text-sm">
                      <span className="w-28 text-gray-600 shrink-0">{d.team}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-gray-700 font-medium w-16 text-right">{d.days}d ({pct}%/qtr)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Pipeline Project' : 'Add Pipeline Project'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>{f('Project Name')}<input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Status')}{sel('status', ['Proposed', 'Pipeline', 'Approved'])}</div>
                <div>{f('Owner')}{inp('owner')}</div>
                <div>{f('Start Quarter')}{sel('startQuarter', quarters)}</div>
                <div>{f('End Quarter')}{sel('endQuarter', quarters)}</div>
                <div>{f('Probability (%)')}<input type="number" min={0} max={100} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.probability} onChange={e => setForm(p => ({ ...p, probability: Number(e.target.value) }))} /></div>
                <div>{f('Investment')}{inp('investment')}</div>
              </div>
              <div>{f('Description')}<textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div>
                {f('Resource Demand')}
                <p className="text-xs text-gray-400 mb-1">One per line: Team: Days (e.g. Engineering: 120)</p>
                <textarea rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  placeholder="Engineering: 120&#10;Product: 60&#10;Data: 40"
                  value={form.demandRaw}
                  onChange={e => setForm(p => ({ ...p, demandRaw: e.target.value }))} />
              </div>
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Pipeline Project?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently remove <strong>{pipelineProjects.find(i => i.id === deleteId)?.name}</strong>. This cannot be undone.</p>
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
