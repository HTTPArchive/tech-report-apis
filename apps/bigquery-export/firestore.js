import { Firestore, FieldPath } from '@google-cloud/firestore'
import { BigQueryExport, logger } from '@httparchive/shared'

export class FirestoreBatch {
  constructor() {
    this.firestore = new Firestore({
      gaxOptions: {
        grpc: {
          max_receive_message_length: 500 * 1024 * 1024, // 500MB
          max_send_message_length: 500 * 1024 * 1024, // 500MB
          'grpc.max_connection_idle_ms': 5 * 60 * 1000, // 5 minutes
          'grpc.keepalive_time_ms': 30 * 1000, // 30 seconds
          'grpc.keepalive_timeout_ms': 60 * 1000, // 1 minute
          'grpc.keepalive_permit_without_calls': true
        }
      }
    })
    this.bigquery = new BigQueryExport()

    // Configuration constants
    this.config = {
      timeout: 10 * 60 * 1000, // 10 minutes
      progressReportInterval: 100000, // Report progress every N operations
      flushThreshold: 50000, // Flush BulkWriter every N operations
      gcInterval: 50000 // Force garbage collection interval
    }

    this.reset()
  }

  // Memory monitoring utility
  logMemoryUsage(operation = '') {
    const used = process.memoryUsage()
    const memoryInfo = {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100
    }

    logger.info(`Memory usage ${operation}: RSS ${memoryInfo.rss}MB, Heap Used ${memoryInfo.heapUsed}MB, Heap Total ${memoryInfo.heapTotal}MB, External ${memoryInfo.external}MB`, { memoryInfo, operation })

    // Configurable memory warning threshold from environment
    const warningThreshold = parseInt(process.env.MEMORY_WARNING_THRESHOLD_MB || '1500')
    if (memoryInfo.heapUsed > warningThreshold) {
      logger.warn(`High memory usage detected: ${memoryInfo.heapUsed}MB heap used (threshold: ${warningThreshold}MB)`, { heapUsed: memoryInfo.heapUsed, warningThreshold })
    }

    return memoryInfo
  }

  // Enhanced reset with memory cleanup
  reset() {
    this.processedDocs = 0
    this.totalDocs = 0
    this.pendingCount = 0
    this.failedWrites = 0

    // Clean up existing BulkWriter if it exists
    if (this.bulkWriter) {
      try {
        this.bulkWriter.close()
      } catch (error) {
        logger.warn('Error closing existing BulkWriter', error)
      }
    }
    this.bulkWriter = null

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    // Log memory usage after reset
    this.logMemoryUsage('after reset')
  }

  createBulkWriter(operation) {
    const bulkWriter = this.firestore.bulkWriter({
      isThrottlingEnabled: false,
      maxBatchSize: 500
    })

    // Configure error handling with progress info
    bulkWriter.onWriteError((error) => {
      const progressInfo = this.totalDocs > 0 ? ` (${this.processedDocs}/${this.totalDocs})` : ''
      // Log only identifying fields; a stack per retried write adds nothing
      const writeError = {
        error: error.message,
        code: error.code,
        operationType: error.operationType,
        documentPath: error.documentRef?.path,
        failedAttempts: error.failedAttempts
      }
      logger.warn(`${operation} operation failed${progressInfo}: ${error.message}`, writeError)

      // Limit retry attempts to prevent infinite retry loops on persistent transient errors
      const MAX_RETRIES = 5
      if (error.failedAttempts >= MAX_RETRIES) {
        logger.error(`Operation failed after ${error.failedAttempts} attempts. Skipping/failing.`, writeError)
        this.pendingCount--
        this.failedWrites++
        return false
      }

      // Retry on transient errors, fail on permanent ones
      const retryableErrorCodes = [
        4,  // DEADLINE_EXCEEDED
        8,  // RESOURCE_EXHAUSTED
        10, // ABORTED
        14  // UNAVAILABLE
      ]
      const retryableErrorStrings = [
        'deadline-exceeded',
        'unavailable',
        'resource-exhausted',
        'aborted'
      ]

      const isRetryable =
        retryableErrorCodes.includes(error.code) ||
        (typeof error.code === 'string' && retryableErrorStrings.includes(error.code.toLowerCase()))

      if (isRetryable) {
        logger.info(`Retrying failed operation (attempt ${error.failedAttempts + 1}/${MAX_RETRIES})...`, { attempt: error.failedAttempts + 1 })
        return true
      }

      this.pendingCount--
      this.failedWrites++
      return false
    })

    // Track progress on successful writes
    bulkWriter.onWriteResult(() => {
      this.processedDocs++
      this.pendingCount--

      // Report progress periodically
      if (this.processedDocs % this.config.progressReportInterval === 0) {
        const progressInfo = this.totalDocs > 0 ? ` (${this.processedDocs}/${this.totalDocs})` : ` (${this.processedDocs} processed)`
        logger.info(`Progress${progressInfo} - ${operation}ing documents in ${this.collectionName}`, { processedDocs: this.processedDocs, totalDocs: this.totalDocs })

        // Force garbage collection periodically
        if (this.processedDocs % this.config.gcInterval === 0 && global.gc) {
          global.gc()
        }
      }
    })

    return bulkWriter
  }

