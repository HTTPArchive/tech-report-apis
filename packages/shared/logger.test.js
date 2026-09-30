import test from 'node:test'
import assert from 'node:assert'
import { logger, traceFields, withTraceContext } from './index.js'

test('logger format outputs structured JSON with severity', () => {
  const jsonStr = logger.format('INFO', 'Test info message', { extraKey: 'val' })
  const parsed = JSON.parse(jsonStr)

  assert.strictEqual(parsed.severity, 'INFO')
  assert.strictEqual(parsed.message, 'Test info message')
  assert.strictEqual(parsed.extraKey, 'val')
})

test('logger format handles Error objects correctly', () => {
  const err = new Error('Test failure')
  err.code = 'ERR_TEST'

  const jsonStr = logger.format('ERROR', err)
  const parsed = JSON.parse(jsonStr)

  assert.strictEqual(parsed.severity, 'ERROR')
  assert.strictEqual(parsed.message, 'Test failure')
  assert.strictEqual(parsed.code, 'ERR_TEST')
  assert.ok(parsed.stack_trace)
})

test('logger format handles message with Error extra', () => {
  const err = new Error('Database connection failed')

  const jsonStr = logger.format('ERROR', 'Operation failed', err)
  const parsed = JSON.parse(jsonStr)

  assert.strictEqual(parsed.severity, 'ERROR')
  assert.strictEqual(parsed.message, 'Operation failed: Database connection failed')
  assert.strictEqual(parsed.error, 'Database connection failed')
  assert.ok(parsed.stack_trace)
})

test('logger format keeps warning stacks out of stack_trace', () => {
  const parsed = JSON.parse(logger.format('WARNING', 'Retrying', new Error('Transient')))

  assert.strictEqual(parsed.stack_trace, undefined)
  assert.ok(parsed.stack)
})

test('logger format includes API sub-errors and status code', () => {
  const err = new Error('Syntax error')
  err.statusCode = 400
  err.errors = [{ reason: 'invalidQuery', location: 'query', message: 'Syntax error: [3:15]' }]

  const parsed = JSON.parse(logger.format('ERROR', 'Query failed', err))

  assert.strictEqual(parsed.statusCode, 400)
  assert.strictEqual(parsed.errors[0].reason, 'invalidQuery')
})

test('logger format keeps the primary message when extra has a message key', () => {
  const parsed = JSON.parse(logger.format('ERROR', 'Export failed', { message: 'raw error', code: 5 }))

  assert.strictEqual(parsed.message, 'Export failed')
  assert.strictEqual(parsed.code, 5)
})

test('logger format never lets extra override severity', () => {
  const parsed = JSON.parse(logger.format('ERROR', 'Failure', { severity: 'DEBUG' }))

  assert.strictEqual(parsed.severity, 'ERROR')
})

test('logger format serializes circular structures without throwing', () => {
  const circular = { a: 1 }
  circular.self = circular

  const parsed = JSON.parse(logger.format('ERROR', 'Unhandled Rejection', { reason: circular }))

  assert.strictEqual(parsed.message, 'Unhandled Rejection')
  assert.strictEqual(parsed.reason.a, 1)
  assert.strictEqual(parsed.reason.self, '[Circular]')
})

test('logger format serializes BigInt values as strings', () => {
  const parsed = JSON.parse(logger.format('INFO', 'Rows', { count: 10n }))

  assert.strictEqual(parsed.count, '10')
})

test('logger format includes error cause and details', () => {
  const root = new Error('Firestore write failed')
  root.code = 14
  const err = new Error('Export failed', { cause: root })
  err.details = 'UNAVAILABLE'

  const parsed = JSON.parse(logger.format('ERROR', 'Job failed', err))

  assert.strictEqual(parsed.message, 'Job failed: Export failed')
  assert.strictEqual(parsed.error, 'Export failed')
  assert.strictEqual(parsed.details, 'UNAVAILABLE')
  assert.strictEqual(parsed.cause.message, 'Firestore write failed')
  assert.strictEqual(parsed.cause.code, 14)
  assert.ok(parsed.cause.stack)
})

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'

test('traceFields parses W3C traceparent', () => {
  const fields = traceFields({ traceparent: `00-${TRACE_ID}-00f067aa0ba902b7-01` }, 'httparchive')

  assert.strictEqual(fields['logging.googleapis.com/trace'], `projects/httparchive/traces/${TRACE_ID}`)
  assert.strictEqual(fields['logging.googleapis.com/spanId'], '00f067aa0ba902b7')
  assert.strictEqual(fields['logging.googleapis.com/trace_sampled'], true)
})

test('traceFields falls back to X-Cloud-Trace-Context with a decimal span id', () => {
  const fields = traceFields({ 'x-cloud-trace-context': `${TRACE_ID}/1;o=0` }, 'httparchive')

  assert.strictEqual(fields['logging.googleapis.com/trace'], `projects/httparchive/traces/${TRACE_ID}`)
  assert.strictEqual(fields['logging.googleapis.com/spanId'], '0000000000000001')
  assert.strictEqual(fields['logging.googleapis.com/trace_sampled'], false)
})

test('traceFields returns nothing without a project or a trace header', () => {
  assert.deepStrictEqual(traceFields({ traceparent: `00-${TRACE_ID}-00f067aa0ba902b7-01` }, ''), {})
  assert.deepStrictEqual(traceFields({}, 'httparchive'), {})
})

test('withTraceContext adds the trace to entries logged after an await', async () => {
  process.env.GOOGLE_CLOUD_PROJECT = 'httparchive'
  const req = { headers: { traceparent: `00-${TRACE_ID}-00f067aa0ba902b7-01` } }

  const parsed = await withTraceContext(req, async () => {
    await new Promise(resolve => setTimeout(resolve, 1))
    return JSON.parse(logger.format('INFO', 'Inside request'))
  })

  assert.strictEqual(parsed['logging.googleapis.com/trace'], `projects/httparchive/traces/${TRACE_ID}`)
  assert.strictEqual(JSON.parse(logger.format('INFO', 'Outside request'))['logging.googleapis.com/trace'], undefined)
  delete process.env.GOOGLE_CLOUD_PROJECT
})
