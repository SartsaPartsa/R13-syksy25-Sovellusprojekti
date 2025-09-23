import { Router } from 'express'
import { auth } from '../helper/auth.js'
import { signup, signin, changePassword, deleteMe, profile } from '../controllers/userController.js'

// User auth and profile routes
// - signup /signin
// - change password, delete account, get profile
const router = Router()

// Register a new user
router.post('/signup', signup)

// Change own password
router.patch('/me/password', auth, changePassword)

// Sign in and issue JWT
router.post('/signin', signin)

// Delete own account
router.delete('/me', auth, deleteMe)

router.get('/profile', auth, profile)

export default router
