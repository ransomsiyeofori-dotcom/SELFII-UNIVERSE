const bcrypt = require('bcrypt');
const User = require('../models/User');

const SALT_ROUNDS = 12;

function publicUser(user) {
    return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
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
