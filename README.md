# Eärendil studio skill

Let an AI agent produce narrated audio in [Eärendil studio](https://earendil.studio): audio guides, voice-overs, podcast segments, course narration. The agent generates speech and **listens back**: it receives the audio itself to judge by ear and, for models that cannot hear, measurements of what a listener notices (unclear words, pace, intonation, loudness, timbre), plus a word-level transcript with timings. It then cuts, joins, moves and fades clips on the timeline, and exports the mix. With **Agent mode** switched on, your studio follows live: it opens the project the agent works on, shows every edit, and really plays what the agent listens to.

This repository contains:

- `skills/earendil/SKILL.md`: the workflow and editing recipes the agent follows (open SKILL.md format, usable by any agent that reads skills).
- `.mcp.json` + `.claude-plugin/`: a Claude Code plugin that installs the skill and configures the Eärendil MCP server in one step.
- `skills/earendil/scripts/`: zero-dependency Node tools the skill uses: split a script into takes, check a take's transcript against its text, call the MCP server from a shell.

## Before you start

1. An Eärendil studio account with an active plan.
2. An **agent key**: in the studio open **Agent → Connect → Agent key** and create one. It is shown once and starts with `earendil_`. Revoke it there at any time.
3. In the studio, switch on **Agent mode** to follow and hear the agent's work (optional: the agent works without it).

## Install in Claude Code

```text
/plugin marketplace add zonzolab/earendil-skill
/plugin install earendil@earendil
```

Claude Code asks for your agent key (stored in the system keychain) and the studio URL (default `https://earendil.studio`). Then ask, for example:

> Create an Italian audio guide in Eärendil from this text, listen to every paragraph, fix anything that sounds wrong and give me the export.

### Manual setup

```bash
claude mcp add --transport http earendil https://earendil.studio/api/mcp \
  --header "Authorization: Bearer earendil_…"
cp -R skills/earendil ~/.claude/skills/earendil
```

## Other agents

The MCP server speaks Streamable HTTP at `https://earendil.studio/api/mcp` and authenticates with the agent key as a bearer token:

```json
{
  "mcpServers": {
    "earendil": {
      "type": "http",
      "url": "https://earendil.studio/api/mcp",
      "headers": { "Authorization": "Bearer earendil_…" },
      "timeout": 3600000
    }
  }
}
```

`timeout` (milliseconds, Claude Code) gives long listens and transcriptions room: `listen` waits for real-time playback.

For clients that only run stdio servers, bridge with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "earendil": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://earendil.studio/api/mcp", "--header", "Authorization:${EARENDIL_AUTH}"],
      "env": { "EARENDIL_AUTH": "Bearer earendil_…" }
    }
  }
}
```

Agents without MCP can call the same tools from a shell:

```bash
export EARENDIL_API_KEY=earendil_…
node skills/earendil/scripts/earendil.mjs tools
node skills/earendil/scripts/earendil.mjs call list_projects
```

Copy `skills/earendil/` wherever your agent loads skills from.

## What the agent can do

| Area | Tools |
| --- | --- |
| Projects | `list_projects`, `create_project`, `get_project`, `open_project`, `rename_project` |
| Voices | `list_providers`, `list_voices` |
| Speech | `generate_speech` (also attaches the script to the audio's seconds), `place_take` |
| Script | `get_transcript` (every sentence with its seconds), `find_text`, `redo_text` ("say that sentence again": regenerates it and swaps it in, pauses kept) |
| Listening and looking | `listen` (plays in your studio and returns the audio itself, a full-quality link, a word-level transcript with unclear words, a delivery report on pace, intonation and loudness, pauses and levels), `view_waveform` (a picture of the waveform, spectrogram and intonation with words, cut points and fades), `play`, `stop`, `seek`, `studio_status` |
| Editing | `cut_range`, `insert_silence`, `split`, `trim_clip`, `move_clips`, `delete_clips`, `arrange_track`, `set_fade`, `crossfade`, `set_clip_gain`, `group_clips` |
| Tracks | `add_track`, `update_track`, `remove_track` |
| Output | `undo`, `export_audio` |

Full arguments: [`skills/earendil/references/tools.md`](skills/earendil/references/tools.md). A complete run on a real audio guide: [`references/audioguide-example.md`](skills/earendil/references/audioguide-example.md).

## Usage and privacy

The agent acts as you: speech generation and transcription count against your monthly allowance, and it can read and edit your projects. Every agent edit can be undone (`undo`, or ⌘Z in the studio). Keys are stored hashed; revoke one in the studio and it stops working at once.

## Development

```bash
npm test          # Node 18+, no dependencies
```

## License

MIT
