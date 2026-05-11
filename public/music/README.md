# Background Music for Real Estate Video Studio

Place royalty-free MP3 files here to enable background music in generated listing videos.

## Expected filenames

| Track name in UI       | File to place here         |
|------------------------|----------------------------|
| Soft Piano             | `soft-piano.mp3`           |
| Warm Acoustic          | `warm-acoustic.mp3`        |
| Light Corporate        | `light-corporate.mp3`      |
| Calm Ambient           | `calm-ambient.mp3`         |

## Royalty-free music sources (free, no attribution required)

- **Pixabay Music** — https://pixabay.com/music/ (CC0 / Pixabay License)
- **Free Music Archive** — https://freemusicarchive.org (filter by CC0)
- **ccMixter** — https://ccmixter.org (CC0 tracks)
- **Musopen** — https://musopen.org (public domain classical)

## How it works

When a file is present, the Video Studio loads it via Web Audio API, mixes it
into the MediaRecorder stream alongside the canvas video, and produces a WebM
file with embedded audio.

If the file is missing, the video generates silently and a warning is shown.
Music can always be added afterwards in Facebook, CapCut, or Canva.

## Restrictions

- Use ONLY royalty-free or CC0 licensed tracks.
- Do NOT use commercial music (Spotify, Apple Music, etc.).
- Do NOT use background music from YouTube without explicit CC0 license.
