export const ENTITIES = [
  { slug: 'timber-and-love',        label: 'Timber + Love',      abbr: 'T+L',  color: '#D4A853', cssVar: '--tl',  activity: 'High'   },
  { slug: 'buy-my-house-boise',     label: 'Buy My House Boise',  abbr: 'BMH',  color: '#EF4444', cssVar: '--bmh', activity: 'High'   },
  { slug: 'friday-coffee-house',    label: 'Friday Coffee House', abbr: 'FCH',  color: '#8B5CF6', cssVar: '--fch', activity: 'Low'    },
  { slug: 'timber-and-love-realty', label: 'Timber and Love Realty', abbr: 'TLR', color: '#3B82F6', cssVar: '--tlr', activity: 'Medium' },
  { slug: 'boise-boys',             label: 'Boise Boys',          abbr: 'BB',   color: '#22C55E', cssVar: '--bb',  activity: 'Medium' },
  { slug: 'stay-with-us',           label: 'Stay With Us',        abbr: 'SWU',  color: '#06B6D4', cssVar: '--swu', activity: 'Medium' },
  { slug: 'additional-ventures',    label: 'Additional Ventures', abbr: 'AV',   color: '#F97316', cssVar: '--av',  activity: 'Low'    },
] as const

export const AGENTS = [
  { id: 'hank',  name: 'Hank',  emoji: '🦞', role: 'CEO / Orchestrator',   model: 'openrouter/anthropic/claude-sonnet-4-6',     tier: 'premium' },
  { id: 'larry', name: 'Larry', emoji: '🧠', role: 'R&D',                  model: 'openrouter/google/gemini-2.5-flash',         tier: 'premium' },
  { id: 'nora',  name: 'Nora',  emoji: '💼', role: 'Bookkeeper',           model: 'openrouter/google/gemini-2.5-flash',         tier: 'cheap'   },
  { id: 'maya',  name: 'Maya',  emoji: '🗂️', role: 'Project Manager',      model: 'openrouter/google/gemini-2.5-flash',         tier: 'mid'     },
  { id: 'sam',   name: 'Sam',   emoji: '💻', role: 'IT',                   model: 'openrouter/deepseek/deepseek-chat',          tier: 'mid'     },
  { id: 'kai',   name: 'Kai',   emoji: '🛠️', role: 'Developer',            model: 'openrouter/deepseek/deepseek-chat',          tier: 'mid'     },
  { id: 'ada',   name: 'Ada',   emoji: '🎨', role: 'UI/UX Designer',       model: 'openrouter/anthropic/claude-sonnet-4-6',     tier: 'mid'     },
  { id: 'priya', name: 'Priya', emoji: '✍️', role: 'Content Creator',      model: 'openrouter/anthropic/claude-sonnet-4-6',     tier: 'mid'     },
  { id: 'omar',  name: 'Omar',  emoji: '📈', role: 'Sales Manager',        model: 'openrouter/anthropic/claude-sonnet-4-6',     tier: 'mid'     },
  { id: 'zoe',   name: 'Zoe',   emoji: '📱', role: 'Social Media Manager', model: 'openrouter/anthropic/claude-sonnet-4-6',     tier: 'mid'     },
  { id: 'quinn', name: 'Quinn', emoji: '🚀', role: 'Digital Marketing',    model: 'openrouter/anthropic/claude-sonnet-4-5',     tier: 'mid'     },
] as const

export type EntitySlug = typeof ENTITIES[number]['slug']
export type AgentId    = typeof AGENTS[number]['id']

export function getEntity(slugOrLabel: string) {
  return ENTITIES.find(e =>
    e.slug === slugOrLabel ||
    e.label === slugOrLabel ||
    e.abbr === slugOrLabel
  )
}

export function getAgent(id: string) {
  return AGENTS.find(a => a.id === id)
}
