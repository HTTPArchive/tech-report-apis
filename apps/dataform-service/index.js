import functions from '@google-cloud/functions-framework'

import { BigQueryExport, logger, registerProcessLogging, withTraceContext } from '@httparchive/shared'
import { callRunJob } from './cloud_run.js'
import { StorageUpload } from './storage.js'

registerProcessLogging()

const projectId = 'httparchive'
const location = 'us-central1'
const jobId = 'bigquery-export'

const bigquery = new BigQueryExport({
  projectId,
  location: 'US'
})

function hasRequiredKeys (obj) {
  if (!obj || typeof obj !== 'object') return false
  const requiredKeys = ['destination', 'config', 'query']
  return requiredKeys.every(key => key in obj)
}

/**
 * Handle export requests.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
async function handleExport (req, res) {
  logger.info('Received export request', { body: req.body })
  try {
    let payload = req.body?.calls?.[0]?.[0]
    if (!payload) {
      res.status(400).json({
        replies: [400],
        errorMessage: 'Bad Request: no payload received, expected JSON object'
      })
      return
    }

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch (e) {
        logger.warn('Failed to parse payload string', e)
      }
    }

    if (!hasRequiredKeys(payload)) {
      res.status(400).json({
        replies: [400],
        errorMessage: 'Bad Request: unexpected payload structure, required keys: destination, config, query'
      })
      return
    }

    let { query, destination, config } = payload

    if (typeof config === 'string') {
      try {
        config = JSON.parse(config)
      } catch (e) {
        logger.warn('Failed to parse config string', e)
      }
    }

    if (destination === 'cloud_storage') {
      logger.info('Cloud Storage export', { query, config })

      const fileName = (config?.name || '').toString().trim().toLowerCase()

      if (fileName.endsWith('.csv')) {
        const data = await bigquery.queryResults(query)
        const storage = new StorageUpload(config.bucket)
        await storage.exportToCsv(data, config.name)
      } else if (fileName.endsWith('.json')) {
        const data = await bigquery.queryResults(query)
        const storage = new StorageUpload(config.bucket)
        await storage.exportToJson(data, config.name)
      } else {
        res.status(400).json({
          replies: [400],
          errorMessage: `Bad Request: unsupported object name extension for "${config?.name}". Expected .csv or .json`
        })
        return
      }
    } else if (destination === 'firestore') {
      logger.info('Firestore export', { payload })
      const jobName = `projects/${projectId}/locations/${location}/jobs/${jobId}`
      await callRunJob(jobName, payload)
    } else {
      const error = new Error('Bad Request: destination unknown')
      error.statusCode = 400
      throw error
    }

    res.status(200).json({
      replies: [200],
      message: 'Export job initialized'
    })
  } catch (error) {
    // Client errors must not trigger the ERROR alert
    if (error.statusCode === 400) {
      logger.warn('Export error', error)
    } else {
      logger.error('Export error', error)
    }
    res.status(400).json({
      replies: [400],
      errorMessage: error.message || error
    })
  }
}

/**
 * Main HTTP handler that routes requests based on path.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
async function mainHandler (req, res) {
  const path = req.path || req.url

  logger.info(`Received request for path: ${path}`, { path })

  if (path === '/health') {
    // Health check endpoint
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    })
  } else if (path === '/') {
    await handleExport(req, res)
  } else {
    res.status(404).json({
      error: 'Not Found',
      message: 'Available endpoints: /, /health'
    })
  }
}

/**
 * Main entry point for the Dataform export service.
 * Handles BigQuery export jobs.
 *
 * Routes:
 * - /: Handles BigQuery export jobs
 * - /health: Health check endpoint
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 *
 * Example export request payload:
 * {
 *   "calls": [[{
 *     "destination": "...",
 *     "config": "...",
 *     "query": "..."
 *   }]]
 * }
 */
// Correlate every log entry with the Cloud Run request log
functions.http('dataform-service', (req, res) => withTraceContext(req, () => mainHandler(req, res)))
