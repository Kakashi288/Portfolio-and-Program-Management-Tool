import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Milestone {
  label: string;
  date: Date;
}

interface PortfolioProject {
  id: string;
  name: string;
  rag: 'green' | 'amber' | 'red';
  budget: number;
  spent: number;
  progress: number;
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  owner: string;
  team: string;
  phase: string;
  description: string;
  milestones: Milestone[];
}

// Serialisable form for storage (dates as ISO strings)
interface StoredProject {
  id: string;
  name: string;
  rag: 'green' | 'amber' | 'red';
  budget: number;
  spent: number;
  progress: number;
  startIso: string;
  endIso: string;
  startDate: string;
  endDate: string;
  owner: string;
  team: string;
  phase: string;
  description: string;
  milestones: { label: string; dateIso: string }[];
}

function toPortfolio(s: StoredProject): PortfolioProject {
  return {
    ...s,
    start: new Date(s.startIso),
    end: new Date(s.endIso),
    milestones: s.milestones.map(m => ({ label: m.label, date: new Date(m.dateIso) })),
  };
}

function toStored(p: PortfolioProject): StoredProject {
  return {
    id: p.id,
    name: p.name,
    rag: p.rag,
    budget: p.budget,
    spent: p.spent,
    progress: p.progress,
    startIso: p.start.toISOString().slice(0, 10),
    endIso: p.end.toISOString().slice(0, 10),
    startDate: p.startDate,
    endDate: p.endDate,
    owner: p.owner,
    team: p.team,
    phase: p.phase,
    description: p.description,
    milestones: p.milestones.map(m => ({ label: m.label, dateIso: m.date.toISOString().slice(0, 10) })),
  };
}

// ── Data ──────────────────────────────────────────────────────────────────────

const d = (s: string) => new Date(s);

const defaultStoredProjects: StoredProject[] = [
  { id: '1', name: 'Digital Transformation Programme', rag: 'green', budget: 2500000, spent: 1200000, progress: 48, startIso: '2025-01-01', endIso: '2026-06-30', startDate: '01 Jan 2025', endDate: '30 Jun 2026', owner: 'Sarah Chen', team: 'Engineering', phase: 'Delivery', description: 'End-to-end modernisation of core business systems and processes.', milestones: [{ label: 'Phase 1 ✓', dateIso: '2025-03-31' }, { label: 'Phase 2 ✓', dateIso: '2025-09-30' }, { label: 'Go-live', dateIso: '2026-06-30' }] },
  { id: '2', name: 'Cloud Migration Initiative', rag: 'amber', budget: 800000, spent: 650000, progress: 72, startIso: '2025-03-01', endIso: '2025-12-31', startDate: '01 Mar 2025', endDate: '31 Dec 2025', owner: 'James Wright', team: 'Infrastructure', phase: 'Testing', description: 'Migration of on-premise infrastructure to AWS cloud platform.', milestones: [{ label: 'UAT', dateIso: '2025-10-01' }, { label: 'Go-live', dateIso: '2025-12-31' }] },
  { id: '3', name: 'Customer Portal Redesign', rag: 'red', budget: 350000, spent: 380000, progress: 60, startIso: '2025-02-01', endIso: '2025-09-30', startDate: '01 Feb 2025', endDate: '30 Sep 2025', owner: 'Priya Patel', team: 'Product', phase: 'Development', description: 'Full redesign of the customer-facing portal for improved UX.', milestones: [{ label: 'Beta', dateIso: '2025-07-31' }, { label: 'Go-live', dateIso: '2025-09-30' }] },
  { id: '4', name: 'Data Analytics Platform', rag: 'green', budget: 1200000, spent: 420000, progress: 35, startIso: '2025-04-01', endIso: '2026-03-31', startDate: '01 Apr 2025', endDate: '31 Mar 2026', owner: 'Marcus Johnson', team: 'Data', phase: 'Planning', description: 'Enterprise-wide data analytics and BI platform rollout.', milestones: [{ label: 'Build start', dateIso: '2025-07-01' }, { label: 'Platform live', dateIso: '2026-03-31' }] },
  { id: '5', name: 'Security Compliance Programme', rag: 'amber', budget: 600000, spent: 310000, progress: 55, startIso: '2025-01-15', endIso: '2025-11-30', startDate: '15 Jan 2025', endDate: '30 Nov 2025', owner: 'Emma Davis', team: 'Security', phase: 'Delivery', description: 'ISO 27001 and SOC2 compliance implementation across all teams.', milestones: [{ label: 'Stage 1 ✓', dateIso: '2025-02-28' }, { label: 'ISO cert', dateIso: '2025-11-30' }] },
  { id: '6', name: 'Mobile App Launch', rag: 'green', budget: 450000, spent: 180000, progress: 40, startIso: '2025-05-01', endIso: '2025-12-15', startDate: '01 May 2025', endDate: '15 Dec 2025', owner: 'Tom Nguyen', team: 'Product', phase: 'Design', description: 'Native iOS and Android application for field operations teams.', milestones: [{ label: 'iOS launch', dateIso: '2025-09-30' }, { label: 'Android', dateIso: '2025-12-15' }] },
];

