import functions from '@google-cloud/functions-framework';
import { sendJSONResponse } from './utils/controllerHelpers.js';

const CONTROLLER_MODULES = {
  technologies: './controllers/technologiesController.js',
  categories: './controllers/categoriesController.js',
  adoption: './controllers/reportController.js',
  cwvtech: './controllers/reportController.js',
  lighthouse: './controllers/reportController.js',
  pageWeight: './controllers/reportController.js',
  audits: './controllers/reportController.js',
  geoBreakdown: './controllers/reportController.js',
  ranks: './controllers/ranksController.js',
  geos: './controllers/geosController.js',
  versions: './controllers/versionsController.js',
  static: './controllers/cdnController.js',
};

const controllers = {};

const getController = async (name) => {
  if (!controllers[name]) {
    controllers[name] = await import(CONTROLLER_MODULES[name]);
  }
  return controllers[name];
};

const V1_ROUTES = {
  '/v1/technologies': ['technologies', 'listTechnologies'],
  '/v1/categories': ['categories', 'listCategories'],
  '/v1/adoption': ['adoption', 'listAdoptionData'],
  '/v1/cwv': ['cwvtech', 'listCWVTechData'],
  '/v1/lighthouse': ['lighthouse', 'listLighthouseData'],
  '/v1/page-weight': ['pageWeight', 'listPageWeightData'],
  '/v1/audits': ['audits', 'listAuditsData'],
  '/v1/ranks': ['ranks', 'listRanks'],
  '/v1/geos': ['geos', 'listGeos'],
  '/v1/versions': ['versions', 'listVersions'],
  '/v1/geo-breakdown': ['geoBreakdown', 'listGeoBreakdownData'],
};

// Helper function to set CORS headers
const setCORSHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, If-None-Match');
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
};

// Helper function to set common response headers
const setCommonHeaders = (res) => {
  setCORSHeaders(res);
  res.setHeader('Content-Type', 'application/json');
  // Browser cache: 1 hour, CDN cache: 1 day
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.setHeader('Cache-Tag', 'report-api');
  res.setHeader('Timing-Allow-Origin', '*');
};

// Route handler function
const handleRequest = async (req, res) => {
  try {
    // Parse URL path first so we can route /mcp before setting common headers
    const pathname = req.path || req.url.split('?')[0];

    // MCP endpoint — handled before common headers; transport owns the response
    if (pathname === '/mcp') {
      setCORSHeaders(res);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      const { handleMcp } = await import('./mcpHandler.js');
      await handleMcp(req, res);
      return;
    }

    setCommonHeaders(res);

    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (pathname === '/' && req.method === 'GET') {
      sendJSONResponse(req, res, { status: 'ok' });
    } else if (req.method === 'GET' && V1_ROUTES[pathname]) {
      const [controllerKey, handlerName] = V1_ROUTES[pathname];
      const controller = await getController(controllerKey);
      await controller[handlerName](req, res);
    } else if (pathname.startsWith('/v1/static/') && req.method === 'GET') {
      const filePath = decodeURIComponent(pathname.replace('/v1/static/', ''));
      if (!filePath) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'File path required' }));
        return;
      }
      const { proxyReportsFile } = await getController('static');
      await proxyReportsFile(req, res, filePath);
    } else {
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
