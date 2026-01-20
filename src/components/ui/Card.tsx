import { HTMLAttributes, memo } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = memo(({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        className
      )}
      {...props}
    />
  )
})

Card.displayName = 'Card'

export const CardHeader = memo(({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn('px-6 py-4 border-b border-gray-200', className)}
      {...props}
    />
  )
})

CardHeader.displayName = 'CardHeader'

export const CardContent = memo(({ className, ...props }: CardProps) => {
  return (
    <div className={cn('px-6 py-4', className)} {...props} />
  )
})

CardContent.displayName = 'CardContent'

export const CardTitle = memo(({ className, ...props }: CardProps) => {
  return (
    <h3
      className={cn('text-lg font-semibold text-gray-900', className)}
      {...props}
    />
  )
})

CardTitle.displayName = 'CardTitle'
