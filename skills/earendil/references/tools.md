# Eärendil MCP tools

Generated from the server's `tools/list`. Times are seconds on the timeline. Every tool answers with JSON (also as `structuredContent`); an error answer explains what to change.

A **take** is generated audio (`takes[]` in `get_project`, with its full text). A **clip** places a stretch of a take on a track: `start`/`end` on the timeline, `offset` into the take. A clip's `group` is the id of the anchored group it moves with, or null.

## Projects

### `list_projects`

Lists the user's projects, most recently edited first.

### `create_project`

Creates an empty project with one track and opens it in a following studio.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | Project name. |
| `track_name` | string |  | Name of the first track. |

### `get_project`

Returns the timeline: tracks, clips (start/end/offset/fades/gain/group, in seconds) and takes with their full text.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |

### `open_project`

Makes a following studio open this project.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |

### `rename_project`

Renames a project.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `name` | string | yes |  |

## Voices

### `list_providers`

Speech engines with their limits, and which engine transcribes for listen.

### `list_voices`

Voices the user can use with an engine and language: their cloned voices (kind custom) first, then studio voices.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `provider` | string | yes | soniox, fish, elevenlabs or google. |
| `language` | string | yes | Language code, e.g. it or en. |
| `query` | string |  | Filter by name, accent, gender or description. |
| `kind` | `custom` \| `public` |  |  |
| `limit` | integer |  |  |

## Generate

### `generate_speech`

Generates a take from text (max 5000 characters) and places it on the timeline, by default appended at the end of the selected track. Generation consumes the user's monthly usage. For long narration generate one take per paragraph so each can be fixed alone. An expression colours the whole take: to change mood mid-paragraph, split it into takes.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `text` | string | yes | What the voice says. |
| `voice` | string | yes | Voice id from list_voices. |
| `language` | string | yes | Language code, e.g. it. |
| `provider` | string |  | Speech engine (default soniox). |
| `speed` | number |  | 0.7 to the engine's max_speed; 1 is natural. |
| `expression` | `neutral` \| `happy` \| `sad` \| `angry` \| `excited` \| `calm` \| `whispering` \| `laughing` |  | Delivery of the whole take (default neutral). ElevenLabs switches to its expressive model for anything but neutral: language detected from the text, about twice the usage, timbre may shift slightly. |
| `reduce_silence` | boolean |  | Soniox only: shorten long pauses inside the take. |
| `name` | string |  | Label for the take (defaults to its first words). |
| `place` | boolean |  | false keeps the take off the timeline (use place_take later). |
| `track_id` | string |  | Track to place on. Defaults to the selected track (one is created if the project has none). |
| `at` | number \| `end` |  | Start time in seconds, or "end" (default) to append after the last clip of the track. |
| `gap` | number |  | Pause before the take when appending at "end" (default 0.5). |
| `ripple` | boolean |  | With a numeric `at`, push everything after `at` on that track right to make room (default false). |

### `place_take`

Places an existing take (again) on the timeline as a new clip.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `take_id` | string | yes |  |
| `track_id` | string |  | Track to place on. Defaults to the selected track (one is created if the project has none). |
| `at` | number \| `end` |  | Start time in seconds, or "end" (default) to append after the last clip of the track. |
| `gap` | number |  | Pause before the take when appending at "end" (default 0.5). |
| `ripple` | boolean |  | With a numeric `at`, push everything after `at` on that track right to make room (default false). |

## Listen and transport

### `listen`

Listens to a stretch of the mix of every track (max 30 minutes per call; default the whole timeline). The answer carries the audio itself (16 kHz WAV, attached by default up to 60 s, on request up to 120 s) so you can hear and judge it, an audio_url for the same range at full quality, a word-level transcript with timeline times, the pauses and the levels. A studio following in Agent mode really plays it and the call waits until playback ends, for at most 240 s (then it returns with studio.still_playing_for while the studio keeps playing; wait false returns as soon as the analysis is ready). Use it after every generation and edit.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `start` | number |  | From (default 0). |
| `end` | number |  | To (default the end of the timeline). |
| `clip_id` | string |  | Listen to exactly this clip instead of start/end. |
| `track_ids` | string[] |  | Limit to these track ids. Omit for every track. |
| `transcribe` | boolean |  | Default true. false skips the transcript. |
| `audio` | boolean |  | Attach the audio to the answer. Default true for ranges up to 60 s; allowed up to 120 s. |
| `play` | boolean |  | Default true: play it in the following studio. |
| `wait` | boolean |  | Default true: return when the studio finishes playing. |
| `silence_db` | number |  | Pause threshold in dBFS (default -45). |
| `min_pause` | number |  | Shortest pause reported (default 0.3). |

### `play`

Plays the timeline in the following studio from `from` (default the playhead), stopping at `to` when given. Returns at once.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `from` | number |  | Start time. |
| `to` | number |  | Stop time. |

### `stop`

Stops playback in the following studio.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |

### `seek`

Moves the studio playhead.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `time` | number | yes | Playhead time. |

### `studio_status`

Whether a studio follows in Agent mode, which project it shows, and its transport.

## Edit

### `cut_range`

