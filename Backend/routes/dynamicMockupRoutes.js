
const express = require('express');
const multer = require('multer');
const {
    createDynamicMockup
} = require('../controllers/dynamicMockupController');

const router = express.Router();

const artworkUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 1,
        parts: 2
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            const error = new Error(
                'Please upload a JPG, PNG, or WebP image.'
            );
            error.status = 400;
            return callback(error);
        }

        callback(null, true);
    }
});

function handleArtworkUpload(req, res, next) {
    artworkUpload.single('artwork')(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: error.code === 'LIMIT_FILE_SIZE'
                    ? 'Artwork must not exceed 5 MB.'
                    : 'The artwork upload could not be processed.'
            });
        }

        return res.status(error.status || 400).json({
            success: false,
            message: error.message || 'Invalid artwork upload.'
        });
    });
}

router.post('/render', handleArtworkUpload, createDynamicMockup);

module.exports = router;
