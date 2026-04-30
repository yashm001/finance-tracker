import { LayoutDashboard, Receipt, Plus, Landmark, Settings } from 'lucide-react'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'History', icon: Receipt },
  { id: 'add', label: 'Add', icon: Plus, isFab: true },
  { id: 'tax', label: 'Tax', icon: Landmark },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function BottomNav({ activeView, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur-md border-t border-card-border z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeView === tab.id

          if (tab.isFab) {
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className="flex items-center justify-center w-13 h-13 -mt-6 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                <Icon size={24} strokeWidth={2.5} />
              </button>
            )
          }

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-1 cursor-pointer transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
