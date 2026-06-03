import { describe, it, expect } from 'vitest'
import { calculateFreightQuote, getRegion } from '../server/services/pricing'
import type { ShipmentData } from '../types/shipment'

const baseShipment: ShipmentData = {
  originPostal:      'M5V',
  destinationPostal: 'M5V',
  weight:            100,
  dimensions:        { length: 100, width: 80, height: 60 },
  serviceType:       'standard',
  declaredValue:     0,
  isResidential:     false,
  requiresLiftgate:  false,
  isHazmat:          false,
}

// ── Region mapping ───────────────────────────────────────────────────────────
describe('getRegion', () => {
  it('maps Ontario prefixes correctly', () => {
    expect(getRegion('M5V 2T6')).toBe('ontario')
    expect(getRegion('K1A')).toBe('ontario')
  })
  it('maps BC prefix correctly',       () => expect(getRegion('V6B')).toBe('bc'))
  it('maps Alberta prefix correctly',  () => expect(getRegion('T2P')).toBe('alberta'))
  it('maps Quebec prefix correctly',   () => expect(getRegion('H3A')).toBe('quebec'))
  it('maps Atlantic prefix correctly', () => expect(getRegion('B3H')).toBe('atlantic'))
  it('maps Remote prefix correctly',   () => expect(getRegion('X1A')).toBe('remote'))
  it('falls back to ontario for unknown prefix', () => expect(getRegion('Z99')).toBe('ontario'))
})

// ── Base rate ────────────────────────────────────────────────────────────────
describe('base rate', () => {
  it('applies minimum charge for a 1 kg same-region shipment', () => {
    const q = calculateFreightQuote({ ...baseShipment, weight: 1 })
    expect(q.pricing.baseRate).toBe(45) // minimum for ON→ON
  })

  it('calculates weight-based rate when above minimum', () => {
    const q = calculateFreightQuote({ ...baseShipment, weight: 200 })
    // 200 * 0.85 = 170, above min 45
    expect(q.pricing.baseRate).toBeCloseTo(170, 1)
  })

  it('doubles base rate for express service', () => {
    const std = calculateFreightQuote({ ...baseShipment, weight: 200 })
    const exp = calculateFreightQuote({ ...baseShipment, weight: 200, serviceType: 'express' })
    expect(exp.pricing.baseRate).toBeCloseTo(std.pricing.baseRate * 2, 1)
  })

  it('applies 1.15× multiplier for LTL', () => {
    const std = calculateFreightQuote({ ...baseShipment, weight: 200 })
    const ltl = calculateFreightQuote({ ...baseShipment, weight: 200, serviceType: 'ltl' })
    expect(ltl.pricing.baseRate).toBeCloseTo(std.pricing.baseRate * 1.15, 1)
  })
})

// ── Fuel surcharge ───────────────────────────────────────────────────────────
describe('fuel surcharge', () => {
  it('is exactly 22% of base rate', () => {
    const q = calculateFreightQuote({ ...baseShipment, weight: 200 })
    expect(q.pricing.fuelSurcharge).toBeCloseTo(q.pricing.baseRate * 0.22, 2)
  })
})

// ── Fee flags ────────────────────────────────────────────────────────────────
describe('surcharge flags', () => {
  it('adds $35 for residential delivery', () => {
    const q = calculateFreightQuote({ ...baseShipment, isResidential: true })
    expect(q.pricing.residentialFee).toBe(35)
  })

  it('adds $75 for liftgate', () => {
    const q = calculateFreightQuote({ ...baseShipment, requiresLiftgate: true })
    expect(q.pricing.liftgateFee).toBe(75)
  })

  it('adds $150 for hazmat', () => {
    const q = calculateFreightQuote({ ...baseShipment, isHazmat: true })
    expect(q.pricing.hazmatFee).toBe(150)
  })

  it('adds no fees when all flags off', () => {
    const q = calculateFreightQuote(baseShipment)
    expect(q.pricing.residentialFee).toBe(0)
    expect(q.pricing.liftgateFee).toBe(0)
    expect(q.pricing.hazmatFee).toBe(0)
  })
})

// ── Insurance ────────────────────────────────────────────────────────────────
describe('insurance', () => {
  it('is 0 when declared value is 0', () => {
    const q = calculateFreightQuote({ ...baseShipment, declaredValue: 0 })
    expect(q.pricing.insurance).toBe(0)
  })

  it('applies minimum $25 for low declared values', () => {
    const q = calculateFreightQuote({ ...baseShipment, declaredValue: 100 })
    // 100 * 0.015 = 1.5, below $25 minimum
    expect(q.pricing.insurance).toBe(25)
  })

  it('calculates 1.5% for larger values', () => {
    const q = calculateFreightQuote({ ...baseShipment, declaredValue: 10000 })
    expect(q.pricing.insurance).toBeCloseTo(150, 1)
  })
})

// ── Cross-country rates ──────────────────────────────────────────────────────
describe('cross-country routing', () => {
  it('charges higher rate for BC→Atlantic vs local ON→ON', () => {
    const local = calculateFreightQuote({ ...baseShipment, weight: 200 })
    const cross = calculateFreightQuote({
      ...baseShipment,
      weight: 200,
      originPostal: 'V6B',
      destinationPostal: 'B3H',
    })
    expect(cross.pricing.baseRate).toBeGreaterThan(local.pricing.baseRate)
  })

  it('applies remote surcharge for Northern Canada', () => {
    const q = calculateFreightQuote({
      ...baseShipment,
      weight: 100,
      originPostal: 'M5V',
      destinationPostal: 'X1A',
    })
    expect(q.pricing.baseRate).toBeGreaterThanOrEqual(185)
  })
})

// ── Total ────────────────────────────────────────────────────────────────────
describe('total', () => {
  it('equals sum of all components', () => {
    const q = calculateFreightQuote({
      ...baseShipment,
      weight:          200,
      declaredValue:   5000,
      isResidential:   true,
      requiresLiftgate:true,
      isHazmat:        false,
    })
    const p = q.pricing
    const expected = p.baseRate + p.fuelSurcharge + p.residentialFee + p.liftgateFee + p.insurance + p.hazmatFee
    expect(p.total).toBeCloseTo(expected, 2)
  })
})

// ── Currency conversion ──────────────────────────────────────────────────────
describe('USD conversion', () => {
  it('converts all amounts to USD at the given rate', () => {
    const cad = calculateFreightQuote({ ...baseShipment, weight: 200 }, 'CAD', 0.74)
    const usd = calculateFreightQuote({ ...baseShipment, weight: 200 }, 'USD', 0.74)
    expect(usd.pricing.total).toBeCloseTo(cad.pricing.total * 0.74, 1)
  })
})
