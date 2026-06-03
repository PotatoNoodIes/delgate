import type { ShipmentData } from '~/types/shipment'
import type { PricingBreakdown, TransitDays, FreightQuote } from '~/types/quote'
import { randomUUID } from 'node:crypto'

// ── Region mapping ───────────────────────────────────────────────────────────
type Region = 'bc' | 'alberta' | 'prairies' | 'ontario' | 'quebec' | 'atlantic' | 'remote'

const POSTAL_TO_REGION: Record<string, Region> = {
  V: 'bc',
  T: 'alberta',
  R: 'prairies', S: 'prairies',
  K: 'ontario', L: 'ontario', M: 'ontario', N: 'ontario', P: 'ontario',
  G: 'quebec', H: 'quebec', J: 'quebec',
  A: 'atlantic', B: 'atlantic', C: 'atlantic', E: 'atlantic',
  X: 'remote', Y: 'remote',
}

// ── Rate matrix (CAD per kg) ─────────────────────────────────────────────────
const RATE_PER_KG: Record<Region, Record<Region, number>> = {
  bc:       { bc: 0.85, alberta: 0.95, prairies: 1.10, ontario: 1.35, quebec: 1.45, atlantic: 1.55, remote: 2.20 },
  alberta:  { bc: 0.95, alberta: 0.85, prairies: 0.95, ontario: 1.25, quebec: 1.35, atlantic: 1.45, remote: 2.20 },
  prairies: { bc: 1.10, alberta: 0.95, prairies: 0.85, ontario: 1.15, quebec: 1.25, atlantic: 1.35, remote: 2.20 },
  ontario:  { bc: 1.35, alberta: 1.25, prairies: 1.15, ontario: 0.85, quebec: 0.95, atlantic: 1.10, remote: 2.20 },
  quebec:   { bc: 1.45, alberta: 1.35, prairies: 1.25, ontario: 0.95, quebec: 0.85, atlantic: 0.95, remote: 2.20 },
  atlantic: { bc: 1.55, alberta: 1.45, prairies: 1.35, ontario: 1.10, quebec: 0.95, atlantic: 0.85, remote: 2.20 },
  remote:   { bc: 2.20, alberta: 2.20, prairies: 2.20, ontario: 2.20, quebec: 2.20, atlantic: 2.20, remote: 2.20 },
}

// ── Minimum charge (CAD) ────────────────────────────────────────────────────
const MIN_CHARGE: Record<Region, Record<Region, number>> = {
  bc:       { bc: 45, alberta: 55, prairies: 65, ontario: 85, quebec: 95, atlantic: 105, remote: 185 },
  alberta:  { bc: 55, alberta: 45, prairies: 55, ontario: 75, quebec: 85, atlantic: 95,  remote: 185 },
  prairies: { bc: 65, alberta: 55, prairies: 45, ontario: 65, quebec: 75, atlantic: 85,  remote: 185 },
  ontario:  { bc: 85, alberta: 75, prairies: 65, ontario: 45, quebec: 55, atlantic: 65,  remote: 185 },
  quebec:   { bc: 95, alberta: 85, prairies: 75, ontario: 55, quebec: 45, atlantic: 55,  remote: 185 },
  atlantic: { bc: 105, alberta: 95, prairies: 85, ontario: 65, quebec: 55, atlantic: 45, remote: 185 },
  remote:   { bc: 185, alberta: 185, prairies: 185, ontario: 185, quebec: 185, atlantic: 185, remote: 185 },
}

// ── Transit days ─────────────────────────────────────────────────────────────
const TRANSIT: Record<Region, Record<Region, TransitDays>> = {
  bc:       { bc:{min:1,max:2}, alberta:{min:1,max:2}, prairies:{min:2,max:3}, ontario:{min:4,max:6}, quebec:{min:5,max:7}, atlantic:{min:6,max:8}, remote:{min:8,max:12} },
  alberta:  { bc:{min:1,max:2}, alberta:{min:1,max:2}, prairies:{min:1,max:2}, ontario:{min:3,max:5}, quebec:{min:4,max:6}, atlantic:{min:5,max:7}, remote:{min:8,max:12} },
  prairies: { bc:{min:2,max:3}, alberta:{min:1,max:2}, prairies:{min:1,max:2}, ontario:{min:3,max:4}, quebec:{min:3,max:5}, atlantic:{min:4,max:6}, remote:{min:8,max:12} },
  ontario:  { bc:{min:4,max:6}, alberta:{min:3,max:5}, prairies:{min:3,max:4}, ontario:{min:1,max:2}, quebec:{min:1,max:2}, atlantic:{min:3,max:4}, remote:{min:8,max:12} },
  quebec:   { bc:{min:5,max:7}, alberta:{min:4,max:6}, prairies:{min:3,max:5}, ontario:{min:1,max:2}, quebec:{min:1,max:2}, atlantic:{min:2,max:3}, remote:{min:8,max:12} },
  atlantic: { bc:{min:6,max:8}, alberta:{min:5,max:7}, prairies:{min:4,max:6}, ontario:{min:3,max:4}, quebec:{min:2,max:3}, atlantic:{min:1,max:2}, remote:{min:8,max:12} },
  remote:   { bc:{min:8,max:12}, alberta:{min:8,max:12}, prairies:{min:8,max:12}, ontario:{min:8,max:12}, quebec:{min:8,max:12}, atlantic:{min:8,max:12}, remote:{min:8,max:12} },
}

