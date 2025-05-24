const firestore = require('../utils/db');
const { convertToArray, createSuccessResponse, createErrorResponse } = require('../utils/helpers');

/**
 * List categories with optional filtering
 */
const listCategories = async (req, res) => {
  try {
    const params = req.query;
    let ref = firestore.collection('categories');
    let query = ref.orderBy('category', 'asc');

    // Filter by category if provided
    if (params.category) {
      const categoryArray = convertToArray(params.category);
      if (categoryArray.length > 0) {
        // Using 'in' operator instead of multiple 'or' filters for simplicity
        query = query.where('category', 'in', categoryArray);
      }
    }

    // Execute query
    const snapshot = await query.get();
    const data = [];

    // Return only category names if onlyname parameter exists
    if (params.onlyname || typeof params.onlyname === 'string') {
      snapshot.forEach(doc => {
        data.push(doc.get('category'));
      });
    } else {
      // Return full category objects
      snapshot.forEach(doc => {
        data.push(doc.data());
      });
    }

    // Send response
    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.statusCode = 400;
    res.end(JSON.stringify(createErrorResponse([['query', error.message]])));
  }
};

module.exports = {
  listCategories
};
