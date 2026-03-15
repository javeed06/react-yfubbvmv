/**
 * BUG HUNT — STYLISH MOBILE-FIRST GAME APP
 * Aesthetic: Neon glassmorphism — bold gradients, frosted cards, smooth animations
 * Mobile-first: bottom nav, large touch targets, safe area padding
 */

import React, { useState, useRef, useEffect } from "react";

const FIREBASE_URL = "https://bughunt-e86fb-default-rtdb.europe-west1.firebasedatabase.app";

// =============================================================================
// QUESTIONS — edit here only
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
    description: "As a QA you are expecting Camt.054D message that needs to be delivered to the customer, but you do not find anything in the downstream applications. Which application will you look at?",
    hint: "Look at the application which generates statements.",
    options: ["821", "PAS", "FTMCPP", "PDS"],
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
  {
    id: "q4",
    type: "multi",
    title: "SEPA Instant Icon",
    description: "Look at the Payment data in the image below.\nSelect ALL the bugs you can find:",
    imageUrl: "/react-yfubbvmv/SEPAIP.png",
    hint: "There may be more than one bug!",
    options: [
      "Creditor can not be DNB Norway (creditor)",
      "Currency should be EUR, no exchange allowed (currency)",
      "Date should be today's date",
      "Both structured remittance and unstructured remittance present",
      "NO Bug! Everything looks ok",
    ],
    expectedAnswer: [
      "Creditor can not be DNB Norway (creditor)",
      "Currency should be EUR, no exchange allowed (currency)",
      "Date should be today's date",
      "Both structured remittance and unstructured remittance present",
    ],
    points: 150,
  },
  {
    id: "q5",
    type: "choice",
    title: "The Bug Terminator",
    description: "Why does this RIX payments message fail business rules although it matches the schema?\n\n  <ClrSysRef>RIX</ClrSysRef>\n  <IntrBkSttlmAmt Ccy=\"EUR\">34000</IntrBkSttlmAmt>",
    hint: "Look at the tags carefully.",
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

const ScoringEngine = {
  evaluate(question, answer) {
    const clean = (s) => s.trim().toLowerCase().replace(/['"`;]/g, "");

    if (question.type === "order") {
      const correct = answer.trim() === question.expectedAnswer.trim();
      return { correct, pointsAwarded: correct ? question.points : 0,
        feedback: correct ? "Perfect order!" : "Not quite — try again." };
    }

    if (question.type === "multi") {
      const wrongPicks = answer.filter((s) => !question.expectedAnswer.includes(s));
      const rightPicks = answer.filter((s) => question.expectedAnswer.includes(s));
      if (wrongPicks.length > 0) {
        return { correct: false, pointsAwarded: 0,
          feedback: wrongPicks.length + " wrong pick(s) — 0 pts." };
      }
      const ptsEach = Math.floor(question.points / question.expectedAnswer.length);
      const awarded = ptsEach * rightPicks.length;
      const allCorrect = rightPicks.length === question.expectedAnswer.length;
      return {
        correct: allCorrect, pointsAwarded: awarded,
        feedback: allCorrect
          ? "All " + question.expectedAnswer.length + " bugs found!"
          : rightPicks.length + "/" + question.expectedAnswer.length + " bugs found. +" + awarded + " pts",
      };
    }

    if (Array.isArray(question.expectedAnswer)) {
      const correct = question.expectedAnswer.some((v) => clean(answer) === clean(v));
      return { correct, pointsAwarded: correct ? question.points : 0,
        feedback: correct ? "Correct!" : "Not quite." };
    }

    const correct = clean(answer) === clean(question.expectedAnswer);
    return { correct, pointsAwarded: correct ? question.points : 0,
      feedback: correct ? "Correct!" : "Not quite." };
  },
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const TYPE_META = {
  text:   { color: "#38bdf8", bg: "rgba(56,189,248,0.12)",   label: "Type Answer",    icon: "pencil" },
  choice: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)",  label: "Single Choice",  icon: "radio" },
  multi:  { color: "#34d399", bg: "rgba(52,211,153,0.12)",   label: "Multi-Select",   icon: "check" },
  order:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",   label: "Drag & Drop",    icon: "sort" },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color = "currentColor" }) {
  const icons = {
    pencil: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    radio: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0",
    check: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    sort: "M3 6h18M6 12h12M9 18h6",
    trophy: "M8 21h8m-4-4v4M5 3H3v5a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V3h-2M5 3v5m14-5v5",
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 0-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1m6 0h-6",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1",
    bug: "M8 2v2m8-2v2M3 8h18M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M3 14h2m14 0h2M3 18h2m14 0h2",
    img: "M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z",
    star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z",
    grip: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
  };
  const d = icons[name] || icons.bug;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split("M").filter(Boolean).map((seg, i) => (
        <path key={i} d={"M" + seg} />
      ))}
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = [
  "@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');",
  "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
  ":root {",
  "  --bg: #080b14;",
  "  --bg2: #0d1120;",
  "  --glass: rgba(255,255,255,0.04);",
  "  --glass2: rgba(255,255,255,0.07);",
  "  --border: rgba(255,255,255,0.08);",
  "  --border2: rgba(255,255,255,0.14);",
  "  --cyan: #22d3ee;",
  "  --violet: #a78bfa;",
  "  --green: #34d399;",
  "  --amber: #fbbf24;",
  "  --rose: #fb7185;",
  "  --sky: #38bdf8;",
  "  --text: #e2e8f0;",
  "  --muted: #64748b;",
  "  --dim: #334155;",
  "  --sans: 'Syne', sans-serif;",
  "  --mono: 'JetBrains Mono', monospace;",
  "  --radius: 16px;",
  "  --radius-sm: 10px;",
  "  --nav-h: 72px;",
  "}",
  "html { font-size: 16px; -webkit-tap-highlight-color: transparent; }",
  "body { background: var(--bg); color: var(--text); font-family: var(--sans); min-height: 100vh; min-height: 100dvh; overflow-x: hidden; }",

  /* ── Background mesh ── */
  ".bg-mesh { position: fixed; inset: 0; pointer-events: none; z-index: 0;",
  "  background: radial-gradient(ellipse 80% 60% at 20% -10%, rgba(34,211,238,0.08) 0%, transparent 60%),",
  "              radial-gradient(ellipse 60% 50% at 80% 110%, rgba(167,139,250,0.08) 0%, transparent 60%),",
  "              radial-gradient(ellipse 40% 40% at 50% 50%, rgba(251,191,36,0.03) 0%, transparent 70%); }",
  ".grain { position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025;",
  "  background-image: url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\"); background-size: 180px; }",

  /* ── Layout ── */
  ".app { position: relative; z-index: 1; max-width: 480px; margin: 0 auto; padding: 0 16px; padding-bottom: calc(var(--nav-h) + 24px + env(safe-area-inset-bottom)); min-height: 100vh; min-height: 100dvh; }",

  /* ── Header ── */
  ".page-header { padding: 20px 0 8px; display: flex; align-items: center; justify-content: space-between; }",
  ".logo-mark { display: flex; align-items: center; gap: 10px; }",
  ".logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--cyan), var(--violet)); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(34,211,238,0.3); }",
  ".logo-text { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(90deg, var(--cyan), var(--violet)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }",
  ".live-pill { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2); font-size: 11px; font-weight: 600; color: var(--green); letter-spacing: 0.5px; }",
  ".live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: livepulse 2s infinite; }",
  "@keyframes livepulse { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); } 50% { box-shadow: 0 0 0 5px rgba(52,211,153,0); } }",

  /* ── Score strip ── */
  ".score-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }",
  ".score-cell { background: var(--glass); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 8px; text-align: center; backdrop-filter: blur(12px); }",
  ".score-cell .val { font-size: 22px; font-weight: 800; font-family: var(--mono); color: var(--cyan); line-height: 1; }",
  ".score-cell .lbl { font-size: 9px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }",

  /* ── Section heading ── */
  ".section-heading { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; margin: 20px 0 10px; }",

  /* ── Question card ── */
  ".q-card { border-radius: var(--radius); border: 1px solid var(--border); background: var(--glass); backdrop-filter: blur(16px); padding: 16px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }",
  ".q-card::before { content: ''; position: absolute; inset: 0; border-radius: var(--radius); opacity: 0; transition: opacity 0.2s; }",
  ".q-card:active { transform: scale(0.98); }",
  ".q-card.active { border-color: var(--border2); background: var(--glass2); }",
  ".q-card.solved { opacity: 0.5; cursor: default; }",
  ".q-card-inner { display: flex; align-items: center; gap: 14px; }",
  ".q-pts-badge { flex-shrink: 0; width: 52px; height: 52px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--mono); }",
  ".q-pts-badge .pts { font-size: 18px; font-weight: 800; line-height: 1; }",
  ".q-pts-badge .pts-label { font-size: 8px; font-weight: 600; letter-spacing: 1px; opacity: 0.7; }",
  ".q-info { flex: 1; min-width: 0; }",
  ".q-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 6px; line-height: 1.3; }",
  ".q-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }",
  ".type-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; border: 1px solid transparent; }",
  ".img-chip { display: inline-flex; align-items: center; gap: 3px; padding: 3px 7px; border-radius: 999px; font-size: 10px; font-weight: 600; color: var(--amber); background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2); }",
  ".status-chip { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; }",
  ".status-chip.solved { color: var(--green); }",
  ".status-chip.unsolved { color: var(--muted); }",
  ".q-arrow { flex-shrink: 0; color: var(--muted); }",

  /* ── Detail panel ── */
  ".detail-panel { border-radius: var(--radius); border: 1px solid var(--border2); background: var(--glass2); backdrop-filter: blur(20px); padding: 20px; margin-bottom: 10px; margin-top: -4px; animation: slideDown 0.25s ease; }",
  "@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }",
  ".detail-type-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }",
  ".detail-type-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }",
  ".q-image { width: 100%; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 14px; max-height: 280px; object-fit: contain; background: rgba(0,0,0,0.4); }",
  ".code-block { background: rgba(0,0,0,0.5); border: 1px solid var(--border); border-left: 3px solid var(--cyan); border-radius: 10px; padding: 14px 16px; font-family: var(--mono); font-size: 12px; line-height: 1.8; color: #94a3b8; white-space: pre-wrap; margin-bottom: 14px; overflow-x: auto; word-break: break-word; }",
  ".hint-box { display: flex; align-items: flex-start; gap: 8px; padding: 12px 14px; border-radius: 10px; background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.15); margin-bottom: 14px; }",
  ".hint-icon { flex-shrink: 0; margin-top: 1px; }",
  ".hint-text { font-size: 12px; color: #d4a849; line-height: 1.5; }",

  /* ── Text input ── */
  ".text-input-wrap { display: flex; flex-direction: column; gap: 10px; }",
  ".text-field { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid var(--border2); border-radius: 12px; color: var(--text); font-family: var(--mono); font-size: 15px; padding: 14px 16px; outline: none; transition: border-color 0.2s; -webkit-appearance: none; }",
  ".text-field:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,0.1); }",
  ".text-field::placeholder { color: var(--muted); }",
  ".accepted-hint { font-size: 10px; color: var(--muted); letter-spacing: 0.3px; }",

  /* ── Primary button ── */
  ".btn-primary { width: 100%; padding: 15px; border-radius: 12px; border: none; font-family: var(--sans); font-size: 14px; font-weight: 700; letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }",
  ".btn-primary:active { transform: scale(0.98); }",
  ".btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }",
  ".btn-primary.cyan { background: linear-gradient(135deg, var(--cyan), #0ea5e9); color: #000; box-shadow: 0 4px 20px rgba(34,211,238,0.25); }",
  ".btn-primary.violet { background: linear-gradient(135deg, var(--violet), #7c3aed); color: #fff; box-shadow: 0 4px 20px rgba(167,139,250,0.25); }",
  ".btn-primary.green { background: linear-gradient(135deg, var(--green), #059669); color: #000; box-shadow: 0 4px 20px rgba(52,211,153,0.25); }",
  ".btn-primary.amber { background: linear-gradient(135deg, var(--amber), #d97706); color: #000; box-shadow: 0 4px 20px rgba(251,191,36,0.25); }",
  ".btn-primary.cyan:hover:not(:disabled) { box-shadow: 0 6px 28px rgba(34,211,238,0.4); }",

  /* ── Single choice ── */
  ".choice-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }",
  ".choice-option { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--border); background: rgba(0,0,0,0.3); color: var(--text); font-family: var(--sans); font-size: 13px; font-weight: 500; text-align: left; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 12px; -webkit-appearance: none; }",
  ".choice-option:active:not(:disabled) { transform: scale(0.99); }",
  ".choice-option.selected { border-color: var(--violet); background: rgba(167,139,250,0.1); color: var(--violet); }",
  ".choice-option.correct { border-color: var(--green); background: rgba(52,211,153,0.1); color: var(--green); }",
  ".choice-option.wrong { border-color: var(--rose); background: rgba(251,113,133,0.1); color: var(--rose); }",
  ".choice-option:disabled { cursor: default; }",
  ".option-letter { width: 24px; height: 24px; border-radius: 6px; background: var(--glass2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; font-family: var(--mono); }",

  /* ── Multi select ── */
  ".multi-hint { font-size: 11px; font-weight: 600; color: var(--green); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px; }",
  ".multi-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }",
  ".multi-option { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--border); background: rgba(0,0,0,0.3); color: var(--text); font-family: var(--sans); font-size: 13px; font-weight: 500; text-align: left; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 12px; -webkit-appearance: none; }",
  ".multi-option:active:not(:disabled) { transform: scale(0.99); }",
  ".multi-option.checked { border-color: var(--green); background: rgba(52,211,153,0.08); color: var(--green); }",
  ".multi-option.reveal-correct { border-color: var(--green); background: rgba(52,211,153,0.1); color: var(--green); }",
  ".multi-option.reveal-wrong { border-color: var(--rose); background: rgba(251,113,133,0.1); color: var(--rose); }",
  ".multi-option.reveal-missed { border-color: var(--amber); background: rgba(251,191,36,0.08); color: var(--amber); }",
  ".multi-option:disabled { cursor: default; }",
  ".checkbox-sq { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 700; transition: background 0.15s; }",
  ".multi-option.checked .checkbox-sq, .multi-option.reveal-correct .checkbox-sq { background: rgba(52,211,153,0.2); }",
  ".multi-option.reveal-wrong .checkbox-sq { background: rgba(251,113,133,0.2); }",
  ".multi-option.reveal-missed .checkbox-sq { background: rgba(251,191,36,0.1); }",
  ".multi-counter { font-size: 11px; color: var(--green); margin-bottom: 10px; font-weight: 600; }",
  ".multi-legend { font-size: 10px; color: var(--muted); margin-top: 10px; }",

  /* ── Drag & drop ── */
  ".order-hint { font-size: 11px; font-weight: 600; color: var(--amber); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px; }",
  ".block-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }",
  ".block-item { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border-radius: 12px; border: 1px solid var(--border); background: rgba(0,0,0,0.35); font-family: var(--mono); font-size: 12px; color: #94a3b8; cursor: grab; user-select: none; transition: all 0.15s; line-height: 1.5; }",
  ".block-item:active { cursor: grabbing; transform: scale(0.99); }",
  ".block-item.drag-correct { border-color: var(--green); color: var(--green); background: rgba(52,211,153,0.06); }",
  ".block-item.drag-wrong { border-color: var(--rose); color: var(--rose); background: rgba(251,113,133,0.06); }",
  ".grip-icon { flex-shrink: 0; color: var(--dim); }",

  /* ── Result banner ── */
  ".result-banner { border-radius: 12px; padding: 14px 16px; margin-top: 14px; font-size: 13px; font-weight: 600; display: flex; align-items: flex-start; gap: 10px; animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }",
  "@keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }",
  ".result-banner.good { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: var(--green); }",
  ".result-banner.partial { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.2); color: var(--amber); }",
  ".result-banner.bad { background: rgba(251,113,133,0.1); border: 1px solid rgba(251,113,133,0.25); color: var(--rose); }",
  ".result-pts { font-size: 11px; font-weight: 500; margin-top: 4px; opacity: 0.8; }",

  /* ── Register page ── */
  ".register-page { display: flex; flex-direction: column; min-height: 100vh; min-height: 100dvh; align-items: center; justify-content: center; padding: 24px 16px; }",
  ".register-card { width: 100%; max-width: 400px; background: var(--glass2); border: 1px solid var(--border); border-radius: 24px; padding: 32px 24px; backdrop-filter: blur(20px); }",
  ".register-logo { text-align: center; margin-bottom: 28px; }",
  ".register-logo .big-logo { font-size: 32px; font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, var(--cyan), var(--violet)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }",
  ".register-logo .tagline { font-size: 13px; color: var(--muted); margin-top: 4px; }",
  ".register-logo .logo-emoji { font-size: 48px; display: block; margin-bottom: 12px; animation: float 3s ease-in-out infinite; }",
  "@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }",
  ".field-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; display: block; }",
  ".text-field-lg { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid var(--border2); border-radius: 14px; color: var(--text); font-family: var(--sans); font-size: 16px; font-weight: 600; padding: 16px 18px; outline: none; transition: all 0.2s; -webkit-appearance: none; }",
  ".text-field-lg:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,0.12); }",
  ".text-field-lg::placeholder { color: var(--dim); font-weight: 400; }",
  ".error-msg { font-size: 12px; color: var(--rose); margin-top: 8px; display: flex; align-items: center; gap: 6px; }",
  ".register-submit { margin-top: 20px; }",
  ".type-legend { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }",
  ".legend-item { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #94a3b8; }",
  ".legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }",

  /* ── Bottom nav ── */
  ".bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; height: calc(var(--nav-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: rgba(8,11,20,0.85); backdrop-filter: blur(20px); border-top: 1px solid var(--border); z-index: 100; display: flex; align-items: flex-start; justify-content: space-around; padding-top: 10px; }",
  ".nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 20px; cursor: pointer; border: none; background: none; color: var(--muted); font-family: var(--sans); font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; transition: color 0.2s; border-radius: 12px; }",
  ".nav-item.active { color: var(--cyan); }",
  ".nav-item:active { opacity: 0.7; }",
  ".nav-icon-wrap { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }",
  ".nav-item.active .nav-icon-wrap { background: rgba(34,211,238,0.12); }",

  /* ── Progress bar ── */
  ".progress-wrap { margin: 4px 0 16px; }",
  ".progress-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }",
  ".progress-track { height: 4px; border-radius: 999px; background: var(--glass2); overflow: hidden; }",
  ".progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--cyan), var(--violet)); transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1); }",
].join("\n");

// ─── Text Answer ──────────────────────────────────────────────────────────────
function TextAnswer({ question, onSubmit, submitting }) {
  const [answer, setAnswer] = useState("");
  return (
    <div className="text-input-wrap">
      {Array.isArray(question.expectedAnswer) && (
        <div className="accepted-hint">Accepted: {question.expectedAnswer.join(" / ")}</div>
      )}
      <input
        className="text-field"
        placeholder="Type your answer here..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && answer.trim() && onSubmit(answer)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <button
        className="btn-primary cyan"
        onClick={() => onSubmit(answer)}
        disabled={submitting || !answer.trim()}
      >
        {submitting ? "Saving..." : "Submit Answer"}
      </button>
    </div>
  );
}

// ─── Single Choice ────────────────────────────────────────────────────────────
function SingleChoice({ question, onSubmit, submitting, result }) {
  const [selected, setSelected] = useState(null);

  const cls = (opt) => {
    if (!result) return selected === opt ? "choice-option selected" : "choice-option";
    if (opt === question.expectedAnswer) return "choice-option correct";
    if (opt === selected) return "choice-option wrong";
    return "choice-option";
  };

  return (
    <div>
      <div className="choice-list">
        {question.options.map((opt, i) => (
          <button key={i} className={cls(opt)}
            onClick={() => !result && setSelected(opt)} disabled={!!result}>
            <div className="option-letter">{String.fromCharCode(65 + i)}</div>
            <span>{opt}</span>
          </button>
        ))}
      </div>
      {!result && (
        <button className="btn-primary violet" onClick={() => onSubmit(selected)}
          disabled={submitting || !selected}>
          {submitting ? "Checking..." : "Submit Answer"}
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

  const cls = (opt) => {
    if (!result) return "multi-option" + (checked.includes(opt) ? " checked" : "");
    const isRight = question.expectedAnswer.includes(opt);
    const isPicked = checked.includes(opt);
    if (isRight && isPicked) return "multi-option reveal-correct";
    if (!isRight && isPicked) return "multi-option reveal-wrong";
    if (isRight && !isPicked) return "multi-option reveal-missed";
    return "multi-option";
  };

  const icon = (opt) => {
    if (!result) return checked.includes(opt) ? "+" : "";
    const isRight = question.expectedAnswer.includes(opt);
    const isPicked = checked.includes(opt);
    if (isRight && isPicked) return "v";
    if (!isRight && isPicked) return "x";
    if (isRight && !isPicked) return "!";
    return "";
  };

  return (
    <div>
      <div className="multi-hint">Select all that apply</div>
      <div className="multi-list">
        {question.options.map((opt, i) => (
          <button key={i} className={cls(opt)} onClick={() => toggle(opt)} disabled={!!result}>
            <div className="checkbox-sq">{icon(opt)}</div>
            <div className="option-letter" style={{ background: "transparent", border: "none", color: "inherit", fontSize: 11, fontWeight: 700, width: 20, flexShrink: 0 }}>
              {String.fromCharCode(65 + i)}
            </div>
            <span style={{ flex: 1, textAlign: "left" }}>{opt}</span>
          </button>
        ))}
      </div>
      {!result ? (
        <div>
          <div className="multi-counter">{checked.length} selected</div>
          <button className="btn-primary green" onClick={() => onSubmit(checked)}
            disabled={submitting || checked.length === 0}>
            {submitting ? "Checking..." : "Submit Selection"}
          </button>
        </div>
      ) : (
        <div className="multi-legend">v = correct  x = wrong  ! = missed</div>
      )}
    </div>
  );
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
function DragOrder({ question, onSubmit, submitting, result }) {
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

  const blockCls = () => {
    if (!result) return "block-item";
    return result.correct ? "block-item drag-correct" : "block-item drag-wrong";
  };

  return (
    <div>
      <div className="order-hint">Drag to reorder</div>
      <div className="block-list">
        {blocks.map((block, i) => (
          <div key={block.id} className={blockCls()}
            draggable={!result}
            onDragStart={() => { dragIdx.current = i; }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}>
            <div className="grip-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/>
                <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/>
                <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <span>{block.text}</span>
          </div>
        ))}
      </div>
      {!result && (
        <button className="btn-primary amber" onClick={() => onSubmit(getAnswer())} disabled={submitting}>
          {submitting ? "Checking..." : "Submit Order"}
        </button>
      )}
    </div>
  );
}

// ─── Question Detail ──────────────────────────────────────────────────────────
function QuestionDetail({ question, onAnswer, submitting, result }) {
  const meta = TYPE_META[question.type] || TYPE_META.text;
  const resClass = result
    ? (result.correct ? "good" : result.pointsAwarded > 0 ? "partial" : "bad")
    : "";

  return (
    <div className="detail-panel">
      <div className="detail-type-row">
        <div className="detail-type-badge"
          style={{ background: meta.bg, color: meta.color, border: "1px solid " + meta.color + "33" }}>
          {meta.label}
        </div>
        {question.imageUrl && (
          <div className="img-chip">
            <Icon name="img" size={11} color="currentColor" /> IMG
          </div>
        )}
      </div>

      {question.imageUrl && (
        <img src={question.imageUrl} alt="Question" className="q-image" />
      )}

      {question.description && (
        <div className="code-block">{question.description}</div>
      )}

      {question.hint && (
        <div className="hint-box">
          <div className="hint-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a849" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="hint-text">{question.hint}</div>
        </div>
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
        <DragOrder question={question} onSubmit={onAnswer} submitting={submitting} result={result} />
      )}

      {result && (
        <div className={"result-banner " + resClass}>
          <div>
            <div>{result.feedback}</div>
            {result.pointsAwarded > 0 && (
              <div className="result-pts">+{result.pointsAwarded} points awarded</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Arena Screen ─────────────────────────────────────────────────────────────
function ArenaScreen({ player, setPlayer }) {
  const [solvedIds, setSolvedIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const questions = QUESTIONS_CONFIG.map(function(q) {
    var copy = Object.assign({}, q); delete copy.expectedAnswer; return copy;
  });
  const totalPts = QUESTIONS_CONFIG.reduce((s, q) => s + q.points, 0);
  const progress = Math.round((player.score / totalPts) * 100);

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
    if (evaluation.correct || evaluation.pointsAwarded > 0) {
      setSolvedIds((prev) => [...prev, selected.id]);
    }
    setSubmitting(false);
  };

  return (
    <div className="app">
      <div className="page-header">
        <div className="logo-mark">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <path d="M8 2v2m8-2v2M3 8h18M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M3 14h2m14 0h2"/>
            </svg>
          </div>
          <div className="logo-text">Bug Hunt</div>
        </div>
        <div className="live-pill">
          <div className="live-dot" />
          LIVE
        </div>
      </div>

      <div className="score-strip">
        <div className="score-cell">
          <div className="val">{player.score}</div>
          <div className="lbl">Score</div>
        </div>
        <div className="score-cell">
          <div className="val">{player.correctAnswers}</div>
          <div className="lbl">Solved</div>
        </div>
        <div className="score-cell">
          <div className="val">{player.attempts}</div>
          <div className="lbl">Tries</div>
        </div>
        <div className="score-cell">
          <div className="val" style={{ color: "var(--violet)" }}>{totalPts - player.score}</div>
          <div className="lbl">Left</div>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: progress + "%" }} />
        </div>
      </div>

      <div className="section-heading">Questions</div>

      {questions.map((q) => {
        const meta = TYPE_META[q.type] || TYPE_META.text;
        const isSolved = solvedIds.includes(q.id);
        const isActive = selected && selected.id === q.id;
        const result = results[q.id];

        return (
          <div key={q.id}>
            <div
              className={"q-card" + (isSolved ? " solved" : "") + (isActive ? " active" : "")}
              onClick={() => { if (!isSolved) setSelected(isActive ? null : q); }}
              style={isActive ? { borderColor: meta.color + "44" } : {}}
            >
              <div className="q-card-inner">
                <div className="q-pts-badge"
                  style={{ background: meta.bg, border: "1px solid " + meta.color + "30" }}>
                  <div className="pts" style={{ color: meta.color }}>{q.points}</div>
                  <div className="pts-label" style={{ color: meta.color }}>PTS</div>
                </div>
                <div className="q-info">
                  <div className="q-title">{q.title}</div>
                  <div className="q-meta">
                    <div className="type-chip"
                      style={{ color: meta.color, background: meta.bg, borderColor: meta.color + "30" }}>
                      {meta.label}
                    </div>
                    {q.imageUrl && (
                      <div className="img-chip">IMG</div>
                    )}
                    <div className={"status-chip " + (isSolved ? "solved" : "unsolved")}>
                      {isSolved ? "DONE" : "OPEN"}
                    </div>
                  </div>
                </div>
                {!isSolved && (
                  <div className="q-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={isActive ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                    </svg>
                  </div>
                )}
              </div>
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
  );
}

// ─── Register Screen ──────────────────────────────────────────────────────────
function RegisterScreen({ onRegister }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError("Name must be at least 2 characters."); return; }
    setLoading(true);
    try {
      const existing = await db.get("players");
      if (existing) {
        const taken = Object.values(existing).some(
          (p) => p.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (taken) { setError("That name is taken. Try another."); setLoading(false); return; }
      }
      const newPlayer = {
        id: "p_" + Date.now(),
        name: trimmed, score: 0, attempts: 0,
        correctAnswers: 0, joinedAt: new Date().toISOString(),
      };
      await db.set("players/" + newPlayer.id, newPlayer);
      onRegister(newPlayer);
    } catch (e) {
      setError("Cannot connect to Firebase. Check your database URL and rules.");
    }
    setLoading(false);
  };

  const legends = [
    { color: "#38bdf8", label: "Text — type your answer" },
    { color: "#a78bfa", label: "Single Choice — pick one" },
    { color: "#34d399", label: "Multi-Select — tick all that apply" },
    { color: "#fbbf24", label: "Drag & Drop — arrange in order" },
  ];

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-logo">
          <span className="logo-emoji">🐛</span>
          <div className="big-logo">PAYMENTS AQA BUG HUNT</div>
          <div className="tagline">Be a QA for a Day & Earn the points.</div>
        </div>

        <label className="field-label">Your callsign</label>
        <input
          className="text-field-lg"
          placeholder="e.g. NullPointerNinja"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          autoComplete="off"
          autoFocus
        />
        {error && (
          <div className="error-msg">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="register-submit">
          <button className="btn-primary cyan" onClick={handleRegister}
            disabled={loading || !name.trim()}>
            {loading ? "Connecting..." : "Enter the Arena"}
          </button>
        </div>

        <div className="type-legend">
          {legends.map((l) => (
            <div key={l.color} className="legend-item">
              <div className="legend-dot" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function GameApp() {
  const [player, setPlayer] = useState(null);

  if (!player) {
    return (
      <React.Fragment>
        <style>{S}</style>
        <div className="bg-mesh" />
        <div className="grain" />
        <RegisterScreen onRegister={setPlayer} />
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <style>{S}</style>
      <div className="bg-mesh" />
      <div className="grain" />
      <ArenaScreen player={player} setPlayer={setPlayer} />
      <nav className="bottom-nav">
        <button className="nav-item active">
          <div className="nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2v2m8-2v2M3 8h18M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M3 14h2m14 0h2"/>
            </svg>
          </div>
          Arena
        </button>
        <button className="nav-item" onClick={() => setPlayer(null)}>
          <div className="nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1"/>
            </svg>
          </div>
          {player.name}
        </button>
      </nav>
    </React.Fragment>
  );
}
