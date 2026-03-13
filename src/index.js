import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Shared storage shim — syncs game and leaderboard
const store = {}
window.storage = {
  get: async (key) => {
    const val = store[key]
    return val !== undefined ? { key, value: val } : null
  },
  set: async (key, value) => {
    store[key] = value
    return { key, value }
  },
  delete: async (key) => { delete store[key] },
  list: async (prefix) => ({
    keys: Object.keys(store).filter(k => !prefix || k.startsWith(prefix))
  }),
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)