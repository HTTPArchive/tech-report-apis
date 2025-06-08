import { getRanksFromBQ } from '../utils/bigquery.js';
import { executeBigQuery } from '../utils/controllerHelpers.js';

/**
 * List all rank options from BigQuery
 */
const listRanks = async (req, res) => {
  const queryExecutor = async () => {
    return await getRanksFromBQ();
  };

  await executeBigQuery(req, res, 'ranks', queryExecutor);
};

export {
  listRanks
};
