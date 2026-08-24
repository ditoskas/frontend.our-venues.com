import { useTranslation } from 'react-i18next'

export type MonogramType = 'Marriage' | 'Christening'
export type MonogramSize = 'sm' | 'lg'

interface MonogramProps {
  name1: string
  name2: string
  date: string | Date | null
  type: MonogramType
  size?: MonogramSize
  className?: string
}

const sizeStyles: Record<MonogramSize, { badge: string; letters: string; name: string; date: string; textWrapper: string }> = {
  lg: {
    badge: 'h-24 w-24',
    letters: 'text-3xl',
    name: 'text-xl',
    date: 'mt-1 text-sm tracking-[0.2em]',
    textWrapper: '',
  },
  sm: {
    badge: 'h-11 w-11',
    letters: 'text-sm',
    name: 'text-xs',
    date: 'text-[10px] tracking-[0.15em]',
    textWrapper: 'hidden sm:block',
  },
}

export function Monogram({ name1, name2, date, type, size = 'lg', className = '' }: MonogramProps) {
  const { i18n } = useTranslation()
  const styles = sizeStyles[size]

  const isMarriage = type === 'Marriage'
  const initial1 = name1.trim().charAt(0).toUpperCase()
  const initial2 = name2.trim().charAt(0).toUpperCase()
  const monogramText = isMarriage ? `${initial1}&${initial2}` : `${initial1}${initial2}`
  const namesText = isMarriage ? `${name1} & ${name2}` : `${name1} ${name2}`

  const formattedDate = date
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(typeof date === 'string' ? new Date(date) : date)
    : null

  return (
    <div className={`flex items-center gap-3 ${size === 'lg' ? 'sm:gap-6' : ''} ${className}`}>
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-full border border-natural-accent/40 ${styles.badge}`}
        aria-hidden="true"
      >
        <div className="flex h-[85%] w-[85%] items-center justify-center rounded-full border border-natural-accent/70">
          <span className={`font-monogram italic font-bold tracking-wide text-natural-accent ${styles.letters}`}>
            {monogramText}
          </span>
        </div>
      </div>

      <div className={styles.textWrapper}>
        <p className={`font-serif leading-none text-natural-text ${styles.name}`}>{namesText}</p>
        {formattedDate && (
          <p className={`font-sans uppercase leading-none text-natural-muted ${styles.date}`}>
            {formattedDate}
          </p>
        )}
      </div>
    </div>
  )
}
