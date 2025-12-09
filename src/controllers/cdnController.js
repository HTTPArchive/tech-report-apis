import { Storage } from '@google-cloud/storage';

// Initialize GCS client (uses Application Default Credentials)
const storage = new Storage();

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

        if (metadata.etag) {
            res.setHeader('ETag', metadata.etag);
        }
        if (metadata.size) {
            res.setHeader('Content-Length', metadata.size);
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

        const readStream = file.createReadStream();

        readStream.on('error', (err) => {
            console.error('Error streaming file from GCS:', err);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to read file' }));
            }
        });

        readStream.pipe(res);

    } catch (error) {
        console.error('Error proxying GCS file:', error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: 'Failed to retrieve file',
                details: error.message
            }));
        }
    }
};
