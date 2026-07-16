/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { loginValidator } = require('../middleware/validator');
const { login, register, getProfile, changePassword } = require('../controllers/authController');

router.post('/login', loginValidator, login);
router.post('/register', register);
router.get('/profile', authMiddleware, getProfile);
router.put('/change-password', authMiddleware, changePassword);

module.exports = router;
