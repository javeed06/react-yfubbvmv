/**
 * BUG HUNT — GAME APP
 * Firebase Realtime Database via REST API (no SDK needed).
 */

import { useState, useRef } from "react";

// ─── Firebase ─────────────────────────────────────────────────────────────────
const FIREBASE_URL = "https://bughunt-e86fb-default-rtdb.europe-west1.firebasedatabase.app";

// =============================================================================
// ⬇⬇⬇  ADD / EDIT QUESTIONS HERE  ⬇⬇⬇
// =============================================================================
const QUESTIONS_CONFIG = [
  {
    id: "q1",
    title: "The Off-By-One Offender",
    description: `A developer wrote a loop to print items 1–5:

  for (let i = 0; i <= 5; i++) {
    console.log(items[i]);
  }

The last iteration prints \`undefined\`.
What is the correct loop condition?`,
    hint: "Arrays are zero-indexed. Item 5 lives at index 4.",
    expectedAnswer: "i < 5",
    points: 100,
  },
  {
    id: "q2",
    title: "The Null Pointer Nightmare",
    description: `This Python function crashes with AttributeError:

  def get_username(user):
      return user.profile.username

The \`profile\` field can be None for new users.
What built-in function safely returns None instead of crashing?`,
    hint: "Python has a built-in for safely accessing object attributes.",
    expectedAnswer: "getattr",
    points: 150,
  },
  {
    id: "q3",
    title: "The Silent Data Corruptor",
    description: `A merge function mutates the original object:

  function mergeConfig(defaults, overrides) {
    const result = defaults;   // BUG
    Object.assign(result, overrides);
    return result;
  }

What should replace \`defaults\` on the right side
to prevent mutation? (hint: think empty object)`,
    hint: "You want a shallow copy, not a reference.",
    expectedAnswer: "{}",
    points: 200,
  },
  {
    id: "q4",
    title: "The Async Avalanche",
    description: `This code always logs \`undefined\`:

  function loadUser(id) {
    let user;
    fetch('/api/users/' + id)
      .then(res => res.json())
      .then(data => { user = data; });
    console.log(user);
  }

Where should the console.log be moved?`,
    hint: "Promises are async — the log fires before fetch completes.",
    expectedAnswer: "inside the then",
    points: 150,
  },
  {
    id: "q5",
    title: "The Equality Trap",
    description: `A developer checks for falsy but gets surprises:

  if (value == false) {
    disableFeature();
  }

When \`value\` is \`0\`, the feature disables unexpectedly.
What operator should replace \`==\`?`,
    hint: "Loose equality coerces types. Strict equality does not.",
    expectedAnswer: "===",
    points: 100,
  },
];
// =============================================================================
// ⬆⬆⬆  END QUESTIONS  ⬆⬆⬆
// =============================================================================

const db = {
  async get(path) {
    const res = await fetch(`${FIREBASE_URL}/${path}.json`);
    return res.json();
  },
  async set(path, data) {
    await fetch(`${FIREBASE_URL}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
};

const ScoringEngine = {
  evaluate(question, answer) {
    const clean = (s) => s.trim().toLowerCase().replace(/['"`;]/g, "");
    return clean(answer) === clean(question.expectedAnswer);
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Orbitron:wght@700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090a;--surface:#0d1214;--border:#1c2a2e;
  --accent:#00e5ff;--good:#00ff9d;--bad:#ff4060;--gold:#ffd700;
  --text:#b8cdd0;--dim:#4a6a70;--bright:#dff0f3;
  --mono:'Space Mono',monospace;--display:'Orbitron',monospace;
}
body{background:var(--bg);color:var(--text);font-family:var(--mono);min-height:100vh}
.wrap{max-width:820px;margin:0 auto;padding:20px 16px}
.sl{position:fixed;inset:0;pointer-events:none;z-index:50;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px)}
.hdr{text-align:center;padding:32px 0 24px}
.logo{font-family:var(--display);font-size:clamp(22px,5vw,44px);font-weight:900;
  letter-spacing:6px;color:var(--accent);
  text-shadow:0 0 24px rgba(0,229,255,.5),0 0 60px rgba(0,229,255,.2);
  animation:flicker 9s infinite}
