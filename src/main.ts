import * as core from '@actions/core'
import * as logger from './logger'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    logger.info(`Initializing ...`)
    logger.info(`Token ... ${core.getInput('github.token')}`)
    const client = github.getOctokit(core.getInput('github.token'))
    const eventName = github.context.eventName

    let base: string | undefined
    let head: string | undefined

    if (eventName === 'pull_request') {
      base = github.context.payload.pull_request?.base?.sha
      head = github.context.payload.pull_request?.head?.sha
    } else if (eventName === 'push') {
      base = github.context.payload.before
      head = github.context.payload.after
    }

    if (!base || !head) {
      logger.error('Missing data from Github.')

      base = ''
      head = ''
    }

    const response = await client.rest.repos.compareCommits({
      base,
      head,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })

    if (response.data.status !== 'ahead') {
      logger.error(`head commit must be ahead of base commit.`)
      return
    }
    const files = response.data.files
    if (files === undefined) {
      return
    }
    for (const file of files) {
      if (file.status === 'modified') {
        logger.info(`Modified File: ${file}`)
      } else if (file.status === 'renamed') {
        logger.info(`Renamed File: ${file}`)
      } else if (file.status === 'added') {
        logger.info(`Added File: ${file}`)
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
