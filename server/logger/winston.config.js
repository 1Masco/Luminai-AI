import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV === 'development';

// Define custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr} ${stack || ''}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configure transports
const transports = [
  // Console transport - always active
  new winston.transports.Console({
    format: isDevelopment
      ? winston.format.combine(
          winston.format.colorize(),
          customFormat
        )
      : jsonFormat,
  }),
];

// File transports - only in production or when explicitly enabled
if (!isDevelopment || process.env.LOG_FILES === 'true') {
  const logsDir = path.join(__dirname, '../logs');
  // Render/CI containers may not include this directory from git; create it at runtime.
  fs.mkdirSync(logsDir, { recursive: true });

  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: jsonFormat,
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transports,
});

// Handle uncaught exceptions and unhandled rejections
if (!isDevelopment) {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/exceptions.log'),
      format: jsonFormat,
    })
  );

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
  });
}

export default logger;
