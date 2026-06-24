import {
  analyticsAggregate,
  getAnalyticsData,
  getSnapshotData,
  getDimensions,
  getMarketComposition,
  getCorpBondOutstandingByIssuer,
  getCorpBondTradingTrend,
  getPrivatePlacementTrend,
  getGsecMaturityProfile,
  getSdlMaturityProfile,
  getSdlAnnualArchive,
  getSdlCouponStack,
  getSdlWeightedCouponTrend,
  getSdlInstrumentComposition,
  getSdlQaSignals,
  getStripsMaturityProfile,
  getNcdPublicIssuesTrend,
  getStateOutstandingShare,
  getCorpBondLegacyIssuerSplit,
  getCorpBondCurrentIssuerSplit,
} from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Debt Markets Page — API definitions
//
//  Confirmed source_ids:
//    source_id  1  — NCD Public Issues              date_attr_type 2
//    source_id  2  — Private Placements             date_attr_type 3
//    source_id  3  — Corp Bond Trades (SEBI)        date_attr_type 3
//    source_id  5  — Corp Bond Outstanding (TRACKS) date_attr_type 3
//    source_id  6  — SGB Outstanding                date_attr_type 6
//    source_id  7  — SDL / SGS Outstanding          date_attr_type 5
//    source_id  8  — G-Sec Outstanding              date_attr_type 5
//    source_id  9  — STRIPS Outstanding             date_attr_type 5
//    source_id 11  — RBI Policy Rates               date_attr_type 9
//

// ═══════════════════════════════════════════════════════════════════════════
//  OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════

