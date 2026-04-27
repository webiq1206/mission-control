#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find db-turso.ts
const base = '/home/runner/workspace/artifacts/api-server/src/mc/lib';
const dbTursoPath = path.join(base, 'db-turso.ts');

if (!fs.existsSync(dbTursoPath)) {
  console.log('db-turso.ts not found at', dbTursoPath);
  // Search for it
  try {
    const found = execSync('find /home/runner/workspace -name "db-turso.ts" 2>/dev/null', {encoding:'utf8'}).trim();
    console.log('Found at:', found);
  } catch(e) { console.log('Search failed'); }
  process.exit(1);
}

let content = fs.readFileSync(dbTursoPath, 'utf8');
console.log('Current run() method (lines 50-60):');
const lines = content.split('\n');
lines.slice(48, 62).forEach((l, i) => console.log(`${i+49}: ${l}`));

// Patch: add null-coalescing for args
const oldPattern = 'args: args as never[]';
const newPattern = 'args: (args || []).map((a) => (a === undefined ? null : a)) as never[]';

if (content.includes(oldPattern)) {
  content = content.replace(new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern);
  fs.writeFileSync(dbTursoPath, content);
  console.log('PATCHED: replaced', oldPattern, 'with null-coalescing');
} else {
  console.log('Pattern not found. Current content around line 54:');
  lines.slice(50, 58).forEach((l, i) => console.log(`${i+51}: ${l}`));
}
