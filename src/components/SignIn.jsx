import { useEffect, useRef } from 'react'
import { isGisReady, renderSignInButton } from '../auth'

export default function SignIn() {
  const btnRef = useRef(null)

  useEffect(() => {
    // Wait for GIS to be initialized (by initAuth in App.jsx), then render button
    const interval = setInterval(() => {
      if (isGisReady() && btnRef.current) {
        clearInterval(interval)
        renderSignInButton(btnRef.current)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Finance Tracker</h1>
      <p className="text-text-secondary text-sm mb-8">Sign in with Google to continue</p>
      <div ref={btnRef} />
    </div>
  )
}
