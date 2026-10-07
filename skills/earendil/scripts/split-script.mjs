#!/usr/bin/env node
// Splits a narration script into takes: one per paragraph, and long
// paragraphs at sentence ends, so each take can be listened to and fixed on
// its own. The words are never changed. Zero dependencies.
//
//   node split-script.mjs script.txt [--max 600]
//   echo "…" | node split-script.mjs - --max 450
//
// Prints a JSON array of strings, in order.

import { readFileSync } from "node:fs";

const SENTENCE = /(?<=[.!?…»”"])\s+(?=[\p{Lu}«“"(\d])/u;

export function splitScript(text, max = 600) {
  const takes = [];
  for (const paragraph of text.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const clean = paragraph.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    if (clean.length <= max) {
      takes.push(clean);
      continue;
    }
    let current = "";
    for (const sentence of clean.split(SENTENCE)) {
      if (current && current.length + 1 + sentence.length > max) {
        takes.push(current);
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current) takes.push(current);
  }
  return takes;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = process.argv[2];
  if (!source) {
    console.error("Usage: split-script.mjs <file|-> [--max 600]");
    process.exit(2);
  }
  const index = process.argv.indexOf("--max");
  const max = index >= 0 ? Number(process.argv[index + 1]) : 600;
  const text = readFileSync(source === "-" ? 0 : source, "utf8");
  console.log(JSON.stringify(splitScript(text, max), null, 2));
}
