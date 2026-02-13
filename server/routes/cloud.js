import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/cloud/download
 * Download a file from Google Drive or Dropbox and return as base64
 * Body: { url: string, source: 'google_drive' | 'dropbox', fileName?: string }
 */
router.post('/download', async (req, res) => {
    try {
        const { url, source, fileName } = req.body;

        if (!url || !source) {
            return res.status(400).json({ error: 'Missing url or source parameter' });
        }

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

        console.log(`☁️ Downloading from ${source}: ${fileName || 'unknown'}`);

        const response = await fetch(downloadUrl, {
            headers: {
                'User-Agent': 'LuminaAI/1.0'
            }
        });

        if (!response.ok) {
            console.error(`Download failed: ${response.status} ${response.statusText}`);
            return res.status(502).json({ error: `Failed to download file from ${source}: ${response.statusText}` });
        }

        // Check content length
        const contentLength = parseInt(response.headers.get('content-length') || '0');
        if (contentLength > MAX_FILE_SIZE) {
            return res.status(413).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
        }

        const contentType = response.headers.get('content-type') || 'audio/mpeg';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Double-check actual size
        if (buffer.length > MAX_FILE_SIZE) {
            return res.status(413).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
        }

        const base64Data = buffer.toString('base64');

        console.log(`✅ Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)}MB from ${source}`);

        res.json({
            base64Data,
            mimeType: contentType,
            fileName: fileName || 'cloud_recording',
            fileSize: buffer.length
        });

    } catch (error) {
        console.error('Cloud download error:', error);
        res.status(500).json({ error: 'Failed to download file from cloud storage' });
    }
});

export default router;
