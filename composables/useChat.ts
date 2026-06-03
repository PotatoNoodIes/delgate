import { ref, reactive } from 'vue'
import { randomUUID } from 'uncrypto'
import type { ChatMessage } from '~/types/shipment'
import type { FreightQuote } from '~/types/quote'

interface ChatApiResponse {
  message: string
  sessionId: string
  quote?: FreightQuote
  isComplete: boolean
  updatedState?: Partial<import('~/types/shipment').ShipmentData>
  liveIntelligence?: import('~/types/intelligence').LiveIntelligence
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'assistant',
  content: "Hi there! I'm Alex, your senior freight coordinator at DelGate Logistics.\n\nI'll help you get a quick, accurate freight quote. To open a new quote file for you, could you please start with your name and the best way to reach you (email or phone)?",
  timestamp: new Date().toISOString(),
}

const messages = ref<ChatMessage[]>([INITIAL_MESSAGE])
const sessionId = ref<string | null>(null)
const loading = ref(false)
const scanning = ref(false)
const error = ref<string | null>(null)
const currency = ref<'CAD' | 'USD'>('CAD')
const shipmentState = reactive<Partial<import('~/types/shipment').ShipmentData>>({})
const lastQuote = ref<FreightQuote | null>(null)
const liveIntelligence = ref<import('~/types/intelligence').LiveIntelligence>({
  priceExplanation: [],
  risks: [],
  recommendations: []
})

export function useChat() {
  async function sendMessage(text: string) {
    if (!text.trim() || loading.value) return

    messages.value.push({
      id: randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    })

    loading.value = true
    error.value = null

    try {
      const data = await $fetch<ChatApiResponse>('/api/chat', {
        method: 'POST',
        body: {
          message: text.trim(),
          sessionId: sessionId.value ?? undefined,
          currency: currency.value,
          currentState: shipmentState,
        },
      })

      sessionId.value = data.sessionId
      if (data.updatedState) Object.assign(shipmentState, data.updatedState)

      const assistantMsg: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        quoteId: data.quote?.id,
      }

      messages.value.push(assistantMsg)

      if (data.quote) {
        (assistantMsg as any).quote = data.quote
        lastQuote.value = data.quote
      }
      if (data.liveIntelligence) {
        liveIntelligence.value = {
          priceExplanation: data.liveIntelligence.priceExplanation ?? [],
          risks: data.liveIntelligence.risks ?? [],
          recommendations: data.liveIntelligence.recommendations ?? [],
        }
      }
    } catch (err: any) {
      error.value = 'Connection error.'
      messages.value.push({
        id: randomUUID(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please check your internet or try again.",
        timestamp: new Date().toISOString(),
      })
    } finally {
      loading.value = false
    }
  }

  async function generateQuote() {
    if (loading.value) return
    loading.value = true
    try {
      const data = await $fetch<ChatApiResponse>('/api/chat', {
        method: 'POST',
        body: {
          message: "[SYSTEM_GENERATE_QUOTE]",
          sessionId: sessionId.value ?? undefined,
          currency: currency.value,
          currentState: shipmentState,
        },
      })
      sessionId.value = data.sessionId
      if (data.updatedState) Object.assign(shipmentState, data.updatedState)
      
      const assistantMsg: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      }
      messages.value.push(assistantMsg)
      if (data.quote) (assistantMsg as any).quote = data.quote
      lastQuote.value = data.quote || null

      if (data.liveIntelligence) {
        liveIntelligence.value = {
          priceExplanation: data.liveIntelligence.priceExplanation ?? [],
          risks: data.liveIntelligence.risks ?? [],
          recommendations: data.liveIntelligence.recommendations ?? [],
        }
      }
    } catch {
      error.value = 'Quote generation failed.'
    } finally {
      loading.value = false
    }
  }

  function setCurrency(c: 'CAD' | 'USD') {
    currency.value = c
  }

  function clearQuote() {
    lastQuote.value = null
  }

  return {
    messages,
    sessionId,
    loading,
    scanning,
    error,
    currency,
    shipmentState,
    lastQuote,
    liveIntelligence,
    sendMessage,
    generateQuote,
    setCurrency,
    clearQuote
  }
}