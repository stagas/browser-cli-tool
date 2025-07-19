#!/usr/bin/env node

import minimist from 'minimist'
import puppeteer from 'puppeteer'
import { inspect } from 'util'

const argv = minimist(process.argv.slice(2), {
  alias: { h: 'help' },
  boolean: 'help',
})

if (argv.h || argv.help || process.argv.length <= 2) {
  console.log(`
Usage: browser <url> "[commands]"

A command-line tool to automate browser actions.

Commands:
  wait <time>       Waits for a specified time (e.g., 5s, 1000ms).
  click <selector>  Clicks an element.

Example:
  browser https://example.com "click .some-button wait 5s"
`)
  process.exit(0)
}

const url = argv._[0]
const commands = argv._[1]

if (!url) {
  console.error('Please provide a URL.')
  process.exit(1)
}

async function executeCommands(page, commands) {
  const parts = commands.split(/\s+/).filter(Boolean)
  let i = 0
  while (i < parts.length) {
    const command = parts[i]
    switch (command) {
      case 'wait': {
        const timeArg = parts[i + 1]
        if (!timeArg) {
          console.error(
            'wait command needs a time argument (e.g., 5s, 1000ms).',
          )
          i += 1
          continue
        }
        const timeMatch = timeArg.match(/^(\d+)(ms|s)$/)
        if (!timeMatch) {
          console.error(
            `Invalid time format for wait: ${timeArg}. Use 's' for seconds or 'ms' for milliseconds.`,
          )
          i += 2
          continue
        }
        const value = parseInt(timeMatch[1], 10)
        const unit = timeMatch[2]
        const delay = unit === 's' ? value * 1000 : value
        console.log(`[wait] ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        i += 2
        break
      }
      case 'click': {
        const selector = parts[i + 1]
        if (!selector) {
          console.error('click command needs a selector argument.')
          i += 1
          continue
        }
        try {
          console.log(`[click] ${selector}`)
          await page.click(selector)
        }
        catch (error) {
          console.error(`Failed to click "${selector}":`, error)
        }
        i += 2
        break
      }
      default:
        console.error(`[error] Unknown command: ${command}`)
        i += 1
        break
    }
  }
}

async function main() {
  console.log(`Navigating to ${url}...`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  browser.on('disconnected', () => {
    console.error('[browser-disconnected] Browser was disconnected.')
  })

  const page = await browser.newPage()

  page.on('error', error => {
    console.error(`[page-crash] ${error.stack || error.message}`)
  })

  page.on('console', async msg => {
    const msgType = msg.type()
    const location = msg.location()
    const args = msg.args()
    const argPromises = args.map(arg =>
      arg.evaluate(o => {
        if (o instanceof Error) {
          return o.stack || o.message
        }
        return o
      }, arg)
    )

    const settledArgs = await Promise.allSettled(argPromises)

    const finalArgs = settledArgs.map(res => {
      if (res.status === 'fulfilled') {
        return res.value
      }
      return '[unserializable]'
    })

    const formattedArgs = finalArgs.map(arg =>
      inspect(arg, { colors: false, depth: null })
    )

    const locationLineCol = location.lineNumber
      ? `:${location.lineNumber}:${location.columnNumber}`
      : ''
    const locationUrl = location.url || ''

    console[
      msgType === 'error'
        ? 'error'
        : msgType === 'warn'
        ? 'warn'
        : msgType === 'info'
        ? 'info'
        : msgType === 'debug'
        ? 'debug'
        : 'log'
    ](`[${msgType}] ${locationUrl}${locationLineCol}`, ...formattedArgs)
  })

  page.on('pageerror', (error) => {
    console.error(`[pageerror] ${error.stack || error.message}`)
  })

  page.on('unhandledrejection', err => {
    console.error(`[unhandledrejection] ${err.stack || err.message}`)
  })

  page.on('requestfailed', request => {
    console.error(
      `[requestfailed] ${request.url()} ${request.failure()?.errorText}`,
    )
  })

  page.on('response', async response => {
    if (!response.ok()) {
      console.error(
        `[response-error] ${response.status()} ${response.statusText()} ${response.url()}`,
      )
    }
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle2' })
    if (commands) {
      await executeCommands(page, commands)
    }
    // Wait for a short period to allow async events to be processed.
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  catch (error) {
    console.error(`Failed to navigate to ${url}:`, error)
  }
  finally {
    await browser.close()
  }
}

main()
