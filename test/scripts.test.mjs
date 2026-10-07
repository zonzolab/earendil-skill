import { test } from "node:test";
import assert from "node:assert/strict";
import { review, tokenize } from "../skills/earendil/scripts/check-transcript.mjs";
import { splitScript } from "../skills/earendil/scripts/split-script.mjs";

const take = "Una discarica a cielo aperto, dove si accumulavano rifiuti. Profondo fino a 80 metri.";

test("a clean take reads ok, numbers spelled out are only info", () => {
  const words = [["Una", 1, 1.1], ["discarica", 1.2, 1.7], ["a", 1.75, 1.8], ["cielo", 1.85, 2.1], ["aperto,", 2.15, 2.6], ["dove", 2.7, 2.9], ["si", 2.95, 3], ["accumulavano", 3.05, 3.6], ["rifiuti.", 3.65, 4.1], ["Profondo", 4.6, 5], ["fino", 5.05, 5.25], ["a", 5.3, 5.33], ["ottanta", 5.4, 5.8], ["metri.", 5.85, 6.2]];
  const report = review(take, words);
  assert.equal(report.ok, true);
  assert.deepEqual(report.issues.map((issue) => [issue.severity, issue.expected, issue.heard]), [["info", "80", "ottanta"]]);
});

test("an extra word becomes a cut between its neighbours", () => {
  const words = [["Una", 34.04, 34.16], ["discarica", 34.22, 34.8], ["ma", 34.86, 35.16], ["a", 35.18, 35.22], ["cielo", 35.3, 35.54], ["aperto", 35.58, 36.1]];
  const report = review("Una discarica a cielo aperto", words);
  assert.equal(report.errors, 1);
  const [issue] = report.issues;
  assert.equal(issue.type, "extra");
  assert.deepEqual(issue.fix, { tool: "cut_range", start: 34.82, end: 35.16, ripple: true });
});

test("a near miss is a warning, a different word an error, a skipped word missing", () => {
  const near = review("latomie, carcare, lavatoi", [["latomie,", 1, 1.5], ["calcare,", 1.6, 2.1], ["lavatoi", 2.2, 2.7]]);
  assert.equal(near.issues[0].severity, "warning");
  const wrong = review("latomie, carcare, lavatoi", [["latomie,", 1, 1.5], ["cartoni,", 1.6, 2.1], ["lavatoi", 2.2, 2.7]]);
  assert.equal(wrong.issues[0].severity, "error");
  const skipped = review("latomie, carcare, lavatoi", [["latomie,", 1, 1.5], ["lavatoi", 2.2, 2.7]]);
  assert.deepEqual([skipped.issues[0].type, skipped.issues[0].expected, skipped.issues[0].near], ["missing", "carcare,", 1.5]);
});

test("tokenizing folds accents, quotes and hyphens", () => {
  assert.deepEqual(tokenize('i "custari", post-sisma, città').map((token) => token.word), ["i", "custari", "post", "sisma", "citta"]);
});

test("splits paragraphs, and long ones at sentence ends, without changing a word", () => {
  const text = "Prima frase. Seconda frase lunga.\n\nTerzo paragrafo.";
  assert.deepEqual(splitScript(text, 600), ["Prima frase. Seconda frase lunga.", "Terzo paragrafo."]);
  assert.deepEqual(splitScript(text, 20), ["Prima frase.", "Seconda frase lunga.", "Terzo paragrafo."]);
  assert.equal(splitScript(text, 20).join(" "), text.replace(/\n\n/, " "));
});
