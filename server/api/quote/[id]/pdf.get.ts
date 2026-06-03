import { defineEventHandler, getRouterParam, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  // Redirect legacy /api/quote/[id]/pdf to /api/quote/download?sessionId=...
  // Since we don't have the sessionId here, we attempt a best-effort or show a nice error
  return sendRedirect(event, '/', 302)
})
