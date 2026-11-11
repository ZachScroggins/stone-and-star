# Stone & Star

_Measure the monuments. Read the sky. Weigh the evidence._

Stone & Star is a web app for exploring ancient sites in 3D: their measurements, their possible alignments with the sky, their history, and the competing explanations for how old they are and how they were built. Mainstream and alternative views appear side by side, and every claim shows its sources, how specialists regard it, and what kind of evidence it rests on.

The first site is **Giza**. Others follow once Giza is complete.

> **Status:** early development. The repo is scaffolded and the core dependencies are installed; milestone 1 (basics and infrastructure) is next. Nothing here is real data yet.

## What it will do

- **Immersive 3D explorer.** A full-page scene of the site on real terrain, under an accurate night sky you can wind back thousands of years.
- **An AI guide that drives the scene.** Ask a question and the guide answers with sources, then moves the camera, toggles layers or sets the sky epoch through typed tool calls.
- **Evidence on both sides.** Each claim carries two labels (how specialists regard it, and what kind of evidence supports it), the people who argue it, and what evidence would settle it.
- **A coincidence explorer.** Numerical patterns (like pyramid-to-Earth ratios) are tested honestly: how many candidate ratios exist, and how close a match must be to stand out from chance.
- **A reproducible data pipeline.** AI-assisted extraction from sources, verbatim passage checks, and human review before anything is published, with evaluation results reported here.

## Tech stack

| Area                | Tools                                         |
| ------------------- | --------------------------------------------- |
| App                 | Next.js 16 (App Router), React 19, TypeScript |
| UI                  | Tailwind CSS 4, shadcn/ui, next-themes        |
| Forms and contracts | Zod 4, react-hook-form                        |
| AI                  | Vercel AI SDK with Anthropic models           |
| 3D                  | three.js, React Three Fiber, drei, Zustand    |
| Data (planned)      | Neon Postgres, Neon Auth, Drizzle             |
| Tests               | Vitest                                        |
| Hosting             | Vercel                                        |

## Getting started

Requires Node 22 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command             | What it does               |
| ------------------- | -------------------------- |
| `npm run dev`       | Start the dev server       |
| `npm run build`     | Production build           |
| `npm start`         | Serve the production build |
| `npm run lint`      | ESLint                     |
| `npm run typecheck` | TypeScript check           |
| `npm test`          | Run the Vitest suite once  |
| `npm run format`    | Format with Prettier       |

## Roadmap

1. **Basics and infrastructure:** home and Giza pages, sign-in, deploys, mock data behind a data-access interface, a bare chat on Anthropic models.
2. **Scene and sky:** 3D Giza scene, procedurally generated models, star catalog with precession, validated against Stellarium.
3. **Info panel with mock data:** facts, sky, timeline and views tabs.
4. **Coincidence explorer:** deterministic ratio engine with tested candidate counts.
5. **Chat with tools:** the guide answers with sources and drives the scene.
6. **Ingestion pipeline:** sourcing, extraction, review queue, and evaluation metrics.

## Access (planned)

- **Browse:** open to everyone, no account.
- **AI guide:** sign in and use your own Anthropic API key. Keys stay in your browser and are never stored on the server.
- **Guest pass:** short-lived links for reviewers, with hard budgets.
