/**
 * Structured logger for GCP Cloud Logging.
 * Formats all outputs as single-line JSON with an explicit severity field.
 * ERROR stacks go to `stack_trace`, which Error Reporting recognizes;
 * lower severities use `stack` so they don't create Error Reporting groups.
 * Entries logged inside withTraceContext() carry the request's trace, so Cloud
 * Logging nests them under the Cloud Run request log.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

const traceContext = new AsyncLocalStorage()

/**
 * Builds Cloud Logging trace fields from Cloud Run request headers.
 * Prefers W3C `traceparent`, falls back to `X-Cloud-Trace-Context`.
 * @param {object} headers Lowercased request headers
 * @param {string} [projectId]
 * @returns {object} Special `logging.googleapis.com/*` fields, or {} without a trace
 */
export function traceFields (headers = {}, projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT) {
  if (!projectId) return {}

  let traceId, spanId, sampled
  // 00-<32 hex trace id>-<16 hex span id>-<flags>
  const w3c = /^[\da-f]{2}-([\da-f]{32})-([\da-f]{16})-([\da-f]{2})$/i.exec(headers.traceparent || '')
  if (w3c) {
    [, traceId, spanId] = w3c
    sampled = (parseInt(w3c[3], 16) & 1) === 1
  } else {
    // <32 hex trace id>/<decimal span id>;o=<0|1>
    const legacy = /^([\da-f]{32})(?:\/(\d+))?(?:;o=([01]))?/i.exec(headers['x-cloud-trace-context'] || '')
    if (!legacy) return {}
    traceId = legacy[1]
    spanId = legacy[2] && BigInt(legacy[2]).toString(16).padStart(16, '0')
    sampled = legacy[3] === '1'
  }

  const fields = { 'logging.googleapis.com/trace': `projects/${projectId}/traces/${traceId.toLowerCase()}` }
  if (spanId) fields['logging.googleapis.com/spanId'] = spanId
  if (sampled !== undefined) fields['logging.googleapis.com/trace_sampled'] = sampled
  return fields
}

/**
 * Runs `fn` so that every log entry written during it, including after awaits,
 * is correlated with the request's trace.
 * @param {object} req HTTP request
 * @param {Function} fn Request handler body
 */
export function withTraceContext (req, fn) {
  return traceContext.run(traceFields(req?.headers), fn)
}

function serializeCause (cause) {
  if (cause instanceof Error) {
    const serialized = { message: cause.message, stack: cause.stack }
    if (cause.code !== undefined) serialized.code = cause.code
    if (cause.cause !== undefined) serialized.cause = serializeCause(cause.cause)
    return serialized
  }
  return cause
}

function errorFields (error, severity) {
  const fields = { [severity === 'ERROR' ? 'stack_trace' : 'stack']: error.stack }
  if (error.code !== undefined) fields.code = error.code
  if (error.details !== undefined) fields.details = error.details
  if (error.reason !== undefined) fields.reason = error.reason
  if (error.statusCode !== undefined) fields.statusCode = error.statusCode
  // GCP ApiError (BigQuery, GCS) sub-errors with reason/location, or AggregateError members
  if (Array.isArray(error.errors)) fields.errors = error.errors.map(serializeCause)
  if (error.cause !== undefined) fields.cause = serializeCause(error.cause)
  return fields
}

function bigintReplacer (_key, value) {
  return typeof value === 'bigint' ? value.toString() : value
}

function circularSafeReplacer () {
  const seen = new WeakSet()
  return (key, value) => {
    value = bigintReplacer(key, value)
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  }
}

// Logging must never throw, especially from inside catch blocks
function safeStringify (logObj) {
  try {
    return JSON.stringify(logObj, bigintReplacer)
  } catch {
    try {
      return JSON.stringify(logObj, circularSafeReplacer())
    } catch (error) {
      return JSON.stringify({
        severity: logObj.severity,
        message: String(logObj.message),
        loggerError: `Failed to serialize log entry: ${error.message}`
      })
    }
  }
}

function formatLog (severity, message, extra) {
  let logObj = {}

  if (message instanceof Error) {
    logObj = { message: message.message, ...errorFields(message, severity) }
  } else if (typeof message === 'object' && message !== null) {
    logObj = { ...message }
  } else if (message !== undefined) {
    logObj.message = String(message)
  }

  if (extra instanceof Error) {
    // Keep the reason on the Logs Explorer summary line, not only in `error`
    if (logObj.message) logObj.message = `${logObj.message}: ${extra.message}`
    logObj = { ...logObj, error: extra.message, ...errorFields(extra, severity) }
  } else if (typeof extra === 'object' && extra !== null) {
    // Metadata must not override the primary message
    logObj = { ...extra, ...logObj }
  } else if (extra !== undefined) {
    logObj.details = extra
  }

  return safeStringify({ ...logObj, ...traceContext.getStore(), severity })
}

export const logger = {
  log: (message, extra) => console.log(formatLog('INFO', message, extra)),
  info: (message, extra) => console.log(formatLog('INFO', message, extra)),
  warn: (message, extra) => console.warn(formatLog('WARNING', message, extra)),
  error: (message, extra) => console.error(formatLog('ERROR', message, extra)),
  format: formatLog
}

/**
 * Logs Node runtime warnings and unhandled rejections as structured entries.
 * Run with NODE_NO_WARNINGS=1 so warnings aren't also printed unstructured.
 * @param {object} [options]
 * @param {boolean} [options.exitOnUnhandledRejection] Exit with code 1 after logging,
 *   restoring Node's default crash behavior that a listener would otherwise suppress.
 */
export function registerProcessLogging ({ exitOnUnhandledRejection = false } = {}) {
  process.on('warning', (warning) => {
    logger.warn(`Node runtime warning: ${warning.message}`, {
      warningName: warning.name,
      stack: warning.stack,
      type: 'NodeRuntimeWarning'
    })
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', reason instanceof Error ? reason : { reason })
    if (exitOnUnhandledRejection) process.exit(1)
  })
}
