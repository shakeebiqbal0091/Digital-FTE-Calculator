import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthPayload {
  userId: string
  orgId: number        // ✅ only orgId — no tenantId in your schema
  role: string
}

export interface AuthRequest extends Request {
  user?: AuthPayload
  orgId?: number
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
      orgId?: number
    }
  }
}


export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' })
    }

    const token = authHeader.split(' ')[1]
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET not configured')

    const decoded = jwt.verify(token, secret) as AuthPayload
    req.user = decoded
    req.orgId = Number(decoded.orgId)   // ✅ ensure it's always a number
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}


export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

export const requireAuth = authenticate