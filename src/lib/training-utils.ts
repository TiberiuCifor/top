/**
 * Returns true for a non-empty, non-zero BambooHR date string.
 * BambooHR uses '0000-00-00' for fields with no value.
 */
export function isValidDate(d: string | null | undefined): boolean {
  return Boolean(d && d !== '0000-00-00' && d !== '')
}

/**
 * Parses KnowBe4 relative duration strings like "3 days", "2 weeks", "1 month"
 * into milliseconds. Returns null for unrecognised formats.
 */
export function parseRelativeDuration(rel: string): number | null {
  const m = rel.trim().match(/^(\d+)\s+(day|week|month)s?$/i)
  if (!m) return null
  const n = parseInt(m[1])
  const unit = m[2].toLowerCase()
  if (unit === 'day') return n * 86_400_000
  if (unit === 'week') return n * 7 * 86_400_000
  if (unit === 'month') return n * 30 * 86_400_000
  return null
}
