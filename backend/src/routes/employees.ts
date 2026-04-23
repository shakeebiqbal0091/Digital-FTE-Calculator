import { Router } from 'express'
import { getEmployees, createEmployee, deleteEmployee, updateEmployee } from '../controllers/employees'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)
router.get('/', getEmployees)
router.post('/', createEmployee)
router.put('/:id', updateEmployee)
router.delete('/:id', deleteEmployee)
export default router