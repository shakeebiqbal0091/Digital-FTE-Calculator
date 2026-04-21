import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// GET config (standard hours)
export const getConfig = async (req: Request, res: Response) => {
  let config = await prisma.config.findUnique({ where: { id: 1 } })

  // Auto-create default config if not exists
  if (!config) {
    config = await prisma.config.create({
      data: { id: 1, standardHours: 40 },
    })
  }
  res.json(config)
}

// PUT update standard hours
export const updateConfig = async (req: Request, res: Response) => {
  const { standardHours } = req.body
  if (!standardHours) return res.status(400).json({ error: 'standardHours is required' })

  const config = await prisma.config.upsert({
    where: { id: 1 },
    update: { standardHours },
    create: { id: 1, standardHours },
  })
  res.json(config)
}