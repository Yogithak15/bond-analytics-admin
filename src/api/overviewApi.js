import { analyticsAggregate, getAnalyticsData } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Overview Page — API definitions
//  Each export maps to exactly one card or chart on the Overview tab.
//  All IDs are listed inline so they are easy to find and change.
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
//  KPI STRIP — top 7 cards
// ═══════════════════════════════════════════════════════════════════════════

// ── KPI Card 1 : NSE Market Cap ─────────────────────────────────────────────
//   source_id            : 12   (NSE Cash Market)
//   metric_id            : 65   (Market Capitalisation)
//   date_attribute_type_id: 3
//   dimension_type_id    : 33
//   dimension_id         : 33892 (NSE — All)
//   granularity          : month  → take last row as latest value
export const fetchKpiNseMcap = () =>
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

// ── KPI Card 2 : BSE Market Cap ─────────────────────────────────────────────
//   source_id            : 13   (BSE Cash Market)
//   metric_id            : 65   (Market Capitalisation)
//   date_attribute_type_id: 3
//   dimension_type_id    : 33
//   dimension_id         : 33893 (BSE — All)
//   granularity          : month  → take last row as latest value
export const fetchKpiBseMcap = () =>
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

// ── KPI Card 3 : FPI Net Flow YTD ───────────────────────────────────────────
//   source_id            : 14   (FPI)
//   metric_id            : 87   (Net Flow — crore)
//   date_attribute_type_id: 3
//   granularity          : year   → current year = YTD sum
export const fetchKpiFpiNetFlowYtd = () => {
  const yr = new Date().getFullYear();
  return analyticsAggregate({
    source_id: 14,
    metric_id: 87,
    date_attribute_type_id: 3,
    granularity: 'month',
    aggregation: 'sum',
    start_date: `${yr}-01-01`,
    end_date:   `${yr}-12-31`,
    limit: 500,
  });
};

// ── KPI Card 4 : QIP Raised YTD (current financial year Apr–Mar) ────────────
//   source_id            : 19
//   metric_id            : 96
//   dimension_id         : 33924
//   date_attribute_type_id: 3
//   granularity          : month  → sum all months in current FY
export const fetchKpiQipYtd = () => {
  const now = new Date();
  const fyEnd   = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = fyEnd - 1;
  return analyticsAggregate({
    source_id: 19,
    metric_id: 96,
    date_attribute_type_id: 3,
    dimension_id: 33924,
    granularity: 'financial_year',
    aggregation: 'sum',
    start_date: `${fyStart}-04-01`,
    end_date:   `${fyEnd}-03-31`,
    limit: 1,
  });
};

