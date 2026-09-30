/**
 * Structured logger for GCP Cloud Logging.
 * Formats all outputs as single-line JSON with an explicit severity field.
 * Error stacks go to `stack_trace`, which Error Reporting recognizes.
 */

function serializeCause (cause) {
  if (cause instanceof Error) {
    const serialized = { message: cause.message, stack: cause.stack }
    if (cause.code !== undefined) serialized.code = cause.code
    if (cause.cause !== undefined) serialized.cause = serializeCause(cause.cause)
    return serialized
  }
  return cause
}

function errorFields (error) {
  const fields = { stack_trace: error.stack }
  if (error.code !== undefined) fields.code = error.code
  if (error.details !== undefined) fields.details = error.details
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
    logObj = { message: message.message, ...errorFields(message) }
  } else if (typeof message === 'object' && message !== null) {
    logObj = { ...message }
  } else if (message !== undefined) {
    logObj.message = String(message)
  }

  if (extra instanceof Error) {
    logObj = { ...logObj, error: extra.message, ...errorFields(extra) }
  } else if (typeof extra === 'object' && extra !== null) {
    // Metadata must not override the primary message
    logObj = { ...extra, ...logObj }
  } else if (extra !== undefined) {
    logObj.details = extra
  }

  return safeStringify({ ...logObj, severity })
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