// ── KPI : G-Sec Outstanding (snapshot, sum all dim_type 14 rows) ────────────
//   /analytics/snapshot-data · source_id 8 · metric_id 29 · date_attr 5 · dim_type 14
export const fetchDmKpiGsecOs = async () => {
  const raw  = await getSnapshotData({ source_id: 8, date_attribute_type_id: 5, dimension_type_id: 14, metric_id: 29 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  if (!list.length) return [];
  const period = raw?.snapshot_date ?? null;
  const total  = list.reduce((sum, r) => sum + +(r.metric_value ?? r.value ?? 0), 0);
  return [{ period, value: total }];
};

// ── KPI : SGS Outstanding (snapshot, sum all dim_type 11 rows) ──────────────
//   /analytics/snapshot-data · source_id 7 · metric_id 29 · date_attr 5 · dim_type 11
export const fetchDmKpiSgsOs = async () => {
  const raw  = await getSnapshotData({ source_id: 7, date_attribute_type_id: 5, dimension_type_id: 11, metric_id: 29 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  if (!list.length) return [];
  const period = raw?.snapshot_date ?? null;
  const total  = list.reduce((sum, r) => sum + +(r.metric_value ?? r.value ?? 0), 0);
  return [{ period, value: total }];
};

// ── KPI : Corp Bond Outstanding (snapshot, latest month, sum all dim_type 5 rows) ─
//   /analytics/snapshot-data · source_id 5 · metric_id 22 · date_attr 3 · dim_type 5
export const fetchDmKpiCorpBondOs = async () => {
  const raw  = await getSnapshotData({ source_id: 5, date_attribute_type_id: 3, dimension_type_id: 5, metric_id: 22 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  if (!list.length) return [];
  const period = raw?.snapshot_date ?? null;
  const total  = list.reduce((sum, r) => sum + +(r.metric_value ?? r.value ?? 0), 0);
  return [{ period, value: total }];
};

// ── KPI : Total Debt Market — dedicated endpoint ─────────────────────────────
//   Returns { segments: [{instrument, value_cr}], grand_total_cr }
export { getMarketComposition as fetchDmMarketComposition };

// ── KPI : 10Y G-Sec Zero (FY 2025-26, latest available month) ───────────────
//   source_id 33 · metric_id 160 · dimension_id 34092 · date_attr 3
export const fetchDmKpi10YZero = () =>
  analyticsAggregate({
    source_id: 33, metric_id: 160,
    date_attribute_type_id: 3, dimension_id: 34092,
    granularity: 'month', aggregation: 'sum',
    limit: 100,
  });

// ── KPI : SGB Outstanding (snapshot, sum all dim_type 10 rows) ──────────────
//   /analytics/snapshot-data · source_id 6 · metric_id 28 · date_attr 6 · dim_type 10
export const fetchDmKpiSgbOs = async () => {
  const raw  = await getSnapshotData({ source_id: 6, date_attribute_type_id: 6, dimension_type_id: 10, metric_id: 28 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  if (!list.length) return [];
  const period = raw?.snapshot_date ?? null;
  const total  = list.reduce((sum, r) => sum + +(r.metric_value ?? r.value ?? 0), 0);
  return [{ period, value: total }];
};

// ── Chart : Key Sovereign Rates — Repo Rate + Zero Coupon Yields ─────────────
//   Repo Rate: source 48 · metric 180 · dim_type 67 · dim_id 34509 (monthly aggregate)
//   Zero yields: /analytics_data/ endpoint (daily) — component picks latest per month
//     1Y: dim 34521 · 5Y: dim 34529 · 10Y: dim 34539
export const fetchDmRepoRateMonthly = () =>
  Promise.all([
    analyticsAggregate({ source_id: 48, date_attribute_type_id: 3, metric_id: 180, dimension_type_id: 67, dimension_id: 34509, granularity: 'month', aggregation: 'sum', limit: 500 }),
    getAnalyticsData({ source_id: 49, dimension_id: 34521, metric_id: 181, limit: 2000 }),
    getAnalyticsData({ source_id: 49, dimension_id: 34529, metric_id: 181, limit: 2000 }),
    getAnalyticsData({ source_id: 49, dimension_id: 34539, metric_id: 181, limit: 2000 }),
  ]);

// ── Chart : Secondary Debt Trading — SEBI Corp Bond Trades ──────────────────
export const fetchDmSebiCorpTrades = () =>
  analyticsAggregate({
    source_id: 3, metric_id: 6,
    date_attribute_type_id: 3, dimension_type_id: 3,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Chart : NSE WDM Traded Value — sum of all 7 security types ───────────────
export const fetchDmWdmTradedValue = () =>
  analyticsAggregate({
    source_id: 54, date_attribute_type_id: 11, metric_id: 193,
    dimension_type_id: 77,
    dimension_id: [34800, 34801, 34802, 34803, 34804, 34805, 34806],
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Chart : FBIL G-Sec Zero Curve — snapshot yield curve across tenors ───────
//   source_id 49 · metric_id 181 · date_attr 3 · dim_type 68
//   One getAnalyticsData call per key tenor → pick latest record → yield curve
const ZERO_CURVE_TENORS = [
  { id: 34520, label: '6M'  }, { id: 34521, label: '1Y'  }, { id: 34522, label: '1.5Y' },
  { id: 34523, label: '2Y'  }, { id: 34525, label: '3Y'  }, { id: 34527, label: '4Y'  },
  { id: 34529, label: '5Y'  }, { id: 34531, label: '6Y'  }, { id: 34533, label: '7Y'  },
  { id: 34535, label: '8Y'  }, { id: 34537, label: '9Y'  }, { id: 34539, label: '10Y' },
  { id: 34541, label: '11Y' }, { id: 34543, label: '12Y' }, { id: 34545, label: '13Y' },
  { id: 34547, label: '14Y' }, { id: 34549, label: '15Y' }, { id: 34551, label: '16Y' },
  { id: 34553, label: '17Y' }, { id: 34555, label: '18Y' }, { id: 34557, label: '19Y' },
  { id: 34559, label: '20Y' }, { id: 34569, label: '25Y' }, { id: 34579, label: '30Y' },
  { id: 34600, label: '40Y' },
];
export const fetchDmZeroCurve = () =>
  Promise.all(
    ZERO_CURVE_TENORS.map(d =>
      getAnalyticsData({ source_id: 49, dimension_id: d.id, metric_id: 181, limit: 5 })
        .then(raw => ({ ...d, raw })).catch(() => ({ ...d, raw: [] }))
    )
  );

// ── Chart : CCIL ZCYC Model Pulse — Beta0 + Beta1 NSS parameters ─────────────
//   source_id 51 · metric_id 182 (parameter_value) · dim_type 70
//   BETA_0: dim 34620 (long-run level) · BETA_1: dim 34621 (slope factor)
export const fetchDmZcycModelPulse = () =>
  Promise.all([
    analyticsAggregate({ source_id: 51, date_attribute_type_id: 3, metric_id: 182, dimension_type_id: 70, dimension_id: 34620, granularity: 'day', aggregation: 'avg', limit: 200 }),
    analyticsAggregate({ source_id: 51, date_attribute_type_id: 3, metric_id: 182, dimension_type_id: 70, dimension_id: 34621, granularity: 'day', aggregation: 'avg', limit: 200 }),
  ]);

// ── Chart : G-Sec Auction Supply vs Cut-off Yield ────────────────────────────
//   source_id 52 · dim_type 71 (all dims aggregated) · date_attr 10
//   metric 184 = amount_accepted_rs_cr (bars) · metric 186 = cutoff_yield_percent (line)
export const fetchDmGsecAuction = () =>
  Promise.all([
    analyticsAggregate({ source_id: 52, date_attribute_type_id: 10, metric_id: 184, dimension_type_id: 71, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 52, date_attribute_type_id: 10, metric_id: 186, dimension_type_id: 71, granularity: 'financial_year', aggregation: 'avg', limit: 100 }),
  ]);

// ── Chart : SDL Auction Supply and Clearing Yield ────────────────────────────
//   source_id 53 · dim_type 72 (all states) · date_attr 10
//   metric 184 = amount_accepted_rs_cr (bars, sum) · metric 187 = weighted_average_yield_percent (line, avg)
export const fetchDmSdlAuction = () =>
  Promise.all([
    analyticsAggregate({ source_id: 53, date_attribute_type_id: 10, metric_id: 184, dimension_type_id: 72, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 53, date_attribute_type_id: 10, metric_id: 187, dimension_type_id: 72, granularity: 'financial_year', aggregation: 'avg', limit: 100 }),
  ]);

// ── Chart : Top SDL Auction Borrowers ────────────────────────────────────────
//   Fetches all dim_type 72 state IDs, then one call per state for latest FY amount
//   Returns [{name, value, period}] sorted by value descending
export const fetchDmSdlTopBorrowers = async () => {
  const dimsRaw = await getDimensions(72, true, 0, 100);
  const dims = Array.isArray(dimsRaw) ? dimsRaw : (dimsRaw?.data || []);
  if (!dims.length) return [];
  const results = await Promise.all(
    dims.map(d =>
      analyticsAggregate({
        source_id: 53, date_attribute_type_id: 10, metric_id: 184,
        dimension_type_id: 72, dimension_id: d.dimension_id,
        granularity: 'financial_year', aggregation: 'sum', limit: 2,
      }).then(raw => {
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []);
        if (!list.length) return null;
        const latest = list[list.length - 1];
        const val = +(latest?.value ?? latest?.metric_value ?? 0);
        return val > 0 ? { name: d.dimension_name, value: val, period: latest.period ?? '' } : null;
      }).catch(() => null)
    )
  );
  return results.filter(Boolean).sort((a, b) => b.value - a.value);
};

// ── Chart : NSE EBP Issuance Mix — per-type stacked area ─────────────────────
//   source_id 10 · metric_id 35 (amount_raised) · dim_type 73
//   NCD 34783 · Other 34784 · Bank Capital 34785 · Bond 34786 · Debenture 34787 · Structured 34788
const EBP_DIMS = [
  { id: 34783, name: 'NCD',          color: '#3b82f6' },
  { id: 34786, name: 'Bond',         color: '#10b981' },
  { id: 34787, name: 'Debenture',    color: '#06b6d4' },
  { id: 34785, name: 'Bank Capital', color: '#8b5cf6' },
  { id: 34788, name: 'Structured',   color: '#f97316' },
  { id: 34784, name: 'Other',        color: '#94a3b8' },
];
export const fetchDmEbpIssuanceMix = () =>
  Promise.all(
    EBP_DIMS.map(d =>
      analyticsAggregate({
        source_id: 10, date_attribute_type_id: 7, metric_id: 35,
        dimension_type_id: 73, dimension_id: d.id,
        granularity: 'month', aggregation: 'sum', limit: 500,
      }).then(raw => ({ ...d, raw })).catch(() => ({ ...d, raw: [] }))
    )
  );

// ── Chart : NSE WDM Security Mix — per-type stacked area ─────────────────────
//   source_id 54 · metric_id 193 · date_attr 11 · dim_type 77
//   One call per dim so each type is a separate series
const WDM_DIMS = [
  { id: 34800, name: 'G-Sec',     color: '#3b82f6' },
  { id: 34801, name: 'T-Bill',    color: '#10b981' },
  { id: 34802, name: 'SDL',       color: '#06b6d4' },
  { id: 34803, name: 'Corp Debt', color: '#8b5cf6' },
  { id: 34804, name: 'PTC',       color: '#f97316' },
  { id: 34805, name: 'CP',        color: '#f59e0b' },
  { id: 34806, name: 'Other',     color: '#94a3b8' },
];
export const fetchDmWdmSecurityMix = () =>
  Promise.all(
    WDM_DIMS.map(d =>
      analyticsAggregate({
        source_id: 54, date_attribute_type_id: 11, metric_id: 193,
        dimension_type_id: 77, dimension_id: d.id,
        granularity: 'month', aggregation: 'sum', limit: 500,
      }).then(raw => ({ ...d, raw })).catch(() => ({ ...d, raw: [] }))
    )
  );

// ── Chart : NSE WDM Security Mix — source_id TBD ────────────────────────────
//   Segments: G-Sec, T-Bill, SDL, Corp Debt, PTC, CP, Other
//   Discover via GET /data-sources/ → filter source_name = "NSE WDM"

// ── Chart : NSE EBP Issuance Mix — source_id TBD ────────────────────────────
//   Segments: NCD, Bond, Debenture, Bank Capital, Structured, Other
//   Discover via GET /data-sources/ → filter source_name = "NSE EBP"


// ═══════════════════════════════════════════════════════════════════════════
//  G-SECS TAB
// ═══════════════════════════════════════════════════════════════════════════

const computeWam = (list, snapshotDate) => {
  const ref = snapshotDate ? new Date(snapshotDate) : new Date();
  let ws = 0, tw = 0;
  for (const r of list) {
    const md = r.date ? new Date(r.date) : null;
    if (!md || isNaN(md)) continue;
    const yrs = (md - ref) / (365.25 * 24 * 3600 * 1000);
    if (yrs <= 0) continue;
    const w = +(r.metric_value ?? 0);
    ws += yrs * w; tw += w;
  }
  return tw > 0 ? ws / tw : null;
};

// ── KPI : G-Sec Weighted Average Maturity ───────────────────────────────────
export const fetchDmGsecWam = async () => {
  const raw  = await getSnapshotData({ source_id: 8, date_attribute_type_id: 5, dimension_type_id: 13, metric_id: 29 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  const wam  = computeWam(list, raw?.snapshot_date);
  return { wam, snapshot_date: raw?.snapshot_date ?? null };
};

// ── Chart : G-Sec Maturity Ladder by FY ─────────────────────────────────────
//   Reuses snapshot source_id 8 · dim_type 13; groups metric_value by maturity FY
//   Returns [{ fy: '2026-27', value_cr: 123456 }] sorted ascending
export const fetchDmGsecMaturityLadder = async () => {
  const raw  = await getSnapshotData({ source_id: 8, date_attribute_type_id: 5, dimension_type_id: 13, metric_id: 29 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  const byFy = {};
  for (const r of list) {
    if (!r.date) continue;
    const d = new Date(r.date);
    if (isNaN(d)) continue;
    const yr  = d.getFullYear();
    const mo  = d.getMonth() + 1;
    const fy  = mo >= 4 ? `${yr}-${String(yr+1).slice(2)}` : `${yr-1}-${String(yr).slice(2)}`;
    byFy[fy]  = (byFy[fy] ?? 0) + +(r.metric_value ?? 0);
  }
  return Object.entries(byFy)
    .map(([fy, value_cr]) => ({ fy, value_cr }))
    .sort((a, b) => a.fy.localeCompare(b.fy));
};

// ── Chart : STRIPS Maturity Ladder by FY ────────────────────────────────────
//   Reuses snapshot source_id 9 · dim_type 15; groups metric_value by maturity FY
//   Returns [{ fy: '2026-27', value_cr: 123456 }] sorted ascending
export const fetchDmStripsMaturityLadder = async () => {
  const raw  = await getSnapshotData({ source_id: 9, date_attribute_type_id: 5, dimension_type_id: 15, metric_id: 29 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  const byFy = {};
  for (const r of list) {
    if (!r.date) continue;
    const d = new Date(r.date);
    if (isNaN(d)) continue;
    const yr  = d.getFullYear();
    const mo  = d.getMonth() + 1;
    const fy  = mo >= 4 ? `${yr}-${String(yr+1).slice(2)}` : `${yr-1}-${String(yr).slice(2)}`;
    byFy[fy]  = (byFy[fy] ?? 0) + +(r.metric_value ?? 0);
  }
  return Object.entries(byFy)
    .map(([fy, value_cr]) => ({ fy, value_cr }))
    .sort((a, b) => a.fy.localeCompare(b.fy));
};

// ── KPI : STRIPS Stock (snapshot, sum all dim_type 15 rows) ─────────────────
//   /analytics/snapshot-data · source_id 9 · metric_id 29 · date_attr 5 · dim_type 15
export const fetchDmKpiStripsOs = async () => {
  const raw  = await getSnapshotData({ source_id: 9, date_attribute_type_id: 5, dimension_type_id: 15, metric_id: 29 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  if (!list.length) return [];
  const period = raw?.snapshot_date ?? null;
  const total  = list.reduce((sum, r) => sum + +(r.metric_value ?? r.value ?? 0), 0);
  return [{ period, value: total }];
};

// ── KPI : STRIPS Weighted Average Maturity ──────────────────────────────────
export const fetchDmStripsWam = async () => {
  const raw  = await getSnapshotData({ source_id: 9, date_attribute_type_id: 5, dimension_type_id: 15, metric_id: 29 });
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  const wam  = computeWam(list, raw?.snapshot_date);
  return { wam, snapshot_date: raw?.snapshot_date ?? null };
};

// ── KPI : 1S10S Slope — TBD (FBIL ZCYC) ────────────────────────────────────

// ── Chart : G-Sec Maturity Profile by residual bucket ───────────────────────
//   Dedicated endpoint → /analytics/gsec/maturity-profile
export { getGsecMaturityProfile as fetchDmGsecMaturityProfile };

// ── Chart : STRIPS Maturity Profile by residual bucket ──────────────────────
//   Dedicated endpoint → /analytics/gsec/strips/maturity-profile
export { getStripsMaturityProfile as fetchDmStripsMaturityProfile };

// ── Chart : G-Sec Outstanding — Annual trend ────────────────────────────────
//   source_id 8 · metric_id 29 · date_attr 5 · dim_type 14 · granularity FY
export const fetchDmGsecTrend = () =>
  analyticsAggregate({
    source_id: 8, metric_id: 29,
    date_attribute_type_id: 5, dimension_type_id: 14,
    granularity: 'financial_year', aggregation: 'sum', limit: 100,
  });

// ── Chart : STRIPS Outstanding — Annual trend ───────────────────────────────
//   source_id 9 · metric_id 29 · date_attr 5 · dim_type 15 · granularity FY
//   NOTE: returns ₹ face value; divide by 1e7 for ₹ L Cr
export const fetchDmStripsTrend = () =>
  analyticsAggregate({
    source_id: 9, metric_id: 29,
    date_attribute_type_id: 5, dimension_type_id: 15,
    granularity: 'financial_year', aggregation: 'sum', limit: 100,
  });

// ── Chart : G-Sec Auction Supply & Cut-off Yield — TBD ──────────────────────
//   Source: FIMMDA auction data — source_id not yet confirmed
// ── Chart : FBIL G-Sec Zero Curve — TBD ────────────────────────────────────
//   Source: FBIL ZCYC — source_id not yet confirmed
// ── Chart : CCIL ZCYC Model Pulse (Beta0, Beta1) — TBD ─────────────────────
//   Source: CCIL ZCYC NSS parameters — source_id not yet confirmed
// ── Chart : G-Sec Maturity Ladder by FY — TBD ───────────────────────────────
// ── Chart : STRIPS Maturity Ladder by FY — TBD ──────────────────────────────
// ── Shared WAM helper ────────────────────────────────────────────────────────


// ── Table : Top G-Sec Outstanding Lines  +  KPI : G-Sec WAM ────────────────
//   /analytics/snapshot-data · source_id 8 · metric_id 29 · date_attr 5 · dim_type 13
export const fetchDmTopGsecLines = () =>
  getSnapshotData({ source_id: 8, date_attribute_type_id: 5, dimension_type_id: 13, metric_id: 29 });


// ── Table : Top STRIPS Lines ─────────────────────────────────────────────────
//   /analytics/snapshot-data · source_id 9 · metric_id 29 · date_attr 5 · dim_type 16
export const fetchDmTopStripsLines = () =>
  getSnapshotData({ source_id: 9, date_attribute_type_id: 5, dimension_type_id: 16, metric_id: 29 });



// ── Chart : RBI Policy Rates — all 7 metrics monthly ───────────────────────
//   source_id 11 · date_attr 9 · granularity month
//   metric_ids: 46 Repo, 47 SDF, 48 MSF, 49 Bank Rate,
//               50 Reverse Repo, 51 CRR, 52 SLR
export const fetchDmPolicyRates = () =>
  Promise.all(
    [46, 47, 48, 49, 50, 51, 52].map(metric_id =>
      analyticsAggregate({
        source_id: 11, metric_id,
        date_attribute_type_id: 9,
        granularity: 'month', aggregation: 'sum', limit: 500,
      })
    )
  );


// ═══════════════════════════════════════════════════════════════════════════
//  SGS TAB
// ═══════════════════════════════════════════════════════════════════════════

// ── KPI : Annual Archive Stock (latest financial year total) ─────────────────
//   Returns the single most-recent FY row; component reads row[0].value as ₹ Cr
//   source_id            : 7    (SDL / SGS Outstanding)
//   metric_id            : 29
//   date_attribute_type_id: 5
//   dimension_type_id    : 11   (state-level aggregate, all states summed)
//   granularity          : financial_year
//   aggregation          : sum
//   limit                : 1    → only the latest FY row
export const fetchDmSgsArchiveStockKpi = () =>
  analyticsAggregate({
    source_id: 7, metric_id: 29,
    date_attribute_type_id: 5, dimension_type_id: 11,
    granularity: 'financial_year', aggregation: 'sum', limit: 1,
  });

// ── KPI : Archive CAGR — compound annual growth rate across full FY history ──
//   No separate API call; fetches the same full FY series as the chart and
//   computes CAGR = (last / first) ^ (1 / (n-1)) - 1 over all available years.
//   source_id            : 7
//   metric_id            : 29
//   date_attribute_type_id: 5
//   dimension_type_id    : 11
//   granularity          : financial_year
//   Returns { cagr: number (%), firstPeriod: string, lastPeriod: string }
export const fetchDmSgsArchiveCagr = async () => {
  const raw  = await analyticsAggregate({
    source_id: 7, metric_id: 29,
    date_attribute_type_id: 5, dimension_type_id: 11,
    granularity: 'financial_year', aggregation: 'sum', limit: 100,
  });
  const list = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []);
  const vals = list.map(r => +(r.value ?? r.metric_value ?? 0)).filter(Boolean);
  if (vals.length < 2) return null;
  const cagr = (Math.pow(vals[vals.length - 1] / vals[0], 1 / (vals.length - 1)) - 1) * 100;
  return {
    cagr: +cagr.toFixed(1),
    firstPeriod: list[0]?.period ?? '',
    lastPeriod:  list[list.length - 1]?.period ?? '',
  };
};


// ── KPI : Top-5 State Share ──────────────────────────────────────────────────
//   Endpoint → /analytics/state-outstanding-share  (same as above)
//   Sorts all states by outstanding_cr descending, sums share_pct of top 5
//   Returns { share: number (%), top5: [{ state_name, outstanding_cr, share_pct }] }
export const fetchDmSgsTop5Share = async () => {
  const raw  = await getStateOutstandingShare();
  const list = Array.isArray(raw) ? raw : (raw?.data || []);
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => (b.total_outstanding ?? 0) - (a.total_outstanding ?? 0));
  const top5   = sorted.slice(0, 5);
  const grand  = list.reduce((s, r) => s + (r.total_outstanding ?? 0), 0);
  const share  = top5.reduce((s, r) => {
    const pct = r.share_percent != null
      ? r.share_percent
      : grand > 0 ? (r.total_outstanding / grand) * 100 : 0;
    return s + pct;
  }, 0);
  return { share: +share.toFixed(1), top5 };
};



// ── Chart : RBI SGS Annual Market Loan Archive ────
//   source_id            : 7
//   metric_id            : 29
//   date_attribute_type_id: 5
//   dimension_type_id    : 11
//   granularity          : financial_year
export const fetchDmSgsTrend = () =>
  analyticsAggregate({
    source_id: 7, metric_id: 29,
    date_attribute_type_id: 5, dimension_type_id: 11,
    granularity: 'financial_year', aggregation: 'sum', limit: 100,
  });

// ── Chart : SGS per-state annual breakdown (Dynamic Top-5 share computation) ─
//   Same source/metric as fetchDmSgsTrend but without dimension_type_id filter
//   so the API returns one row per state per year (dimension-level data).
//   Used to compute "Dynamic Top-5 Share" — the combined share of the 5 largest
//   borrowers in each financial year.
//   source_id            : 7   (SDL / SGS Outstanding)
//   metric_id            : 29
//   date_attribute_type_id: 5
//   granularity          : financial_year
export const fetchDmSgsStateBreakdown = () =>
  analyticsAggregate({
    source_id: 7, metric_id: 29,
    date_attribute_type_id: 5,
    granularity: 'financial_year', aggregation: 'sum', limit: 2000,
  });

// ── Chart : RBI SGS Annual Market Loan Archive ───────────────────────────────
//   Dedicated endpoint → /analytics/sdl-archive/annual-trend
//   Returns [{year, total_outstanding_cr, yoy_growth_percent, top5_share_percent, top5_states}]
export { getSdlAnnualArchive as fetchDmSgsAnnualArchive };

// ── Chart : Printed Coupon Stack in Annual SGS Archive ──────────────────────
//   Dedicated endpoint → /analytics/sdl-archive/coupon-stack
//   Returns {balance_date, total_parsed_cr, buckets:[{label, outstanding_cr, bond_count, share_percent}]}
export { getSdlCouponStack as fetchDmSgsCouponStack };

// ── Chart : Archive Weighted Coupon Trend ────────────────────────────────────
//   Dedicated endpoint → /analytics/sdl-archive/weighted-coupon-trend
//   Returns {data:[{year, weighted_coupon_percent, coupon_parse_coverage_percent}]}
export { getSdlWeightedCouponTrend as fetchDmSgsWeightedCouponTrend };

// ── Chart : Instrument Family Composition (horizontal bar) ───────────────────
//   Dedicated endpoint → /analytics/sdl-archive/instrument-composition
//   Returns {balance_date, data:[{instrument_family, outstanding_cr, bond_count, share_percent}]}
export { getSdlInstrumentComposition as fetchDmSgsInstrumentComposition };

// ── Table : Annual Archive QA Signals ────────────────────────────────────────
//   Dedicated endpoint → /analytics/sdl-archive/qa-signals
//   Returns {balance_date, total_securities, diagnostics:[{diagnostic, bucket, rows}]}
export { getSdlQaSignals as fetchDmSgsQaSignals };

// ── Chart : SDL Maturity Profile by residual bucket ─────────────────────────
//   Dedicated endpoint → /analytics/sdl/maturity-profile
export { getSdlMaturityProfile as fetchDmSdlMaturityProfile };

// ── Chart : State-wise SDL Outstanding Share (map / bar) ────────────────────
//   Dedicated endpoint → /analytics/state-outstanding-share
//   Returns [{ state_name, outstanding_cr, share_pct }]
export { getStateOutstandingShare as fetchDmStateOutstandingShare };


// ═══════════════════════════════════════════════════════════════════════════
//  CORPORATE BONDS TAB
// ═══════════════════════════════════════════════════════════════════════════

// ── KPI : Corp Bond Outstanding — same as fetchDmKpiCorpBondOs above ────────

// ── Chart : Corp Bond Outstanding — Monthly trend ───────────────────────────
//   source_id 5 · metric_id 22 · date_attr 3 · dim_type 5 · granularity month
export const fetchDmCorpBondOsTrend = () =>
  analyticsAggregate({
    source_id: 5, metric_id: 22,
    date_attribute_type_id: 3, dimension_type_id: 5,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Chart : Corp Bond Trading Trend — dedicated endpoint ────────────────────
//   Returns [{ period, trade_amount_cr }] quarterly
export { getCorpBondTradingTrend as fetchDmCorpBondTradingTrend };

// ── Chart : Corp Bond Outstanding by Issuer Type ────────────────────────────
//   Dedicated endpoint → returns [{ issuer_type, outstanding_cr }]
export { getCorpBondOutstandingByIssuer as fetchDmCorpBondOsByIssuer };

// ── Chart : NCD Public Issues — Annual trend ────────────────────────────────
//   source_id 1 · metric_id 2 · date_attr 2 · granularity FY
export const fetchDmNcdIpoAnnual = () =>
  analyticsAggregate({
    source_id: 1, metric_id: 2,
    date_attribute_type_id: 2,
    granularity: 'financial_year', aggregation: 'sum', limit: 100,
  });

// ── Chart : Private Placements — Annual trend ───────────────────────────────
//   source_id 2 · metric_id 4 · date_attr 3 · granularity FY
export const fetchDmPrivatePlacementAnnual = () =>
  analyticsAggregate({
    source_id: 2, metric_id: 4,
    date_attribute_type_id: 3,
    granularity: 'financial_year', aggregation: 'sum', limit: 100,
  });

// ── Chart : Private Placement Trend — dedicated endpoint ────────────────────
export { getPrivatePlacementTrend as fetchDmPrivatePlacementTrend };

// ── Chart : NCD Public Issues Trend — dedicated endpoint ────────────────────
export { getNcdPublicIssuesTrend as fetchDmNcdTrend };

// ── Chart : Legacy issuer split — Financial vs Non-Financial (quarterly) ────
export { getCorpBondLegacyIssuerSplit as fetchDmCorpBondLegacyIssuerSplit };

// ── Chart : Current issuer split — multi-category monthly (post Apr 2024) ──
export { getCorpBondCurrentIssuerSplit as fetchDmCorpBondCurrentIssuerSplit };


// ═══════════════════════════════════════════════════════════════════════════
//  SGB TAB
// ═══════════════════════════════════════════════════════════════════════════

// ── KPI : SGB Outstanding — same as fetchDmKpiSgbOs above ───────────────────

// ── Chart : SGB Outstanding — Annual trend ──────────────────────────────────
//   source_id 6 · metric_id 28 · date_attr 6 · dim_type 10 · granularity FY
export const fetchDmSgbTrend = () =>
  analyticsAggregate({
    source_id: 6, metric_id: 28,
    date_attribute_type_id: 6, dimension_type_id: 10,
    granularity: 'financial_year', aggregation: 'sum', limit: 100,
  });

// ── Table : Largest SGB Tranches — per-tranche snapshot ──────────────────────
//   source_id 6 · date_attr 6 · dim_type 6
//   metric_id 28 = units outstanding · metric_id 24 = issue price
export const fetchDmSgbTranches = async () => {
  const [rawUnits, rawPrice] = await Promise.all([
    getSnapshotData({ source_id: 6, date_attribute_type_id: 6, dimension_type_id: 6, metric_id: 28 }),
    getSnapshotData({ source_id: 6, date_attribute_type_id: 6, dimension_type_id: 6, metric_id: 24 }),
  ]);
  const units  = Array.isArray(rawUnits) ? rawUnits : (rawUnits?.data  || []);
  const prices = Array.isArray(rawPrice) ? rawPrice : (rawPrice?.data  || []);
  const priceMap = {};
  for (const r of prices) {
    const key = r.dimension_id ?? r.dimension_name ?? r.name;
    if (key != null) priceMap[key] = { price: +(r.metric_value ?? r.value ?? 0), issue_date: r.date ?? null };
  }
  const merged = units.map(r => {
    const key = r.dimension_id ?? r.dimension_name ?? r.name;
    const pm  = priceMap[key];
    const issueDate = pm?.issue_date ?? null;
    const maturityDate = issueDate
      ? (() => { const d = new Date(issueDate); d.setFullYear(d.getFullYear() + 8); return d.toISOString().slice(0, 10); })()
      : null;
    return { ...r, issue_price: pm?.price ?? null, issue_date: issueDate, maturity_date: maturityDate };
  });
  return { data: merged, snapshot_date: rawUnits?.snapshot_date ?? null };
};
