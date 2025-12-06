import crypto from 'crypto';

/**
 * Generates the signed query parameters for a Cloud CDN Signed URL Prefix.
 * The client will append these parameters to the base URL for authorized access.
 *
 * @param {string} urlPrefix - The full URL prefix path (e.g., 'https://cdn.httparchive.org/reports/'). Must end with a '/'.
 * @param {string} keyName - The Key Name configured in Google Cloud CDN (e.g., 'reports-sign-key').
 * @param {string} base64SecretKey - The Base64 URL-safe encoded secret key (16 bytes) from your CDN configuration.
 * @param {number} expirationSeconds - The number of seconds the signature should be valid for (e.g., 600 for 10 minutes).
 * @returns {object} An object containing the four required signed request query parameters.
 */
function getCloudCdnSignedParameters(urlPrefix, keyName, base64SecretKey, expirationSeconds = 600) {

    // 1. Calculate Expiration Timestamp
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expires = nowInSeconds + expirationSeconds;

    // 2. Base64URL-Encode the URL Prefix
    // The prefix must be Base64URL encoded (no padding, URL-safe characters)
    // The URLPrefix MUST end with a '/'
    const urlPrefixBuffer = Buffer.from(urlPrefix, 'utf8');
    const encodedPrefix = urlPrefixBuffer.toString('base64url'); // 'base64url' is standard for URL-safe base64 in Node.js

    // 3. Create the String to Sign (Canonical String)
    // Format: URLPrefix=<encoded prefix>&Expires=<timestamp>&KeyName=<key name>
    const stringToSign = `URLPrefix=${encodedPrefix}&Expires=${expires}&KeyName=${keyName}`;

    // 4. Decode the Secret Key for the HMAC Algorithm
    // Cloud CDN uses a 16-byte key that is Base64URL encoded.
    const secretKeyBuffer = Buffer.from(base64SecretKey, 'base64url');

    // 5. Compute the Signature (HMAC-SHA1)
    const hmac = crypto.createHmac('sha1', secretKeyBuffer);
    hmac.update(stringToSign);

    // Get the signature as raw bytes, then Base64URL encode it.
    // Cloud CDN expects a Base64URL-encoded signature without padding.
    const signature = hmac.digest('base64url');

    // 6. Return the Query Parameters
    return {
        URLPrefix: encodedPrefix,
        Expires: expires,
        KeyName: keyName,
        Signature: signature
    };
}

/**
 * Controller to generate signed CDN URL parameters
 * GET /v1/cdn/signed-params
 * Query parameters:
 *   - urlPrefix (optional): The URL prefix to sign. Defaults to CDN_URL_PREFIX env var.
 *   - expirationSeconds (optional): Validity duration in seconds. Defaults to 600 (10 minutes).
 */
export const getSignedParams = async (req, res) => {
    try {
        // Get configuration from environment variables
        const CDN_URL_PREFIX = process.env.CDN_URL_PREFIX || 'https://cdn.httparchive.org/reports/';
        const CDN_KEY_NAME = process.env.CDN_KEY_NAME;
        const CDN_BASE64_SECRET = process.env.CDN_BASE64_SECRET;

        // Validate required configuration
        if (!CDN_KEY_NAME || !CDN_BASE64_SECRET) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: 'CDN signing configuration not available. Please contact the administrator.'
            }));
            return;
        }

        // Get query parameters
        const urlPrefix = req.query.urlPrefix || CDN_URL_PREFIX;
        const expirationSeconds = req.query.expirationSeconds
            ? parseInt(req.query.expirationSeconds, 10)
            : 600;

        // Validate urlPrefix ends with '/'
        if (!urlPrefix.endsWith('/')) {
            res.statusCode = 400;
            res.end(JSON.stringify({
                error: 'urlPrefix must end with a forward slash (/)'
            }));
            return;
        }

        // Validate expirationSeconds
        if (isNaN(expirationSeconds) || expirationSeconds <= 0 || expirationSeconds > 86400) {
            res.statusCode = 400;
            res.end(JSON.stringify({
                error: 'expirationSeconds must be a positive number between 1 and 86400 (24 hours)'
            }));
            return;
        }

        // Generate signed parameters
        const signedParams = getCloudCdnSignedParameters(
            urlPrefix,
            CDN_KEY_NAME,
            CDN_BASE64_SECRET,
            expirationSeconds
        );

        // Return the signed parameters
        res.statusCode = 200;
        res.end(JSON.stringify({
            urlPrefix: urlPrefix,
            signedParams: signedParams,
            expiresAt: new Date(signedParams.Expires * 1000).toISOString()
        }));
    } catch (error) {
        console.error('Error generating CDN signed parameters:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({
            error: 'Failed to generate signed parameters',
            details: error.message
        }));
    }
};
