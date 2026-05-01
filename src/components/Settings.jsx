import { useState } from 'react'
import { getApiUrl, setApiUrl, pingApi, clearCachedData } from '../api'
import { getUserEmail } from '../auth'
import { Wifi, WifiOff, Loader2, Save, RefreshCw, User, ExternalLink, LogOut } from 'lucide-react'

function getProfileName() {
  return localStorage.getItem('finance_profile_name') || ''
}

function setProfileName(name) {
  localStorage.setItem('finance_profile_name', name)
}

function getSheetUrl() {
  return localStorage.getItem('finance_sheet_url') || ''
}

function setSheetUrl(url) {
  localStorage.setItem('finance_sheet_url', url)
}

export default function Settings({ onSave, onClearCache, onSignOut, showToast }) {
  const [url, setUrl] = useState(getApiUrl())
  const [profileName, setProfileNameState] = useState(getProfileName())
  const [sheetUrl, setSheetUrlState] = useState(getSheetUrl())
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [clearing, setClearing] = useState(false)

  const inputClass = 'w-full px-4 py-3 bg-surface border border-card-border rounded-xl text-foreground text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors'

  const handleTest = async () => {
    if (!url.trim()) {
      setError('Please enter an API URL')
      return
    }
    setStatus('testing')
    setError('')
    setApiUrl(url)
    try {
      await pingApi()
      setStatus('connected')
    } catch (err) {
      setStatus('failed')
      setError(err.message)
    }
  }

  const handleSave = () => {
    if (!url.trim()) {
      setError('Please enter an API URL')
      return
    }
    setApiUrl(url)
    setProfileName(profileName.trim())
    setSheetUrl(sheetUrl.trim())
    onSave()
  }

  const handleClearCache = async () => {
    setClearing(true)
    try {
      clearCachedData()
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
      await onClearCache()
      showToast('Cache cleared & data refreshed')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="p-4 pb-24">
      <h2 className="text-xl font-bold tracking-tight mb-1">Settings</h2>
      <p className="text-text-secondary text-sm mb-6">
        Manage your profile and connection
      </p>

      <div className="space-y-6">
        {/* Profile Name */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">
            <span className="flex items-center gap-1.5">
              <User size={12} />
              Profile Name
            </span>
          </label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileNameState(e.target.value)}
            placeholder="e.g. Yash"
            className={inputClass}
          />
          <p className="text-[11px] text-text-muted mt-1.5">Shown on the Dashboard header</p>
        </div>

        {/* API URL */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">
            Apps Script URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setStatus('idle')
              setError('')
            }}
            placeholder="https://script.google.com/macros/s/..."
            className={inputClass}
          />
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Google Sheet URL */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">
            Google Sheet URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrlState(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className={`flex-1 ${inputClass}`}
            />
            {sheetUrl.trim() && (
              <a
                href={sheetUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-3 bg-surface border border-card-border rounded-xl text-primary hover:border-primary transition-colors"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-1.5">Quick link to open your sheet</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={status === 'testing'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-card-border rounded-xl text-sm font-semibold cursor-pointer transition-colors hover:border-primary disabled:opacity-50"
          >
            {status === 'testing' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wifi size={16} />
            )}
            {status === 'testing' ? 'Testing...' : 'Test'}
          </button>

          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold cursor-pointer transition-colors hover:opacity-90 shadow-sm shadow-primary/15"
          >
            <Save size={16} />
            Save
          </button>
        </div>

        {status === 'connected' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-accent/10 border border-accent/20 rounded-xl">
            <Wifi size={16} className="text-accent" />
            <span className="text-sm text-accent font-semibold">Connected</span>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <WifiOff size={16} className="text-destructive" />
            <span className="text-sm text-destructive font-semibold">Connection failed</span>
          </div>
        )}

        {/* Clear Cache & Refresh */}
        {getApiUrl() && (
          <div className="border-t border-card-border pt-6">
            <p className="text-xs font-semibold text-text-secondary mb-2">Data</p>
            <button
              onClick={handleClearCache}
              disabled={clearing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-card-border rounded-xl text-sm font-semibold text-foreground cursor-pointer transition-colors hover:border-primary disabled:opacity-50"
            >
              {clearing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              {clearing ? 'Clearing...' : 'Clear Cache & Refresh'}
            </button>
            <p className="text-[11px] text-text-muted mt-1.5">
              Clears service worker cache and re-fetches all data from the sheet
            </p>
          </div>
        )}

        {/* Account */}
        {getUserEmail() && (
          <div className="border-t border-card-border pt-6">
            <p className="text-xs font-semibold text-text-secondary mb-2">Account</p>
            <div className="flex items-center justify-between px-4 py-3 bg-surface border border-card-border rounded-xl mb-3">
              <span className="text-sm text-foreground truncate">{getUserEmail()}</span>
            </div>
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-destructive/30 rounded-xl text-sm font-semibold text-destructive cursor-pointer transition-colors hover:bg-destructive/10"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}

        {!getApiUrl() && (
          <div className="mt-6 p-4 bg-muted rounded-2xl border border-card-border">
            <h3 className="text-sm font-bold mb-2">First time setup</h3>
            <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside">
              <li>Open your Google Apps Script project</li>
              <li>Deploy as Web App (Execute as: Me, Access: Anyone)</li>
              <li>Copy the deployment URL</li>
              <li>Paste it above and tap Save</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
