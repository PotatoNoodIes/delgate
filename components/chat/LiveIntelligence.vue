<script setup lang="ts">
import { ref } from 'vue'
import type { LiveIntelligence } from '~/types/intelligence'

const props = defineProps<{
  data: LiveIntelligence | null
}>()

const safe = computed(() => props.data ?? {
  priceExplanation: [],
  risks: [],
  recommendations: []
})

const expanded = ref<Record<string, boolean>>({
  price: true,
  risks: true,
  recs: false,
})

function toggle(key: string) {
  expanded.value[key] = !expanded.value[key]
}
</script>

<template>
  <div class="live-intel">
    <div class="intel-header">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <span>Live Quote Intelligence</span>
      <span class="intel-badge">AI</span>
    </div>

    <div v-if="safe.priceExplanation.length" class="intel-section">
      <button class="section-toggle" @click="toggle('price')">
        <div class="toggle-left">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Price Drivers
        </div>
        <svg :style="{ transform: expanded.price ? 'rotate(180deg)' : '' }" class="chevron" width="12" height="12"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <Transition name="slide">
        <div v-if="expanded.price" class="section-body">
          <div v-for="(item, i) in safe.priceExplanation" :key="i" class="intel-row">
            <span :class="['trend', item.changeType]">
              <svg v-if="item.changeType === 'increase'" width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3">
                <path d="m19 12-7-7-7 7M12 19V5" />
              </svg>
              <svg v-else-if="item.changeType === 'decrease'" width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3">
                <path d="m5 12 7 7 7-7M12 5v14" />
              </svg>
              <span v-else class="dot">•</span>
            </span>
            <p class="row-reason">{{ item.reason }}</p>
            <span class="row-impact">{{ item.impact }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="safe.risks.length" class="intel-section">
      <button class="section-toggle" @click="toggle('risks')">
        <div class="toggle-left">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          Risks & Gaps
          <span class="pill pill--warn">{{ safe.risks.length }}</span>
        </div>
        <svg :style="{ transform: expanded.risks ? 'rotate(180deg)' : '' }" class="chevron" width="12" height="12"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <Transition name="slide">
        <div v-if="expanded.risks" class="section-body">
          <div v-for="(risk, i) in safe.risks" :key="i" :class="['risk-row', risk.type]">
            <svg v-if="risk.type === 'risk'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444"
              stroke-width="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
            <svg v-else-if="risk.type === 'warning'" width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="#F59E0B" stroke-width="2.5">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <div class="risk-content">
              <p>{{ risk.message }}</p>
              <span v-if="risk.field" class="risk-field">{{ risk.field }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="safe.recommendations.length" class="intel-section">
      <button class="section-toggle" @click="toggle('recs')">
        <div class="toggle-left">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Recommendations
          <span class="pill pill--green">{{ safe.recommendations.length }}</span>
        </div>
        <svg :style="{ transform: expanded.recs ? 'rotate(180deg)' : '' }" class="chevron" width="12" height="12"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <Transition name="slide">
        <div v-if="expanded.recs" class="section-body">
          <div v-for="(rec, i) in safe.recommendations" :key="i" class="rec-row">
            <div class="rec-check">✓</div>
            <div class="rec-content">
              <p class="rec-title">{{ rec.title }}</p>
              <p class="rec-desc">{{ rec.description }}</p>
              <div v-if="rec.savings" class="rec-saving">{{ rec.savings }} savings</div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.live-intel {
  border: 1px solid rgba(245, 158, 11, 0.12);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(10, 12, 18, 0.8);
}

.intel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.04);
  border-bottom: 1px solid rgba(245, 158, 11, 0.08);
  font-size: 11px;
  font-weight: 800;
  color: #8B949E;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.intel-badge {
  margin-left: auto;
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
  font-size: 9px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 99px;
  letter-spacing: 1px;
}

.intel-section {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.intel-section:first-of-type {
  border-top: none;
}

.section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: none;
  border: none;
  color: #9CA3AF;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.section-toggle:hover {
  background: rgba(255, 255, 255, 0.03);
  color: #F9FAFB;
}

.toggle-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chevron {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.pill {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 99px;
  line-height: 1.6;
}

.pill--warn {
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
}

.pill--green {
  background: rgba(16, 185, 129, 0.15);
  color: #10B981;
}

.section-body {
  padding: 4px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 500px;
}

/* Price rows */
.intel-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.trend {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.trend.increase {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.trend.decrease {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.trend.neutral {
  color: #9CA3AF;
}

.dot {
  font-size: 16px;
  line-height: 1;
}

.row-reason {
  flex: 1;
  font-size: 12px;
  color: #D1D5DB;
  margin: 0;
  line-height: 1.4;
}

.row-impact {
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  flex-shrink: 0;
}

/* Risk rows */
.risk-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
}

.risk-row.risk {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.15);
}

.risk-row.warning {
  background: rgba(245, 158, 11, 0.05);
  border-color: rgba(245, 158, 11, 0.15);
}

.risk-row.missing {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
}

.risk-content p {
  font-size: 12px;
  color: #E5E7EB;
  margin: 0;
  line-height: 1.4;
}

.risk-field {
  font-size: 10px;
  color: #4B5563;
  text-transform: uppercase;
}

/* Rec rows */
.rec-row {
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.04);
  border: 1px solid rgba(16, 185, 129, 0.1);
}

.rec-check {
  background: #10B981;
  color: #000;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  flex-shrink: 0;
  margin-top: 1px;
}

.rec-title {
  font-size: 12px;
  font-weight: 700;
  color: #F9FAFB;
  margin: 0 0 2px;
}

.rec-desc {
  font-size: 11px;
  color: #9CA3AF;
  margin: 0;
  line-height: 1.4;
}

.rec-saving {
  font-size: 10px;
  font-weight: 700;
  color: #10B981;
  margin-top: 4px;
}
</style>
