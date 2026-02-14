import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import requestId from 'express-request-id';
import dotenv from 'dotenv';
import logger from './logger/winston.config.js';
import { errorHandler, notFoundHandler } from './errors/errorHandler.js';
import geminiRoutes from './routes/gemini.js';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import meetingsRoutes from './routes/meetings.js';
import calendarRoutes from './routes/calendar.js';
import cloudRoutes from './routes/cloud.js';
import sharingRoutes from './routes/sharing.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
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

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/gemini', geminiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/sharing', sharingRoutes);

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
