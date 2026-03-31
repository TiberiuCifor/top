import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

// EmployeeAvatar imports `next/image` (unused in the component body, but needs to resolve)
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />,
}))

describe('EmployeeAvatar', () => {
  it('renders initials from a two-word name', () => {
    render(<EmployeeAvatar name="Jane Doe" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders only the first two initials for long names', () => {
    render(<EmployeeAvatar name="Alice Bob Charlie" />)
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('renders initials in uppercase', () => {
    render(<EmployeeAvatar name="john smith" />)
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('renders an img element when photoUrl is provided', () => {
    render(<EmployeeAvatar name="Jane Doe" photoUrl="https://example.com/photo.jpg" />)
    const img = screen.getByAltText('Jane Doe') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toBe('https://example.com/photo.jpg')
  })

  it('does NOT render an img element when photoUrl is null', () => {
    render(<EmployeeAvatar name="Jane Doe" photoUrl={null} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('applies rounded-full class when shape is circle', () => {
    const { container } = render(<EmployeeAvatar name="Jane Doe" shape="circle" />)
    expect(container.firstChild).toHaveClass('rounded-full')
  })

  it('applies rounded-lg class when shape is rounded (default)', () => {
    const { container } = render(<EmployeeAvatar name="Jane Doe" />)
    expect(container.firstChild).toHaveClass('rounded-lg')
  })

  it('applies sm size classes', () => {
    const { container } = render(<EmployeeAvatar name="Jane Doe" size="sm" />)
    expect(container.firstChild).toHaveClass('w-7', 'h-7')
  })

  it('applies lg size classes', () => {
    const { container } = render(<EmployeeAvatar name="Jane Doe" size="lg" />)
    expect(container.firstChild).toHaveClass('w-11', 'h-11')
  })

  it('renders single-word name as single initial', () => {
    render(<EmployeeAvatar name="Madonna" />)
    expect(screen.getByText('M')).toBeInTheDocument()
  })
})
