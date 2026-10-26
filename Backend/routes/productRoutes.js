const express = require('express');
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

// Public storefront routes
router.get('/', getProducts);
router.get('/:slug', getProductBySlug);

// Administrator-only product management
router.post('/', requireAuth, requireAdmin, createProduct);
router.patch('/:id', requireAuth, requireAdmin, updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);

module.exports = router;
