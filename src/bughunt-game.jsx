/**
 * BUG HUNT — ENHANCED GAME APP
 * Supports 4 question types:
 *   1. "text"     — type your answer
 *   2. "choice"   — multiple choice (pick one)
 *   3. "order"    — drag and drop code blocks into correct order
 *   4. "image"    — shows an image + any of the above answer types
 *
 * Firebase REST API — no SDK needed.
 */

import React, { useState, useRef } from "react";

// ─── Firebase ─────────────────────────────────────────────────────────────────
const FIREBASE_URL = "https://bughunt-e86fb-default-rtdb.europe-west1.firebasedatabase.app";

// =============================================================================
// ⬇⬇⬇  ADD / EDIT QUESTIONS HERE  ⬇⬇⬇
//
// Question types:
//
// TYPE 1 — Text answer:
// { id, type:"text", title, description, hint, expectedAnswer, points }
//
// TYPE 2 — Multiple choice:
// { id, type:"choice", title, description, hint, options:["a","b","c","d"], expectedAnswer, points }
//
// TYPE 3 — Drag & drop ordering:
// { id, type:"order", title, description, hint, blocks:["line1","line2",...], expectedAnswer:"0,2,1,3", points }
// expectedAnswer = correct order of block indexes as comma-separated string
//
// TYPE 4 — Image + any answer type:
// Add imageUrl to any question above, e.g. imageUrl:"https://..."
// =============================================================================
const QUESTIONS_CONFIG = [
  // ── Text answer ─────────────────────────────────────────────────────────────
  {
    id: "q1",
    type: "text",
    title: "The ISO-20022 Expert",
    description: `The ISO 20022 message snippet below is failing in our processing systems. Identify the error in the snippet.

    <CdtTrfTxInf>
    <PmtId>
    <InstrId>7908NOI02002080</InstrId>
    <EndToEndId>20251122004</EndToEndId>
    <TxId>7908NOI02002080</TxId>
    <UETR>3ab2572f-3630-ØÆ34-92e7</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="NOK">555.49</IntrBkSttlmAmt>
    <IntrBkSttlmDt>2026-02-17</IntrBkSttlmDt>
    <InstdAmt Ccy="NOK">555.49</InstdAmt>,
    
    hint: "You will need a QA lens to find the tag.",
    expectedAnswer: ["UETR", "uetr", "<UETR>", "<uetr>", "Uetr"],
    points: 100,
  },

  // ── Multiple choice ─────────────────────────────────────────────────────────
  {
    id: "q2",
    type: "choice",
    title: "The Equality Trap",
    description: `What will  code print?

  console.log(0 == false);
  console.log(0 === false);`,
    hint: "== does type coercion, === does not.",
    options: [
      "false, false",
      "true, true",
      "true, false",
      "false, true",
    ],
    expectedAnswer: "true, false",
    points: 100,
  },

  // ── Drag & drop order ───────────────────────────────────────────────────────
  {
    id: "q3",
    type: "order",
    title: "Stack it to Win it!! ",
    description: "Arrange the following steps in the correct order starting from payment initiation and ending with delivery to the Beneficiary:",
    hint: "Brush your payments knowledge",
    blocks: [
      "CPP Processes it and convert a payment to PP101 to send it to Propay",
      "  Pain001 file initiated by customer",
      "  Propay will perform booking and converts the message to Pacs008 to process it & chooses Settlment Method",
      "  Pacs008 message is sent to HVPFTM for validations",
      "HVPFTM will send the Pacs008 message to BOX which will be delivered to SWIFT",
    ],
    expectedAnswer: "1,0,2,3,4",
    points: 200,
  },

  // ── Image + multiple choice ─────────────────────────────────────────────────
  {
    id: "q4",
    type: "choice",
    title: "Spot the Bug in the Screenshot",
    description: "Look at the code in the image below. What is the bug?",
    imageUrl: "https://placehold.co/600x200/0a0e0f/00e5ff?text=function+add(a,+b)+{%0A++return+a+-+b%3B+//+BUG%0A}",
    hint: "Look closely at the operator being used.",
    options: [
      "Missing semicolon",
      "Wrong operator: should be + not -",
      "Missing return statement",
      "Wrong parameter names",
    ],
    expectedAnswer: "Wrong operator: should be + not -",
    points: 150,
  },

  // ── Drag & drop order ───────────────────────────────────────────────────────
  {
    id: "q5",
    type: "order",
    title: "Build a Try-Catch Block",
    description: "Arrange these lines to form a correct try-catch-finally block:",
    hint: "try comes first, then catch, then finally.",
    blocks: [
      "try {",
      "  riskyOperation();",
      "} catch (error) {",
      "  console.error(error);",
      "} finally {",
      "  cleanup();",
      "}",
    ],
    expectedAnswer: "0,1,2,3,4,5,6",
    points: 200,
  },

  // ── Image + text answer ─────────────────────────────────────────────────────
  {
    id: "q6",
    type: "text",
    title: "Read the Flowchart",
    description: "The diagram below shows a login flow. Which step is missing that causes users to bypass authentication?",
    imageUrl: "https://placehold.co/600x220/0a0e0f/00ff9d?text=Login+Flow%0A[Enter+Creds]+→+[Check+DB]+→+[Dashboard]%0AMissing+step+between+Check+DB+%26+Dashboard",
    hint: "What should happen after checking credentials before granting access?",
    expectedAnswer: "validate token",
    points: 150,
  },

  // ── Multiple choice ─────────────────────────────────────────────────────────
  {
    id: "q7",
    type: "choice",
    title: "The Silent Data Corruptor",
    description: `Which line causes the original object to be mutated?

  function merge(defaults, overrides) {
    const result = defaults;        // Line A
    Object.assign(result, overrides); // Line B
    return result;                  // Line C
  }`,
    hint: "Assignment vs copy — which line creates a reference?",
    options: [
      "Line A — const result = defaults",
      "Line B — Object.assign",
      "Line C — return result",
      "None of the above",
    ],
    expectedAnswer: "Line A — const result = defaults",
    points: 150,
  },
];
// =============================================================================
// ⬆⬆⬆  END QUESTIONS  ⬆⬆⬆
// =============================================================================

// ─── Firebase helpers ─────────────────────────────────────────────────────────
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

// ─── Scoring ──────────────────────────────────────────────────────────────────
const ScoringEngine = {
  evaluate(question, answer) {
    if (question.type === "order") {
      return answer.trim() === question.expectedAnswer.trim();
    }
    const clean = (s) => s.trim().toLowerCase().replace(/['"`;]/g, "");
    return clean(answer) === clean(question.expectedAnswer);
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Orbitron:wght@700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090a;--surface:#0d1214;--surface2:#111a1c;--border:#1c2a2e;
  --accent:#00e5ff;--good:#00ff9d;--bad:#ff4060;--gold:#ffd700;--purple:#b06aff;
  --text:#b8cdd0;--dim:#4a6a70;--bright:#dff0f3;
  --mono:'Space Mono',monospace;--display:'Orbitron',monospace;
}
body{background:var(--bg);color:var(--text);font-family:var(--mono);min-height:100vh}
.wrap{max-width:860px;margin:0 auto;padding:20px 16px}
.sl{position:fixed;inset:0;pointer-events:none;z-index:50;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px)}

