const express = require('express');

const {
    createOrder,
    getMyOrders,
    getMyOrderById,
    getAdminOrders,
    getAdminOrderStats,
    updateAdminOrder,
    confirmBankTransfer
} = require('../controllers/orderController');

const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/admin/stats', requireAdmin, getAdminOrderStats);
router.get('/admin', requireAdmin, getAdminOrders);
router.patch('/admin/:orderId', requireAdmin, updateAdminOrder);
router.post('/admin/:orderId/confirm-bank-transfer', requireAdmin, confirmBankTransfer);
router.get('/:orderId', getMyOrderById);

module.exports = router;
