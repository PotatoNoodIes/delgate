<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FreightQuote, QuoteLineItem } from '~/types/quote'

const props = defineProps<{
  quote: FreightQuote
  sessionId: string
}>()

const emailInput = ref('')
const emailSending = ref(false)
const emailStatus = ref<'idle' | 'success' | 'error'>('idle')
const downloading = ref(false)
const downloadError = ref('')

const sym = computed(() => props.quote.currency)

const lineItems = computed((): QuoteLineItem[] => {
  const p = props.quote.pricing
  const items: QuoteLineItem[] = [
    { label: 'Base Rate', amount: p.baseRate },
    { label: 'Fuel Surcharge', amount: p.fuelSurcharge, note: '22%' },
  ]
  if (p.residentialFee) items.push({ label: 'Residential Fee', amount: p.residentialFee })
  if (p.liftgateFee) items.push({ label: 'Liftgate Fee', amount: p.liftgateFee })
  if (p.insurance) items.push({ label: 'Insurance', amount: p.insurance, note: '1.5% of declared value' })
  if (p.hazmatFee) items.push({ label: 'Hazmat Handling', amount: p.hazmatFee })
  return items
})

const qIdRef = computed(() => props.quote.id.slice(0, 8).toUpperCase())

// ── PDF Download via fetch → Blob → anchor (100% reliable) ─────────────────
async function downloadPDF() {
  if (downloading.value) return
  downloading.value = true
  downloadError.value = ''

  try {
    const response = await fetch(`/delgate/api/quote/download?sessionId=${props.sessionId}`)
    if (!response.ok) {
      const txt = await response.text()
      try {
        const json = JSON.parse(txt)
        throw new Error(json.statusMessage || json.message || 'Server error')
      } catch {
        throw new Error(txt || `Server error ${response.status}`)
      }
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `DelGate-Freight-Quote-DLG-${qIdRef.value}.pdf`
    document.body.appendChild(a)
    a.click()

    // Cleanup
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    }, 100)

  } catch (err: unknown) {
    console.error('[PDF Download Error]', err)
    downloadError.value = err instanceof Error ? err.message : 'Download failed'
  } finally {
    downloading.value = false
  }
}

// ── Email ─────────────────────────────────────────────────────────────────
async function sendEmail(target?: string) {
  const email = target || emailInput.value
  if (!email) return
  emailSending.value = true
  emailStatus.value = 'idle'
  try {
    await fetch('/delgate/api/quote/email', {
      method: 'POST',
      body: JSON.stringify({ sessionId: props.sessionId, email }),
      headers: { 'Content-Type': 'application/json' },
    })
    emailStatus.value = 'success'
    emailInput.value = ''
  } catch {
    emailStatus.value = 'error'
  } finally {
    emailSending.value = false
  }
}
</script>

