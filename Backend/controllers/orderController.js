const crypto = require('crypto');
const mongoose = require('mongoose');

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

function makeOrderNumber() {
    const date = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');

    return `SELFII-${date}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function makePaymentReference() {
    return `SELFII_PAY_${crypto.randomBytes(16).toString('hex')}`;
}

function cleanString(value, maxLength) {
    return typeof value === 'string'
        ? value.trim().slice(0, maxLength)
        : '';
}

// POST /api/orders
exports.createOrder = async (req, res, next) => {
    try {
        if (req.user.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Only customer accounts can place orders."
            });
        }
        const body = req.body || {};
        const submittedItems = body.items;
        const submittedAddress = body.shippingAddress || {};
        const paymentMethod = body.paymentMethod || 'korapay';

        if (!['korapay', 'bank_transfer'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid payment method.'
            });
        }

        if (
            !Array.isArray(submittedItems) ||
            submittedItems.length < 1 ||
            submittedItems.length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'Your cart must contain between 1 and 100 items.'
            });
        }

        const quantities = new Map();

        for (const item of submittedItems) {
            const productId = String(item?.productId || item?.id || '');

            if (!mongoose.isValidObjectId(productId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Your cart contains an invalid product.'
                });
            }

            if (
                !Number.isInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > 1000
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Each product quantity must be a whole number between 1 and 1000.'
                });
            }

            quantities.set(
                productId,
                (quantities.get(productId) || 0) + item.quantity
            );
        }

        const address = {
            recipientName: cleanString(submittedAddress.recipientName, 100),
            phone: cleanString(submittedAddress.phone, 25),
            addressLine: cleanString(submittedAddress.addressLine, 300),
            city: cleanString(submittedAddress.city, 100),
            state: cleanString(submittedAddress.state, 100),
            country: cleanString(submittedAddress.country, 100)
        };

        for (const [field, value] of Object.entries(address)) {
            if (!value) {
                return res.status(400).json({
                    success: false,
                    message: `Please provide your shipping ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`
                });
            }
        }

        const productIds = [...quantities.keys()];

        const products = await Product.find({
            _id: { $in: productIds },
            active: true
        })
            .select('name price image stock reservedStock active')
            .lean();

        if (products.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more products are unavailable. Please refresh your cart.'
            });
        }

        const productsById = new Map(
            products.map(product => [String(product._id), product])
        );

        const orderItems = [];
        let subtotal = 0;

        for (const [productId, quantity] of quantities.entries()) {
            const product = productsById.get(productId);

            if (!product || (product.stock - (product.reservedStock || 0)) < quantity) {
                return res.status(409).json({
                    success: false,
                    message: `Insufficient stock for ${product?.name || 'a product'}. Please update your cart.`
                });
            }

            const unitPrice = Math.round(Number(product.price) * 100) / 100;
            const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

            if (
                !Number.isFinite(unitPrice) ||
                !Number.isFinite(lineTotal) ||
                unitPrice < 0 ||
                lineTotal > 100000000000
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'A product has an invalid price.'
                });
            }

            subtotal = Math.round((subtotal + lineTotal) * 100) / 100;

            orderItems.push({
                product: product._id,
                name: product.name,
                image: product.image || '',
                unitPrice,
                quantity,
                lineTotal
            });
        }

        if (!Number.isFinite(subtotal) || subtotal <= 0) {
            return res.status(400).json({
                success: false,
                message: 'The order total must be greater than zero.'
            });
        }

        // Delivery charges must be calculated by the server.
        // This initial version uses zero until the store's delivery
        // pricing rules are connected.
        const deliveryFee = 0;
        const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100;

        const customerName = cleanString(req.user.fullName, 100);
        const customerEmail = cleanString(req.user.email, 254).toLowerCase();
        const customerPhone = address.phone || cleanString(req.user.phone, 25);

        if (!customerName || !customerEmail) {
            return res.status(400).json({
                success: false,
                message: 'Please complete your account details before checkout.'
            });
        }

        const order = await Order.create({
            orderNumber: makeOrderNumber(),
            customer: req.user._id,
            customerName,
            customerEmail,
            customerPhone,
            items: orderItems,
            shippingAddress: address,
            currency: 'NGN',
            subtotal,
            deliveryFee,
            totalAmount,
            paymentMethod,
            paymentReference: makePaymentReference(),
            paymentStatus: 'pending',
            orderStatus: 'pending_payment'
        });

        return res.status(201).json({
            success: true,
            message: 'Order created. Payment is still pending.',
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                items: order.items,
                subtotal: order.subtotal,
                deliveryFee: order.deliveryFee,
                totalAmount: order.totalAmount,
                currency: order.currency,
                paymentMethod: order.paymentMethod,
                paymentReference: order.paymentReference,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/orders/my-orders
exports.getMyOrders = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            50,
            Math.max(1, parseInt(req.query.limit, 10) || 10)
        );

        const filter = { customer: req.user._id };

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .select('-adminNotes')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/orders/:orderId
exports.getMyOrderById = async (req, res, next) => {
    try {
        const orderId = String(req.params.orderId || '');

        if (!mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID.'
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            customer: req.user._id
        })
            .select('-adminNotes')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        return res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        next(error);
    }
};


// GET /api/orders/admin
exports.getAdminOrders = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const search = cleanString(req.query.search, 100);
        const status = cleanString(req.query.status, 40);

        const filter = {};

        const allowedStatuses = [
            'pending_payment',
            'processing',
            'printing',
            'shipped',
            'delivered',
            'cancelled'
        ];

        if (status) {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order status filter.'
                });
            }
            filter.orderStatus = status;
        }

        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(escaped, 'i');
            filter.$or = [
                { orderNumber: pattern },
                { customerName: pattern },
                { customerEmail: pattern },
                { customerPhone: pattern },
                { paymentReference: pattern }
            ];
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .select('-adminNotes')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};


// GET /api/orders/admin/stats
exports.getAdminOrderStats = async (req, res, next) => {
    try {
        const [
            totalOrders,
            pendingOrders,
            paidOrders,
            revenueResult,
            totalCustomers
        ] = await Promise.all([
            Order.countDocuments({}),
            Order.countDocuments({
                paymentStatus: 'pending'
            }),
            Order.countDocuments({
                paymentStatus: 'paid'
            }),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: '$paidAmount' }
                    }
                }
            ]),
            User.countDocuments({ role: 'customer' })
        ]);

        return res.status(200).json({
            success: true,
            stats: {
                totalOrders,
                pendingOrders,
                paidOrders,
                totalRevenue: revenueResult[0]?.revenue || 0,
                totalCustomers
            }
        });
    } catch (error) {
        next(error);
    }
};


// PATCH /api/orders/admin/:orderId
exports.updateAdminOrder = async (req, res, next) => {
    try {
        const orderId = String(req.params.orderId || '');

        if (!mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID.'
            });
        }

        if (
            Object.prototype.hasOwnProperty.call(req.body || {}, 'paymentStatus') ||
            Object.prototype.hasOwnProperty.call(req.body || {}, 'paidAmount') ||
            Object.prototype.hasOwnProperty.call(req.body || {}, 'paymentVerifiedAt')
        ) {
            return res.status(400).json({
                success: false,
                message: 'Payment fields cannot be changed through order-status updates.'
            });
        }

        const allowedStatuses = [
            'pending_payment',
            'processing',
            'printing',
            'shipped',
            'delivered',
            'cancelled'
        ];

        const updates = {};
        const body = req.body || {};

        if (Object.prototype.hasOwnProperty.call(body, 'orderStatus')) {
            if (!allowedStatuses.includes(body.orderStatus)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order status.'
                });
            }

            updates.orderStatus = body.orderStatus;
        }

        if (Object.prototype.hasOwnProperty.call(body, 'trackingNumber')) {
            if (typeof body.trackingNumber !== 'string' || body.trackingNumber.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Tracking number must be a string of at most 100 characters.'
                });
            }

            updates.trackingNumber = body.trackingNumber.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) {
            if (typeof body.adminNotes !== 'string' || body.adminNotes.length > 2000) {
                return res.status(400).json({
                    success: false,
                    message: 'Admin notes must be a string of at most 2000 characters.'
                });
            }

            updates.adminNotes = body.adminNotes.trim();
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Provide an order status, tracking number, or admin note to update.'
            });
        }

        const order = await Order.findByIdAndUpdate(
            orderId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-adminNotes').lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Order updated successfully.',
            order
        });
    } catch (error) {
        next(error);
    }
};


// POST /api/orders/admin/:orderId/confirm-bank-transfer
exports.confirmBankTransfer = async (req, res, next) => {
    try {
        const orderId = String(req.params.orderId || '');
        const body = req.body || {};
        const transactionReference = cleanString(body.transactionReference, 150);
        const confirmationNote = cleanString(body.confirmationNote, 500);

        if (!mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID.'
            });
        }

        if (!transactionReference) {
            return res.status(400).json({
                success: false,
                message: 'Provide the bank transaction reference.'
            });
        }

        if (body.confirmationNote !== undefined &&
            (typeof body.confirmationNote !== 'string' || body.confirmationNote.length > 500)) {
            return res.status(400).json({
                success: false,
                message: 'The confirmation note must be at most 500 characters.'
            });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        if (order.paymentMethod !== 'bank_transfer') {
            return res.status(400).json({
                success: false,
                message: 'Only bank-transfer orders can be confirmed through this endpoint.'
            });
        }

        if (order.paymentStatus === 'paid') {
            return res.status(409).json({
                success: false,
                message: 'This order has already been marked as paid.'
            });
        }

        if (order.paymentStatus !== 'pending' || order.orderStatus === 'cancelled') {
            return res.status(409).json({
                success: false,
                message: 'This order is not eligible for bank-transfer confirmation.'
            });
        }

        // An administrator must verify the funds in the bank account before calling this endpoint.
        // The customer cannot supply or override the amount recorded as paid.
        order.paymentStatus = 'paid';
        order.paidAmount = order.totalAmount;
        order.paymentVerifiedAt = new Date();
        order.paymentProviderTransactionId = transactionReference;
        order.orderStatus = 'processing';

        const note = 'Bank transfer manually verified by admin ' +
            String(req.user._id) +
            '. Transaction reference: ' + transactionReference +
            (confirmationNote ? '. Note: ' + confirmationNote : '');

        order.adminNotes = [order.adminNotes, note].filter(Boolean).join('\n').slice(0, 2000);

        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Bank transfer recorded as verified.',
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                paidAmount: order.paidAmount,
                paymentVerifiedAt: order.paymentVerifiedAt,
                orderStatus: order.orderStatus,
                paymentProviderTransactionId: order.paymentProviderTransactionId
            }
        });
    } catch (error) {
        next(error);
    }
};
