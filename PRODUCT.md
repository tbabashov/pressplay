# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + Postgres via Prisma — the user's decision, chosen over keeping the
current Vite SPA + Express + JSON file because the product now needs server rendering for
public review pages, Google OAuth, and a social graph. Postgres host is not yet provisioned
(see Capabilities and Constraints); local development uses a Prisma-portable schema.

The existing export-frame renderer (`src/export/*`) is ported, not rewritten. The user has
explicitly approved its output and it is not in scope for redesign.

## Users

**Primary — the owner.** A serious rap listener who rates an album track by track, fills in
six criteria, and exports a 1080×1920 image set to post as a TikTok carousel. Uses the tool
most days. Has rated 165 albums and 2,421 individual songs to date. Currently the only user.

**Intended — other obsessive listeners.** People who already keep lists (RYM, Letterboxd
users, Discogs collectors) and want a rigorous scoring instrument plus somewhere to publish
and defend their opinions. Not yet acquired; no user research exists.

## Product Purpose

Turn listening to an album into a defensible, published rating.

Three jobs in sequence: **score** an album rigorously, **publish** the result as
social-ready images, and (new, unbuilt) **discuss** it with other listeners. Success for the
owner is a finished TikTok carousel in one sitting. Success for the product is other people
rating albums to the same standard and arguing about the results.

## Positioning

Two things a neighbouring product could not truthfully copy:

1. **The scoring model.** The album's final number is the equal-weighted mean of the song
   average plus five typed criteria: Lyricism, Production, Delivery, Album Experience and
   Replay Value. It is not an average of stars and not an aggregate of other people's scores.
   **The scale itself is the user's to define** (see Capabilities): the owner's own 0 to 11
   ladder with an 11 named Majestic is one preset among several, not the product's rule.
2. **Rating is a publishing pipeline.** The session ends in finished 1080×1920 slides laid
   out inside TikTok's safe zones — title card, song ratings, criteria breakdown, where it
   ranks, artist discographies. No other rating site outputs the post.

## Operating Context

Daily loop: search an album → rate every track → type the five criteria → pick best/worst
song and a "now playing" track → export ~6–10 PNGs → post to TikTok. Periodically the owner
re-rates old albums and publishes a "leaderboard update" video built from a frozen snapshot
diffed against the current standings.

## Capabilities and Constraints

**Built and working:** album search across iTunes, Discogs and Spotify; per-track rating on
the 0–11 + N/A scale; six-criteria final rating with manual override; a full-catalogue
leaderboard; hand-entered artist discographies (shared across every credited artist); frozen
snapshots and a leaderboard-update diff; PNG export with theme, alignment and typography
controls.

**Configurable criteria (confirmed, unbuilt).** The five named criteria are the owner's own
and are defaults, not rules. A user renames them, removes the ones they do not believe in and
adds their own. Only the song average is fixed, because it is derived rather than typed. The
final score is the mean of whatever criteria the user kept plus the song average.

**Configurable rating scales (confirmed, unbuilt).** A user defines their own scale rather
than inheriting the owner's. A scale is an ordered list of tiers, each with a value, a name
and a colour, plus one value reservable as N/A so interludes stay out of the average. Ships
with presets (ten point, eleven point with Majestic, five point) and a fully custom builder.
The chosen scale governs rating, the leaderboard and the exported slides. The 11 is therefore
an option, never an assumption.

**Confirmed gaps to build:** more and more credible metadata sources (Discogs is unreliable
and Apple Music alone is insufficient); 30-second song previews during rating; every
database-sourced field editable, including track durations; discography import from a
database rather than by hand; a reviewed-albums section; analytics; an immersive search
surface; a reorganised settings panel; a reworked leaderboard.

**Account model (unbuilt):** Google sign-in; an owner/admin role with unrestricted access;
per-user data isolation. Free tier is 3 album ratings per day; a paid tier is 10 per day plus
analytics; a top tier's benefits are undecided.

**Billing is explicitly deferred.** The user has no Stripe account and has postponed payments
indefinitely. Tiers are to be modelled and enforced, and tier assignment is manual/admin for
now. No payment provider is to be integrated, and no pricing may be stated anywhere until
the user sets it.

**Technical constraints:** `data/db.json` is 64MB because covers and artist cut-outs are
stored as base64 data URLs — blob storage is required, not optional. No Postgres, Docker or
Homebrew on the development machine. The user has a Google Cloud project (for OAuth) and no
domain or host yet.

## Brand Commitments

The product is named **Press Play Rankings**, confirmed by the user. "Press Play" is the
short wordmark; the full name appears in the footer and page title.

Binding: the existing export-image design is approved and must not be redesigned. The user's
stated failure mode for everything else is "soulless", "npcish", "common", "vibecoded" —
generic SaaS layout is an explicit anti-goal.

## Evidence on Hand

Real, and sufficient — nothing needs inventing:

- **165 rated albums, 2,421 scored songs, 110 marked N/A, 392 elevens awarded, 93 artists,
  release years 1982–2026** (`data/db.json`).
- Every album's cover art, and the real leaderboard: Piñata 10.72, Cheat Codes 10.68,
  Late Registration 10.63, The College Dropout 10.62, Bandana 10.51.
- 38 transparent artist cut-out PNGs the owner has already prepared.
- Exported TikTok slides in the owner's possession, five of which ship at
  `web/public/slides/`.
- A public TikTok account where the slides are posted. **Handle not yet supplied**: the site
  uses a placeholder in one constant at the top of `web/app/page.jsx`.

**Absences that must not be fabricated:** no other users, no testimonials, no traffic or
engagement numbers, no press, no pricing, no launch date. Photography beyond album art does
not exist and must be left as a described placeholder for the user to supply.

## Product Principles

1. **The rating is the artefact.** Everything — search, previews, editing, export — exists to
   make one defensible number and the images that carry it.
2. **Never guess on the user's behalf.** Any field a database supplies must be editable, and
   nothing is silently derived where the user would disagree.
3. **Never name the data sources on public surfaces.** Which databases sit behind search is
   an implementation detail and the user has ruled it off the site entirely. Attribution
   obligations, where they exist, are settled in the terms rather than in marketing copy.
4. **Public surfaces are neutral; the app is personal.** Marketing pages demonstrate the
   mechanism and must not present the owner's catalogue, scores or taste as the product.
   The owner's 165 albums are rap-heavy and are evidence for the owner's own account only.
   Public imagery spans genres deliberately. Real covers, never decorative stock.
5. **Show the mechanism, never invent an opinion.** Demonstrations use abstract or clearly
   labelled example content. Attaching a fabricated score to a real album would put an
   opinion in the product's mouth that nobody holds.
6. **Opinion over consensus.** Scores are one person's, published and arguable — never
   averaged into a community number that erases the author.
7. **Earn the paywall.** Gated features are genuine upgrades, never removals from what
   already works for free.

## Accessibility & Inclusion

No product-specific standard has been established. Baseline expectation: the app is used
daily on a laptop, and the export previews are decorative duplicates of downloadable files.
