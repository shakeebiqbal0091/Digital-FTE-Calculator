import { Router } from 'express'
import { getEmployees, createEmployee, deleteEmployee, updateEmployee } from '../controllers/employees'

const router = Router()
router.get('/', getEmployees)
router.post('/', createEmployee)
router.put('/:id', updateEmployee)
router.delete('/:id', deleteEmployee)
export default router