.logo-sub{font-size:10px;letter-spacing:5px;color:var(--dim);margin-top:6px;text-transform:uppercase}
@keyframes flicker{0%,94%,96%,98%,100%{opacity:1}95%,97%,99%{opacity:.8}}
.nav{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:28px}
.ntab{background:none;border:none;padding:10px 18px;cursor:pointer;
  font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;
  color:var(--dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s}
.ntab:hover{color:var(--accent)}
.ntab.on{color:var(--accent);border-bottom-color:var(--accent)}
.card{background:var(--surface);border:1px solid var(--border);padding:22px;margin-bottom:14px;position:relative}
.reg{max-width:460px;margin:50px auto}
.rtitle{font-family:var(--display);font-size:13px;letter-spacing:4px;color:var(--accent);margin-bottom:6px}
.rdesc{font-size:11px;color:var(--dim);line-height:1.9;margin-bottom:26px}
.lbl{font-size:9px;letter-spacing:3px;color:var(--dim);margin-bottom:7px;display:block}
.inp{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--bright);
  font-family:var(--mono);font-size:14px;padding:11px 14px;outline:none;transition:border-color .2s}
.inp:focus{border-color:var(--accent)}
.inp::placeholder{color:var(--dim)}
.btn{background:transparent;border:1px solid var(--accent);color:var(--accent);
  font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;
  padding:11px 26px;cursor:pointer;transition:all .2s}
.btn:hover{background:var(--accent);color:var(--bg);box-shadow:0 0 18px rgba(0,229,255,.3)}
.btn:disabled{opacity:.35;cursor:not-allowed}
.btn:disabled:hover{background:transparent;color:var(--accent);box-shadow:none}
.err{color:var(--bad);font-size:10px;margin-top:9px;letter-spacing:1px}
.mt14{margin-top:14px}
.sbar{display:flex;gap:1px;margin-bottom:22px;border:1px solid var(--border);overflow:hidden}
.stat{flex:1;padding:13px 10px;background:var(--surface);text-align:center}
.sv{font-family:var(--display);font-size:17px;color:var(--accent)}
.sl2{font-size:8px;letter-spacing:2px;color:var(--dim);margin-top:3px}
.qcard{background:var(--surface);border:1px solid var(--border);padding:18px;
  cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:14px;margin-bottom:10px}
.qcard:hover:not(.solved){border-color:var(--accent);transform:translateX(3px)}
.qcard.solved{opacity:.45;cursor:default}
.qcard.active{border-color:var(--accent);background:#0c1e22}
.qpts{font-family:var(--display);font-size:11px;font-weight:700;color:var(--gold);
  min-width:50px;text-align:center;padding:5px;border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.04)}
.qtitle{font-size:13px;color:var(--bright);margin-bottom:3px}
.qstatus{font-size:9px;letter-spacing:2px;color:var(--dim)}
.qstatus.ok{color:var(--good)}
.dtl{margin-top:4px}
.dtitle{font-family:var(--display);font-size:12px;color:var(--accent);letter-spacing:2px;margin-bottom:14px}
.code{background:#040607;border:1px solid var(--border);border-left:3px solid var(--accent);
  padding:14px 18px;font-size:11px;line-height:1.9;color:#7ab0b8;white-space:pre-wrap;margin:10px 0;overflow-x:auto}
.hint{border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.03);
  padding:10px 14px;font-size:10px;color:#9a8040;margin:10px 0}
.arow{display:flex;gap:8px;margin-top:14px}
.ainp{flex:1;background:var(--bg);border:1px solid var(--border);color:var(--bright);
  font-family:var(--mono);font-size:13px;padding:10px 14px;outline:none;transition:border-color .2s}
.ainp:focus{border-color:var(--accent)}
.res{padding:11px 14px;margin-top:10px;font-size:11px;letter-spacing:1px;animation:si .3s ease}
.res.good{background:rgba(0,255,157,.07);border:1px solid rgba(0,255,157,.3);color:var(--good)}
.res.bad{background:rgba(255,64,96,.07);border:1px solid rgba(255,64,96,.3);color:var(--bad)}
@keyframes si{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--good);
  margin-right:6px;animation:bpulse 2s infinite;vertical-align:middle}
