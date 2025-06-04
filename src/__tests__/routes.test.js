const request = require('supertest');
const { app } = require('../index');

// Mock Firestore
jest.mock('../utils/db', () => {
  const mockFirestoreInstance = {
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      empty: false,
      forEach: (callback) => {
        // Mock technology data
        callback({
          data: () => ({
            technology: 'WordPress',
            category: 'CMS',
            description: 'A popular content management system',
            icon: 'wordpress.svg',
            origins: ['WordPress Foundation']
          }),
          get: (field) => {
            const mockData = {
              technology: 'WordPress',
              category: 'CMS',
              rank: 'ALL',
              geo: 'ALL',
              date: '2023-01-01'
            };
            return mockData[field] || 'Mock Value';
          }
        });
      },
      docs: [{
        data: () => ({
          technology: 'WordPress',
          category: 'CMS',
          description: 'A popular content management system',
          icon: 'wordpress.svg',
          origins: ['WordPress Foundation'],
          date: '2023-01-01'
        })
      }]
    })
  };

  return {
    firestore: mockFirestoreInstance,
    firestoreOld: mockFirestoreInstance
  };
});

describe('API Routes', () => {
  describe('Health Check', () => {
    it('should return a health check response', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
    });
  });

  describe('GET /v1/technologies', () => {
    it('should return technologies', async () => {
      const res = await request(app).get('/v1/technologies');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter technologies by name', async () => {
      const res = await request(app).get('/v1/technologies?technology=WordPress');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return only names when onlyname parameter is provided', async () => {
      const res = await request(app).get('/v1/technologies?technology=WordPress&onlyname=true');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should support field selection', async () => {
      const res = await request(app).get('/v1/technologies?technology=WordPress&fields=technology,icon');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should prioritize onlyname over fields parameter', async () => {
      const res = await request(app).get('/v1/technologies?technology=WordPress&onlyname=true&fields=technology,icon');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/technologies')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('GET /v1/categories', () => {
    it('should return categories', async () => {
      const res = await request(app).get('/v1/categories');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter categories by name', async () => {
      const res = await request(app).get('/v1/categories?category=CMS');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return only names when onlyname parameter is provided', async () => {
      const res = await request(app).get('/v1/categories?category=CMS&onlyname=true');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should support field selection', async () => {
      const res = await request(app).get('/v1/categories?category=CMS&fields=category');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/categories')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('GET /v1/ranks', () => {
    it('should return ranks', async () => {
      const res = await request(app).get('/v1/ranks');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/ranks')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('GET /v1/geos', () => {
    it('should return geos', async () => {
      const res = await request(app).get('/v1/geos');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/geos')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('GET /v1/versions', () => {
    it('should return versions', async () => {
      const res = await request(app).get('/v1/versions');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter versions by technology', async () => {
      const res = await request(app).get('/v1/versions?technology=WordPress');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/versions')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('GET /v1/adoption', () => {
    it('should return adoption data with required parameters', async () => {
      const res = await request(app).get('/v1/adoption?technology=WordPress&geo=ALL&rank=ALL&start=latest');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle missing required parameters', async () => {
      const res = await request(app).get('/v1/adoption');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/adoption')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('GET /v1/cwv', () => {
    it('should return CWV data with required parameters', async () => {
      const res = await request(app).get('/v1/cwv?technology=WordPress&geo=ALL&rank=ALL&start=latest');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle missing required parameters', async () => {
      const res = await request(app).get('/v1/cwv');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/cwv')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('GET /v1/lighthouse', () => {
    it('should return lighthouse data with required parameters', async () => {
      const res = await request(app).get('/v1/lighthouse?technology=WordPress&geo=ALL&rank=ALL&start=latest');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle missing required parameters', async () => {
      const res = await request(app).get('/v1/lighthouse');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/lighthouse')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('GET /v1/page-weight', () => {
    it('should return page weight data with required parameters', async () => {
      const res = await request(app).get('/v1/page-weight?technology=WordPress&geo=ALL&rank=ALL&start=latest');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle missing required parameters', async () => {
      const res = await request(app).get('/v1/page-weight');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/v1/page-weight')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.statusCode).toEqual(204);
      expect(res.headers['access-control-allow-origin']).toEqual('*');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/v1/unknown-endpoint');
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should handle invalid query parameters gracefully', async () => {
      const res = await request(app).get('/v1/technologies?invalid=parameter');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Response Headers', () => {
    it('should include proper CORS headers', async () => {
      const res = await request(app).get('/v1/technologies');
      expect(res.headers['access-control-allow-origin']).toEqual('*');
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.headers['cache-control']).toContain('no-cache');
    });

    it('should include ETag headers for caching', async () => {
      const res = await request(app).get('/');
      expect(res.headers).toHaveProperty('etag');
    });

    it('should include timing headers', async () => {
      const res = await request(app).get('/v1/technologies');
      expect(res.headers['timing-allow-origin']).toEqual('*');
    });
  });
});
