import { Storage } from '@google-cloud/storage'
import { Readable } from 'stream'
import zlib from 'zlib'

const storage = new Storage()

export function formatCsv (data) {
  if (!Array.isArray(data) || data.length === 0) {
    return ''
  }
  const headers = Object.keys(data[0])
  const escapeCell = (val) => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const headerRow = headers.map(escapeCell).join(',')
  const rows = data.map(row => headers.map(h => escapeCell(row[h])).join(','))
  return [headerRow, ...rows].join('\n')
}

export class StorageUpload {
  constructor (bucket) {
    this.bucket = bucket
  }

  _createStream (content) {
    const stream = new Readable({
      read () {}
    })
    stream.push(content)
    stream.push(null)
    return stream
  }

  async exportToJson (data, fileName) {
    const bucket = storage.bucket(this.bucket)
    const file = bucket.file(fileName)

    const jsonData = JSON.stringify(data)
    const inputStream = this._createStream(jsonData)
    const gzip = zlib.createGzip()

    await new Promise((resolve, reject) => {
      inputStream
        .pipe(gzip)
        .pipe(file.createWriteStream({
          metadata: {
            contentEncoding: 'gzip',
            contentType: 'application/json'
          }
        }))
        .on('error', reject)
        .on('finish', () => {
          console.info(`File ${fileName} successfully written to ${this.bucket}`)
          resolve()
        })
    })
  }

  async exportToCsv (data, fileName) {
    const bucket = storage.bucket(this.bucket)
    const file = bucket.file(fileName)

    const csvData = formatCsv(data)
    const inputStream = this._createStream(csvData)
    const gzip = zlib.createGzip()

    await new Promise((resolve, reject) => {
      inputStream
        .pipe(gzip)
        .pipe(file.createWriteStream({
          metadata: {
            contentEncoding: 'gzip',
            contentType: 'text/csv'
          }
        }))
        .on('error', reject)
        .on('finish', () => {
          console.info(`File ${fileName} successfully written to ${this.bucket}`)
          resolve()
        })
    })
  }
}
