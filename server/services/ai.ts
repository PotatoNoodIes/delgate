import Groq from 'groq-sdk'
import { z } from 'zod'
import type { ShipmentData, Currency } from '~/types/shipment'
import type { FreightQuote } from '~/types/quote'
import type { GroqMessage } from '~/server/utils/session'

// ── Zod schemas ──────────────────────────────────────────────────────────────
const ExtractedDataSchema = z.object({
  contactName:        z.string().optional(),
  contactEmail:       z.string().email().optional(),
  contactPhone:       z.string().optional(),
  originPostal:       z.string().optional(),
  destinationPostal:  z.string().optional(),
  weight:             z.number().positive().optional(),
  dimensions:         z.object({ length: z.number(), width: z.number(), height: z.number() }).optional(),
  serviceType:        z.enum(['standard', 'express', 'ltl']).optional(),
  declaredValue:      z.number().min(0).optional(),
  isResidential:      z.boolean().optional(),
  requiresLiftgate:   z.boolean().optional(),
  isHazmat:           z.boolean().optional(),
  specialInstructions:z.string().optional(),
  freightClass:       z.string().optional(),
})

const LiveIntelligenceSchema = z.object({
  priceExplanation: z.array(z.object({
    changeType: z.enum(['increase', 'decrease', 'neutral']),
    reason: z.string(),
    impact: z.string()
  })),
  risks: z.array(z.object({
    type: z.enum(['missing', 'warning', 'risk']),
    message: z.string(),
    field: z.string().optional()
  })),
  recommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    action: z.string().optional(),
    savings: z.string().optional()
  }))
})

export type LiveIntelligence = z.infer<typeof LiveIntelligenceSchema>

export interface AIResponse {
  message: string
  extractedData: Partial<ShipmentData>
  isComplete: boolean
  missingFields: string[]
  confidence: number
  liveIntelligence?: LiveIntelligence
}

const AIResponseSchema = z.object({
  message:       z.string(),
  extractedData: ExtractedDataSchema,
  isComplete:    z.boolean(),
  missingFields: z.array(z.string()),
  confidence:    z.number().min(0).max(1),
})

// ── Live Intelligence Engine ────────────────────────────────────────────────
export async function getLiveIntelligence(params: {
  currentState: Partial<ShipmentData>
  pricingOutput?: any
  groqApiKey: string
}): Promise<LiveIntelligence> {
  const { currentState, pricingOutput, groqApiKey } = params
  const groq = new Groq({ apiKey: groqApiKey })

  const prompt = `You are the "Freight Studio Intelligence" engine. Analyze the current shipment state and pricing engine output.
  
  SHIPMENT STATE: ${JSON.stringify(currentState)}
  PRICING LOG: ${JSON.stringify(pricingOutput)}

  TASK:
  1. Live Price Explanation: Explain what is driving the cost or what changed (interpreting the pricing log).
  2. Risk & Missing Data: Identify gaps (e.g. missing weight, or hazardous items without hazard fees) or potential delays/risks.
  3. Recommendations: Proactively suggest services (liftgate, residential, insurance) or cost-saving actions based on the specs.

  RULES:
  - Respond ONLY with valid JSON matching the schema.
  - DO NOT compute prices. Only interpret the provided logs.
  - Be analytical and helpful.

  JSON SCHEMA:
  {
    "priceExplanation": [{ "changeType": "increase/decrease/neutral", "reason": "string", "impact": "e.g. +$10" }],
    "risks": [{ "type": "missing/warning/risk", "message": "string", "field": "optionalField" }],
    "recommendations": [{ "title": "string", "description": "string", "action": "optionalAction", "savings": "optional" }]
  }`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 600,
    })
    
    const raw = completion.choices[0]?.message?.content ?? '{}'
    return LiveIntelligenceSchema.parse(JSON.parse(raw))
  } catch (err) {
    console.warn('Intelligence Engine Error:', err)
    return { priceExplanation: [], risks: [], recommendations: [] }
  }
}

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Alex, a senior freight coordinator at DelGate Logistics — Canada's trusted freight carrier. You help customers get accurate freight quotes through friendly, professional conversation.

