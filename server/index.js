import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import requestId from 'express-request-id';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger/winston.config.js';
import { errorHandler, notFoundHandler } from './errors/errorHandler.js';
import aiRoutes from './routes/ai.js';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import meetingsRoutes from './routes/meetings.js';
import calendarRoutes from './routes/calendar.js';
import cloudRoutes from './routes/cloud.js';
import sharingRoutes from './routes/sharing.js';
import featuresRoutes from './routes/features.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security middleware with CSP tuned for frontend CDN assets used by index.html.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.tailwindcss.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:', 'wss:'],
        mediaSrc: ["'self'", 'blob:', 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  })
);

// Request ID middleware - for request tracing
app.use(requestId());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const { method, path, ip } = req;
  const requestIdValue = req.id;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    const logData = {
      requestId: requestIdValue,
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ip,
    };

    // Log successful requests as info, errors as error
    if (statusCode >= 400) {
      logger.warn('HTTP request', logData);
    } else {
      logger.info('HTTP request', logData);
    }
  });

  next();
});

// CORS configuration
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const renderOrigin = process.env.RENDER_EXTERNAL_URL;
const allowedOrigins = Array.from(
  new Set([
    ...defaultOrigins,
    ...envOrigins,
    ...(renderOrigin ? [renderOrigin] : []),
  ])
);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limit for AI-heavy endpoints (transcribe, translate, chat, summarise)
const aiLimiter = rateLimit({
  windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 20, // 20 AI requests per 5 min
  message: 'Too many AI requests. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip, // per-user when authenticated
});

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint for manual browser checks.
if (!isProduction) {
  app.get('/', (req, res) => {
    res.json({
      service: 'Luminai-AI Backend',
      status: 'ok',
      message: 'Backend is running. Use frontend on http://localhost:3000.',
      endpoints: {
        health: '/health',
        ai: '/api/ai',
        auth: '/api/auth',
        meetings: '/api/meetings',
        notes: '/api/notes',
      },
      timestamp: new Date().toISOString(),
    });
  });
}

// API routes
app.use('/api/ai', aiLimiter, aiRoutes);
// Backward-compatible alias for older clients.
app.use('/api/gemini', aiLimiter, aiRoutes);
// New feature routes (translation, chat, memos, prep, templates)
app.use('/api/ai', aiLimiter, featuresRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/sharing', sharingRoutes);
app.use('/api/admin', adminRoutes);

if (isProduction) {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
// 404 handler - must be BEFORE global error handler
app.use(notFoundHandler);

// Global error handler - must be LAST
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Luminai-AI server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsOrigins: allowedOrigins,
  });
});
