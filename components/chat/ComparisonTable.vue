<script setup lang="ts">
import { computed } from 'vue'
import type { Currency } from '~/types/shipment'

const props = defineProps<{
  weight: number | undefined
  currency: Currency
}>()

const rates = computed(() => {
  const base = props.weight ? props.weight * 0.5 + 50 : 0
  if (base === 0) return []

  return [
    { type: 'Standard', price: base, time: '3-5 days', icon: '🚚' },
    { type: 'Express', price: base * 1.4, time: '1-2 days', icon: '⚡' },
    { type: 'LTL', price: base * 0.8 + 100, time: '4-7 days', icon: '📦' }
  ]
})

const formatPrice = (p: number) => {
  const sym = props.currency === 'USD' ? 'USD' : 'CAD'
  return `${sym} $${p.toFixed(2)}`
}
</script>

<template>
  <div v-if="weight" class="comparison-grid">
    <div v-for="rate in rates" :key="rate.type" class="rate-card">
      <div class="rate-header">
        <span class="rate-icon">{{ rate.icon }}</span>
        <span class="rate-type">{{ rate.type }}</span>
      </div>
      <div class="rate-price">{{ formatPrice(rate.price) }}</div>
      <div class="rate-time">{{ rate.time }}</div>
    </div>
  </div>
</template>

<style scoped>
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.rate-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  transition: all 0.2s;
}

.rate-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: #F59E0B;
}

.rate-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}

.rate-icon {
  font-size: 14px;
}

.rate-type {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #9CA3AF;
  letter-spacing: 0.5px;
}

.rate-price {
  font-size: 14px;
  font-weight: 700;
  color: #F9FAFB;
  margin-bottom: 4px;
}

.rate-time {
  font-size: 10px;
  color: #6B7280;
}
</style>
