const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            trim: true,
            maxlength: 40,
            default: 'Home'
        },
        recipientName: {
            type: String,
            trim: true,
            required: true,
            maxlength: 100
        },
        phone: {
            type: String,
            trim: true,
            required: true,
            maxlength: 25
        },
        addressLine: {
            type: String,
            trim: true,
            required: true,
            maxlength: 200
        },
        city: {
            type: String,
            trim: true,
            required: true,
            maxlength: 100
        },
        state: {
            type: String,
            trim: true,
            required: true,
            maxlength: 100
        },
        country: {
            type: String,
            trim: true,
            required: true,
            maxlength: 100
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        email: {
            type: String,
            required: [true, 'Email address is required'],
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 25,
            default: ''
        },

        profilePhotoUrl: {
            type: String,
            trim: true,
            default: ''
        },

        addresses: {
            type: [addressSchema],
            default: []
        },

        role: {
            type: String,
            enum: ['customer', 'admin'],
            default: 'customer'
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', userSchema);
