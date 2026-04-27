import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

// GET all automations with Digital FTE summary
export const getAutomations = async (req: AuthRequest, res: Response) => {
  const config = await prisma.config.findUnique({ where: { organizationId: req.orgId } })
  const standardHours = config?.standardHours || 40

  const automations = await prisma.automation.findMany({
    where: { organizationId: req.orgId },
    include: { department: true },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate Digital FTE for each automation
  const result = automations.map(a => ({
    ...a,
    digitalFTE: parseFloat((a.hoursSavedPerWeek / standardHours).toFixed(2)),
    annualHoursSaved: a.hoursSavedPerWeek * 52,
  }))

  // Summary stats
  const totalHoursSaved = automations.reduce((s, a) => s + a.hoursSavedPerWeek, 0)
  const totalDigitalFTE = parseFloat((totalHoursSaved / standardHours).toFixed(2))

  res.json({ automations: result, summary: { totalHoursSaved, totalDigitalFTE, count: automations.length } })
}

// POST create automation
export const createAutomation = async (req: AuthRequest, res: Response) => {
  const { name, description, departmentId, hoursSavedPerWeek, employeesAffected, status } = req.body
  if (!name || !departmentId || !hoursSavedPerWeek || !employeesAffected)
    return res.status(400).json({ error: 'All fields required' })

  const automation = await prisma.automation.create({
    data: {
      name, description, departmentId, hoursSavedPerWeek,
      employeesAffected, status: status || 'ACTIVE',
      organizationId: req.orgId!
    },
    include: { department: true },
  })
  res.status(201).json(automation)
}

// PUT update automation
export const updateAutomation = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, description, departmentId, hoursSavedPerWeek, employeesAffected, status } = req.body

  const automation = await prisma.automation.update({
    where: { id: parseInt(id), organizationId: req.orgId },
    data: { name, description, departmentId, hoursSavedPerWeek, employeesAffected, status },
    include: { department: true },
  })
  res.json(automation)
}

// DELETE automation
export const deleteAutomation = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  await prisma.automation.delete({ where: { id: parseInt(id), organizationId: req.orgId } })
  res.json({ message: 'Automation deleted' })
}