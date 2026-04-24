'use client'

import { ENTITIES } from '@/lib/entities'

interface EntityConfig {
  color: string
  label: string
  abbr: string
}

const ENTITY_MAP: Record<string, EntityConfig> = {}

for (const e of ENTITIES) {
  const config: EntityConfig = { color: e.color, label: e.label, abbr: e.abbr }
  ENTITY_MAP[e.slug] = config
  ENTITY_MAP[e.label] = config
  ENTITY_MAP[e.label.toLowerCase()] = config
  ENTITY_MAP[e.abbr] = config
  ENTITY_MAP[e.abbr.toLowerCase()] = config
}

export function getEntityConfig(entityKey: string | null | undefined): EntityConfig | null {
  if (!entityKey) return null
  return ENTITY_MAP[entityKey] || ENTITY_MAP[entityKey.toLowerCase()] || null
}

export function getEntityColor(entityKey: string | null | undefined): string {
  return getEntityConfig(entityKey)?.color || 'var(--text-muted)'
}

interface EntityBadgeProps {
  entity: string | null | undefined
  showFull?: boolean
  className?: string
  style?: React.CSSProperties
}

export function EntityBadge({ entity, showFull = false, className, style }: EntityBadgeProps) {
  const config = getEntityConfig(entity)
  if (!config) return null

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        color: config.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: config.color,
          flexShrink: 0,
          boxShadow: `0 0 4px ${config.color}40`,
        }}
      />
      {showFull ? config.label : config.abbr}
    </span>
  )
}
