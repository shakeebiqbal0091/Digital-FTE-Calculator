import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getEmployees = async (req: AuthRequest, res: Response) => {
  const employees = await prisma.employee.findMany({
    where: { organizationId: req.orgId },
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
    data: { name, employeeType, hoursPerWeek, departmentId, organizationId: req.orgId! },
    include: { department: true },
  })
  res.status(201).json(employee)
}

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  await prisma.employee.delete({
    where: { id: parseInt(id), organizationId: req.orgId }
  })
  res.json({ message: 'Employee deleted' })
}

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, employeeType, hoursPerWeek, departmentId } = req.body

  const employee = await prisma.employee.update({
    where: { id: parseInt(id), organizationId: req.orgId },
    data: { name, employeeType, hoursPerWeek, departmentId },
    include: { department: true },
  })
  res.json(employee)
}