'use client'

import Image from 'next/image'

interface EmployeeAvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  shape?: 'rounded' | 'circle'
  className?: string
}

const sizeMap = {
  xs: { container: 'w-5 h-5', text: 'text-[8px]' },
  sm: { container: 'w-7 h-7', text: 'text-[9px]' },
  md: { container: 'w-8 h-8', text: 'text-xs' },
  lg: { container: 'w-11 h-11', text: 'text-sm' },
}

export function EmployeeAvatar({ name, photoUrl, size = 'md', shape = 'rounded', className = '' }: EmployeeAvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const { container, text } = sizeMap[size]
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'

  if (photoUrl) {
    return (
      <div className={`${container} ${shapeClass} overflow-hidden shrink-0 shadow-sm ${className}`}>
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={`${container} ${shapeClass} bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center shadow-sm shrink-0 ${className}`}
    >
      <span className={`text-white font-bold leading-none ${text}`}>{initials}</span>
    </div>
  )
}
