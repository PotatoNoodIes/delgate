import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { scanDocument } from '../services/ai'
import { createAppSession, getAppSession } from '../utils/session'
import { resolveAddressFromPostal } from '../utils/postal'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const formData = await readMultipartFormData(event)
  
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded.' })
  }

  const filePart = formData.find(p => p.name === 'file')
  const sessionIdPart = formData.find(p => p.name === 'sessionId')

  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file part.' })
  }

  const base64Image = `data:${filePart.type};base64,${filePart.data.toString('base64')}`
  const sessionId = sessionIdPart?.data.toString()

  let session = sessionId ? getAppSession(sessionId) : undefined
  if (!session) {
    session = createAppSession('CAD')
  }

  const extracted = await scanDocument({
    base64Image,
    groqApiKey: config.groqApiKey,
  })

  // Merge extracted data
  session.shipmentState = { ...session.shipmentState, ...extracted }

  // Resolve addresses
  if (extracted.originPostal) {
    session.shipmentState.originAddress = resolveAddressFromPostal(extracted.originPostal)
  }
  if (extracted.destinationPostal) {
    session.shipmentState.destinationAddress = resolveAddressFromPostal(extracted.destinationPostal)
  }

  return {
    message: "I've scanned your document and updated the form! Please double-check the details.",
    sessionId: session.id,
    updatedState: session.shipmentState,
    isComplete: false,
  }
})