// ── KPI Card 5 : Registered AIFs ────────────────────────────────────────────
//   source_id            : 31
//   metric_id            : 143
//   dimension_id         : 34071
//   date_attribute_type_id: 3
//   granularity          : month  → take last row as latest value
export const fetchKpiRegisteredAifs = () =>
  analyticsAggregate({
    source_id: 31,
    metric_id: 143,
    date_attribute_type_id: 3,
    dimension_id: 34071,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── KPI Card 6 : Registered FPIs ────────────────────────────────────────────
//   source_id            : 31
//   metric_id            : 143
//   dimension_id         : 34053
//   date_attribute_type_id: 3
export const fetchKpiRegisteredFpis = () =>
  analyticsAggregate({
    source_id: 31,
    metric_id: 143,
    date_attribute_type_id: 3,
    dimension_id: 34053,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── KPI Card 7 : Total Demat Accounts (CDSL + NSDL, latest month) ───────────
//   source_id            : 32
//   metric_id            : 147
//   dimension_id         : 34086 (CDSL), 34085 (NSDL)
//   date_attribute_type_id: 3
//   values in Lakh → convert to Crore (÷100) in component
export const fetchKpiDematAccounts = () =>
  Promise.all([
    analyticsAggregate({
      source_id: 32,
      metric_id: 147,
      date_attribute_type_id: 3,
      dimension_id: 34086,
      granularity: 'month',
      aggregation: 'sum',
      limit: 1,
    }),
    analyticsAggregate({
      source_id: 32,
      metric_id: 147,
      date_attribute_type_id: 3,
      dimension_id: 34085,
      granularity: 'month',
      aggregation: 'sum',
      limit: 1,
    }),
  ]);

// ═══════════════════════════════════════════════════════════════════════════
//  CHARTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Chart 1 : NSE Market Capitalisation (line chart, last 24 months) ────────
//   source_id            : 12   (NSE Cash Market)
//   metric_id            : 65   (Market Capitalisation)
//   date_attribute_type_id: 3
//   granularity          : month
export const fetchNseMcap = ({ startDate, endDate }) =>
  analyticsAggregate({
    source_id: 12,
    metric_id: 65,
    date_attribute_type_id: 3,
    granularity: 'month',
    aggregation: 'sum',
    start_date: startDate,
    end_date: endDate,
    limit: 100,
  });

// ── Chart 2 : FPI Net Flows — Monthly (bar chart, last 24 months) ───────────
//   source_id            : 14   (FPI)
//   metric_id            : 87   (Net Flow — crore)
//   date_attribute_type_id: 3
//   granularity          : month
export const fetchFpiFlowsMonthly = ({ startDate, endDate }) =>
  analyticsAggregate({
    source_id: 14,
    metric_id: 87,
    date_attribute_type_id: 3,
    granularity: 'month',
    aggregation: 'sum',
    start_date: startDate,
    end_date: endDate,
    limit: 100,
  });

// ── Chart 3 : Annual NSE Equity Turnover (bar chart, all years) ─────────────
//   source_id            : 12   (NSE Cash Market)
//   metric_id            : 66   (Equity Turnover — crore)
//   date_attribute_type_id: 3
//   dimension_type_id    : 33
//   dimension_id         : 33892 (NSE — All)
//   granularity          : month  → grouped to calendar year in component
export const fetchNseTurnoverMonthly = () =>
  analyticsAggregate({
    source_id: 12,
    metric_id: 66,
    date_attribute_type_id: 3,
    granularity: 'month',
    aggregation: 'sum',
    start_date: '2015-01-01',
    end_date: `${new Date().getFullYear()}-12-31`,
    limit: 500,
  });

// ── Chart 4 : Annual FPI Net Flows (bar chart, all years) ───────────────────
//   source_id            : 14   (FPI)
//   metric_id            : 87   (Net Flow — crore)
//   date_attribute_type_id: 3
//   granularity          : month  → grouped to calendar year in component
export const fetchFpiFlowsAnnual = () =>
  analyticsAggregate({
    source_id: 14,
    metric_id: 87,
    date_attribute_type_id: 3,
    granularity: 'month',
    aggregation: 'sum',
    start_date: '2014-01-01',
    end_date: `${new Date().getFullYear()}-12-31`,
    limit: 500,
  });

// ── Metric Card : India VIX (latest month, read from metric_text) ───────────
//   source_id 33 · metric_id 160 · dimension_id 34128
//   NOTE: metric_value is null for this dataset — value lives in metric_text
//   Returns rows sorted by Reporting Date desc; caller takes rows[0].metric_text
export const fetchIndiaVix = () =>
  getAnalyticsData({ source_id: 33, dimension_id: 34128, metric_id: 160, limit: 100 });

// ── Metric Card : Nifty P/E (latest month, read from metric_text) ────────────
//   source_id 33 · metric_id 160 · dimension_id 34127
//   NOTE: metric_value is null for this dataset — value lives in metric_text
export const fetchNiftyPE = () =>
  getAnalyticsData({ source_id: 33, dimension_id: 34127, metric_id: 160, limit: 100 });

// ── Metric Card : Others Cash Share (latest month %) ────────────────────────
//   source_id            : 16
//   metric_id            : 93
//   dimension_id         : 33912 (Others)
//   date_attribute_type_id: 3
export const fetchOthersCashShare = () =>
  analyticsAggregate({
    source_id: 16,
    metric_id: 93,
    date_attribute_type_id: 3,
    dimension_id: 33912,
    granularity: 'month',
    aggregation: 'sum',
    limit: 1,
  });

// ── Chart 5 : NSE Cash Market Participant Share (donut chart) ───────────────
//   source_id            : 16   (NSE Participant Turnover)
//   metric_id            : 93   (Cash Market Turnover Share %)
//   date_attribute_type_id: 3
//   One call per dimension, limit:1 → latest month each
//   dimension_ids:
//     Proprietary  → 33908
//     FPIs         → 33909
//     Mutual Funds → 33910
//     Banks        → 33911
//     Others       → 33912
const PARTICIPANT_DIMS = [33908, 33909, 33910, 33911, 33912];
export const fetchParticipantShare = () =>
  Promise.all(
    PARTICIPANT_DIMS.map(dimension_id =>
      analyticsAggregate({
        source_id: 16,
        metric_id: 93,
        date_attribute_type_id: 3,
        dimension_id,
        granularity: 'month',
        aggregation: 'sum',
        limit: 1,
      })
    )
  );

// ── Chart 6 : Market Breadth — Advance / Decline Ratio (line chart) ─────────
//   source_id            : 15   (NSE Advance/Decline)
//   metric_id            : 92
//   date_attribute_type_id: 3
//   dimension_type_id    : 36
//   dimension_id         : 33906 (Overall market)
//   granularity          : month
export const fetchAdvanceDecline = ({ startDate, endDate }) =>
  analyticsAggregate({
    source_id: 15,
    metric_id: 92,
    date_attribute_type_id: 3,
    dimension_type_id: 36,
    dimension_id: 33906,
    granularity: 'month',
    aggregation: 'sum',
    start_date: startDate,
    end_date: endDate,
    limit: 100,
  });
