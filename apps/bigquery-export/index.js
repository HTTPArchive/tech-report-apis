import { logger, registerProcessLogging } from '@httparchive/shared'
import { FirestoreBatch } from './firestore.js'

registerProcessLogging({ exitOnUnhandledRejection: true })

async function main () {
  const { query, destination, config } = process.env.EXPORT_CONFIG && JSON.parse(process.env.EXPORT_CONFIG)

  if (destination === 'firestore') {
    logger.info('Starting Firestore export', { query, config })

    const firestore = new FirestoreBatch()
    await firestore.export(query, config)
  }

  logger.info('Export finished successfully')
  return 'OK'
}

await main().catch((error) => {
  logger.error('Export failed', error)
  process.exit(1)
})
