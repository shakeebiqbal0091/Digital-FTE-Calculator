import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// GET all employees with department info
export const getEmployees = async (req: Request, res: Response) => {
  const employees = await prisma.employee.findMany({
    include: { department: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(employees)
}

// POST create new employee
export const createEmployee = async (req: Request, res: Response) => {
  const { name, employeeType, hoursPerWeek, departmentId } = req.body

  if (!name || !employeeType || !hoursPerWeek || !departmentId) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  const employee = await prisma.employee.create({
    data: { name, employeeType, hoursPerWeek, departmentId },
    include: { department: true },
  })
  res.status(201).json(employee)
}

// DELETE employee
export const deleteEmployee = async (req: Request, res: Response) => {
    const id = req.params.id as string
    await prisma.employee.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Employee deleted' })
  }

// PUT update employee
export const updateEmployee = async (req: Request, res: Response) => {
    const id = req.params.id as string
    const { name, employeeType, hoursPerWeek, departmentId } = req.body
  
    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
    data: { name, employeeType, hoursPerWeek, departmentId },
    include: { department: true },
  })
  res.json(employee)
}