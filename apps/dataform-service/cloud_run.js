import run from '@google-cloud/run'
import { logger } from '@httparchive/shared'

// Export functionality
export async function callRunJob (name, payload = {}) {
  const client = new run.v2.JobsClient()

  const request = {
    name,
    overrides: {
      containerOverrides: [{
        env: [
          {
            name: 'EXPORT_CONFIG',
            value: JSON.stringify(payload)
          }
        ]
      }]
    }
  }

  const [operation] = await client.runJob(request)

  logger.info(`Job initialized: ${operation.name}`, { job: operation.name })
}