<template>
  <div class="qc">
    <!-- Header Row: ref + total -->
    <div class="qc-header">
      <div>
        <p class="qc-eyebrow">Official Freight Quote</p>
        <h2 class="qc-ref">#DLG-{{ qIdRef }}</h2>
        <p class="qc-date">{{ new Date(quote.createdAt).toLocaleDateString('en-CA', {
          year: 'numeric', month: 'long',
          day: 'numeric'
        }) }}</p>
      </div>
      <div class="qc-total-box">
        <p class="qc-eyebrow">Total incl. Tax</p>
        <h1 class="qc-grand">{{ sym }} ${{ quote.pricing.totalWithTax.toFixed(2) }}</h1>
        <p class="qc-pretax">Pre-tax: {{ sym }} ${{ quote.pricing.total.toFixed(2) }}</p>
      </div>
    </div>

    <!-- Route Map -->
    <ClientOnly>
      <ChatLogisticsMap :origin="quote.shipment.originPostal || ''"
        :destination="quote.shipment.destinationPostal || ''" />
    </ClientOnly>

    <!-- Shipment Info Grid -->
    <div class="qc-grid">
      <div class="qc-cell">
        <p class="cell-label">FROM</p>
        <p class="cell-main">{{ quote.shipment.originAddress || quote.shipment.originPostal }}</p>
        <p class="cell-sub">{{ quote.shipment.originPostal?.toUpperCase() }}</p>
      </div>
      <div class="qc-cell qc-cell--center">
        <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
          <path d="M1 8h30M24 2l6 6-6 6" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
        <p class="cell-sub">{{ quote.transitDays.min }}-{{ quote.transitDays.max }} business days</p>
      </div>
      <div class="qc-cell qc-cell--right">
        <p class="cell-label">TO</p>
        <p class="cell-main">{{ quote.shipment.destinationAddress || quote.shipment.destinationPostal }}</p>
        <p class="cell-sub">{{ quote.shipment.destinationPostal?.toUpperCase() }}</p>
      </div>
      <div class="qc-cell">
        <p class="cell-label">CLIENT</p>
        <p class="cell-main">{{ quote.shipment.contactName || '—' }}</p>
        <p class="cell-sub">{{ quote.shipment.contactEmail }}</p>
      </div>
      <div class="qc-cell">
        <p class="cell-label">SERVICE</p>
        <p class="cell-main svc-badge">{{ (quote.shipment.serviceType || 'standard').toUpperCase() }}</p>
      </div>
      <div class="qc-cell">
        <p class="cell-label">WEIGHT</p>
        <p class="cell-main">{{ quote.shipment.weight ?? '—' }} kg</p>
      </div>
    </div>

    <!-- Cost Breakdown Table -->
    <div class="qc-breakdown">
      <p class="breakdown-title">Cost Breakdown</p>

      <div v-for="item in lineItems" :key="item.label" class="brow">
        <span class="brow-label">
          {{ item.label }}
          <small v-if="item.note"> ({{ item.note }})</small>
          <ChatQuoteAIExplainer :item-label="item.label" context="fee" :quote-context="quote" />
        </span>
        <span class="brow-dots" />
        <span class="brow-val">{{ sym }} ${{ item.amount.toFixed(2) }}</span>
      </div>

      <!-- Subtotal -->
      <div class="brow brow--sub">
        <span class="brow-label">Subtotal</span>
        <span class="brow-dots" />
        <span class="brow-val">{{ sym }} ${{ quote.pricing.total.toFixed(2) }}</span>
      </div>

      <!-- Tax line -->
      <div class="brow brow--tax">
        <span class="brow-label">
          Tax — {{ quote.pricing.taxLabel }}
          <ChatQuoteAIExplainer item-label="Applicable Taxes" context="tax" :quote-context="quote" />
        </span>
        <span class="brow-dots" />
        <span class="brow-val">{{ sym }} ${{ quote.pricing.tax.toFixed(2) }}</span>
      </div>

      <!-- Grand Total -->
      <div class="brow brow--total">
        <span class="brow-label">TOTAL</span>
        <span class="brow-dots" />
        <span class="brow-val grand">{{ sym }} ${{ quote.pricing.totalWithTax.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="qc-actions">
      <button class="btn-pdf" :disabled="downloading" @click="downloadPDF">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {{ downloading ? 'Preparing PDF…' : 'Download PDF' }}
      </button>
      <p v-if="downloadError" class="dl-err">{{ downloadError }}</p>

      <!-- Email -->
      <div v-if="quote.shipment.contactEmail" class="btn-email-wrap">
        <button class="btn-email" :disabled="emailSending" @click="sendEmail(quote.shipment.contactEmail)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          {{ emailStatus === 'success' ? '✓ Sent!' : `Send to ${quote.shipment.contactEmail}` }}
        </button>
      </div>
      <div v-else class="email-row">
        <input v-model="emailInput" type="email" placeholder="Email this quote…" @keydown.enter="sendEmail()" />
        <button :disabled="emailSending || !emailInput" @click="sendEmail()">
          {{ emailSending ? '…' : 'Send' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qc {
  background: #0D1117;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 28px;
  color: #E6EDF3;
  width: 100%;
}

/* Header */
.qc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
}

.qc-eyebrow {
  font-size: 10px;
  font-weight: 800;
  color: #484F58;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin: 0 0 4px;
}

.qc-ref {
  font-size: 22px;
  font-weight: 900;
  color: #F59E0B;
  margin: 0 0 4px;
}

.qc-date {
  font-size: 11px;
  color: #6B7280;
  margin: 0;
}

.qc-total-box {
  text-align: right;
}

.qc-grand {
  font-size: 32px;
  font-weight: 900;
  color: #F9FAFB;
  margin: 4px 0 2px;
  font-variant-numeric: tabular-nums;
}

.qc-pretax {
  font-size: 11px;
  color: #6B7280;
  margin: 0;
}

/* Grid */
.qc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.qc-cell {
  background: #0D1117;
  padding: 14px 16px;
}

.qc-cell--center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.qc-cell--right {
  text-align: right;
}

.cell-label {
  font-size: 9px;
  font-weight: 800;
  color: #484F58;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 4px;
}

.cell-main {
  font-size: 13px;
  font-weight: 700;
  color: #F9FAFB;
  margin: 0 0 2px;
}

.cell-sub {
  font-size: 11px;
  color: #6B7280;
  margin: 0;
}

.svc-badge {
  color: #F59E0B !important;
}

/* Breakdown */
.qc-breakdown {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.breakdown-title {
  font-size: 10px;
  font-weight: 800;
  color: #484F58;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 14px;
}

.brow {
  display: flex;
  align-items: center;
  font-size: 13px;
  margin-bottom: 8px;
}

.brow-label {
  color: #9CA3AF;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.brow-label small {
  color: #4B5563;
  font-size: 10px;
}

.brow-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.08);
  margin: 0 10px;
  height: 12px;
}

.brow-val {
  font-weight: 700;
  color: #F9FAFB;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.brow--sub {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.brow--tax {
  color: #9CA3AF;
}

.brow--tax .brow-label {
  font-style: italic;
}

.brow--total {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 2px solid rgba(245, 158, 11, 0.3);
}

.brow--total .brow-label {
  font-size: 12px;
  font-weight: 800;
  color: #F9FAFB;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.brow-val.grand {
  font-size: 20px;
  font-weight: 900;
  color: #F59E0B;
}

/* Actions */
.qc-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-pdf {
  background: #F59E0B;
  color: #000;
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-weight: 900;
  font-size: 13px;
  letter-spacing: 0.2px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  width: 100%;
}

.btn-pdf:hover:not(:disabled) {
  background: #D97706;
}

.btn-pdf:active {
  transform: scale(0.99);
}

.btn-pdf:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dl-err {
  font-size: 11px;
  color: #EF4444;
  margin: 0;
  text-align: center;
}

.btn-email-wrap {
  margin-top: 2px;
}

.btn-email {
  width: 100%;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  color: #F59E0B;
  padding: 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;
}

.btn-email:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.12);
}

.btn-email:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.email-row {
  display: flex;
  gap: 8px;
}

.email-row input {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 14px;
  color: #F9FAFB;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.email-row input:focus {
  border-color: rgba(245, 158, 11, 0.4);
}

.email-row button {
  background: #30363D;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.email-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
