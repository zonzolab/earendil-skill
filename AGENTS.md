# earendil-skill

Public repository (`zonzolab/earendil-skill`, MIT) with the agent skill and Claude Code plugin for Eärendil studio's MCP server. The server itself lives in the private `zonzolab/earendil-studio` repository (`server/mcp.ts`, `server/agent.ts`).

## Layout

- `skills/earendil/SKILL.md`: the workflow the agent follows. Keep it about doing the work (workflow, fix recipes, studio etiquette); argument details belong in `references/tools.md`.
- `skills/earendil/references/tools.md`: generated from the server's `tools/list`. When tools change in the studio, regenerate it from a running server instead of editing by hand.
- `skills/earendil/scripts/`: zero-dependency Node ESM tools (`split-script.mjs`, `check-transcript.mjs`, `earendil.mjs`). No npm dependencies: agents run them straight from the skill folder.
- `.claude-plugin/plugin.json` + `marketplace.json` + `.mcp.json`: the Claude Code plugin. The agent key is a `sensitive` `userConfig` value referenced as `${user_config.api_key}`; never commit a real key, screenshot or log containing one.

## Rules

- Everything in this repository is public and in English.
- Run `npm test` and `claude plugin validate .` before pushing.
- The public endpoint is `https://earendil.studio/api/mcp`; keep README, plugin defaults and SKILL.md in sync with it.
