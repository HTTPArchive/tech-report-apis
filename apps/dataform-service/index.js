import functions from '@google-cloud/functions-framework'

import { BigQueryExport, logger, registerProcessLogging } from '@httparchive/shared'
import { callRunJob } from './cloud_run.js'
import { getCompilationResults, runWorkflow } from './dataform.js'
import { StorageUpload } from './storage.js'

registerProcessLogging()

const projectId = 'httparchive'
const location = 'us-central1'
const jobId = 'bigquery-export'

const bigquery = new BigQueryExport({
  projectId,
  location: 'US'
})

const TRIGGERS = {
  crux_ready: {
    type: 'poller',
    query: `
DECLARE previousMonth STRING DEFAULT FORMAT_DATE('%Y%m%d', DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 MONTH));
DECLARE previousMonth_YYYYMM STRING DEFAULT SUBSTR(previousMonth, 1, 6);

WITH crux AS (
  SELECT
    LOGICAL_AND(total_rows > 0) AS rows_available,
    LOGICAL_OR(TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_modified_time, HOUR) < 4) AS recent_last_modified
  FROM chrome-ux-report.materialized.INFORMATION_SCHEMA.PARTITIONS
  WHERE table_name IN ('device_summary', 'country_summary')
    AND partition_id IN (previousMonth, previousMonth_YYYYMM)
), report AS (
  SELECT MAX(partition_id) = previousMonth AS report_exists
  FROM httparchive.reports.INFORMATION_SCHEMA.PARTITIONS
  WHERE table_name = 'tech_crux'
    AND partition_id != '__NULL__'
)

SELECT
  (rows_available AND NOT report_exists)
    OR (rows_available AND recent_last_modified) AS condition
FROM crux, report;
    `,
    action: 'runDataformRepo',
    actionArgs: {
      repoName: 'crawl-data',
      tags: [
        'crux_ready',
        'crux_ready_reports'
      ]
    }
  },
  crawl_complete: {
    type: 'event',
    action: 'runDataformRepo',
    actionArgs: {
      repoName: 'crawl-data',
      tags: [
        'crawl_complete',
        'crawl_complete_reports'
      ]
    }
  }
}

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
        logger.error('Failed to parse payload string', e)
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
        logger.error('Failed to parse config string', e)
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
      throw new Error('Bad Request: destination unknown')
    }

    res.status(200).json({
      replies: [200],
      message: 'Export job initialized'
    })
  } catch (error) {
    logger.error('Export error', error)
    res.status(400).json({
      replies: [400],
      errorMessage: error.message || error
    })
  }
}

// Trigger functionality
/**
 * Handle trigger messages and trigger the appropriate action.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
async function handleTrigger (req, res) {
  try {
    const message = req.body.message
    if (!message) {
      const msg = 'no message received'
      logger.error(`Trigger error: ${msg}`, { body: req.body })
      res.status(400).send(`Bad Request: ${msg}`)
      return
    }

    const messageData = message.data
      ? JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'))
      : message
    if (!messageData) {
      logger.error('Bad Request: invalid message format', { message })
      res.status(400).send('Bad Request: invalid message format')
      return
    }

    const eventName = messageData.name
    if (!eventName) {
      logger.error('Bad Request: no trigger name found', { messageData })
      res.status(400).send('Bad Request: no trigger name found')
      return
    }

    if (TRIGGERS[eventName]) {
      const trigger = TRIGGERS[eventName]
      if (trigger.type === 'poller') {
        logger.info(`Poller action ${eventName}`, { eventName })

        const rows = await bigquery.queryResults(trigger.query)
        const result = rows.length > 0 && rows[0][Object.keys(rows[0])[0]] === true
        logger.info(`Query result: ${result}`, { result })
        if (result) {
          await executeAction(trigger.action, trigger.actionArgs)
        }
      } else if (trigger.type === 'event') {
        logger.info(`Event action ${eventName}`, { eventName })
        await executeAction(trigger.action, trigger.actionArgs)
      } else {
        logger.error(`No action found for event: ${eventName}`, { eventName })
        res.status(404).send(`No action found for event: ${eventName}`)
        return
      }
      res.status(200).send('Event processed successfully')
    } else {
      logger.error(`No action found for event: ${eventName}`, { eventName })
      res.status(404).send(`No action found for event: ${eventName}`)
    }
  } catch (error) {
    logger.error('Trigger handler error', error)
    res.status(500).send('Internal Server Error')
  }
}

/**
 * Execute action based on the trigger configuration.
 *
 * @param {string} actionName Action to execute.
 * @param {object} actionArgs Action arguments.
 */
async function executeAction (actionName, actionArgs) {
  if (actionName === 'runDataformRepo') {
    logger.info(`Executing action: ${actionName}`, { actionName })
    await runDataformRepo(actionArgs)
  }
}

/**
 * Run Dataform repo action.
 *
 * @param {object} args Action arguments.
 */
async function runDataformRepo (args) {
  const project = 'httparchive'
  const location = 'us-central1'
  const { repoName, tags } = args

  logger.info(`Triggering Dataform repo ${repoName} with tags: [${tags}].`, { repoName, tags })
  const repoURI = `projects/${project}/locations/${location}/repositories/${repoName}`

  const compilationResult = await getCompilationResults(repoURI)
  await runWorkflow(repoURI, compilationResult, tags)
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
  } else if (path === '/trigger' || path.startsWith('/trigger/')) {
    await handleTrigger(req, res)
  } else if (path === '/') {
    await handleExport(req, res)
  } else {
    res.status(404).json({
      error: 'Not Found',
      message: 'Available endpoints: /, /trigger, /health'
    })
  }
}

/**
 * Main entry point for the combined Dataform service.
 * Handles both trigger and export operations based on the request path.
 *
 * Routes:
 * - /trigger: Handles Dataform workflow triggers
 * - /: Handles BigQuery export jobs
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 *
 * Example trigger request payload:
 * {
 *  "message": {
 *     "name": "crux_ready"
 *   }
 * }
 *
 * Example export request payload:
 * {
 *   "calls": [[{
 *     "destination": "...",
 *     "config": "...",
 *     "query": "..."
 *   }]]
 * }
 *
 */
functions.http('dataform-service', mainHandler)
