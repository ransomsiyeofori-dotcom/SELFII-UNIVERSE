const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Resend } = require('resend');
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


// ==========================================
// PASSWORD RECOVERY
// ==========================================

exports.forgotPassword = async (req, res, next) => {
    let user;

    try {
        const { email } = req.body;

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please enter your email address.'
            });
        }

        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        const frontendUrl = process.env.FRONTEND_URL;

        if (!apiKey || !fromEmail || !frontendUrl) {
            console.error('Password recovery email configuration is incomplete.');

            return res.status(503).json({
                success: false,
                message: 'Password recovery is temporarily unavailable. Please try again later.'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        user = await User.findOne({ email: cleanEmail });

        const genericMessage =
            'If an account exists for that email, a password reset link has been sent.';

        if (!user || !user.isActive) {
            return res.status(200).json({
                success: true,
                message: genericMessage
            });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');

        const tokenHash = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        user.passwordResetTokenHash = tokenHash;
        user.passwordResetExpiresAt = new Date(
            Date.now() + 30 * 60 * 1000
        );

        await user.save();

        const resetUrl = new URL(
            '/pages/reset-password.html',
            frontendUrl
        );

        resetUrl.searchParams.set('token', rawToken);

        const safeName = String(user.fullName || 'Customer')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const resend = new Resend(apiKey);

        const { error } = await resend.emails.send({
            from: fromEmail,
            to: [user.email],
            subject: 'Reset your SELFII UNIVERSE password',
            html: `
                <div style="background:#F7F4EC;padding:40px 15px;font-family:Arial,sans-serif;">
                    <div style="max-width:540px;margin:auto;background:#FFFEFA;padding:36px;border-radius:16px;">
                        <h1 style="color:#24211E;text-align:center;">SELFII UNIVERSE</h1>
                        <div style="height:3px;background:#B9684D;width:55px;margin:20px auto;"></div>
                        <h2 style="color:#24211E;">Password reset request</h2>
                        <p style="color:#68645F;">Hello ${safeName},</p>
                        <p style="color:#68645F;line-height:1.7;">
                            We received a request to reset your SELFII UNIVERSE account password.
                            Click the button below to choose a new password.
                        </p>
                        <div style="text-align:center;margin:30px 0;">
                            <a href="${resetUrl.toString()}"
                               style="display:inline-block;background:#B9684D;color:white;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:bold;">
                                Reset My Password
                            </a>
                        </div>
                        <p style="color:#68645F;font-size:14px;">
                            This link expires in 30 minutes and can only be used once.
                        </p>
                        <p style="color:#68645F;font-size:14px;">
                            If you did not request this, you can safely ignore this email.
                        </p>
                        <hr style="border:0;border-top:1px solid #E8E1D7;margin:25px 0;">
                        <p style="color:#77716A;text-align:center;font-size:12px;">
                            SELFII UNIVERSE · Wear Your Story
                        </p>
                    </div>
                </div>
            `,
            text: `Hello ${user.fullName || 'Customer'},

We received a request to reset your SELFII UNIVERSE password.

Open this link to choose a new password:
${resetUrl.toString()}

This link expires in 30 minutes and can only be used once.

If you did not request this, ignore this email.

SELFII UNIVERSE · Wear Your Story`
        });

        if (error) {
            throw new Error(error.message || 'Email delivery failed.');
        }

        return res.status(200).json({
            success: true,
            message: genericMessage
        });

    } catch (error) {
        if (user) {
            try {
                user.passwordResetTokenHash = undefined;
                user.passwordResetExpiresAt = undefined;
                await user.save();
            } catch (cleanupError) {
                console.error('Could not clear failed password-reset token.');
            }
        }

        console.error('Password recovery email could not be sent:', error.message);

        return res.status(503).json({
            success: false,
            message: 'We could not send your password-reset email right now. Please try again later.'
        });
    }
};


exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if (
            typeof token !== 'string' ||
            !/^[a-f0-9]{64}$/i.test(token) ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password-reset request.'
            });
        }

        if (
            password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                success: false,
                message: 'Your password must be at least 8 characters and no more than 72 bytes.'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: { $gt: new Date() },
            isActive: true
        }).select('+passwordResetTokenHash +passwordResetExpiresAt');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'This password-reset link is invalid or has expired. Please request another link.'
            });
        }

        user.password = await bcrypt.hash(password, SALT_ROUNDS);
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpiresAt = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Your password has been reset successfully. You can now log in with your new password.'
        });

    } catch (error) {
        next(error);
    }
};
