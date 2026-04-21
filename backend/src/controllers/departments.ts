import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// GET all departments with FTE summary
export const getDepartments = async (req: Request, res: Response) => {
  const config = await prisma.config.findUnique({ where: { id: 1 } })
  const standardHours = config?.standardHours || 40

  const departments = await prisma.department.findMany({
    include: { employees: true },
  })

  // Calculate FTE per department
  const summary = departments.map((dept) => ({
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

// POST create department
export const createDepartment = async (req: Request, res: Response) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const department = await prisma.department.create({ data: { name } })
  res.status(201).json(department)
}