#!/usr/bin/env node
/**
 * prepare.js — reads .env and stamps addresses/network into subgraph.yaml
 *
 * Run before codegen or build:
 *   node scripts/prepare.js
 *
 * Required .env keys:
 *   MARKETPLACE_ADDRESS         — deployed NexusMarketplace address
 *   COLLECTION_FACTORY_ADDRESS  — deployed CollectionFactory address
 *   START_BLOCK                 — block number of the earliest deployment
 *   NETWORK                     — e.g. sepolia, mainnet, matic
 */

'use strict'

const fs   = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

// ── Load .env ────────────────────────────────────────────────────────────────
function loadEnv () {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) {
    console.warn('[prepare] Warning: .env not found — using template defaults')
    return {}
  }
  const env = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    env[key] = val
  }
  return env
}

const env = loadEnv()

const marketplaceAddress  = env.MARKETPLACE_ADDRESS         || '0x0000000000000000000000000000000000000000'
const factoryAddress      = env.COLLECTION_FACTORY_ADDRESS  || '0x0000000000000000000000000000000000000000'
const startBlock          = env.START_BLOCK                 || '0'
const network             = env.NETWORK                     || 'sepolia'

// ── Validate ─────────────────────────────────────────────────────────────────
const ZERO = '0x0000000000000000000000000000000000000000'
if (marketplaceAddress === ZERO || factoryAddress === ZERO) {
  console.warn('[prepare] Warning: one or more contract addresses are still the zero address.')
  console.warn('          Update MARKETPLACE_ADDRESS and COLLECTION_FACTORY_ADDRESS in .env')
  console.warn('          before deploying the subgraph.\n')
}

// ── Stamp template ───────────────────────────────────────────────────────────
const templatePath = path.join(ROOT, 'subgraph.template.yaml')
const outputPath   = path.join(ROOT, 'subgraph.yaml')

if (!fs.existsSync(templatePath)) {
  console.error('[prepare] Error: subgraph.template.yaml not found')
  process.exit(1)
}

const output = fs.readFileSync(templatePath, 'utf8')
  .replace(/\{\{MARKETPLACE_ADDRESS\}\}/g,        marketplaceAddress)
  .replace(/\{\{COLLECTION_FACTORY_ADDRESS\}\}/g, factoryAddress)
  .replace(/\{\{START_BLOCK\}\}/g,                startBlock)
  .replace(/\{\{NETWORK\}\}/g,                    network)

fs.writeFileSync(outputPath, output)

console.log('[prepare] subgraph.yaml generated successfully:')
console.log(`  NexusMarketplace:  ${marketplaceAddress}`)
console.log(`  CollectionFactory: ${factoryAddress}`)
console.log(`  startBlock:        ${startBlock}`)
console.log(`  network:           ${network}`)
