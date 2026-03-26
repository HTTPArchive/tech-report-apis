import { describe, it, expect } from 'bun:test';
import { executeQuery } from '../utils/controllerHelpers.js';

describe('executeQuery optimization', () => {
  it('should correctly extract data using docs.map', async () => {
    let resultData = null;
    let statusCode = null;

    const req = {
      query: {},
      headers: {},
      get: () => null
    };

    const res = {
      setHeader: () => {},
      statusCode: 200,
      end: (data) => {
        if (data) resultData = JSON.parse(data);
        statusCode = 200;
      }
    };

    const mockDocs = [
      { data: () => ({ id: 1, name: 'test1' }) },
      { data: () => ({ id: 2, name: 'test2' }) }
    ];

    const mockSnapshot = {
      docs: mockDocs,
      forEach: () => { throw new Error('forEach should not be called!'); },
      empty: false
    };

    const mockQuery = {
      get: async () => mockSnapshot
    };

    const queryBuilder = async () => mockQuery;

    await executeQuery(req, res, 'test_collection', queryBuilder);

    expect(resultData).toEqual([{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }]);
  });
});
