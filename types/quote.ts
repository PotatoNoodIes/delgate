import type { ShipmentData, Currency } from './shipment'

export interface PricingBreakdown {
  baseRate: number
  fuelSurcharge: number
  residentialFee: number
  liftgateFee: number
  insurance: number
  hazmatFee: number
  tax: number
  taxRate: number    // e.g. 0.13
  taxLabel: string   // e.g. "HST (Ontario 13%)"
  total: number      // pre-tax total
  totalWithTax: number
}

export interface TransitDays {
  min: number
  max: number
}

export interface FreightQuote {
  id: string
  createdAt: string // ISO string
  shipment: ShipmentData
  pricing: PricingBreakdown
  transitDays: TransitDays
  currency: Currency
  aiSummary?: string
  risks?: string[]
  recommendations?: string[]
}

export interface QuoteLineItem {
  label: string
  amount: number
  note?: string
}