// ── Helper ───────────────────────────────────────────────────────────────────
export function getRegion(postalCode: string): Region {
  const prefix = postalCode.trim().toUpperCase()[0] ?? 'M'
  return POSTAL_TO_REGION[prefix] ?? 'ontario'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Provincial Tax Rates (applied to pre-tax total) ─────────────────────────
// Indexed by first character of DESTINATION postal code
const TAX_BY_POSTAL: Record<string, { rate: number; label: string }> = {
  V: { rate: 0.12,    label: 'GST+PST (BC 12%)'         }, // BC: 5% GST + 7% PST
  T: { rate: 0.05,    label: 'GST (Alberta 5%)'          }, // AB: GST only
  S: { rate: 0.11,    label: 'GST+PST (Saskatchewan 11%)' }, // SK: 5% + 6%
  R: { rate: 0.12,    label: 'GST+RST (Manitoba 12%)'    }, // MB: 5% + 7%
  K: { rate: 0.13,    label: 'HST (Ontario 13%)'         },
  L: { rate: 0.13,    label: 'HST (Ontario 13%)'         },
  M: { rate: 0.13,    label: 'HST (Ontario 13%)'         },
  N: { rate: 0.13,    label: 'HST (Ontario 13%)'         },
  P: { rate: 0.13,    label: 'HST (Ontario 13%)'         },
  G: { rate: 0.14975, label: 'GST+QST (Quebec 14.975%)'  }, // QC
  H: { rate: 0.14975, label: 'GST+QST (Quebec 14.975%)'  },
  J: { rate: 0.14975, label: 'GST+QST (Quebec 14.975%)'  },
  A: { rate: 0.15,    label: 'HST (Newfoundland 15%)'    },
  B: { rate: 0.15,    label: 'HST (Nova Scotia 15%)'     },
  C: { rate: 0.15,    label: 'HST (PEI 15%)'             },
  E: { rate: 0.15,    label: 'HST (New Brunswick 15%)'   },
  X: { rate: 0.05,    label: 'GST (Territories 5%)'      },
  Y: { rate: 0.05,    label: 'GST (Territories 5%)'      },
}

function getTax(postalCode: string): { rate: number; label: string } {
  const prefix = (postalCode ?? '').trim().toUpperCase()[0] ?? 'M'
  return TAX_BY_POSTAL[prefix] ?? { rate: 0.05, label: 'GST (5%)' }
}

// ── Core pricing function (pure, no AI) ─────────────────────────────────────
export function calculateFreightQuote(
  shipment: Partial<ShipmentData>,
  currency: 'CAD' | 'USD' = 'CAD',
  cadToUsdRate = 0.74,
): FreightQuote {
  const originPostal = shipment.originPostal || 'M5V'
  const destinationPostal = shipment.destinationPostal || 'M5V'
  const weight = shipment.weight || 0

  const orig = getRegion(originPostal)
  const dest = getRegion(destinationPostal)

  const ratePerKg = RATE_PER_KG[orig][dest]
  const minCharge = MIN_CHARGE[orig][dest]

  const serviceMultiplier =
    shipment.serviceType === 'express' ? 2.0
    : shipment.serviceType === 'ltl'  ? 1.15
    : 1.0

  const rawBase = weight * ratePerKg * serviceMultiplier
  const baseRate = round2(Math.max(rawBase, minCharge))

  const fuelSurcharge = round2(baseRate * 0.22)
  const residentialFee = shipment.isResidential ? 35.00 : 0
  const liftgateFee = shipment.requiresLiftgate ? 75.00 : 0
  const insurance = (shipment.declaredValue || 0) > 0
    ? round2(Math.max((shipment.declaredValue || 0) * 0.015, 25.00))
    : 0
  const hazmatFee = shipment.isHazmat ? 150.00 : 0

  const totalCAD = round2(baseRate + fuelSurcharge + residentialFee + liftgateFee + insurance + hazmatFee)

  // Tax on pre-tax total based on destination province
  const taxInfo = getTax(destinationPostal)
  const taxCAD = round2(totalCAD * taxInfo.rate)
  const totalWithTaxCAD = round2(totalCAD + taxCAD)

  const fx = currency === 'USD' ? cadToUsdRate : 1

  const pricing: PricingBreakdown = {
    baseRate:       round2(baseRate * fx),
    fuelSurcharge:  round2(fuelSurcharge * fx),
    residentialFee: round2(residentialFee * fx),
    liftgateFee:    round2(liftgateFee * fx),
    insurance:      round2(insurance * fx),
    hazmatFee:      round2(hazmatFee * fx),
    tax:            round2(taxCAD * fx),
    taxRate:        taxInfo.rate,
    taxLabel:       taxInfo.label,
    total:          round2(totalCAD * fx),
    totalWithTax:   round2(totalWithTaxCAD * fx),
  }

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    shipment: shipment as ShipmentData,
    pricing,
    transitDays: TRANSIT[orig][dest],
    currency,
  }
}
