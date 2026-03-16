/**
 * BUG HUNT — LIVE LEADERBOARD DISPLAY
 * Mobile-first, glassmorphism aesthetic
 * Firebase REST + SSE for real-time updates
 */

import React, { useState, useEffect, useRef } from "react";

const FIREBASE_URL = "https://bughunt-e86fb-default-rtdb.europe-west1.firebasedatabase.app";
const MAX_PTS = 700;

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  return Math.floor(diff / 3600) + "h ago";
}

const S = [
  "@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');",
  "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
  ":root {",
  "  --bg: #060810;",
  "  --glass: rgba(255,255,255,0.03);",
  "  --glass2: rgba(255,255,255,0.06);",
  "  --border: rgba(255,255,255,0.07);",
  "  --border2: rgba(255,255,255,0.12);",
  "  --cyan: #22d3ee;",
  "  --violet: #a78bfa;",
  "  --green: #34d399;",
  "  --amber: #fbbf24;",
  "  --rose: #fb7185;",
  "  --gold: #f59e0b;",
  "  --silver: #94a3b8;",
  "  --bronze: #b45309;",
  "  --text: #e2e8f0;",
  "  --muted: #64748b;",
  "  --sans: 'Syne', sans-serif;",
  "  --mono: 'JetBrains Mono', monospace;",
  "}",
  "html, body { height: 100%; }",
  "body { background: var(--bg); color: var(--text); font-family: var(--sans); overflow: hidden; }",

  ".bg-mesh { position: fixed; inset: 0; pointer-events: none;",
  "  background: radial-gradient(ellipse 70% 50% at 15% 0%, rgba(34,211,238,0.07) 0%, transparent 60%),",
  "              radial-gradient(ellipse 50% 40% at 85% 100%, rgba(167,139,250,0.07) 0%, transparent 60%); }",
  ".grain { position: fixed; inset: 0; pointer-events: none; opacity: 0.02;",
  "  background-image: url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\"); background-size: 180px; }",

  ".page { height: 100vh; height: 100dvh; display: flex; flex-direction: column; padding: 0 24px; position: relative; z-index: 1; max-width: 900px; margin: 0 auto; }",

  /* Header */
  ".header { display: flex; align-items: center; justify-content: space-between; padding: 20px 0 16px; flex-shrink: 0; }",
  ".header-left { display: flex; flex-direction: column; gap: 4px; }",
  ".header-title { font-size: clamp(28px, 6vw, 52px); font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, var(--cyan) 0%, var(--violet) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; }",
  ".header-sub { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; }",
  ".live-badge { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }",
  ".live-pill { display: flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); font-size: 11px; font-weight: 700; color: var(--green); letter-spacing: 1px; text-transform: uppercase; }",
  ".live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: ldot 1.5s infinite; }",
  "@keyframes ldot { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); } 60% { box-shadow: 0 0 0 6px rgba(52,211,153,0); } }",
  ".sync-time { font-size: 10px; color: var(--muted); }",

  /* Column headers */
  ".col-headers { display: grid; grid-template-columns: 64px 1fr 100px 80px 80px; gap: 8px; padding: 0 16px 8px; flex-shrink: 0; border-bottom: 1px solid var(--border); margin-bottom: 10px; }",
  ".col-h { font-size: 9px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; }",
  ".col-h.right { text-align: right; }",

  /* Board */
  ".board { flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 7px; padding-bottom: 16px; }",
  ".board::-webkit-scrollbar { width: 4px; }",
  ".board::-webkit-scrollbar-track { background: transparent; }",
  ".board::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }",

  /* Row */
  ".lb-row { display: grid; grid-template-columns: 64px 1fr 100px 80px 80px; gap: 8px; align-items: center; padding: 14px 16px; border-radius: 14px; border: 1px solid var(--border); background: var(--glass); backdrop-filter: blur(12px); position: relative; overflow: hidden; transition: all 0.3s; animation: rowIn 0.4s ease both; }",
  "@keyframes rowIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }",
  ".lb-row.flash { animation: rowFlash 0.7s ease; }",
  "@keyframes rowFlash { 0%,100% { background: var(--glass); } 40% { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.3); } }",
  ".lb-row.rank-1 { border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.04); }",
  ".lb-row.rank-2 { border-color: rgba(148,163,184,0.2); }",
  ".lb-row.rank-3 { border-color: rgba(180,83,9,0.2); }",

  /* Rank */
  ".rank-col { display: flex; align-items: center; justify-content: center; }",
  ".rank-num { font-family: var(--mono); font-size: 18px; font-weight: 700; color: var(--muted); }",
  ".rank-medal { font-size: 24px; line-height: 1; }",

  /* Name */
  ".name-col { min-width: 0; }",
  ".player-name { font-size: clamp(13px, 2vw, 17px); font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }",
  ".player-since { font-size: 10px; color: var(--muted); }",

  /* Score */
  ".score-col { text-align: right; }",
  ".score-val { font-family: var(--mono); font-size: clamp(20px, 3vw, 30px); font-weight: 700; line-height: 1; }",
  ".score-val.rank-1 { color: var(--gold); filter: drop-shadow(0 0 12px rgba(245,158,11,0.4)); }",
  ".score-val.rank-2 { color: var(--silver); }",
  ".score-val.rank-3 { color: #cd7c3a; }",
  ".score-val.other { color: var(--cyan); }",

  /* Stats */
  ".stat-col { text-align: right; font-family: var(--mono); font-size: 15px; font-weight: 600; color: var(--text); }",
  ".stat-col.dim { color: var(--muted); }",

  /* Progress line */
  ".row-progress { position: absolute; bottom: 0; left: 0; height: 2px; background: linear-gradient(90deg, var(--cyan), var(--violet)); transition: width 1s cubic-bezier(0.34,1.56,0.64,1); opacity: 0.35; }",
  ".lb-row.rank-1 .row-progress { opacity: 0.7; background: linear-gradient(90deg, var(--gold), var(--amber)); }",

  /* Empty */
  ".empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--muted); }",
  ".empty-icon { font-size: 52px; animation: float 3s ease-in-out infinite; }",
  "@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }",
  ".empty-txt { font-size: 12px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; }",

  /* Footer */
  ".footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 0 16px; border-top: 1px solid var(--border); flex-shrink: 0; }",
  ".footer-left { font-size: 10px; font-weight: 600; color: var(--muted); letter-spacing: 1px; }",
  ".footer-right { font-size: 10px; color: var(--muted); }",

  /* Mobile tweaks */
  "@media (max-width: 600px) {",
  "  .page { padding: 0 12px; }",
  "  .col-headers { grid-template-columns: 48px 1fr 80px; }",
  "  .col-headers .col-h:nth-child(4), .col-headers .col-h:nth-child(5) { display: none; }",
  "  .lb-row { grid-template-columns: 48px 1fr 80px; padding: 12px 12px; }",
  "  .lb-row .stat-col { display: none; }",
  "  .score-val { font-size: 20px; }",
  "  .header-title { font-size: 28px; }",
  "}",
].join("\n");

