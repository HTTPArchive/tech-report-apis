import test from 'node:test'
import assert from 'node:assert'
import { formatCsv } from './storage.js'

test('formatCsv formats array of objects into CSV', () => {
  const data = [
    { body_hash: 'abc123hash', type: 'script', num_origins: 150, sample_url: 'https://example.com/a.js' },
    { body_hash: 'def456hash', type: 'css', num_origins: 200, sample_url: 'https://example.com/b,c.css' }
  ]

  const csv = formatCsv(data)
  const lines = csv.split('\n')

  assert.strictEqual(lines.length, 3)
  assert.strictEqual(lines[0], 'body_hash,type,num_origins,sample_url')
  assert.strictEqual(lines[1], 'abc123hash,script,150,https://example.com/a.js')
  assert.strictEqual(lines[2], 'def456hash,css,200,"https://example.com/b,c.css"')
})

test('formatCsv handles empty or non-array input', () => {
  assert.strictEqual(formatCsv([]), '')
  assert.strictEqual(formatCsv(null), '')
  assert.strictEqual(formatCsv(undefined), '')
})

test('file extension validation logic', () => {
  const isSupported = (name) => {
    const fileName = (name || '').toString().trim().toLowerCase()
    return fileName.endsWith('.csv') || fileName.endsWith('.json')
  }

  assert.strictEqual(isSupported('reports/public_hash_list.csv'), true)
  assert.strictEqual(isSupported('reports/summary.json'), true)
  assert.strictEqual(isSupported('reports/PUBLIC_HASH_LIST.CSV'), true)
  assert.strictEqual(isSupported('reports/summary.JSON'), true)
  assert.strictEqual(isSupported('reports/data.parquet'), false)
  assert.strictEqual(isSupported('reports/data.txt'), false)
  assert.strictEqual(isSupported(''), false)
  assert.strictEqual(isSupported(null), false)
})
