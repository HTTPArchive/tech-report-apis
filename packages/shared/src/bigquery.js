import { BigQuery } from '@google-cloud/bigquery'
import { logger } from './logger.js'

export class BigQueryExport {
  constructor (options = {}) {
    options.projectId = options.projectId || 'httparchive'
    options.location = options.location || 'US'
    this.bigquery = new BigQuery(options)
  }

  async queryResults (query) {
    const options = {
      query,
      projectId: this.projectId,
      location: this.location
    }

    const [job] = await this.bigquery.createQueryJob(options)
    logger.info(`Running BigQuery query: ${job.id}`, { jobId: job.id })
    const [rows] = await job.getQueryResults()
    logger.info('Fetching query results completed', { jobId: job.id, rowCount: rows.length })
    return rows
  }

  async queryResultsStream (query) {
    const options = {
      query,
      projectId: this.projectId,
      location: this.location
    }

    const [job] = await this.bigquery.createQueryJob(options)
    logger.info(`Running BigQuery query: ${job.id}`, { jobId: job.id })
    const rows = job.getQueryResultsStream()
    return rows
  }
}