  assertNoFailedWrites(operation) {
    if (this.failedWrites > 0) {
      throw new Error(`${this.failedWrites} ${operation} operations failed in ${this.collectionName}`)
    }
  }

  async waitIfNeeded() {
    const limit = 100000
    const target = 50000
    if (this.pendingCount > limit) {
      logger.info(`Pipeline full (${this.pendingCount} pending). Waiting for queue to drain below ${target}...`, { pendingCount: this.pendingCount })
      while (this.pendingCount > target) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      logger.info(`Pipeline drained (${this.pendingCount} pending). Resuming...`, { pendingCount: this.pendingCount })

      // Force garbage collection after queue drains
      if (global.gc) {
        global.gc()
      }
    }
  }

  buildQuery(collectionRef) {
    const queryMap = {
      report: () => {
        logger.info(`Deleting documents from ${this.collectionName} for date ${this.date}`, { collection: this.collectionName, date: this.date })
        return collectionRef.where('date', '==', this.date)
      },
      dict: () => {
        logger.info(`Deleting documents from ${this.collectionName}`, { collection: this.collectionName })
        return collectionRef
      }
    }

    const queryBuilder = queryMap[this.collectionType]
    if (!queryBuilder) {
      throw new Error(`Invalid collection type: ${this.collectionType}`)
    }

    return queryBuilder()
  }

  async getDocumentCount(query) {
    try {
      const countSnapshot = await query.count().get()
      return countSnapshot.data().count
    } catch (error) {
      logger.warn('Could not get document count for progress tracking', error)
      return 0
    }
  }

  async batchDelete() {
    logger.info('Starting batch deletion...')
    const startTime = Date.now()
    this.reset()

    const collectionRef = this.firestore.collection(this.collectionName)
    const collectionQuery = this.buildQuery(collectionRef)

    // Get total count for progress tracking
    this.totalDocs = await this.getDocumentCount(collectionQuery)
    if (this.totalDocs > 0) {
      logger.info(`Total documents to delete: ${this.totalDocs}`, { totalDocs: this.totalDocs })
    }

    // Create BulkWriter for delete operations
    this.bulkWriter = this.createBulkWriter('delet')

    const pageSize = 10000 // 10,000 documents per query page

    try {
      // Split the deletion query into 4 parallel partitions manually using document ID ranges
      // Optimized for lowercase strings/domain names (e.g. h, o, v splits)
      const partitions = [
        { start: '', end: 'h' },
        { start: 'h', end: 'o' },
        { start: 'o', end: 'v' },
        { start: 'v', end: '\uf8ff' }
      ]

      logger.info(`Split deletion into ${partitions.length} manual parallel partitions`, { partitionsCount: partitions.length })

      await Promise.all(partitions.map(async (partition, index) => {
        let lastDocId = null
        let partitionDeletedCount = 0

        while (true) {
          let pageQuery = collectionQuery
            .select()
            .orderBy(FieldPath.documentId())
            .limit(pageSize)

          if (lastDocId) {
            pageQuery = pageQuery.startAfter(lastDocId)
          } else if (partition.start !== '') {
            pageQuery = pageQuery.startAt(partition.start)
          }

          if (partition.end) {
            pageQuery = pageQuery.endBefore(partition.end)
          }

          const snapshot = await pageQuery.get()
          if (snapshot.empty) {
            break
          }

          // Remember the last document ID of the sorted page for query cursor pagination
          lastDocId = snapshot.docs[snapshot.docs.length - 1].id

          // Shuffle document references in memory to prevent sequential index updates (hotspotting)
          const docs = [...snapshot.docs]
          for (let i = docs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const temp = docs[i]
            docs[i] = docs[j]
            docs[j] = temp
          }

          for (const doc of docs) {
            // Failures are counted in onWriteError and checked after flush
            this.bulkWriter.delete(doc.ref).catch(() => {})
            this.pendingCount++
            partitionDeletedCount++
          }

          // Wait if the pending operations queue is too full
          await this.waitIfNeeded()
        }
        logger.info(`Partition ${index + 1}/${partitions.length} complete. Deleted ${partitionDeletedCount} documents.`, { partition: index + 1, partitionDeletedCount })
      }))
    } catch (error) {
      logger.error('Error during batch deletion pagination', error)
      throw error
    }

    // Final flush and close
    logger.info('Finalizing deletion operations...')
    await this.bulkWriter.flush()
    await this.bulkWriter.close()
    this.assertNoFailedWrites('delete')

    const duration = (Date.now() - startTime) / 1000
    logger.info(`Deletion complete. Total docs deleted: ${this.processedDocs}. Time: ${duration} seconds`, { processedDocs: this.processedDocs, durationSeconds: duration })
  }

