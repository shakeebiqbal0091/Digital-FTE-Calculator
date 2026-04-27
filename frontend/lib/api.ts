import axios from 'axios'
import { getSession } from 'next-auth/react'

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
})

// Auto-attach JWT token from session to every request
api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session) {
    config.headers.Authorization = `Bearer ${(session as any).accessToken}`
  }
  return config
})

export interface Department {
  id: number
  name: string
  headcount: number
  totalFTE: number
}

export interface Employee {
  id: number
  name: string
  employeeType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT'
  hoursPerWeek: number
  departmentId: number
  department: { id: number; name: string }
}

export interface Config {
  id: number
  standardHours: number
}

export const getEmployees   = () => api.get<Employee[]>('/employees').then(r => r.data)
export const createEmployee = (data: Omit<Employee, 'id' | 'department'>) =>
  api.post<Employee>('/employees', data).then(r => r.data)
export const deleteEmployee = (id: number) => api.delete(`/employees/${id}`)
export const updateEmployee = (id: number, data: Partial<Employee>) =>
  api.put<Employee>(`/employees/${id}`, data).then(r => r.data)

export const getDepartments   = () => api.get<Department[]>('/departments').then(r => r.data)
export const createDepartment = (name: string) =>
  api.post<Department>('/departments', { name }).then(r => r.data)

export const getConfig    = () => api.get<Config>('/config').then(r => r.data)
export const updateConfig = (standardHours: number) =>
  api.put<Config>('/config', { standardHours }).then(r => r.data)

export interface Automation {
  id: number
  name: string
  description?: string
  departmentId: number
  department: { id: number; name: string }
  hoursSavedPerWeek: number
  employeesAffected: number
  status: 'ACTIVE' | 'PILOT' | 'PLANNED'
  digitalFTE: number
  annualHoursSaved: number
}

export interface AutomationSummary {
  totalHoursSaved: number
  totalDigitalFTE: number
  count: number
}

export const getAutomations = () =>
  api.get<{ automations: Automation[]; summary: AutomationSummary }>('/automations').then(r => r.data)

export const createAutomation = (data: Omit<Automation, 'id' | 'department' | 'digitalFTE' | 'annualHoursSaved'>) =>
  api.post<Automation>('/automations', data).then(r => r.data)

export const deleteAutomation = (id: number) => api.delete(`/automations/${id}`)