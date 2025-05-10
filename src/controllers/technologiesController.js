const firestore = require('../utils/db');
const { convertToArray, createSuccessResponse, createErrorResponse } = require('../utils/helpers');

// Technology Presenter
const presentTechnology = (item) => {
  return {
    technology: item.technology,
    category: item.category,
    description: item.description,
    icon: item.icon,
    origins: item.origins
  };
};

/**
 * List technologies with optional filtering
 */
const listTechnologies = async (req, res) => {
  try {
    const params = req.query;
    let ref = firestore.collection('technologies');
    let query = ref.orderBy('technology', 'asc');

    // Filter by technology if provided
    if (params.technology) {
      const techArray = convertToArray(params.technology);
      if (techArray.length > 0) {
        // Using 'in' operator instead of multiple 'or' filters for simplicity
        query = query.where('technology', 'in', techArray);
      }
    }

    // Filter by category if provided
    if (params.category) {
      const categoryArray = convertToArray(params.category);
      if (categoryArray.length > 0) {
        query = query.where('category_obj', 'array-contains-any', categoryArray);
      }
    }

    // Execute query
    const snapshot = await query.get();
    const data = [];

    if (params.onlyname || typeof params.onlyname === 'string') {
      // Return only technology names if onlyname parameter exists
      snapshot.forEach(doc => {
        data.push(doc.get('technology'));
      });
    } else {
      // Return full technology objects
      snapshot.forEach(doc => {
        data.push(presentTechnology(doc.data()));
      });
    };

    // Send response
    res.status(200).send(createSuccessResponse(data));
  } catch (error) {
    console.error('Error fetching technologies:', error);
    res.status(400).send(createErrorResponse([['query', error.message]]));
  }
};

module.exports = {
  listTechnologies
};
