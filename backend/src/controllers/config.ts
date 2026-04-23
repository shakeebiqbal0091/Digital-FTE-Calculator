import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getConfig = async (req: AuthRequest, res: Response) => {
  let config = await prisma.config.findUnique({ where: { organizationId: req.orgId } })

  if (!config) {
    config = await prisma.config.create({
      data: { standardHours: 40, organizationId: req.orgId! }
    })
  }
  res.json(config)
}

export const updateConfig = async (req: AuthRequest, res: Response) => {
  const { standardHours } = req.body
  if (!standardHours) return res.status(400).json({ error: 'standardHours is required' })

  const config = await prisma.config.upsert({
    where: { organizationId: req.orgId },
    update: { standardHours },
    create: { standardHours, organizationId: req.orgId! }
  })
  res.json(config)
}