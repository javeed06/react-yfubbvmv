/**
 * BUG HUNT — ENHANCED GAME APP
 * Question types:
 *   "text"   — type your answer (expectedAnswer: string or array of valid strings)
 *   "choice" — single correct answer (expectedAnswer: string)
 *   "multi"  — multiple correct answers, tick all that apply (expectedAnswer: array)
 *              Scoring: partial points per correct selection, penalty for wrong picks
 *   "order"  — drag and drop code blocks (expectedAnswer: "0,1,2,3")
 *   any type + imageUrl — shows image above question
 */

import React, { useState, useRef } from "react";

const FIREBASE_URL = "https://bughunt-e86fb-default-rtdb.europe-west1.firebasedatabase.app";

// =============================================================================
// ADD / EDIT QUESTIONS HERE
// =============================================================================
const QUESTIONS_CONFIG = [

  {
    id: "q1",
    type: "text",
    title: "The ISO-20022 Expert",
    description: "The ISO 20022 message snippet below is failing in our processing systems.\nIdentify the error in the snippet.\n\n    <CdtTrfTxInf>\n    <PmtId>\n    <InstrId>7908NOI02002080</InstrId>\n    <EndToEndId>20251122004</EndToEndId>\n    <TxId>7908NOI02002080</TxId>\n    <UETR>3ab2572f-3630-OE34-92e7</UETR>\n    </PmtId>\n    <IntrBkSttlmAmt Ccy=\"NOK\">555.49</IntrBkSttlmAmt>\n    <IntrBkSttlmDt>2026-02-17</IntrBkSttlmDt>\n    <InstdAmt Ccy=\"NOK\">555.49</InstdAmt>",
    hint: "You will need a QA lens to find the tag.",
    expectedAnswer: ["UETR", "uetr", "<UETR>", "<uetr>", "Uetr"],
    points: 100,
  },

  {
    id: "q2",
    type: "choice",
    title: "The Statement Trap",
    description: "As a QA you are expecting Camt.054D message that needs to be delivered to the customer, But you do not find anything in the downstream applications. Which application you will look at? ",
    hint: "Look at the application which generates statements",
    options: [
      "821",
      "PAS",
      "FTMCPP",
      "PDS",
    ],
    expectedAnswer: "PDS",
    points: 100,
  },

  {
    id: "q3",
    type: "order",
    title: "Stack it to Win it!!",
    description: "Arrange the following steps in the correct order starting from payment initiation and ending with delivery to the Beneficiary:",
    hint: "Brush your payments knowledge.",
    blocks: [
      "CPP Processes it and converts a payment to PP101 to send it to Propay",
      "Pain001 file initiated by customer",
      "Propay will perform booking and converts the message to Pacs008 to process it and chooses Settlement Method",
      "Pacs008 message is sent to HVPFTM for validations",
      "HVPFTM will send the Pacs008 message to BOX which will be delivered to SWIFT",
    ],
    expectedAnswer: "1,0,2,3,4",
    points: 200,
  },

  // ── MULTI-SELECT — tick all that apply ──────────────────────────────────────
  // expectedAnswer = array of ALL correct options
  // Scoring:
  //   Full points  → all correct selected AND no wrong selected
  //   Partial pts  → some correct selected, no wrong selected
  //   Zero pts     → any wrong option selected
  {
    id: "q4",
    type: "multi",
    title: "Spot the Bug in the Screenshot and become a SEPA INSTANT Icon",
    description: "Look at the Payment data in the image below.\nSelect ALL the bugs you can find:",
    imageUrl: "/react-yfubbvmv/SEPAIP.png",
    hint: "Look closely at the DATA being used. There may be more than one bug!",
    options: [
      "Creditor can not be DNB Norway (creditor)",
      "Currency should be EUR , no exchange allowed (currency)",
      "Date should be today's date",
      "Both structured remittance and unstructured remittance present",
      "NO Bug! Everything looks ok",
    ],
    expectedAnswer: [
      "Creditor can not be DNB Norway (creditor)",
      "Currency should be EUR , no exchange allowed (currency)",
      "Date should be today's date",
      "Both structured remittance and unstructured remittance present",
    ],
    points: 150,
  },
  
  {
    id: "q5",
    type: "choice",
    title: "The Bug Terminator",
    description: "Why does this RIX payments message fail business rules although it matches the schema? \n <ClrSysRef>RIX</ClrSysRef> \n <IntrBkSttlmAmt Ccy="EUR">34000</IntrBkSttlmAmt>",
    hint: "Look at the tags carefully",
    options: [
      "Allows Swedish Krone currency only",
      "Allows EURO and Swedish Krone currency",
      "Amount not valid",
      "None of the above",
    ],
    expectedAnswer: "Allows Swedish Krone currency only",
    points: 150,
  },

];
// =============================================================================
// END QUESTIONS
// =============================================================================

