import { useState } from 'react'
import { formatINR, formatDate, getDateRangeForPreset, isDateInRange, formatDateRange } from '../utils'
import { editTransaction, deleteTransaction } from '../api'
import { Pencil, Trash2, Check, X, Loader2, Search, RefreshCw, ChevronDown, Filter } from 'lucide-react'
import DateRangeSelector from './DateRangeSelector'
import ConfirmDialog from './ConfirmDialog'
import { Bone, SkeletonCard } from './Skeleton'

export default function Transactions({
  transactions,
  dropdownOptions,
  onRefresh,
  showToast,
  loading,
}) {
  // Date range
  const [selectedPreset, setSelectedPreset] = useState('this_month')
  const [dateRange, setDateRange] = useState(() => getDateRangeForPreset('this_month'))

  // Sort
  const [sortBy, setSortBy] = useState('date_desc')

  // Breakdown
  const [breakdownTab, setBreakdownTab] = useState('subcategory')
  const [expandedGroups, setExpandedGroups] = useState({})
  const [breakdownFilter, setBreakdownFilter] = useState('all') // 'all' | 'Personal' | 'Work'

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Breakdown detail
  const [selectedBreakdownTxn, setSelectedBreakdownTxn] = useState(null)

  // Edit/Delete
  const [editingRow, setEditingRow] = useState(null)
  const [editFields, setEditFields] = useState({})
  const [saving, setSaving] = useState(false)
  const [deletingRow, setDeletingRow] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Refresh
  const [refreshing, setRefreshing] = useState(false)

  // --- Data pipeline ---

  // 1. Filter by date range
  const rangeFiltered = transactions.filter((t) =>
    isDateInRange(t.date, dateRange.from, dateRange.to)
  )

  // 2. Filter by category (Personal/Work)
  const categoryFiltered = breakdownFilter === 'all'
    ? rangeFiltered
    : rangeFiltered.filter((t) => t.category === breakdownFilter)

  // 3. Search filter
  const searchFiltered = searchQuery.trim()
    ? categoryFiltered.filter((t) => {
        const q = searchQuery.toLowerCase()
        return (
          t.name.toLowerCase().includes(q) ||
          t.mode?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.subcategory?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
        )
      })
    : categoryFiltered

  // 4. Sort
  const sortedTxns = [...searchFiltered].sort((a, b) => {
    switch (sortBy) {
      case 'date_asc': return a.date.localeCompare(b.date)
      case 'amount_desc': return Number(b.amount) - Number(a.amount)
      case 'amount_asc': return Number(a.amount) - Number(b.amount)
      default: return b.date.localeCompare(a.date) // date_desc
    }
  })

  // 5. Summary stats (always from date range, ignoring category filter)
  const totalAmount = rangeFiltered
    .filter((t) => t.category !== 'Tax')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const personalAmount = rangeFiltered
    .filter((t) => t.category === 'Personal')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const workAmount = rangeFiltered
    .filter((t) => t.category === 'Work')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // Group transactions by subcategory and mode, with totals
  const subcatGroups = {}
  const modeGroups = {}
  categoryFiltered.forEach((t) => {
    const amt = Number(t.amount)
    // Subcategory grouping
    if (!subcatGroups[t.subcategory]) subcatGroups[t.subcategory] = { total: 0, txns: [] }
    subcatGroups[t.subcategory].total += amt
    subcatGroups[t.subcategory].txns.push(t)
    // Mode grouping
    if (!modeGroups[t.mode]) modeGroups[t.mode] = { total: 0, txns: [] }
    modeGroups[t.mode].total += amt
    modeGroups[t.mode].txns.push(t)
  })

  const toSortedEntries = (groups) =>
    Object.entries(groups)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, { total, txns }]) => ({
        name,
        total,
        txns: [...txns].sort((a, b) => b.date.localeCompare(a.date)),
      }))

  const subcatEntries = toSortedEntries(subcatGroups)
  const modeEntries = toSortedEntries(modeGroups)

  const breakdownEntries = breakdownTab === 'subcategory' ? subcatEntries : modeEntries

  // --- Handlers ---

  const toggleGroup = (name) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey)
    if (presetKey !== 'custom') {
      setDateRange(getDateRangeForPreset(presetKey))
    }
  }

  const handleCustomRangeChange = (from, to) => {
    setDateRange({ from, to })
  }

  const startEdit = (txn) => {
    setEditingRow(txn.row)
    setEditFields({
      name: txn.name,
      amount: txn.amount,
      mode: txn.mode,
      category: txn.category,
      subcategory: txn.subcategory,
      description: txn.description || '',
    })
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setEditFields({})
  }

  const saveEdit = async () => {
    if (!editFields.name?.trim()) {
      showToast('Name cannot be empty', 'error')
      return
    }
    if (!editFields.amount || Number(editFields.amount) <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }
    setSaving(true)
    try {
      await editTransaction(editingRow, {
        name: editFields.name,
        amount: Number(editFields.amount),
        mode: editFields.mode,
        category: editFields.category,
        subcategory: editFields.subcategory,
        description: editFields.description || undefined,
      })
      showToast('Transaction updated')
      setEditingRow(null)
      onRefresh()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (txn) => {
    setDeleteConfirm(txn)
  }

  const handleDelete = async () => {
    const txn = deleteConfirm
    if (!txn) return
    setDeleteConfirm(null)
    setDeletingRow(txn.row)
    try {
      await deleteTransaction(txn.row)
      showToast(`Deleted: ${txn.name}`)
      onRefresh()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDeletingRow(null)
    }
  }

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
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Bone className="h-6 w-32" />
          <Bone className="h-5 w-5 rounded" />
        </div>
        {/* Date range pills */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>
        {/* Summary card */}
        <SkeletonCard>
          <div className="flex justify-between mb-2">
            <Bone className="h-3 w-10" />
            <Bone className="h-6 w-24" />
          </div>
          <div className="flex gap-4 mb-2">
            <Bone className="h-3 w-28" />
            <Bone className="h-3 w-20" />
          </div>
          <Bone className="h-3 w-40" />
        </SkeletonCard>
        {/* Breakdown */}
        <div>
          <Bone className="h-3 w-36 mb-3" />
          <Bone className="h-9 w-full rounded-xl mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} className="!p-3">
                <div className="flex justify-between">
                  <Bone className="h-4 w-28" />
                  <Bone className="h-4 w-16" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
        {/* Search bar */}
        <Bone className="h-10 w-full rounded-xl" />
        <Bone className="h-3 w-28" />
        {/* Transaction cards */}
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i}>
              <div className="flex justify-between mb-2">
                <div>
                  <Bone className="h-4 w-28 mb-1.5" />
                  <Bone className="h-3 w-20" />
                </div>
                <Bone className="h-4 w-16" />
              </div>
              <div className="flex gap-1.5 mt-3">
                <Bone className="h-5 w-12 rounded-full" />
                <Bone className="h-5 w-16 rounded-full" />
                <Bone className="h-5 w-20 rounded-full" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    )
  }

  const inputClass = 'px-3 py-2.5 bg-muted border border-card-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors'

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Transactions</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-text-muted hover:text-primary cursor-pointer transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 2. Date Range Selector */}
      <DateRangeSelector
        selectedPreset={selectedPreset}
        dateRange={dateRange}
        onPresetChange={handlePresetChange}
        onCustomRangeChange={handleCustomRangeChange}
      />

      {/* 3. Summary Stats */}
      <div className="bg-surface rounded-2xl border border-card-border p-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Total
          </span>
          <span className="font-mono text-xl font-bold text-foreground">
            {formatINR(totalAmount)}
          </span>
        </div>
        <div className="flex gap-4 mb-2">
          <span className="text-xs font-medium text-accent">
            Personal: {formatINR(personalAmount)}
          </span>
          <span className="text-xs font-medium text-secondary">
            Work: {formatINR(workAmount)}
          </span>
        </div>
        <p className="text-[11px] text-text-muted">
          {rangeFiltered.length} transaction{rangeFiltered.length !== 1 ? 's' : ''}
          {' \u00B7 '}
          {formatDateRange(dateRange.from, dateRange.to)}
        </p>
      </div>

      {/* 4. Breakdown */}
      {breakdownEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Expenses Breakdown
            </p>
            <div className="relative">
              <Filter size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${breakdownFilter !== 'all' ? 'text-primary' : 'text-text-muted'}`} />
              <select
                value={breakdownFilter}
                onChange={(e) => { setBreakdownFilter(e.target.value); setExpandedGroups({}) }}
                className={`pl-7 pr-2 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer focus:outline-none appearance-none ${
                  breakdownFilter !== 'all'
                    ? 'bg-primary/8 border-primary/20 text-primary'
                    : 'bg-muted border-card-border text-text-secondary'
                }`}
              >
                <option value="all">All</option>
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
              </select>
            </div>
          </div>
          {/* Segmented toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-4">
            <button
              onClick={() => { setBreakdownTab('subcategory'); setExpandedGroups({}) }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                breakdownTab === 'subcategory'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-text-muted'
              }`}
            >
              Category
            </button>
            <button
              onClick={() => { setBreakdownTab('mode'); setExpandedGroups({}) }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                breakdownTab === 'mode'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-text-muted'
              }`}
            >
              Payment Mode
            </button>
          </div>

          <div className="space-y-3">
            {breakdownEntries.map((group) => {
              const isExpanded = !!expandedGroups[group.name]
              return (
                <div
                  key={group.name}
                  className="bg-surface rounded-2xl border border-card-border overflow-hidden"
                >
                  {/* Group header — clickable */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className="flex justify-between items-center w-full px-4 py-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        size={14}
                        className={`text-text-muted transition-transform duration-200 ${
                          isExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                      <span className="text-sm font-bold text-foreground">{group.name}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {formatINR(group.total)}
                    </span>
                  </button>

                  {/* Nested transactions — collapsible */}
                  {isExpanded && (
                    <div className="border-t border-card-border">
                      {group.txns.map((txn) => {
                        const isSelected = selectedBreakdownTxn === txn.row
                        const isEditing = editingRow === txn.row
                        const isDeleting = deletingRow === txn.row

                        return (
                          <div key={txn.row}>
                            {/* Row — clickable */}
                            <button
                              onClick={() => setSelectedBreakdownTxn(isSelected ? null : txn.row)}
                              className="flex justify-between items-center w-full px-4 py-2.5 pl-10 cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs text-text-secondary truncate">{txn.name}</p>
                                {txn.description && (
                                  <p className="text-[10px] text-text-muted truncate">{txn.description}</p>
                                )}
                              </div>
                              <div className="text-right ml-3 flex-shrink-0">
                                <p className="font-mono text-xs font-semibold text-foreground">
                                  {formatINR(txn.amount)}
                                </p>
                                <p className="text-[10px] text-text-muted">{formatDate(txn.date)}</p>
                              </div>
                            </button>

                            {/* Expanded detail */}
                            {isSelected && !isEditing && (
                              <div className="flex items-center justify-between px-4 pb-2.5 pl-10">
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="px-2.5 py-0.5 bg-primary/8 text-primary text-[10px] font-semibold rounded-full">
                                    {txn.mode}
                                  </span>
                                  <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
                                    txn.category === 'Personal'
                                      ? 'bg-accent/10 text-accent'
                                      : 'bg-secondary/10 text-secondary'
                                  }`}>
                                    {txn.category}
                                  </span>
                                  <span className="px-2.5 py-0.5 bg-amber/10 text-amber text-[10px] font-semibold rounded-full">
                                    {txn.subcategory}
                                  </span>
                                </div>
                                <div className="flex gap-1 flex-shrink-0 ml-3">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startEdit(txn) }}
                                    className="p-1.5 text-primary/60 hover:text-primary cursor-pointer transition-colors"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); confirmDelete(txn) }}
                                    disabled={isDeleting}
                                    className="p-1.5 text-destructive/60 hover:text-destructive cursor-pointer transition-colors disabled:opacity-50"
                                  >
                                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Inline edit form */}
                            {isSelected && isEditing && (
                              <div className="px-4 pb-3 pl-10 space-y-3">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={editFields.name}
                                    onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                                    className={`flex-1 ${inputClass}`}
                                    placeholder="Name"
                                  />
                                  <input
                                    type="number"
                                    value={editFields.amount}
                                    onChange={(e) => setEditFields({ ...editFields, amount: e.target.value })}
                                    className={`w-28 font-mono ${inputClass}`}
                                    placeholder="Amount"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <select
                                    value={editFields.mode}
                                    onChange={(e) => setEditFields({ ...editFields, mode: e.target.value })}
                                    className={`flex-1 ${inputClass}`}
                                  >
                                    {(dropdownOptions?.modes || []).map((m) => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={editFields.category}
                                    onChange={(e) => setEditFields({ ...editFields, category: e.target.value })}
                                    className={`flex-1 ${inputClass}`}
                                  >
                                    {(dropdownOptions?.categories || []).map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                                <select
                                  value={editFields.subcategory}
                                  onChange={(e) => setEditFields({ ...editFields, subcategory: e.target.value })}
                                  className={`w-full ${inputClass}`}
                                >
                                  {(dropdownOptions?.subcategories || []).map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={editFields.description}
                                  onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                                  className={`w-full ${inputClass}`}
                                  placeholder="Description (optional)"
                                />
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    onClick={cancelEdit}
                                    className="flex items-center gap-1 px-3 py-2 text-xs text-text-secondary hover:text-foreground cursor-pointer transition-colors rounded-lg"
                                  >
                                    <X size={14} /> Cancel
                                  </button>
                                  <button
                                    onClick={saveEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:opacity-90 disabled:opacity-50"
                                  >
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    Save
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Search + Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-8 py-2.5 bg-surface border border-card-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="flex-shrink-0 px-3 py-2.5 bg-surface border border-card-border rounded-xl text-xs text-text-secondary font-medium focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="date_desc">Newest</option>
          <option value="date_asc">Oldest</option>
          <option value="amount_desc">Highest</option>
          <option value="amount_asc">Lowest</option>
        </select>
      </div>

      {/* 6. Results count */}
      <p className="text-xs text-text-secondary font-medium">
        {searchQuery
          ? `${sortedTxns.length} result${sortedTxns.length !== 1 ? 's' : ''}`
          : `${categoryFiltered.length} transaction${categoryFiltered.length !== 1 ? 's' : ''}`}
      </p>

      {/* 7. Transaction list */}
      {sortedTxns.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm font-medium">
            {searchQuery ? 'No matching transactions' : 'No transactions in this period'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedTxns.map((txn) => {
            const isEditing = editingRow === txn.row
            const isDeleting = deletingRow === txn.row

            return (
              <div
                key={txn.row}
                className="bg-surface border border-card-border rounded-2xl p-4 shadow-sm transition-all duration-200"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editFields.name}
                        onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                        className={`flex-1 ${inputClass}`}
                        placeholder="Name"
                      />
                      <input
                        type="number"
                        value={editFields.amount}
                        onChange={(e) => setEditFields({ ...editFields, amount: e.target.value })}
                        className={`w-28 font-mono ${inputClass}`}
                        placeholder="Amount"
                      />
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={editFields.mode}
                        onChange={(e) => setEditFields({ ...editFields, mode: e.target.value })}
                        className={`flex-1 ${inputClass}`}
                      >
                        {(dropdownOptions?.modes || []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={editFields.category}
                        onChange={(e) => setEditFields({ ...editFields, category: e.target.value })}
                        className={`flex-1 ${inputClass}`}
                      >
                        {(dropdownOptions?.categories || []).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <select
                      value={editFields.subcategory}
                      onChange={(e) => setEditFields({ ...editFields, subcategory: e.target.value })}
                      className={`w-full ${inputClass}`}
                    >
                      {(dropdownOptions?.subcategories || []).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={editFields.description}
                      onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                      className={`w-full ${inputClass}`}
                      placeholder="Description (optional)"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-2 text-xs text-text-secondary hover:text-foreground cursor-pointer transition-colors rounded-lg"
                      >
                        <X size={14} /> Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="flex items-center gap-1 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:opacity-90 disabled:opacity-50"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{txn.name}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {formatDate(txn.date)}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-bold text-foreground ml-3">
                        {formatINR(txn.amount)}
                      </p>
                    </div>

                    {txn.description && (
                      <p className="text-[11px] text-text-muted mb-1.5">{txn.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-0.5 bg-primary/8 text-primary text-[10px] font-semibold rounded-full">
                          {txn.mode}
                        </span>
                        <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
                          txn.category === 'Personal'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-secondary/10 text-secondary'
                        }`}>
                          {txn.category}
                        </span>
                        <span className="px-2.5 py-0.5 bg-amber/10 text-amber text-[10px] font-semibold rounded-full">
                          {txn.subcategory}
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-3">
                        <button
                          onClick={() => startEdit(txn)}
                          className="p-1.5 text-primary/60 hover:text-primary cursor-pointer transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => confirmDelete(txn)}
                          disabled={isDeleting}
                          className="p-1.5 text-destructive/60 hover:text-destructive cursor-pointer transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 9. Delete confirm dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Transaction"
          message={`Are you sure you want to delete "${deleteConfirm.name}" (${formatINR(deleteConfirm.amount)})? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          destructive
        />
      )}
    </div>
  )
}
