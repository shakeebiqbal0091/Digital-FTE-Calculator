import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

const ensureOrganizationExists = async (organizationId: number) => {
  const existingOrg = await prisma.organization.findUnique({
    where: { id: organizationId }
  })
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
  const orgId = Number(req.orgId)           // ✅ cast once at top
  if (!orgId) return res.status(400).json({ error: 'Organization is required' })

  await ensureOrganizationExists(orgId)

  let config = await prisma.config.findUnique({
    where: { organizationId: orgId }
  })

  if (!config) {
    config = await prisma.config.create({
      data: { standardHours: 40, organizationId: orgId }
    })
  }

  res.json(config)
}

export const updateConfig = async (req: AuthRequest, res: Response) => {
  const orgId = Number(req.orgId)           // ✅ cast once at top
  if (!orgId) return res.status(400).json({ error: 'Organization is required' })

  const { standardHours } = req.body
  if (!standardHours) return res.status(400).json({ error: 'standardHours is required' })

  await ensureOrganizationExists(orgId)

  const config = await prisma.config.upsert({
    where: { organizationId: orgId },
    update: { standardHours },
    create: { standardHours, organizationId: orgId }
  })

  res.json(config)
}