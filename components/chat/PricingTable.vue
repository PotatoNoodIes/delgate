<script setup lang="ts">
import { computed } from 'vue'
import type { ShipmentData, Currency } from '~/types/shipment'

const props = defineProps<{
  state: Partial<ShipmentData>
  currency: Currency
}>()

// Mirror the real pricing engine from server/services/pricing.ts
const POSTAL_TO_REGION: Record<string, string> = {
  V: 'bc', T: 'alberta',
  R: 'prairies', S: 'prairies',
  K: 'ontario', L: 'ontario', M: 'ontario', N: 'ontario', P: 'ontario',
  G: 'quebec', H: 'quebec', J: 'quebec',
  A: 'atlantic', B: 'atlantic', C: 'atlantic', E: 'atlantic',
  X: 'remote', Y: 'remote',
}

const RATE_PER_KG: Record<string, Record<string, number>> = {
  bc:       { bc: 0.85, alberta: 0.95, prairies: 1.10, ontario: 1.35, quebec: 1.45, atlantic: 1.55, remote: 2.20 },
  alberta:  { bc: 0.95, alberta: 0.85, prairies: 0.95, ontario: 1.25, quebec: 1.35, atlantic: 1.45, remote: 2.20 },
  prairies: { bc: 1.10, alberta: 0.95, prairies: 0.85, ontario: 1.15, quebec: 1.25, atlantic: 1.35, remote: 2.20 },
  ontario:  { bc: 1.35, alberta: 1.25, prairies: 1.15, ontario: 0.85, quebec: 0.95, atlantic: 1.10, remote: 2.20 },
  quebec:   { bc: 1.45, alberta: 1.35, prairies: 1.25, ontario: 0.95, quebec: 0.85, atlantic: 0.95, remote: 2.20 },
  atlantic: { bc: 1.55, alberta: 1.45, prairies: 1.35, ontario: 1.10, quebec: 0.95, atlantic: 0.85, remote: 2.20 },
  remote:   { bc: 2.20, alberta: 2.20, prairies: 2.20, ontario: 2.20, quebec: 2.20, atlantic: 2.20, remote: 2.20 },
}

const MIN_CHARGE: Record<string, Record<string, number>> = {
  bc:       { bc: 45, alberta: 55, prairies: 65, ontario: 85, quebec: 95, atlantic: 105, remote: 185 },
  alberta:  { bc: 55, alberta: 45, prairies: 55, ontario: 75, quebec: 85, atlantic: 95,  remote: 185 },
  prairies: { bc: 65, alberta: 55, prairies: 45, ontario: 65, quebec: 75, atlantic: 85,  remote: 185 },
  ontario:  { bc: 85, alberta: 75, prairies: 65, ontario: 45, quebec: 55, atlantic: 65,  remote: 185 },
  quebec:   { bc: 95, alberta: 85, prairies: 75, ontario: 55, quebec: 45, atlantic: 55,  remote: 185 },
  atlantic: { bc: 105, alberta: 95, prairies: 85, ontario: 65, quebec: 55, atlantic: 45, remote: 185 },
  remote:   { bc: 185, alberta: 185, prairies: 185, ontario: 185, quebec: 185, atlantic: 185, remote: 185 },
}

const TRANSIT: Record<string, Record<string, { min: number; max: number }>> = {
  bc:       { bc:{min:1,max:2}, alberta:{min:1,max:2}, prairies:{min:2,max:3}, ontario:{min:4,max:6}, quebec:{min:5,max:7}, atlantic:{min:6,max:8}, remote:{min:8,max:12} },
  alberta:  { bc:{min:1,max:2}, alberta:{min:1,max:2}, prairies:{min:1,max:2}, ontario:{min:3,max:5}, quebec:{min:4,max:6}, atlantic:{min:5,max:7}, remote:{min:8,max:12} },
  prairies: { bc:{min:2,max:3}, alberta:{min:1,max:2}, prairies:{min:1,max:2}, ontario:{min:3,max:4}, quebec:{min:3,max:5}, atlantic:{min:4,max:6}, remote:{min:8,max:12} },
  ontario:  { bc:{min:4,max:6}, alberta:{min:3,max:5}, prairies:{min:3,max:4}, ontario:{min:1,max:2}, quebec:{min:1,max:2}, atlantic:{min:3,max:4}, remote:{min:8,max:12} },
  quebec:   { bc:{min:5,max:7}, alberta:{min:4,max:6}, prairies:{min:3,max:5}, ontario:{min:1,max:2}, quebec:{min:1,max:2}, atlantic:{min:2,max:3}, remote:{min:8,max:12} },
  atlantic: { bc:{min:6,max:8}, alberta:{min:5,max:7}, prairies:{min:4,max:6}, ontario:{min:3,max:4}, quebec:{min:2,max:3}, atlantic:{min:1,max:2}, remote:{min:8,max:12} },
  remote:   { bc:{min:8,max:12}, alberta:{min:8,max:12}, prairies:{min:8,max:12}, ontario:{min:8,max:12}, quebec:{min:8,max:12}, atlantic:{min:8,max:12}, remote:{min:8,max:12} },
}

