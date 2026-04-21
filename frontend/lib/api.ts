import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
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

// Employees
export const getEmployees = () => api.get<Employee[]>('/employees').then(r => r.data)
export const createEmployee = (data: Omit<Employee, 'id' | 'department'>) =>
  api.post<Employee>('/employees', data).then(r => r.data)
export const deleteEmployee = (id: number) => api.delete(`/employees/${id}`)

// Departments
export const getDepartments = () => api.get<Department[]>('/departments').then(r => r.data)
export const createDepartment = (name: string) =>
  api.post<Department>('/departments', { name }).then(r => r.data)

// Config
export const getConfig = () => api.get<Config>('/config').then(r => r.data)
export const updateConfig = (standardHours: number) =>
  api.put<Config>('/config', { standardHours }).then(r => r.data)