import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-red-500')).toBe('text-red-500')
  })

  it('merges multiple classes', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('resolves Tailwind conflicts — last value wins', () => {
    // tailwind-merge resolves p-4 over px-2 + py-2 conflicts
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('ignores falsy values', () => {
    expect(cn('text-sm', false, undefined, null, 'font-bold')).toBe('text-sm font-bold')
  })

  it('handles conditional objects', () => {
    expect(cn({ 'bg-red-500': true, 'bg-blue-500': false })).toBe('bg-red-500')
  })

  it('handles arrays of classes', () => {
    expect(cn(['text-xs', 'font-medium'])).toBe('text-xs font-medium')
  })

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })
})
