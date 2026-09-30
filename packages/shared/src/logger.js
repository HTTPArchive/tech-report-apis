/**
 * Structured logger for GCP Cloud Logging.
 * Formats all outputs as single-line JSON with an explicit severity field.
 */

function formatLog (severity, message, extra) {
  let logObj = { severity }

  if (message instanceof Error) {
    logObj.message = message.message
    logObj.stack = message.stack
    if (message.code) logObj.code = message.code
  } else if (typeof message === 'object' && message !== null) {
    logObj = { ...logObj, ...message, severity }
  } else if (message !== undefined) {
    logObj.message = String(message)
  }

  if (extra instanceof Error) {
    logObj.error = extra.message
    logObj.stack = extra.stack
    if (extra.code) logObj.code = extra.code
  } else if (typeof extra === 'object' && extra !== null) {
    logObj = { ...logObj, ...extra, severity }
  } else if (extra !== undefined) {
    logObj.details = extra
  }

  return JSON.stringify(logObj)
}

export const logger = {
  log: (message, extra) => console.log(formatLog('INFO', message, extra)),
  info: (message, extra) => console.info(formatLog('INFO', message, extra)),
  warn: (message, extra) => console.warn(formatLog('WARNING', message, extra)),
  error: (message, extra) => console.error(formatLog('ERROR', message, extra)),
  format: formatLog
}
