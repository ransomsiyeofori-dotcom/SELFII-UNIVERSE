exports.createOrder = async (req, res, next) => {
    let session;

    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customer accounts can place orders.'
            });
        }

        const body = req.body || {};
        const submittedItems = body.items;
        const submittedAddress = body.shippingAddress || {};

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

            const combinedQuantity =
                (quantities.get(productId) || 0) + item.quantity;

            if (combinedQuantity > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'The combined quantity for a product cannot exceed 1000.'
                });
            }

            quantities.set(productId, combinedQuantity);
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

        const customerName = cleanString(req.user.fullName, 100);
        const customerEmail = cleanString(req.user.email, 254).toLowerCase();
        const customerPhone = address.phone || cleanString(req.user.phone, 25);

        if (!customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'Please complete your account details before checkout.'
            });
        }

        const orderNumber = makeOrderNumber();
        const paymentReference = makePaymentReference();
        const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        session = await mongoose.startSession();

        let order;

        await session.withTransaction(async () => {
            const orderItems = [];
            let subtotal = 0;

            for (const [productId, quantity] of quantities.entries()) {
                const product = await Product.findOneAndUpdate(
                    {
                        _id: productId,
                        active: true,
                        $expr: {
                            $gte: [
                                {
                                    $subtract: [
                                        '$stock',
                                        { $ifNull: ['$reservedStock', 0] }
                                    ]
                                },
                                quantity
                            ]
                        }
                    },
                    {
                        $inc: { reservedStock: quantity }
                    },
                    {
                        new: true,
                        session,
                        runValidators: true
                    }
                );

                if (!product) {
                    const error = new Error(
                        'A product is unavailable or has insufficient stock. Please update your cart.'
                    );
                    error.status = 409;
                    throw error;
                }

                const unitPrice = Math.round(Number(product.price) * 100) / 100;
                const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

                if (
                    !Number.isFinite(unitPrice) ||
                    !Number.isFinite(lineTotal) ||
                    unitPrice < 0 ||
                    lineTotal > 100000000000
                ) {
                    const error = new Error('A product has an invalid price.');
                    error.status = 400;
                    throw error;
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
                const error = new Error('The order total must be greater than zero.');
                error.status = 400;
                throw error;
            }

            const deliveryFee = 0;
            const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100;

            const createdOrders = await Order.create([{
                orderNumber,
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
                paymentMethod: 'korapay',
                paymentReference,
                paymentStatus: 'pending',
                reservationExpiresAt,
                stockReservationStatus: 'reserved',
                orderStatus: 'pending_payment'
            }], { session });

            order = createdOrders[0];
        });

        return res.status(201).json({
            success: true,
            message: 'Order created. Stock is reserved for 15 minutes; payment is still pending.',
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
                reservationExpiresAt: order.reservationExpiresAt,
                stockReservationStatus: order.stockReservationStatus,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};