const CAD_USD = 0.74

function getRegion(postal: string): string {
  const prefix = (postal ?? '').trim().toUpperCase()[0] ?? 'M'
  return POSTAL_TO_REGION[prefix] ?? 'ontario'
}

function round2(n: number) { return Math.round(n * 100) / 100 }

const fx = computed(() => props.currency === 'USD' ? CAD_USD : 1)
const sym = computed(() => props.currency)

const quoteReady = computed(() =>
  !!(props.state.originPostal && props.state.destinationPostal && props.state.weight && props.state.weight > 0)
)

// Tax by destination postal first char
const TAX_BY_LETTER: Record<string, { rate: number; label: string }> = {
  V:{rate:0.12,label:'GST+PST 12%'}, T:{rate:0.05,label:'GST 5%'},
  S:{rate:0.11,label:'GST+PST 11%'}, R:{rate:0.12,label:'GST+RST 12%'},
  K:{rate:0.13,label:'HST 13%'}, L:{rate:0.13,label:'HST 13%'}, M:{rate:0.13,label:'HST 13%'},
  N:{rate:0.13,label:'HST 13%'}, P:{rate:0.13,label:'HST 13%'},
  G:{rate:0.14975,label:'QST 14.975%'}, H:{rate:0.14975,label:'QST 14.975%'}, J:{rate:0.14975,label:'QST 14.975%'},
  A:{rate:0.15,label:'HST 15%'}, B:{rate:0.15,label:'HST 15%'}, C:{rate:0.15,label:'HST 15%'}, E:{rate:0.15,label:'HST 15%'},
  X:{rate:0.05,label:'GST 5%'}, Y:{rate:0.05,label:'GST 5%'},
}
const taxInfo = computed(() => {
  const k = (props.state.destinationPostal ?? '').trim().toUpperCase()[0] ?? 'M'
  return TAX_BY_LETTER[k] ?? { rate: 0.05, label: 'GST 5%' }
})

type ServiceKey = 'standard' | 'express' | 'ltl'

const services: { key: ServiceKey; label: string; multiplier: number; badge?: string }[] = [
  { key: 'standard', label: 'Standard', multiplier: 1.0 },
  { key: 'express',  label: 'Express',  multiplier: 2.0, badge: 'Fastest' },
  { key: 'ltl',     label: 'LTL',      multiplier: 1.15, badge: 'Best Value' },
]

const breakdown = computed(() => {
  if (!quoteReady.value) return null

  const orig = getRegion(props.state.originPostal!)
  const dest = getRegion(props.state.destinationPostal!)
  const weight = props.state.weight!

  const ratePerKg = RATE_PER_KG[orig][dest]
  const minCharge = MIN_CHARGE[orig][dest]
  const transit = TRANSIT[orig][dest]

  const fuelPct = 0.22
  const residentialFee = props.state.isResidential ? 35 : 0
  const liftgateFee = props.state.requiresLiftgate ? 75 : 0
  const hazmatFee = props.state.isHazmat ? 150 : 0
  const insurance = (props.state.declaredValue ?? 0) > 0
    ? round2(Math.max((props.state.declaredValue ?? 0) * 0.015, 25))
    : 0

  return services.map(svc => {
    const rawBase = weight * ratePerKg * svc.multiplier
    const baseRate = round2(Math.max(rawBase, minCharge))
    const fuel = round2(baseRate * fuelPct)
    const addons = residentialFee + liftgateFee + insurance + hazmatFee
    const subtotal = round2((baseRate + fuel + addons) * fx.value)
    const tax = round2(subtotal * taxInfo.value.rate)
    const total = round2(subtotal + tax)

    return {
      ...svc,
      baseRate: round2(baseRate * fx.value),
      fuelSurcharge: round2(fuel * fx.value),
      residentialFee: round2(residentialFee * fx.value),
      liftgateFee: round2(liftgateFee * fx.value),
      hazmatFee: round2(hazmatFee * fx.value),
      insurance: round2(insurance * fx.value),
      subtotal,
      tax,
      total,
      transit,
    }
  })
})

const addonRows = computed(() => {
  const rows = []
  if (!breakdown.value) return []
  if (props.state.isResidential) rows.push('residentialFee')
  if (props.state.requiresLiftgate) rows.push('liftgateFee')
  if (props.state.isHazmat) rows.push('hazmatFee')
  if ((props.state.declaredValue ?? 0) > 0) rows.push('insurance')
  return rows
})

const addonLabels: Record<string, string> = {
  residentialFee: 'Residential',
  liftgateFee: 'Liftgate',
  hazmatFee: 'Hazmat',
  insurance: 'Insurance',
}

function fmt(n: number) {
  return `${sym.value} $${n.toFixed(2)}`
}
</script>

