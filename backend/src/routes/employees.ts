import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import {
  getEmployees,
  createEmployee,
  deleteEmployee,
  updateEmployee
} from '../controllers/employees'

const router = Router()

router.use(authenticate)

router.get('/', getEmployees)
router.post('/', createEmployee)
router.put('/:id', updateEmployee)

// Only admins/owners can delete
router.delete('/:id', requireRole('admin', 'owner'), deleteEmployee)

export default router