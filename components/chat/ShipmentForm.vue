<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShipmentData, Currency } from '~/types/shipment'

const props = defineProps<{
  state: Partial<ShipmentData>
  currency: Currency
  disabled?: boolean
}>()

const emit = defineEmits(['update:state', 'update:currency', 'request-quote'])

const weightUnit = ref<'kg' | 'lb'>('kg')
const dimUnit = ref<'cm' | 'in'>('cm')

function updateField(key: keyof ShipmentData, value: any) {
  emit('update:state', { ...props.state, [key]: value })
}

function toggleCurrency() {
  emit('update:currency', props.currency === 'CAD' ? 'USD' : 'CAD')
}

const progress = computed(() => {
  const fields: (keyof ShipmentData)[] = [
    'contactName', 'contactEmail', 'originPostal', 'destinationPostal',
    'weight', 'serviceType'
  ]
  const filled = fields.filter(f => !!props.state[f]).length
  return Math.round((filled / fields.length) * 100)
})

const isFormReady = computed(() => progress.value >= 80)
</script>

<template>
  <div class="shipment-form">
    <div class="form-header">
      <div class="title-row">
        <h2 class="form-title">Live Quote</h2>
        <div class="header-actions">
          <button class="toggle-btn" @click="toggleCurrency">{{ currency }}</button>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-section">
        <label class="section-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Contact Information
        </label>
        <div class="input-group">
          <input :value="state.contactName"
            @input="e => updateField('contactName', (e.target as HTMLInputElement).value)" placeholder="Full Name"
            class="form-input" :disabled="disabled" />
          <input :value="state.contactEmail"
            @input="e => updateField('contactEmail', (e.target as HTMLInputElement).value)" placeholder="Email Address"
            class="form-input" :disabled="disabled" />
        </div>
      </div>

      <div class="form-section">
        <label class="section-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Route
        </label>
        <div class="input-group">
          <input :value="state.originPostal"
            @input="e => updateField('originPostal', (e.target as HTMLInputElement).value)" placeholder="Origin Postal"
            class="form-input" :disabled="disabled" />
          <input :value="state.destinationPostal"
            @input="e => updateField('destinationPostal', (e.target as HTMLInputElement).value)"
            placeholder="Destination Postal" class="form-input" :disabled="disabled" />
        </div>
        <p v-if="state.originAddress || state.destinationAddress" class="resolved-note">
          <span v-if="state.originAddress">{{ state.originAddress }}</span>
          <span v-if="state.originAddress && state.destinationAddress" class="arrow">→</span>
          <span v-if="state.destinationAddress">{{ state.destinationAddress }}</span>
        </p>
      </div>

      <div class="form-section">
        <label class="section-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="m7.5 4.27 9 5.15" />
            <path
              d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
          Cargo Specs & Protection
        </label>
        <div class="input-group">
          <div class="unit-input">
            <input type="number" :value="state.weight"
              @input="e => updateField('weight', +(e.target as HTMLInputElement).value)" placeholder="Weight"
              class="form-input" :disabled="disabled" />
            <button class="unit-toggle" @click="weightUnit = weightUnit === 'kg' ? 'lb' : 'kg'">{{ weightUnit
            }}</button>
          </div>
          <select :value="state.serviceType"
            @change="e => updateField('serviceType', (e.target as HTMLSelectElement).value)" class="form-input"
            :disabled="disabled">
            <option value="" disabled>Service Type</option>
            <option value="standard">Standard</option>
            <option value="express">Express</option>
            <option value="ltl">LTL (Pallets)</option>
          </select>
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <input type="number" :value="state.declaredValue"
            @input="e => updateField('declaredValue', +(e.target as HTMLInputElement).value)"
            placeholder="Declared Cargo Value ($)" class="form-input" :disabled="disabled" />
        </div>
      </div>

      <div class="form-section">
        <label class="section-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 21h9" />
            <path d="m21 8-9-5-9 5v8l9 5 9-5Z" />
            <path d="M12 22V12" />
            <path d="m21 8-9 5-9-5" />
          </svg>
          Dimensions
        </label>
        <div class="dim-grid">
          <div class="dim-input">
            <input type="number" :value="state.dimensions?.length"
              @input="e => updateField('dimensions', { ...state.dimensions, length: +(e.target as HTMLInputElement).value })"
              placeholder="L" class="form-input" />
          </div>
          <div class="dim-input">
            <input type="number" :value="state.dimensions?.width"
              @input="e => updateField('dimensions', { ...state.dimensions, width: +(e.target as HTMLInputElement).value })"
              placeholder="W" class="form-input" />
          </div>
          <div class="dim-input">
            <input type="number" :value="state.dimensions?.height"
              @input="e => updateField('dimensions', { ...state.dimensions, height: +(e.target as HTMLInputElement).value })"
              placeholder="H" class="form-input" />
            <button class="unit-toggle" @click="dimUnit = dimUnit === 'cm' ? 'in' : 'cm'">{{ dimUnit }}</button>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label class="section-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Requirements
        </label>
        <div class="checkbox-group">
          <button :class="['check-pill', state.isResidential ? 'active' : '']"
            @click="updateField('isResidential', !state.isResidential)">Residential</button>
          <button :class="['check-pill', state.requiresLiftgate ? 'active' : '']"
            @click="updateField('requiresLiftgate', !state.requiresLiftgate)">Liftgate</button>
          <button :class="['check-pill', state.isHazmat ? 'active' : '']"
            @click="updateField('isHazmat', !state.isHazmat)">Hazmat</button>
          <button :class="['check-pill', state.requiresInsurance ? 'active' : '']"
            @click="updateField('requiresInsurance', !state.requiresInsurance)">Insurance Protection</button>
        </div>
      </div>

      <button class="get-quote-btn" :disabled="!isFormReady || disabled" @click="emit('request-quote')">
        <span>Get Accurate Quote</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M5 12h14m-7-7 7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.shipment-form {
  padding: 32px;
  background: rgba(14, 17, 25, 0.4);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.form-header {
  margin-bottom: 32px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.form-title {
  font-size: 18px;
  font-weight: 700;
  color: #F9FAFB;
}

.progress-bar {
  height: 6px;
  background: #111827;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #F59E0B, #D97706);
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #4B5563;
  margin-bottom: 10px;
}

.input-group {
  display: flex;
  gap: 12px;
}

.form-input {
  flex: 1;
  background: #0A0D14;
  border: 1px solid #1F2937;
  border-radius: 10px;
  color: #F9FAFB;
  font-size: 14px;
  padding: 12px 14px;
  outline: none;
  transition: all 0.15s;
}

.dim-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 10px;
}

.dim-input {
  position: relative;
  display: flex;
}

.form-input:focus {
  border-color: #F59E0B;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.unit-input {
  flex: 1;
  position: relative;
  display: flex;
}

.unit-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #1F2937;
  border: none;
  color: #6B7280;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  text-transform: uppercase;
}

.unit-toggle:hover {
  color: #F9FAFB;
  background: #374151;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.check-pill {
  padding: 8px 16px;
  background: #0A0D14;
  border: 1px solid #1F2937;
  border-radius: 99px;
  font-size: 13px;
  color: #9CA3AF;
  cursor: pointer;
  transition: all 0.15s;
}

.check-pill.active {
  background: rgba(245, 158, 11, 0.1);
  border-color: #F59E0B;
  color: #F59E0B;
}

.resolved-note {
  font-size: 12px;
  color: #10B981;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.arrow {
  opacity: 0.5;
  color: #6B7280;
}

.get-quote-btn {
  margin-top: 10px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: #0A0D14;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
}

.get-quote-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  opacity: 0.95;
}

.get-quote-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.toggle-btn {
  background: #1F2937;
  border: 1px solid #374151;
  color: #9CA3AF;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
}
</style>