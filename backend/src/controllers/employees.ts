import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getEmployees = async (req: AuthRequest, res: Response) => {
  const employees = await prisma.employee.findMany({
    where: { organizationId: Number(req.orgId) },   // ✅ Number() cast
    include: { department: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(employees)
}

export const createEmployee = async (req: AuthRequest, res: Response) => {
  const { name, employeeType, hoursPerWeek, departmentId } = req.body
  if (!name || !employeeType || !hoursPerWeek || !departmentId)
    return res.status(400).json({ error: 'All fields are required' })

  const employee = await prisma.employee.create({
    data: {
      name,
      employeeType,
      hoursPerWeek,
      departmentId,
      organizationId: Number(req.orgId!)   // ✅ Number() cast
    },
    include: { department: true },
  })
  res.status(201).json(employee)
}

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)       // ✅ parse once, reuse
  await prisma.employee.delete({
    where: { id, organizationId: Number(req.orgId) }  // ✅ Number() cast
  })
  res.json({ message: 'Employee deleted' })
}

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)       // ✅ parse once, reuse
  const { name, employeeType, hoursPerWeek, departmentId } = req.body

  const employee = await prisma.employee.update({
    where: { id, organizationId: Number(req.orgId) },  // ✅ Number() cast
    data: { name, employeeType, hoursPerWeek, departmentId },
    include: { department: true },
  })
  res.json(employee)
}