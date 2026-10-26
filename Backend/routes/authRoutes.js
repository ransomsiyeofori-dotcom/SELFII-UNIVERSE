const express = require('express');
const rateLimit = require('express-rate-limit');

const {
    register,
    login,
    logout,
    me,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress
} = require('../controllers/authController');

const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many attempts. Please try again in 15 minutes.'
    }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

router.patch('/profile', requireAuth, updateProfile);

router.get('/addresses', requireAuth, getAddresses);
router.post('/addresses', requireAuth, addAddress);
router.patch('/addresses/:addressId', requireAuth, updateAddress);
router.delete('/addresses/:addressId', requireAuth, deleteAddress);

module.exports = router;
