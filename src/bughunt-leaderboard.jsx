/**
 * BUG HUNT — LIVE LEADERBOARD DISPLAY
 * Firebase Realtime Database via REST + SSE (no SDK needed).
 * Open this on a second screen / projector / TV.
 */

 import React, { useState, useEffect, useRef } from "react";

 // ─── Firebase ─────────────────────────────────────────────────────────────────
 const FIREBASE_URL = "https://bughunt-e86fb-default-rtdb.europe-west1.firebasedatabase.app";
 
 const MAX_PTS = 700; // sum of all question points — update if you add questions
 
 function timeAgo(iso) {
   const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
   if (diff < 60) return `${diff}s ago`;
   if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
   return `${Math.floor(diff / 3600)}h ago`;
 }
 
 const S = `
 @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap');
 *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
 :root{
   --bg:#05070a;--surface:#090d10;--border:#152028;
   --gold:#ffd700;--silver:#c0c8d0;--bronze:#cd7f32;
   --accent:#00e5ff;--good:#00ff9d;
   --text:#a8c4cc;--dim:#3a5a65;--bright:#e0f4f8;
   --display:'Bebas Neue',cursive;--mono:'Space Mono',monospace;
 }
 html,body{height:100%;background:var(--bg);color:var(--text);font-family:var(--mono);overflow:hidden}
 .ambient{position:fixed;inset:0;pointer-events:none;
   background:
     radial-gradient(ellipse 60% 40% at 50% -10%,rgba(0,229,255,.06) 0%,transparent 70%),
     radial-gradient(ellipse 40% 30% at 80% 110%,rgba(0,255,157,.04) 0%,transparent 60%)}
 .grid-bg{position:fixed;inset:0;pointer-events:none;opacity:.04;
   background-image:linear-gradient(var(--accent) 1px,transparent 1px),
     linear-gradient(90deg,var(--accent) 1px,transparent 1px);
   background-size:60px 60px}
 .scanlines{position:fixed;inset:0;pointer-events:none;z-index:10;
   background:repeating-linear-gradient(0deg,transparent,transparent 3px,
     rgba(0,0,0,.06) 3px,rgba(0,0,0,.06) 6px)}
 .page{height:100vh;display:flex;flex-direction:column;padding:28px 40px;position:relative;z-index:1}
 .hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;flex-shrink:0}
 .title{font-family:var(--display);font-size:clamp(48px,8vw,88px);letter-spacing:8px;
   color:var(--accent);line-height:1;
   text-shadow:0 0 40px rgba(0,229,255,.4),0 0 80px rgba(0,229,255,.15)}
 .subtitle{font-size:10px;letter-spacing:6px;color:var(--dim);margin-top:6px;text-transform:uppercase}
 .live-badge{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:3px;
   color:var(--good);text-transform:uppercase;padding:8px 16px;
   border:1px solid rgba(0,255,157,.25);background:rgba(0,255,157,.04);white-space:nowrap}
 .live-dot{width:8px;height:8px;border-radius:50%;background:var(--good);
   animation:ldot 1.5s infinite;flex-shrink:0}
 @keyframes ldot{0%,100%{box-shadow:0 0 0 0 rgba(0,255,157,.5)}70%{box-shadow:0 0 0 8px rgba(0,255,157,0)}}
 .board{flex:1;overflow:hidden;display:flex;flex-direction:column}
 .col-hdr{display:grid;grid-template-columns:80px 1fr 160px 120px 120px;
   padding:8px 24px;border-bottom:1px solid var(--border);margin-bottom:8px}
 .ch{font-size:9px;letter-spacing:3px;color:var(--dim);text-transform:uppercase}
 .ch.right{text-align:right}
 .row{display:grid;grid-template-columns:80px 1fr 160px 120px 120px;
   padding:16px 24px;border:1px solid var(--border);background:var(--surface);
   margin-bottom:6px;position:relative;overflow:hidden;
   transition:background .4s ease;animation:rowIn .5s ease both}
 .row::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}
 .row.r1::before{background:var(--gold)}
 .row.r2::before{background:var(--silver)}
 .row.r3::before{background:var(--bronze)}
 .row.flash{animation:flash .7s ease}
 @keyframes rowIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
 @keyframes flash{0%,100%{background:var(--surface)}50%{background:rgba(0,255,157,.14)}}
 .rank-num{font-family:var(--display);font-size:28px;letter-spacing:2px;display:flex;align-items:center}
 .rank-num.r1{color:var(--gold)}
 .rank-num.r2{color:var(--silver)}
 .rank-num.r3{color:var(--bronze)}
 .rank-num.other{color:var(--dim)}
 .name-cell{display:flex;flex-direction:column;justify-content:center;overflow:hidden}
 .pname{font-size:clamp(14px,2vw,20px);color:var(--bright);letter-spacing:1px;
   font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .psince{font-size:9px;color:var(--dim);margin-top:3px;letter-spacing:1px}
 .score-cell{display:flex;align-items:center;justify-content:flex-end}
 .score-val{font-family:var(--display);font-size:clamp(28px,4vw,44px);
   letter-spacing:3px;color:var(--accent);line-height:1;transition:color .3s}
 .score-val.r1{color:var(--gold);text-shadow:0 0 20px rgba(255,215,0,.4)}
 .score-val.r2{color:var(--silver)}
 .score-val.r3{color:var(--bronze)}
 .num-cell{display:flex;align-items:center;justify-content:flex-end;font-size:18px}
 .num-cell.dimmed{color:var(--dim)}
 .progress-bar{position:absolute;bottom:0;left:0;height:2px;
   background:linear-gradient(90deg,var(--accent),var(--good));
   transition:width .8s ease;opacity:.25}
 .row.r1 .progress-bar{opacity:.6}
 .empty{flex:1;display:flex;flex-direction:column;align-items:center;
   justify-content:center;gap:16px;color:var(--dim)}
 .empty-icon{font-size:48px;opacity:.3}
 .empty-txt{font-size:11px;letter-spacing:4px;text-transform:uppercase}
 .footer{display:flex;justify-content:space-between;align-items:center;
   margin-top:20px;padding-top:16px;border-top:1px solid var(--border);flex-shrink:0}
 .footer-txt{font-size:9px;letter-spacing:2px;color:var(--dim)}
 .last-update{font-size:9px;letter-spacing:2px;color:var(--dim)}
 `;
 
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
     if (!players.length) return;
     const sorted = sortPlayers(players);
 
     const newFlash = new Set();
     sorted.forEach((p) => {
       if (
         prevScores.current[p.id] !== undefined &&
         prevScores.current[p.id] !== p.score
       ) newFlash.add(p.id);
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
     // Fallback: poll every 3s if SSE is not supported
     pollRef.current = setInterval(async () => {
       try {
         const res = await fetch(`${FIREBASE_URL}/players.json`);
         const data = await res.json();
         if (data) applyUpdate(data);
       } catch {}
     }, 3000);
   }
 
   useEffect(() => {
     // Initial fetch
     fetch(`${FIREBASE_URL}/players.json`)
       .then((r) => r.json())
       .then((data) => { if (data) applyUpdate(data); })
       .catch(console.error);
 
     // Real-time via SSE
     try {
       const es = new EventSource(
         `${FIREBASE_URL}/players.json?accept=text/event-stream`
       );
       esRef.current = es;
 
       es.addEventListener("put", (e) => {
         try {
           const parsed = JSON.parse(e.data);
           if (parsed?.data) applyUpdate(parsed.data);
         } catch {}
       });
 
       es.addEventListener("patch", (e) => {
         try {
           const parsed = JSON.parse(e.data);
           if (parsed?.data) {
             // Merge changed players into current board
             setBoard((prev) => {
               const map = {};
               prev.forEach((p) => { map[p.id] = p; });
               Object.values(parsed.data).forEach((p) => {
                 if (p?.id) map[p.id] = p;
               });
               return sortPlayers(Object.values(map));
             });
             setLastUpdate(new Date());
           }
         } catch {}
       });
 
       es.onerror = () => {
         es.close();
         startPolling(); // fall back to polling
       };
     } catch {
       startPolling(); // SSE not available, use polling
     }
 
     return () => {
       if (esRef.current) esRef.current.close();
       if (pollRef.current) clearInterval(pollRef.current);
     };
   }, []);
 
   const rankClass = (i) => i === 0 ? "r1" : i === 1 ? "r2" : i === 2 ? "r3" : "other";
   const crown = (i) => i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
 
   return (
     <>
       <style>{S}</style>
       <div className="ambient" />
       <div className="grid-bg" />
       <div className="scanlines" />
       <div className="page">
         <header className="hdr">
           <div>
             <div className="title">LEADERBOARD</div>
             <div className="subtitle">Bug Hunt · Live Rankings</div>
           </div>
           <div className="live-badge">
             <div className="live-dot" />
             Real-time · Firebase
           </div>
         </header>
 
         <div className="col-hdr">
           <div className="ch">Rank</div>
           <div className="ch">Hunter</div>
           <div className="ch right">Score</div>
           <div className="ch right">Solved</div>
           <div className="ch right">Attempts</div>
         </div>
 
         <div className="board">
           {board.length === 0 ? (
             <div className="empty">
               <div className="empty-icon">🐛</div>
               <div className="empty-txt">Waiting for hunters to register...</div>
             </div>
           ) : (
             board.map((p, i) => {
               const rc = rankClass(i);
               const pct = Math.min(100, (p.score / MAX_PTS) * 100);
               return (
                 <div
                   key={p.id}
                   className={`row ${rc} ${flashIds.has(p.id) ? "flash" : ""}`}
                   style={{ animationDelay: `${i * 0.05}s` }}
                 >
                   <div className={`rank-num ${rc}`}>
                     {crown(i) ?? `#${i + 1}`}
                   </div>
                   <div className="name-cell">
                     <div className="pname">{p.name}</div>
                     <div className="psince">joined {timeAgo(p.joinedAt)}</div>
                   </div>
                   <div className="score-cell">
                     <div className={`score-val ${rc}`}>{p.score}</div>
                   </div>
                   <div className="num-cell">{p.correctAnswers}</div>
                   <div className="num-cell dimmed">{p.attempts}</div>
                   <div className="progress-bar" style={{ width: `${pct}%` }} />
                 </div>
               );
             })
           )}
         </div>
 
         <footer className="footer">
           <div className="footer-txt">
             BUG HUNT · {board.length} hunter{board.length !== 1 ? "s" : ""} registered
           </div>
           <div className="last-update">
             {lastUpdate
               ? `Updated: ${lastUpdate.toLocaleTimeString()}`
               : "Connecting to Firebase..."}
           </div>
         </footer>
       </div>
     </>
   );
 }

 