#!/usr/bin/env node
/**
 * Seed demo Creator OS channel (Tech Macro Daily).
 * Usage: node scripts/seed-creator-demo.mjs
 */

import { pathToFileURL } from 'node:url'
import path from 'node:path'

async function main() {
  const root = process.cwd()
  const mod = await import(pathToFileURL(path.join(root, 'lib/creator/sample/demo-channel.ts')).href)
  await mod.seedDemoCreatorChannel()
  console.log('Demo channel seeded:', mod.DEMO_CHANNEL_ID)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
