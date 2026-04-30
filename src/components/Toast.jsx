import { useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-[398px] animate-[slideDown_0.3s_ease-out]">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg ${
        type === 'success'
          ? 'bg-accent border-accent text-white'
          : 'bg-destructive border-destructive text-white'
      }`}>
        {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="cursor-pointer text-white/70 hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
