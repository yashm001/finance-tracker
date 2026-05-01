import { useState, useEffect, useCallback } from 'react'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import Settings from './components/Settings'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import AddTransaction from './components/AddTransaction'
import TaxBreakdown from './components/TaxBreakdown'
import SignIn from './components/SignIn'
import { getApiUrl, AuthError, fetchInit, fetchTransactions, fetchSummary, fetchDropdownOptions, getCachedData, setCachedData } from './api'
import { isAuthenticated, initAuth, signOut } from './auth'
import { getCurrentFY, getCurrentMonth } from './utils'

function App() {
  const [authed, setAuthed] = useState(isAuthenticated())
  const [activeView, setActiveView] = useState(() => {
    if (!isAuthenticated()) return 'signin'
    if (!getApiUrl()) return 'settings'
    return 'dashboard'
  })
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [dropdownOptions, setDropdownOptions] = useState(null)
  const [selectedFY] = useState(getCurrentFY())
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const clearToast = useCallback(() => {
    setToast(null)
  }, [])

  // Initialize Google auth
  useEffect(() => {
    initAuth((isSignedIn) => {
      setAuthed(isSignedIn)
      if (isSignedIn && activeView === 'signin') {
        setActiveView(getApiUrl() ? 'dashboard' : 'settings')
      }
      if (!isSignedIn) {
        setActiveView('signin')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply data from API or cache to state
  const applyData = useCallback((data) => {
    setTransactions(data.transactions || [])
    setSummary(data.summary || null)
    setDropdownOptions(data.dropdownOptions || null)
  }, [])

  // Try combined init endpoint, fall back to 3 parallel calls
  const fetchData = useCallback(async (fy) => {
    try {
      console.log('[init] calling fetchInit...')
      const data = await fetchInit(fy)
      console.log('[init] success:', Object.keys(data))
      return data
    } catch (err) {
      console.warn('[init] failed, falling back to parallel calls:', err.message)
      // Fallback: init endpoint unavailable or timed out
      const [txRes, sumRes, ddRes] = await Promise.all([
        fetchTransactions(),
        fetchSummary(fy),
        fetchDropdownOptions(),
      ])
      console.log('[fallback] success')
      return {
        transactions: txRes.transactions || [],
        summary: sumRes,
        dropdownOptions: ddRes,
      }
    }
  }, [])

  // Fetch fresh data
  const loadData = useCallback(async () => {
    const apiUrl = getApiUrl()
    if (!apiUrl) return

    setLoading(true)
    try {
      const data = await fetchData(selectedFY)
      applyData(data)
      setCachedData(data)
    } catch (err) {
      if (err instanceof AuthError) {
        showToast('Session expired. Please sign in again.', 'error')
        setAuthed(false)
        setActiveView('signin')
      } else {
        showToast(err.message, 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedFY, showToast, applyData, fetchData])

  // On mount: hydrate from cache instantly, then fetch fresh in background
  useEffect(() => {
    if (!getApiUrl()) return

    // 1. Hydrate from cache (instant render)
    const cached = getCachedData()
    if (cached) {
      applyData(cached)
    }

    // 2. Fetch fresh data in background (only show skeletons if no cache)
    let cancelled = false
    if (!cached) setLoading(true)
    fetchData(selectedFY)
      .then((data) => {
        if (!cancelled) {
          applyData(data)
          setCachedData(data)
        }
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof AuthError) {
          showToast('Session expired. Please sign in again.', 'error')
          setAuthed(false)
          setActiveView('signin')
        } else {
          showToast(err.message, 'error')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedFY, showToast, applyData, fetchData])

  const handleNavigate = (view) => {
    setActiveView(view)
  }

  const handleSignOut = useCallback(() => {
    signOut()
    setAuthed(false)
    setActiveView('signin')
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'signin':
        return <SignIn />
      case 'settings':
        return (
          <Settings
            onSave={() => {
              showToast('Settings saved')
              loadData()
              setActiveView('dashboard')
            }}
            onClearCache={loadData}
            onSignOut={handleSignOut}
            showToast={showToast}
          />
        )
      case 'dashboard':
        return (
          <Dashboard
            transactions={transactions}
            summary={summary}
            selectedFY={selectedFY}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            onRefresh={loadData}
            loading={loading}
          />
        )
      case 'transactions':
        return (
          <Transactions
            transactions={transactions}
            dropdownOptions={dropdownOptions}
            onRefresh={loadData}
            showToast={showToast}
            loading={loading}
          />
        )
      case 'tax':
        return (
          <TaxBreakdown
            transactions={transactions}
            selectedFY={selectedFY}
            loading={loading}
          />
        )
      case 'add':
        return (
          <AddTransaction
            dropdownOptions={dropdownOptions}
            onRefresh={loadData}
            showToast={showToast}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      <main key={activeView} className="view-transition">
        {renderView()}
      </main>
      {activeView !== 'signin' && <BottomNav activeView={activeView} onNavigate={handleNavigate} />}
    </>
  )
}

export default App
