<script setup lang="ts">
import { ref } from 'vue'
import { useChat } from '~/composables/useChat'

const props = defineProps<{
  itemLabel: string
  context: string // e.g. "fee", "tax"
  quoteContext: any
}>()

const { sendMessage, clearQuote } = useChat()
const active = ref(false)
const explanation = ref('')
const loading = ref(false)

async function explain() {
  if (active.value) {
    active.value = false
    return
  }
  
  active.value = true
  if (explanation.value) return
  
  loading.value = true
  try {
    const data = await $fetch<{ message: string }>('/api/chat', {
      method: 'POST',
      body: {
        message: `[ANALYST MODE] Explain briefly why the "${props.itemLabel}" is this amount in the current market. 1 concise sentence.`,
        sessionId: 'transient-analyst',
        currentState: props.quoteContext.shipment,
        currency: props.quoteContext.currency
      },
    })
    explanation.value = data.message
  } catch {
    explanation.value = "Market data unavailable for this item."
  } finally {
    loading.value = false
  }
}

function askMore() {
  active.value = false
  clearQuote() // Go back to chat view
  sendMessage(`Can you explain more about the ${props.itemLabel}? I saw the brief insight but wanted a deep dive.`)
}
</script>

<template>
  <div class="ai-explainer">
    <button 
      class="ai-trigger" 
      :class="{ 'is-active': active }"
      @click.stop="explain"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      </svg>
      <span>AI Analyst</span>
    </button>

    <Transition name="fade-pop">
      <div v-if="active" class="ai-popover" @click.stop>
        <div class="pop-header">
          <span class="pop-title">{{ itemLabel }} Insight</span>
          <button class="pop-close" @click="active = false">&times;</button>
        </div>
        <div class="pop-body">
          <div v-if="loading" class="pop-loading">
            <div class="shimmer-line"></div>
          </div>
          <div v-else>
            <p class="pop-text">{{ explanation }}</p>
            <button class="pop-more" @click="askMore">
              Ask Alex for a deep dive
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ai-explainer {
  position: relative;
  display: inline-flex;
}

.ai-trigger {
  opacity: 0;
  pointer-events: none;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #F59E0B;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  transform: translateX(-5px);
}

/* Parent hover effect implemented in QuoteCard.vue by targeting this class */
:deep(.brow:hover) .ai-trigger, .ai-trigger.is-active {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.ai-trigger:hover, .ai-trigger.is-active {
  background: #F59E0B;
  color: #000;
  border-color: #F59E0B;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}

.ai-popover {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 0;
  width: 220px;
  background: #1C2128;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  z-index: 1000;
  padding: 12px;
  cursor: default;
}

.ai-popover::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 15px;
  border: 6px solid transparent;
  border-top-color: rgba(245, 158, 11, 0.3);
}

.pop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pop-title {
  font-size: 9px;
  font-weight: 900;
  color: #F59E0B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pop-close {
  background: transparent;
  border: none;
  color: #484F58;
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}

.pop-text {
  font-size: 11px;
  line-height: 1.5;
  color: #E6EDF3;
  margin: 0 0 10px;
}

.pop-more {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  color: #8B949E;
  font-size: 10px;
  font-weight: 600;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s;
}

.pop-more:hover {
  background: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
  border-color: rgba(245, 158, 11, 0.2);
}

.pop-loading { padding: 10px 0; }
.shimmer-line {
  height: 10px;
  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.fade-pop-enter-active, .fade-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-pop-enter-from { opacity: 0; transform: translateY(5px) scale(0.95); }
.fade-pop-leave-to { opacity: 0; transform: translateY(5px) scale(0.95); }
</style>
