// backend/src/routes/auth.ts
import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validate } from '../middleware/validate'
import prisma from '../lib/prisma'
import { Role } from '@prisma/client'   // ✅ import Prisma's Role enum

const router = Router()

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100)
})

const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Min 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Need one uppercase')
    .regex(/[0-9]/, 'Need one number'),
  name: z.string().min(1).max(100)
})

router.post('/login', validate(LoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign(
      {
        userId: user.id,
        orgId: user.organizationId,   // ✅ your model uses organizationId, not tenantId
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        orgId: user.organizationId,   // ✅ same here, removed tenantId
        role: user.role,
      },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    )

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({ token })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/register', validate(RegisterSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return res.status(409).json({ error: 'Registration failed' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: Role.viewer   // ✅ use Prisma enum, not plain string 'viewer'
      }
    })

    res.status(201).json({ id: user.id })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router