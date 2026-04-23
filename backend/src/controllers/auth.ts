import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fte_secret_key'

// Register — creates org + admin user
export const register = async (req: Request, res: Response) => {
  const { email, password, name, orgName } = req.body
  if (!email || !password || !name || !orgName)
    return res.status(400).json({ error: 'All fields required including organization name' })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing)
    return res.status(400).json({ error: 'Email already registered' })

  // Create slug from org name
  const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()

  // Create org + admin user + default config in one transaction
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: orgName, slug }
    })

    await tx.config.create({
      data: { standardHours: 40, organizationId: org.id }
    })

    const hashed = await bcrypt.hash(password, 10)
    const user = await tx.user.create({
      data: { email, password: hashed, name, role: 'ADMIN', organizationId: org.id }
    })

    return { org, user }
  })

  const token = jwt.sign(
    { userId: result.user.id, email: result.user.email, orgId: result.org.id },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.status(201).json({
    token,
    user: { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role },
    organization: { id: result.org.id, name: result.org.name, slug: result.org.slug }
  })
}

// Login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' })

  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true }
  })
  if (!user)
    return res.status(401).json({ error: 'Invalid credentials' })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid)
    return res.status(401).json({ error: 'Invalid credentials' })

  const token = jwt.sign(
    { userId: user.id, email: user.email, orgId: user.organizationId },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    organization: user.organization
  })
}

// Get current user
export const getMe = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No token' })

  try {
    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; orgId: number }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { organization: true }
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      id: user.id, email: user.email, name: user.name, role: user.role,
      organization: user.organization
    })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}