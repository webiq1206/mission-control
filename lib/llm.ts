import OpenAI from 'openai'

const AVAILABLE_ACTIONS = [
  'approve',
  'reject',
  'complete',
  'block',
  'create_task',
  'assign',
  'set_priority',
  'update_progress',
  'note',
] as const

interface DetectIntentInput {
  command: string
  itemType: string
  itemId: string
  entitySlug?: string
  activityDetail?: string
  resolvedRef: { type: string; id: string } | null
}

interface IntentResult {
  action: string
  targetType: string
  targetId: string
  description?: string
  params?: Record<string, string>
}

let _client: OpenAI | null = null

function getClient(): OpenAI | null {
  if (_client) return _client
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null
  _client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  })
  return _client
}

export async function detectIntent(input: DetectIntentInput): Promise<IntentResult | null> {
  const client = getClient()
  if (!client) return null

  const systemPrompt = `You are a command interpreter for a business operations dashboard. Given a user instruction and its context, determine what action (if any) should be taken.

Available actions: ${AVAILABLE_ACTIONS.join(', ')}

Entity types: approval, task, priority, idea, recommendation

Respond ONLY with a JSON object. No markdown, no explanation.

Schema:
{
  "action": one of [${AVAILABLE_ACTIONS.map(a => `"${a}"`).join(', ')}],
  "targetType": the entity type to act on,
  "targetId": the specific entity ID,
  "description": a short human-readable summary of the intended action,
  "params": optional object with extra parameters (e.g. {"reason": "...", "agent": "...", "title": "...", "value": "..."})
}

If the instruction is purely informational or you cannot determine a clear actionable intent, return: {"action": "note"}

Rules:
- If the user says something has been handled/resolved/completed, that typically means "approve" or "complete" for the referenced entity.
- If context references an approval (APR-*), prefer acting on that approval.
- If context references a task (TSK-*), prefer acting on that task.
- "targetId" must be a real entity ID from the context, never fabricated.
- Only return actions you are confident about.`

  const contextParts: string[] = []
  if (input.activityDetail) contextParts.push(`Activity detail: ${input.activityDetail}`)
  if (input.resolvedRef) contextParts.push(`Referenced entity: [${input.resolvedRef.type}:${input.resolvedRef.id}]`)
  if (input.entitySlug) contextParts.push(`Entity: ${input.entitySlug}`)
  contextParts.push(`Source: ${input.itemType} (ID: ${input.itemId})`)

  const userMessage = `Context:\n${contextParts.join('\n')}\n\nUser instruction: "${input.command}"`

  try {
    const response = await client.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0,
      max_tokens: 256,
    })

    const text = response.choices?.[0]?.message?.content?.trim()
    if (!text) return null

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(cleaned)

    if (!parsed.action || parsed.action === 'note') return null
    if (!parsed.targetType || !parsed.targetId) return null

    return {
      action: parsed.action,
      targetType: parsed.targetType,
      targetId: parsed.targetId,
      description: parsed.description,
      params: parsed.params,
    }
  } catch (e) {
    console.error('LLM intent detection failed:', e)
    return null
  }
}
