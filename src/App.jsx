import React, { useState } from 'react'

const GameApp = React.lazy(() => import('./bughunt-game'))
const LeaderboardDisplay = React.lazy(() => import('./bughunt-leaderboard'))

export default function App() {
  const [screen, setScreen] = useState('home')

  return (
    <React.Suspense fallback={
      <div style={{ background: '#07090a', color: '#00e5ff', 
        height: '100vh', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', fontFamily: 'monospace', fontSize: 14 }}>
        Loading...
      </div>
    }>
      {screen === 'game' && <GameApp />}
      {screen === 'leaderboard' && <LeaderboardDisplay />}
      {screen === 'home' && (
        <div style={{
          padding: 40, fontFamily: 'monospace', background: '#07090a',
          color: '#00e5ff', minHeight: '100vh', display: 'flex',
          flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 32
        }}>
          <div style={{ fontSize: 54, letterSpacing: 8, fontWeight: 900 }}>
            PAYMENT AQA BUG HUNT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 280 }}>
            <button onClick={() => setScreen('game')} style={{
              background: 'transparent', border: '1px solid #00e5ff',
              color: '#00e5ff', fontFamily: 'monospace', fontSize: 13,
              letterSpacing: 3, padding: '14px 24px', cursor: 'pointer',
              textTransform: 'uppercase'
            }}>
              → Game App
            </button>
            <button onClick={() => setScreen('leaderboard')} style={{
              background: 'transparent', border: '1px solid #00ff9d',
              color: '#00ff9d', fontFamily: 'monospace', fontSize: 13,
              letterSpacing: 3, padding: '14px 24px', cursor: 'pointer',
              textTransform: 'uppercase'
            }}>
              → Leaderboard
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#3a5a65', letterSpacing: 2 }}>
            Open Leaderboard in a second browser tab for the live display
          </div>
        </div>
      )}
    </React.Suspense>
  )
}
