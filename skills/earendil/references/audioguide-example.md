# Worked example: Vallata Santa Domenica, Ragusa

A real run of the workflow on a 1,900-character Italian script for the west entrance of the Vallata Santa Domenica, an urban canyon in Ragusa (Sicily). The studio followed in Agent mode for the whole session. Total: 6 takes, 2:04.6 of narration, one glitch found and cut, export as WAV.

## 1. Split

The script was one paragraph. `split-script.mjs raw.txt --max 420` cut it at sentence ends into six takes of 150–400 characters; one boundary was then moved so the closing invitation stays a single take. Every word is unchanged:

1. Welcome and setting (the canyon, the torrent, the limestone)
2. The decline (brambles, the open-air dump, the valley splitting the city)
3. The life it once had (springs, the "custari" gardeners, the wash-house, the quarries)
4. The regeneration (€7.16 million from the PNRR, 70,000 m², 90 tonnes of waste)
5. What the workers found (latomie, carcare, wash-houses, paths)
6. The invitation to walk down

## 2. Project and voice

```
create_project {"name": "Vallata Santa Domenica — Ingresso ovest", "track_name": "Narrazione"}
list_voices {"provider": "elevenlabs", "language": "it"}
```

The account had no Italian cloned voice; the multilingual model speaks Italian with any voice, so a warm storyteller voice was chosen and kept for all six takes. The studio opened the new project by itself.

## 3. Generate

```
generate_speech {"project_id": "prj_…", "provider": "elevenlabs", "voice": "<voice id>", "language": "it",
                 "text": "<take 1>", "name": "1 · Benvenuti"}
generate_speech {… "text": "<take 2>", "name": "2 · La selva", "gap": 0.8}
…
```

Each take landed after the previous one with a 0.8 s breath; generation took 2–3 s per take.

## 4. Listen and check

```
listen {"project_id": "prj_…", "clip_id": "clip_<take 2>"}      → listen-2.json
node scripts/check-transcript.mjs --text take-2.txt --heard listen-2.json
```

Take 2 came back as *"una discarica **ma** a cielo aperto"*, an extra syllable the voice inserted:

```json
{ "severity": "error", "type": "extra", "heard": "ma", "at": [34.85, 35.17],
  "fix": { "tool": "cut_range", "start": 34.83, "end": 35.17, "ripple": true } }
```

A narrow listen of 33.9–36.2 s confirmed it, with a short silence between "ma" and the real "a" at 35.18. The other reports were only numbers read in words ("'60" for "Sessanta", "ottanta" for "80"): correct.

## 5. Fix

```
cut_range {"project_id": "prj_…", "start": 34.83, "end": 35.17, "track_ids": ["trk_…"]}
listen    {"project_id": "prj_…", "start": 33.2, "end": 37.2}
```

The listen after the cut read *"Una discarica a cielo aperto dove si accumulavano rifiuti"*. Everything after the cut moved 0.34 s earlier.

## 6. Polish

```
listen {"project_id": "prj_…", "play": false, "transcribe": false, "min_pause": 0.7}
```

Pauses between paragraphs measured 1.03–1.12 s, none inside paragraphs; peak -1 dBFS, no clipping. Then:

```
insert_silence {"project_id": "prj_…", "at": 101.5, "seconds": 0.7}       # a breath before "Prendete fiato"
set_fade       {"project_id": "prj_…", "clip_id": "<first>", "fade_in": 0.03}
set_fade       {"project_id": "prj_…", "clip_id": "<last>",  "fade_out": 0.6}
```

## 7. Final pass and export

The whole guide played in the studio through one `listen` (124.6 s). The full transcript matched the script, except "carcare" heard as "calcare": a narrow re-listen heard "carcare", as the take-level pass had, so nothing was regenerated.

```
export_audio {"project_id": "prj_…"}
→ { "url": "https://…/api/agent/exports/….wav", "duration": 124.593, "format": "WAV, 16-bit PCM, mono" }
```
