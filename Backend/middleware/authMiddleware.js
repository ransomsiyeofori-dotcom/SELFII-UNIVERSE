const User = require('../models/User');

exports.requireAuth = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            console.log("AUTH DEBUG:", {
                hasSession: Boolean(req.session),
                hasUserId: Boolean(req.session?.userId),
                hasCookie: Boolean(req.headers.cookie?.includes("selfii.sid"))
            });
            return res.status(401).json({
                success: false,
                message: 'Please log in to continue.'
            });
        }

        const user = await User.findOne({
            _id: req.session.userId,
            isActive: true
        });

        if (!user) {
            return req.session.destroy(() => {
                res.status(401).json({
                    success: false,
                    message: 'Your session is invalid. Please log in again.'
                });
            });
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

exports.requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Administrator access is required.'
        });
    }

    next();
};
