import http from 'http';
import url from 'url';
import crypto from 'crypto';
import functions from '@google-cloud/functions-framework';

// Dynamic imports for better performance - only load when needed
const controllers = {
  technologies: null,
  categories: null,
  adoption: null,
  cwvtech: null,
  lighthouse: null,
  pageWeight: null,
  ranks: null,
  geos: null,
  versions: null
};

// Helper function to dynamically import controllers
const getController = async (name) => {
  if (!controllers[name]) {
    switch (name) {
      case 'technologies':
        controllers[name] = await import('./controllers/technologiesController.js');
        break;
      case 'categories':
        controllers[name] = await import('./controllers/categoriesController.js');
        break;
      case 'adoption':
      case 'cwvtech':
      case 'lighthouse':
      case 'pageWeight':
        controllers[name] = await import('./controllers/reportController.js');
        break;
      case 'ranks':
        controllers[name] = await import('./controllers/ranksController.js');
        break;
      case 'geos':
        controllers[name] = await import('./controllers/geosController.js');
        break;
      case 'versions':
        controllers[name] = await import('./controllers/versionsController.js');
        break;
    }
  }
  return controllers[name];
};

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

    // Validate URL to skip XSS attacks
    const unsafe = /onerror|onload|javascript:/i;
    if (unsafe.test(req.url)) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Invalid input' }));
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
      const { listTechnologies } = await getController('technologies');
      await listTechnologies(req, res);
    } else if (pathname === '/v1/categories' && req.method === 'GET') {
      const { listCategories } = await getController('categories');
      await listCategories(req, res);
    } else if (pathname === '/v1/adoption' && req.method === 'GET') {
      const { listAdoptionData } = await getController('adoption');
      await listAdoptionData(req, res);
    } else if (pathname === '/v1/cwv' && req.method === 'GET') {
      const { listCWVTechData } = await getController('cwvtech');
      await listCWVTechData(req, res);
    } else if (pathname === '/v1/lighthouse' && req.method === 'GET') {
      const { listLighthouseData } = await getController('lighthouse');
      await listLighthouseData(req, res);
    } else if (pathname === '/v1/page-weight' && req.method === 'GET') {
      const { listPageWeightData } = await getController('pageWeight');
      await listPageWeightData(req, res);
    } else if (pathname === '/v1/ranks' && req.method === 'GET') {
      const { listRanks } = await getController('ranks');
      await listRanks(req, res);
    } else if (pathname === '/v1/geos' && req.method === 'GET') {
      const { listGeos } = await getController('geos');
      await listGeos(req, res);
    } else if (pathname === '/v1/versions' && req.method === 'GET') {
      const { listVersions } = await getController('versions');
      await listVersions(req, res);
    } else if (pathname === '/v1/cache-stats' && req.method === 'GET') {
      // Cache monitoring endpoint
      const { getCacheStats } = await import('./utils/controllerHelpers.js');
      const stats = getCacheStats();
      sendJSONResponse(res, stats);
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
export { server as app };

// Register with Functions Framework for Cloud Functions
functions.http('app', handleRequest);

// For standalone server mode (local development)
// Note: In ES modules, there's no require.main === module equivalent
// We'll use import.meta.url to check if this is the main module
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
