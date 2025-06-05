import { firestore } from '../utils/db.js';
import { executeQuery } from '../utils/controllerHelpers.js';

/**
 * List all rank options from database
 */
const listRanks = async (req, res) => {
  const queryBuilder = async () => {
    return firestore.collection('ranks').orderBy('mobile_origins', 'desc').select('rank');
  };

  await executeQuery(req, res, 'ranks', queryBuilder);
};

export {
  listRanks
};
