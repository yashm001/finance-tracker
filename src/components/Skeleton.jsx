export function Bone({ className = '' }) {
  return (
    <div className={`bg-muted rounded-lg animate-pulse ${className}`} />
  )
}

export function SkeletonCard({ className = '', children }) {
  return (
    <div className={`bg-surface rounded-2xl border border-card-border p-4 ${className}`}>
      {children}
    </div>
  )
}
