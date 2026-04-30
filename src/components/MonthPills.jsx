import { useRef, useEffect } from 'react'
import { getFYMonths, getMonthName } from '../utils'

export default function MonthPills({ selectedMonth, onSelect, monthsWithData, variant = 'light' }) {
  const activeRef = useRef(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedMonth])

  const months = getFYMonths()
  const isDark = variant === 'dark'

  return (
    <div
      className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {months.map((m) => {
        const isActive = m === selectedMonth
        const hasData = monthsWithData?.includes(m)

        let className = 'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 '

        if (isDark) {
          className += isActive
            ? 'bg-on-primary text-primary'
            : hasData
              ? 'bg-on-primary/15 text-on-primary/80 hover:bg-on-primary/25'
              : 'text-on-primary/30'
        } else {
          className += isActive
            ? 'bg-primary text-on-primary shadow-sm'
            : hasData
              ? 'bg-surface text-text-secondary border border-card-border hover:border-primary/30'
              : 'text-text-muted hover:text-text-secondary'
        }

        return (
          <button
            key={m}
            ref={isActive ? activeRef : null}
            onClick={() => onSelect(m)}
            className={className}
          >
            {getMonthName(m)}
          </button>
        )
      })}
    </div>
  )
}
