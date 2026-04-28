import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getAutomations = async (req: AuthRequest, res: Response) => {
  const orgId = Number(req.orgId)   // ✅ cast once at top, reuse below

  const config = await prisma.config.findUnique({
    where: { organizationId: orgId }
  })
  const standardHours = config?.standardHours || 40

  const automations = await prisma.automation.findMany({
    where: { organizationId: orgId },
    include: { department: true },
    orderBy: { createdAt: 'desc' },
  })

  const result = automations.map(a => ({
    ...a,
    digitalFTE: parseFloat((a.hoursSavedPerWeek / standardHours).toFixed(2)),
    annualHoursSaved: a.hoursSavedPerWeek * 52,
  }))

  const totalHoursSaved = automations.reduce((s, a) => s + a.hoursSavedPerWeek, 0)
  const totalDigitalFTE = parseFloat((totalHoursSaved / standardHours).toFixed(2))

  res.json({
    automations: result,
    summary: { totalHoursSaved, totalDigitalFTE, count: automations.length }
  })
}

export const createAutomation = async (req: AuthRequest, res: Response) => {
  const orgId = Number(req.orgId)   // ✅ cast once at top

  const { name, description, departmentId, hoursSavedPerWeek, employeesAffected, status } = req.body
  if (!name || !departmentId || !hoursSavedPerWeek || !employeesAffected)
    return res.status(400).json({ error: 'All fields required' })

  const automation = await prisma.automation.create({
    data: {
      name,
      description,
      departmentId,
      hoursSavedPerWeek,
      employeesAffected,
      status: status || 'ACTIVE',
      organizationId: orgId         // ✅ Number cast
    },
    include: { department: true },
  })
  res.status(201).json(automation)
}

export const updateAutomation = async (req: AuthRequest, res: Response) => {
  const orgId = Number(req.orgId)   // ✅ cast once at top
  const id = parseInt(req.params.id)

  const { name, description, departmentId, hoursSavedPerWeek, employeesAffected, status } = req.body

  const automation = await prisma.automation.update({
    where: { id, organizationId: orgId },   // ✅ both numbers now
    data: { name, description, departmentId, hoursSavedPerWeek, employeesAffected, status },
    include: { department: true },
  })
  res.json(automation)
}

export const deleteAutomation = async (req: AuthRequest, res: Response) => {
  const orgId = Number(req.orgId)   // ✅ cast once at top
  const id = parseInt(req.params.id)

  await prisma.automation.delete({
    where: { id, organizationId: orgId }    // ✅ both numbers now
  })
  res.json({ message: 'Automation deleted' })
}