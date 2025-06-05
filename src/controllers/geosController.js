import { firestore } from '../utils/db.js';
import { executeQuery } from '../utils/controllerHelpers.js';

/**
 * List all geographic locations from database
 */
const listGeos = async (req, res) => {
  const queryBuilder = async () => {
    return firestore.collection('geos').orderBy('mobile_origins', 'desc').select('geo');
  };

  await executeQuery(req, res, 'geos', queryBuilder);
};

export {
  listGeos
};