  async streamFromBigQuery(rowStream) {
    logger.info('Starting BigQuery to Firestore transfer...')
    const startTime = Date.now()
    this.reset()

    // Create BulkWriter for write operations
    this.bulkWriter = this.createBulkWriter('writ')

    let rowCount = 0
    const collectionRef = this.firestore.collection(this.collectionName)

    try {
      for await (const row of rowStream) {
        // Add document to BulkWriter
        const docRef = collectionRef.doc()
        // Failures are counted in onWriteError and checked after flush
        this.bulkWriter.set(docRef, row).catch(() => {})
        this.pendingCount++
        rowCount++
        this.totalDocs = rowCount // Update totalDocs for progress tracking

        // Wait if the pending operations queue is too full
        await this.waitIfNeeded()
      }
    } catch (error) {
      logger.error('Error during BigQuery streaming', error)
      throw error
    }

    // Final flush and close
    logger.info('Finalizing write operations...')
    await this.bulkWriter.flush()
    await this.bulkWriter.close()
    this.assertNoFailedWrites('write')

    // Final garbage collection
    if (global.gc) {
      global.gc()
    }

    const duration = (Date.now() - startTime) / 1000
    logger.info(`Transfer to ${this.collectionName} complete. Total rows processed: ${this.processedDocs}. Time: ${duration} seconds`, { processedDocs: this.processedDocs, durationSeconds: duration })
  }

  async export(query, exportConfig) {
    logger.info(`Starting export to ${exportConfig.collection}...`, { collection: exportConfig.collection })
    this.logMemoryUsage('at start')

    // Configure Firestore settings
    this.firestore.settings({
      databaseId: exportConfig.database,
      timeout: this.config.timeout
    })

    // Set instance properties
    Object.assign(this, {
      collectionName: exportConfig.collection,
      collectionType: exportConfig.type,
      date: exportConfig.date
    })

    try {
      await this.batchDelete()
      this.logMemoryUsage('after deletion')

      const rowStream = await this.bigquery.queryResultsStream(query)
      await this.streamFromBigQuery(rowStream)

      this.logMemoryUsage('at completion')
      logger.info(`Export to ${exportConfig.collection} completed successfully`, { collection: exportConfig.collection })
    } catch (error) {
      this.logMemoryUsage('on error')

      // Avoid dumping the massive Firestore client instance (contained in documentRef)
      if (error && error.documentRef) {
        const cleanError = {
          error: error.message,
          code: error.code,
          documentPath: error.documentRef.path,
          failedAttempts: error.failedAttempts
        }
        logger.error(`Export to ${exportConfig.collection} failed`, cleanError)
        throw new Error(`Export failed at document ${cleanError.documentPath}: ${cleanError.error} (code: ${cleanError.code})`, { cause: error })
      }

      logger.error(`Export to ${exportConfig.collection} failed`, error)
      throw error
    }
  }
}
