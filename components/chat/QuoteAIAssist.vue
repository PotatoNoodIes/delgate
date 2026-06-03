<script setup lang="ts">
import { ref } from 'vue'
import type { FreightQuote } from '~/types/quote'

const props = defineProps<{
  quote: FreightQuote
  sessionId: string
}>()

const open = ref(false)
const input = ref('')
const loading = ref(false)
const messages = ref<{ role: 'user' | 'ai'; text: string }[]>([])

function toggle() {
  if (!open.value && messages.value.length === 0) {
    // Seed with the AI's existing analysis
    const seed: string[] = []
    if (props.quote.aiSummary) seed.push(props.quote.aiSummary)
    if (props.quote.risks?.length) seed.push(`**Risks:** ${props.quote.risks.join(' · ')}`)
    if (props.quote.recommendations?.length) seed.push(`**Tips:** ${props.quote.recommendations.join(' · ')}`)
    if (seed.length) {
      messages.value.push({ role: 'ai', text: seed.join('\n\n') })
    } else {
      messages.value.push({
        role: 'ai',
        text: `I'm analyzing your quote from ${props.quote.shipment.originPostal?.toUpperCase()} to ${props.quote.shipment.destinationPostal?.toUpperCase()}. Ask me anything about this shipment!`
      })
    }
  }
  open.value = !open.value
}

async function send() {
  if (!input.value.trim() || loading.value) return
  const q = input.value.trim()
  input.value = ''
  messages.value.push({ role: 'user', text: q })
  loading.value = true

  try {
    const data = await $fetch<{ message: string }>('/api/chat', {
      method: 'POST',
      body: {
        message: `[QUOTE CONTEXT] About this freight quote (${props.quote.shipment.originPostal} → ${props.quote.shipment.destinationPostal}, ${props.quote.currency} $${props.quote.pricing.totalWithTax.toFixed(2)} incl. tax): ${q}`,
        sessionId: props.sessionId,
        currency: props.quote.currency,
        currentState: props.quote.shipment,
      },
    })
    messages.value.push({ role: 'ai', text: data.message })
  } catch {
    messages.value.push({ role: 'ai', text: "I couldn't answer that right now. Please try again." })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Floating AI Trigger Button -->
  <button class="ai-fab" :class="{ active: open }" @click="toggle" title="Ask AI about this quote">
    <svg v-if="!open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2Z"/><path d="M12 12v10"/><path d="M4.93 15.05 12 12l7.07 3.05"/><path d="M4.93 15.05 12 22l7.07-7.07"/>
    </svg>
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
    <span class="fab-label">{{ open ? 'Close' : 'Ask Alex' }}</span>
  </button>

  <!-- Slide-in Panel -->
  <Transition name="panel-slide">
    <div v-if="open" class="ai-panel">
      <div class="panel-header">
        <div class="panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          Alex — Quote Intelligence
        </div>
        <span class="panel-sub">Ask about this quote</span>
      </div>

      <div class="panel-messages">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="['pmsg', msg.role]"
        >
          <div v-if="msg.role === 'ai'" class="pmsg-icon">A</div>
          <div class="pmsg-text">{{ msg.text }}</div>
        </div>
        <div v-if="loading" class="pmsg ai">
          <div class="pmsg-icon">A</div>
          <div class="pmsg-typing">
            <span /><span /><span />
          </div>
        </div>
      </div>

      <div class="panel-input">
        <input
          v-model="input"
          type="text"
          placeholder="Why is this price high? What can I do?"
          @keydown.enter="send"
        />
        <button :disabled="loading || !input.trim()" @click="send">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Floating Action Button */
.ai-fab {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: #000;
  border: none;
  border-radius: 100px;
  padding: 10px 18px 10px 14px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(245, 158, 11, 0.35);
  transition: all 0.2s;
  letter-spacing: 0.2px;
  margin-bottom: 16px;
}
.ai-fab:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 30px rgba(245, 158, 11, 0.5);
}
.ai-fab.active {
  background: #30363D;
  color: #9CA3AF;
  box-shadow: none;
}
.fab-label { line-height: 1; }

/* Panel */
.ai-panel {
  background: #0D1117;
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
}

.panel-header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(245,158,11,0.04);
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: #F59E0B;
}
.panel-sub {
  font-size: 10px;
  color: #4B5563;
  margin-top: 2px;
  display: block;
}

.panel-messages {
  max-height: 280px;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pmsg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.pmsg.user {
  flex-direction: row-reverse;
}
.pmsg-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: #000;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pmsg-text {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: #E5E7EB;
  line-height: 1.5;
  max-width: 85%;
  white-space: pre-line;
}
.pmsg.user .pmsg-text {
  background: rgba(245,158,11,0.08);
  border-color: rgba(245,158,11,0.15);
  color: #FDE68A;
}

.pmsg-typing {
  display: flex;
  gap: 4px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
}
.pmsg-typing span {
  width: 6px; height: 6px;
  background: #F59E0B;
  border-radius: 50%;
  animation: bounce 1.2s infinite;
}
.pmsg-typing span:nth-child(2) { animation-delay: 0.2s; }
.pmsg-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.panel-input {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.panel-input input {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 8px 12px;
  color: #F9FAFB;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}
.panel-input input:focus {
  border-color: rgba(245,158,11,0.4);
}
.panel-input button {
  background: #F59E0B;
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.panel-input button:hover:not(:disabled) { background: #D97706; }
.panel-input button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Slide transition */
.panel-slide-enter-active, .panel-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
