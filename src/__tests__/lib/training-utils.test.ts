import { describe, it, expect } from 'vitest'
import { isValidDate, parseRelativeDuration } from '@/lib/training-utils'

describe('isValidDate()', () => {
  it('returns false for null', () => {
    expect(isValidDate(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isValidDate(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidDate('')).toBe(false)
  })

  it('returns false for BambooHR zero date', () => {
    expect(isValidDate('0000-00-00')).toBe(false)
  })

  it('returns true for a valid ISO date', () => {
    expect(isValidDate('2024-06-15')).toBe(true)
  })

  it('returns true for a datetime string', () => {
    expect(isValidDate('2024-06-15T10:30:00Z')).toBe(true)
  })
})

describe('parseRelativeDuration()', () => {
  it('parses "1 day" correctly', () => {
    expect(parseRelativeDuration('1 day')).toBe(86_400_000)
  })

  it('parses "3 days" correctly', () => {
    expect(parseRelativeDuration('3 days')).toBe(3 * 86_400_000)
  })

  it('parses "2 weeks" correctly', () => {
    expect(parseRelativeDuration('2 weeks')).toBe(2 * 7 * 86_400_000)
  })

  it('parses "1 week" correctly', () => {
    expect(parseRelativeDuration('1 week')).toBe(7 * 86_400_000)
  })

  it('parses "1 month" correctly', () => {
    expect(parseRelativeDuration('1 month')).toBe(30 * 86_400_000)
  })

  it('parses "6 months" correctly', () => {
    expect(parseRelativeDuration('6 months')).toBe(6 * 30 * 86_400_000)
  })

  it('is case-insensitive', () => {
    expect(parseRelativeDuration('2 WEEKS')).toBe(2 * 7 * 86_400_000)
  })

  it('handles leading/trailing whitespace', () => {
    expect(parseRelativeDuration('  3 days  ')).toBe(3 * 86_400_000)
  })

  it('returns null for empty string', () => {
    expect(parseRelativeDuration('')).toBeNull()
  })

  it('returns null for unknown unit', () => {
    expect(parseRelativeDuration('5 hours')).toBeNull()
  })

  it('returns null for non-numeric value', () => {
    expect(parseRelativeDuration('two weeks')).toBeNull()
  })

  it('returns null for malformed string', () => {
    expect(parseRelativeDuration('not a duration')).toBeNull()
  })
})
