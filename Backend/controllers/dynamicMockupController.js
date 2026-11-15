
const { v2: cloudinary } = require('cloudinary');

const MOCKUP_TEMPLATES = {
    'T-shirt': {
        mockup: '3c3d0ef3-7cd1-430b-a825-211619280366',
        smartObject: 'cf091057-b30a-433d-8bc9-e8ea10e78b71'
    },
    'Hoodie': {
        mockup: 'a9fa6e8d-1f45-4c68-8a0a-779a6ea23df0',
        smartObject: '9707ddb8-fd1d-4ef0-b7cd-9c90f427fb76'
    },
    'Cap': {
        mockup: 'fa7036e6-a79a-4964-ab1e-22d5e51311ef',
        smartObject: '93431c28-5b5e-45ee-b7e3-e0be8d013237'
    },
    'Mug': {
        mockup: '4b6d0ea6-ea7e-4535-bda5-89158293a9a4',
        smartObject: '5e55a32c-1fe9-4c06-bb82-530697d7dae5'
    },
    'Tote bag': {
        mockup: '575bb85c-f332-4f77-b7c5-7935ac0e65f0',
        smartObject: 'ad0b7c87-54de-44c2-9b5e-4fbb5c91bd31'
    }
};

const ALLOWED_IMAGE_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};

function hasValidImageSignature(buffer, mimetype) {
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

    return false;
}

exports.createDynamicMockup = async (req, res) => {
    let uploadedArtwork = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a JPG, PNG, or WebP image.'
            });
        }

        const product = req.body?.product;
        const template = MOCKUP_TEMPLATES[product];

        if (!template) {
            return res.status(400).json({
                success: false,
                message: 'A supported mockup product must be selected.'
            });
        }

        const extension = ALLOWED_IMAGE_TYPES[req.file.mimetype];
        const originalName = req.file.originalname || '';
        const actualExtension = originalName.includes('.')
            ? originalName.split('.').pop().toLowerCase()
            : '';

        if (
            !extension ||
            (actualExtension !== extension &&
                !(extension === 'jpg' && actualExtension === 'jpeg')) ||
            req.file.size === 0 ||
            req.file.size > 5 * 1024 * 1024 ||
            !hasValidImageSignature(req.file.buffer, req.file.mimetype)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a valid JPG, PNG, or WebP image no larger than 5 MB.'
            });
        }

        if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET ||
            !process.env.DYNAMIC_MOCKUPS_API_KEY
        ) {
            return res.status(503).json({
                success: false,
                message: 'The mockup preview service is not configured.'
            });
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const dataUri = 'data:' + req.file.mimetype + ';base64,' +
            req.file.buffer.toString('base64');

        uploadedArtwork = await cloudinary.uploader.upload(dataUri, {
            folder: 'selfii-universe/mockup-previews',
            resource_type: 'image'
        });

        const mockupResponse = await fetch(
            'https://app.dynamicmockups.com/api/v1/renders',
            {
                method: 'POST',
                headers: {
                    'x-api-key': process.env.DYNAMIC_MOCKUPS_API_KEY,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mockup_uuid: template.mockup,
                    export_options: {
                        mode: 'view',
                        image_format: 'jpg'
                    },
                    smart_objects: [
                        {
                            uuid: template.smartObject,
                            asset: {
                                url: uploadedArtwork.secure_url
                            }
                        }
                    ]
                }),
                signal: AbortSignal.timeout(60000)
            }
        );

        const result = await mockupResponse.json();

        if (!mockupResponse.ok || !result.success || !result.data?.export_path) {
            console.error('Dynamic Mockups render failed:', result);

            return res.status(502).json({
                success: false,
                message: 'We could not generate your realistic preview. Please try again.'
            });
        }

        return res.status(200).json({
            success: true,
            previewUrl: result.data.export_path
        });

    } catch (error) {
        console.error('Dynamic Mockups preview error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'The preview could not be generated. Please try again.'
        });

    } finally {
        if (uploadedArtwork?.public_id) {
            try {
                await cloudinary.uploader.destroy(
                    uploadedArtwork.public_id,
                    { resource_type: 'image' }
                );
            } catch (cleanupError) {
                console.error(
                    'Temporary artwork cleanup failed:',
                    cleanupError.message
                );
            }
        }
    }
};
