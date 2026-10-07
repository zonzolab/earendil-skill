#!/usr/bin/env node
// Calls the Eärendil MCP server from a shell, for agents or scripts that do
// not speak MCP natively. Same tools, same results. Zero dependencies.
//
//   export EARENDIL_API_KEY=earendil_…            # Agent → Connect in the studio
//   export EARENDIL_URL=https://earendil.studio   # optional
//   node earendil.mjs tools                        # list the tools
//   node earendil.mjs call get_project '{"project_id":"prj_…"}'
//   node earendil.mjs call listen '{"project_id":"prj_…","clip_id":"clip_…"}' > heard.json
//   node earendil.mjs download <export url> guide.wav

import { writeFileSync } from "node:fs";

const base = (process.env.EARENDIL_URL || "https://earendil.studio").replace(/\/+$/, "");
const key = process.env.EARENDIL_API_KEY || "";

async function rpc(method, params) {
  if (!key.startsWith("earendil_")) throw new Error("Set EARENDIL_API_KEY to an agent key (earendil_…).");
  const res = await fetch(`${base}/api/mcp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, ...(params ? { params } : {}) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  if (body.error) throw new Error(body.error.message);
  return body.result;
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "tools") {
    const { tools } = await rpc("tools/list");
    for (const tool of tools) console.log(`${tool.name.padEnd(16)} ${tool.description}`);
  } else if (command === "call") {
    const [name, args = "{}"] = rest;
    const result = await rpc("tools/call", { name, arguments: JSON.parse(args) });
    if (result.isError) {
      console.error(result.content?.[0]?.text ?? "The tool failed.");
      process.exit(1);
    }
    console.log(JSON.stringify(result.structuredContent ?? result.content, null, 2));
  } else if (command === "download") {
    const [url, file] = rest;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(file);
  } else {
    console.error("Usage: earendil.mjs tools | call <tool> '<json>' | download <url> <file>");
    process.exit(2);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
