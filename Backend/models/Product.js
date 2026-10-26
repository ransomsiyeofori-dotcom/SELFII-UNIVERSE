const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },

    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    image: {
        type: String,
        required: true,
        trim: true
    },

    images: {
        type: [String],
        default: []
    },

    category: {
        type: String,
        required: true,
        enum: ['boutique', 'selfiitees', 'printing']
    },

    stock: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: 'Stock must be a whole number.'
        }
    },

    active: {
        type: Boolean,
        default: true
    },

    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

productSchema.index({
    name: 'text',
    description: 'text'
});

module.exports = mongoose.model('Product', productSchema);
