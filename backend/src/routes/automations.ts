import { Router } from 'express'
import { getAutomations, createAutomation, updateAutomation, deleteAutomation } from '../controllers/automations'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)
router.get('/', getAutomations)
router.post('/', createAutomation)
router.put('/:id', updateAutomation)
router.delete('/:id', deleteAutomation)
export default router