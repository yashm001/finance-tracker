import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, destructive = true }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-[398px] mx-4 mb-4 bg-surface rounded-2xl border border-card-border shadow-xl p-5 animate-[slideUp_0.2s_ease-out]">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-text-muted hover:text-foreground cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            destructive ? 'bg-destructive/10' : 'bg-primary/10'
          }`}>
            <AlertTriangle size={20} className={destructive ? 'text-destructive' : 'text-primary'} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-sm text-text-secondary mt-1">{message}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-muted border border-card-border rounded-xl text-sm font-semibold text-foreground cursor-pointer transition-colors hover:bg-card-border"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold text-on-primary cursor-pointer transition-colors hover:opacity-90 ${
              destructive ? 'bg-destructive' : 'bg-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
