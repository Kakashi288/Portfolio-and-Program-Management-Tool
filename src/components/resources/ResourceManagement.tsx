import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../utils/crudStorage';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  team: string;
  capacity: number;
  allocated: number;
  skills: string[];
  projects: { name: string; days: number; color: string }[];
}

const PROJECT_COLORS = ['bg-blue-400', 'bg-teal-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-red-400', 'bg-amber-400', 'bg-green-400', 'bg-gray-300'];

const defaultMembers: TeamMember[] = [
  { id: 'p1', name: 'Sarah Chen', role: 'Programme Manager', team: 'Engineering', capacity: 10, allocated: 9, skills: ['Programme Management', 'Stakeholder Engagement', 'Agile'], projects: [{ name: 'Digital Transformation', days: 5, color: 'bg-blue-400' }, { name: 'Cloud Migration', days: 2, color: 'bg-teal-400' }, { name: 'BAU', days: 2, color: 'bg-gray-300' }] },
  { id: 'p2', name: 'James Wright', role: 'Infrastructure Lead', team: 'Infrastructure', capacity: 10, allocated: 10, skills: ['AWS', 'Terraform', 'Kubernetes', 'Networking'], projects: [{ name: 'Cloud Migration', days: 7, color: 'bg-teal-400' }, { name: 'Security Compliance', days: 2, color: 'bg-red-400' }, { name: 'BAU', days: 1, color: 'bg-gray-300' }] },
  { id: 'p3', name: 'Priya Patel', role: 'Product Manager', team: 'Product', capacity: 10, allocated: 8, skills: ['Product Strategy', 'UX Research', 'Roadmapping'], projects: [{ name: 'Customer Portal', days: 6, color: 'bg-purple-400' }, { name: 'Mobile App', days: 2, color: 'bg-pink-400' }] },
  { id: 'p4', name: 'Marcus Johnson', role: 'Data Engineer', team: 'Data', capacity: 10, allocated: 7, skills: ['Python', 'Snowflake', 'dbt', 'SQL'], projects: [{ name: 'Data Analytics Platform', days: 6, color: 'bg-indigo-400' }, { name: 'BAU', days: 1, color: 'bg-gray-300' }] },
  { id: 'p5', name: 'Emma Davis', role: 'Security Architect', team: 'Security', capacity: 10, allocated: 11, skills: ['ISO 27001', 'Pen Testing', 'SOC2', 'IAM'], projects: [{ name: 'Security Compliance', days: 7, color: 'bg-red-400' }, { name: 'Cloud Migration', days: 2, color: 'bg-teal-400' }, { name: 'Mobile App', days: 2, color: 'bg-pink-400' }] },
  { id: 'p6', name: 'Tom Nguyen', role: 'Senior Developer', team: 'Engineering', capacity: 10, allocated: 9, skills: ['React Native', 'TypeScript', 'Node.js', 'GraphQL'], projects: [{ name: 'Mobile App', days: 7, color: 'bg-pink-400' }, { name: 'Customer Portal', days: 2, color: 'bg-purple-400' }] },
  { id: 'p7', name: 'Aisha Mohamed', role: 'UX Designer', team: 'Product', capacity: 10, allocated: 6, skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'], projects: [{ name: 'Customer Portal', days: 4, color: 'bg-purple-400' }, { name: 'Mobile App', days: 2, color: 'bg-pink-400' }] },
  { id: "p8", name: "Liam O'Brien", role: 'DevOps Engineer', team: 'Infrastructure', capacity: 10, allocated: 10, skills: ['CI/CD', 'Docker', 'AWS', 'Monitoring'], projects: [{ name: 'Cloud Migration', days: 6, color: 'bg-teal-400' }, { name: 'Digital Transformation', days: 3, color: 'bg-blue-400' }, { name: 'BAU', days: 1, color: 'bg-gray-300' }] },
  { id: 'p9', name: 'Yuki Tanaka', role: 'Data Scientist', team: 'Data', capacity: 10, allocated: 6, skills: ['Python', 'Machine Learning', 'Tableau', 'Statistics'], projects: [{ name: 'Data Analytics Platform', days: 5, color: 'bg-indigo-400' }, { name: 'BAU', days: 1, color: 'bg-gray-300' }] },
  { id: 'p10', name: 'Carlos Reyes', role: 'Backend Developer', team: 'Engineering', capacity: 10, allocated: 10, skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Microservices'], projects: [{ name: 'Digital Transformation', days: 6, color: 'bg-blue-400' }, { name: 'Customer Portal', days: 4, color: 'bg-purple-400' }] },
];

type FormData = {
  name: string;
  role: string;
  team: string;
  capacity: number;
  allocated: number;
  skillsRaw: string;
  projectsRaw: string;
};

const emptyForm = (): FormData => ({
  name: '',
  role: '',
  team: '',
  capacity: 10,
  allocated: 0,
  skillsRaw: '',
  projectsRaw: '',
});

function parseProjects(raw: string): { name: string; days: number; color: string }[] {
  return raw.split('\n').filter(l => l.trim()).map((line, i) => {
    const parts = line.split('|').map(s => s.trim());
    return { name: parts[0] || 'Project', days: parseInt(parts[1] || '1', 10) || 1, color: PROJECT_COLORS[i % PROJECT_COLORS.length] };
  });
}

function projectsToRaw(projects: { name: string; days: number }[]): string {
  return projects.map(p => `${p.name} | ${p.days}`).join('\n');
}

function nextId(items: TeamMember[]): string {
  const nums = items.map(i => parseInt(i.id.replace('p', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `p${max + 1}`;
}

interface Props { onBack: () => void; }

export const ResourceManagement: React.FC<Props> = ({ onBack }) => {
  const [members, setMembers] = useState<TeamMember[]>(() => loadFromStorage(STORAGE_KEYS.TEAM_MEMBERS, defaultMembers));
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [filterTeam, setFilterTeam] = useState<string>('All');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEYS.TEAM_MEMBERS, members); }, [members]);

  const allTeams = Array.from(new Set(members.map(m => m.team)));
  const filteredMembers = members.filter(m => filterTeam === 'All' || m.team === filterTeam);
  const totalHeadcount = members.length;
  const overAllocated = members.filter(m => m.allocated > m.capacity).length;
  const avgUtil = members.length ? Math.round(members.reduce((s, m) => s + (m.allocated / m.capacity) * 100, 0) / members.length) : 0;

  // Team utilisation summary
  const teamStats = allTeams.map(team => {
    const teamMembers = members.filter(m => m.team === team);
    const util = teamMembers.length ? Math.round(teamMembers.reduce((s, m) => s + (m.allocated / m.capacity) * 100, 0) / teamMembers.length) : 0;
    return { name: team, headcount: teamMembers.length, util };
  });

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(m: TeamMember) {
    setEditingId(m.id);
    setForm({ name: m.name, role: m.role, team: m.team, capacity: m.capacity, allocated: m.allocated, skillsRaw: m.skills.join(', '), projectsRaw: projectsToRaw(m.projects) });
    setSelectedMember(null);
    setShowForm(true);
  }

  function saveForm() {
    if (!form.name.trim()) return;
    const member: TeamMember = {
      id: editingId || nextId(members),
      name: form.name,
      role: form.role,
      team: form.team,
      capacity: form.capacity,
      allocated: form.allocated,
      skills: form.skillsRaw.split(',').map(s => s.trim()).filter(Boolean),
      projects: parseProjects(form.projectsRaw),
    };
    if (editingId) {
      setMembers(prev => prev.map(i => i.id === editingId ? member : i));
    } else {
      setMembers(prev => [...prev, member]);
    }
    setShowForm(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setMembers(prev => prev.filter(i => i.id !== deleteId));
    if (selectedMember?.id === deleteId) setSelectedMember(null);
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
  const num = (field: 'capacity' | 'allocated') => (
    <input type="number" min={0} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={form[field]}
      onChange={e => setForm(p => ({ ...p, [field]: Number(e.target.value) }))} />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resource Management</h1>
              <p className="text-sm text-gray-500">Team capacity planning and allocation across the portfolio</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Team Member
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Total Headcount</p><p className="text-3xl font-bold text-gray-900">{totalHeadcount}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Avg Utilisation</p><p className={`text-3xl font-bold ${avgUtil > 100 ? 'text-red-600' : avgUtil > 85 ? 'text-amber-500' : 'text-green-600'}`}>{avgUtil}%</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Over-Allocated</p><p className="text-3xl font-bold text-red-600">{overAllocated}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><p className="text-sm text-gray-500 mb-1">Teams</p><p className="text-3xl font-bold text-blue-600">{allTeams.length}</p></div>
        </div>

        {/* Team Utilisation Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-5">Team Utilisation</h2>
          <div className="space-y-4">
            {teamStats.map(team => {
              const barColor = team.util > 100 ? 'bg-red-500' : team.util > 85 ? 'bg-amber-400' : 'bg-green-500';
              const textColor = team.util > 100 ? 'text-red-600' : team.util > 85 ? 'text-amber-600' : 'text-green-600';
              return (
                <div key={team.name} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700">{team.name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-4">
                    <div className={`${barColor} h-4 rounded-full transition-all`} style={{ width: `${Math.min(team.util, 100)}%` }} />
                  </div>
                  <div className={`w-12 text-sm font-bold text-right ${textColor}`}>{team.util}%</div>
                  <div className="w-20 text-xs text-gray-500 text-right">{team.headcount} people</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="text-sm text-gray-500">Showing {filteredMembers.length} of {members.length} members</div>
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="All">All Teams</option>
            {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Team</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Allocation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMembers.map(member => {
                const util = Math.round((member.allocated / member.capacity) * 100);
                const overAlloc = member.allocated > member.capacity;
                return (
                  <tr key={member.id} className={`hover:bg-blue-50 transition-colors ${overAlloc ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 cursor-pointer" onClick={() => setSelectedMember(member)}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {member.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelectedMember(member)}>{member.role}</td>
                    <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelectedMember(member)}>{member.team}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedMember(member)}>
                      <span className={overAlloc ? 'text-red-600 font-semibold' : 'text-gray-700'}>{member.allocated}/{member.capacity} days{overAlloc && <span className="ml-1 text-xs">(+{member.allocated - member.capacity})</span>}</span>
                    </td>
                    <td className="px-4 py-3 w-40 cursor-pointer" onClick={() => setSelectedMember(member)}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${overAlloc ? 'bg-red-500' : util > 85 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${Math.min(util, 100)}%` }} />
                        </div>
                        <span className={`text-xs w-10 font-medium ${overAlloc ? 'text-red-600' : 'text-gray-600'}`}>{util}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedMember(member)}>
                      <div className="flex gap-1 flex-wrap">
                        {member.projects.map(p => (
                          <span key={p.name} className={`px-2 py-0.5 rounded text-xs text-white ${p.color}`}>{p.name.split(' ')[0]}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(member)} className="p-1.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteId(member.id)} className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Delete">
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

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMember(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                  {selectedMember.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedMember.name}</h2>
                  <p className="text-sm text-gray-500">{selectedMember.role} — {selectedMember.team}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(selectedMember)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">Edit</button>
                <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Capacity: {selectedMember.allocated}/{selectedMember.capacity} days this sprint</p>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className={`h-3 rounded-full ${selectedMember.allocated > selectedMember.capacity ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((selectedMember.allocated / selectedMember.capacity) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Project Allocation</p>
              <div className="space-y-2">
                {selectedMember.projects.map(p => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${p.color}`} />
                    <span className="flex-1 text-sm text-gray-700">{p.name}</span>
                    <span className="text-sm font-medium text-gray-900">{p.days} days</span>
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${p.color}`} style={{ width: `${(p.days / selectedMember.capacity) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {selectedMember.skills.map(s => (
                  <span key={s} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{s}</span>
                ))}
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
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Team Member' : 'Add Team Member'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>{f('Full Name', true)}{inp('name')}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>{f('Role')}{inp('role')}</div>
                <div>{f('Team')}{inp('team')}</div>
                <div>{f('Capacity (days/sprint)')}{num('capacity')}</div>
                <div>{f('Allocated (days/sprint)')}{num('allocated')}</div>
              </div>
              <div>
                {f('Skills (comma-separated)')}
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Python, SQL, Agile..."
                  value={form.skillsRaw}
                  onChange={e => setForm(p => ({ ...p, skillsRaw: e.target.value }))} />
              </div>
              <div>
                {f('Project Allocations')}
                <p className="text-xs text-gray-400 mb-1">One per line: Project Name | Days (e.g. Cloud Migration | 7)</p>
                <textarea rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  placeholder="Cloud Migration | 7&#10;Security Compliance | 2&#10;BAU | 1"
                  value={form.projectsRaw}
                  onChange={e => setForm(p => ({ ...p, projectsRaw: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} disabled={!form.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors">
                {editingId ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Team Member?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently remove <strong>{members.find(i => i.id === deleteId)?.name}</strong> from the resource register.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
