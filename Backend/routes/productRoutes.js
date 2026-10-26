const express = require('express');
const multer = require('multer');
const { uploadProductImage } = require('../controllers/productImageController');
const router = express.Router();

const {
    getProducts,
    getProductBySlug,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

const {
    requireAuth,
    requireAdmin
} = require('../middleware/authMiddleware');

const productImageUpload = multer({
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

// Public storefront routes
router.get('/', getProducts);
router.get('/:slug', getProductBySlug);

// Administrator-only product image upload
router.post(
    '/upload-image',
    requireAuth,
    requireAdmin,
    productImageUpload.single('image'),
    uploadProductImage
);

// Administrator-only product management
router.post('/', requireAuth, requireAdmin, createProduct);
router.patch('/:id', requireAuth, requireAdmin, updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);

module.exports = router;