// ── Config ────────────────────────────────────────────────────────────────────

const TIMELINE_START = d('2025-01-01');
const TIMELINE_END = d('2026-06-30');
const TODAY = new Date('2026-03-09');

const totalDays = (TIMELINE_END.getTime() - TIMELINE_START.getTime()) / 86400000;

const pct = (date: Date) => {
  const days = (date.getTime() - TIMELINE_START.getTime()) / 86400000;
  return Math.min(Math.max((days / totalDays) * 100, 0), 100);
};

const ragBar: Record<string, string> = { green: 'bg-green-500', amber: 'bg-amber-400', red: 'bg-red-500' };
const ragBarLight: Record<string, string> = { green: 'bg-green-200', amber: 'bg-amber-200', red: 'bg-red-200' };
const ragText: Record<string, string> = { green: 'text-green-900', amber: 'text-amber-900', red: 'text-red-900' };

const ragColors = {
  green: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'On Track' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'At Risk' },
  red: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Off Track' },
};

const phaseColors: Record<string, string> = {
  Planning: 'bg-purple-100 text-purple-800',
  Design: 'bg-indigo-100 text-indigo-800',
  Development: 'bg-blue-100 text-blue-800',
  Testing: 'bg-yellow-100 text-yellow-800',
  Delivery: 'bg-teal-100 text-teal-800',
  Closed: 'bg-gray-100 text-gray-600',
};

const fmt = (n: number) => n >= 1000000 ? `£${(n / 1000000).toFixed(2)}m` : `£${(n / 1000).toFixed(0)}k`;

const getMonthHeaders = () => {
  const headers: { label: string; pctStart: number; pctWidth: number }[] = [];
  const cur = new Date(TIMELINE_START);
  while (cur <= TIMELINE_END) {
    const start = new Date(cur);
    const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const clampedEnd = end > TIMELINE_END ? TIMELINE_END : end;
    headers.push({ label: cur.toLocaleString('default', { month: 'short', year: '2-digit' }), pctStart: pct(start), pctWidth: pct(clampedEnd) - pct(start) });
    cur.setMonth(cur.getMonth() + 1);
    cur.setDate(1);
  }
  return headers;
};

const getQuarterHeaders = () => {
  const qStarts = [
    { label: 'Q1 2025', start: d('2025-01-01'), end: d('2025-03-31') },
    { label: 'Q2 2025', start: d('2025-04-01'), end: d('2025-06-30') },
    { label: 'Q3 2025', start: d('2025-07-01'), end: d('2025-09-30') },
    { label: 'Q4 2025', start: d('2025-10-01'), end: d('2025-12-31') },
    { label: 'Q1 2026', start: d('2026-01-01'), end: d('2026-03-31') },
    { label: 'Q2 2026', start: d('2026-04-01'), end: d('2026-06-30') },
  ];
  return qStarts.filter(q => q.start <= TIMELINE_END && q.end >= TIMELINE_START)
    .map(q => ({ label: q.label, pctStart: pct(q.start), pctWidth: pct(q.end) - pct(q.start) }));
};

// ── Timeline component ────────────────────────────────────────────────────────

