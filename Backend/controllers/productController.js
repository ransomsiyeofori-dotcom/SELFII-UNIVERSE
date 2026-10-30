const Product = require('../models/Product');

const ALLOWED_CATEGORIES = [
    'boutique',
    'selfiitees',
    'printing'
];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSlug(value) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function validateProduct(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.name !== undefined) {
        if (
            typeof data.name !== 'string' ||
            data.name.trim().length < 2 ||
            data.name.trim().length > 150
        ) {
            errors.push('Product name must be between 2 and 150 characters.');
        }
    }

    if (!isUpdate || data.description !== undefined) {
        if (
            typeof data.description !== 'string' ||
            !data.description.trim() ||
            data.description.trim().length > 3000
        ) {
            errors.push('A description of up to 3000 characters is required.');
        }
    }

    if (!isUpdate || data.price !== undefined) {
        const price = Number(data.price);

        if (
            data.price === '' ||
            data.price === null ||
            data.price === undefined ||
            !Number.isFinite(price) ||
            price < 0 ||
            price > 1000000000
        ) {
            errors.push('Enter a valid non-negative product price.');
        }
    }

    if (!isUpdate || data.image !== undefined) {
        if (
            typeof data.image !== 'string' ||
            !/^https:\/\//i.test(data.image.trim()) ||
            data.image.trim().length > 2048
        ) {
            errors.push('A valid HTTPS product image URL is required.');
        }
    }

    if (!isUpdate || data.category !== undefined) {
        if (!ALLOWED_CATEGORIES.includes(data.category)) {
            errors.push('Select a valid product category.');
        }
    }

    if (data.stock !== undefined) {
        const stock = Number(data.stock);

        if (
            data.stock === '' ||
            data.stock === null ||
            !Number.isInteger(stock) ||
            stock < 0 ||
            stock > 1000000000
        ) {
            errors.push('Stock must be a non-negative whole number.');
        }
    }

    if (data.images !== undefined) {
        if (
            !Array.isArray(data.images) ||
            data.images.length > 10 ||
            data.images.some(image =>
                typeof image !== 'string' ||
                !/^https:\/\//i.test(image.trim()) ||
                image.trim().length > 2048
            )
        ) {
            errors.push('Provide up to 10 valid HTTPS image URLs.');
        }
    }

    for (const field of ['active', 'featured']) {
        if (
            data[field] !== undefined &&
            typeof data[field] !== 'boolean'
        ) {
            errors.push(`${field} must be true or false.`);
        }
    }

    return errors;
}

// GET /api/products
exports.getProducts = async (req, res, next) => {
    try {
        const {
            search = '',
            category = '',
            featured = '',
            page = '1',
            limit = '12'
        } = req.query;

        const pageNumber = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(
            50,
            Math.max(1, parseInt(limit, 10) || 12)
        );

        const filter = { active: true };

        if (category) {
            if (!ALLOWED_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid product category.'
                });
            }

            filter.category = category;
        }

        if (featured === 'true') {
            filter.featured = true;
        } else if (featured !== '' && featured !== 'false') {
            return res.status(400).json({
                success: false,
                message: 'Invalid featured filter.'
            });
        }

        if (typeof search === 'string' && search.trim()) {
            const safeSearch = escapeRegex(search.trim().slice(0, 100));

            filter.$or = [
                { name: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } }
            ];
        }

        const [products, total] = await Promise.all([
            Product.find(filter)
                .select('name slug description price image images category stock featured')
                .sort({ featured: -1, createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Product.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            products,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                pages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/products/:slug
exports.getProductBySlug = async (req, res, next) => {
    try {
        const product = await Product.findOne({
            slug: String(req.params.slug || '').trim(),
            active: true
        })
            .select('name slug description price image images category stock featured')
            .lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }

        return res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/products — administrator only
exports.createProduct = async (req, res, next) => {
    try {
        const errors = validateProduct(req.body);

        if (errors.length) {
            return res.status(400).json({
                success: false,
                message: errors[0],
                errors
            });
        }

        const name = req.body.name.trim();
        const slug = createSlug(name);

        if (!slug) {
            return res.status(400).json({
                success: false,
                message: 'Product name cannot generate a valid URL slug.'
            });
        }

        const product = await Product.create({
            name,
            slug,
            description: req.body.description.trim(),
            price: Number(req.body.price),
            image: req.body.image.trim(),
            images: req.body.images || [],
            category: req.body.category,
            stock: req.body.stock === undefined ? 0 : Number(req.body.stock),
            active: req.body.active === undefined ? true : req.body.active,
            featured: req.body.featured === undefined ? false : req.body.featured
        });

        return res.status(201).json({
            success: true,
            message: 'Product created successfully.',
            product
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A product with this URL slug already exists.'
            });
        }

        next(error);
    }
};

// PATCH /api/products/:id — administrator only
exports.updateProduct = async (req, res, next) => {
    try {
        const allowedFields = [
            'name',
            'description',
            'price',
            'image',
            'images',
            'category',
            'stock',
            'active',
            'featured'
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({
                success: false,
                message: 'Provide at least one product field to update.'
            });
        }

        const errors = validateProduct(updates, true);

        if (errors.length) {
            return res.status(400).json({
                success: false,
                message: errors[0],
                errors
            });
        }

        if (updates.name !== undefined) {
            updates.name = updates.name.trim();

            const newSlug = createSlug(updates.name);

            if (!newSlug) {
                return res.status(400).json({
                    success: false,
                    message: 'Product name cannot generate a valid URL slug.'
                });
            }

            updates.slug = newSlug;
        }

        if (updates.description !== undefined) {
            updates.description = updates.description.trim();
        }

        if (updates.image !== undefined) {
            updates.image = updates.image.trim();
        }

        if (updates.price !== undefined) {
            updates.price = Number(updates.price);
        }

        if (updates.stock !== undefined) {
            updates.stock = Number(updates.stock);
        }

        if (updates.images !== undefined) {
            updates.images = updates.images.map(image => image.trim());
        }

        const filter = { _id: req.params.id };

        if (updates.stock !== undefined) {
            filter.$expr = {
                $lte: [
                    { $ifNull: ["$reservedStock", 0] },
                    updates.stock
                ]
            };
        }

        const product = await Product.findOneAndUpdate(
            filter,
            { $set: updates },
            {
                new: true,
                runValidators: true,
                context: "query"
            }
        );

        if (!product) {
            const exists = await Product.exists({ _id: req.params.id });

            if (exists && updates.stock !== undefined) {
                return res.status(409).json({
                    success: false,
                    message: "Stock cannot be lower than the quantity reserved for pending orders."
                });
            }

            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully.',
            product
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A product with this URL slug already exists.'
            });
        }

        next(error);
    }
};

// DELETE /api/products/:id — administrator only
// Soft-delete preserves historical references to the product.
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: { active: false } },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Product removed from the storefront.'
        });
    } catch (error) {
        next(error);
    }
};
