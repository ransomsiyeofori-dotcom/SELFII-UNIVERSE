const { v2: cloudinary } = require('cloudinary');

exports.uploadProductImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please select a product image to upload.'
            });
        }

        if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            return res.status(503).json({
                success: false,
                message: 'Product image uploads are not configured.'
            });
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const dataUri =
            'data:' + req.file.mimetype + ';base64,' +
            req.file.buffer.toString('base64');

        const uploaded = await cloudinary.uploader.upload(dataUri, {
            folder: 'selfii-universe/products',
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [
                {
                    width: 1200,
                    height: 1200,
                    crop: 'limit',
                    quality: 'auto',
                    fetch_format: 'auto'
                }
            ]
        });

        return res.status(201).json({
            success: true,
            message: 'Product image uploaded successfully.',
            image: uploaded.secure_url,
            publicId: uploaded.public_id
        });
    } catch (error) {
        next(error);
    }
};
