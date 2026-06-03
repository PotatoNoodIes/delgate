/**
 * Minimal mapping of Canadian FSA (first digit) to Province and general sample of City mappings.
 */
const PROVINCE_MAP: Record<string, string> = {
  A: 'Newfoundland and Labrador',
  B: 'Nova Scotia',
  C: 'Prince Edward Island',
  E: 'New Brunswick',
  G: 'Quebec (East)',
  H: 'Montreal',
  J: 'Quebec (West)',
  K: 'Ontario (East)',
  L: 'Ontario (Central)',
  M: 'Toronto',
  N: 'Ontario (West)',
  P: 'Ontario (North)',
  R: 'Manitoba',
  S: 'Saskatchewan',
  T: 'Alberta',
  V: 'British Columbia',
  X: 'Northwest Territories / Nunavut',
  Y: 'Yukon',
}

/**
 * Heuristic for City based on FSA.
 * In a production app, this would use a complete database or API lookup.
 */
const CITY_SAMPLES: Record<string, string> = {
  M5V: 'Toronto (Entertainment District), ON',
  V6B: 'Vancouver (Downtown), BC',
  T2P: 'Calgary (City Centre), AB',
  H2Z: 'Montreal (Downtown), QC',
  K1A: 'Ottawa, ON',
  V8W: 'Victoria, BC',
  T6G: 'Edmonton, AB',
  R3C: 'Winnipeg, MB',
  B3J: 'Halifax, NS',
}

export function resolveAddressFromPostal(postal: string): string {
  const clean = postal.trim().toUpperCase().replace(/\s/g, '')
  if (clean.length < 3) return ''

  const fsa = clean.substring(0, 3)
  const first = clean[0]

  // Direct match for major cities
  if (CITY_SAMPLES[fsa]) return CITY_SAMPLES[fsa]

  // Fallback to Province/Region
  const region = PROVINCE_MAP[first]
  return region ? `${region}, CA` : 'Canada'
}
