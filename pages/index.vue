<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

useHead({
  title: 'DelGate Freight Assistant',
})

const {
  messages,
  loading,
  scanning,
  currency,
  shipmentState,
  lastQuote,
  liveIntelligence,
  sendMessage,
  generateQuote,
  setCurrency,
  scanDocument,
  clearQuote,
  sessionId
} = useChat()

const chatWindow = ref<{ scrollToBottom: () => void } | null>(null)

// Auto-scroll on every new message or loading state change
watch([messages, loading], async () => {
  await nextTick()
  chatWindow.value?.scrollToBottom()
}, { deep: true })
</script>

<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="app-header">
      <div class="header-brand">
        <div class="brand-mark">DL</div>
        <div>
          <p class="brand-name">DelGate Logistics</p>
          <p class="brand-sub">Freight Assistant</p>
        </div>
      </div>

      <!-- Branded Header -->
      <div class="header-status">
        <p class="status-note">Connected to DelGate Carrier Network</p>
      </div>
    </header>

    <!-- Studio Layout -->
    <main class="studio-main">
      <!-- Left: Chat Assistant -->
      <section class="assistant-pane">
        <div class="chat-container">
          <ChatWindow ref="chatWindow" :loading="loading">
            <ChatMessageBubble v-for="msg in messages" :key="msg.id" :role="msg.role" :content="msg.content"
              :timestamp="msg.timestamp" :quote="(msg as any).quote" :session-id="sessionId ?? undefined" />
          </ChatWindow>
        </div>

        <footer class="chat-footer">
          <ChatInput :disabled="loading" @send="sendMessage" @scan="scanDocument" />
          <p class="footer-note">Alex is here to help with your quote.</p>
        </footer>
      </section>

      <!-- Right: Live Form OR Quote View -->
      <section class="form-pane">
        <div class="pane-inner">
          <Transition name="fade-slide" mode="out-in">
            <!-- State: Viewing Quote -->
            <div v-if="lastQuote" class="quote-view-pane">
              <div class="pane-header">
                <button class="back-link" @click="clearQuote">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M19 12H5m7-7-7 7 7 7" />
                  </svg>
                  Back to Shipment Form
                </button>
              </div>
              <ChatQuoteCard :quote="lastQuote" :session-id="sessionId!" />
              <ChatLiveIntelligence :data="liveIntelligence" />
            </div>

            <!-- State: Data Entry -->
            <div v-else class="form-entry-pane">
              <ChatShipmentForm :state="shipmentState" :currency="currency" :disabled="loading"
                @update:state="s => Object.assign(shipmentState, s)" @update:currency="setCurrency"
                @request-quote="generateQuote" />

              <div v-if="scanning" class="scanning-overlay">
                <div class="scanner-line"></div>
                <p>Analyzing document...</p>
              </div>

              <!-- Real Pricing Table -->
              <ChatPricingTable :state="shipmentState" :currency="currency" />

              <!-- AI Quick Actions -->
              <div class="help-box">
                <label class="section-label">AI Assistant Actions</label>
                <div class="action-grid">
                  <button class="ghost-btn"
                    @click="sendMessage('What information is still missing from the form?')">Check missing
                    fields</button>
                  <button class="ghost-btn" @click="sendMessage('Explain the different service types.')">Help with
                    services</button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.assistant-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}



.chat-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(13, 17, 23, 0.8);
  backdrop-filter: blur(10px);
}

.footer-note {
  font-size: 10px;
  color: #484F58;
  text-align: center;
  margin-top: 12px;
}

/* Right Pane Styles */
.quote-view-pane {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pane-header {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #8B949E;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.back-link:hover {
  color: #F59E0B;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
