export const HOLDING_COMPANIES = [
  { id: 'hanks-homes',        name: 'Hanks Homes LLC',        ein: '81-1620577', color: '#3B82F6', abbr: 'HH'  },
  { id: 'tl-holdings',        name: 'T&L Holdings Inc',       ein: '83-1555301', color: '#D4A853', abbr: 'TLH' },
  { id: 'invest-in-boise',    name: 'Invest in Boise Inc',    ein: '81-0826864', color: '#22C55E', abbr: 'IIB' },
  { id: 'warm-springs-villa', name: 'Warm Springs Villa LLC',  ein: '86-2542231', color: '#8B5CF6', abbr: 'WSV' },
  { id: 'timber-and-love',    name: 'Timber + Love Inc',    ein: '81-2888628', color: '#EF4444', abbr: 'T+L' },
] as const

export type HoldingCompanyId = typeof HOLDING_COMPANIES[number]['id']

export function getHoldingCompany(idOrName: string) {
  return HOLDING_COMPANIES.find(h =>
    h.id === idOrName ||
    h.name === idOrName ||
    h.abbr === idOrName
  )
}