/* header */
.hdr{text-align:center;padding:32px 0 24px}
.logo{font-family:var(--display);font-size:clamp(22px,5vw,44px);font-weight:900;
  letter-spacing:6px;color:var(--accent);
  text-shadow:0 0 24px rgba(0,229,255,.5),0 0 60px rgba(0,229,255,.2);
  animation:flicker 9s infinite}
.logo-sub{font-size:10px;letter-spacing:5px;color:var(--dim);margin-top:6px;text-transform:uppercase}
@keyframes flicker{0%,94%,96%,98%,100%{opacity:1}95%,97%,99%{opacity:.8}}

/* nav */
.nav{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:28px}
.ntab{background:none;border:none;padding:10px 18px;cursor:pointer;
  font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;
  color:var(--dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s}
.ntab:hover{color:var(--accent)}
.ntab.on{color:var(--accent);border-bottom-color:var(--accent)}

/* card */
.card{background:var(--surface);border:1px solid var(--border);padding:22px;margin-bottom:14px;position:relative}

/* register */
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

/* stats */
.sbar{display:flex;gap:1px;margin-bottom:22px;border:1px solid var(--border);overflow:hidden}
.stat{flex:1;padding:13px 10px;background:var(--surface);text-align:center}
.sv{font-family:var(--display);font-size:17px;color:var(--accent)}
.sl2{font-size:8px;letter-spacing:2px;color:var(--dim);margin-top:3px}

/* question type badges */
.type-badge{display:inline-block;font-size:8px;letter-spacing:2px;text-transform:uppercase;
  padding:3px 8px;border:1px solid;margin-bottom:10px}
.type-badge.text{border-color:var(--accent);color:var(--accent)}
.type-badge.choice{border-color:var(--purple);color:var(--purple)}
.type-badge.order{border-color:var(--gold);color:var(--gold)}
.type-badge.image{border-color:var(--good);color:var(--good)}

/* question list */
.qcard{background:var(--surface);border:1px solid var(--border);padding:18px;
  cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:14px;margin-bottom:10px}
.qcard:hover:not(.solved){border-color:var(--accent);transform:translateX(3px)}
.qcard.solved{opacity:.45;cursor:default}
.qcard.active{border-color:var(--accent);background:#0c1e22}
.qpts{font-family:var(--display);font-size:11px;font-weight:700;color:var(--gold);
  min-width:50px;text-align:center;padding:5px;border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.04)}
.qtitle{font-size:13px;color:var(--bright);margin-bottom:4px}
.qmeta{display:flex;gap:8px;align-items:center}
.qstatus{font-size:9px;letter-spacing:2px;color:var(--dim)}
.qstatus.ok{color:var(--good)}

/* question detail */
.dtl{margin-top:4px}
.dtitle{font-family:var(--display);font-size:12px;color:var(--accent);letter-spacing:2px;margin-bottom:14px}
.code{background:#040607;border:1px solid var(--border);border-left:3px solid var(--accent);
  padding:14px 18px;font-size:11px;line-height:1.9;color:#7ab0b8;white-space:pre-wrap;margin:10px 0;overflow-x:auto}
.hint{border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.03);
  padding:10px 14px;font-size:10px;color:#9a8040;margin:10px 0}

/* image */
.q-image{width:100%;max-height:260px;object-fit:contain;border:1px solid var(--border);
  margin:12px 0;background:#040607}

/* text answer */
.arow{display:flex;gap:8px;margin-top:14px}
.ainp{flex:1;background:var(--bg);border:1px solid var(--border);color:var(--bright);
  font-family:var(--mono);font-size:13px;padding:10px 14px;outline:none;transition:border-color .2s}
.ainp:focus{border-color:var(--accent)}

/* multiple choice */
.choices{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.choice-btn{background:var(--surface2);border:1px solid var(--border);color:var(--text);
  font-family:var(--mono);font-size:12px;padding:12px 16px;cursor:pointer;
  text-align:left;transition:all .2s;letter-spacing:.5px}
.choice-btn:hover{border-color:var(--purple);color:var(--bright);background:#13101e}
.choice-btn.selected{border-color:var(--purple);color:var(--purple);background:rgba(176,106,255,.08)}
.choice-btn.correct{border-color:var(--good);color:var(--good);background:rgba(0,255,157,.07)}
.choice-btn.wrong{border-color:var(--bad);color:var(--bad);background:rgba(255,64,96,.07)}
.choice-submit{margin-top:10px}

/* drag & drop order */
.order-wrap{margin-top:14px}
.order-label{font-size:9px;letter-spacing:3px;color:var(--dim);margin-bottom:10px;text-transform:uppercase}
.blocks-list{display:flex;flex-direction:column;gap:6px}
.block-item{background:var(--surface2);border:1px solid var(--border);
  padding:10px 14px;font-size:11px;color:#7ab0b8;font-family:var(--mono);
  cursor:grab;user-select:none;display:flex;align-items:center;gap:12px;
  transition:all .2s;white-space:pre}
.block-item:active{cursor:grabbing}
.block-item.dragging{opacity:.4;border-color:var(--accent)}
.block-item.drag-over{border-color:var(--gold);background:#1a1500}
.block-handle{color:var(--dim);font-size:14px;flex-shrink:0}
.order-submit{margin-top:12px}

/* result */
.res{padding:11px 14px;margin-top:10px;font-size:11px;letter-spacing:1px;animation:si .3s ease}
.res.good{background:rgba(0,255,157,.07);border:1px solid rgba(0,255,157,.3);color:var(--good)}
.res.bad{background:rgba(255,64,96,.07);border:1px solid rgba(255,64,96,.3);color:var(--bad)}
@keyframes si{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}

/* pulse */
.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--good);
  margin-right:6px;animation:bpulse 2s infinite;vertical-align:middle}
@keyframes bpulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,157,.4)}70%{box-shadow:0 0 0 6px rgba(0,255,157,0)}}
`;

// ─── Answer Components ────────────────────────────────────────────────────────

function TextAnswer({ onSubmit, submitting }) {
  const [answer, setAnswer] = useState("");
  return (
    <div className="arow">
      <input
        className="ainp" placeholder="Type your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && answer.trim() && onSubmit(answer)}
      />
      <button className="btn" onClick={() => onSubmit(answer)}
        disabled={submitting || !answer.trim()}>
        {submitting ? "Saving..." : "Submit"}
      </button>
    </div>
  );
}

function MultipleChoice({ question, onSubmit, submitting, result }) {
  const [selected, setSelected] = useState(null);

  const btnClass = (opt) => {
    if (!result) return selected === opt ? "selected" : "";
    if (opt === question.expectedAnswer) return "correct";
    if (opt === selected && opt !== question.expectedAnswer) return "wrong";
    return "";
  };

  return (
    <div>
      <div className="choices">
        {question.options.map((opt, i) => (
          <button
            key={i}
            className={`choice-btn ${btnClass(opt)}`}
            onClick={() => !result && setSelected(opt)}
            disabled={!!result}
          >
            <span style={{ color: "var(--dim)", marginRight: 10 }}>
              {String.fromCharCode(65 + i)}.
            </span>
            {opt}
          </button>
        ))}
      </div>
      {!result && (
        <button className="btn choice-submit" onClick={() => onSubmit(selected)}
          disabled={submitting || !selected}>
          {submitting ? "Saving..." : "Submit"}
        </button>
      )}
    </div>
  );
}

function DragOrderAnswer({ question, onSubmit, submitting, result }) {
  const [blocks, setBlocks] = useState(
    question.blocks.map((text, i) => ({ id: i, text }))
      .sort(() => Math.random() - 0.5) // shuffle on mount
  );
  const dragIdx = useRef(null);

  const handleDragStart = (i) => { dragIdx.current = i; };

  const handleDrop = (i) => {
    const updated = [...blocks];
    const dragged = updated.splice(dragIdx.current, 1)[0];
    updated.splice(i, 0, dragged);
    setBlocks(updated);
    dragIdx.current = null;
  };

  const getAnswer = () => blocks.map((b) => b.id).join(",");

  return (
    <div className="order-wrap">
      <div className="order-label">⠿ Drag blocks into the correct order</div>
      <div className="blocks-list">
        {blocks.map((block, i) => (
          <div
            key={block.id}
            className={`block-item ${result ? (getAnswer() === question.expectedAnswer ? "correct" : "") : ""}`}
            draggable={!result}
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            style={result && getAnswer() === question.expectedAnswer
              ? { borderColor: "var(--good)", color: "var(--good)" }
              : result ? { borderColor: "var(--bad)", color: "var(--bad)" } : {}}
          >
            <span className="block-handle">⠿</span>
            {block.text}
          </div>
        ))}
      </div>
      {!result && (
        <button className="btn order-submit" onClick={() => onSubmit(getAnswer())}
          disabled={submitting}>
          {submitting ? "Checking..." : "Submit Order"}
        </button>
      )}
    </div>
  );
}

// ─── Question Detail ──────────────────────────────────────────────────────────
function QuestionDetail({ question, onAnswer, submitting, result }) {
  const typeLabel = {
    text: "Text Answer",
    choice: "Multiple Choice",
    order: "Drag & Drop",
    image: "Image",
  };

  return (
    <div className="card dtl">
      <div style={{ marginBottom: 12 }}>
        <span className={`type-badge ${question.type}`}>
          {question.imageUrl ? "📷 Image + " : ""}
          {typeLabel[question.type] || question.type}
        </span>
      </div>
      <div className="dtitle">{question.title}</div>

      {/* Image if present */}
      {question.imageUrl && (
        <img src={question.imageUrl} alt="Question visual" className="q-image" />
      )}

      {/* Description / code block */}
      {question.description && (
        <pre className="code">{question.description}</pre>
      )}

      {/* Hint */}
      {question.hint && (
        <div className="hint">⚡ Hint: {question.hint}</div>
      )}

      {/* Answer input based on type */}
      {question.type === "text" && (
        <TextAnswer onSubmit={onAnswer} submitting={submitting} />
      )}
      {question.type === "choice" && (
        <MultipleChoice
          question={question} onSubmit={onAnswer}
          submitting={submitting} result={result}
        />
      )}
      {question.type === "order" && (
        <DragOrderAnswer
          question={question} onSubmit={onAnswer}
          submitting={submitting} result={result}
        />
      )}

      {/* Result banner */}
      {result && (
        <div className={`res ${result.correct ? "good" : "bad"}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function GameApp() {
  const [player, setPlayer] = useState(null);
  const [name, setName] = useState("");
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [solvedIds, setSolvedIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({});
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
        name: trimmed, score: 0, attempts: 0,
        correctAnswers: 0, joinedAt: new Date().toISOString(),
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
    setSelected(q);
  };

  const handleAnswer = async (answer) => {
    if (!answer || !selected || submitting) return;
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

    const result = {
      correct,
      message: correct
        ? `+${pts} pts — Bug squashed! 🐛`
        : "Not quite. The bug is still lurking...",
    };
    setResults((prev) => ({ ...prev, [selected.id]: result }));
    if (correct) setSolvedIds((prev) => [...prev, selected.id]);
    setSubmitting(false);
  };

  const typeBadgeColor = (type) => ({
    text: "var(--accent)",
    choice: "var(--purple)",
    order: "var(--gold)",
  }[type] || "var(--accent)");

  const typeIcon = (type) => ({
    text: "✏",
    choice: "◉",
    order: "⠿",
  }[type] || "✏");

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
              Welcome to Bug Hunt. Answer text, image, multiple choice
              and drag-and-drop questions to earn points.
              Scores sync live to the leaderboard on any device.
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

        {/* Question type legend */}
        <div className="card" style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "var(--dim)", marginBottom: 12 }}>
            QUESTION TYPES IN THIS GAME
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { type: "text", label: "Text Answer — type your answer" },
              { type: "choice", label: "Multiple Choice — pick the right option" },
              { type: "order", label: "Drag & Drop — arrange blocks in order" },
            ].map(({ type, label }) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
                <span style={{ color: typeBadgeColor(type), fontSize: 14 }}>{typeIcon(type)}</span>
                <span style={{ color: "var(--text)" }}>{label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
              <span style={{ color: "var(--good)", fontSize: 14 }}>📷</span>
              <span style={{ color: "var(--text)" }}>Image — visual clue included</span>
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
            onClick={() => { setPlayer(null); setSolvedIds([]); setSelected(null); setResults({}); }}>
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
          const result = results[q.id];
          return (
            <div key={q.id}>
              <div
                className={`qcard ${isSolved ? "solved" : ""} ${isActive ? "active" : ""}`}
                onClick={() => handleSelect(q)}
              >
                <div className="qpts">{q.points}<br />PTS</div>
                <div style={{ flex: 1 }}>
                  <div className="qtitle">{q.title}</div>
                  <div className="qmeta">
                    <span style={{ fontSize: 10, color: typeBadgeColor(q.type) }}>
                      {typeIcon(q.type)} {q.type.toUpperCase()}
                    </span>
                    {q.imageUrl && (
                      <span style={{ fontSize: 10, color: "var(--good)" }}>📷 IMAGE</span>
                    )}
                    <span className={`qstatus ${isSolved ? "ok" : ""}`}>
                      {isSolved ? "✓ SOLVED" : "● UNSOLVED"}
                    </span>
                  </div>
                </div>
                {!isSolved && <div style={{ color: "var(--dim)", fontSize: 12 }}>→</div>}
              </div>

              {isActive && !isSolved && (
                <QuestionDetail
                  question={q}
                  onAnswer={handleAnswer}
                  submitting={submitting}
                  result={result}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
