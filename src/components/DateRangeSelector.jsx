import { useRef, useEffect } from 'react'

const presets = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  // { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'current_fy', label: 'Current FY' },
  { key: 'custom', label: 'Custom' },
]

export default function DateRangeSelector({
  selectedPreset,
  dateRange,
  onPresetChange,
  onCustomRangeChange,
}) {
  const activeRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedPreset])

  const handleFromChange = (e) => {
    const from = e.target.value
    const to = dateRange.to
    if (from > to) {
      onCustomRangeChange(to, from)
    } else {
      onCustomRangeChange(from, to)
    }
  }

  const handleToChange = (e) => {
    const to = e.target.value
    const from = dateRange.from
    if (from > to) {
      onCustomRangeChange(to, from)
    } else {
      onCustomRangeChange(from, to)
    }
  }

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {presets.map((preset) => {
          const isActive = selectedPreset === preset.key
          return (
            <button
              key={preset.key}
              ref={isActive ? activeRef : null}
              onClick={() => onPresetChange(preset.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface text-text-secondary border border-card-border hover:border-primary/30'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {selectedPreset === 'custom' && (
        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-text-muted mb-1 block">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={handleFromChange}
              className="w-full px-3 py-2.5 bg-muted border border-card-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-medium text-text-muted mb-1 block">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={handleToChange}
              className="w-full px-3 py-2.5 bg-muted border border-card-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  )
}
