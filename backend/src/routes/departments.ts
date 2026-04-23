import { Router } from 'express'
import { getDepartments, createDepartment } from '../controllers/departments'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)
router.get('/', getDepartments)
router.post('/', createDepartment)
export default router