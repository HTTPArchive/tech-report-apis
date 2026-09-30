import test from 'node:test'
import assert from 'node:assert'
import { logger } from './index.js'

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
  assert.ok(parsed.stack)
})

test('logger format handles message with Error extra', () => {
  const err = new Error('Database connection failed')

  const jsonStr = logger.format('ERROR', 'Operation failed', err)
  const parsed = JSON.parse(jsonStr)

  assert.strictEqual(parsed.severity, 'ERROR')
  assert.strictEqual(parsed.message, 'Operation failed')
  assert.strictEqual(parsed.error, 'Database connection failed')
  assert.ok(parsed.stack)
})
