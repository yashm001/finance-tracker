/**
 * A tiny SVG sparkline showing cumulative daily spending for a month.
 * No axes or labels — just a line showing the spending trajectory.
 */
export default function Sparkline({ transactions, selectedMonth, selectedYear }) {
  if (!transactions || transactions.length === 0) return null

  // Get days in the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()

  // Bucket spending by day of month
  const dailySpend = new Array(daysInMonth).fill(0)
  transactions.forEach((t) => {
    const d = new Date(t.date)
    const day = d.getDate()
    if (day >= 1 && day <= daysInMonth) {
      dailySpend[day - 1] += Number(t.amount)
    }
  })

  // Build cumulative totals
  const cumulative = []
  let running = 0
  for (let i = 0; i < daysInMonth; i++) {
    running += dailySpend[i]
    cumulative.push(running)
  }

  const maxVal = Math.max(...cumulative, 1)

  // SVG dimensions
  const width = 300
  const height = 40
  const padY = 4

  // Build points
  const points = cumulative.map((val, i) => {
    const x = (i / (daysInMonth - 1)) * width
    const y = padY + (height - 2 * padY) * (1 - val / maxVal)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  // Area fill: same points but close the path at the bottom
  const areaPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-10 mt-2 mb-1"
      preserveAspectRatio="none"
    >
      {/* Gradient fill under the line */}
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill="url(#sparkFill)"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
