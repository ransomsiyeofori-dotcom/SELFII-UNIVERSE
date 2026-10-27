const mongoose = require('mongoose');

const printRequestSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },

    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254
    },

    customerPhone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 25
    },

    item: {
        type: String,
        required: true,
        enum: [
            'T-shirt',
            'Hoodie',
            'Polo shirt',
            'Mug',
            'Tote bag',
            'Cap',
            'Jersey',
            'Other item'
        ]
    },

    supplyOption: {
        type: String,
        required: true,
        enum: ['customer-item', 'selfii-item']
    },

    quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 10000,
        validate: {
            validator: Number.isInteger,
            message: 'Quantity must be a whole number.'
        }
    },

    placement: {
        type: String,
        required: true,
        maxlength: 100
    },

    purpose: {
        type: String,
        required: true,
        maxlength: 100
    },

    designDetails: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 3000
    },

    preferredDate: {
        type: Date,
        default: null
    },

    estimatedUnitPrice: {
        type: Number,
        min: 0,
        default: null
    },

    estimatedTotal: {
        type: Number,
        min: 0,
        default: null
    },

    artwork: {
        url: {
            type: String,
            default: ''
        },
        publicId: {
            type: String,
            default: ''
        },
        format: {
            type: String,
            default: ''
        }
    },

    status: {
        type: String,
        enum: [
            'pending',
            'reviewing',
            'quoted',
            'approved',
            'in-progress',
            'completed',
            'cancelled'
        ],
        default: 'pending'
    }
}, {
    timestamps: true
});

printRequestSchema.index({ createdAt: -1 });
printRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PrintRequest', printRequestSchema);
