# Design

<!-- impeccable:design-schema 1 -->

## World

**A listening room after dark.** The identity already exists and is approved — it lives in the
TikTok export frames (`lib/export/*`) and the web surfaces inherit it rather than replacing it.

Deep near-black ground; every screen takes its colour from the album currently in view, so the
page is lit *by the record*, not by a brand palette. Content sits on crystal-glass panels —
a diagonal sheen, a bright top edge, a soft inner glow. Scores are the only saturated colour
on any screen, and they follow a fixed 0–11 ladder from brown to a pink gradient at 11.

Anti-reference: the generic dark SaaS page — even grid of icon cards, gradient headline,
purple-to-blue mesh, stock studio photography. This product's imagery is 165 real album covers.

## Palette

Ground is `--ink` #08080a rising to #101014. Every album exposes `--accent` / `--accent-soft`
derived from its cover, set per-section as inline custom properties; nothing is hard-coded to a
brand hue. Text steps are pure white → 78% → 55% → 38% white.

The default rating ladder is shared with the exporter (`lib/rating-colors.js`): 0 brown → 5
yellow → 8 blue → 9 purple → 10 blue
gradient → **11 pink gradient with a halo**. The 11 is the product's signature colour and is
never used decoratively.

## Type

**Archivo** (variable, `wght` 100–900 + `wdth` 62–125), self-hosted via `next/font`. One family,
hierarchy from weight and width rather than a second face. Display uses the expanded width at
heavy weights; body sits at normal width. Tracking tightens to −0.04em at display sizes, never
below. Body measure 65–75ch. All scores and ranks use `font-variant-numeric: tabular-nums`.

No second display face, no monospace costume — mono would only be earned by code, and there
is none on these surfaces.

## Surfaces

Glass panels: `linear-gradient(148deg, rgba(255,255,255,.20) → .05)`, 1.5px `rgba(255,255,255,.22)`
border, inset top highlight, and a real offset shadow (`0 26px 64px rgba(0,0,0,.4)`) — never a
zero-offset halo. Radii 16 / 24 / 32 / 46. Backdrop blur is used on the web (unlike the
exporter, where it rasterises wrongly).

## Motion

One authored moment: on load the hero album's colour blooms out of its cover into the page while
the score resolves. Exponential ease-out from an already-visible default, so nothing pops in from
nothing. Everything else is state feedback only. Fully disabled under `prefers-reduced-motion`.

## Browser surfaces

Selection, caret, focus ring, and scrollbar are all themed from the accent — never left at
browser defaults.

## Rules

1. Colour comes from the record on screen. A section with no album is neutral.
2. Saturated colour means a score. Nothing else earns it.
3. Real covers only — no stock photography, no AI imagery, no placeholder art that ships.
4. Imagery the user must supply is marked in-page as an explicit, described placeholder.

## Voice

Short declarative sentences. No em dashes, no en dashes in prose: they are the clearest tell
of machine-written copy and the user has called them out by name. Use full stops, commas and
colons instead. No eyebrow labels above headings. Ranges are written "1982 to 2026", not with
a dash.
