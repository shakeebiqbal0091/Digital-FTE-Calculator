import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getDepartments = async (req: AuthRequest, res: Response) => {
  const config = await prisma.config.findUnique({
    where: { organizationId: Number(req.orgId) }   // ✅ cast to Number
  })
  const standardHours = config?.standardHours || 40

  const departments = await prisma.department.findMany({
    where: { organizationId: Number(req.orgId) },  // ✅ cast to Number
    include: { employees: true },                   // ✅ was missing — caused employees error
  })

  const summary = departments.map(dept => ({
    id: dept.id,
    name: dept.name,
    headcount: dept.employees.length,
    totalFTE: parseFloat(
      dept.employees
        .reduce((sum, e) => sum + e.hoursPerWeek / standardHours, 0)
        .toFixed(2)
    ),
  }))

  res.json(summary)
}

export const createDepartment = async (req: AuthRequest, res: Response) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const department = await prisma.department.create({
    data: { name, organizationId: Number(req.orgId!) }  // ✅ cast to Number
  })
  res.status(201).json(department)
}