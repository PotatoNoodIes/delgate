import { randomUUID } from 'node:crypto'
import type { ShipmentData, Currency } from '~/types/shipment'
import type { FreightQuote } from '~/types/quote'

export interface GroqMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Session {
  id: string
  createdAt: Date
  currency: Currency
  shipmentState: Partial<ShipmentData>
  groqHistory: GroqMessage[]
  quote?: FreightQuote
}

// Module-level singleton — persists for the lifetime of the Node.js process
const sessions = new Map<string, Session>()

// Prune sessions older than 2 hours every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000
  for (const [id, session] of sessions) {
    if (session.createdAt.getTime() < cutoff) {
      sessions.delete(id)
    }
  }
}, 30 * 60 * 1000)

export function createAppSession(currency: Currency = 'CAD'): Session {
  const session: Session = {
    id: randomUUID(),
    createdAt: new Date(),
    currency,
    shipmentState: {},
    groqHistory: [],
  }
  sessions.set(session.id, session)
  return session
}

export function getAppSession(id: string): Session | undefined {
  return sessions.get(id)
}

export function updateAppSession(id: string, updates: Partial<Session>): Session | undefined {
  const session = sessions.get(id)
  if (!session) return undefined
  const updated = { ...session, ...updates }
  sessions.set(id, updated)
  return updated
}
