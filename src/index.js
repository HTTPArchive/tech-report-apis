const http = require('http');
const url = require('url');
const crypto = require('crypto');
const functions = require('@google-cloud/functions-framework');

// Import controllers
const { listTechnologies } = require('./controllers/technologiesController');
const { listCategories } = require('./controllers/categoriesController');
const { listAdoption } = require('./controllers/adoptionController');
const { listCwvtech } = require('./controllers/cwvtechController');
const { listLighthouse } = require('./controllers/lighthouseController');
const { listPageWeight } = require('./controllers/pageWeightController');
const { listRanks } = require('./controllers/ranksController');
const { listGeos } = require('./controllers/geosController');
const { listVersions } = require('./controllers/versionsController');

// Helper function to set CORS headers
const setCORSHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Timing-Allow-Origin');
  res.setHeader('Access-Control-Max-Age', '86400');
};

// Helper function to set common response headers
const setCommonHeaders = (res) => {
  setCORSHeaders(res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=21600');
  res.setHeader('Timing-Allow-Origin', '*');
};

// Helper function to generate ETag
const generateETag = (data) => {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};

// Helper function to send JSON response with ETag support
const sendJSONResponse = (res, data, statusCode = 200) => {
  const jsonData = JSON.stringify(data);
  const etag = generateETag(data);

  res.setHeader('ETag', `"${etag}"`);
  res.statusCode = statusCode;
  res.end(jsonData);
};

// Helper function to check if resource is modified
const isModified = (req, etag) => {
  const ifNoneMatch = req.headers['if-none-match'];
  return !ifNoneMatch || ifNoneMatch !== `"${etag}"`;
};

// Helper function to parse query parameters
const parseQuery = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

// Route handler function
const handleRequest = async (req, res) => {
  try {
    setCommonHeaders(res);

    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Parse URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Add query to req object for compatibility with existing controllers
    req.query = query;

    // Route handling
    if (pathname === '/' && req.method === 'GET') {
      // Health check endpoint
      const data = { status: 'ok' };
      sendJSONResponse(res, data);
    } else if (pathname === '/v1/technologies' && req.method === 'GET') {
      await listTechnologies(req, res);
    } else if (pathname === '/v1/categories' && req.method === 'GET') {
      await listCategories(req, res);
    } else if (pathname === '/v1/adoption' && req.method === 'GET') {
      await listAdoption(req, res);
    } else if (pathname === '/v1/cwv' && req.method === 'GET') {
      await listCwvtech(req, res);
    } else if (pathname === '/v1/lighthouse' && req.method === 'GET') {
      await listLighthouse(req, res);
    } else if (pathname === '/v1/page-weight' && req.method === 'GET') {
      await listPageWeight(req, res);
    } else if (pathname === '/v1/ranks' && req.method === 'GET') {
      await listRanks(req, res);
    } else if (pathname === '/v1/geos' && req.method === 'GET') {
      await listGeos(req, res);
    } else if (pathname === '/v1/versions' && req.method === 'GET') {
      await listVersions(req, res);
    } else {
      // 404 Not Found
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  } catch (error) {
    console.error('Error:', error);
    res.statusCode = 400;
    res.end(JSON.stringify({
      errors: [{ error: error.message || 'Unknown error occurred' }]
    }));
  }
};

// Create HTTP server
const server = http.createServer(handleRequest);

// Export the server for testing
exports.app = server;

// Register with Functions Framework for Cloud Functions
functions.http('app', handleRequest);

// For standalone server mode (local development)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