const TimelineView: React.FC<{
  projects: PortfolioProject[];
  onSelect: (p: PortfolioProject) => void;
}> = ({ projects, onSelect }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<'quarter' | 'month'>('quarter');
  const headers = zoom === 'quarter' ? getQuarterHeaders() : getMonthHeaders();
  const todayPct = pct(TODAY);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />On Track</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />At Risk</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Off Track</span>
          <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-blue-500 inline-block" />Today</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-700 inline-block" />Milestone</span>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['quarter', 'month'] as const).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${zoom === z ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {z}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="flex border-b border-gray-100">
            <div className="w-52 shrink-0 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-r border-gray-100">Project</div>
            <div className="flex-1 relative h-9 bg-gray-50">
              {headers.map((h, i) => (
                <div key={i} className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-gray-500 border-r border-gray-100" style={{ left: `${h.pctStart}%`, width: `${h.pctWidth}%` }}>{h.label}</div>
              ))}
              <div className="absolute top-0 h-full w-0.5 bg-blue-400 opacity-60 z-10" style={{ left: `${todayPct}%` }} />
            </div>
          </div>

          {projects.map((project, idx) => {
            const barLeft = pct(project.start);
            const barWidth = pct(project.end) - barLeft;
            const isHovered = hoveredId === project.id;
            return (
              <div key={project.id} className={`flex border-b border-gray-50 transition-colors ${isHovered ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                onMouseEnter={() => setHoveredId(project.id)} onMouseLeave={() => setHoveredId(null)}>
                <div className="w-52 shrink-0 px-4 py-3 border-r border-gray-100 cursor-pointer" onClick={() => onSelect(project)}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ragBar[project.rag]}`} />
                    <span className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{project.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 ml-3.5">{project.owner}</div>
                </div>
                <div className="flex-1 relative py-3 px-0" style={{ minHeight: '56px' }}>
                  {headers.map((h, i) => <div key={i} className="absolute top-0 h-full border-r border-gray-100" style={{ left: `${h.pctStart + h.pctWidth}%` }} />)}
                  <div className="absolute top-0 h-full w-0.5 bg-blue-400 z-20" style={{ left: `${todayPct}%` }} />
                  <div className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-lg ${ragBarLight[project.rag]} cursor-pointer transition-all`}
                    style={{ left: `${barLeft}%`, width: `${barWidth}%` }} onClick={() => onSelect(project)}>
                    <div className={`h-full rounded-lg ${ragBar[project.rag]} opacity-80`} style={{ width: `${project.progress}%` }} />
                    <div className={`absolute inset-0 flex items-center px-2 text-xs font-semibold ${ragText[project.rag]} truncate`}>
                      {barWidth > 8 && `${project.phase} · ${project.progress}%`}
                    </div>
                  </div>
                  {project.milestones.map((m, mi) => {
                    const mPct = pct(m.date);
                    return (
                      <div key={mi} className="absolute top-1/2 -translate-y-1/2 z-30 group/ms" style={{ left: `${mPct}%` }}>
                        <div className="w-3 h-3 bg-gray-700 rotate-45 -translate-x-1.5 cursor-default" />
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover/ms:opacity-100 transition-opacity pointer-events-none z-50">
                          {m.label}
                          <div className="text-gray-400">{m.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex border-t border-gray-100 bg-gray-50">
            <div className="w-52 shrink-0 border-r border-gray-100" />
            <div className="flex-1 relative h-6">
              <div className="absolute top-0 h-full flex items-center" style={{ left: `${todayPct}%` }}>
                <div className="w-0.5 h-full bg-blue-400" />
                <span className="text-xs font-semibold text-blue-500 ml-1 whitespace-nowrap">Today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Form helpers ──────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  rag: 'green' | 'amber' | 'red';
  budget: number;
  spent: number;
  progress: number;
  startIso: string;
  endIso: string;
  owner: string;
  team: string;
  phase: string;
  description: string;
  milestonesRaw: string;
};

const emptyForm = (): FormData => ({
  name: '',
  rag: 'green',
  budget: 0,
  spent: 0,
  progress: 0,
  startIso: '',
  endIso: '',
  owner: '',
  team: '',
  phase: 'Planning',
  description: '',
  milestonesRaw: '',
});

function parseMilestones(raw: string): { label: string; dateIso: string }[] {
  return raw.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split('|').map(s => s.trim());
    return { label: parts[0] || '', dateIso: parts[1] || '' };
  }).filter(m => m.label && m.dateIso);
}

function milestonesToRaw(ms: { label: string; dateIso: string }[]): string {
  return ms.map(m => `${m.label} | ${m.dateIso}`).join('\n');
}

function formatDateDisplay(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function nextId(items: StoredProject[]): string {
  const nums = items.map(i => parseInt(i.id, 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1);
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onBack: () => void; }

export const PortfolioOverview: React.FC<Props> = ({ onBack }) => {
  const [storedProjects, setStoredProjects] = useState<StoredProject[]>(() => loadFromStorage(STORAGE_KEYS.PORTFOLIO_PROJECTS, defaultStoredProjects));
  const [tab, setTab] = useState<'table' | 'timeline'>('timeline');
  const [filterRag, setFilterRag] = useState<'all' | 'green' | 'amber' | 'red'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PortfolioProject | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.PORTFOLIO_PROJECTS, storedProjects); }, [storedProjects]);

  const projects = storedProjects.map(toPortfolio);

  const filtered = projects.filter(p => {
    const matchRag = filterRag === 'all' || p.rag === filterRag;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.owner.toLowerCase().includes(search.toLowerCase());
    return matchRag && matchSearch;
  });

  const totals = {
    total: projects.length,
    green: projects.filter(p => p.rag === 'green').length,
    amber: projects.filter(p => p.rag === 'amber').length,
    red: projects.filter(p => p.rag === 'red').length,
    budget: projects.reduce((s, p) => s + p.budget, 0),
    spent: projects.reduce((s, p) => s + p.spent, 0),
  };

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(p: PortfolioProject) {
    const s = storedProjects.find(sp => sp.id === p.id)!;
    setEditingId(p.id);
    setForm({ name: p.name, rag: p.rag, budget: p.budget, spent: p.spent, progress: p.progress, startIso: s.startIso, endIso: s.endIso, owner: p.owner, team: p.team, phase: p.phase, description: p.description, milestonesRaw: milestonesToRaw(s.milestones) });
    setSelected(null);
    setShowForm(true);
  }

  function saveForm() {
    if (!form.name.trim() || !form.startIso || !form.endIso) return;
    const milestones = parseMilestones(form.milestonesRaw);
    const stored: StoredProject = {
      id: editingId || nextId(storedProjects),
      name: form.name,
      rag: form.rag,
      budget: form.budget,
      spent: form.spent,
      progress: form.progress,
      startIso: form.startIso,
      endIso: form.endIso,
      startDate: formatDateDisplay(form.startIso),
      endDate: formatDateDisplay(form.endIso),
      owner: form.owner,
      team: form.team,
      phase: form.phase,
      description: form.description,
      milestones,
    };
    if (editingId) {
      setStoredProjects(prev => prev.map(i => i.id === editingId ? stored : i));
    } else {
      setStoredProjects(prev => [...prev, stored]);
    }
    setShowForm(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setStoredProjects(prev => prev.filter(i => i.id !== deleteId));
    if (selected?.id === deleteId) setSelected(null);
    setDeleteId(null);
  }

  const f = (label: string, req = false) => <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{req && <span className="text-red-500 ml-1">*</span>}</label>;
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
  const dateInp = (field: keyof FormData) => (
    <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field] as string}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Portfolio Management
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portfolio Overview</h1>
              <p className="text-sm text-gray-500">Cross-portfolio RAG status, budget and progress tracking</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Project
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Total Projects</p><p className="text-3xl font-bold text-gray-900">{totals.total}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">On Track</p><p className="text-3xl font-bold text-green-600">{totals.green}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">At Risk</p><p className="text-3xl font-bold text-amber-500">{totals.amber}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Off Track</p><p className="text-3xl font-bold text-red-600">{totals.red}</p></div>
        </div>

        {totals.budget > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-6 mb-3 flex-wrap">
              <div><p className="text-xs text-gray-500">Total Budget</p><p className="text-xl font-bold text-gray-900">{fmt(totals.budget)}</p></div>
              <div><p className="text-xs text-gray-500">Spent to Date</p><p className="text-xl font-bold text-blue-600">{fmt(totals.spent)}</p></div>
              <div><p className="text-xs text-gray-500">Remaining</p><p className="text-xl font-bold text-gray-400">{fmt(totals.budget - totals.spent)}</p></div>
              <div><p className="text-xs text-gray-500">% Consumed</p><p className="text-xl font-bold text-gray-900">{Math.round((totals.spent / totals.budget) * 100)}%</p></div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${Math.round((totals.spent / totals.budget) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setTab('timeline')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Timeline
            </button>
            <button onClick={() => setTab('table')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18" /></svg>
              Table
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <input type="text" placeholder="Search project or owner..." value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-1.5">
              {(['all', 'green', 'amber', 'red'] as const).map(r => (
                <button key={r} onClick={() => setFilterRag(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterRag === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                  {r === 'all' ? 'All' : r === 'green' ? '🟢' : r === 'amber' ? '🟡' : '🔴'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === 'timeline' && <TimelineView projects={filtered} onSelect={setSelected} />}

        {tab === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phase</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const rag = ragColors[p.rag];
                  const overBudget = p.spent > p.budget;
                  const budgetPct = Math.round((p.spent / p.budget) * 100);
                  return (
                    <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 cursor-pointer" onClick={() => setSelected(p)}>{p.name}</td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(p)}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${rag.bg} ${rag.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rag.dot}`} />{rag.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(p)}>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${phaseColors[p.phase] || 'bg-gray-100 text-gray-600'}`}>{p.phase}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelected(p)}>{p.owner}</td>
                      <td className="px-4 py-3 w-36 cursor-pointer" onClick={() => setSelected(p)}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${p.progress}%` }} /></div>
                          <span className="text-xs text-gray-500 w-8">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs cursor-pointer" onClick={() => setSelected(p)}>
                        <span className={overBudget ? 'text-red-600 font-semibold' : 'text-gray-700'}>{fmt(p.spent)}</span>
                        <span className="text-gray-400"> / {fmt(p.budget)}</span>
                        {overBudget && <span className="ml-1 text-red-500">(+{budgetPct - 100}%)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelected(p)}>{p.endDate}</td>
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
            {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No projects match your filters.</div>}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{selected.description}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">Edit</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><p className="text-gray-500">Owner</p><p className="font-medium">{selected.owner}</p></div>
              <div><p className="text-gray-500">Team</p><p className="font-medium">{selected.team}</p></div>
              <div><p className="text-gray-500">Phase</p><p className="font-medium">{selected.phase}</p></div>
              <div><p className="text-gray-500">RAG Status</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ragColors[selected.rag].bg} ${ragColors[selected.rag].text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ragColors[selected.rag].dot}`} />{ragColors[selected.rag].label}
                </span>
              </div>
              <div><p className="text-gray-500">Start Date</p><p className="font-medium">{selected.startDate}</p></div>
              <div><p className="text-gray-500">End Date</p><p className="font-medium">{selected.endDate}</p></div>
              <div><p className="text-gray-500">Budget</p><p className="font-medium">{fmt(selected.budget)}</p></div>
              <div><p className="text-gray-500">Spent</p><p className={`font-medium ${selected.spent > selected.budget ? 'text-red-600' : 'text-gray-900'}`}>{fmt(selected.spent)}</p></div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Progress — {selected.progress}%</p>
              <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{ width: `${selected.progress}%` }} /></div>
            </div>
            {selected.milestones.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Milestones</p>
                <div className="space-y-1">
                  {selected.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-gray-700 rotate-45 shrink-0" />
                      <span className="font-medium text-gray-700">{m.label}</span>
                      <span className="text-gray-400 text-xs">{m.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Project' : 'Add Project'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>{f('Project Name', true)}{inp('name')}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('RAG Status')}
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.rag} onChange={e => setForm(p => ({ ...p, rag: e.target.value as 'green' | 'amber' | 'red' }))}>
                    <option value="green">On Track</option>
                    <option value="amber">At Risk</option>
                    <option value="red">Off Track</option>
                  </select>
                </div>
                <div>{f('Phase')}
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.phase} onChange={e => setForm(p => ({ ...p, phase: e.target.value }))}>
                    {['Planning', 'Design', 'Development', 'Testing', 'Delivery', 'Closed'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>{f('Owner')}{inp('owner')}</div>
                <div>{f('Team')}{inp('team')}</div>
                <div>{f('Start Date', true)}{dateInp('startIso')}</div>
                <div>{f('End Date', true)}{dateInp('endIso')}</div>
                <div>{f('Budget (£)')}{num('budget')}</div>
                <div>{f('Spent to Date (£)')}{num('spent')}</div>
                <div className="col-span-2">{f('Progress (%)')}{num('progress')}</div>
              </div>
              <div>{f('Description')}<textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div>
                {f('Milestones')}
                <p className="text-xs text-gray-400 mb-1">One per line: Label | YYYY-MM-DD</p>
                <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  placeholder="Phase 1 | 2025-03-31&#10;Go-live | 2026-06-30"
                  value={form.milestonesRaw}
                  onChange={e => setForm(p => ({ ...p, milestonesRaw: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} disabled={!form.name.trim() || !form.startIso || !form.endIso}
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Project?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently remove <strong>{projects.find(i => i.id === deleteId)?.name}</strong> from the portfolio. This cannot be undone.</p>
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
