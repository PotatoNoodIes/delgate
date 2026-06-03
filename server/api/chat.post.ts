import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { processMessage, generateQuoteSummary, getLiveIntelligence } from '../services/ai'
import { calculateFreightQuote } from '../services/pricing'
import { createAppSession, getAppSession, updateAppSession } from '../utils/session'
import { resolveAddressFromPostal } from '../utils/postal'
import type { ShipmentData, Currency } from '~/types/shipment'

const BodySchema = z.object({
  message:   z.string().min(1).max(2000),
  sessionId: z.string().optional(),
  currency:  z.enum(['CAD', 'USD']).default('CAD'),
  currentState: z.record(z.any()).optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.groqApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'GROQ_API_KEY is not configured on the server.' })
  }

  const raw = await readBody(event)
  const body = BodySchema.safeParse(raw)
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
  }

  const { message, currency } = body.data

  // Get or create session
  let session = body.data.sessionId ? getAppSession(body.data.sessionId) : undefined
  if (!session) {
    session = createAppSession(currency as Currency)
  }

  // Merge client-side form state if provided
  if (body.data.currentState) {
    session.shipmentState = { ...session.shipmentState, ...body.data.currentState }
  }

  // Handle internal force-quote flag
  const isForced = message === "[SYSTEM_GENERATE_QUOTE]"
  const userPrompt = isForced 
    ? "The user has filled the form and is requesting the final quote. Finalize the data and set isComplete: true."
    : message

  // Call AI service
  const aiResponse = await processMessage({
    userMessage: userPrompt,
    history: session.groqHistory,
    currentState: session.shipmentState,
    groqApiKey: config.groqApiKey,
  })

  // Merge extracted fields into shipment state
  const updatedState: Partial<ShipmentData> = {
    ...session.shipmentState,
    ...aiResponse.extractedData,
  }

  // Handle forcing completion
  if (isForced) aiResponse.isComplete = true


  // Resolve addresses from postal codes if they changed
  if (aiResponse.extractedData.originPostal) {
    updatedState.originAddress = resolveAddressFromPostal(aiResponse.extractedData.originPostal)
  }
  if (aiResponse.extractedData.destinationPostal) {
    updatedState.destinationAddress = resolveAddressFromPostal(aiResponse.extractedData.destinationPostal)
  }

  // Update conversation history (store full JSON for AI context)
  const updatedHistory = [
    ...session.groqHistory,
    { role: 'user' as const,      content: message },
    { role: 'assistant' as const, content: JSON.stringify(aiResponse) },
  ]

  // ── Live Intelligence Layer ───────────────────────────────────────────────
  // Calculate current (partial) pricing to feed the intelligence engine
  const cadToUsdRate = parseFloat(config.public.cadToUsdRate) || 0.74
  const currentQuote = calculateFreightQuote(updatedState, currency as Currency, cadToUsdRate)
  
  const liveIntelligence = await getLiveIntelligence({
    currentState: updatedState,
    pricingOutput: currentQuote.pricing,
    groqApiKey: config.groqApiKey,
  }).catch(() => undefined)

  // ── Final Quote Logic ──────────────────────────────────────────────────────
  let quote = session.quote
  let replyMessage = aiResponse.message

  // If AI says complete — run pricing engine + generate summary
  if (aiResponse.isComplete && !quote) {
    // Already calculated currentQuote above, but let's ensure it's finalized
    const finalQuote = calculateFreightQuote(updatedState as ShipmentData, currency as Currency, cadToUsdRate)

    // Generate AI summary (non-blocking failure safe)
    const summaryResult = await generateQuoteSummary({
      quote: finalQuote,
      currency: currency as Currency,
      groqApiKey: config.groqApiKey,
    }).catch(() => ({ summary: '', risks: [], recommendations: [] }))

    quote = {
      ...finalQuote,
      aiSummary: summaryResult.summary,
      risks: summaryResult.risks,
      recommendations: summaryResult.recommendations,
    }

    replyMessage = aiResponse.message
  }

  // Persist updated session
  updateAppSession(session.id, {
    currency: currency as Currency,
    shipmentState: updatedState,
    groqHistory: updatedHistory,
    quote,
  })

  return {
    message: replyMessage,
    sessionId: session.id,
    updatedState,
    quote: aiResponse.isComplete ? quote : undefined,
    isComplete: aiResponse.isComplete,
    liveIntelligence,
  }
})
