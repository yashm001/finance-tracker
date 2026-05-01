import { getIdToken } from './auth';

const STORAGE_KEY = 'finance_tracker_api_url';
const CACHE_KEY = 'finance_tracker_cache';
const CACHE_ENABLED = false; // Set to true to re-enable localStorage caching of transaction data

export function getApiUrl() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setApiUrl(url) {
  localStorage.setItem(STORAGE_KEY, url.trim());
}

// ─── localStorage Cache ───

export function getCachedData() {
  if (!CACHE_ENABLED) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedData(data) {
  if (!CACHE_ENABLED) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      transactions: data.transactions,
      summary: data.summary,
      dropdownOptions: data.dropdownOptions,
      ts: Date.now(),
    }));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function clearCachedData() {
  localStorage.removeItem(CACHE_KEY);
}

// ─── Auth error ───

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── API helpers ───

async function apiGet(params, { timeout = 20000 } = {}) {
  const baseUrl = getApiUrl();
  if (!baseUrl) throw new Error('API URL not configured');

  const url = new URL(baseUrl);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v);
  });

  // Attach ID token as query parameter
  const idToken = getIdToken();
  if (idToken) url.searchParams.set('id_token', idToken);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url.toString(), { redirect: 'follow', signal: controller.signal });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    if (data.status === 'error') {
      if (data.code === 401) throw new AuthError(data.message || 'Session expired');
      throw new Error(data.message || 'API error');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function apiPost(body) {
  const baseUrl = getApiUrl();
  if (!baseUrl) throw new Error('API URL not configured');

  // Attach ID token to request body
  const idToken = getIdToken();
  const payload = idToken ? { ...body, id_token: idToken } : body;

  const res = await fetch(baseUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (data.status === 'error') {
    if (data.code === 401) throw new AuthError(data.message || 'Session expired');
    throw new Error(data.message || 'API error');
  }
  return data;
}

// ─── Combined init endpoint (single call) ───

export async function fetchInit(fy) {
  return apiGet({ action: 'init', fy }, { timeout: 8000 });
}

export async function pingApi() {
  return apiGet({ action: 'ping' });
}

export async function fetchTransactions(fy, month) {
  return apiGet({ action: 'transactions', fy, month });
}

export async function fetchSummary(fy) {
  return apiGet({ action: 'summary', fy });
}

export async function fetchDropdownOptions() {
  return apiGet({ action: 'dropdown_options' });
}

export async function addTransaction({ amount, name, category, mode, subcategory, description, date }) {
  return apiPost({
    action: 'quick_add',
    amount: Number(amount),
    name,
    category,
    mode,
    subcategory,
    description: description || undefined,
    date: date || undefined,
  });
}

export async function editTransaction(row, fields) {
  return apiPost({ action: 'edit', row, ...fields });
}

export async function deleteTransaction(row) {
  return apiPost({ action: 'delete', row });
}