const db = {
  async get(path) {
    const res = await fetch(FIREBASE_URL + "/" + path + ".json");
    return res.json();
  },
  async set(path, data) {
    await fetch(FIREBASE_URL + "/" + path + ".json", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
};

// ─── Scoring ──────────────────────────────────────────────────────────────────
const ScoringEngine = {
  // Returns { correct: bool, pointsAwarded: number, feedback: string }
  evaluate(question, answer) {
    const clean = (s) => s.trim().toLowerCase().replace(/['"`;]/g, "");

    // Drag & drop
    if (question.type === "order") {
      const correct = answer.trim() === question.expectedAnswer.trim();
      return {
        correct,
        pointsAwarded: correct ? question.points : 0,
        feedback: correct ? "Perfect order!" : "Not quite right — try again.",
      };
    }

    // Multi-select scoring
    if (question.type === "multi") {
      const selected = answer; // array of selected option strings
      const correct = question.expectedAnswer;
      const wrongPicks = selected.filter((s) => !correct.includes(s));
      const rightPicks = selected.filter((s) => correct.includes(s));

      if (wrongPicks.length > 0) {
        // Any wrong pick = zero points
        return {
          correct: false,
          pointsAwarded: 0,
          feedback: "You selected " + wrongPicks.length + " wrong option(s). 0 pts.",
        };
      }

      // Partial scoring: pts per correct answer selected
      const ptsEach = Math.floor(question.points / correct.length);
      const awarded = ptsEach * rightPicks.length;
      const allCorrect = rightPicks.length === correct.length;

      return {
        correct: allCorrect,
        pointsAwarded: awarded,
        feedback: allCorrect
          ? "All " + correct.length + " bugs found! +" + awarded + " pts"
          : "Found " + rightPicks.length + "/" + correct.length + " bugs. +" + awarded + " pts — keep looking!",
      };
    }

    // Text answer — array of valid answers
    if (Array.isArray(question.expectedAnswer)) {
      const correct = question.expectedAnswer.some(
        (valid) => clean(answer) === clean(valid)
      );
      return {
        correct,
        pointsAwarded: correct ? question.points : 0,
        feedback: correct ? "Correct!" : "Not quite.",
      };
    }

    // Single text / choice answer
    const correct = clean(answer) === clean(question.expectedAnswer);
    return {
      correct,
      pointsAwarded: correct ? question.points : 0,
      feedback: correct ? "Correct!" : "Not quite.",
    };
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = [
  "@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Orbitron:wght@700;900&display=swap');",
  "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
  ":root{",
  "  --bg:#07090a;--surface:#0d1214;--surface2:#111a1c;--border:#1c2a2e;",
  "  --accent:#00e5ff;--good:#00ff9d;--bad:#ff4060;--gold:#ffd700;--purple:#b06aff;--teal:#00c8a0;",
  "  --text:#b8cdd0;--dim:#4a6a70;--bright:#dff0f3;",
  "  --mono:'Space Mono',monospace;--display:'Orbitron',monospace;",
  "}",
  "body{background:var(--bg);color:var(--text);font-family:var(--mono);min-height:100vh}",
  ".wrap{max-width:860px;margin:0 auto;padding:20px 16px}",
  ".sl{position:fixed;inset:0;pointer-events:none;z-index:50;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px)}",
  ".hdr{text-align:center;padding:32px 0 24px}",
  ".logo{font-family:var(--display);font-size:clamp(22px,5vw,44px);font-weight:900;letter-spacing:6px;color:var(--accent);text-shadow:0 0 24px rgba(0,229,255,.5),0 0 60px rgba(0,229,255,.2);animation:flicker 9s infinite}",
  ".logo-sub{font-size:10px;letter-spacing:5px;color:var(--dim);margin-top:6px;text-transform:uppercase}",
  "@keyframes flicker{0%,94%,96%,98%,100%{opacity:1}95%,97%,99%{opacity:.8}}",
  ".nav{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:28px}",
  ".ntab{background:none;border:none;padding:10px 18px;cursor:pointer;font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s}",
  ".ntab:hover{color:var(--accent)}",
  ".ntab.on{color:var(--accent);border-bottom-color:var(--accent)}",
  ".card{background:var(--surface);border:1px solid var(--border);padding:22px;margin-bottom:14px;position:relative}",
  ".reg{max-width:460px;margin:50px auto}",
  ".rtitle{font-family:var(--display);font-size:13px;letter-spacing:4px;color:var(--accent);margin-bottom:6px}",
  ".rdesc{font-size:11px;color:var(--dim);line-height:1.9;margin-bottom:26px}",
  ".lbl{font-size:9px;letter-spacing:3px;color:var(--dim);margin-bottom:7px;display:block}",
  ".inp{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--bright);font-family:var(--mono);font-size:14px;padding:11px 14px;outline:none;transition:border-color .2s}",
  ".inp:focus{border-color:var(--accent)}",
  ".inp::placeholder{color:var(--dim)}",
  ".btn{background:transparent;border:1px solid var(--accent);color:var(--accent);font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;padding:11px 26px;cursor:pointer;transition:all .2s}",
  ".btn:hover{background:var(--accent);color:var(--bg);box-shadow:0 0 18px rgba(0,229,255,.3)}",
  ".btn:disabled{opacity:.35;cursor:not-allowed}",
  ".btn:disabled:hover{background:transparent;color:var(--accent);box-shadow:none}",
  ".err{color:var(--bad);font-size:10px;margin-top:9px;letter-spacing:1px}",
  ".mt14{margin-top:14px}",
  ".sbar{display:flex;gap:1px;margin-bottom:22px;border:1px solid var(--border);overflow:hidden}",
  ".stat{flex:1;padding:13px 10px;background:var(--surface);text-align:center}",
  ".sv{font-family:var(--display);font-size:17px;color:var(--accent)}",
  ".sl2{font-size:8px;letter-spacing:2px;color:var(--dim);margin-top:3px}",
  ".type-badge{display:inline-block;font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:3px 8px;border:1px solid;margin-bottom:10px}",
  ".type-badge.text{border-color:var(--accent);color:var(--accent)}",
  ".type-badge.choice{border-color:var(--purple);color:var(--purple)}",
  ".type-badge.multi{border-color:var(--teal);color:var(--teal)}",
  ".type-badge.order{border-color:var(--gold);color:var(--gold)}",
  ".qcard{background:var(--surface);border:1px solid var(--border);padding:18px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:14px;margin-bottom:10px}",
  ".qcard:hover:not(.solved){border-color:var(--accent);transform:translateX(3px)}",
  ".qcard.solved{opacity:.45;cursor:default}",
  ".qcard.active{border-color:var(--accent);background:#0c1e22}",
  ".qpts{font-family:var(--display);font-size:11px;font-weight:700;color:var(--gold);min-width:50px;text-align:center;padding:5px;border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.04)}",
  ".qtitle{font-size:13px;color:var(--bright);margin-bottom:4px}",
  ".qmeta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
  ".qstatus{font-size:9px;letter-spacing:2px;color:var(--dim)}",
  ".qstatus.ok{color:var(--good)}",
  ".dtl{margin-top:4px}",
  ".dtitle{font-family:var(--display);font-size:12px;color:var(--accent);letter-spacing:2px;margin-bottom:14px}",
  ".code{background:#040607;border:1px solid var(--border);border-left:3px solid var(--accent);padding:14px 18px;font-size:11px;line-height:1.9;color:#7ab0b8;white-space:pre-wrap;margin:10px 0;overflow-x:auto}",
  ".hint{border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.03);padding:10px 14px;font-size:10px;color:#9a8040;margin:10px 0}",
  ".q-image{width:100%;max-height:320px;object-fit:contain;border:1px solid var(--border);margin:12px 0;background:#040607}",
  ".valid-hint{font-size:9px;color:var(--dim);margin-top:6px;letter-spacing:1px}",
  ".arow{display:flex;gap:8px;margin-top:14px}",
  ".ainp{flex:1;background:var(--bg);border:1px solid var(--border);color:var(--bright);font-family:var(--mono);font-size:13px;padding:10px 14px;outline:none;transition:border-color .2s}",
  ".ainp:focus{border-color:var(--accent)}",
  "/* single choice */",
  ".choices{display:flex;flex-direction:column;gap:8px;margin-top:14px}",
  ".choice-btn{background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:12px;padding:12px 16px;cursor:pointer;text-align:left;transition:all .2s;letter-spacing:.5px}",
  ".choice-btn:hover{border-color:var(--purple);color:var(--bright);background:#13101e}",
  ".choice-btn.selected{border-color:var(--purple);color:var(--purple);background:rgba(176,106,255,.08)}",
  ".choice-btn.correct{border-color:var(--good);color:var(--good);background:rgba(0,255,157,.07)}",
  ".choice-btn.wrong{border-color:var(--bad);color:var(--bad);background:rgba(255,64,96,.07)}",
  ".choice-submit{margin-top:10px}",
  "/* multi select */",
  ".multi-label{font-size:9px;letter-spacing:3px;color:var(--teal);margin-bottom:10px;text-transform:uppercase}",
  ".multi-choices{display:flex;flex-direction:column;gap:8px;margin-top:10px}",
  ".multi-btn{background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:12px;padding:12px 16px;cursor:pointer;text-align:left;transition:all .2s;letter-spacing:.5px;display:flex;align-items:center;gap:12px}",
  ".multi-btn:hover:not(:disabled){border-color:var(--teal);color:var(--bright);background:#0a1e1e}",
  ".multi-btn.checked{border-color:var(--teal);color:var(--teal);background:rgba(0,200,160,.08)}",
  ".multi-btn.reveal-correct{border-color:var(--good);color:var(--good);background:rgba(0,255,157,.07)}",
  ".multi-btn.reveal-wrong{border-color:var(--bad);color:var(--bad);background:rgba(255,64,96,.07)}",
  ".multi-btn.reveal-missed{border-color:var(--gold);color:var(--gold);background:rgba(255,215,0,.05)}",
  ".checkbox{width:16px;height:16px;border:1px solid currentColor;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px}",
  ".multi-counter{font-size:9px;color:var(--teal);margin-top:8px;letter-spacing:2px}",
  ".multi-submit{margin-top:12px}",
  ".partial-score{font-size:10px;color:var(--gold);margin-top:6px;letter-spacing:1px}",
  "/* drag & drop */",
  ".order-wrap{margin-top:14px}",
  ".order-label{font-size:9px;letter-spacing:3px;color:var(--dim);margin-bottom:10px;text-transform:uppercase}",
  ".blocks-list{display:flex;flex-direction:column;gap:6px}",
  ".block-item{background:var(--surface2);border:1px solid var(--border);padding:10px 14px;font-size:11px;color:#7ab0b8;font-family:var(--mono);cursor:grab;user-select:none;display:flex;align-items:center;gap:12px;transition:all .2s;white-space:normal;word-break:break-word}",
  ".block-item:active{cursor:grabbing}",
  ".block-handle{color:var(--dim);font-size:14px;flex-shrink:0}",
  ".order-submit{margin-top:12px}",
  ".res{padding:11px 14px;margin-top:10px;font-size:11px;letter-spacing:1px;animation:si .3s ease}",
  ".res.good{background:rgba(0,255,157,.07);border:1px solid rgba(0,255,157,.3);color:var(--good)}",
  ".res.partial{background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.3);color:var(--gold)}",
  ".res.bad{background:rgba(255,64,96,.07);border:1px solid rgba(255,64,96,.3);color:var(--bad)}",
  "@keyframes si{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}",
  ".pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--good);margin-right:6px;animation:bpulse 2s infinite;vertical-align:middle}",
  "@keyframes bpulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,157,.4)}70%{box-shadow:0 0 0 6px rgba(0,255,157,0)}}",
].join("\n");

// ─── Text Answer ──────────────────────────────────────────────────────────────
function TextAnswer({ question, onSubmit, submitting }) {
  const [answer, setAnswer] = useState("");
  return (
    <div>
      {Array.isArray(question.expectedAnswer) && (
        <div className="valid-hint">
          Accepted: {question.expectedAnswer.join(" / ")}
        </div>
      )}
      <div className="arow">
        <input
          className="ainp"
          placeholder="Type your answer..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && answer.trim() && onSubmit(answer)}
        />
        <button className="btn" onClick={() => onSubmit(answer)}
          disabled={submitting || !answer.trim()}>
          {submitting ? "Saving..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

// ─── Single Choice ────────────────────────────────────────────────────────────
function SingleChoice({ question, onSubmit, submitting, result }) {
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
          <button key={i}
            className={"choice-btn " + btnClass(opt)}
            onClick={() => !result && setSelected(opt)}
            disabled={!!result}>
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

// ─── Multi Select ─────────────────────────────────────────────────────────────
function MultiSelect({ question, onSubmit, submitting, result }) {
  const [checked, setChecked] = useState([]);

  const toggle = (opt) => {
    if (result) return;
    setChecked((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const btnClass = (opt) => {
    if (!result) return checked.includes(opt) ? "checked" : "";
    const isCorrect = question.expectedAnswer.includes(opt);
    const isSelected = checked.includes(opt);
    if (isCorrect && isSelected) return "reveal-correct";   // ticked + right ✅
    if (!isCorrect && isSelected) return "reveal-wrong";    // ticked + wrong ❌
    if (isCorrect && !isSelected) return "reveal-missed";   // missed correct 🟡
    return "";
  };

  const revealIcon = (opt) => {
    if (!result) return checked.includes(opt) ? "✓" : "";
    const isCorrect = question.expectedAnswer.includes(opt);
    const isSelected = checked.includes(opt);
    if (isCorrect && isSelected) return "✓";
    if (!isCorrect && isSelected) return "✗";
    if (isCorrect && !isSelected) return "!";
    return "";
  };

  return (
    <div>
      <div className="multi-label">Select ALL that apply</div>
      <div className="multi-choices">
        {question.options.map((opt, i) => (
          <button key={i}
            className={"multi-btn " + btnClass(opt)}
            onClick={() => toggle(opt)}
            disabled={!!result}>
            <div className="checkbox">{revealIcon(opt)}</div>
            <span style={{ color: "var(--dim)", marginRight: 6, flexShrink: 0 }}>
              {String.fromCharCode(65 + i)}.
            </span>
            {opt}
          </button>
        ))}
      </div>
      {!result && (
        <div>
          <div className="multi-counter">
            {checked.length} selected — select all bugs you can find
          </div>
          <button className="btn multi-submit" onClick={() => onSubmit(checked)}
            disabled={submitting || checked.length === 0}>
            {submitting ? "Checking..." : "Submit Selection"}
          </button>
        </div>
      )}
      {result && (
        <div className="multi-counter" style={{ marginTop: 8 }}>
          ✓ correct  ✗ wrong pick  ! missed
        </div>
      )}
    </div>
  );
}

// ─── Drag & Drop Order ────────────────────────────────────────────────────────
function DragOrderAnswer({ question, onSubmit, submitting, result }) {
  const [blocks, setBlocks] = useState(() =>
    question.blocks.map((text, i) => ({ id: i, text })).sort(() => Math.random() - 0.5)
  );
  const dragIdx = useRef(null);

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
      <div className="order-label">Drag blocks into the correct order</div>
      <div className="blocks-list">
        {blocks.map((block, i) => (
          <div key={block.id} className="block-item"
            draggable={!result}
            onDragStart={() => { dragIdx.current = i; }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            style={
              result && result.correct ? { borderColor: "var(--good)", color: "var(--good)" }
              : result ? { borderColor: "var(--bad)", color: "var(--bad)" }
              : {}
            }>
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
    choice: "Single Choice",
    multi: "Multi-Select",
    order: "Drag & Drop",
  };

  const resClass = result
    ? (result.correct ? "good" : result.pointsAwarded > 0 ? "partial" : "bad")
    : "";

  return (
    <div className="card dtl">
      <div style={{ marginBottom: 12 }}>
        <span className={"type-badge " + question.type}>
          {question.imageUrl ? "Image + " : ""}
          {typeLabel[question.type] || question.type}
        </span>
      </div>
      <div className="dtitle">{question.title}</div>

      {question.imageUrl && (
        <img src={question.imageUrl} alt="Question" className="q-image" />
      )}
      {question.description && (
        <pre className="code">{question.description}</pre>
      )}
      {question.hint && (
        <div className="hint">Hint: {question.hint}</div>
      )}

      {question.type === "text" && (
        <TextAnswer question={question} onSubmit={onAnswer} submitting={submitting} />
      )}
      {question.type === "choice" && (
        <SingleChoice question={question} onSubmit={onAnswer} submitting={submitting} result={result} />
      )}
      {question.type === "multi" && (
        <MultiSelect question={question} onSubmit={onAnswer} submitting={submitting} result={result} />
      )}
      {question.type === "order" && (
        <DragOrderAnswer question={question} onSubmit={onAnswer} submitting={submitting} result={result} />
      )}

      {result && (
        <div className={"res " + resClass}>
          {result.feedback}
          {result.pointsAwarded > 0 && !result.correct && (
            <div className="partial-score">+{result.pointsAwarded} pts awarded (partial)</div>
          )}
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

  const questions = QUESTIONS_CONFIG.map(function(q) {
    var copy = Object.assign({}, q);
    delete copy.expectedAnswer;
    return copy;
  });
  const totalPts = QUESTIONS_CONFIG.reduce((s, q) => s + q.points, 0);

  const typeBadgeColor = (type) => {
    if (type === "text") return "var(--accent)";
    if (type === "choice") return "var(--purple)";
    if (type === "multi") return "var(--teal)";
    if (type === "order") return "var(--gold)";
    return "var(--accent)";
  };
  const typeIcon = (type) => {
    if (type === "text") return "✏";
    if (type === "choice") return "◉";
    if (type === "multi") return "☑";
    if (type === "order") return "⠿";
    return "✏";
  };

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
        if (taken) { setRegError("That name is taken. Choose another."); setRegistering(false); return; }
      }
      const newPlayer = {
        id: "p_" + Date.now(),
        name: trimmed, score: 0, attempts: 0,
        correctAnswers: 0, joinedAt: new Date().toISOString(),
      };
      await db.set("players/" + newPlayer.id, newPlayer);
      setPlayer(newPlayer);
    } catch (e) {
      setRegError("Cannot connect to Firebase. Check your database URL and rules.");
    }
    setRegistering(false);
  };

  const handleAnswer = async (answer) => {
    if (!selected || submitting) return;
    if (!answer || (Array.isArray(answer) && answer.length === 0)) return;
    setSubmitting(true);

    const question = QUESTIONS_CONFIG.find((q) => q.id === selected.id);
    const evaluation = ScoringEngine.evaluate(question, answer);

    const updated = {
      ...player,
      attempts: player.attempts + 1,
      score: player.score + evaluation.pointsAwarded,
      correctAnswers: player.correctAnswers + (evaluation.correct ? 1 : 0),
    };
    await db.set("players/" + player.id, updated);
    setPlayer(updated);

    setResults((prev) => Object.assign({}, prev, { [selected.id]: evaluation }));

    // Mark as solved if fully correct OR partial points earned (question attempted)
    if (evaluation.correct || evaluation.pointsAwarded > 0) {
      setSolvedIds((prev) => [...prev, selected.id]);
    }
    setSubmitting(false);
  };

  if (!player) return (
    <React.Fragment>
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
              Welcome to Bug Hunt. Answer text, image, single choice,
              multi-select and drag-and-drop questions to earn points.
              Scores sync live to the leaderboard on any device.
            </p>
            <label className="lbl">Callsign</label>
            <input className="inp" placeholder="e.g. nullPointerNinja"
              value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()} autoFocus />
            {regError && <div className="err">{regError}</div>}
            <div className="mt14">
              <button className="btn" onClick={handleRegister}
                disabled={registering || !name.trim()}>
                {registering ? "Connecting..." : "Enter the Arena"}
              </button>
            </div>
          </div>
        </div>
        <div className="card" style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "var(--dim)", marginBottom: 12 }}>
            QUESTION TYPES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["text", "choice", "multi", "order"].map((type) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
                <span style={{ color: typeBadgeColor(type), fontSize: 14 }}>{typeIcon(type)}</span>
                <span style={{ color: "var(--text)" }}>
                  {type === "text" && "Text — type your answer"}
                  {type === "choice" && "Single Choice — pick one option"}
                  {type === "multi" && "Multi-Select — tick all that apply (partial scoring)"}
                  {type === "order" && "Drag & Drop — arrange in order"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  );

  return (
    <React.Fragment>
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
            {player.name}
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
          const isActive = selected && selected.id === q.id;
          const result = results[q.id];
          return (
            <div key={q.id}>
              <div
                className={"qcard" + (isSolved ? " solved" : "") + (isActive ? " active" : "")}
                onClick={() => { if (!isSolved) setSelected(q); }}
              >
                <div className="qpts">{q.points}<br />PTS</div>
                <div style={{ flex: 1 }}>
                  <div className="qtitle">{q.title}</div>
                  <div className="qmeta">
                    <span style={{ fontSize: 10, color: typeBadgeColor(q.type) }}>
                      {typeIcon(q.type)} {q.type.toUpperCase()}
                    </span>
                    {q.imageUrl && <span style={{ fontSize: 10, color: "var(--good)" }}>IMG</span>}
                    <span className={"qstatus" + (isSolved ? " ok" : "")}>
                      {isSolved ? "SOLVED" : "UNSOLVED"}
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
    </React.Fragment>
  );
}
