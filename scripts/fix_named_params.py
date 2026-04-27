
import glob, re, os

# Find db-turso.ts
files = glob.glob('/home/runner/workspace/**/db-turso.ts', recursive=True)
if not files:
    print('NOT_FOUND')
    exit(1)

f = files[0]
print('Patching:', f)
c = open(f).read()

# The original run() method pattern
old_run = '''  async run(sql: string, ...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = await this.client.execute({ sql, args: args as never[] })
    return {
      changes: result.rowsAffected,
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
    }
  }'''

# The fixed run() method  
new_run = """  async run(sql: string, ...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    // Auto-detect named-param style: single object + @name params -> convert to positional
    let finalSql = sql;
    let finalArgs: unknown[] = args;
    if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0]) && /@\\w+/.test(sql)) {
      const params = args[0] as Record<string, unknown>;
      const positional: unknown[] = [];
      finalSql = sql.replace(/@(\\w+)/g, (_m: string, name: string) => {
        const val = params[name];
        positional.push(val === undefined ? null : val);
        return '?';
      });
      finalArgs = positional;
    }
    const safeArgs = finalArgs.map(a => (a === undefined ? null : a));
    const result = await this.client.execute({ sql: finalSql, args: safeArgs as never[] });
    return {
      changes: result.rowsAffected,
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
    };
  }"""

if old_run in c:
    c2 = c.replace(old_run, new_run)
    open(f, 'w').write(c2)
    print('PATCHED_NAMED_PARAMS:' + f)
else:
    # Different version - just replace the args line
    # Pattern: args: args as never[]  in the run method
    # More aggressive patch: find the run method and replace its body
    
    # Try a simpler approach: insert null-coerce + named param detection
    run_pattern = 'async run(sql: string, ...args: unknown[])'
    if run_pattern in c:
        # Find the run method body and replace it
        start = c.index(run_pattern)
        # Find the matching closing brace
        depth = 0
        i = start
        while i < len(c):
            if c[i] == '{': depth += 1
            elif c[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
            i += 1
        
        old_method = c[start:end]
        new_method = """async run(sql: string, ...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    let finalSql = sql;
    let finalArgs: unknown[] = args;
    if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      const params = args[0] as Record<string, unknown>;
      const positional: unknown[] = [];
      finalSql = sql.replace(/@(\\w+)/g, (_m: string, name: string) => {
        positional.push(params[name] === undefined ? null : params[name]);
        return '?';
      });
      finalArgs = positional;
    }
    const safeArgs = finalArgs.map((a) => (a === undefined ? null : a));
    const result = await this.client.execute({ sql: finalSql, args: safeArgs as never[] });
    return { changes: result.rowsAffected, lastInsertRowid: Number(result.lastInsertRowid ?? 0) };
  }"""
        c2 = c[:start] + new_method + c[end:]
        open(f, 'w').write(c2)
        print('PATCHED_AGGRESSIVE:' + f)
    else:
        print('PATTERN_NOT_FOUND')
        print('Content sample:', c[c.find('run'):c.find('run')+200])
