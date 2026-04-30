export default function KPICard({ label, value, subValue, icon, color = 'default' }) {
  const colors = {
    default: 'text-foreground',
    green: 'text-accent',
    blue: 'text-secondary',
    primary: 'text-primary',
  }
  const textColor = colors[color] || colors.default
  const valueStr = String(value)
  const fontSize = valueStr.length > 10 ? 'text-sm' : valueStr.length > 7 ? 'text-base' : 'text-lg'

  return (
    <div className="bg-kpi-bg border border-kpi-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1.5">
        {icon && <span className="text-text-muted">{icon}</span>}
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className={`font-mono ${fontSize} font-bold ${textColor} leading-tight`}>
        {value}
      </p>
      {subValue && (
        <p className="text-[10px] text-text-muted mt-1">{subValue}</p>
      )}
    </div>
  )
}
