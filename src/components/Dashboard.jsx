import { useState } from 'react'
import MonthPills from './MonthPills'
import KPICard from './KPICard'
import { Bone, SkeletonCard } from './Skeleton'
import Sparkline from './Sparkline'
import { formatINR, getFYMonths, getMonthName, getFYLabel, getFYForDate } from '../utils'
import { ArrowUpRight, ArrowDownRight, RefreshCw, ChevronDown } from 'lucide-react'

export default function Dashboard({
  transactions,
  summary,
  selectedFY,
  selectedMonth,
  onSelectMonth,
  onRefresh,
  loading,
}) {
  const monthTxns = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() + 1 === selectedMonth && getFYForDate(d) === selectedFY
  })

  const monthTotal = monthTxns
    .filter((t) => t.category !== 'Tax')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const monthPersonal = monthTxns
    .filter((t) => t.category === 'Personal')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const monthWork = monthTxns
    .filter((t) => t.category === 'Work')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthsWithData = summary?.byMonth
    ? Object.keys(summary.byMonth).map(Number)
    : []

  const fyMonths = getFYMonths()
  const maxMonthSpend = summary?.byMonth
    ? Math.max(...Object.values(summary.byMonth), 1)
    : 1

  const modeEntries = summary?.byMode
    ? Object.entries(summary.byMode).sort((a, b) => b[1] - a[1])
    : []
  const maxModeSpend = modeEntries.length ? modeEntries[0][1] : 1

  const subcatEntries = summary?.bySubcat
    ? Object.entries(summary.bySubcat).sort((a, b) => b[1] - a[1])
    : []
  const maxSubcatSpend = subcatEntries.length ? subcatEntries[0][1] : 1

  const [refreshing, setRefreshing] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [showAllModes, setShowAllModes] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  if (loading && !refreshing) {
    return (
      <div className="pb-24">
        {/* Hero skeleton */}
        <div className="bg-gradient-to-br from-hero to-hero-light rounded-b-3xl px-5 pt-5 pb-6">
          <Bone className="h-4 w-28 bg-on-primary/10 rounded mb-3" />
          <div className="flex gap-2 mb-4">
            {[...Array(6)].map((_, i) => (
              <Bone key={i} className="h-7 w-10 bg-on-primary/10 rounded-full flex-shrink-0" />
            ))}
          </div>
          <Bone className="h-3 w-20 bg-on-primary/10 rounded mb-2" />
          <Bone className="h-10 w-44 bg-on-primary/10 rounded mb-2" />
          <Bone className="h-3 w-28 bg-on-primary/10 rounded" />
        </div>
        <div className="px-4 space-y-5 -mt-4">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-kpi-bg border border-kpi-border rounded-2xl p-4">
                <Bone className="h-3 w-14 mb-2" />
                <Bone className="h-5 w-20" />
              </div>
            ))}
          </div>
          {/* FY summary */}
          <div>
            <Bone className="h-3 w-16 mb-2.5" />
            <div className="grid grid-cols-2 gap-2.5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-kpi-bg border border-kpi-border rounded-2xl p-4">
                  <Bone className="h-3 w-16 mb-2" />
                  <Bone className="h-5 w-24" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-kpi-bg border border-kpi-border rounded-2xl p-4">
                  <Bone className="h-3 w-16 mb-2" />
                  <Bone className="h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
          {/* Monthly breakdown */}
          <SkeletonCard>
            <Bone className="h-3 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3 w-8" />
                  <Bone className="h-7 flex-1 rounded-lg" />
                </div>
              ))}
            </div>
          </SkeletonCard>
          {/* Category breakdown */}
          <SkeletonCard>
            <Bone className="h-3 w-36 mb-4" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <Bone className="h-4 w-24" />
                    <Bone className="h-4 w-16" />
                  </div>
                  <Bone className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </div>
    )
  }

  const profileName = localStorage.getItem('finance_profile_name') || ''

  return (
    <div className="pb-24">
      {/* Hero Section — navy blue header */}
      <div className="bg-gradient-to-br from-hero to-hero-light rounded-b-3xl px-5 pt-5 pb-6 text-on-primary">
        <div className="flex items-center justify-between mb-1">
          <div>
            {profileName && (
              <h2 className="text-base font-bold leading-tight">{profileName}'s Finances</h2>
            )}
            <p className={`text-sm font-medium opacity-80 ${profileName ? 'mt-0.5' : ''}`}>
              {getFYLabel(selectedFY)}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 text-on-primary/60 hover:text-on-primary cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="mb-4">
          <MonthPills
            selectedMonth={selectedMonth}
            onSelect={onSelectMonth}
            monthsWithData={monthsWithData}
            variant="dark"
          />
        </div>

        <p className="text-xs font-medium opacity-60 uppercase tracking-wider mb-1">
          {getMonthName(selectedMonth)} Total
        </p>
        <p className="font-mono text-4xl font-bold tracking-tight leading-none">
          {formatINR(monthTotal)}
        </p>
        <Sparkline
          transactions={monthTxns.filter((t) => t.category !== 'Tax')}
          selectedMonth={selectedMonth}
          selectedYear={selectedMonth >= 4 ? selectedFY : selectedFY + 1}
        />
        <p className="text-sm opacity-60">
          {monthTxns.length} transaction{monthTxns.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-4 space-y-5 -mt-4">
        {/* Personal / Work / Transactions row */}
        <div className="grid grid-cols-3 gap-2.5">
          <KPICard
            label="Personal"
            value={formatINR(monthPersonal)}
            color="green"
            icon={<ArrowUpRight size={12} />}
          />
          <KPICard
            label="Work"
            value={formatINR(monthWork)}
            color="blue"
            icon={<ArrowDownRight size={12} />}
          />
          <KPICard
            label="Count"
            value={monthTxns.length}
            color="primary"
          />
        </div>

        {/* FY Summary */}
        <div>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5">
            Full Year
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <KPICard label="FY Total" value={formatINR(summary?.fyTotal || 0)} color="primary" />
            <KPICard
              label="Avg / Month"
              value={formatINR(summary?.avgPerMonth || 0)}
              subValue={`${summary?.distinctMonths || 0} month${(summary?.distinctMonths || 0) !== 1 ? 's' : ''}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <KPICard label="Personal" value={formatINR(summary?.personal || 0)} color="green" />
            <KPICard label="Work" value={formatINR(summary?.work || 0)} color="blue" />
          </div>

        </div>

        {/* Monthly Breakdown */}
        {summary?.byMonth && Object.keys(summary.byMonth).length > 0 && (
          <div className="bg-surface rounded-2xl border border-card-border p-4">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
              Monthly Breakdown
            </p>
            <div className="space-y-2.5">
              {fyMonths.map((m) => {
                const amount = summary.byMonth[String(m)] || 0
                if (!amount) return null
                const pct = (amount / maxMonthSpend) * 100
                const isSelected = m === selectedMonth
                return (
                  <button
                    key={m}
                    onClick={() => onSelectMonth(m)}
                    className="flex items-center gap-3 w-full text-left cursor-pointer group"
                  >
                    <span className={`text-xs w-8 text-right font-semibold ${isSelected ? 'text-primary' : 'text-text-muted'}`}>
                      {getMonthName(m)}
                    </span>
                    <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg flex items-center px-2.5 transition-all duration-500 ${
                          isSelected ? 'bg-primary/15' : 'bg-primary/8 group-hover:bg-primary/12'
                        }`}
                        style={{ width: `${Math.max(pct, 15)}%` }}
                      >
                        <span className={`font-mono text-[11px] font-semibold whitespace-nowrap ${
                          isSelected ? 'text-primary' : 'text-text-secondary'
                        }`}>
                          {formatINR(amount)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Spending by category (FY-level) */}
        {subcatEntries.length > 0 && (
          <div className="bg-surface rounded-2xl border border-card-border p-4">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
              Spending by Category
            </p>
            <div className="space-y-3.5">
              {(showAllCategories ? subcatEntries : subcatEntries.slice(0, 3)).map(([subcat, amount]) => {
                const pct = (amount / maxSubcatSpend) * 100
                return (
                  <div key={subcat}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm font-medium text-foreground">{subcat}</span>
                      <span className="font-mono text-sm font-bold text-foreground">{formatINR(amount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {subcatEntries.length > 3 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="flex items-center gap-1 mx-auto mt-3 text-xs font-semibold text-primary cursor-pointer transition-colors hover:text-primary-light"
              >
                {showAllCategories ? 'Show Less' : `View All (${subcatEntries.length})`}
                <ChevronDown size={14} className={`transition-transform duration-200 ${showAllCategories ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}

        {/* Payment Mode (FY-level) */}
        {modeEntries.length > 0 && (
          <div className="bg-surface rounded-2xl border border-card-border p-4">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
              By Payment Mode
            </p>
            <div className="space-y-3.5">
              {(showAllModes ? modeEntries : modeEntries.slice(0, 3)).map(([mode, amount]) => {
                const pct = (amount / maxModeSpend) * 100
                return (
                  <div key={mode}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm font-medium text-foreground">{mode}</span>
                      <span className="font-mono text-sm font-bold text-foreground">{formatINR(amount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {modeEntries.length > 3 && (
              <button
                onClick={() => setShowAllModes(!showAllModes)}
                className="flex items-center gap-1 mx-auto mt-3 text-xs font-semibold text-primary cursor-pointer transition-colors hover:text-primary-light"
              >
                {showAllModes ? 'Show Less' : `View All (${modeEntries.length})`}
                <ChevronDown size={14} className={`transition-transform duration-200 ${showAllModes ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && transactions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-secondary text-sm font-medium">No transactions yet</p>
            <p className="text-text-muted text-xs mt-1">Add your first transaction to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
