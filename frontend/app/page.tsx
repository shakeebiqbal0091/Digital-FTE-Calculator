'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import axios from 'axios'
import {
  getEmployees, createEmployee, deleteEmployee, updateEmployee,
  getDepartments, createDepartment,
  getConfig, updateConfig,
  getAutomations, createAutomation, deleteAutomation,
  Employee, Department, Config, Automation, AutomationSummary
} from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const TYPE_COLORS: Record<string, string> = {
  FULL_TIME: '#0F62FE',
  PART_TIME: '#42BE65',
  CONTRACT: '#FF832B',
}
const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
}

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [config, setConfig] = useState<Config>({ id: 1, standardHours: 40 })
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [dept, setDept] = useState('')
  const [newDept, setNewDept] = useState('')
  const [type, setType] = useState<Employee['employeeType']>('FULL_TIME')
  const [hours, setHours] = useState<number>(40)
  const [stdHours, setStdHours] = useState<number>(40)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFTE, setFilterFTE] = useState('')
  const [editForm, setEditForm] = useState<Partial<Employee>>({})
  const [activeTab, setActiveTab]     = useState<'overview'|'employees'|'departments'|'digital-fte'>('overview')
  const [automations, setAutomations]     = useState<Automation[]>([])
  const [autoSummary, setAutoSummary]     = useState<AutomationSummary>({ totalHoursSaved:0, totalDigitalFTE:0, count:0 })
  const [autoName, setAutoName]           = useState('')
  const [autoDesc, setAutoDesc]           = useState('')
  const [autoDept, setAutoDept]           = useState('')
  const [autoHours, setAutoHours]         = useState<number>(0)
  const [autoEmployees, setAutoEmployees] = useState<number>(1)
  const [autoStatus, setAutoStatus]       = useState<'ACTIVE'|'PILOT'|'PLANNED'>('ACTIVE')
  const [loadError, setLoadError] = useState<string | null>(null)
  const { data: session } = useSession()

  const getRequestErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return 'Your session is unauthorized or expired. Please sign in again.'
      }
      if (error.code === 'ERR_NETWORK') {
        return 'Unable to connect to backend. Make sure backend is running on port 4000.'
      }
      return `Request failed (${error.response?.status ?? 'unknown error'}).`
    }
    return 'An unexpected error occurred while loading data.'
  }

  const fetchAll = async () => {
    const [emps, depts, cfg, autoData] = await Promise.all([
      getEmployees(), getDepartments(), getConfig(), getAutomations()
    ])
    setEmployees(emps)
    setDepartments(depts)
    setConfig(cfg)
    setStdHours(cfg.standardHours)
    setAutomations(autoData.automations)
    setAutoSummary(autoData.summary)
    setLoading(false)
  }

  useEffect(() => {
    const load = async () => {
      await fetchAll()
    }
    void load()
  }, [fetchAll])

  const handleAddEmployee = async () => {
    if (!name || !dept || !hours) return alert('Fill all fields')
    try {
      await createEmployee({ name, employeeType: type, hoursPerWeek: hours, departmentId: parseInt(dept) })
      setName(''); setHours(40)
      void fetchAll()
    } catch {
      alert('Failed to add employee. Please check backend connection.')
    }
  }

  const handleAddDepartment = async () => {
    if (!newDept.trim()) return
    try {
      await createDepartment(newDept.trim())
      setNewDept('')
      void fetchAll()
    } catch {
      alert('Failed to add department. Please check backend connection.')
    }
  }

  const handleDeleteEmployee = async (id: number) => {
    try {
      await deleteEmployee(id)
      void fetchAll()
    } catch {
      alert('Failed to delete employee. Please check backend connection.')
    }
  }

  const handleEditStart = (emp: Employee) => {
    setEditingId(emp.id)
    setEditForm({ name: emp.name, employeeType: emp.employeeType, hoursPerWeek: emp.hoursPerWeek, departmentId: emp.departmentId })
  }

  const handleEditSave = async (id: number) => {
    if (!editForm.name || !editForm.hoursPerWeek || !editForm.departmentId) return alert('All fields required')
    try {
      await updateEmployee(id, editForm)
      setEditingId(null); setEditForm({})
      void fetchAll()
    } catch {
      alert('Failed to update employee. Please check backend connection.')
    }
  }

  const handleEditCancel = () => { setEditingId(null); setEditForm({}) }
  const handleUpdateConfig = async () => {
    try {
      await updateConfig(stdHours)
      void fetchAll()
    } catch {
      alert('Failed to update config. Please check backend connection.')
    }
  }
  const handleAddAutomation = async () => {
    if (!autoName || !autoDept || !autoHours || !autoEmployees)
      return alert('Fill all required fields')
    await createAutomation({
      name: autoName, description: autoDesc,
      departmentId: parseInt(autoDept),
      hoursSavedPerWeek: autoHours,
      employeesAffected: autoEmployees,
      status: autoStatus,
    })
    setAutoName(''); setAutoDesc(''); setAutoHours(0); setAutoEmployees(1)
    fetchAll()
  }
  const handleDeleteAutomation = async (id: number) => {
    await deleteAutomation(id); fetchAll()
  }

  const totalFTE = employees.reduce((s, e) => s + e.hoursPerWeek / config.standardHours, 0)
  const fullTimeCount = employees.filter(e => e.employeeType === 'FULL_TIME').length
  const filteredEmployees = employees.filter(e => {
    const fte = e.hoursPerWeek / config.standardHours
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchDept = !filterDept || e.departmentId === parseInt(filterDept)
    const matchType = !filterType || e.employeeType === filterType
    const matchFTE = !filterFTE ||
      (filterFTE === 'lt05' && fte < 0.5) ||
      (filterFTE === '0510' && fte >= 0.5 && fte < 1.0) ||
      (filterFTE === 'eq1' && fte === 1.0) ||
      (filterFTE === 'gt1' && fte > 1.0)
    return matchSearch && matchDept && matchType && matchFTE
  })
  const typeData = ['FULL_TIME', 'PART_TIME', 'CONTRACT'].map(t => ({
    name: TYPE_LABELS[t], value: employees.filter(e => e.employeeType === t).length
  })).filter(d => d.value > 0)

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px', border: '1px solid #E4E7EC', borderRadius: '8px',
    fontSize: '13.5px', background: '#fff', color: '#101828',
    outline: 'none', width: '100%', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E4E7EC', borderTopColor: '#0F62FE', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#667085', fontSize: 14 }}>Loading your workspace...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (loadError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ maxWidth: 460, textAlign: 'center', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 24, boxShadow: '0 8px 24px rgba(16,24,40,0.08)' }}>
        <h2 style={{ fontSize: 18, color: '#101828', marginBottom: 10 }}>Backend connection issue</h2>
        <p style={{ fontSize: 14, color: '#667085', marginBottom: 18 }}>{loadError}</p>
        <button className="btn-primary" onClick={() => { setLoading(true); void fetchAll() }}>
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F9FAFB; font-family: 'DM Sans', sans-serif; }
        input:focus, select:focus { border-color: #0F62FE !important; box-shadow: 0 0 0 3px rgba(15,98,254,0.08) !important; }
        input::placeholder { color: #98A2B3; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D0D5DD; border-radius: 99px; }
        tr:hover td { background: #F9FAFB !important; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .card { animation: fadeIn 0.3s ease forwards; }
        .btn-primary { background:#0F62FE; color:#fff; border:none; border-radius:8px; padding:'9px 18px'; font-size:13.5px; font-weight:500; cursor:pointer; font-family:inherit; transition: background 0.15s, transform 0.1s; }
        .btn-primary:hover { background:#0353D9; }
        .btn-primary:active { transform: scale(0.98); }
        .nav-tab { padding:8px 16px; border-radius:8px; font-size:13.5px; font-weight:500; cursor:pointer; border:none; background:transparent; font-family:inherit; transition: all 0.15s; color:#667085; }
        .nav-tab:hover { background:#F2F4F7; color:#344054; }
        .nav-tab.active { background:#fff; color:#0F62FE; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>

        {/* Top Nav */}
        <nav style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, background: '#0F62FE', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>F</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 15, color: '#101828' }}>FTE Calculator</span>
            </div>
            <div style={{ display:'flex', gap:4, overflowX:'auto', maxWidth:'46vw', paddingBottom:2 }}>
              {(['overview','employees','departments','digital-fte'] as const).map(tab => (
                <button key={tab} className={`nav-tab${activeTab===tab?' active':''}`} onClick={() => setActiveTab(tab)} style={{ flexShrink: 0 }}>
                  {tab === 'digital-fte' ? '🤖 Digital FTE' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#667085' }}>
              <span>Std hrs:</span>
              <input type="number" value={stdHours} min={1} max={80}
                onChange={e => setStdHours(Number(e.target.value))}
                style={{ ...inputStyle, width: 56, textAlign: 'center', padding: '5px 8px' }}
              />
              <button onClick={handleUpdateConfig}
                style={{ padding: '5px 12px', background: '#F2F4F7', border: '1px solid #E4E7EC', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#344054', fontFamily: 'inherit' }}>
                Save
              </button>
            </div>
            <div style={{ width: 1, height: 24, background: '#E4E7EC' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#0F62FE' }}>
                {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span style={{ fontSize: 13.5, color: '#344054', fontWeight: 500 }}>{session?.user?.name || 'User'}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              style={{ padding: '6px 12px', background: 'none', border: '1px solid #E4E7EC', borderRadius: 7, cursor: 'pointer', fontSize: 13, color: '#667085', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              Sign out
            </button>
          </div>
        </nav>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px' }}>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="card">
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, color: '#101828', marginBottom: 4 }}>Workforce Overview</h2>
                <p style={{ fontSize: 14, color: '#667085' }}>Track and manage your organization&apos;s FTE across all departments</p>
              </div>

              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Total Headcount', value: employees.length, sub: 'employees', icon: '👥', color: '#0F62FE', bg: '#EFF4FF' },
                  { label: 'Total FTE', value: totalFTE.toFixed(2), sub: `@ ${config.standardHours} hrs/wk`, icon: '⚡', color: '#7C3AED', bg: '#F5F3FF' },
                  { label: 'Departments', value: departments.length, sub: 'active teams', icon: '🏢', color: '#059669', bg: '#ECFDF5' },
                  { label: 'Full-time Rate', value: `${employees.length ? Math.round(fullTimeCount / employees.length * 100) : 0}%`, sub: `${fullTimeCount} of ${employees.length}`, icon: '📊', color: '#D97706', bg: '#FFFBEB' },
                ].map(c => (
                  <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #E4E7EC', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</span>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{c.icon}</div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 600, color: '#101828', letterSpacing: '-0.5px', marginBottom: 4 }}>{c.value}</div>
                    <div style={{ fontSize: 12.5, color: '#98A2B3' }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 28 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #E4E7EC' }}>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#101828' }}>FTE by Department</h3>
                    <p style={{ fontSize: 12.5, color: '#98A2B3', marginTop: 2 }}>Full-time equivalent per team</p>
                  </div>
                  {departments.length === 0 ? (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D0D5DD', fontSize: 13 }}>No departments yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={departments} barSize={32}>
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ border: '1px solid #E4E7EC', borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                          formatter={(value) => [Number(value ?? 0).toFixed(2), 'FTE']}
                        />
                        <Bar dataKey="totalFTE" fill="#0F62FE" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #E4E7EC' }}>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#101828' }}>Employee Types</h3>
                    <p style={{ fontSize: 12.5, color: '#98A2B3', marginTop: 2 }}>Distribution by contract type</p>
                  </div>
                  {employees.length === 0 ? (
                    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D0D5DD', fontSize: 13 }}>No employees yet</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={typeData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3}>
                            {typeData.map((_, i) => <Cell key={i} fill={Object.values(TYPE_COLORS)[i]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ border: '1px solid #E4E7EC', borderRadius: 8, fontSize: 13 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                        {typeData.map((d, i) => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: Object.values(TYPE_COLORS)[i] }} />
                            <span style={{ color: '#667085' }}>{d.name}</span>
                            <span style={{ color: '#101828', fontWeight: 500 }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recent Employees */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F2F4F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#101828' }}>Recent Employees</h3>
                    <p style={{ fontSize: 12.5, color: '#98A2B3', marginTop: 2 }}>Latest 5 additions</p>
                  </div>
                  <button onClick={() => setActiveTab('employees')}
                    style={{ fontSize: 13, color: '#0F62FE', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                    View all →
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      {['Name', 'Department', 'Type', 'Hours/wk', 'FTE'].map(h => (
                        <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.slice(0, 5).map(e => (
                      <tr key={e.id} style={{ borderTop: '1px solid #F2F4F7' }}>
                        <td style={{ padding: '14px 24px', fontWeight: 500, color: '#101828' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#344054' }}>
                              {e.name.charAt(0)}
                            </div>
                            {e.name}
                          </div>
                        </td>
                        <td style={{ padding: '14px 24px', color: '#667085' }}>{e.department.name}</td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: TYPE_COLORS[e.employeeType] + '18', color: TYPE_COLORS[e.employeeType] }}>
                            {TYPE_LABELS[e.employeeType]}
                          </span>
                        </td>
                        <td style={{ padding: '14px 24px', color: '#667085', fontFamily: "'DM Sans', sans-serif" }}>{e.hoursPerWeek}h</td>
                        <td style={{ padding: '14px 24px', fontWeight: 600, color: '#101828', fontFamily: "'DM Sans', sans-serif" }}>
                          {(e.hoursPerWeek / config.standardHours).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── EMPLOYEES ── */}
          {activeTab === 'employees' && (
            <div className="page">

              {/* Add Employee Form */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', padding: '20px 24px', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Add New Employee</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 100px auto', gap: 10, alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Full name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Chen" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Department</label>
                    <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
                      <option value="">Select...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Type</label>
                    <select value={type} onChange={e => setType(e.target.value as Employee['employeeType'])} style={inputStyle}>
                      <option value="FULL_TIME">Full-time</option>
                      <option value="PART_TIME">Part-time</option>
                      <option value="CONTRACT">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Hrs/wk</label>
                    <input type="number" value={hours} min={1} max={80} onChange={e => setHours(Number(e.target.value))} style={inputStyle} />
                  </div>
                  <button onClick={handleAddEmployee} className="action-btn" style={{ height: 40, whiteSpace: 'nowrap' }}>+ Add </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search by name..."
                      style={{ ...inputStyle, paddingLeft: 36 }}
                    />
                  </div>

                  {/* Department Filter */}
                  <div>
                    <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={inputStyle}>
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
                      <option value="">All Types</option>
                      <option value="FULL_TIME">Full-time</option>
                      <option value="PART_TIME">Part-time</option>
                      <option value="CONTRACT">Contract</option>
                    </select>
                  </div>

                  {/* FTE Range Filter */}
                  <div>
                    <select value={filterFTE} onChange={e => setFilterFTE(e.target.value)} style={inputStyle}>
                      <option value="">All FTE</option>
                      <option value="lt05">FTE &lt; 0.5</option>
                      <option value="0510">0.5 ≤ FTE &lt; 1.0</option>
                      <option value="eq1">FTE = 1.0</option>
                      <option value="gt1">FTE &gt; 1.0</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  {(search || filterDept || filterType || filterFTE) && (
                    <button
                      onClick={() => { setSearch(''); setFilterDept(''); setFilterType(''); setFilterFTE('') }}
                      style={{ padding: '9px 14px', background: '#FEE2E2', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#EF4444', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
                      ✕ Clear
                    </button>
                  )}
                </div>

                {/* Results count */}
                <div style={{ marginTop: 10, fontSize: 12.5, color: '#9CA3AF' }}>
                  Showing <span style={{ fontWeight: 600, color: '#374151' }}>{filteredEmployees.length}</span> of <span style={{ fontWeight: 600, color: '#374151' }}>{employees.length}</span> employees
                  {(search || filterDept || filterType || filterFTE) && (
                    <span style={{ marginLeft: 8, color: '#F59E0B', fontWeight: 500 }}>· Filters active</span>
                  )}
                </div>
              </div>

              {/* Employee Table */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      {['Name', 'Department', 'Type', 'Hours/wk', 'FTE', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr style={{ borderTop: '1px solid #F2F4F7' }}>
                        <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                          <div style={{ color: '#D1D5DB', fontSize: 14 }}>
                            {employees.length === 0 ? 'No employees yet. Add one above.' : 'No employees match your filters.'}
                          </div>
                          {employees.length > 0 && (
                            <button onClick={() => { setSearch(''); setFilterDept(''); setFilterType(''); setFilterFTE('') }}
                              style={{ marginTop: 12, padding: '7px 16px', background: '#FEF3C7', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#92400E', fontFamily: 'Inter,sans-serif' }}>
                              Clear filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : filteredEmployees.map(e => (
                      <tr key={e.id} style={{ borderTop: '1px solid #F2F4F7' }}>
                        {editingId === e.id ? (
                          <>
                            <td style={{ padding: '14px 24px' }}><input value={editForm.name || ''} onChange={ev => setEditForm(f => ({ ...f, name: ev.target.value }))} style={{ ...inputStyle, padding: '7px 10px' }} /></td>
                            <td style={{ padding: '14px 24px' }}><select value={editForm.departmentId || ''} onChange={ev => setEditForm(f => ({ ...f, departmentId: parseInt(ev.target.value) }))} style={{ ...inputStyle, padding: '7px 10px' }}>
                              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select></td>
                            <td style={{ padding: '14px 24px' }}><select value={editForm.employeeType || 'FULL_TIME'} onChange={ev => setEditForm(f => ({ ...f, employeeType: ev.target.value as Employee['employeeType'] }))} style={{ ...inputStyle, padding: '7px 10px' }}>
                              <option value="FULL_TIME">Full-time</option>
                              <option value="PART_TIME">Part-time</option>
                              <option value="CONTRACT">Contract</option>
                            </select></td>
                            <td style={{ padding: '14px 24px' }}><input type="number" value={editForm.hoursPerWeek || ''} onChange={ev => setEditForm(f => ({ ...f, hoursPerWeek: parseFloat(ev.target.value) }))} style={{ ...inputStyle, padding: '7px 10px' }} /></td>
                            <td style={{ padding: '14px 24px', color: '#9CA3AF', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{editForm.hoursPerWeek ? (editForm.hoursPerWeek / config.standardHours).toFixed(2) : '—'}</td>
                            <td style={{ padding: '14px 24px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => handleEditSave(e.id)} style={{ padding: '6px 14px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>Save</button>
                                <button onClick={handleEditCancel} style={{ padding: '6px 12px', background: '#F3F4F6', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: '#6B7280', fontFamily: 'Inter,sans-serif' }}>Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '14px 24px', fontWeight: 500, color: '#101828' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#344054', flexShrink: 0 }}>
                                  {e.name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 500, color: '#101828' }}>
                                    {search ? (
                                      e.name.split(new RegExp(`(${search})`, 'gi')).map((part, i) =>
                                        part.toLowerCase() === search.toLowerCase()
                                          ? <mark key={i} style={{ background: '#FEF08A', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
                                          : part
                                      )
                                    ) : e.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 24px', color: '#667085' }}>{e.department.name}</td>
                            <td style={{ padding: '14px 24px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: TYPE_COLORS[e.employeeType] + '18', color: TYPE_COLORS[e.employeeType] }}>
                                {TYPE_LABELS[e.employeeType]}
                              </span>
                            </td>
                            <td style={{ padding: '14px 24px', color: '#667085', fontFamily: "'DM Sans', sans-serif" }}>{e.hoursPerWeek}h</td>
                            <td style={{ padding: '14px 24px', fontWeight: 600, color: '#101828', fontFamily: "'DM Sans', sans-serif" }}>{(e.hoursPerWeek / config.standardHours).toFixed(2)}</td>
                            <td style={{ padding: '14px 24px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => handleEditStart(e)}
                                  style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                  onMouseEnter={ev => { ev.currentTarget.style.borderColor = '#F59E0B'; ev.currentTarget.style.background = '#FEF3C7' }}
                                  onMouseLeave={ev => { ev.currentTarget.style.borderColor = '#E5E7EB'; ev.currentTarget.style.background = '#fff' }}>✏️</button>
                                <button onClick={() => handleDeleteEmployee(e.id)}
                                  style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                  onMouseEnter={ev => { ev.currentTarget.style.borderColor = '#FCA5A5'; ev.currentTarget.style.background = '#FEF2F2' }}
                                  onMouseLeave={ev => { ev.currentTarget.style.borderColor = '#E5E7EB'; ev.currentTarget.style.background = '#fff' }}>✕</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEPARTMENTS TAB */}
          {activeTab === 'departments' && (
            <div className="card">
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, color: '#101828', marginBottom: 4 }}>Departments</h2>
                <p style={{ fontSize: 14, color: '#667085' }}>{departments.length} active departments</p>
              </div>

              {/* Add Department */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '20px 24px', marginBottom: 20 }}>
                <h3 style={{ fontSize: 13.5, fontWeight: 600, color: '#344054', marginBottom: 16 }}>Add Department</h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input value={newDept} onChange={e => setNewDept(e.target.value)}
                    placeholder="e.g. Engineering, Operations, HR..."
                    onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
                    style={{ ...inputStyle, maxWidth: 400 }}
                  />
                  <button onClick={handleAddDepartment}
                    style={{ padding: '9px 20px', background: '#0F62FE', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    + Add Department
                  </button>
                </div>
              </div>

              {/* Department Cards */}
              {departments.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '48px', textAlign: 'center', color: '#D0D5DD', fontSize: 14 }}>
                  No departments yet. Add your first one above.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {departments.map((d, i) => {
                    const colors = ['#0F62FE', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2']
                    const c = colors[i % colors.length]
                    return (
                      <div key={d.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '24px', transition: 'box-shadow 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            🏢
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#101828', fontSize: 15 }}>{d.name}</div>
                            <div style={{ fontSize: 12.5, color: '#98A2B3', marginTop: 1 }}>{d.headcount} {d.headcount === 1 ? 'employee' : 'employees'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#F9FAFB', borderRadius: 8 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#101828', fontFamily: "'DM Sans', sans-serif" }}>{d.totalFTE.toFixed(2)}</div>
                            <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total FTE</div>
                          </div>
                          <div style={{ width: 1, background: '#E4E7EC' }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#101828' }}>{d.headcount}</div>
                            <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Headcount</div>
                          </div>
                          <div style={{ width: 1, background: '#E4E7EC' }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#101828', fontFamily: "'DM Sans', sans-serif" }}>
                              {d.headcount ? (d.totalFTE / d.headcount).toFixed(2) : '0.00'}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg FTE</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {/* DIGITAL FTE TAB */}
          {activeTab === 'digital-fte' && (
            <div className="card">
              <div style={{ marginBottom:28 }}>
                <h2 style={{ fontSize:22, fontWeight:600, color:'#101828', marginBottom:4 }}>Digital FTE</h2>
                <p style={{ fontSize:14, color:'#667085' }}>Track automation savings and measure their impact in FTE units</p>
              </div>

              {/* Summary Cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
                {[
                  { label:'Current FTE',        value:totalFTE.toFixed(2),                    sub:'manual workforce',      icon:'👥', color:'#0F62FE', bg:'#EFF4FF' },
                  { label:'Digital FTE Saved',   value:autoSummary.totalDigitalFTE.toFixed(2), sub:'via automation',        icon:'🤖', color:'#059669', bg:'#ECFDF5' },
                  { label:'Hours Saved/Week',    value:autoSummary.totalHoursSaved,             sub:'across all processes',  icon:'⏱️', color:'#D97706', bg:'#FFFBEB' },
                  { label:'Automations',         value:autoSummary.count,                       sub:'active processes',      icon:'⚡', color:'#7C3AED', bg:'#F5F3FF' },
                ].map(c => (
                  <div key={c.label} style={{ background:'#fff', borderRadius:12, padding:'20px 24px', border:'1px solid #E4E7EC', transition:'box-shadow 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <span style={{ fontSize:12, fontWeight:500, color:'#667085', textTransform:'uppercase', letterSpacing:'0.05em' }}>{c.label}</span>
                      <div style={{ width:36, height:36, borderRadius:8, background:c.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{c.icon}</div>
                    </div>
                    <div style={{ fontSize:28, fontWeight:600, color:'#101828', letterSpacing:'-0.5px', marginBottom:4 }}>{c.value}</div>
                    <div style={{ fontSize:12.5, color:'#98A2B3' }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* FTE Impact Overview */}
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'24px', marginBottom:24 }}>
                <div style={{ marginBottom:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#101828' }}>FTE Impact Overview</h3>
                  <p style={{ fontSize:12.5, color:'#98A2B3', marginTop:2 }}>Manual FTE vs Digital FTE saved through automation</p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, alignItems:'center' }}>
                  <div>
                    {[
                      { label:'Current FTE (Manual)', value:totalFTE,                          color:'#0F62FE' },
                      { label:'Digital FTE Saved',    value:autoSummary.totalDigitalFTE,        color:'#059669' },
                      { label:'Net FTE Required',     value:Math.max(0, totalFTE - autoSummary.totalDigitalFTE), color:'#D97706' },
                    ].map(bar => {
                      const max = Math.max(totalFTE, autoSummary.totalDigitalFTE) || 1
                      return (
                        <div key={bar.label} style={{ marginBottom:18 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontSize:13, color:'#344054', fontWeight:500 }}>{bar.label}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:'#101828' }}>{bar.value.toFixed(2)}</span>
                          </div>
                          <div style={{ height:10, background:'#F2F4F7', borderRadius:99, overflow:'hidden' }}>
                            <div style={{
                              height:'100%', borderRadius:99, background:bar.color,
                              width:`${Math.min(100,(bar.value/max)*100)}%`,
                              transition:'width 0.6s ease'
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ background:'#F9FAFB', borderRadius:12, padding:'24px', textAlign:'center' }}>
                    <div style={{ fontSize:12, color:'#98A2B3', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:500 }}>Estimated Annual Saving</div>
                    <div style={{ fontSize:36, fontWeight:700, color:'#059669', letterSpacing:'-1px' }}>
                      ${Math.round(autoSummary.totalDigitalFTE * 50000).toLocaleString()}
                    </div>
                    <div style={{ fontSize:12.5, color:'#98A2B3', marginTop:6 }}>@ $50,000 avg salary per FTE</div>
                    <div style={{ marginTop:16, padding:'10px 14px', background:'#ECFDF5', borderRadius:8 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#065F46' }}>
                        {autoSummary.totalDigitalFTE > 0
                          ? `${((autoSummary.totalDigitalFTE / (totalFTE || 1)) * 100).toFixed(1)}% of workforce automated`
                          : 'No automations logged yet'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Automation Form */}
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', padding:'20px 24px', marginBottom:20 }}>
                <h3 style={{ fontSize:13.5, fontWeight:600, color:'#344054', marginBottom:16 }}>Log New Automation</h3>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr auto', gap:10, alignItems:'flex-end', marginBottom:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:500, color:'#344054', display:'block', marginBottom:6 }}>Process name *</label>
                    <input value={autoName} onChange={e => setAutoName(e.target.value)} placeholder="e.g. Invoice Processing"
                      style={{ padding:'9px 12px', border:'1px solid #E4E7EC', borderRadius:8, fontSize:13.5, background:'#fff', color:'#101828', outline:'none', width:'100%', fontFamily:'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:500, color:'#344054', display:'block', marginBottom:6 }}>Department *</label>
                    <select value={autoDept} onChange={e => setAutoDept(e.target.value)}
                      style={{ padding:'9px 12px', border:'1px solid #E4E7EC', borderRadius:8, fontSize:13.5, background:'#fff', color:'#101828', outline:'none', width:'100%', fontFamily:'inherit' }}>
                      <option value="">Select department...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:500, color:'#344054', display:'block', marginBottom:6 }}>Hrs saved/week *</label>
                    <input type="number" value={autoHours||''} min={0} onChange={e => setAutoHours(Number(e.target.value))} placeholder="e.g. 20"
                      style={{ padding:'9px 12px', border:'1px solid #E4E7EC', borderRadius:8, fontSize:13.5, background:'#fff', color:'#101828', outline:'none', width:'100%', fontFamily:'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:500, color:'#344054', display:'block', marginBottom:6 }}>Employees affected *</label>
                    <input type="number" value={autoEmployees||''} min={1} onChange={e => setAutoEmployees(Number(e.target.value))} placeholder="e.g. 3"
                      style={{ padding:'9px 12px', border:'1px solid #E4E7EC', borderRadius:8, fontSize:13.5, background:'#fff', color:'#101828', outline:'none', width:'100%', fontFamily:'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:500, color:'#344054', display:'block', marginBottom:6 }}>Status</label>
                    <select value={autoStatus} onChange={e => setAutoStatus(e.target.value as 'ACTIVE' | 'PILOT' | 'PLANNED')}
                      style={{ padding:'9px 12px', border:'1px solid #E4E7EC', borderRadius:8, fontSize:13.5, background:'#fff', color:'#101828', outline:'none', width:'100%', fontFamily:'inherit' }}>
                      <option value="ACTIVE">Active</option>
                      <option value="PILOT">Pilot</option>
                      <option value="PLANNED">Planned</option>
                    </select>
                  </div>
                  <button onClick={handleAddAutomation}
                    style={{ padding:'9px 20px', background:'#0F62FE', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13.5, fontWeight:500, fontFamily:'inherit', whiteSpace:'nowrap', height:40 }}>
                    + Log
                  </button>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:500, color:'#344054', display:'block', marginBottom:6 }}>Description (optional)</label>
                  <input value={autoDesc} onChange={e => setAutoDesc(e.target.value)}
                    placeholder="Brief description of what this automation does..."
                    style={{ padding:'9px 12px', border:'1px solid #E4E7EC', borderRadius:8, fontSize:13.5, background:'#fff', color:'#101828', outline:'none', width:'100%', maxWidth:600, fontFamily:'inherit' }} />
                </div>
              </div>

              {/* Automations Table */}
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E4E7EC', overflow:'hidden' }}>
                <div style={{ padding:'20px 24px', borderBottom:'1px solid #F2F4F7' }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'#101828' }}>Logged Automations</h3>
                  <p style={{ fontSize:12.5, color:'#98A2B3', marginTop:2 }}>{automations.length} processes tracked</p>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                  <thead>
                    <tr style={{ background:'#F9FAFB' }}>
                      {['Process','Department','Status','Hrs Saved/wk','Employees','Digital FTE','Annual Saving',''].map(h => (
                        <th key={h} style={{ padding:'10px 20px', textAlign:'left', fontSize:12, fontWeight:500, color:'#667085', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {automations.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding:'48px', textAlign:'center', color:'#D0D5DD', fontSize:13.5 }}>
                        No automations logged yet. Add your first one above.
                      </td></tr>
                    ) : automations.map(a => {
                      const sc: Record<string,{bg:string;color:string}> = {
                        ACTIVE:  { bg:'#ECFDF5', color:'#065F46' },
                        PILOT:   { bg:'#FFFBEB', color:'#92400E' },
                        PLANNED: { bg:'#F5F3FF', color:'#5B21B6' },
                      }
                      return (
                        <tr key={a.id} style={{ borderTop:'1px solid #F2F4F7' }}>
                          <td style={{ padding:'14px 20px' }}>
                            <div style={{ fontWeight:500, color:'#101828' }}>{a.name}</div>
                            {a.description && <div style={{ fontSize:12, color:'#98A2B3', marginTop:2 }}>{a.description}</div>}
                          </td>
                          <td style={{ padding:'14px 20px', color:'#667085' }}>{a.department.name}</td>
                          <td style={{ padding:'14px 20px' }}>
                            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:500, background:sc[a.status].bg, color:sc[a.status].color }}>
                              {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td style={{ padding:'14px 20px', fontWeight:600, color:'#101828' }}>{a.hoursSavedPerWeek}h</td>
                          <td style={{ padding:'14px 20px', color:'#667085' }}>{a.employeesAffected}</td>
                          <td style={{ padding:'14px 20px' }}>
                            <span style={{ fontSize:16, fontWeight:700, color:'#059669' }}>{a.digitalFTE.toFixed(2)}</span>
                          </td>
                          <td style={{ padding:'14px 20px', fontWeight:600, color:'#059669' }}>
                            ${Math.round(a.digitalFTE * 50000).toLocaleString()}
                          </td>
                          <td style={{ padding:'14px 20px' }}>
                            <button onClick={() => handleDeleteAutomation(a.id)}
                              style={{ width:32, height:32, borderRadius:6, border:'1px solid #E4E7EC', background:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', color:'#667085', transition:'all 0.15s' }}
                              onMouseEnter={ev=>{ev.currentTarget.style.borderColor='#F04438';ev.currentTarget.style.color='#F04438'}}
                              onMouseLeave={ev=>{ev.currentTarget.style.borderColor='#E4E7EC';ev.currentTarget.style.color='#667085'}}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
