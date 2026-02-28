#!/usr/bin/env node
/**
 * Bumps APP_VERSION in lib/version.ts using current timestamp.
 * Format: YYYY.MM.DD-HHMM (e.g. 2025.02.17-1430)
 * Adds short hash for uniqueness when same minute.
 */
const fs = require('fs')
const path = require('path')

const now = new Date()
const datePart = now.toISOString().slice(0, 10).replace(/-/g, '.') // YYYY.MM.DD
const timePart = now.toTimeString().slice(0, 5).replace(':', '') // HHMM
const unique = Math.floor(Date.now() / 1000).toString(36) // short hash for uniqueness
const version = `${datePart}-${timePart}-${unique}`

const versionPath = path.join(__dirname, '..', 'lib', 'version.ts')
let content = fs.readFileSync(versionPath, 'utf8')

// Replace the version string (no semicolon in source - ASI)
content = content.replace(
  /(export const APP_VERSION =\s*process\.env\.NEXT_PUBLIC_APP_VERSION \|\|\s*)'[^']*'/,
  `$1'${version}'`
)

fs.writeFileSync(versionPath, content)
console.log(`Version bumped to: ${version}`)
