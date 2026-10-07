---
name: earendil
description: Produce and edit narrated audio in Eärendil studio through its MCP server - generate speech with a chosen voice, listen back with word-level transcripts, cut, join, move and fade clips on the timeline, and export WAV. Use when asked to make an audio guide, voice-over, podcast segment or course narration from a script, to fix words, pronunciation or pauses in an Eärendil project, or to drive the studio in Agent mode.
---

# Eärendil studio

You are the editor at the desk. Eärendil is a voice studio: text becomes **takes** (generated audio), takes sit on **tracks** as **clips**, and clips are trimmed, split, moved and faded on a timeline measured in **seconds**. Every tool call saves at once. When the user switched on **Agent mode** in their studio, the studio follows you live: it opens the project you work on, shows each edit, and **really plays** what you listen to, so the user hears exactly what you hear.

The tools come from the `earendil` MCP server. If they are missing, the server is not configured: point the user to the README of this skill (`/plugin install earendil@earendil`, or the MCP snippet in the studio under Agent → Connect). Without native MCP, `scripts/earendil.mjs` calls the same tools from a shell.

## Before you start

- `studio_status` tells you whether a studio is following. If not, you can still work; say once that switching on **Agent** in the studio lets them follow and hear the work.
- Keep the user's script **verbatim**. You choose voice, takes, pauses and fixes; you do not rewrite content. The only allowed text change is a respelling that makes a word pronounced right (see fixes), and you say so.
- Generation and transcription use the user's monthly allowance. Regenerate only what is wrong.

## Audio guide workflow

1. **Split the script into takes**: one take per paragraph, long paragraphs at sentence ends, roughly 150–600 characters each.
   `node scripts/split-script.mjs script.txt --max 600` prints the takes as a JSON array, words untouched.
2. **Project**: `create_project` named after the stop or place (`"Vallata Santa Domenica — West entrance"`), first track `"Narration"`. Work in an existing project when the user names one (`list_projects`, then `get_project`).
3. **Voice**: `list_voices` for the provider and language. Prefer the user's own voices (`kind: "custom"`): they are their brand. Otherwise pick a warm, steady narrator and name your choice. Keep provider, voice, speed and expression identical for the whole guide so it sounds like one person.
4. **Generate in order**: `generate_speech` once per take, appended with `at: "end"`, `gap: 0.8` (a breath between paragraphs). Give takes short names (`"1 · Welcome"`). Keep each result: the clip id and its start/end.
5. **Listen to every take**: `listen` with `clip_id`. Save the result and compare it with the take's text:
   `node scripts/check-transcript.mjs --text take.txt --heard listen.json`
   It prints extra, missing and changed words with timeline times, and a ready `cut_range` for extra words. Exit code 0 means the take is clean.
6. **Fix** what the check reports (recipes below), then listen to the fixed span again.
7. **Polish**: one pass of `listen` with `play: false, transcribe: false, min_pause: 0.7` over the whole timeline lists the long pauses and the levels in a second, without playing anything. Even out pauses, add a 20–50 ms `fade_in` on the first clip and a 0.5–1 s `fade_out` on the last.
8. **Final listen**: play the whole guide through `listen` in spans of at most 240 seconds, checking the transcript one last time. This is the moment the user hears the result in their studio.
9. **Export**: `export_audio` returns a WAV link valid for one hour, for this exact version. Download it (`scripts/earendil.mjs download <url> guide.wav`) or hand the link to the user, with the duration and the fixes you made.

## Fix recipes

Times come from `listen`: `transcript.words` are `[word, start, end]` on the timeline, `pauses` are `[start, end]` silences.

**Extra word, stumble or glitch** (e.g. "una discarica *ma* a cielo aperto"):
1. Confirm with a narrow listen that starts at least 0.5 s before the word before it: `listen {start, end}` around 2–3 seconds. A window that starts mid-word produces junk at its edge, so ignore the first and last word of a narrow window.
2. `cut_range` from just after the previous word to just before the next one (the check script prints it), `ripple: true` so the speech closes up. Cuts get 10 ms fades automatically, so they do not click.
3. Listen to the span again: the sentence must read as written.

**Wrong word or mispronunciation**:
1. Regenerate only that sentence: `generate_speech` with `place: false`.
2. Find the sentence span from the transcript (first word start to last word end; pauses mark sentence breaks).
3. `cut_range` that span with `ripple: true`, then `place_take` the new take with `at` = the cut start and `ripple: true`: it opens exactly the room it needs.
4. If the same word fails twice, respell it for the voice (an accent mark such as "càrcare", a hyphen, or a number written out in words) and tell the user.

**Near miss in the transcript** (the check reports a *warning*, e.g. "carcare" heard as "calcare"): transcription mishears rare words, place names and dialect. Listen again to a narrow window around it. If two passes out of three hear it right, it is right; do not regenerate.

**Numbers** (*info*: "80" heard as "ottanta"): fine when the spoken form is the intended one. A number read wrongly (dates, prices, years) is a wrong word: regenerate with the number written in words.

**Missing word**: the voice skipped it. Regenerate the sentence (recipe above).

**Pauses**: inside a paragraph 0.3–0.6 s, between paragraphs 0.8–1.2 s. Shorten a long pause with `cut_range` inside the silence (keep its edges); add a breath with `insert_silence` at the point (e.g. 0.6 s before a key sentence such as an invitation to move on).

**Loudness**: `levels.peak_db` should stay at or under -1 dBFS and `clipped_samples` at 0. A take much louder or quieter than its neighbours gets `set_clip_gain` (0.5 ≈ -6 dB, 1 = unchanged, up to 2).

**Mistake of yours**: `undo` reverts your last edit (30 steps). It also reverts anything the user changed since, so prefer a targeted fix when the user has been editing.

## Working with the user's studio

- `listen` plays in real time when a studio follows and returns when playback ends. Use it for what the user should hear: checking takes and the final pass.
- For pure analysis use `play: false` (no playback) and `transcribe: false` (no transcription cost). `play` / `stop` / `seek` drive the transport without analysis.
- Each edit selects the clips it touched, so the user sees where you are working; the studio's Agent panel shows a live log of your steps.
- Never play long spans just to wait. Never leave the studio playing when you finish.

## Reference

- `references/tools.md`: every tool, its arguments and what it returns.
- `references/audioguide-example.md`: a complete run on a real Italian audio guide, including the glitch found and fixed.
- `scripts/`: `split-script.mjs`, `check-transcript.mjs`, `earendil.mjs` (no dependencies, Node 18+).