Cuts [start, end) out of the timeline: clips inside are removed, clips across the edges are trimmed or split (with 10 ms click-free fades), and with ripple (default) everything after closes the gap. Use transcript word times to remove a word, a stumble or a long pause.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `start` | number | yes | Cut from. |
| `end` | number | yes | Cut to. |
| `track_ids` | string[] |  | Limit to these track ids. Omit for every track. |
| `ripple` | boolean |  | Default true. |

### `insert_silence`

Opens a pause at `at`: a clip running across it is split there and everything after slides right by `seconds`.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `at` | number | yes | Where the pause starts. |
| `seconds` | number | yes |  |
| `track_ids` | string[] |  | Limit to these track ids. Omit for every track. |

### `split`

Splits clips at a time: just `clip_id`, or every clip running across `time` (optionally only on `track_ids`).

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `time` | number | yes | Split point. |
| `clip_id` | string |  |  |
| `track_ids` | string[] |  | Limit to these track ids. Omit for every track. |

### `trim_clip`

Moves a clip edge to a timeline time without moving its audio: `start` hides/reveals the beginning, `end` the ending.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `clip_id` | string | yes |  |
| `edge` | `start` \| `end` | yes |  |
| `time` | number | yes | New edge time. |

### `move_clips`

Moves clips (with their grouped companions) so the earliest starts `to` a time, or `by` a delta, optionally onto another track.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `clip_ids` | string[] | yes | Clips to move. |
| `to` | number |  | New start of the earliest clip. |
| `by` | number |  | Shift in seconds (negative = earlier). |
| `track_id` | string |  |  |

### `delete_clips`

Deletes clips. With ripple the later clips on the same track slide left over the hole.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `clip_ids` | string[] | yes | Clips to delete. |
| `ripple` | boolean |  | Default false. |

### `arrange_track`

Lays a track's clips back to back in their current order, starting at `start` with `gap` seconds between them (default 0.6; negative gaps crossfade).

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `track_id` | string |  |  |
| `start` | number |  | Default 0. |
| `gap` | number |  | Pause between clips. |

### `set_fade`

Sets a clip's fade in and/or fade out in seconds. Overlapping clips keep a crossfade equal to their overlap: use crossfade for those.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `clip_id` | string | yes |  |
| `fade_in` | number |  | Fade in length. |
| `fade_out` | number |  | Fade out length. |

### `crossfade`

Overlaps two neighbouring clips on a track by `seconds` with complementary fades (0 butts them together).

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `left_clip_id` | string | yes |  |
| `right_clip_id` | string | yes |  |
| `seconds` | number | yes | Crossfade length. |

### `set_clip_gain`

Sets a clip's volume: 1 unchanged, 0.5 about -6 dB, up to 2.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `clip_id` | string | yes |  |
| `gain` | number | yes |  |

### `group_clips`

Anchors clips on one track so they move together (grouped true), or frees them (false).

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `clip_ids` | string[] | yes | Clips. |
| `grouped` | boolean | yes |  |

## Tracks

### `add_track`

Adds a track and selects it, so the next generate_speech lands there.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `name` | string |  |  |

### `update_track`

Renames a track or changes its volume (0–1.5), mute or solo.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `track_id` | string | yes |  |
| `name` | string |  |  |
| `gain` | number |  |  |
| `muted` | boolean |  |  |
| `solo` | boolean |  |  |

### `remove_track`

Removes a track and its clips (takes stay in the project).

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `track_id` | string | yes |  |

## History and output

### `undo`

Reverts the last agent edit on the project (up to 30 steps back). Edits the user made since then are reverted too.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |

### `export_audio`

Renders the mix (or a range, or some tracks) to a 16-bit WAV and returns a download link valid for one hour, for this exact version of the project.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Project id from list_projects or create_project. |
| `start` | number |  | From (default 0). |
| `end` | number |  | To (default the end). |
| `track_ids` | string[] |  | Limit to these track ids. Omit for every track. |


## What `listen` returns

```json
{
  "range": [26.388, 47.565],
  "audio_attached": true,
  "audio_url": "https://earendil.studio/api/agent/exports/….wav",
  "studio": { "connected": true, "project_id": "prj_…", "played": true },
  "clips": [{ "id": "clip_…", "track": "trk_…", "take": "ast_…", "start": 26.388, "end": 47.565 }],
  "transcript": {
    "provider": "elevenlabs",
    "language": "it",
    "text": "Dagli anni '60 del Novecento, rovi e piante infestanti …",
    "words": [["Dagli", 26.45, 26.71], ["anni", 26.75, 26.98], ["'60", 27.02, 27.41]]
  },
  "pauses": [[33.508, 33.998], [38.988, 39.598]],
  "levels": { "peak_db": -1, "rms_db": -22.5, "clipped_samples": 0 }
}
```

- Next to this JSON the answer carries an MCP **audio** content block (`audio/wav`, 16 kHz mono) with exactly the range, attached by default up to 60 s and on request (`audio: true`) up to 120 s. `audio_url` serves the same range as a full-quality WAV for one hour.
- `studio.played` is true when a following studio really played the span. The call returns when playback ends, or after 240 s of waiting with `studio.still_playing_for` (seconds left) while the studio keeps playing.
- `transcript` is null with `transcribe: false`, and carries `error` instead of words when no transcription engine is configured.
- `pauses` use `silence_db` (default -45 dBFS) and `min_pause` (default 0.3 s).
