import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib'
import type { FreightQuote } from '~/types/quote'

const C = {
  navy:      rgb(0.04, 0.05, 0.08),
  navyMid:   rgb(0.07, 0.09, 0.15),
  amber:     rgb(0.96, 0.62, 0.04),
  white:     rgb(1, 1, 1),
  gray:      rgb(0.42, 0.45, 0.50),
  lightGray: rgb(0.96, 0.97, 0.99),
  border:    rgb(0.22, 0.25, 0.31),
  success:   rgb(0.06, 0.73, 0.51),
}

function fmt(n: number, currency: string): string {
  return `${currency} $${n.toFixed(2)}`
}

function sanitize(str: string): string {
  if (!str) return ''
  return str.replace(/[^\x20-\x7E]/g, '').trim()
}

export async function generateQuotePDF(quote: FreightQuote): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const PAGE_SIZE: [number, number] = [595, 842]
  const width = PAGE_SIZE[0]
  const height = PAGE_SIZE[1]

  const bold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  const sym = quote.currency || 'CAD'
  
  let page: PDFPage
  let y = height

  function drawHeader(isFirstPage = false) {
    page.drawRectangle({ x: 0, y: height - 75, width, height: 75, color: C.navy })
    page.drawText('DELGATE LOGISTICS', { x: 40, y: height - 38, size: 18, font: bold, color: C.amber })
    page.drawText(isFirstPage ? 'FREIGHT QUOTE' : 'FREIGHT QUOTE (CONT.)', { x: 40, y: height - 58, size: 10, font: regular, color: C.white })

    const qRef = `DLG-${quote.id.slice(0, 8).toUpperCase()}`
    const qDate = new Date(quote.createdAt).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    page.drawText(qRef, { x: width - 160, y: height - 38, size: 11, font: bold, color: C.white })
    page.drawText(qDate, { x: width - 160, y: height - 58, size: 9, font: regular, color: C.gray })
    
    y = height - 105
  }

  function createNewPage(isFirstPage = false) {
    page = doc.addPage(PAGE_SIZE)
    drawHeader(isFirstPage)
  }

  function checkPageOverflow(requiredSpace: number) {
    const bottomMargin = 75
    if (y - requiredSpace < bottomMargin) {
      createNewPage(false)
    }
  }

  createNewPage(true)

  function sectionHeader(label: string) {
    checkPageOverflow(35)
    page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 22, color: C.navyMid })
    page.drawText(sanitize(label).toUpperCase(), { x: 48, y: y + 4, size: 9, font: bold, color: C.amber })
    y -= 30
  }

  function row(label: string, value: string, shade = false) {
    checkPageOverflow(20)
    if (shade) {
      page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 18, color: C.lightGray })
    }
    page.drawText(label, { x: 48, y: y + 2, size: 9, font: regular, color: C.navy })
    page.drawText(value, { x: width - 200, y: y + 2, size: 9, font: bold, color: C.navy })
    y -= 20
  }

  function divider() {
    checkPageOverflow(15)
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: C.border })
    y -= 12
  }

  sectionHeader('Shipment Details')
  const s = quote.shipment
  row('Origin', sanitize(s.originPostal ?? 'N/A').toUpperCase(), false)
  row('Destination', sanitize(s.destinationPostal ?? 'N/A').toUpperCase(), true)
  if (s.originAddress) row('Origin City', sanitize(s.originAddress), false)
  if (s.destinationAddress) row('Destination City', sanitize(s.destinationAddress), true)
  row('Weight', `${s.weight ?? 0} kg`, false)
  
  const dims = s.dimensions
    ? `${s.dimensions.length} x ${s.dimensions.width} x ${s.dimensions.height} cm`
    : 'Not provided'
  row('Dimensions (L x W x H)', dims, true)
  row('Service Type', sanitize(s.serviceType ?? 'standard').toUpperCase(), false)
  if (s.freightClass) row('Freight Class', sanitize(s.freightClass), true)
  if (s.specialInstructions) row('Special Instructions', sanitize(s.specialInstructions), false)
  row('Declared Value', fmt(s.declaredValue ?? 0, sym), true)
  if (s.contactName) row('Client', sanitize(s.contactName), false)
  if (s.contactEmail) row('Email', sanitize(s.contactEmail), true)

  const flags = [
    s.isResidential    ? 'Residential Delivery' : '',
    s.requiresLiftgate ? 'Liftgate Required'     : '',
    s.isHazmat         ? '! Hazardous Materials' : '',
  ].filter(Boolean).join('  * ')
  if (flags) row('Flags', flags, false)

  y -= 8
  divider()

  sectionHeader('Pricing Breakdown')
  const p = quote.pricing
  row('Base Rate', fmt(p.baseRate, sym), false)
  row('Fuel Surcharge (22%)', fmt(p.fuelSurcharge, sym), true)
  if (p.residentialFee) row('Residential Fee', fmt(p.residentialFee, sym), false)
  if (p.liftgateFee)    row('Liftgate Fee',    fmt(p.liftgateFee, sym),    true)
  if (p.insurance)      row('Insurance',        fmt(p.insurance, sym),       false)
  if (p.hazmatFee)      row('Hazmat Handling',  fmt(p.hazmatFee, sym),       true)

  y -= 2
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: C.border })
  y -= 4
  row('Subtotal (before tax)', fmt(p.total, sym), false)

  const taxLabel = p.taxLabel ?? 'Tax'
  row(taxLabel, fmt(p.tax ?? 0, sym), true)

  y -= 4
  checkPageOverflow(45)
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: C.navy })
  y -= 4
  page.drawRectangle({ x: 40, y: y - 6, width: width - 80, height: 30, color: C.navy })
  page.drawText('TOTAL (INCL. TAX)', { x: 48, y: y + 7, size: 10, font: bold, color: C.white })
  page.drawText(fmt(p.totalWithTax ?? p.total, sym), { x: width - 200, y: y + 7, size: 14, font: bold, color: C.amber })
  y -= 40

  y -= 8
  sectionHeader('Transit Estimate')
  row('Estimated Delivery', `${quote.transitDays.min}-${quote.transitDays.max} business days`, false)
  y -= 8
  divider()

  if (quote.aiSummary) {
    sectionHeader('Coordinator Notes')

    const wrapText = (text: string, maxWidth: number, size: number, font: typeof regular): string[] => {
      const words = text.split(' ')
      const lines: string[] = []
      let current = ''
      for (const word of words) {
        const test = current ? `${current} ${word}` : word
        if (font.widthOfTextAtSize(test, size) > maxWidth) {
          if (current) lines.push(current)
          current = word
        } else {
          current = test
        }
      }
      if (current) lines.push(current)
      return lines
    }

    const summaryLines = wrapText(sanitize(quote.aiSummary), width - 100, 9, regular)
    for (const line of summaryLines) {
      checkPageOverflow(14)
      page.drawText(line, { x: 48, y, size: 9, font: regular, color: C.navy })
      y -= 14
    }
    y -= 8

    if (quote.risks && quote.risks.length > 0) {
      checkPageOverflow(14)
      page.drawText('Risks', { x: 48, y, size: 9, font: bold, color: C.navy })
      y -= 14
      for (const risk of quote.risks) {
        checkPageOverflow(13)
        page.drawText(`- ${sanitize(risk)}`, { x: 56, y, size: 9, font: regular, color: rgb(0.55, 0.20, 0.20) })
        y -= 13
      }
      y -= 6
    }

    if (quote.recommendations && quote.recommendations.length > 0) {
      checkPageOverflow(14)
      page.drawText('Recommendations', { x: 48, y, size: 9, font: bold, color: C.navy })
      y -= 14
      for (const rec of quote.recommendations) {
        checkPageOverflow(13)
        page.drawText(`- ${sanitize(rec)}`, { x: 56, y, size: 9, font: regular, color: C.success })
        y -= 13
      }
    }
  }

  const pages = doc.getPages()
  for (const pge of pages) {
    pge.drawLine({ start: { x: 40, y: 50 }, end: { x: width - 40, y: 50 }, thickness: 0.5, color: C.border })
    pge.drawText(`This quote is valid for 7 days from the date of issue. Rates are in ${sym} and subject to applicable taxes.`,
      { x: 40, y: 35, size: 7.5, font: regular, color: C.gray })
    pge.drawText('DelGate Logistics — info@delgate.ca',
      { x: 40, y: 22, size: 7.5, font: regular, color: C.gray })
  }

  return doc.save()
}