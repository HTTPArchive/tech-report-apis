import { DataformClient } from '@google-cloud/dataform'
import { logger } from '@httparchive/shared'

const dataformClient = new DataformClient()

/**
 * Get Dataform compilation result.
 *
 * @param {string} repoURI Dataform repository URI.
 * @returns {object} Compilation result.
 */
export async function getCompilationResults (repoURI) {
  const request = {
    parent: repoURI,
    compilationResult: {
      releaseConfig: `${repoURI}/releaseConfigs/production`
    }
  }

  logger.info('Creating Dataform compilation result', { request })
  const [response] = await dataformClient.createCompilationResult(request)
  logger.info(`Compilation result created: ${response.name}`, { compilationResult: response.name })
  return response.name
}

/**
 * Run Dataform workflow.
 *
 * @param {string} repoURI Dataform repository URI.
 * @param {string} compilationResult Dataform compilation result.
 * @param {object} tags Dataform tags.
 * @returns
 */
export async function runWorkflow (repoURI, compilationResult, tags) {
  const request = {
    parent: repoURI,
    workflowInvocation: {
      compilationResult,
      invocationConfig: {
        includedTags: tags,
        fullyRefreshIncrementalTablesEnabled: false,
        transitiveDependenciesIncluded: false,
        transitiveDependentsIncluded: false
      }
    }
  }

  logger.info('Invoking Dataform workflow', { request })
  const [response] = await dataformClient.createWorkflowInvocation(request)
  logger.info(`Workflow invoked: ${response.name}`, { workflowInvocation: response.name })
}
