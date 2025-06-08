import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.PROJECT || 'httparchive'
});

// BigQuery configuration optimizations
const BQ_CONFIG = {
  // Optimize for BI Engine
  location: 'US', // Use the same location as your BI Engine
  // Use maximum parallelism for BI Engine
  maximumBytesBilled: '100000000', // 100MB limit for safety
  // Labels for monitoring
  labels: {
    'app': 'tech-report-api',
    'source': 'bigquery-direct',
  }
};

/**
 * Execute a BigQuery query with caching support
 * @param {string} query - SQL query string
 * @param {Object} options - Query options
 * @returns {Array} - Query results
 */
const executeBigQueryQuery = async (query, options = {}) => {
  try {
    const queryOptions = {
      query,

      jobCreationMode: 'JOB_CREATION_OPTIONAL', // Returning immediate results is prioritized.
      timeoutMs: 10000, // 10 seconds
      // Use query cache when possible
      useQueryCache: true,
      // Apply BI Engine optimizations
      ...BQ_CONFIG,
      ...options
    };

    console.log('Executing BigQuery:', query);
    const [rows, , metadata] = await bigquery.query(queryOptions);
    if(metadata.jobReference) {
        console.log(`BigQuery job ${metadata.jobReference.jobId} completed. Rows: ${rows.length}`);
    }

    return rows;
  } catch (error) {
    console.error('BigQuery execution error:', error);
    throw error;
  }
};

/**
 * Get ranks from BigQuery
 * @returns {Array} - Array of rank objects
 */
const getRanksFromBQ = async () => {
  const query = `
    SELECT rank
    FROM \`httparchive.reports.tech_report_ranks\`
    ORDER BY mobile_origins DESC
  `;

  const rows = await executeBigQueryQuery(query);
  return rows.map(row => ({ rank: row.rank }));
};

/**
 * Get geos from BigQuery
 * @returns {Array} - Array of geo objects
 */
const getGeosFromBQ = async () => {
  const query = `
    SELECT geo
    FROM \`httparchive.reports.tech_report_geos\`
    ORDER BY mobile_origins DESC
  `;

  const rows = await executeBigQueryQuery(query);
  return rows.map(row => ({ geo: row.geo }));
};

export {
  bigquery,
  executeBigQueryQuery,
  getRanksFromBQ,
  getGeosFromBQ
};