export default function LeaderboardDisplay() {
  const [board, setBoard] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [flashIds, setFlashIds] = useState(new Set());
  const prevScores = useRef({});
  const esRef = useRef(null);
  const pollRef = useRef(null);

  function sortPlayers(players) {
    return [...players].sort(
      (a, b) => b.score - a.score || b.correctAnswers - a.correctAnswers
    );
  }

  function applyUpdate(data) {
    if (!data || typeof data !== "object") return;
    const players = Object.values(data).filter(Boolean);
    if (!players.length) { setBoard([]); return; }
    const sorted = sortPlayers(players);

    const newFlash = new Set();
    sorted.forEach((p) => {
      if (prevScores.current[p.id] !== undefined && prevScores.current[p.id] !== p.score) {
        newFlash.add(p.id);
      }
      prevScores.current[p.id] = p.score;
    });

    if (newFlash.size > 0) {
      setFlashIds(newFlash);
      setTimeout(() => setFlashIds(new Set()), 900);
    }

    setBoard(sorted);
    setLastUpdate(new Date());
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(FIREBASE_URL + "/players.json");
        const data = await res.json();
        if (data) applyUpdate(data);
      } catch {}
    }, 3000);
  }

  useEffect(() => {
    fetch(FIREBASE_URL + "/players.json")
      .then((r) => r.json())
      .then((data) => { if (data) applyUpdate(data); })
      .catch(console.error);

    try {
      const es = new EventSource(FIREBASE_URL + "/players.json?accept=text/event-stream");
      esRef.current = es;

      es.addEventListener("put", (e) => {
        try { const p = JSON.parse(e.data); if (p && p.data) applyUpdate(p.data); } catch {}
      });
      es.addEventListener("patch", (e) => {
        try {
          const p = JSON.parse(e.data);
          if (p && p.data) {
            setBoard((prev) => {
              const map = {};
              prev.forEach((pl) => { map[pl.id] = pl; });
              Object.values(p.data).forEach((pl) => { if (pl && pl.id) map[pl.id] = pl; });
              return sortPlayers(Object.values(map));
            });
            setLastUpdate(new Date());
          }
        } catch {}
      });
      es.onerror = () => { es.close(); startPolling(); };
    } catch { startPolling(); }

    return () => {
      if (esRef.current) esRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const rankClass = (i) => i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "other";
  const medal = (i) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

  return (
    <React.Fragment>
      <style>{S}</style>
      <div className="bg-mesh" />
      <div className="grain" />
      <div className="page">

        <header className="header">
          <div className="header-left">
            <div className="header-title">LEADERBOARD</div>
            <div className="header-sub">Bug Hunt — Live Rankings</div>
          </div>
          <div className="live-badge">
            <div className="live-pill">
              <div className="live-dot" />
              Real-time
            </div>
            <div className="sync-time">
              {lastUpdate ? "Updated " + lastUpdate.toLocaleTimeString() : "Connecting..."}
            </div>
          </div>
        </header>

        <div className="col-headers">
          <div className="col-h" style={{ textAlign: "center" }}>Rank</div>
          <div className="col-h">Hunter</div>
          <div className="col-h right">Score</div>
          <div className="col-h right">Solved</div>
          <div className="col-h right">Tries</div>
        </div>

        <div className="board">
          {board.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🐛</div>
              <div className="empty-txt">Waiting for hunters...</div>
            </div>
          ) : (
            board.slice(0, 6).map((p, i) => {
              const rc = rankClass(i);
              const pct = Math.min(100, (p.score / MAX_PTS) * 100);
              return (
                <div
                  key={p.id}
                  className={"lb-row " + rc + (flashIds.has(p.id) ? " flash" : "")}
                  style={{ animationDelay: i * 0.04 + "s" }}
                >
                  <div className="rank-col">
                    {medal(i)
                      ? <div className="rank-medal">{medal(i)}</div>
                      : <div className="rank-num">#{i + 1}</div>
                    }
                  </div>

                  <div className="name-col">
                    <div className="player-name">{p.name}</div>
                    <div className="player-since">{timeAgo(p.joinedAt)}</div>
                  </div>

                  <div className="score-col">
                    <div className={"score-val " + rc}>{p.score}</div>
                  </div>

                  <div className="stat-col">{p.correctAnswers}</div>
                  <div className="stat-col dim">{p.attempts}</div>

                  <div className="row-progress" style={{ width: pct + "%" }} />
                </div>
              );
            })
          )}
        </div>

        <footer className="footer">
          <div className="footer-left">
            Bug Hunt &nbsp;·&nbsp; {board.length} hunter{board.length !== 1 ? "s" : ""}
          </div>
          <div className="footer-right">Firebase Realtime</div>
        </footer>
      </div>
    </React.Fragment>
  );
}
