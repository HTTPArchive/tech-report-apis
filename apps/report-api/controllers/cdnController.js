import { pipeline } from 'node:stream';
import { Storage } from '@google-cloud/storage';
import { logger } from '@httparchive/shared';

// Initialize GCS client (uses Application Default Credentials)
const storage = new Storage();

// Upper bound on a single file transfer. Slow clients otherwise hold the request
// open until Cloud Run's request timeout and surface as a 502.
const DEFAULT_MAX_TRANSFER_MS = 1 * 60 * 1000;

// MIME type mapping for common file extensions
const MIME_TYPES = {
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.csv': 'text/csv',
    '.pdf': 'application/pdf'
};

/**
 * Get MIME type from file path
 */
function getMimeType(filePath) {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Proxy endpoint to serve files from private GCS bucket
 * GET /v1/static/*
 *
 * This serves as a proxy for files stored in gs://httparchive/
 * The request path after /v1/static/ maps directly to the GCS object path
 */
export const proxyReportsFile = async (req, res, filePath) => {
    try {
        const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'httparchive';

        // Block access to crawls and results paths
        if (filePath.startsWith('crawls/') || filePath.startsWith('results/')) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Not supported. Response size too large.' }));
            return;
        }

        // Validate file path to prevent directory traversal
        if (filePath.includes('..') || filePath.includes('//')) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid file path' }));
            return;
        }

        // Remove leading slash if present - use path directly without base path prefix
        const objectPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

        // Get the file from GCS
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(objectPath);

        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
        }

        // Get file metadata for content type and caching
        const [metadata] = await file.getMetadata();

        // Determine content type
        const contentType = metadata.contentType || getMimeType(objectPath);

        // Set response headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Tag', 'bucket-proxy');
        // Browser cache: 1 hour, CDN cache: 1 days
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');

        if (metadata.etag) {
            res.setHeader('ETag', metadata.etag);
        }

        // Check for conditional request (If-None-Match)
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && metadata.etag && ifNoneMatch === metadata.etag) {
            res.statusCode = 304;
            res.end();
            return;
        }

        // Stream the file content to the response
        res.statusCode = 200;

        // If the file is gzip-encoded in GCS, pass the compressed stream through
        // directly so that Content-Length (compressed size) stays accurate.
        // Without this, createReadStream() decompresses transparently while
        // metadata.size still reflects the compressed size, truncating the response.
        const isGzipEncoded = metadata.contentEncoding === 'gzip';
        if (isGzipEncoded) {
            res.setHeader('Content-Encoding', 'gzip');
        }
        if (metadata.size) {
            res.setHeader('Content-Length', metadata.size);
        }

        const readStream = file.createReadStream({ decompress: !isGzipEncoded });

        // Clean up stream if client aborts or disconnects prematurely
        const cleanup = () => {
            if (!res.writableEnded) {
                readStream.destroy();
            }
        };
        req.on('close', cleanup);
        res.on('close', cleanup);

        if (req.setTimeout) {
            req.setTimeout(120000, () => {
                readStream.destroy(new Error('Stream timeout exceeded'));
            });
        }

        const maxTransferMs = Number(process.env.STATIC_MAX_TRANSFER_MS) || DEFAULT_MAX_TRANSFER_MS;
        const transferTimer = setTimeout(() => {
            logger.warn('Static file transfer exceeded time limit', { objectPath, maxTransferMs });
            readStream.destroy(new Error('Transfer time limit exceeded'));
        }, maxTransferMs);
        transferTimer.unref();

        pipeline(readStream, res, (err) => {
            clearTimeout(transferTimer);
            req.removeListener('close', cleanup);
            res.removeListener('close', cleanup);
            if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE' && !res.headersSent) {
                logger.error('Error streaming file from GCS', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to read file' }));
            }
        });

    } catch (error) {
        logger.error('Error proxying GCS file', error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: 'Server failed to respond'
            }));
        }
    }
};
