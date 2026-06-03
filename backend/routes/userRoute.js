// routes/userRoute.js
const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/userCtrl');
const authMiddleware = require('../middleware/auth');

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authMiddleware, getMe);

module.exports = router;