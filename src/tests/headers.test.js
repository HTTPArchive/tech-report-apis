import { jest, describe, it, expect, beforeAll } from '@jest/globals';

// Define mocks BEFORE importing the app
jest.unstable_mockModule('../controllers/technologiesController.js', () => ({
    listTechnologies: jest.fn((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: [] }));
    })
}));

jest.unstable_mockModule('../controllers/cdnController.js', () => ({
    proxyReportsFile: jest.fn((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cloud-CDN-Cache-Tag', 'bucket-proxy');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=2592000');
        res.statusCode = 200;
        res.end(JSON.stringify({ mocked: true }));
    })
}));

let request;
let app;

describe('CDN Headers', () => {
    beforeAll(async () => {
        // Import supertest and app AFTER mocking
        request = (await import('supertest')).default;
        const module = await import('../index.js');
        app = module.app;
    });

    it('should set correct headers for standard API endpoints', async () => {
        const res = await request(app).get('/v1/technologies');

        expect(res.statusCode).toEqual(200);
        expect(res.headers['cache-control']).toBe('public, max-age=3600, s-maxage=2592000');
        expect(res.headers['cloud-cdn-cache-tag']).toBe('report-api');
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
        expect(res.headers['access-control-allow-headers']).toContain('If-None-Match');
        expect(res.headers['access-control-expose-headers']).toContain('ETag');
        expect(res.headers['access-control-expose-headers']).toContain('Cloud-CDN-Cache-Tag');
    });

    it('should set correct headers for static file proxy', async () => {
        const res = await request(app).get('/v1/static/test.json');

        expect(res.statusCode).toEqual(200);
        expect(res.headers['cache-control']).toBe('public, max-age=3600, s-maxage=2592000');
        expect(res.headers['cloud-cdn-cache-tag']).toBe('bucket-proxy');
        expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('should set correct headers for health check', async () => {
        const res = await request(app).get('/');

        expect(res.statusCode).toEqual(200);
        expect(res.headers['cache-control']).toBe('public, max-age=3600, s-maxage=2592000');
        expect(res.headers['cloud-cdn-cache-tag']).toBe('report-api');
    });
});
