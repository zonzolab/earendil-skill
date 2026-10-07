#!/usr/bin/env node
// Compares the text a take should say with what `listen` heard, and lists
// every word that is extra, missing or different, with timeline times and a
// suggested fix. Zero dependencies.
//
//   node check-transcript.mjs --text take.txt --heard listen.json
//   node check-transcript.mjs --text "Benvenuti nella valle." --heard listen.json
//   cat listen.json | node check-transcript.mjs --text take.txt
//
// `--heard` is the JSON `listen` returned (or just its transcript.words array).
// Exit code 0 when the take reads clean, 1 when there are issues.

import { existsSync, readFileSync } from "node:fs";

const MARGIN = 0.02;

/** Lowercase, accents folded, punctuation dropped; hyphens split words. */
export function normalize(word) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{N}'\s-]/gu, "")
    .replace(/^'+|'+$/g, "");
}

export function tokenize(text) {
  return text
    .split(/\s+/)
    .flatMap((raw) => normalize(raw).split("-").map((word) => ({ raw, word })))
    .filter((token) => token.word);
}

export function heardTokens(words) {
  return words.flatMap(([raw, start, end]) =>
    normalize(String(raw))
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((word) => ({ raw: String(raw), word, start, end })),
  );
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const kept = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = kept;
    }
  }
  return row[b.length];
}

export function similarity(a, b) {
  if (a === b) return 1;
  return 1 - distance(a, b) / Math.max(a.length, b.length, 1);
}

const hasDigit = (word) => /\d/.test(word);

/** Word-level alignment (weighted edit distance) of expected against heard. */
export function align(expected, heard) {
  const n = expected.length;
  const m = heard.length;
  const cost = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 1; i <= n; i += 1) cost[i][0] = i;
  for (let j = 1; j <= m; j += 1) cost[0][j] = j;
  const substitution = (a, b) => (a === b ? 0 : hasDigit(a) || hasDigit(b) ? 0.6 : 1.4 * (1 - similarity(a, b)) + 0.3);
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      cost[i][j] = Math.min(
        cost[i - 1][j] + 1,
        cost[i][j - 1] + 1,
        cost[i - 1][j - 1] + substitution(expected[i - 1].word, heard[j - 1].word),
      );
    }
  }
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && cost[i][j] === cost[i - 1][j - 1] + substitution(expected[i - 1].word, heard[j - 1].word)) {
      ops.push({ type: expected[i - 1].word === heard[j - 1].word ? "same" : "changed", expected: expected[i - 1], heard: heard[j - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || cost[i][j] === cost[i][j - 1] + 1)) {
      ops.push({ type: "extra", heard: heard[j - 1] });
      j -= 1;
    } else {
      ops.push({ type: "missing", expected: expected[i - 1] });
      i -= 1;
    }
  }
  return ops.reverse();
}

const round = (value) => Math.round(value * 1000) / 1000;

/** Turns the alignment into issues an agent can act on. Numbers spelled out
 *  ("80" heard as "ottanta") are reported as info, near misses ("carcare"
 *  heard as "calcare") as warnings to confirm with a narrow listen, extra and
 *  missing words as errors. */
export function review(text, words) {
  const ops = align(tokenize(text), heardTokens(words));
  const issues = [];
  ops.forEach((op, index) => {
    if (op.type === "same") return;
    const before = ops.slice(0, index).reverse().find((each) => each.heard)?.heard;
    const after = ops.slice(index + 1).find((each) => each.heard)?.heard;
    if (op.type === "extra") {
      const start = round(Math.max(before?.end ?? op.heard.start - 0.1, op.heard.start - 0.15) + MARGIN);
      const end = round(Math.min(after?.start ?? op.heard.end + 0.1, op.heard.end + 0.15) - MARGIN);
      issues.push({
        severity: "error",
        type: "extra",
        heard: op.heard.raw,
        at: [op.heard.start, op.heard.end],
        fix: { tool: "cut_range", start: Math.min(start, op.heard.start), end: Math.max(end, op.heard.end), ripple: true },
        hint: "Confirm with a narrow listen first, then cut it.",
      });
      return;
    }
    if (op.type === "missing") {
      issues.push({
        severity: "error",
        type: "missing",
        expected: op.expected.raw,
        near: before ? before.end : after ? after.start : null,
        hint: "The voice skipped it: regenerate the sentence and replace it.",
      });
      return;
    }
    const numeric = hasDigit(op.expected.word) || hasDigit(op.heard.word);
    const close = similarity(op.expected.word, op.heard.word);
    issues.push({
      severity: numeric ? "info" : close >= 0.7 ? "warning" : "error",
      type: numeric ? "number" : "changed",
      expected: op.expected.raw,
      heard: op.heard.raw,
      at: [op.heard.start, op.heard.end],
      ...(numeric
        ? { hint: "A number read in words: fine if it sounds right." }
        : close >= 0.7
          ? { hint: "Near miss: transcription often mishears rare words. Re-listen from 0.5 s before; regenerate only if it is heard wrong again." }
          : { hint: "Likely wrong word or mispronunciation: regenerate the sentence (respell it if it repeats)." }),
    });
  });
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return { ok: errors === 0 && warnings === 0, words: { expected: tokenize(text).length, heard: heardTokens(words).length }, errors, warnings, issues };
}

function flag(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readHeard(source) {
  const raw = source ? readFileSync(source, "utf8") : readFileSync(0, "utf8");
  const parsed = JSON.parse(raw);
  const result = parsed.structuredContent ?? parsed;
  const words = Array.isArray(result) ? result : result.transcript?.words;
  if (!Array.isArray(words)) throw new Error("No transcript.words in the listen result (was transcribe false?).");
  return words;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const textArg = flag("text");
  if (!textArg) {
    console.error("Usage: check-transcript.mjs --text <file|text> [--heard listen.json]");
    process.exit(2);
  }
  const text = existsSync(textArg) ? readFileSync(textArg, "utf8") : textArg;
  const report = review(text, readHeard(flag("heard")));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
