const express = require('express');
const multer = require('multer');
const { createPrintRequest } = require('../controllers/printRequestController');

const router = express.Router();

const artworkUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 12,
        parts: 14
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            const error = new Error(
                'Artwork must be JPG, PNG, WebP, or PDF.'
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
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'Artwork must not exceed 5 MB.'
                : 'The upload could not be processed. Check the file and form fields.';

            return res.status(400).json({
                success: false,
                message
            });
        }

        return res.status(error.status || 400).json({
            success: false,
            message: error.message || 'Invalid artwork upload.'
        });
    });
}

router.post('/', handleArtworkUpload, createPrintRequest);

module.exports = router;
