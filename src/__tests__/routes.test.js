const request = require('supertest');
const { app } = require('../index');

// Mock Firestore
jest.mock('../utils/db', () => {
  return {
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      empty: false,
      forEach: (callback) => {
        callback({
          data: () => ({
            technology: 'Test Technology',
            category: 'Test Category',
            description: 'Test Description',
            icon: 'test-icon.svg',
            origins: 1000
          }),
          get: (field) => 'Test Value'
        });
      },
      docs: [{
        data: () => ({
          technology: 'Test Technology',
          category: 'Test Category',
          description: 'Test Description',
          icon: 'test-icon.svg',
          origins: 1000,
          date: '2023-01-01'
        })
      }]
    })
  };
});

describe('API Routes', () => {
  describe('GET /', () => {
    it('should return a health check response', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('GET /v1/technologies', () => {
    it('should return technologies', async () => {
      const res = await request(app).get('/v1/technologies');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter technologies by name', async () => {
      const res = await request(app).get('/v1/technologies?technology=Test');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return only names when onlyname parameter is provided', async () => {
      const res = await request(app).get('/v1/technologies?onlyname=true');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

});
