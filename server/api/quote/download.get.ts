import { defineEventHandler, getQuery, createError, setResponseHeaders } from 'h3'
import { getAppSession } from '../../utils/session'
import { generateQuotePDF } from '../../services/pdf'

export default defineEventHandler(async (event) => {
  const { sessionId } = getQuery(event) as { sessionId?: string }

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId query parameter is required.' })
  }

  const session = getAppSession(sessionId)
  if (!session?.quote) {
    throw createError({ statusCode: 404, statusMessage: 'Quote not found. It may have expired. Please generate a new quote.' })
  }

  try {
    const pdfBytes = await generateQuotePDF(session.quote)
    const ref = `DLG-${session.quote.id.slice(0, 8).toUpperCase()}`

    setResponseHeaders(event, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${`DelGate-Quote-${ref}.pdf`}"`,
      'Content-Length': String(pdfBytes.length),
      'Cache-Control': 'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
    })

    return pdfBytes
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[PDF Download Error]', msg, '\nQuote:', JSON.stringify(session.quote, null, 2))
    throw createError({ statusCode: 500, statusMessage: `PDF generation failed: ${msg}` })
  }
})

