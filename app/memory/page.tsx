import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { AGENTS } from '@/lib/entities'

function readAgentMemory(agentId: string): { file: string; content: string }[] {
  const wsDir = join(process.env.HOME || '/Users/jaredbrost', '.openclaw', `workspace-${agentId}`)
  const memDir = join(wsDir, 'memory')
  const files: { file: string; content: string }[] = []

  if (existsSync(join(wsDir, 'MEMORY.md'))) {
    files.push({ file: 'MEMORY.md', content: readFileSync(join(wsDir, 'MEMORY.md'), 'utf-8').slice(0, 2000) })
  }

  if (existsSync(memDir)) {
    try {
      const memFiles = readdirSync(memDir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 3)
      for (const f of memFiles) {
        files.push({ file: `memory/${f}`, content: readFileSync(join(memDir, f), 'utf-8').slice(0, 1000) })
      }
    } catch { /* ignore */ }
  }

  return files
}

export default function MemoryPage() {
  const agentMemories = AGENTS.map(a => ({
    ...a,
    memories: readAgentMemory(a.id),
  }))

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 4 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Memory</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Read-only view of agent workspace memory files.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {agentMemories.map(agent => (
          <div key={agent.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{agent.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{agent.name}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{agent.role}</span>
            </div>
            {agent.memories.length === 0 ? (
              <div className="card" style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)' }}>
                No memory files found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {agent.memories.map(m => (
                  <div key={m.file} className="card" style={{ padding: '12px 14px' }}>
                    <div className="label" style={{ marginBottom: 6 }}>{m.file}</div>
                    <pre style={{
                      fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: 200, overflowY: 'auto',
                      fontFamily: 'monospace',
                    }}>
                      {m.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
