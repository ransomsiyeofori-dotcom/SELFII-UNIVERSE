const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const PrintRequest = require('../models/PrintRequest');

const PRICES = {
    'T-shirt': { 'customer-item': 3000, 'selfii-item': 6000 },
    'Hoodie': { 'customer-item': 5000, 'selfii-item': 12000 },
    'Polo shirt': { 'customer-item': 3500, 'selfii-item': 7000 },
    'Mug': { 'customer-item': 2500, 'selfii-item': 4500 },
    'Tote bag': { 'customer-item': 2000, 'selfii-item': 4000 },
    'Cap': { 'customer-item': 2000, 'selfii-item': 4000 },
    'Jersey': { 'customer-item': 3500, 'selfii-item': 7500 },
    'Other item': { 'customer-item': null, 'selfii-item': null }
};

const ALLOWED_ITEMS = Object.keys(PRICES);
const ALLOWED_OPTIONS = ['customer-item', 'selfii-item'];
const ALLOWED_ARTWORK_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
};

function cleanString(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

function isValidEmail(email) {
    return email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasValidFileSignature(buffer, mimetype) {
    if (!Buffer.isBuffer(buffer)) return false;

    if (mimetype === 'image/jpeg') {
        return buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff;
    }

    if (mimetype === 'image/png') {
        return buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(
                Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
            );
    }

    if (mimetype === 'image/webp') {
        return buffer.length >= 12 &&
            buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WEBP';
    }

    if (mimetype === 'application/pdf') {
        return buffer.length >= 5 &&
            buffer.toString('ascii', 0, 5) === '%PDF-';
    }

    return false;
}

exports.createPrintRequest = async (req, res, next) => {
    let uploadedArtwork = null;

    try {
        const customerName = cleanString(req.body.customerName, 100);
        const customerEmail = cleanString(req.body.customerEmail, 254).toLowerCase();
        const customerPhone = cleanString(req.body.customerPhone, 25);
        const item = cleanString(req.body.item, 50);
        const supplyOption = cleanString(req.body.supplyOption, 30);
        const placement = cleanString(req.body.placement, 100);
        const purpose = cleanString(req.body.purpose, 100);
        const designDetails = cleanString(req.body.designDetails, 3000);
        const quantity = Number(req.body.quantity);
        const preferredDateValue = cleanString(req.body.preferredDate, 30);

        if (customerName.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Enter your full name.'
            });
        }

        if (!isValidEmail(customerEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Enter a valid email address.'
            });
        }

        if (!customerPhone || customerPhone.length < 7) {
            return res.status(400).json({
                success: false,
                message: 'Enter a valid phone number.'
            });
        }

        if (!ALLOWED_ITEMS.includes(item)) {
            return res.status(400).json({
                success: false,
                message: 'Select a valid printing item.'
            });
        }

        if (!ALLOWED_OPTIONS.includes(supplyOption)) {
            return res.status(400).json({
                success: false,
                message: 'Select who will supply the item.'
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a whole number between 1 and 10,000.'
            });
        }

        if (!placement || !purpose || designDetails.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Provide the printing placement, purpose, and design details.'
            });
        }

        let preferredDate = null;

        if (preferredDateValue) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDateValue)) {
                return res.status(400).json({
                    success: false,
                    message: 'Enter a valid preferred date.'
                });
            }

            const [year, month, day] = preferredDateValue.split('-').map(Number);
            const dateCheck = new Date(Date.UTC(year, month - 1, day));

            if (
                dateCheck.getUTCFullYear() !== year ||
                dateCheck.getUTCMonth() !== month - 1 ||
                dateCheck.getUTCDate() !== day
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Enter a valid preferred date.'
                });
            }

            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            if (dateCheck < today) {
                return res.status(400).json({
                    success: false,
                    message: 'Preferred date cannot be in the past.'
                });
            }

            preferredDate = dateCheck;
        }

        if (req.file) {
            const expectedExtension = ALLOWED_ARTWORK_TYPES[req.file.mimetype];
            const originalName = cleanString(req.file.originalname, 200);
            const actualExtension = originalName.includes('.')
                ? originalName.split('.').pop().toLowerCase()
                : '';

            if (
                !expectedExtension ||
                actualExtension !== expectedExtension &&
                !(expectedExtension === 'jpg' && actualExtension === 'jpeg') ||
                req.file.size > 5 * 1024 * 1024 ||
                !hasValidFileSignature(req.file.buffer, req.file.mimetype)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Artwork must be a valid JPG, PNG, WebP, or PDF file no larger than 5 MB.'
                });
            }
        }

        const price = PRICES[item][supplyOption];
        const estimatedUnitPrice = price === null ? null : price;
        const estimatedTotal = price === null ? null : price * quantity;

        const requestData = {
            customerName,
            customerEmail,
            customerPhone,
            item,
            supplyOption,
            quantity,
            placement,
            purpose,
            designDetails,
            preferredDate,
            estimatedUnitPrice,
            estimatedTotal
        };

        if (req.file) {
            if (
                !process.env.CLOUDINARY_CLOUD_NAME ||
                !process.env.CLOUDINARY_API_KEY ||
                !process.env.CLOUDINARY_API_SECRET
            ) {
                return res.status(503).json({
                    success: false,
                    message: 'Artwork uploads are temporarily unavailable. Please try again later.'
                });
            }

            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });

            const extension = ALLOWED_ARTWORK_TYPES[req.file.mimetype];
            const dataUri = 'data:' + req.file.mimetype + ';base64,' +
                req.file.buffer.toString('base64');

            uploadedArtwork = await cloudinary.uploader.upload(dataUri, {
                folder: 'selfii-universe/printing-artwork',
                resource_type: extension === 'pdf' ? 'raw' : 'image',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
                public_id: undefined
            });

            requestData.artwork = {
                url: uploadedArtwork.secure_url,
                publicId: uploadedArtwork.public_id,
                format: extension
            };
        }

        const printRequest = await PrintRequest.create(requestData);

        return res.status(201).json({
            success: true,
            message: 'Your printing request has been received. The team will review it and confirm your final quote.',
            request: {
                id: printRequest._id,
                item: printRequest.item,
                quantity: printRequest.quantity,
                estimatedUnitPrice: printRequest.estimatedUnitPrice,
                estimatedTotal: printRequest.estimatedTotal,
                status: printRequest.status,
                createdAt: printRequest.createdAt
            }
        });
    } catch (error) {
        if (uploadedArtwork && uploadedArtwork.public_id) {
            try {
                await cloudinary.uploader.destroy(
                    uploadedArtwork.public_id,
                    { resource_type: uploadedArtwork.resource_type || 'image' }
                );
            } catch (cleanupError) {
                console.error('Artwork cleanup failed:', cleanupError.message);
            }
        }

        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({
                success: false,
                message: 'Some request details are invalid. Please review the form.'
            });
        }

        next(error);
    }
};
