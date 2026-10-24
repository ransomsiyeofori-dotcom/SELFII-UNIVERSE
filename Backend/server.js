require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is missing from Backend/.env');
}

if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL is missing from Backend/.env');
}

if (isProduction) {
    app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(helmet());

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:8158",
    "http://127.0.0.1:8158"
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true

}));

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.use(session({
    name: 'selfii.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 60 * 60 * 24 * 7
    }),
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SELFII-UNIVERSE API is running',
        database: 'connected'
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Request error:', err.message);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.status && err.status < 500
            ? err.message
            : 'An unexpected server error occurred.'
    });
});

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`SELFII-UNIVERSE API listening on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();