<template>
  <div v-if="quoteReady && breakdown" class="pricing-table-wrap">
    <div class="pt-header">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
      Estimated Rates
      <span class="pt-note">Informational — based on entered details</span>
    </div>

    <div class="pt-table-container">
      <table class="pt-table">
        <thead>
          <tr>
            <th class="pt-label-col">Fee</th>
            <th v-for="svc in breakdown" :key="svc.key" class="pt-svc-col">
              <div class="svc-head">
                <span class="svc-name">{{ svc.label }}</span>
                <span v-if="svc.badge" class="svc-badge">{{ svc.badge }}</span>
              </div>
              <div class="svc-transit">{{ svc.transit.min }}–{{ svc.transit.max }} biz days</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">Base Rate</td>
            <td v-for="svc in breakdown" :key="svc.key" class="row-val">{{ fmt(svc.baseRate) }}</td>
          </tr>
          <tr>
            <td class="row-label">Fuel Surcharge <span class="row-note">(22%)</span></td>
            <td v-for="svc in breakdown" :key="svc.key" class="row-val">{{ fmt(svc.fuelSurcharge) }}</td>
          </tr>
          <tr v-for="addon in addonRows" :key="addon">
            <td class="row-label">{{ addonLabels[addon] }}</td>
            <td v-for="svc in breakdown" :key="svc.key" class="row-val">
              {{ fmt((svc as any)[addon]) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="subtotal-row">
            <td class="row-label">Subtotal</td>
            <td v-for="svc in breakdown" :key="svc.key" class="subtotal-val">{{ fmt(svc.subtotal) }}</td>
          </tr>
          <tr class="tax-row">
            <td class="row-label">Tax <span class="row-note">({{ taxInfo.label }})</span></td>
            <td v-for="svc in breakdown" :key="svc.key" class="row-val">{{ fmt(svc.tax) }}</td>
          </tr>
          <tr class="total-row">
            <td class="row-label">Total incl. Tax</td>
            <td v-for="svc in breakdown" :key="svc.key" class="total-val">{{ fmt(svc.total) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <p class="pt-disclaimer">
      Final rates confirmed upon booking. Subject to carrier surcharges and tariff changes.
    </p>
  </div>

  <div v-else-if="!quoteReady" class="pt-empty">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
    <span>Enter origin, destination &amp; weight to see estimated rates</span>
  </div>
</template>

<style scoped>
.pricing-table-wrap {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(10, 13, 20, 0.5);
}

.pt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  font-size: 12px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0,0,0,0.2);
}

.pt-note {
  margin-left: auto;
  font-size: 10px;
  font-weight: 400;
  color: #4B5563;
  text-transform: none;
  letter-spacing: 0;
}

.pt-table-container {
  overflow-x: auto;
}

.pt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.pt-label-col {
  width: 160px;
  min-width: 140px;
  text-align: left;
  padding: 12px 20px;
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(0,0,0,0.15);
  border-right: 1px solid rgba(255,255,255,0.04);
}

.pt-svc-col {
  padding: 12px 16px;
  text-align: center;
  border-left: 1px solid rgba(255,255,255,0.04);
}

.svc-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.svc-name {
  font-size: 13px;
  font-weight: 700;
  color: #F9FAFB;
}

.svc-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 99px;
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.svc-transit {
  font-size: 10px;
  color: #6B7280;
  margin-top: 3px;
}

tbody tr {
  border-top: 1px solid rgba(255,255,255,0.04);
  transition: background 0.1s;
}

tbody tr:hover {
  background: rgba(255,255,255,0.02);
}

.row-label {
  padding: 10px 20px;
  color: #9CA3AF;
  font-size: 12px;
  background: rgba(0,0,0,0.1);
  border-right: 1px solid rgba(255,255,255,0.04);
}

.row-note {
  color: #4B5563;
  font-size: 10px;
}

.row-val {
  padding: 10px 16px;
  text-align: center;
  color: #D1D5DB;
  font-variant-numeric: tabular-nums;
  border-left: 1px solid rgba(255,255,255,0.04);
}

tfoot .total-row {
  border-top: 2px solid rgba(245, 158, 11, 0.3);
}

.subtotal-val {
  padding: 10px 16px;
  text-align: center;
  color: #9CA3AF;
  font-variant-numeric: tabular-nums;
  border-left: 1px solid rgba(255,255,255,0.04);
  font-size: 12px;
}

tfoot .subtotal-row {
  border-top: 1px solid rgba(255,255,255,0.06);
}

tfoot .tax-row {
  color: #6B7280;
  font-style: italic;
}

.total-val {
  padding: 14px 16px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: #F59E0B;
  font-variant-numeric: tabular-nums;
  border-left: 1px solid rgba(255,255,255,0.04);
}

tfoot .row-label {
  font-size: 12px;
  font-weight: 700;
  color: #9CA3AF;
  padding: 10px 20px;
}

tfoot .total-row .row-label {
  font-size: 13px;
  font-weight: 800;
  color: #F9FAFB;
  padding: 14px 20px;
}

.pt-disclaimer {
  padding: 10px 20px;
  font-size: 10px;
  color: #374151;
  border-top: 1px solid rgba(255,255,255,0.04);
  background: rgba(0,0,0,0.1);
}

.pt-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  font-size: 12px;
  color: #4B5563;
  border: 1px dashed rgba(255,255,255,0.06);
  border-radius: 14px;
}
</style>
