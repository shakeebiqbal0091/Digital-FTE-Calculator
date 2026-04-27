import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

const ensureOrganizationExists = async (organizationId: number) => {
  const existingOrg = await prisma.organization.findUnique({ where: { id: organizationId } })
  if (existingOrg) return

  await prisma.organization.create({
    data: {
      id: organizationId,
      name: `Organization ${organizationId}`,
      slug: `org-${organizationId}`,
    },
  })
}

export const getConfig = async (req: AuthRequest, res: Response) => {
  if (!req.orgId) return res.status(400).json({ error: 'organization is required' })

  await ensureOrganizationExists(req.orgId)
  let config = await prisma.config.findUnique({ where: { organizationId: req.orgId } })

  if (!config) {
    config = await prisma.config.create({
      data: { standardHours: 40, organizationId: req.orgId! }
    })
  }
  res.json(config)
}

export const updateConfig = async (req: AuthRequest, res: Response) => {
  if (!req.orgId) return res.status(400).json({ error: 'organization is required' })

  const { standardHours } = req.body
  if (!standardHours) return res.status(400).json({ error: 'standardHours is required' })

  await ensureOrganizationExists(req.orgId)
  const config = await prisma.config.upsert({
    where: { organizationId: req.orgId },
    update: { standardHours },
    create: { standardHours, organizationId: req.orgId! }
  })
  res.json(config)
}