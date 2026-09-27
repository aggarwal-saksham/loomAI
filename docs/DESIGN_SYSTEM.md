# Design System — loomAI

The #1 instruction for the frontend: **this must not look like a generic
"AI wrapper" app.** This is a judged criterion. Read the ban list before
writing any component.

## Banned patterns — do not use any of these

- Purple/blue gradient backgrounds or gradient buttons.
- Generic rounded-2xl white cards with soft drop shadows on a light-grey
  background (the default shadcn/Tailwind template look).
- Inter font as the sole typeface with no hierarchy.
- A centered chat-bubble UI as the primary interface.
- Generic "sparkle" ✨ or robot icons to signal "AI."
- Stock hero sections with a "Powered by AI" badge.
- Excessive marketing-style whitespace/padding. This is a working tool, not a
  landing page — density and clarity matter more than airy spacing.

## Visual identity — "control room / signal intelligence terminal"

**Tone:** dark, dense, technical, confident.

### Color

- Background: true near-black, e.g. `#0B0D10`. Not navy, not dark purple.
- Structure/surfaces: muted slate/graphite tones, e.g. `#15181C`, `#1E2126`.
- One accent color, used sparingly and consistently for "active/running"
  states only. Pick one:
  - Hot amber: `#FF7A1A`
  - Acid green: `#B4FF39`
  - Do NOT use blue or purple as the accent.
- Node/status semantic colors (desaturated, not neon):
  - pending: dim grey `#4A4F57`
  - running: pulsing accent color
  - done: cool green `#3FA772`
  - failed: desaturated red `#C1554A`

### Typography

- Display/headers: a condensed or technical display face — "Space Grotesk",
  "IBM Plex Sans Condensed", or similar (Google Fonts).
- Data, status labels, node IDs, timestamps: a monospace face — "JetBrains
  Mono" or "IBM Plex Mono". This reinforces the terminal feel and makes data
  read as authoritative, not decorative.
- Never use a single font for both headers and data.

### Layout

Break from the standard "sidebar + centered card" template. Use an asymmetric
three-zone layout:

1. **Left rail** — task history. Collapsed by default (icon + label), not a
   full persistent sidebar.
2. **Center canvas** — the dominant zone. The live workflow graph lives here.
3. **Results drawer** — slides up from the bottom like a terminal drawer once
   the output node completes, rather than living in a separate tab/page.

### Graph canvas (React Flow)

- Custom node components per type (source/fetch/extract/clean/validate/output)
  — never the default React Flow box.
- Each node: a small label chip, a mono-font status line, a subtle animated
  progress bar/pulse while running.
- Edges animate (flowing dashes) only while data is actively passing through
  them — static otherwise.

### Micro-interactions

- Node completion: a brief scale + glow pulse — not a generic checkmark fade-in.
- Results drawer: real spring physics via Framer Motion, not a linear slide.
- Empty/loading states written in-voice, e.g. "no signals collected yet"
  instead of "no data." "scanning sources..." instead of "loading..."

### Data table (TanStack Table)

- Data values in mono font; headers in the display/sans font.
- Subtle zebra striping using near-black tones — never white/light-grey rows.
- Confidence shown as a small horizontal bar, not a percentage badge.
- Hover on a row reveals the `source_url` as a tooltip/link, rather than
  dedicating a full visible column to it.

## Consistency rule

If you're about to reach for a default Tailwind/shadcn pattern (white card,
blue button, Inter font, centered chat box), stop and check this file first —
that default is exactly what this project is trying to avoid.
