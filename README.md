# Stone & Star

_Measure the monuments. Read the sky. Weigh the evidence._

Stone & Star is a web app for exploring ancient sites in 3D: their measurements, their possible alignments with the sky, their history, and the competing explanations for how old they are and how they were built. Mainstream and alternative views appear side by side, and every claim shows its sources, how specialists regard it, and what kind of evidence it rests on.

The first site is **Giza**. Others follow once Giza is complete.

> **Status:** early development (milestone 2). Giza is a full-page 3D scene: Copernicus terrain, procedurally generated pyramids, and a star sky you can set to any date from 12000 BCE to 2100 CE. Sign-in and a plain chat guide work. Every figure is placeholder data until it has been sourced and reviewed.

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

To ask the guide, paste your own Anthropic API key into the Giza page. The key stays in that browser tab. Copy `.env.example` to `.env.local` for other settings.

## Scripts

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server                                                |
| `npm run dev:local` | Dev server for the owner's local Claude Code login (localhost only) |
| `npm run build`     | Production build                                                    |
| `npm start`         | Serve the production build                                          |
| `npm run lint`      | ESLint                                                              |
| `npm run typecheck` | TypeScript check                                                    |
| `npm test`          | Run the Vitest suite once                                           |
| `npm run format`    | Format with Prettier                                                |

## How accurate is the sky?

The sky is computed in the browser (a Web Worker) from the Hipparcos catalogue: proper motion to the chosen year, the Vondrák et al. (2011) long-term precession model (ported from ERFA and checked against ERFA's reference values), conversion to the local horizon, and atmospheric refraction. The Sun and Moon come from [astronomy-engine](https://github.com/cosinekitty/astronomy).

The tests compare it with [Stellarium](https://stellarium.org) 26.3 (nutation and aberration off, ΔT off) at Giza for 11 bright stars and the Sun at five dates. Differences, in arcminutes:

| Check                                       | 2026, 2000, 1000 CE | 2560 BCE   | 10000 BCE  |
| ------------------------------------------- | ------------------- | ---------- | ---------- |
| Star positions (9 stars)                    | under 0.25          | under 0.4  | under 2.6  |
| Sirius and α Centauri (binaries, see below) | up to 3.9           | 13–26      | 39–128     |
| Sun                                         | under 0.2           | 7.3        | 50         |
| Horizon conversion, same input              | under 0.02          | under 0.02 | under 0.02 |
| Refraction above 5°                         | under 0.01          | under 0.01 | under 0.01 |

Known limits:

- **Binaries.** Hipparcos gives the proper motion of each star's light centre, which for Sirius and α Centauri includes their orbital wobble. Over millennia that drifts away from Stellarium. Fixing it needs sourced system motions and radial velocities.
- **No radial velocities.** Without them, nearby stars drift by about 1–3′ by 10000 BCE.
- **The Sun far back.** Both ephemerides extrapolate a long way from the present; they differ by 7′ at 2560 BCE.

None of this changes what you see at the scale of the scene, but alignment claims (from milestone 3) will show these tolerances alongside their results.

## Roadmap

1. **Basics and infrastructure:** home and Giza pages, sign-in, deploys, mock data behind a data-access interface, a bare chat on Anthropic models.
2. **Scene and sky:** 3D Giza scene, procedurally generated models, star catalog with precession, validated against Stellarium.
3. **Info panel with mock data:** facts, sky, timeline and views tabs.
4. **Coincidence explorer:** deterministic ratio engine with tested candidate counts.
5. **Chat with tools:** the guide answers with sources and drives the scene.
6. **Ingestion pipeline:** sourcing, extraction, review queue, and evaluation metrics.

## Data and credits

- **Stars:** ESA, 1997, _The Hipparcos and Tycho Catalogues_, ESA SP-1200, via CDS VizieR (I/239).
- **Terrain:** Copernicus GLO-30 DEM, © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.
- **Constellation figures:** zodiac stick figures from [Stellarium](https://stellarium.org) 26.3, "modern" sky culture, by Stellarium's team, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). `public/data/constellations-zodiac-v1.json` is an adapted extract under the same licence.
- **Precession:** ported from [ERFA](https://github.com/liberfa/erfa) (BSD 3-clause), derived from the IAU SOFA library. See `THIRD_PARTY_NOTICES.md`.
- **Pyramid models:** generated by `lib/models/pyramid.ts` from placeholder measurements; schematic, not surveys.

## Access (planned)

- **Browse:** open to everyone, no account.
- **AI guide:** sign in and use your own Anthropic API key. Keys stay in your browser and are never stored on the server.
- **Guest pass:** short-lived links for reviewers, with hard budgets.
