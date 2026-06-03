export type ServiceType = 'standard' | 'express' | 'ltl'
export type ShipmentStatus = 'collecting' | 'complete' | 'quoted'
export type Currency = 'CAD' | 'USD'

export interface ShipmentDimensions {
  length: number // cm
  width: number  // cm
  height: number // cm
}

export interface ShipmentData {
  originPostal: string
  destinationPostal: string
  originAddress?: string      // Human-readable resolved address (e.g. Toronto, ON)
  destinationAddress?: string // Human-readable resolved address (e.g. Vancouver, BC)
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  weight: number // kg
  dimensions: ShipmentDimensions
  serviceType: ServiceType
  declaredValue: number // CAD
  isResidential: boolean
  requiresLiftgate: boolean
  isHazmat: boolean
  specialInstructions?: string
  freightClass?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  quoteId?: string // references a FreightQuote stored in session
}
