import type { Currency } from './shipment'

export interface PriceExplanation {
  changeType: 'increase' | 'decrease' | 'neutral'
  reason: string
  impact: string // e.g. "+$45.00"
}

export interface LiveIntelligence {
  priceExplanation: PriceExplanation[]
  risks: {
    type: 'missing' | 'warning' | 'risk'
    message: string
    field?: string
  }[]
  recommendations: {
    title: string
    description: string
    action?: string
    savings?: string
  }[]
}
