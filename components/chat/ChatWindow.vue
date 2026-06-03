<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

const props = defineProps<{
  loading?: boolean
}>()

const scrollContainer = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

defineExpose({ scrollToBottom })
</script>

<template>
  <div class="chat-window-wrapper">
    <div ref="scrollContainer" class="chat-scroll">
      <slot />
      <ChatTypingIndicator v-if="loading" />
    </div>
  </div>
</template>
