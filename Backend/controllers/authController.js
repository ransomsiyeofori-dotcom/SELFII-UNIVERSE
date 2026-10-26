const bcrypt = require('bcrypt');
const User = require('../models/User');
const { v2: cloudinary } = require('cloudinary');

const SALT_ROUNDS = 12;

function publicUser(user) {
    return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '',
        profilePhotoUrl: user.profilePhotoUrl || '',
        role: user.role
    };
}

exports.register = async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;

        if (
            typeof fullName !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Full name, email, and password are required.'
            });
        }

        const cleanName = fullName.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Full name must be between 2 and 100 characters.'
            });
        }

        if (
            cleanEmail.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Enter a valid email address.'
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                success: false,
                message: 'Password must be between 8 and 72 characters.'
            });
        }

        const existingUser = await User.findOne({ email: cleanEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await User.create({
            fullName: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            role: 'customer'
        });

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            user: publicUser(user)
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: cleanEmail
        }).select('+password');

        if (
            !user ||
            !user.isActive ||
            !(await bcrypt.compare(password, user.password))
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        req.session.regenerate((sessionError) => {
            if (sessionError) {
                return next(sessionError);
            }

            req.session.userId = user._id.toString();

            req.session.save((saveError) => {
                if (saveError) {
                    return next(saveError);
                }

                console.log("LOGIN COOKIE DEBUG:", {
                    sessionSaved: Boolean(req.session.userId),
                    secureCookie: req.session.cookie.secure,
                    sameSite: req.session.cookie.sameSite,
                    setCookieIssued: Boolean(res.getHeader('Set-Cookie'))
                });

                return res.status(200).json({
                    success: true,
                    message: 'Login successful.',
                    user: publicUser(user)
                });
            });
        });
    } catch (error) {
        next(error);
    }
};

exports.logout = (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie('selfii.sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
};

exports.me = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: publicUser(req.user)
    });
};

// Update the authenticated customer's profile.
exports.updateProfile = async (req, res, next) => {
    try {
        const { fullName, phone } = req.body;

        if (typeof fullName !== 'string' || typeof phone !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Full name and phone number are required.'
            });
        }

        const cleanName = fullName.trim();
        const cleanPhone = phone.trim();

        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Full name must be between 2 and 100 characters.'
            });
        }

        if (cleanPhone.length > 25) {
            return res.status(400).json({
                success: false,
                message: 'Phone number cannot exceed 25 characters.'
            });
        }

        req.user.fullName = cleanName;
        req.user.phone = cleanPhone;

        await req.user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            user: {
                id: req.user._id,
                fullName: req.user.fullName,
                email: req.user.email,
                phone: req.user.phone,
                profilePhotoUrl: req.user.profilePhotoUrl || '',
                role: req.user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// Return the authenticated customer's saved addresses.
exports.getAddresses = async (req, res, next) => {
    try {
        return res.status(200).json({
            success: true,
            addresses: req.user.addresses || []
        });
    } catch (error) {
        next(error);
    }
};

// Add a delivery address.
exports.addAddress = async (req, res, next) => {
    try {
        const {
            label,
            recipientName,
            phone,
            addressLine,
            city,
            state,
            country,
            isDefault
        } = req.body;

        const requiredFields = {
            recipientName,
            phone,
            addressLine,
            city,
            state,
            country
        };

        for (const [field, value] of Object.entries(requiredFields)) {
            if (typeof value !== 'string' || !value.trim()) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required.`
                });
            }
        }

        if (req.user.addresses.length >= 20) {
            return res.status(400).json({
                success: false,
                message: 'You can save up to 20 addresses.'
            });
        }

        if (isDefault) {
            req.user.addresses.forEach(address => {
                address.isDefault = false;
            });
        }

        const address = {
            label: typeof label === 'string' && label.trim()
                ? label.trim()
                : 'Home',
            recipientName: recipientName.trim(),
            phone: phone.trim(),
            addressLine: addressLine.trim(),
            city: city.trim(),
            state: state.trim(),
            country: country.trim(),
            isDefault: Boolean(isDefault) || req.user.addresses.length === 0
        };

        req.user.addresses.push(address);
        await req.user.save();

        return res.status(201).json({
            success: true,
            message: 'Delivery address added successfully.',
            addresses: req.user.addresses
        });
    } catch (error) {
        next(error);
    }
};

// Update a saved delivery address.
exports.updateAddress = async (req, res, next) => {
    try {
        const address = req.user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Delivery address not found.'
            });
        }

        const fields = [
            'label',
            'recipientName',
            'phone',
            'addressLine',
            'city',
            'state',
            'country'
        ];

        for (const field of fields) {
            if (req.body[field] !== undefined) {
                if (typeof req.body[field] !== 'string') {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid ${field}.`
                    });
                }

                address[field] = req.body[field].trim();
            }
        }

        for (const field of [
            'recipientName',
            'phone',
            'addressLine',
            'city',
            'state',
            'country'
        ]) {
            if (!address[field]) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required.`
                });
            }
        }

        if (req.body.isDefault === true) {
            req.user.addresses.forEach(item => {
                item.isDefault = item._id.equals(address._id);
            });
        }

        await req.user.save();

        return res.status(200).json({
            success: true,
            message: 'Delivery address updated successfully.',
            addresses: req.user.addresses
        });
    } catch (error) {
        next(error);
    }
};

// Delete a saved delivery address.
exports.deleteAddress = async (req, res, next) => {
    try {
        const address = req.user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Delivery address not found.'
            });
        }

        const wasDefault = address.isDefault;

        req.user.addresses.pull({ _id: address._id });

        if (wasDefault && req.user.addresses.length > 0) {
            req.user.addresses[0].isDefault = true;
        }

        await req.user.save();

        return res.status(200).json({
            success: true,
            message: 'Delivery address deleted successfully.',
            addresses: req.user.addresses
        });
    } catch (error) {
        next(error);
    }
};


// Upload a profile photo to Cloudinary.
exports.updateProfilePhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please select an image to upload.'
            });
        }

        if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            return res.status(503).json({
                success: false,
                message: 'Profile photo uploads are not configured yet.'
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
            folder: 'selfii-universe/profile-photos',
            resource_type: 'image',
            transformation: [
                {
                    width: 500,
                    height: 500,
                    crop: 'fill',
                    gravity: 'face'
                }
            ]
        });

        req.user.profilePhotoUrl = uploaded.secure_url;
        await req.user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile photo uploaded successfully.',
            user: publicUser(req.user)
        });
    } catch (error) {
        next(error);
    }
};
