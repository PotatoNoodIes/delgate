<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
  scan: [file: File]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('scan', file)
}

const text = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function submit() {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) return
  emit('send', trimmed)
  text.value = ''

  setTimeout(() => {
    textarea.value?.focus()
  }, 50)
}
</script>

<template>
  <div class="input-bar">
    <input type="file" ref="fileInput" style="display: none" accept=".pdf,.doc,.docx,.ods" @change="onFileChange" />
    <button class="scan-btn" :disabled="disabled" title="Upload BOL/Invoice" @click="fileInput?.click()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    </button>
    <textarea id="chat-input" ref="textarea" v-model="text" class="chat-textarea"
      placeholder="Tell me about your shipment…" rows="1" :disabled="disabled" @keydown="handleKeydown" />
    <button id="chat-send-btn" class="send-btn" :disabled="disabled || !text.trim()" aria-label="Send message"
      @click="submit">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  </div>
</template>
