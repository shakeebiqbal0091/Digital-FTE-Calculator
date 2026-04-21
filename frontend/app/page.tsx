'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
  getEmployees, createEmployee, deleteEmployee,
  getDepartments, createDepartment,
  getConfig, updateConfig,
  Employee, Department, Config
} from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const TYPE_COLORS: Record<string, string> = {
  FULL_TIME: '#378ADD',
  PART_TIME: '#1D9E75',
  CONTRACT: '#EF9F27',
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

  // Form state
  const [name, setName] = useState('')
  const [dept, setDept] = useState('')
  const [newDept, setNewDept] = useState('')
  const [type, setType] = useState<Employee['employeeType']>('FULL_TIME')
  const [hours, setHours] = useState<number>(40)
  const [stdHours, setStdHours] = useState<number>(40)
  const { data: session } = useSession()

  const fetchAll = async () => {
    const [emps, depts, cfg] = await Promise.all([
      getEmployees(), getDepartments(), getConfig()
    ])
    setEmployees(emps)
    setDepartments(depts)
    setConfig(cfg)
    setStdHours(cfg.standardHours)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAddEmployee = async () => {
    if (!name || !dept || !hours) return alert('Fill all fields')
    await createEmployee({
      name, employeeType: type,
      hoursPerWeek: hours,
      departmentId: parseInt(dept),
    })
    setName(''); setHours(40)
    fetchAll()
  }

  const handleAddDepartment = async () => {
    if (!newDept.trim()) return
    await createDepartment(newDept.trim())
    setNewDept('')
    fetchAll()
  }

  const handleDeleteEmployee = async (id: number) => {
    await deleteEmployee(id)
    fetchAll()
  }

  const handleUpdateConfig = async () => {
    await updateConfig(stdHours)
    fetchAll()
  }

  // Metrics
  const totalFTE = employees.reduce((s, e) => s + e.hoursPerWeek / config.standardHours, 0)
  const fullTimeCount = employees.filter(e => e.employeeType === 'FULL_TIME').length

  // Pie chart data
  const typeData = ['FULL_TIME', 'PART_TIME', 'CONTRACT'].map(t => ({
    name: TYPE_LABELS[t],
    value: employees.filter(e => e.employeeType === t).length,
  })).filter(d => d.value > 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      Loading...
    </div>
  )

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>FTE Calculator</h1>
          <p style={{ color: '#888', fontSize: 14, margin: '4px 0 0' }}>Workforce management dashboard</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <span style={{ color: '#888' }}>Standard hrs/week:</span>
          <input
            type="number" value={stdHours} min={1} max={80}
            onChange={e => setStdHours(Number(e.target.value))}
            style={{ width: 60, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, textAlign: 'center' }}
          />
          <button onClick={handleUpdateConfig}
            style={{ padding: '6px 14px', background: '#378ADD', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
            Update
          </button>
          {/* 👇 ADD THIS */}
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ padding: '6px 14px', background: 'none', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#666' }}>
            Sign out {session?.user?.name ? `(${session.user.name})` : ''}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: '2rem' }}>
        {[
          { label: 'Total Headcount', value: employees.length, sub: 'employees' },
          { label: 'Total FTE', value: totalFTE.toFixed(2), sub: `@ ${config.standardHours} hrs/wk` },
          { label: 'Departments', value: departments.length, sub: 'active' },
          { label: 'Full-time', value: `${employees.length ? Math.round(fullTimeCount / employees.length * 100) : 0}%`, sub: `${fullTimeCount} employees` },
        ].map(c => (
          <div key={c.label} style={{ background: '#f7f8fa', borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '2rem' }}>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 16 }}>FTE by department</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={departments}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [v.toFixed(2), 'FTE']} />
              <Bar dataKey="totalFTE" fill="#378ADD" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 16 }}>Employee type distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={Object.values(TYPE_COLORS)[i]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add Department */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add department</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newDept} onChange={e => setNewDept(e.target.value)}
            placeholder="Department name"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
          />
          <button onClick={handleAddDepartment}
            style={{ padding: '8px 20px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            + Add
          </button>
        </div>
      </div>

      {/* Add Employee */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add employee</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr auto', gap: 8, alignItems: 'center' }}>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Full name"
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
          />
          <select value={dept} onChange={e => setDept(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value as Employee['employeeType'])}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
          </select>
          <input type="number" value={hours} onChange={e => setHours(Number(e.target.value))}
            placeholder="Hrs/wk" min={1} max={80}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
          />
          <button onClick={handleAddEmployee}
            style={{ padding: '8px 20px', background: '#378ADD', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>
            + Add
          </button>
        </div>
      </div>

      {/* Employee Table */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Employees</div>
        {employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: 14 }}>No employees yet. Add one above.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                {['Name', 'Department', 'Type', 'Hrs/wk', 'FTE', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#888', fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '10px' }}>{e.name}</td>
                  <td style={{ padding: '10px', color: '#666' }}>{e.department.name}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      background: TYPE_COLORS[e.employeeType] + '22',
                      color: TYPE_COLORS[e.employeeType],
                      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500
                    }}>
                      {TYPE_LABELS[e.employeeType]}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#666' }}>{e.hoursPerWeek}</td>
                  <td style={{ padding: '10px', fontWeight: 500 }}>
                    {(e.hoursPerWeek / config.standardHours).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    <button onClick={() => handleDeleteEmployee(e.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16 }}
                      onMouseEnter={ev => (ev.currentTarget.style.color = '#E24B4A')}
                      onMouseLeave={ev => (ev.currentTarget.style.color = '#ccc')}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}