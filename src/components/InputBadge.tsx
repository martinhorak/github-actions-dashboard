interface InputBadgeProps {
  variant: 'environment' | 'subscription'
  value: string
}

export function InputBadge({ variant, value }: InputBadgeProps) {
  const envModifier =
    variant === 'environment' && value === 'production' ? ' production' : ''
  return (
    <span className={`input-badge ${variant}${envModifier}`} title={value}>
      {value}
    </span>
  )
}