@keyframes bpulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,157,.4)}70%{box-shadow:0 0 0 6px rgba(0,255,157,0)}}
`;

export default function GameApp() {
  const [player, setPlayer] = useState(null);
  const [name, setName] = useState("");
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [solvedIds, setSolvedIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const questions = QUESTIONS_CONFIG.map(({ expectedAnswer, ...q }) => q);
  const totalPts = QUESTIONS_CONFIG.reduce((s, q) => s + q.points, 0);

  const handleRegister = async () => {
    setRegError("");
    const trimmed = name.trim();
    if (trimmed.length < 2) { setRegError("Name must be at least 2 characters."); return; }
    setRegistering(true);
    try {
      const existing = await db.get("players");
      if (existing) {
        const taken = Object.values(existing).some(
          (p) => p.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (taken) {
          setRegError("That name is taken. Choose another.");
          setRegistering(false);
          return;
        }
      }
      const newPlayer = {
        id: `p_${Date.now()}`,
        name: trimmed,
        score: 0,
        attempts: 0,
        correctAnswers: 0,
        joinedAt: new Date().toISOString(),
      };
      await db.set(`players/${newPlayer.id}`, newPlayer);
      setPlayer(newPlayer);
    } catch {
      setRegError("Cannot connect to Firebase. Check your database URL and rules.");
    }
    setRegistering(false);
  };

  const handleSelect = (q) => {
    if (solvedIds.includes(q.id)) return;
    setSelected(q); setAnswer(""); setResult(null);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || !selected || submitting) return;
    setSubmitting(true);
    const question = QUESTIONS_CONFIG.find((q) => q.id === selected.id);
    const correct = ScoringEngine.evaluate(question, answer);
    const pts = correct ? question.points : 0;
    const updated = {
      ...player,
      attempts: player.attempts + 1,
      score: player.score + pts,
      correctAnswers: player.correctAnswers + (correct ? 1 : 0),
    };
    await db.set(`players/${player.id}`, updated);
    setPlayer(updated);
    if (correct) setSolvedIds((prev) => [...prev, selected.id]);
    setResult({
      correct,
      message: correct
        ? `+${pts} pts — Bug squashed! 🐛`
        : "Not quite. The bug is still lurking...",
    });
    setSubmitting(false);
  };

  if (!player) return (
    <>
      <style>{S}</style>
      <div className="sl" />
      <div className="wrap">
        <div className="hdr">
          <div className="logo">BUG HUNT</div>
          <div className="logo-sub">Find the bug. Earn the points.</div>
        </div>
        <div className="reg">
          <div className="card">
            <div className="rtitle">Initialize Player</div>
            <p className="rdesc">
              Spot bugs in code snippets to earn points.
              Your score syncs live to the leaderboard on any device.
            </p>
            <label className="lbl">// Callsign</label>
            <input
              className="inp" placeholder="e.g. nullPointerNinja"
              value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              autoFocus
            />
            {regError && <div className="err">⚠ {regError}</div>}
            <div className="mt14">
              <button className="btn" onClick={handleRegister}
                disabled={registering || !name.trim()}>
                {registering ? "Connecting..." : "→ Enter the Arena"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{S}</style>
      <div className="sl" />
      <div className="wrap">
        <div className="hdr">
          <div className="logo">BUG HUNT</div>
          <div className="logo-sub"><span className="pulse" />Live via Firebase</div>
        </div>
        <nav className="nav">
          <button className="ntab on">Arena</button>
          <button className="ntab" style={{ marginLeft: "auto" }}
            onClick={() => { setPlayer(null); setSolvedIds([]); setSelected(null); }}>
            ⏻ {player.name}
          </button>
        </nav>
        <div className="sbar">
          <div className="stat"><div className="sv">{player.score}</div><div className="sl2">Score</div></div>
          <div className="stat"><div className="sv">{player.correctAnswers}</div><div className="sl2">Solved</div></div>
          <div className="stat"><div className="sv">{player.attempts}</div><div className="sl2">Attempts</div></div>
          <div className="stat"><div className="sv">{totalPts - player.score}</div><div className="sl2">Pts Left</div></div>
        </div>

        {questions.map((q) => {
          const isSolved = solvedIds.includes(q.id);
          const isActive = selected?.id === q.id;
          return (
            <div key={q.id}>
              <div
                className={`qcard ${isSolved ? "solved" : ""} ${isActive ? "active" : ""}`}
                onClick={() => handleSelect(q)}
              >
                <div className="qpts">{q.points}<br />PTS</div>
                <div style={{ flex: 1 }}>
                  <div className="qtitle">{q.title}</div>
                  <div className={`qstatus ${isSolved ? "ok" : ""}`}>
                    {isSolved ? "✓ SOLVED" : "● UNSOLVED"}
                  </div>
                </div>
                {!isSolved && <div style={{ color: "var(--dim)", fontSize: 12 }}>→</div>}
              </div>
              {isActive && !isSolved && (
                <div className="card dtl">
                  <div className="dtitle">{q.title}</div>
                  <pre className="code">{q.description}</pre>
                  {q.hint && <div className="hint">⚡ Hint: {q.hint}</div>}
                  <div className="arow">
                    <input
                      className="ainp" placeholder="Type your answer..."
                      value={answer}
                      onChange={(e) => { setAnswer(e.target.value); setResult(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    />
                    <button className="btn" onClick={handleSubmit}
                      disabled={submitting || !answer.trim()}>
                      {submitting ? "Saving..." : "Submit"}
                    </button>
                  </div>
                  {result && (
                    <div className={`res ${result.correct ? "good" : "bad"}`}>
                      {result.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
