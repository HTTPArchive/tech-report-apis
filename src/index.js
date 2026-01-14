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
  audits: null,
  ranks: null,
  geos: null,
  versions: null,
  static: null
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
      case 'audits':
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
      case 'static':
        controllers[name] = await import('./controllers/cdnController.js');
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
  // Browser cache: 1 hour, CDN cache: 30 days
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=2592000');
  res.setHeader('Cloud-CDN-Cache-Tag', 'report-api');
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
  const ifNoneMatch = req.headers['if-none-match'] || req.get('if-none-match');
  return !ifNoneMatch || ifNoneMatch !== `"${etag}"`;
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

    // Parse URL path - robustly handle Express (req.path) or native Node (req.url)
    const pathname = req.path || req.url.split('?')[0];

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
    } else if (pathname === '/v1/audits' && req.method === 'GET') {
      const { listAuditsData } = await getController('audits');
      await listAuditsData(req, res);
    } else if (pathname === '/v1/ranks' && req.method === 'GET') {
      const { listRanks } = await getController('ranks');
      await listRanks(req, res);
    } else if (pathname === '/v1/geos' && req.method === 'GET') {
      const { listGeos } = await getController('geos');
      await listGeos(req, res);
    } else if (pathname === '/v1/versions' && req.method === 'GET') {
      const { listVersions } = await getController('versions');
      await listVersions(req, res);
    } else if (pathname.startsWith('/v1/static/') && req.method === 'GET') {
      // GCS proxy endpoint for reports files
      const filePath = decodeURIComponent(pathname.replace('/v1/static/', ''));
      if (!filePath) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'File path required' }));
        return;
      }
      const { proxyReportsFile } = await getController('static');
      await proxyReportsFile(req, res, filePath);
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

// Register with Functions Framework
functions.http('app', handleRequest);

// Export for testing using Functions Framework testing utilities
export { handleRequest as app };
