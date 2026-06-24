import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Market Pulse Page — API definitions
//  Each export maps to exactly one card or chart on the Market Pulse tab.
//  All IDs are listed inline so they are easy to find and change.
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
//  KPI STRIP — Row 1 (4 cards)
// ═══════════════════════════════════════════════════════════════════════════

// ── KPI : NSE Market Cap ────────────────────────────────────────────────────
//   source_id            : 12   (NSE Cash Market)
//   metric_id            : 65   (Market Capitalisation)
//   dimension_type_id    : 33
//   dimension_id         : 33892 (NSE — All)
//   date_attribute_type_id: 3
//   granularity          : month  → latest row, format as ₹L Cr
export const fetchMpKpiNseMcap = () =>
  analyticsAggregate({
    source_id: 12,
    metric_id: 65,
    date_attribute_type_id: 3,
    dimension_type_id: 33,
    dimension_id: 33892,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── KPI : BSE Market Cap ────────────────────────────────────────────────────
//   source_id            : 13   (BSE Cash Market)
//   metric_id            : 65   (Market Capitalisation)
//   dimension_type_id    : 33
//   dimension_id         : 33893 (BSE — All)
//   date_attribute_type_id: 3
export const fetchMpKpiBseMcap = () =>
  analyticsAggregate({
    source_id: 13,
    metric_id: 65,
    date_attribute_type_id: 3,
    dimension_type_id: 33,
    dimension_id: 33893,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── KPI : NSE Monthly Turnover ──────────────────────────────────────────────
//   source_id            : 12   (NSE Cash Market)
//   metric_id            : 66   (Equity Turnover — crore)
//   dimension_type_id    : 33
//   dimension_id         : 33892 (NSE — All)
//   date_attribute_type_id: 3
export const fetchMpKpiNseTurnover = () =>
  analyticsAggregate({
    source_id: 12,
    metric_id: 66,
    date_attribute_type_id: 3,
    dimension_type_id: 33,
    dimension_id: 33892,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── KPI : BSE Monthly Turnover ──────────────────────────────────────────────
//   source_id            : 13   (BSE Cash Market)
//   metric_id            : 66   (Equity Turnover — crore)
//   dimension_type_id    : 33
//   dimension_id         : 33893 (BSE — All)
//   date_attribute_type_id: 3
export const fetchMpKpiBseTurnover = () =>
  analyticsAggregate({
    source_id: 13,
    metric_id: 66,
    date_attribute_type_id: 3,
    dimension_type_id: 33,
    dimension_id: 33893,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ═══════════════════════════════════════════════════════════════════════════
//  KPI STRIP — Row 2 (5 cards)
// ═══════════════════════════════════════════════════════════════════════════

// ── KPI : A/D Ratio (NSE) ───────────────────────────────────────────────────
//   source_id            : 15   (NSE Advance/Decline)
//   metric_id            : 92   (A/D Ratio)
//   dimension_type_id    : 36
//   dimension_id         : 33906 (Overall market)
//   date_attribute_type_id: 3
export const fetchMpKpiAdRatio = () =>
  analyticsAggregate({
    source_id: 15,
    metric_id: 92,
    date_attribute_type_id: 3,
    dimension_type_id: 36,
    dimension_id: 33906,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── KPI : Nifty Volatility ──────────────────────────────────────────────────
//   source_id            : 18   (Index Volatility)
//   metric_id            : 94   (Annualized Volatility %)
//   dimension_type_id    : 38
//   dimension_id         : 33916 (Nifty)
//   date_attribute_type_id: 3
export const fetchMpKpiNiftyVol = () =>
  analyticsAggregate({
    source_id: 18,
    metric_id: 94,
    date_attribute_type_id: 3,
    dimension_type_id: 38,
    dimension_id: 33916,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });


// ── KPI : Mutual Fund Cash Share % ──────────────────────────────────────────
//   source_id            : 16   (NSE Participant Turnover)
//   metric_id            : 93   (Cash Market Turnover Share %)
//   dimension_type_id    : 37
//   dimension_id         : 33910 (Mutual Funds)
//   date_attribute_type_id: 3
export const fetchMpKpiMfCashShare = () =>
  analyticsAggregate({
    source_id: 16,
    metric_id: 93,
    date_attribute_type_id: 3,
    dimension_type_id: 37,
    dimension_id: 33910,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── KPI : NSE Top-10 Member Concentration ───────────────────────────────────
//   source_id            : 17   (NSE Member Concentration)
//   metric_id            : 105  (Top-10 cash turnover share %)
//   dimension_type_id    : 42
//   dimension_id         : 33949
//   date_attribute_type_id: 3
export const fetchMpKpiNseTop10 = () =>
  analyticsAggregate({
    source_id: 17,
    metric_id: 105,
    date_attribute_type_id: 3,
    dimension_type_id: 42,
    dimension_id: 33949,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── KPI : NSE Traded Securities (count) ─────────────────────────────────────
//   source_id            : 12   (NSE Cash Market)
//   metric_id            : 68   (Traded securities count)
//   dimension_type_id    : 33
//   dimension_id         : 33892 (NSE — All)
//   date_attribute_type_id: 3
export const fetchMpKpiNseTraded = () =>
  analyticsAggregate({
    source_id: 12,
    metric_id: 68,
    date_attribute_type_id: 3,
    dimension_type_id: 33,
    dimension_id: 33892,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });


// ═══════════════════════════════════════════════════════════════════════════
//  MINI CHARTS — "Cash Market Signals Are Mixed" (3 charts)
// ═══════════════════════════════════════════════════════════════════════════

// ── Mini Chart 1 : NSE + BSE Market Capitalisation ──────────────────────────
//   NSE: source_id:12, metric_id:65, dimension_type_id:33, dimension_id:33892
//   BSE: source_id:13, metric_id:65, dimension_type_id:33, dimension_id:33893
export const fetchMpMiniMcap = () =>
  Promise.all([
    analyticsAggregate({ source_id: 12, metric_id: 65, date_attribute_type_id: 3, dimension_type_id: 33, dimension_id: 33892, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 13, metric_id: 65, date_attribute_type_id: 3, dimension_type_id: 33, dimension_id: 33893, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Mini Chart 2 : Traded Quantity (NSE + BSE combined) ─────────────────────
//   metric_id            : 74   (Traded quantity — lakh shares)
//   NSE: source_id:12, dimension_type_id:33, dimension_id:33892
//   BSE: source_id:13, dimension_type_id:33, dimension_id:33893
//   date_attribute_type_id: 3
export const fetchMpMiniTradedQty = () =>
  Promise.all([
    analyticsAggregate({ source_id: 12, metric_id: 74, date_attribute_type_id: 3, dimension_type_id: 33, dimension_id: 33892, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 13, metric_id: 74, date_attribute_type_id: 3, dimension_type_id: 33, dimension_id: 33893, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Mini Chart 3 : FY Net Equity Flows (FPI gross purchase − gross sales) ───
//   source_id            : 14   (FPI)
//   metric_id            : 85   (Gross Purchase — crore)
//   metric_id            : 86   (Gross Sales — crore)
//   date_attribute_type_id: 3
//   granularity          : financial_year
//   net flow = purchase − sales (computed in component)
export const fetchMpMiniFyFlows = () =>
  Promise.all([
    analyticsAggregate({ source_id: 14, metric_id: 85, date_attribute_type_id: 3, granularity: 'financial_year', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 14, metric_id: 86, date_attribute_type_id: 3, granularity: 'financial_year', aggregation: 'sum', limit: 500 }),
  ]);

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN CHARTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Chart : NSE + BSE Market Capitalisation (large line chart) ───────────────
//   Same data as Mini Chart 1 — reuses fetchMpMiniMcap

// ── Chart : NSE Monthly Turnover (interactive area/line/bar + MA) ────────────
//   source_id            : 12   (NSE Cash Market)
//   metric_id            : 66   (Equity Turnover — crore)
//   dimension_type_id    : 33
//   dimension_id         : 33892 (NSE — All)
//   date_attribute_type_id: 3
export const fetchMpNseTurnover = () =>
  analyticsAggregate({
    source_id: 12,
    metric_id: 66,
    date_attribute_type_id: 3,
    dimension_type_id: 33,
    dimension_id: 33892,
    granularity: 'month',
    aggregation: 'sum',
    limit: 500,
  });

// ── Chart : Avg Monthly Turnover NSE vs BSE (annual avg grouped bar) ─────────
//   NSE: source_id:12, metric_id:66, dimension_type_id:33, dimension_id:33892
//   BSE: source_id:13, metric_id:66, dimension_type_id:33, dimension_id:33893
export const fetchMpAvgTurnover = () =>
  Promise.all([
    analyticsAggregate({ source_id: 12, metric_id: 66, date_attribute_type_id: 3, dimension_type_id: 33, dimension_id: 33892, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 13, metric_id: 66, date_attribute_type_id: 3, dimension_type_id: 33, dimension_id: 33893, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Chart : NSE Peak Market Cap by Year (bar chart) ──────────────────────────
//   source_id            : 12   (NSE Cash Market)
//   metric_id            : 65   (Market Capitalisation)
//   dimension_type_id    : 33
//   dimension_id         : 33892 (NSE — All)
//   granularity          : month  → grouped to year, take max per year in component
export const fetchMpPeakMcap = () =>
  analyticsAggregate({
    source_id: 12,
    metric_id: 65,
    date_attribute_type_id: 3,
    dimension_type_id: 33,
    dimension_id: 33892,
    granularity: 'month',
    aggregation: 'sum',
    limit: 500,
  });

// ── Chart : NSE Member Concentration (3-line chart) ──────────────────────────
//   source_id            : 17   (NSE Member Concentration)
//   dimension_type_id    : 42
//   dimension_id         : 33949
//   metric_id            : 104  (Top 5 members — % cash turnover)
//   metric_id            : 105  (Top 10 members — % cash turnover)
//   metric_id            : 106  (Top 25 members — % cash turnover)
//   date_attribute_type_id: 3
export const fetchMpMemberConc = () =>
  Promise.all([
    analyticsAggregate({ source_id: 17, metric_id: 104, date_attribute_type_id: 3, dimension_type_id: 42, dimension_id: 33949, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 17, metric_id: 105, date_attribute_type_id: 3, dimension_type_id: 42, dimension_id: 33949, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 17, metric_id: 106, date_attribute_type_id: 3, dimension_type_id: 42, dimension_id: 33949, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Chart : NSE Trading Frequency (bar + line combo) ────────────────────────
//   source_id            : 34
//   dimension_id         : 34160
//   metric_id            : 67   (Listed companies count)
//   metric_id            : 68   (Traded securities count)
//   metric_id            : 161  (Traded / Listed ratio)
//   date_attribute_type_id: 3
export const fetchMpTradingFreq = () =>
  Promise.all([
    analyticsAggregate({ source_id: 34, metric_id: 67,  date_attribute_type_id: 3, dimension_id: 34160, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 34, metric_id: 68,  date_attribute_type_id: 3, dimension_id: 34160, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 34, metric_id: 161, date_attribute_type_id: 3, dimension_id: 34160, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Chart : NSE Security-Level Turnover Concentration (3-line area) ──────────
//   source_id            : 17   (NSE Concentration)
//   dimension_type_id    : 42
//   dimension_id         : 33946
//   metric_id            : 104  (Top 5 securities — % turnover)
//   metric_id            : 106  (Top 25 securities — % turnover)
//   metric_id            : 108  (Top 100 securities — % turnover)
//   date_attribute_type_id: 3
export const fetchMpSecConc = () =>
  Promise.all([
    analyticsAggregate({ source_id: 17, metric_id: 104, date_attribute_type_id: 3, dimension_type_id: 42, dimension_id: 33946, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 17, metric_id: 106, date_attribute_type_id: 3, dimension_type_id: 42, dimension_id: 33946, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 17, metric_id: 108, date_attribute_type_id: 3, dimension_type_id: 42, dimension_id: 33946, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Chart : NSE Market Breadth — Advances vs Declines (stacked bar) ──────────
//   source_id            : 15   (NSE Advance/Decline)
//   dimension_type_id    : 36
//   dimension_id         : 33906 (Overall market)
//   metric_id            : 90   (Advances count)
//   metric_id            : 91   (Declines count)
//   date_attribute_type_id: 3
export const fetchMpBreadth = () =>
  Promise.all([
    analyticsAggregate({ source_id: 15, metric_id: 90, date_attribute_type_id: 3, dimension_type_id: 36, dimension_id: 33906, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 15, metric_id: 91, date_attribute_type_id: 3, dimension_type_id: 36, dimension_id: 33906, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Chart : Index Volatility — Sensex & Nifty (dual line) ────────────────────
//   source_id            : 18   (Index Volatility)
//   metric_id            : 94   (Annualized Volatility %)
//   dimension_type_id    : 38
//   dimension_id         : 33913 (Sensex)
//   dimension_id         : 33916 (Nifty)
//   date_attribute_type_id: 3
export const fetchMpVolatility = () =>
  Promise.all([
    analyticsAggregate({ source_id: 18, metric_id: 94, date_attribute_type_id: 3, dimension_type_id: 38, dimension_id: 33913, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 18, metric_id: 94, date_attribute_type_id: 3, dimension_type_id: 38, dimension_id: 33916, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Chart : NSE Cash Market Participant Mix (stacked area) ────────────────────
//   source_id            : 16   (NSE Participant Turnover)
//   metric_id            : 93   (Cash Market Turnover Share %)
//   dimension_type_id    : 37
//   dimension_ids:
//     FPI          → 33909
//     Mutual Funds → 33910
//     Proprietary  → 33908
//     Others       → 33912
//     Banks        → 33911
//   date_attribute_type_id: 3
export const fetchMpParticipantMix = () =>
  Promise.all([
    analyticsAggregate({ source_id: 16, metric_id: 93, date_attribute_type_id: 3, dimension_type_id: 37, dimension_id: 33909, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 16, metric_id: 93, date_attribute_type_id: 3, dimension_type_id: 37, dimension_id: 33910, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 16, metric_id: 93, date_attribute_type_id: 3, dimension_type_id: 37, dimension_id: 33908, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 16, metric_id: 93, date_attribute_type_id: 3, dimension_type_id: 37, dimension_id: 33912, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 16, metric_id: 93, date_attribute_type_id: 3, dimension_type_id: 37, dimension_id: 33911, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);