PERSONALITY:
- Warm, knowledgeable, senior freight coordinator — acting as a proactive "Logistics Advisor".
- Your goal is to be a high-value sidekick in the Freight Studio. 
- **Proactive Advice**: 
  - IMPORTANT: You are "Form-Aware". If the \`currentState\` already has a field (like name, email, origin, weight, or dimensions), DO NOT ASK FOR IT.
  - DIMENSIONS: Do NOT automatically convert or overwrite dimensions if the user has entered them in the form. Respect the user's manual entry.
  - VALUES: Always provide explicit cost-saving tips or logistics advice (e.g. suggesting a liftgate for heavy items, or explaining why LTL is better for pallets).
- **Explicit Rationale**: Always be explicit about pricing. If you suggest an add-on, mention its typical cost (e.g., "Adding a Residential delivery service usually adds about $35 but ensures local courier access").
- **Form Awareness**: You are provided with the 'Already confirmed' fields. DO NOT ask for any information that is already present. Instead, focus on refining the details.
- **Unit Normalization**: Accept any units (lb, kg, inches, cm, ft) and normalize to numbers:
    - Weight: kg (1 lb = 0.453 kg)
    - Dimensions: cm (1 inch = 2.54 cm, 1 ft = 30.48 cm)
- **Address Verification**: When a postal code is entered, confirm the city/area it belongs to.

CRITICAL RULES:
- Respond ONLY with valid JSON.
- NEVER calculate pricing yourself in your thoughts, but DO explain the logic of the system's requirements (e.g., "Liftgates and Residential services are explicit add-ons that ensure successful delivery").
- If the user clicks "Get Accurate Quote", finalize the data and set isComplete: true.
- Set isComplete: true only when the form is substantially ready.
- Alex should feel like he's doing half the thinking for the user, not just recording what they say.

RESPONSE FORMAT (strict JSON):
{
  "message": "Your natural response to the customer",
  "extractedData": { /* only confirmed fields */ },
  "isComplete": false,
  "missingFields": ["fieldName", ...],
  "confidence": 0.95
}`

// ── Process a user message ───────────────────────────────────────────────────
export async function processMessage(params: {
  userMessage: string
  history: GroqMessage[]
  currentState: Partial<ShipmentData>
  groqApiKey: string
}): Promise<AIResponse> {
  const { userMessage, history, currentState, groqApiKey } = params
  const groq = new Groq({ apiKey: groqApiKey })

  const confirmedFields = Object.keys(currentState)
  const stateNote = confirmedFields.length > 0
    ? `\n\nAlready confirmed: ${JSON.stringify(currentState, null, 2)}`
    : ''

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT + stateNote },
    ...history,
    { role: 'user' as const, content: userMessage },
  ]

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)
    const result = AIResponseSchema.safeParse(parsed)

    if (!result.success) {
      return {
        message: (parsed as Record<string, unknown>)?.message as string
          ?? "I'm sorry, I had a momentary issue. Could you repeat that?",
        extractedData: {},
        isComplete: false,
        missingFields: [],
        confidence: 0,
      }
    }
    return result.data
  } catch {
    return {
      message: "I'm having a technical difficulty right now. Please try again in a moment.",
      extractedData: {},
      isComplete: false,
      missingFields: [],
      confidence: 0,
    }
  }
}

// ── Generate post-quote summary from AI ─────────────────────────────────────
export async function generateQuoteSummary(params: {
  quote: FreightQuote
  currency: Currency
  groqApiKey: string
}): Promise<{ summary: string; risks: string[]; recommendations: string[] }> {
  const { quote, currency, groqApiKey } = params
  const groq = new Groq({ apiKey: groqApiKey })

  const sym = currency === 'USD' ? 'USD' : 'CAD'
  const { shipment, pricing, transitDays } = quote

  const prompt = `You are Alex, a DelGate freight coordinator. Write a brief, friendly quote confirmation for this shipment.

Shipment: ${shipment.originPostal} -> ${shipment.destinationPostal}
Weight: ${shipment.weight} kg | Service: ${shipment.serviceType.toUpperCase()}
Total: ${sym} $${pricing.total.toFixed(2)}
Transit: ${transitDays.min}-${transitDays.max} business days
Flags: ${shipment.isHazmat ? 'HAZMAT ' : ''}${shipment.isResidential ? 'RESIDENTIAL ' : ''}${shipment.requiresLiftgate ? 'LIFTGATE' : ''}

Return JSON:
{
  "summary": "2–3 sentence friendly summary confirming the shipment and key details",
  "risks": ["up to 3 concise risk items relevant to this shipment"],
  "recommendations": ["up to 3 practical tips or next steps"]
}`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 400,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return {
      summary: parsed.summary ?? 'Your freight quote is ready.',
      risks:   Array.isArray(parsed.risks) ? parsed.risks : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  } catch {
    return {
      summary: 'Your freight quote is ready. Review the breakdown below.',
      risks: [],
      recommendations: [],
    }
  }
}

// ── Scan Document using Vision Model ─────────────────────────────────────────
export async function scanDocument(params: {
  base64Image: string
  groqApiKey: string
}): Promise<Partial<ShipmentData>> {
  const { base64Image, groqApiKey } = params
  const groq = new Groq({ apiKey: groqApiKey })

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'You are an OCR and data extraction specialist. Extract shipment details from this document (BOL, Invoice, or Packing Slip). Extract: contactName, contactEmail, originPostal, destinationPostal, weight (normalize to kg), dimensions (normalize to cm), serviceType. Return ONLY valid JSON.' },
            { type: 'image_url', image_url: { url: base64Image } }
          ],
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)
    return ExtractedDataSchema.partial().parse(parsed)
  } catch (err) {
    console.error('Scan Error:', err)
    return {}
  }
}
