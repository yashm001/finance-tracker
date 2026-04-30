import { useState } from 'react'
import { addTransaction } from '../api'
import { formatINR, amountToWords } from '../utils'
import { Loader2, Send } from 'lucide-react'

// Fallback defaults (only used if API fetch fails — source of truth is the Lists sheet)
const DEFAULT_MODES = ['Infinia', 'Atlas', 'AmazonPay', 'SBI ELITE', 'Biz Black', 'UPI', 'Cash', 'NetBanking', 'Swiggy Money', 'Amazon Shopping', 'Platform Wallet']
const DEFAULT_CATEGORIES = ['Personal', 'Work', 'Tax']
const DEFAULT_SUBCATEGORIES = [
  'Food & Dining', 'Groceries', 'Transport', 'Shopping', 'Health & Wellness',
  'Entertainment', 'Travel', 'Bills & Utilities', 'Rent', 'Subscriptions',
  'Investment', 'Trading', 'Gifts', 'Education', 'Wardrobe', 'Equipments',
  'Insurance', 'IncomeTax', 'GST', 'Others',
]

function ChipGroup({ label, options, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-text-secondary mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
              value === opt
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-muted text-text-secondary hover:text-foreground border border-card-border'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AddTransaction({ dropdownOptions, onRefresh, showToast }) {
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [date, setDate] = useState(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [category, setCategory] = useState('Personal')
  const [mode, setMode] = useState('UPI')
  const [subcategory, setSubcategory] = useState('Food & Dining')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const modes = dropdownOptions?.modes || DEFAULT_MODES
  const categories = dropdownOptions?.categories || DEFAULT_CATEGORIES
  const subcategories = dropdownOptions?.subcategories || DEFAULT_SUBCATEGORIES

  const inputClass = 'w-full px-4 py-3 bg-surface border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors'

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!amount || Number(amount) <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }
    if (!name.trim()) {
      showToast('Please enter a name', 'error')
      return
    }

    setSubmitting(true)
    try {
      await addTransaction({
        amount: Number(amount),
        name: name.trim(),
        category,
        mode,
        subcategory,
        description: description.trim() || undefined,
        date,
      })
      const addedName = name.trim()
      const addedAmount = Number(amount)
      showToast(`Added: ${addedName} — ${formatINR(addedAmount)}`)
      setAmount('')
      setName('')
      setDescription('')
      onRefresh()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 pb-24">
      <h2 className="text-xl font-bold tracking-tight mb-1">Add Transaction</h2>
      <p className="text-text-secondary text-xs font-medium mb-5">Log a new expense</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-mono text-base">
              ₹
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`${inputClass} pl-9 font-mono text-2xl font-bold py-4`}
            />
          </div>
          {amount && Number(amount) > 0 && (
            <p className="text-[11px] text-text-muted mt-1.5">₹{amountToWords(Number(amount))}</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Swiggy, Amazon, Uber"
            className={inputClass}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <ChipGroup label="Category" options={categories} value={category} onChange={setCategory} />
        <ChipGroup label="Payment Mode" options={modes} value={mode} onChange={setMode} />
        <ChipGroup label="Sub-category" options={subcategories} value={subcategory} onChange={setSubcategory} />

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">
            Description <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a note..."
            className={inputClass}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-primary text-on-primary rounded-2xl text-sm font-bold cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-primary/15"
        >
          {submitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
          {submitting ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  )
}
