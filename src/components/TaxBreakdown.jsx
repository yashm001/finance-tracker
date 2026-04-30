import { formatINR, formatDate, getFYLabel } from '../utils'
import { Bone, SkeletonCard } from './Skeleton'

export default function TaxBreakdown({ transactions, selectedFY, loading }) {
  if (loading) {
    return (
      <div className="p-4 pb-24 space-y-5">
        {/* Header */}
        <div>
          <Bone className="h-6 w-36 mb-1.5" />
          <Bone className="h-3 w-20" />
        </div>
        {/* Hero card */}
        <div className="bg-gradient-to-br from-hero to-hero-light rounded-2xl p-5">
          <Bone className="h-3 w-24 bg-on-primary/10 rounded mb-2" />
          <Bone className="h-8 w-36 bg-on-primary/10 rounded mb-2" />
          <Bone className="h-3 w-28 bg-on-primary/10 rounded" />
        </div>
        {/* Split cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-kpi-bg border border-kpi-border rounded-2xl p-4">
              <Bone className="h-3 w-16 mb-2" />
              <Bone className="h-5 w-20 mb-1" />
              <Bone className="h-2.5 w-14" />
            </div>
          ))}
        </div>
        {/* Split bars */}
        <SkeletonCard>
          <Bone className="h-3 w-10 mb-4" />
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <Bone className="h-4 w-20" />
                  <Bone className="h-4 w-16" />
                </div>
                <Bone className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </SkeletonCard>
        {/* Transaction list */}
        <div>
          <Bone className="h-3 w-28 mb-3" />
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i}>
                <div className="flex justify-between mb-2">
                  <div>
                    <Bone className="h-4 w-32 mb-1.5" />
                    <Bone className="h-3 w-20" />
                  </div>
                  <Bone className="h-4 w-16" />
                </div>
                <div className="flex gap-1.5 mt-2">
                  <Bone className="h-5 w-16 rounded-full" />
                  <Bone className="h-5 w-12 rounded-full" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
      </div>
    )
  }
  const taxTxns = transactions
    .filter((t) => t.category === 'Tax')
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalTax = taxTxns.reduce((sum, t) => sum + Number(t.amount), 0)

  // Group by subcategory (IncomeTax, GST, etc.)
  const bySubcat = {}
  taxTxns.forEach((t) => {
    const key = t.subcategory || 'Other'
    if (!bySubcat[key]) bySubcat[key] = { total: 0, txns: [] }
    bySubcat[key].total += Number(t.amount)
    bySubcat[key].txns.push(t)
  })
  const subcatEntries = Object.entries(bySubcat).sort((a, b) => b[1].total - a[1].total)
  const maxSubcat = subcatEntries.length ? subcatEntries[0][1].total : 1

  return (
    <div className="p-4 pb-24 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Tax Breakdown</h2>
        <p className="text-xs text-text-secondary font-medium">{getFYLabel(selectedFY)}</p>
      </div>

      {/* Total tax card */}
      <div className="bg-gradient-to-br from-hero to-hero-light rounded-2xl p-5 text-on-primary">
        <p className="text-xs font-medium opacity-60 uppercase tracking-wider mb-1">Total Tax Paid</p>
        <p className="font-mono text-3xl font-bold tracking-tight leading-none mb-1">
          {formatINR(totalTax)}
        </p>
        <p className="text-sm opacity-60">
          {taxTxns.length} transaction{taxTxns.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Split cards */}
      {subcatEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {subcatEntries.map(([name, { total, txns }]) => (
            <div key={name} className="bg-kpi-bg border border-kpi-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                {name}
              </p>
              <p className="font-mono text-lg font-bold text-foreground leading-tight">
                {formatINR(total)}
              </p>
              <p className="text-[10px] text-text-muted mt-1">
                {txns.length} payment{txns.length !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Visual breakdown */}
      {subcatEntries.length > 1 && (
        <div className="bg-surface rounded-2xl border border-card-border p-4">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            Split
          </p>
          <div className="space-y-3.5">
            {subcatEntries.map(([name, { total }]) => {
              const pct = (total / maxSubcat) * 100
              return (
                <div key={name}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    <span className="font-mono text-sm font-bold text-foreground">{formatINR(total)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive/70 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction list */}
      {taxTxns.length > 0 ? (
        <div>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            All Tax Payments
          </p>
          <div className="space-y-2.5">
            {taxTxns.map((txn) => (
              <div
                key={txn.row}
                className="bg-surface border border-card-border rounded-2xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{txn.name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{formatDate(txn.date)}</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground ml-3">
                    {formatINR(txn.amount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2.5 py-0.5 bg-destructive/8 text-destructive text-[10px] font-semibold rounded-full">
                    {txn.subcategory}
                  </span>
                  <span className="px-2.5 py-0.5 bg-primary/8 text-primary text-[10px] font-semibold rounded-full">
                    {txn.mode}
                  </span>
                </div>
                {txn.description && (
                  <p className="text-[11px] text-text-muted mt-2">{txn.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm font-medium">No tax payments yet</p>
          <p className="text-text-muted text-xs mt-1">Tax transactions will appear here</p>
        </div>
      )}
    </div>
  )
}
