#!/usr/bin/env node

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../mc.db')
const db = new Database(DB_PATH)

const pathRegex = /workspace-[a-z0-9-]+\/[^\s"'<>,)]+/g
const urlRegex = /https?:\/\/[^\s"'<>,)]+/g

function extractDeliverables(description) {
  const results = []
  const seen = new Set()

  const paths = description.match(pathRegex) || []
  for (const p of paths) {
    const cleaned = p.replace(/\.+$/, '')
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    const filename = cleaned.split('/').pop()
    results.push({ type: 'file', label: filename, path: cleaned })
  }

  // Handle "and <filename>.md" patterns that reference the same directory
  const andFileRegex = /workspace-([a-z0-9-]+\/[a-z0-9-/]+)\/.+\.md\s+and\s+([a-z0-9-]+\.md)/gi
  let andMatch
  while ((andMatch = andFileRegex.exec(description)) !== null) {
    const dir = 'workspace-' + andMatch[1]
    const file = andMatch[2]
    const fullPath = dir + '/' + file
    if (!seen.has(fullPath)) {
      seen.add(fullPath)
      results.push({ type: 'file', label: file, path: fullPath })
    }
  }

  const urls = description.match(urlRegex) || []
  for (const u of urls) {
    const cleaned = u.replace(/[.)]+$/, '')
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    try {
      const domain = new URL(cleaned).hostname.replace('www.', '')
      results.push({ type: 'url', label: domain, url: cleaned })
    } catch {
      results.push({ type: 'url', label: cleaned.substring(0, 40), url: cleaned })
    }
  }

  return results
}

const approvals = db.prepare('SELECT id, description, deliverables FROM approvals').all()
const update = db.prepare('UPDATE approvals SET deliverables = ? WHERE id = ?')

let updated = 0
let skipped = 0

for (const row of approvals) {
  const existing = row.deliverables ? JSON.parse(row.deliverables) : []
  if (existing.length > 0) {
    skipped++
    continue
  }

  const deliverables = extractDeliverables(row.description)
  if (deliverables.length === 0) {
    skipped++
    continue
  }

  update.run(JSON.stringify(deliverables), row.id)
  updated++
  console.log(`  ${row.id}: ${deliverables.length} deliverable(s)`)
  deliverables.forEach(d => {
    console.log(`    [${d.type}] ${d.label} -> ${d.path || d.url}`)
  })
}

console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Total: ${approvals.length}`)
