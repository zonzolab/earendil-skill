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
3. **Voice**: `list_voices` for the provider and language. Prefer the user's own voices (`kind: "custom"`): they are their brand. Otherwise pick a warm, steady narrator and name your choice. Keep provider, voice and speed identical for the whole guide so it sounds like one person; choose the expression per take (see *Expressions*).
4. **Generate in order**: `generate_speech` once per take, appended with `at: "end"`, `gap: 0.8` (a breath between paragraphs). Give takes short names (`"1 · Welcome"`). Keep each result: the clip id and its start/end.
5. **Listen to every take**: `listen` with `clip_id`, then judge it twice:
   - **By ear.** The answer carries the audio itself (see *Listening by ear*). Hear how it is said: stress, names, intonation, pace, glitches.
   - **Against the script.** Save the answer and compare the transcript with the take's text:
     `node scripts/check-transcript.mjs --text take.txt --heard listen.json`
     It prints extra, missing and changed words with timeline times, and a ready `cut_range` for extra words. Exit code 0 means the words are all there.
6. **Fix** what the check reports (recipes below), then listen to the fixed span again.
7. **Polish**: one pass of `listen` with `play: false, transcribe: false, min_pause: 0.7` over the whole timeline lists the long pauses and the levels in a second, without playing anything. Even out pauses, add a 20–50 ms `fade_in` on the first clip and a 0.5–1 s `fade_out` on the last.
8. **Final listen**: play the whole guide through `listen` (up to 30 minutes per call), by ear and against the transcript one last time. This is the moment the user hears the result in their studio. A call waits for playback for at most 4 minutes: on a longer span it returns while the studio keeps playing and `studio.still_playing_for` says how long is left, so listen to long guides in spans of about 4 minutes to follow along.
9. **Export**: `export_audio` returns a WAV link valid for one hour, for this exact version. Download it (`scripts/earendil.mjs download <url> guide.wav`) or hand the link to the user, with the duration and the fixes you made.

## Listening by ear

`listen` returns the audio you would hear, not only data about it:

- an **audio block** inside the answer: a 16 kHz mono WAV of exactly the range, attached by default up to 60 seconds (`audio: true` up to 120 s, `audio: false` to skip it);
- `audio_url`: the same range as a full-quality WAV, valid for one hour, for any listening tool you have;
- the **transcript** (which words were said, with times), the **pauses** and the **levels**.

If you can hear audio, listen to every take as a dialogue director would, and trust your ear over the transcript on *how* things are said:

- **pronunciation**: stress on the right syllable, place names, dialect terms and foreign words, numbers, dates and prices read correctly;
- **delivery**: intonation that tells rather than reads, no question-like rise on statements, emphasis on the right word, a tone that fits the text and the expression you chose;
- **pace**: neither rushed nor dragging, breaths and pauses where a speaker would take them;
- **sound**: clicks, glitches, cut breaths, abrupt starts and ends, a take louder or different-sounding from its neighbours.

Each problem you hear has a time: take it from the transcript word nearest to it, then apply a recipe below. If you cannot hear audio, say so to the user once and judge from the transcript, pauses and levels (or hand `audio_url` to a tool that can listen); never claim you heard something you did not.

## Expressions

`generate_speech` takes an `expression`: `neutral` (default), `calm`, `happy`, `excited`, `sad`, `angry`, `whispering`, `laughing`. It colours **the whole take**: the delivery cannot change halfway, so to change mood mid-paragraph, split the text into takes.

- Pick it from what the text does. For an audio guide: `neutral` or `calm` for description and history; `excited` or `happy` for a short welcome or an invitation to look or move on; `sad` for loss or disaster; `whispering` only for a brief, intimate aside. Keep one expression for long stretches: a guide that swings every sentence sounds acted.
- Each engine reads it its own way. **ElevenLabs** switches to its expressive model for anything but `neutral`: the language is detected from the text instead of being enforced, usage is about twice as high, and the timbre can shift slightly, so listen to the joins between a neutral and an expressive take. **Soniox** and **Fish Audio** get a tag at the start of the text; **Google Gemini** gets a style instruction.
- Judge the result by ear: if the delivery overacts or does not match the meaning, go back to `neutral` or `calm`. `speed` (0.7 to the engine's maximum, 1 natural) is the other dial: audio guides usually sit between 0.95 and 1.

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

**Near miss in the transcript** (the check reports a *warning*, e.g. "carcare" heard as "calcare"): transcription mishears rare words, place names and dialect terms, and leans towards the common word. Your ear decides: listen to that word in the attached audio. If you cannot hear audio, re-listen to a narrow window; when passes disagree, tell the user which word to check rather than regenerating blindly.

**Numbers** (*info*: "80" heard as "ottanta", or "sette milioni e centosessantamila" transcribed as "7.160.000"): transcription engines write numbers either way, and the check folds both forms into one note. A number read wrongly (dates, prices, years) is a wrong word: regenerate with the number written in words.

**Missing word**: the voice skipped it. Regenerate the sentence (recipe above).

**Pauses**: inside a paragraph 0.3–0.6 s, between paragraphs 0.8–1.2 s. Shorten a long pause with `cut_range` inside the silence (keep its edges); add a breath with `insert_silence` at the point (e.g. 0.6 s before a key sentence such as an invitation to move on).

**Loudness**: `levels.peak_db` should stay at or under -1 dBFS and `clipped_samples` at 0. A take much louder or quieter than its neighbours gets `set_clip_gain` (0.5 ≈ -6 dB, 1 = unchanged, up to 2).

**Mistake of yours**: `undo` reverts your last edit (30 steps). It also reverts anything the user changed since, so prefer a targeted fix when the user has been editing.

## Working with the user's studio

- `listen` plays in real time when a studio follows and returns when playback ends (at most 4 minutes of waiting). Use it for what the user should hear: checking takes and the final pass.
- For pure analysis use `play: false` (no playback) and `transcribe: false` (no transcription cost). `play` / `stop` / `seek` drive the transport without analysis.
- Each edit selects the clips it touched, so the user sees where you are working; the studio's Agent panel shows a live log of your steps.
- Never play long spans just to wait. Never leave the studio playing when you finish.

## Reference

- `references/tools.md`: every tool, its arguments and what it returns.
- `references/audioguide-example.md`: a complete run on a real Italian audio guide, including the glitch found and fixed.
- `scripts/`: `split-script.mjs`, `check-transcript.mjs`, `earendil.mjs` (no dependencies, Node 18+).
