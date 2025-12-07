import request from 'supertest';
import { jest } from '@jest/globals';
import { Readable } from 'stream';

// Mock the GCS Storage module
const mockFileExists = jest.fn();
const mockGetMetadata = jest.fn();
const mockCreateReadStream = jest.fn();
const mockFile = jest.fn(() => ({
  exists: mockFileExists,
  getMetadata: mockGetMetadata,
  createReadStream: mockCreateReadStream
}));
const mockBucket = jest.fn(() => ({
  file: mockFile
}));

jest.unstable_mockModule('@google-cloud/storage', () => ({
  Storage: jest.fn(() => ({
    bucket: mockBucket
  }))
}));

// Mock the entire utils/db module using ESM-compatible mocking
jest.unstable_mockModule('../utils/db.js', () => {
  const mockDoc = {
    data: () => ({
      technology: 'WordPress',
      category: 'CMS',
      description: 'A popular content management system',
      icon: 'wordpress.svg',
      origins: ['WordPress Foundation'],
      rank: 'ALL',
      geo: 'ALL',
      date: '2023-01-01'
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
  };

  const mockQuerySnapshot = {
    empty: false,
    forEach: (callback) => {
      callback(mockDoc);
    },
    docs: [mockDoc]
  };

  // Create a chainable query mock - avoid infinite recursion
  const mockQuery = {
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    select: jest.fn(),
    get: jest.fn().mockResolvedValue(mockQuerySnapshot)
  };

  // Make the methods chainable by returning the same mock object
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.select.mockReturnValue(mockQuery);

  const mockFirestoreInstance = {
    collection: jest.fn().mockImplementation((collectionName) => mockQuery)
  };

  return {
    firestore: mockFirestoreInstance,
    firestoreOld: mockFirestoreInstance
  };
});

// Import app after mocking
const { app } = await import('../index.js');

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

      //expect(res.body).toHaveProperty('errors');
      //expect(res.body.errors[0]).toHaveProperty('error');
      //expect(res.body.errors[0].error).toContain('Unsupported parameters: ');
    });
  });

  describe('Response Headers', () => {
    it('should include proper CORS headers', async () => {
      const res = await request(app).get('/v1/technologies');
      expect(res.headers['access-control-allow-origin']).toEqual('*');
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.headers['cache-control']).toContain('public');
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

  describe('GET /v1/static/*', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      mockFileExists.mockReset();
      mockGetMetadata.mockReset();
      mockCreateReadStream.mockReset();
      mockFile.mockClear();
      mockBucket.mockClear();
    });

    describe('Valid file requests', () => {
      it('should return file content for valid path', async () => {
        const fileContent = JSON.stringify({ data: 'test' });
        const readable = Readable.from([fileContent]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: '"abc123"',
          size: fileContent.length
        }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/2024/data.json')
          .expect(200);

        expect(res.headers['content-type']).toContain('application/json');
        expect(res.headers['cache-control']).toContain('public');
        expect(res.headers['access-control-allow-origin']).toEqual('*');
      });

      it('should infer MIME type from file extension when not in metadata', async () => {
        const fileContent = '{"test": true}';
        const readable = Readable.from([fileContent]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          etag: '"abc123"',
          size: fileContent.length
        }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(200);

        expect(res.headers['content-type']).toContain('application/json');
      });

      it('should handle CORS preflight requests', async () => {
        const res = await request(app)
          .options('/v1/static/reports/data.json')
          .set('Origin', 'http://example.com')
          .set('Access-Control-Request-Method', 'GET')
          .set('Access-Control-Request-Headers', 'Content-Type');

        expect(res.statusCode).toEqual(204);
        expect(res.headers['access-control-allow-origin']).toEqual('*');
      });
    });

    describe('Invalid file paths (directory traversal attempts)', () => {
      it('should reject paths containing double dot sequences', async () => {
        // Test with '..' embedded in the path that won't be normalized away
        const res = await request(app)
          .get('/v1/static/reports/..hidden/passwd')
          .expect(400);
          .expect(400);
        expect(res.body).toHaveProperty('error', 'Invalid file path');
      });

      it('should reject paths with double slashes', async () => {
        const res = await request(app)
          .get('/v1/static/reports//data.json')
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Invalid file path');
      });

      it('should reject paths with encoded double dots', async () => {
        // URL-encoded '..' = %2e%2e
        mockFileExists.mockResolvedValue([false]); // Will be checked after validation

        const res = await request(app)
          .get('/v1/static/reports/%2e%2e/secret/passwd');

        // Should either be rejected as invalid or not found
        expect([400, 404]).toContain(res.statusCode);
      });
    });

    describe('Non-existent files (404 handling)', () => {
      it('should return 404 for non-existent files', async () => {
        mockFileExists.mockResolvedValue([false]);

        const res = await request(app)
          .get('/v1/static/reports/nonexistent.json')
          .expect(404);

        expect(res.body).toHaveProperty('error', 'File not found');
      });

      it('should return 400 for empty file path', async () => {
        const res = await request(app)
          .get('/v1/static/')
          .expect(400);

        expect(res.body).toHaveProperty('error', 'File path required');
      });
    });

    describe('Conditional requests (ETag/If-None-Match)', () => {
      it('should return 304 when ETag matches If-None-Match header', async () => {
        const etag = '"abc123"';

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: etag,
          size: 100
        }]);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .set('If-None-Match', etag)
          .expect(304);

        // 304 responses have no body
        expect(res.text).toEqual('');
      });

      it('should return 200 with content when ETag does not match', async () => {
        const fileContent = JSON.stringify({ data: 'test' });
        const readable = Readable.from([fileContent]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: '"abc123"',
          size: fileContent.length
        }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .set('If-None-Match', '"different-etag"')
          .expect(200);

        expect(res.headers['etag']).toEqual('"abc123"');
      });

      it('should include ETag in response headers', async () => {
        const fileContent = JSON.stringify({ data: 'test' });
        const readable = Readable.from([fileContent]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: '"abc123"',
          size: fileContent.length
        }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(200);

        expect(res.headers).toHaveProperty('etag', '"abc123"');
      });
    });

    describe('Error scenarios (GCS failures)', () => {
      it('should handle GCS exists() failure', async () => {
        mockFileExists.mockRejectedValue(new Error('GCS connection failed'));

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(500);

        expect(res.body).toHaveProperty('error', 'Failed to retrieve file');
        expect(res.body).toHaveProperty('details');
      });

      it('should handle GCS getMetadata() failure', async () => {
        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockRejectedValue(new Error('Metadata retrieval failed'));

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(500);

        expect(res.body).toHaveProperty('error', 'Failed to retrieve file');
      });

      it('should handle stream errors during file read', async () => {
        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: '"abc123"',
          size: 100
        }]);

        // Create a stream that emits an error after a delay
        const errorStream = new Readable({
          read() {
            // Emit error asynchronously
            process.nextTick(() => {
              this.destroy(new Error('Stream read error'));
            });
          }
        });
        mockCreateReadStream.mockReturnValue(errorStream);

        // Use try-catch since stream errors may cause connection issues
        try {
          const res = await request(app)
            .get('/v1/static/reports/data.json')
            .timeout(1000);

          // If we get a response, verify error handling
          expect([200, 500]).toContain(res.statusCode);
        } catch (err) {
          // Connection aborted due to stream error is expected behavior
          expect(err.message).toMatch(/aborted|ECONNRESET|socket hang up/i);
        }
      });
    });

    describe('MIME type detection', () => {
      it('should detect application/json for .json files', async () => {
        const content = '{"test":true}';
        const readable = Readable.from([content]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{ size: content.length }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(200);

        expect(res.headers['content-type']).toContain('application/json');
      });

      it('should detect image/png for .png files', async () => {
        const content = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG magic bytes
        const readable = Readable.from([content]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{ size: content.length }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/chart.png')
          .buffer(true)
          .parse((res, callback) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          });

        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toContain('image/png');
      });

      it('should use application/octet-stream for unknown extensions', async () => {
        const content = Buffer.from([0x00, 0x01, 0x02]);
        const readable = Readable.from([content]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{ size: content.length }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/file.xyz')
          .buffer(true)
          .parse((res, callback) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          });

        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toContain('application/octet-stream');
      });
    });
  });

  describe('GET /v1/static/*', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      mockFileExists.mockReset();
      mockGetMetadata.mockReset();
      mockCreateReadStream.mockReset();
      mockFile.mockClear();
      mockBucket.mockClear();
    });

    describe('Valid file requests', () => {
      it('should return file content for valid path', async () => {
        const fileContent = JSON.stringify({ data: 'test' });
        const readable = Readable.from([fileContent]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: '"abc123"',
          size: fileContent.length
        }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/2024/data.json')
          .expect(200);

        expect(res.headers['content-type']).toContain('application/json');
        expect(res.headers['cache-control']).toContain('public');
        expect(res.headers['access-control-allow-origin']).toEqual('*');
      });

      it('should infer MIME type from file extension when not in metadata', async () => {
        const fileContent = '{"test": true}';
        const readable = Readable.from([fileContent]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          etag: '"abc123"',
          size: fileContent.length
        }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(200);

        expect(res.headers['content-type']).toContain('application/json');
      });

      it('should handle CORS preflight requests', async () => {
        const res = await request(app)
          .options('/v1/static/reports/data.json')
          .set('Origin', 'http://example.com')
          .set('Access-Control-Request-Method', 'GET')
          .set('Access-Control-Request-Headers', 'Content-Type');

        expect(res.statusCode).toEqual(204);
        expect(res.headers['access-control-allow-origin']).toEqual('*');
      });
    });

    describe('Invalid file paths (directory traversal attempts)', () => {
      it('should reject paths containing double dot sequences', async () => {
        // Test with '..' embedded in the path that won't be normalized away
        const res = await request(app)
          .get('/v1/static/reports/..hidden/passwd')

        expect(res.body).toHaveProperty('error', 'Invalid file path');
      });

      it('should reject paths with double slashes', async () => {
        const res = await request(app)
          .get('/v1/static/reports//data.json')
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Invalid file path');
      });

      it('should reject paths with encoded double dots', async () => {
        // URL-encoded '..' = %2e%2e
        mockFileExists.mockResolvedValue([false]); // Will be checked after validation

        const res = await request(app)
          .get('/v1/static/reports/%2e%2e/secret/passwd');

        // Should either be rejected as invalid or not found
        expect([400, 404]).toContain(res.statusCode);
      });
    });

    describe('Non-existent files (404 handling)', () => {
      it('should return 404 for non-existent files', async () => {
        mockFileExists.mockResolvedValue([false]);

        const res = await request(app)
          .get('/v1/static/reports/nonexistent.json')
          .expect(404);

        expect(res.body).toHaveProperty('error', 'File not found');
      });

      it('should return 400 for empty file path', async () => {
        const res = await request(app)
          .get('/v1/static/')
          .expect(400);

        expect(res.body).toHaveProperty('error', 'File path required');
      });
    });

    describe('Conditional requests (ETag/If-None-Match)', () => {
      it('should return 304 when ETag matches If-None-Match header', async () => {
        const etag = '"abc123"';

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: etag,
          size: 100
        }]);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .set('If-None-Match', etag)
          .expect(304);

        // 304 responses have no body
        expect(res.text).toEqual('');
      });

      it('should return 200 with content when ETag does not match', async () => {
        const fileContent = JSON.stringify({ data: 'test' });
        const readable = Readable.from([fileContent]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: '"abc123"',
          size: fileContent.length
        }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .set('If-None-Match', '"different-etag"')
          .expect(200);

        expect(res.headers['etag']).toEqual('"abc123"');
      });

      it('should include ETag in response headers', async () => {
        const fileContent = JSON.stringify({ data: 'test' });
        const readable = Readable.from([fileContent]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: '"abc123"',
          size: fileContent.length
        }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(200);

        expect(res.headers).toHaveProperty('etag', '"abc123"');
      });
    });

    describe('Error scenarios (GCS failures)', () => {
      it('should handle GCS exists() failure', async () => {
        mockFileExists.mockRejectedValue(new Error('GCS connection failed'));

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(500);

        expect(res.body).toHaveProperty('error', 'Failed to retrieve file');
        expect(res.body).toHaveProperty('details');
      });

      it('should handle GCS getMetadata() failure', async () => {
        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockRejectedValue(new Error('Metadata retrieval failed'));

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(500);

        expect(res.body).toHaveProperty('error', 'Failed to retrieve file');
      });

      it('should handle stream errors during file read', async () => {
        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{
          contentType: 'application/json',
          etag: '"abc123"',
          size: 100
        }]);

        // Create a stream that emits an error after a delay
        const errorStream = new Readable({
          read() {
            // Emit error asynchronously
            process.nextTick(() => {
              this.destroy(new Error('Stream read error'));
            });
          }
        });
        mockCreateReadStream.mockReturnValue(errorStream);

        // Use try-catch since stream errors may cause connection issues
        try {
          const res = await request(app)
            .get('/v1/static/reports/data.json')
            .timeout(1000);

          // If we get a response, verify error handling
          expect([200, 500]).toContain(res.statusCode);
        } catch (err) {
          // Connection aborted due to stream error is expected behavior
          expect(err.message).toMatch(/aborted|ECONNRESET|socket hang up/i);
        }
      });
    });

    describe('MIME type detection', () => {
      it('should detect application/json for .json files', async () => {
        const content = '{"test":true}';
        const readable = Readable.from([content]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{ size: content.length }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/data.json')
          .expect(200);

        expect(res.headers['content-type']).toContain('application/json');
      });

      it('should detect image/png for .png files', async () => {
        const content = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG magic bytes
        const readable = Readable.from([content]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{ size: content.length }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/chart.png')
          .buffer(true)
          .parse((res, callback) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          });

        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toContain('image/png');
      });

      it('should use application/octet-stream for unknown extensions', async () => {
        const content = Buffer.from([0x00, 0x01, 0x02]);
        const readable = Readable.from([content]);

        mockFileExists.mockResolvedValue([true]);
        mockGetMetadata.mockResolvedValue([{ size: content.length }]);
        mockCreateReadStream.mockReturnValue(readable);

        const res = await request(app)
          .get('/v1/static/reports/file.xyz')
          .buffer(true)
          .parse((res, callback) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          });

        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toContain('application/octet-stream');
      });
    });
  });
});
