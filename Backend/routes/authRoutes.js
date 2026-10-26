const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const {
    register,
    login,
    logout,
    me,
    updateProfile,
    updateProfilePhoto,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress
} = require('../controllers/authController');

const { requireAuth } = require('../middleware/authMiddleware');

const profilePhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            const error = new Error(
                'Only JPG, PNG, and WebP images are allowed.'
            );
            error.status = 400;
            return callback(error);
        }

        callback(null, true);
    }
});

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
router.post('/profile-photo', requireAuth, profilePhotoUpload.single('profilePhoto'), updateProfilePhoto);

router.get('/addresses', requireAuth, getAddresses);
router.post('/addresses', requireAuth, addAddress);
router.patch('/addresses/:addressId', requireAuth, updateAddress);
router.delete('/addresses/:addressId', requireAuth, deleteAddress);

module.exports = router;
