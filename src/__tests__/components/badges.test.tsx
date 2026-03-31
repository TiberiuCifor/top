/**
 * Tests for the inline badge components defined in the trainings-certs pages.
 * Since these are small pure-render components, we re-define them here to test
 * the logic independently without importing the full page (which has client-side
 * hooks that are hard to test in isolation).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── CountBadge (from trainings-certs/page.tsx) ───────────────────────────────

function CountBadge({ value, color }: { value: number | null; color: 'blue' | 'amber' | 'emerald' | 'rose' }) {
  if (value === null) return <span data-testid="badge-null">—</span>
  if (value === 0) return <span data-testid="badge-zero">—</span>
  const cls = {
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  }[color]
  return <span data-testid="badge-value" className={`rounded-full text-xs font-semibold px-2 ${cls}`}>{value}</span>
}

describe('CountBadge', () => {
  it('renders em-dash for null', () => {
    render(<CountBadge value={null} color="blue" />)
    expect(screen.getByTestId('badge-null').textContent).toBe('—')
  })

  it('renders em-dash for 0', () => {
    render(<CountBadge value={0} color="blue" />)
    expect(screen.getByTestId('badge-zero').textContent).toBe('—')
  })

  it('renders the number for a positive value', () => {
    render(<CountBadge value={5} color="blue" />)
    expect(screen.getByTestId('badge-value').textContent).toBe('5')
  })

  it('applies blue color class', () => {
    render(<CountBadge value={3} color="blue" />)
    expect(screen.getByTestId('badge-value')).toHaveClass('bg-blue-100', 'text-blue-700')
  })

  it('applies rose color class', () => {
    render(<CountBadge value={7} color="rose" />)
    expect(screen.getByTestId('badge-value')).toHaveClass('bg-rose-100', 'text-rose-700')
  })

  it('applies emerald color class', () => {
    render(<CountBadge value={2} color="emerald" />)
    expect(screen.getByTestId('badge-value')).toHaveClass('bg-emerald-100', 'text-emerald-700')
  })
})

// ── Kb4StatusBadge (from trainings-certs/[employeeId]/page.tsx) ──────────────

function Kb4StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase()
  let label = status ?? '—'
  if (s === 'passed' || s === 'completed') label = 'Completed'
  else if (s === 'in_progress' || s === 'in progress') label = 'In Progress'
  else if (s === 'not_started' || s === 'not started') label = 'Not Started'
  else if (s === 'failed') label = 'Failed'
  else if (s === 'overdue') label = 'Overdue'
  return <span data-testid="kb4-badge">{label}</span>
}

describe('Kb4StatusBadge', () => {
  it('"passed" renders as "Completed"', () => {
    render(<Kb4StatusBadge status="passed" />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('Completed')
  })

  it('"completed" renders as "Completed"', () => {
    render(<Kb4StatusBadge status="completed" />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('Completed')
  })

  it('"in_progress" renders as "In Progress"', () => {
    render(<Kb4StatusBadge status="in_progress" />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('In Progress')
  })

  it('"in progress" (space) renders as "In Progress"', () => {
    render(<Kb4StatusBadge status="in progress" />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('In Progress')
  })

  it('"not_started" renders as "Not Started"', () => {
    render(<Kb4StatusBadge status="not_started" />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('Not Started')
  })

  it('"failed" renders as "Failed"', () => {
    render(<Kb4StatusBadge status="failed" />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('Failed')
  })

  it('"overdue" renders as "Overdue"', () => {
    render(<Kb4StatusBadge status="overdue" />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('Overdue')
  })

  it('unknown status renders the raw value', () => {
    render(<Kb4StatusBadge status="UNKNOWN_STATUS" />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('UNKNOWN_STATUS')
  })

  it('undefined status renders em-dash', () => {
    render(<Kb4StatusBadge />)
    expect(screen.getByTestId('kb4-badge').textContent).toBe('—')
  })
})
