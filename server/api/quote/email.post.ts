import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { getAppSession } from '../../utils/session'
import { generateQuotePDF } from '../../services/pdf'

const BodySchema = z.object({
  sessionId: z.string().min(1),
  email:     z.string().email(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Check SMTP is configured
  if (!config.smtpHost || !config.smtpUser) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Email service is not configured. Please set SMTP_HOST and SMTP_USER in your .env file.',
    })
  }

  const raw = await readBody(event)
  const body = BodySchema.safeParse(raw)
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email or sessionId.' })
  }

  const session = getAppSession(body.data.sessionId)
  if (!session?.quote) {
    throw createError({ statusCode: 404, statusMessage: 'Quote not found or expired.' })
  }

  const pdfBytes = await generateQuotePDF(session.quote)
  const ref = `DLG-${session.quote.id.slice(0, 8).toUpperCase()}`
  const sym = session.quote.currency
  const total = session.quote.pricing.total.toFixed(2)

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: parseInt(config.smtpPort || '587'),
    secure: config.smtpPort === '465',
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f5f7;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:#0A0D14;padding:32px;text-align:center">
      <h1 style="color:#F59E0B;margin:0;font-size:22px;letter-spacing:1px">DELGATE LOGISTICS</h1>
      <p style="color:#9CA3AF;margin:6px 0 0;font-size:13px">Your Freight Quote is Ready</p>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;font-size:15px">Hello,</p>
      <p style="color:#374151;font-size:15px">
        Your freight quote <strong>${ref}</strong> has been generated and is attached to this email.
      </p>
      <div style="background:#F9FAFB;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
        <p style="margin:0;color:#6B7280;font-size:13px">QUOTE TOTAL</p>
        <p style="margin:8px 0 0;color:#0A0D14;font-size:32px;font-weight:bold">${sym} $${total}</p>
        <p style="margin:6px 0 0;color:#6B7280;font-size:13px">
          ${session.quote.transitDays.min}–${session.quote.transitDays.max} business days transit
        </p>
      </div>
      <p style="color:#6B7280;font-size:13px">
        This quote is valid for 7 days. For questions, contact us at
        <a href="mailto:info@delgate.ca" style="color:#F59E0B">info@delgate.ca</a>.
      </p>
    </div>
    <div style="background:#F3F4F6;padding:16px;text-align:center">
      <p style="margin:0;color:#9CA3AF;font-size:11px">© 2025 DelGate Logistics. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: config.smtpFrom || 'DelGate Logistics <noreply@delgate.ca>',
    to: body.data.email,
    subject: `Your DelGate Freight Quote — ${ref} (${sym} $${total})`,
    html,
    attachments: [
      {
        filename: `DelGate-Quote-${ref}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf',
      },
    ],
  })

  return { success: true, message: `Quote sent to ${body.data.email}` }
})
