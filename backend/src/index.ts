import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import employeeRoutes from './routes/employees'
import departmentRoutes from './routes/departments'
import configRoutes from './routes/config'
import authRoutes from './routes/auth'
import automationRoutes from './routes/automations'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// ── 1. Security headers (must be first) ──────────────────────────────────────
app.use(helmet())

// ── 2. CORS — whitelist only your frontend URL ────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true,           // needed for HttpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// ── 3. Body size limit — prevent DoS via huge payloads ───────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// ── 4. Rate limiters ─────────────────────────────────────────────────────────

// Strict limiter for auth endpoints (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 attempts per IP
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 100,                    // 100 requests per IP
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ── 5. Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes)      // strict limit on auth
app.use('/api/employees', apiLimiter, employeeRoutes)
app.use('/api/departments', apiLimiter, departmentRoutes)
app.use('/api/config', apiLimiter, configRoutes)
app.use('/api/automations', apiLimiter, automationRoutes)

// Health check — no auth needed, no rate limit needed
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// ── 6. Global error handler — never leak stack traces to client ───────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message)             // log internally
  res.status(500).json({ error: 'Internal server error' })  // safe response
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})