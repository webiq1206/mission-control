const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error('[telegram] No TELEGRAM_BOT_TOKEN configured')
    return false
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })
    const data = await res.json()
    return data.ok === true
  } catch (err) {
    console.error('[telegram] Failed to send message:', err)
    return false
  }
}

export async function sendDeadMansSwitchAlert(hoursSince: number): Promise<void> {
  const message = `🚨 *Dead Man's Switch Triggered*

No agent activity detected for *${hoursSince.toFixed(1)} hours*.

This means no agent has reported a heartbeat, logged activity, or updated any task.

Check Mission Control immediately.
If all agents are offline, investigate the OpenClaw gateway.`

  const missionControlChatId = process.env.TELEGRAM_MC_CHAT_ID
  const jaredChatId = process.env.TELEGRAM_JARED_CHAT_ID

  if (missionControlChatId) {
    await sendTelegramMessage(missionControlChatId, message)
  }
  if (jaredChatId) {
    await sendTelegramMessage(jaredChatId, message)
  }
}
