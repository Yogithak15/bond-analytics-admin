# BondBulls Analytics — React App

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
```

## Production build

```bash
npm run build
# Output in /build folder — deploy to any static host
```

## Project Structure

```
bondanalytics/
├── package.json
├── public/
│   ├── index.html          # HTML shell — viewport-fit, Apple PWA meta tags
│   └── app.js              # All dashboard logic (62KB)
│                             Functions: navigate, dashTab, initDashCharts,
│                             initOverviewCharts, initMap, sdlSetYear,
│                             setTheme, renderCatalog, buildExpChart,
│                             togglePanel, closePanel, openDetail, showRef,
│                             DM_CDEFS, DM_TAB_CHARTS, CDEFS, SDL_YEAR_DATA
└── src/
    ├── index.js            # React entry point
    ├── index.css           # All styles (73KB)
    │                         Tokens, layout, components, charts, SDL card,
    │                         Catalog, Reference, Detail page
    │                         Responsive: ≤1024px tablet, ≤640px mobile, ≤380px XS
    ├── App.jsx             # Root component
    │                         Loads Chart.js 4.4.1 + ECharts 5.4.3 from CDN
    │                         Loads /app.js after CDNs ready
    │                         Renders dashboardHTML via dangerouslySetInnerHTML
    │                         Portals <IndiaMap> into #india-echarts-map
    ├── dashboardHTML.js    # Full dashboard body HTML (97KB)
    │                         All 4 pages: Dashboard, Catalog, Detail, Reference
    │                         All panels: Compare, Watchlist, Filters, Pivot
    │                         All modals: Source URLs
    ├── india-full.json     # India states GeoJSON — 34 features
    └── components/
        └── IndiaMap.jsx    # ECharts choropleth map component
                              SDL data FY 2021–2026
                              Year selector, floating chips, legend
                              Podium (top 3), leaderboard (ranks 4–15), totals
                              Responsive canvas (260px mobile, 320px desktop)
                              Syncs year change → window.sdlSetYear()
```

## Pages & Features

| Page | Features |
|---|---|
| **Dashboard** | KPI tiles, SDL choropleth map, Market Composition donut, NCD vs PP, Corp Outstanding, Top States |
| **Dashboard → G-Secs** | Security type donut, maturity profile bar+line, STRIPS trend |
| **Dashboard → SDL** | YoY trend bar+line, top 10 states bar+line, 15-state detail table |
| **Dashboard → Corp Bonds** | NCD trend, PP trend, trading volume bar+line, issuer donut, issuance table |
| **Dataset Catalog** | Filter by source/frequency/status, list/card view, sort |
| **Detail / Explore** | Dynamic chart builder — metric, aggregation, periodicity, dimension |
| **Reference** | Issuers, Ratings (prev→current with badges), Yield Curves, Holidays, Indices |
| **Compare panel** | Yield curve overlay chart |
| **Watchlist panel** | Bond watchlist with live yield/spread |

## Mobile Responsive

- **Desktop ≥1025px** — Left sidebar nav, fixed viewport shell
- **Tablet 641–1024px** — Bottom tab bar, inner scroll, filter as slide panel
- **Mobile ≤640px** — Natural document scroll, sticky topbar, bottom nav, single-column layout, Pivot & Chart Builder as slide panel, SDL map header 2-row layout
- **XS ≤380px** — Tightest spacing

## Architecture

1. `App.jsx` injects the full HTML via `dangerouslySetInnerHTML`
2. Scripts load in order: Chart.js → ECharts → `/app.js`
3. `window.setTheme` is patched to keep React `isDark` state in sync
4. `<IndiaMap>` is mounted via React Portal into `#india-echarts-map`
5. All navigation/chart/filter logic runs through global functions in `app.js`
