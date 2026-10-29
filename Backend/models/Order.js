const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    image: {
        type: String,
        default: '',
        maxlength: 2048
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isInteger,
            message: 'Quantity must be a whole number.'
        }
    },
    lineTotal: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
    recipientName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 25 },
    addressLine: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    country: { type: String, required: true, trim: true, maxlength: 100 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        immutable: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    customerEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 254
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 25
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: items => Array.isArray(items) && items.length > 0 && items.length <= 100,
            message: 'An order must contain between 1 and 100 distinct items.'
        }
    },
    shippingAddress: {
        type: shippingAddressSchema,
        required: true
    },
    currency: {
        type: String,
        enum: ['NGN'],
        default: 'NGN',
        required: true
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['korapay', 'bank_transfer'],
        default: 'korapay',
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
        index: true
    },
    reservationExpiresAt: {
        type: Date,
        default: null,
        index: true
    },
    stockReservationStatus: {
        type: String,
        enum: ["reserved", "released", "consumed"],
        default: "released",
        index: true
    },
    paymentReference: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        immutable: true
    },
    paymentVerifiedAt: {
        type: Date,
        default: null
    },
    orderStatus: {
        type: String,
        enum: [
            'pending_payment',
            'processing',
            'printing',
            'shipped',
            'delivered',
            'cancelled'
        ],
        default: 'pending_payment',
        index: true
    },
    paidAmount: {
        type: Number,
        default: null,
        min: 0
    },
    paymentProviderTransactionId: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200
    },
    trackingNumber: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100
    },
    adminNotes: {
        type: String,
        default: '',
        maxlength: 2000
    }
}, {
    timestamps: true
});

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
