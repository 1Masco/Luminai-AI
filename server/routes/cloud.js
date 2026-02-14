import express from 'express';
import { validateRequest } from '../validation/middleware.js';
import { CloudDownloadInputSchema } from '../validation/schemas.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

const router = express.Router();

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/cloud/download
 * Download a file from Google Drive or Dropbox and return as base64
 * Body: { url: string, source: 'google_drive' | 'dropbox', fileName?: string }
 */
router.post(
  '/download',
  validateRequest(CloudDownloadInputSchema),
  asyncHandler(async (req, res) => {
    const { url, source, fileName } = req.body;

    logger.info('Cloud download request', { source, fileName: fileName || 'unknown', requestId: req.id });

    let downloadUrl = url;

    // For Google Drive, convert to direct download URL
    if (source === 'google_drive') {
      // Extract file ID from various Google Drive URL formats
      let fileId = null;
      const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          fileId = match[1];
          break;
        }
      }

      if (fileId) {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (apiKey) {
          downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
        } else {
          downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }
    }
    // Dropbox Chooser already provides a direct download link (dl=1)

    try {
      const response = await fetch(downloadUrl, {
        headers: {
          'User-Agent': 'LuminaAI/1.0'
        }
      });

      if (!response.ok) {
        logger.warn('Download failed with status', { status: response.status, source, requestId: req.id });
        throw AppErrors.EXTERNAL_SERVICE_ERROR('Cloud Storage');
      }

      // Check content length
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      if (contentLength > MAX_FILE_SIZE) {
        logger.warn('File too large', { contentLength, maxSize: MAX_FILE_SIZE, requestId: req.id });
        throw new AppError(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`, 413, 'FILE_TOO_LARGE');
      }

      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Double-check actual size
      if (buffer.length > MAX_FILE_SIZE) {
        logger.warn('File too large after download', { actualSize: buffer.length, maxSize: MAX_FILE_SIZE, requestId: req.id });
        throw new AppError(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`, 413, 'FILE_TOO_LARGE');
      }

      const base64Data = buffer.toString('base64');

      logger.info('Download successful', {
        source,
        fileName: fileName || 'unknown',
        fileSize: `${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
        requestId: req.id
      });

      res.json({
        base64Data,
        mimeType: contentType,
        fileName: fileName || 'cloud_recording',
        fileSize: buffer.length
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Cloud download error', { source, error: error.message, requestId: req.id });
      throw AppErrors.EXTERNAL_SERVICE_ERROR('Cloud Storage');
    }
  })
);

export default router;
