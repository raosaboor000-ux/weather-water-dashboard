# WeatherWaterDashboard

Independent **Next.js + React** weather dashboard inspired by MACH architecture.
Configured for Weather Underground PWS **AWS TALAGANG (ITALAG18)**.

> MACH (`mach1/`) is reference-only — not modified.

## Tech stack (same family as MACH)

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 15** (App Router) |
| UI | **React 19** + **TypeScript** |
| Styling | **Tailwind CSS** |
| Animation | **Framer Motion** |
| Data fetching | **TanStack React Query** |
| Charts (Phase 5) | **Chart.js** + react-chartjs-2 |

This is a **web dashboard** (browser), not React Native (mobile apps).

## Quick start

```bash
cd WeatherWaterDashboard
npm install
npm run dev
```

Open [http://localhost:3000/current](http://localhost:3000/current)

## Project structure

```
WeatherWaterDashboard/
├── app/                    # Next.js pages (routes)
│   ├── current/
│   ├── historical/
│   ├── water-levels/
│   ├── settings/
│   └── about/
├── components/
│   ├── layout/             # Sidebar, header, footer, shell
│   ├── current/            # Current weather UI
│   ├── historical/         # History placeholders
│   └── ui/                 # Reusable cards, badges
├── lib/
│   ├── config.ts           # Station ID, API key, units
│   └── types.ts            # WeatherLatest contracts
└── services/               # API + Google Sheets (Phase 3+)
```

## Configuration

Set in `lib/config.ts` or via environment variables:

| Variable | Default |
|----------|---------|
| `WU_STATION_ID` | `ITALAG18` |
| `WU_STATION_NAME` | `AWS TALAGANG` |
| `WU_API_KEY` | *(in config)* |
| `REFRESH_INTERVAL_MINUTES` | `5` |

## Development phases

| Phase | Status |
|-------|--------|
| 1 — Architecture + skeleton | ✅ |
| 2 — Layout + UI components | ✅ |
| 3 — WU API | Next |
| 4–8 | Pending |
