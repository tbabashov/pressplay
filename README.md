# Album Rankings

Rate rap albums track-by-track and export TikTok-ready (1080×1920) result images.

## Setup

1. Create a Spotify app at https://developer.spotify.com/dashboard (any redirect URI works — it's unused; the app uses client-credentials).
2. Paste the Client ID and Client Secret into `.env`, and pick a login password:
   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   APP_PASSWORD=yourpassword
   ```
3. Run:
   ```
   npm run dev
   ```
4. Open http://localhost:5173

## How it works

### Rating an album

- **Search** an album → rate every track **0–11** (11 = Majestic; `–` = N/A for skits and
  interludes, which are excluded from every average). Tier labels are editable via the
  "Rating Scale" button.
- Fill in the five **criteria** — Lyricism, Production, Delivery, Album Experience,
  Replay Value — to one decimal. The **final rating** is the mean of those five plus the
  automatic song average, all weighted equally. Criteria left blank simply don't vote, and
  the override box next to the final rating wins over the maths if you disagree with it.
- Pick a **Best Song**, a **Worst Song**, and the song that plays over the video
  ("Now Playing"), then upload up to three transparent **artist PNGs** for the title card.

### The album video

`Generate Images` produces, in order:

1. **Title card** — `Album #N`, cover, credits, and the artist cut-outs standing in a
   crystal dome.
2. **Song ratings** — one or more pages; long titles shrink and wrap rather than
   being cut off.
3. **Criteria** — the six scores, best/worst song, the Now Playing player, and the
   final rating.
4. **Where It Ranks** — the top 3 plus a window around this album.
5. **Discography** — one image per credited artist, rated albums shown with their score
   and unrated ones as ghosted tiles.

### The leaderboard-update video

`Update Video` diffs the current standings against a frozen **snapshot** and produces the
announcement cards, a leaderboard title card, the full compact leaderboard with each
album's places gained/lost and rating change, plus optional movers and biggest-song-jump
cards. Freeze a new snapshot whenever you want to reset the "before" baseline.

### Discographies

An artist's rated albums come straight from your own rankings. Albums you haven't rated
are typed in by hand on the **Discographies** page (name, credits, year, cover) — nothing
is ever pulled from iTunes or Discogs, so the frames only show what you've vouched for.

A hand-entered album counts for **every artist named on it**, not just the one whose list
you typed it into. Enter a collab once, credit all of them, and it appears in each of
their discographies — the same way a rated collab already does. Editing or removing it
affects all of them, since there's only one stored record.

### Look

Colors are pulled from the album cover, with manual swatches on the export screen. Two
beta toggles restyle every image at once: **Gradient background** and
**Crystal glass sections**. **Align** sets which end of the image a tracklist, ladder or
grid settles against (top, center or bottom). **Song text** sizes the whole tracklist at
once — every row always matches, and an overlong credit trims its guest list to "& more"
rather than shrinking on its own. **Feature size** sets how much smaller the `ft.` credit
is than the title. **Safe zones** shades the bands TikTok's own UI covers (preview only —
never exported).

**Download All** saves each frame as a 1080×1920 PNG.

Data is stored locally in `data/db.json`.
