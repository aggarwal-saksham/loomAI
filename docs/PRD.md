# PRD — Cortex: AI-Powered Data Intelligence Platform

## Problem

Businesses often need to collect specific information from the web — job openings,
sales leads, sponsorship opportunities, market data — but building a separate
scraper or workflow for every requirement is time-consuming, hard to maintain,
and doesn't scale.

## Goal

Build a prompt-based AI Data Intelligence Platform that can:

- Understand data requirements from natural-language prompts.
- Dynamically design and execute an appropriate data-collection workflow.
- Collect and process information from multiple **permitted** sources.
- Clean, structure, validate, and deduplicate results.
- Provide source-backed, traceable data (every row links back to where it came from).
- Present results through an interactive dashboard.
- Allow users to search, filter, and export collected data.
- Allow users to monitor and manage collection tasks.
- Maintain workflow and dataset history (revisit past tasks, re-run them).

## Differentiator (why Cortex, not just "an AI scraper")

The AI's workflow plan is not a hidden implementation detail — it's a first-class,
visible part of the product. The user watches the AI design a DAG of collection
steps (source → fetch → extract → clean → validate → output), then watches it
execute live, node by node, with failures isolated and visible rather than hidden.
This directly demonstrates "dynamically create and execute a workflow" instead of
just claiming it.

## Non-goals (hackathon scope — do not build these)

- User accounts / auth / multi-tenant permissions.
- Arbitrary site scraping behind logins or paywalls.
- A general-purpose workflow builder UI where users manually drag/drop nodes
  (the AI designs the graph; the user doesn't hand-author it).
- Horizontal scaling, queues, or distributed execution (single-process async is fine).
- Billing, rate limiting, or multi-user quota management.

## Primary user story

> As a business user, I type "find 15 companies sponsoring student hackathons in
> fintech" into Cortex. I watch it build a collection plan, run it against real
> sources, and within ~30–90 seconds I have a clean, deduplicated table of leads,
> each with a source link and a confidence score, which I can filter and export
> as CSV.

## Success criteria for the demo

1. A brand-new natural-language prompt produces a valid, sensible workflow graph.
2. The graph visibly executes step by step (not an instant "done").
3. Results are real (or realistically cached), deduplicated, and every row has
   a working source URL.
4. A failed node (e.g. bad fetch) does not crash the whole task — it's shown as
   failed, and unaffected branches still complete.
5. Past tasks are listed, reopenable, and re-runnable.
6. Export produces a valid CSV and JSON file.
7. The UI does not look like a generic AI chat/dashboard template (see
   `DESIGN_SYSTEM.md`).

## Out of scope for correctness grading, but nice-to-have if time allows

- A "needs review" bucket for low-confidence rows shown distinctly in the UI.
- Re-running a task and diffing new results against the previous run.
