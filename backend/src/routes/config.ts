import { Router } from 'express'
import { getConfig, updateConfig } from '../controllers/config'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)
router.get('/', getConfig)
router.put('/', updateConfig)
export default router