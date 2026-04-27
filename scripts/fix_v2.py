#!/usr/bin/env python3
"""Fix TursoDb.run() to properly handle named params in @libsql/client."""
import os, sys, glob

# Find the file
paths = glob.glob('/home/runner/workspace/**/db-turso.ts', recursive=True)
if not paths:
    print('NOT_FOUND: db-turso.ts')
    sys.exit(1)

f = paths[0]
print('Patching:', f)

c = open(f).read()
print('File size:', len(c))
print('Lines:', c.count('\n'))

# Show lines around 54
lines = c.split('\n')
print('Lines 50-58:')
for i, l in enumerate(lines[49:57], 50):
    print(f'  {i}: {repr(l)}')

# The fix: in the run() method, pass the args object directly for named params
# @libsql/client accepts: { sql, args: Record<string, Value> } for named params
# NOT: { sql, args: [recordObject] } 

# Find the run method
run_start = None
for i, line in enumerate(lines):
    if 'async run(' in line and 'string' in line:
        run_start = i
        break

if run_start is None:
    print('run() method not found')
    sys.exit(1)

print(f'run() starts at line {run_start + 1}')

# Find the line with "args: args as never[]" in the run method
for i in range(run_start, min(run_start + 20, len(lines))):
    if 'args: args as never[]' in lines[i]:
        print(f'Found target at line {i+1}: {repr(lines[i])}')
        # Replace just the args value
        lines[i] = lines[i].replace(
            'args: args as never[]',
            'args: (args.length === 1 && args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0])) ? args[0] as never[] : (args as unknown[]).map(a => a === undefined ? null : a) as never[]'
        )
        print(f'Fixed line {i+1}')
        break
else:
    print('Pattern "args: args as never[]" not found in run() method')
    print('Showing run() body:')
    for i in range(run_start, min(run_start + 15, len(lines))):
        print(f'  {i+1}: {repr(lines[i])}')
    sys.exit(1)

open(f, 'w').write('\n'.join(lines))
print('PATCHED_OK')
