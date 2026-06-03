<script setup lang="ts">
import type { FreightQuote } from '~/types/quote'

const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  quote?: FreightQuote
  sessionId?: string
}>()

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div :class="['message-row', role === 'user' ? 'message-row--user' : 'message-row--assistant']">
    <!-- Avatar -->
    <div v-if="role === 'assistant'" class="avatar avatar--alex">A</div>

    <div class="bubble-group">
      <!-- Main bubble -->
      <div :class="['bubble', role === 'user' ? 'bubble--user' : 'bubble--assistant']">
        <p class="bubble-text">{{ content }}</p>
      </div>

      <span class="msg-time">{{ fmtTime(timestamp) }}</span>
    </div>

    <!-- User avatar -->
    <div v-if="role === 'user'" class="avatar avatar--user">U</div>
  </div>
</template>
