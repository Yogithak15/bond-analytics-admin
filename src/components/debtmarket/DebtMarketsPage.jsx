import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import { analyticsAggregate } from '../../api/bond_api';
import {
  // ── Overview / shared KPIs ──────────────────────────────────────────────
  fetchDmRepoRateMonthly,
  fetchDmSebiCorpTrades,
  fetchDmWdmTradedValue,
  fetchDmWdmSecurityMix,
  fetchDmEbpIssuanceMix,
  fetchDmGsecAuction,
  fetchDmSdlAuction,
  fetchDmSdlTopBorrowers,
  fetchDmZcycModelPulse,
  fetchDmZeroCurve,
  fetchDmKpiGsecOs,
  fetchDmKpiSgsOs,
  fetchDmKpiCorpBondOs,
  fetchDmKpi10YZero,
  fetchDmKpiSgbOs,
  // ── G-Secs tab ──────────────────────────────────────────────────────────
  fetchDmKpiStripsOs,
  fetchDmTopGsecLines,
  fetchDmTopStripsLines,
  fetchDmGsecWam,
  fetchDmStripsWam,
  fetchDmGsecMaturityLadder,
  fetchDmStripsMaturityLadder,
  fetchDmGsecMaturityProfile,
  fetchDmStripsMaturityProfile,
  // ── SGS tab ─────────────────────────────────────────────────────────────
  fetchDmSgsTrend,
  fetchDmSgsStateBreakdown,
  fetchDmSgsAnnualArchive,
  fetchDmSgsCouponStack,
  fetchDmSgsWeightedCouponTrend,
  fetchDmSgsInstrumentComposition,
  fetchDmSgsQaSignals,
  fetchDmStateOutstandingShare,
  fetchDmSgsTop5Share,
  fetchDmSdlMaturityProfile,
  // ── SGB tab ─────────────────────────────────────────────────────────────
  fetchDmSgbTrend,
  fetchDmSgbTranches,
  // ── Corporate Bonds tab ─────────────────────────────────────────────────
  fetchDmCorpBondOsTrend,
  fetchDmCorpBondTradingTrend,
  fetchDmCorpBondOsByIssuer,
  fetchDmNcdTrend,
  fetchDmPrivatePlacementTrend,
  fetchDmCorpBondLegacyIssuerSplit,
  fetchDmCorpBondCurrentIssuerSplit,
} from '../../api/debtMarketApi';
import IndiaMap from '../IndiaMap';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';


/* ═══════════════════════════════════════════════════════════
   HELPERS (same pattern as MarketPulsePage)
═══════════════════════════════════════════════════════════ */
const isDk = () => document.documentElement.getAttribute('data-theme') === 'dark';
function cc() {
  const d = isDk();
  return {
    text: d ? '#ffffff' : '#1a1a1a',
    text2: d ? '#f0f0f0' : '#1a1c18',
    grid: d ? 'rgba(255,255,255,.13)' : 'rgba(26,28,24,.15)',
    axis: d ? 'rgba(255,255,255,.10)' : 'rgba(26,28,24,.10)',
    bg: d ? '#08111f' : '#f7f8f3',
    blue: '#2557a7', teal: '#0e7490', green: '#2d8a4e',
    red: '#c0392b', amber: '#c47a1e', purple: '#6d3fc0',
    orange: '#e07b39', cyan: '#06b6d4', lime: '#7cb342',
    pink: '#d4609a', grey: '#888888', coral: '#e05060',
  };
}
const GRID = (l, r, t, b) => ({ top: t, right: r, bottom: b, left: l, containLabel: false });
const ALB = c => ({ color: c.text, fontSize: 10 });
const SPL = c => ({ lineStyle: { color: c.grid, type: 'dashed' } });
const XAX = (data, c, iv) => ({
  type: 'category', data,
  axisLine: { lineStyle: { color: c.axis } },
  axisTick: { show: false },
  axisLabel: { ...ALB(c), interval: iv ?? 'auto' },
});
const YAX = (c, fmt) => ({
  type: 'value',
  axisLabel: { ...ALB(c), formatter: fmt },
  splitLine: SPL(c),
  axisLine: { show: false },
});
const TT = c => ({
  trigger: 'axis',
  backgroundColor: c.bg,
  borderColor: c.grid,
  textStyle: { color: c.text2, fontSize: 11 },
  axisPointer: { lineStyle: { color: c.grid } },
});
function line(data, color, name, opts = {}) {
  return {
    type: 'line', data, name,
    smooth: opts.smooth ?? true, symbol: 'none',
    lineStyle: { color, width: opts.width ?? 2 },
    itemStyle: { color },   // ensures legend icon + tooltip marker use the same color as the line
    areaStyle: opts.area ? {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: color + '55' }, { offset: 1, color: color + '00' }]
      }
    } : undefined,
    stack: opts.stack,
    connectNulls: opts.connectNulls,
  };
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
const STATE_REGION = {
  'TAMIL NADU': 'South', 'KARNATAKA': 'South', 'ANDHRA PRADESH': 'South', 'TELANGANA': 'South', 'KERALA': 'South',
  'UTTAR PRADESH': 'North', 'HARYANA': 'North', 'PUNJAB': 'North', 'HIMACHAL PRADESH': 'North',
  'RAJASTHAN': 'North', 'DELHI': 'North', 'NCT OF DELHI': 'North', 'JAMMU AND KASHMIR': 'North',
  'JAMMU & KASHMIR': 'North', 'UTTARAKHAND': 'North', 'LADAKH': 'North', 'CHANDIGARH': 'North',
  'MAHARASHTRA': 'West', 'GUJARAT': 'West', 'GOA': 'West', 'DADRA AND NAGAR HAVELI': 'West',
  'WEST BENGAL': 'East', 'BIHAR': 'East', 'ODISHA': 'East', 'JHARKHAND': 'East',
  'ANDAMAN AND NICOBAR': 'East', 'ANDAMAN & NICOBAR': 'East',
  'MADHYA PRADESH': 'Central', 'CHHATTISGARH': 'Central',
  'ASSAM': 'North-East', 'MEGHALAYA': 'North-East', 'MANIPUR': 'North-East', 'MIZORAM': 'North-East',
  'NAGALAND': 'North-East', 'TRIPURA': 'North-East', 'ARUNACHAL PRADESH': 'North-East', 'SIKKIM': 'North-East',
};
const REGION_COLORS = {
  'South': '#22c55e', 'North': '#3b82f6', 'West': '#f59e0b',
  'East': '#06b6d4', 'Central': '#a78bfa', 'North-East': '#f97316',
};

const SUBTABS = [
  { id: 'overview', label: 'Overview', sub: 'Debt market headline view' },
  { id: 'gsecs', label: 'G-Secs', sub: 'Sovereign and STRIPS maturity view' },
  { id: 'sgs', label: 'SGS', sub: 'State borrowing concentration' },
  { id: 'corpbonds', label: 'Corporate Bonds', sub: 'Issuance, trading, and ratings' },
  { id: 'sgb', label: 'SGB', sub: 'Sovereign Gold Bond stock' },
];

export default function DebtMarketsPage({ isActive }) {
  useThemeWatcher();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('All');
  const [fromYear, setFromYear] = useState('2014');
  const [toYear, setToYear] = useState('2026');

  const ratesRef = useRef(null);
  const tradRef = useRef(null);
  const wdmRef = useRef(null);
  const ebpRef = useRef(null);
  const auctRef = useRef(null);
  const zcycRef = useRef(null);
  const zeroRef = useRef(null);
  const gsecProfRef = useRef(null);
  const gsecLadRef = useRef(null);
  const stripsProfRef = useRef(null);
  const stripsLadRef = useRef(null);
  const sgsArchRef = useRef(null);
  const sgsAccumRef = useRef(null);
  const couponStackRef = useRef(null);
  const couponTrendRef = useRef(null);
  const sdlMaturRef = useRef(null);
  const sdlAuctRef = useRef(null);
  const sdlBorrowRef = useRef(null);
  const sgsStateBarRef = useRef(null);
  const sgsMaturPctRef = useRef(null);
  const sgsCurrRegRef       = useRef(null);
  const sgsLegacyRegRef     = useRef(null);
  const sgsInstrCompRef     = useRef(null);
  const ncdRef                   = useRef(null);
  const privPlacRef              = useRef(null);
  const corpBondTradRef          = useRef(null);
  const corpBondOsRef            = useRef(null);
  const corpLegacyIssuerRef      = useRef(null);
  const corpCurrentIssuerRef     = useRef(null);
  const corpIssuerCompRef        = useRef(null);
  const sgbVintageRef            = useRef(null);
  const sgbLadderRef             = useRef(null);

  const [ratesData, setRatesData] = useState(null);
  const [tradData, setTradData] = useState(null);
  const [wdmData,    setWdmData]    = useState(null);
  const [wdmMixData, setWdmMixData] = useState(null);
  const [ebpMixData,    setEbpMixData]    = useState(null);
  const [gsecAuctData,  setGsecAuctData]  = useState(null);
  const [sdlAuctData,   setSdlAuctData]   = useState(null);
  const [sdlTopBorrowData, setSdlTopBorrowData] = useState(null);
  const [zcycPulseData, setZcycPulseData] = useState(null);
  const [zeroCurveData, setZeroCurveData] = useState(null);
  const [gsecProfData, setGsecProfData] = useState(null);
  const [stripsProfData, setStripsProfData] = useState(null);
  const [gsecOsKpi, setGsecOsKpi] = useState(null);
  const [sgsOsKpi, setSgsOsKpi] = useState(null);
  const [corpBondOsKpi, setCorpBondOsKpi] = useState(null);
  const [totalDebtKpi, setTotalDebtKpi] = useState(null);
  const [tenYZeroKpi, setTenYZeroKpi] = useState(null);
  const [sgbOsKpi, setSgbOsKpi] = useState(null);
  const [stripsOsKpi, setStripsOsKpi] = useState(null);
  const [gsecWamKpi, setGsecWamKpi] = useState(null);
  const [stripsWamKpi, setStripsWamKpi] = useState(null);
  const [gsecTopLines, setGsecTopLines] = useState(null);
  const [stripsTopLines, setStripsTopLines] = useState(null);
  const [gsecLadderData, setGsecLadderData] = useState(null);
  const [stripsLadderData, setStripsLadderData] = useState(null);
  const [sgsTrendData, setSgsTrendData] = useState(null);
  const [sgsStateData, setSgsStateData] = useState(null);
  const [sgsStateMeta, setSgsStateMeta] = useState(null);
  const [sgsTop5Data, setSgsTop5Data] = useState(null);
  const [sgsStateAnnualData, setSgsStateAnnualData] = useState(null);
  const [sgsAnnualArchiveData, setSgsAnnualArchiveData] = useState(null);
  const [sgsCouponStackData, setSgsCouponStackData] = useState(null);
  const [sgsCouponTrendData, setSgsCouponTrendData] = useState(null);
  const [sgsInstrCompData, setSgsInstrCompData] = useState(null);
  const [sgsQaSignalsData, setSgsQaSignalsData] = useState(null);
  const [sdlProfData,        setSdlProfData]        = useState(null);
  const [corpBondTrendData,  setCorpBondTrendData]  = useState(null);
  const [corpBondTradingData,setCorpBondTradingData]= useState(null);
  const [corpBondIssuerData, setCorpBondIssuerData] = useState(null);
  const [ncdData,               setNcdData]               = useState(null);
  const [privatePlacData,       setPrivatePlacData]       = useState(null);
  const [legacyIssuerData,      setLegacyIssuerData]      = useState(null);
  const [currentIssuerData,     setCurrentIssuerData]     = useState(null);
  const [sgsTablePage, setSgsTablePage] = useState(1);
  const [sgsOsPage, setSgsOsPage] = useState(1);
  const [sgbVintageData,        setSgbVintageData]        = useState(null);
  const [sgbSnapshotData,       setSgbSnapshotData]       = useState(null);
  const [sgbTrancheData,        setSgbTrancheData]        = useState(null);
  const [sgbTranchePage,        setSgbTranchePage]        = useState(1);
  const [sgbSnapshotDate,       setSgbSnapshotDate]       = useState('');

  useEffect(() => {
    const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmtP = p => { const [yr, mo] = p.split('-'); return `${MN[+mo - 1]} ${yr.slice(2)}`; };
    const fmtSub = p => { if (!p) return ''; const parts = p.split('-'); return `as of ${MN[+parts[1] - 1]} ${parts[0]}`; };
    const fmtCr = v => { const lc = v / 100000; return lc >= 1 ? `₹ ${lc.toFixed(2)} L Cr` : `₹ ${(v / 1000).toFixed(2)} K Cr`; };
    const parseMaturityProfile = raw => {
      const list = Array.isArray(raw) ? raw : (raw?.data || raw?.buckets || raw?.items || []);
      if (!list.length) return null;
      const LK = ['bucket', 'maturity_bucket', 'label', 'name', 'bucket_label', 'range'];
      const VK = ['outstanding_cr', 'outstanding_amount', 'amount_cr', 'value_cr',
        'outstanding', 'amount', 'value', 'total', 'total_cr', 'face_value_cr'];
      return {
        labels: list.map(r => { for (const k of LK) if (r[k] != null) return r[k]; return Object.keys(r).find(k => typeof r[k] === 'string') ?? ''; }),
        values: list.map(r => { for (const k of VK) if (r[k] != null && r[k] !== '') return +r[k]; const n = Object.entries(r).find(([, v]) => typeof v === 'number' && v > 0); return n ? n[1] : 0; }),
      };
    };

    // ── G-SECS TAB ──────────────────────────────────────────────────────────

    // KPI 1: G-SEC STOCK
    fetchDmKpiGsecOs()
      .then(list => {
        if (!list?.length) return;
        const raw = list[0].value ?? 0;
        setGsecOsKpi({ value: fmtCr(raw), sub: fmtSub(list[0].period ?? ''), rawVal: raw });
      }).catch(() => { });

    // KPI 2: G-SEC AVG MATURITY
    fetchDmGsecWam()
      .then(({ wam, snapshot_date }) => {
        if (wam != null) setGsecWamKpi({ value: `${wam.toFixed(2)} yrs`, sub: fmtSub(snapshot_date ?? '') });
      }).catch(() => { });

    // Table: Top G-Sec Lines
    fetchDmTopGsecLines()
      .then(raw => {
        const list = raw?.data ?? (Array.isArray(raw) ? raw : []);
        if (!list.length) return;
        const top10 = [...list].sort((a, b) => +(b.metric_value ?? 0) - +(a.metric_value ?? 0)).slice(0, 10);
        setGsecTopLines(top10);
      }).catch(() => { });

    // Chart: G-Sec Maturity Ladder
    fetchDmGsecMaturityLadder()
      .then(data => { if (data.length) setGsecLadderData(data); })
      .catch(() => { });

    // Table: Top STRIPS Lines
    fetchDmTopStripsLines()
      .then(raw => {
        const list = raw?.data ?? (Array.isArray(raw) ? raw : []);
        if (!list.length) return;
        const top10 = [...list].sort((a, b) => +(b.metric_value ?? 0) - +(a.metric_value ?? 0)).slice(0, 10);
        setStripsTopLines(top10);
      }).catch(() => { });

    // KPI 4: STRIPS STOCK
    fetchDmKpiStripsOs()
      .then(list => {
        if (!list?.length) return;
        const raw = list[0].value ?? 0;
        setStripsOsKpi({ value: fmtCr(raw), sub: fmtSub(list[0].period ?? '') });
      }).catch(() => { });

    // KPI 5: STRIPS AVG MATURITY
    fetchDmStripsWam()
      .then(({ wam, snapshot_date }) => {
        if (wam != null) setStripsWamKpi({ value: `${wam.toFixed(2)} yrs`, sub: fmtSub(snapshot_date ?? '') });
      }).catch(() => { });

    // Chart: STRIPS Maturity Ladder
    fetchDmStripsMaturityLadder()
      .then(data => { if (data.length) setStripsLadderData(data); })
      .catch(() => { });

    // KPI 6: 10Y ZERO  (shared with Overview)
    fetchDmKpi10YZero()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows?.data || rows?.items || []);
        if (!list.length) return;
        const last = list[list.length - 1];
        const val = +(last.value ?? last.metric_value ?? 0);
        setTenYZeroKpi({ value: `${val.toFixed(2)}%`, sub: fmtSub(last.period ?? '') });
      }).catch(() => { });

    // Chart: G-Sec Maturity Profile
    fetchDmGsecMaturityProfile()
      .then(raw => { const d = parseMaturityProfile(raw); if (d) setGsecProfData(d); }).catch(() => { });

    // Chart: STRIPS Maturity Profile
    fetchDmStripsMaturityProfile()
      .then(raw => { const d = parseMaturityProfile(raw); if (d) setStripsProfData(d); }).catch(() => { });

    // ── OVERVIEW TAB ─────────────────────────────────────────────────────────

    // Chart: Key Sovereign Rates — Repo + 1Y/5Y/10Y Zero Yields
    fetchDmRepoRateMonthly()
      .then(([repoRaw, z1Raw, z5Raw, z10Raw]) => {
        const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);

        // Repo rate: monthly aggregate → period = "YYYY-MM"
        const repoMap = {};
        toList(repoRaw).forEach(r => { repoMap[r.period] = +(r.value ?? r.metric_value ?? 0); });

        // Zero yields: daily records → pick latest record per calendar month
        const latestPerMonth = (rows) => {
          const monthMap = {};
          rows.forEach(r => {
            const date = r['Reporting Date'] ?? r.snapshot_date ?? '';
            if (!date) return;
            const month = date.slice(0, 7); // "YYYY-MM"
            if (!monthMap[month] || date > monthMap[month].date) {
              monthMap[month] = { date, val: +(r.metric_value ?? 0) };
            }
          });
          return Object.fromEntries(Object.entries(monthMap).map(([m, d]) => [m, d.val]));
        };

        const z1Map  = latestPerMonth(toList(z1Raw));
        const z5Map  = latestPerMonth(toList(z5Raw));
        const z10Map = latestPerMonth(toList(z10Raw));

        // union of all periods
        const allPeriods = [...new Set([
          ...Object.keys(repoMap),
          ...Object.keys(z1Map),
          ...Object.keys(z5Map),
          ...Object.keys(z10Map),
        ])].sort();
        if (!allPeriods.length) return;
        setRatesData({
          months:   allPeriods.map(fmtP),
          repoVals: allPeriods.map(p => repoMap[p] ?? null),
          z1Vals:   allPeriods.map(p => z1Map[p]   ?? null),
          z5Vals:   allPeriods.map(p => z5Map[p]   ?? null),
          z10Vals:  allPeriods.map(p => z10Map[p]  ?? null),
        });
      }).catch(() => { });

    // Chart: Secondary Debt Trading — SEBI + NSE WDM (from Jun 2015)
    fetchDmSebiCorpTrades()
      .then(raw => {
        const list = (Array.isArray(raw) ? raw : (raw?.data || raw?.items || []))
          .filter(r => (r.period ?? '') >= '2015-06');
        if (!list.length) return;
        setTradData({ months: list.map(r => fmtP(r.period)), sebiVals: list.map(r => +(r.value ?? r.metric_value ?? 0)) });
      }).catch(() => { });

    fetchDmWdmTradedValue()
      .then(raw => {
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []);
        if (!list.length) return;
        setWdmData({ months: list.map(r => fmtP(r.period)), wdmVals: list.map(r => +(r.value ?? r.metric_value ?? 0)) });
      }).catch(() => { });

    fetchDmWdmSecurityMix()
      .then(results => {
        const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
        // use longest series as spine, filter to >= 2015-06
        const spine = results.reduce((a, b) => toList(b.raw).length > toList(a.raw).length ? b : a);
        const months = toList(spine.raw)
          .map(r => r.period ?? '')
          .filter(p => p >= '2015-06')
          .map(p => fmtP(p));
        const allPeriods = toList(spine.raw).filter(r => (r.period ?? '') >= '2015-06').map(r => r.period);
        const seriesData = results.map(({ name, color, raw }) => {
          const map = {};
          toList(raw).forEach(r => { map[r.period] = +(r.value ?? r.metric_value ?? 0); });
          return { name, color, vals: allPeriods.map(p => +(((map[p] ?? 0)) / 1000).toFixed(1)) };
        });
        setWdmMixData({ months, seriesData });
      }).catch(() => { });

    fetchDmEbpIssuanceMix()
      .then(results => {
        const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
        const spine = results.reduce((a, b) => toList(b.raw).length > toList(a.raw).length ? b : a);
        const allPeriods = toList(spine.raw).map(r => r.period ?? '').filter(Boolean);
        const months = allPeriods.map(p => fmtP(p));
        const seriesData = results.map(({ name, color, raw }) => {
          const map = {};
          toList(raw).forEach(r => { map[r.period] = +(r.value ?? r.metric_value ?? 0); });
          return { name, color, vals: allPeriods.map(p => +(((map[p] ?? 0)) / 1000).toFixed(1)) };
        });
        setEbpMixData({ months, seriesData });
      }).catch(() => { });

    fetchDmGsecAuction()
      .then(([amtRaw, yldRaw]) => {
        const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
        const amtList = toList(amtRaw);
        const yldMap  = {};
        toList(yldRaw).forEach(r => { yldMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        if (!amtList.length) return;
        setGsecAuctData({
          years:  amtList.map(r => {
            const p = r.period ?? '';
            const parts = p.split('-');
            return parts[1] ? `FY${parts[1]}` : p;
          }),
          amount: amtList.map(r => +(r.value ?? r.metric_value ?? 0)),
          yield:  amtList.map(r => yldMap[r.period] ?? null),
        });
      }).catch(() => { });

    fetchDmSdlTopBorrowers()
      .then(sorted => {
        if (!sorted?.length) return;
        const top10 = sorted.slice(0, 10);
        setSdlTopBorrowData({ rows: top10, period: top10[0]?.period ?? '' });
      }).catch(() => { });

    fetchDmSdlAuction()
      .then(([amtRaw, yldRaw]) => {
        const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
        const amtList = toList(amtRaw);
        const yldList = toList(yldRaw);
        // Build a union of all periods from both series
        const allPeriods = [...new Set([
          ...amtList.map(r => r.period ?? ''),
          ...yldList.map(r => r.period ?? ''),
        ])].filter(Boolean).sort();
        if (!allPeriods.length) return;
        const amtMap = {};
        amtList.forEach(r => { amtMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        const yldMap = {};
        yldList.forEach(r => { yldMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        const fyLabel = p => { const pts = p.split('-'); return pts[1] ? `FY${pts[1]}` : p; };
        setSdlAuctData({
          years:  allPeriods.map(fyLabel),
          amount: allPeriods.map(p => amtMap[p] ?? null),
          yield:  allPeriods.map(p => yldMap[p] ?? null),
        });
      }).catch(() => { });

    fetchDmZcycModelPulse()
      .then(([b0Raw, b1Raw]) => {
        const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
        const b0List = toList(b0Raw);
        const b1Map  = {};
        toList(b1Raw).forEach(r => { b1Map[r.period] = +(r.value ?? r.metric_value ?? 0); });
        if (!b0List.length) return;
        const beta0 = b0List.map(r => +(r.value ?? r.metric_value ?? 0));
        const beta1 = b0List.map(r => b1Map[r.period] ?? null);
        setZcycPulseData({
          days:   b0List.map(r => fmtP(r.period)),
          beta0,
          beta1,
          latestB0: beta0[beta0.length - 1] ?? null,
          latestB1: beta1[beta1.length - 1] ?? null,
        });
      }).catch(() => { });

    fetchDmZeroCurve()
      .then(results => {
        const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
        const labels = [], yields = [], snapshotDate = { val: '' };
        results.forEach(({ label, raw }) => {
          const list = toList(raw);
          if (!list.length) return;
          // pick latest record by Reporting Date
          const latest = list.reduce((best, r) => {
            const d = r['Reporting Date'] ?? r.snapshot_date ?? '';
            return d > (best['Reporting Date'] ?? best.snapshot_date ?? '') ? r : best;
          }, list[0]);
          const val = +(latest.metric_value ?? latest.value ?? 0);
          if (val > 0) {
            labels.push(label);
            yields.push(+val.toFixed(4));
            if (!snapshotDate.val) {
              const d = latest['Reporting Date'] ?? latest.snapshot_date ?? '';
              if (d) snapshotDate.val = d.slice(0, 7); // YYYY-MM
            }
          }
        });
        if (labels.length) setZeroCurveData({ labels, yields, snapshotDate: snapshotDate.val });
      }).catch(() => { });

    // KPI: SGS OUTSTANDING
    fetchDmKpiSgsOs()
      .then(list => {
        if (!list?.length) return;
        const raw = list[0].value ?? 0;
        setSgsOsKpi({ value: fmtCr(raw), sub: fmtSub(list[0].period ?? ''), rawVal: raw });
      }).catch(() => { });

    // KPI: CORP BOND OUTSTANDING
    fetchDmKpiCorpBondOs()
      .then(list => {
        if (!list?.length) return;
        const raw = list[0].value ?? 0;
        setCorpBondOsKpi({ value: fmtCr(raw), sub: fmtSub(list[0].period ?? ''), rawVal: raw });
      }).catch(() => { });

    // KPI: SGB OUTSTANDING
    fetchDmKpiSgbOs()
      .then(list => {
        if (!list?.length) return;
        const grams = list[0].value ?? 0;
        setSgbOsKpi({ value: `${(grams / 1_000_000).toFixed(2)} t`, sub: fmtSub(list[0].period ?? '') });
      }).catch(() => { });

    // ── SGB TAB ─────────────────────────────────────────────────────────────

    // Chart: SGB Outstanding by Issue Vintage (FY bar chart)
    fetchDmSgbTrend()
      .then(raw => { const l = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []); if (l.length) setSgbVintageData(l); }).catch(() => {});

    // Table: per-tranche snapshot for Largest SGB Tranches table
    fetchDmSgbTranches()
      .then(raw => {
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []);
        if (list.length) {
          const sorted = [...list].sort((a, b) => {
            const va = +(a.metric_value ?? a.value ?? a.outstanding_units ?? 0);
            const vb = +(b.metric_value ?? b.value ?? b.outstanding_units ?? 0);
            return vb - va;
          });
          setSgbTrancheData(sorted);
          const snap = raw?.snapshot_date ?? list[0]?.snapshot_date ?? '';
          if (snap) setSgbSnapshotDate(snap);
        }
      }).catch(() => {});

    // ── SGS TAB ─────────────────────────────────────────────────────────────

    // Chart: SGS Annual Trend (for KPI cards)
    fetchDmSgsTrend()
      .then(raw => { const list = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []); if (list.length) setSgsTrendData(list); }).catch(() => { });

    // Chart: SGS per-state annual breakdown (for Dynamic Top-5 share line)
    fetchDmSgsStateBreakdown()
      .then(raw => { const list = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []); if (list.length) setSgsStateAnnualData(list); }).catch(() => { });

    // Chart: RBI SGS Annual Market Loan Archive (dedicated endpoint)
    fetchDmSgsAnnualArchive()
      .then(raw => { const list = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []); if (list.length) setSgsAnnualArchiveData(list); }).catch(() => { });

    // Chart: Printed Coupon Stack in Annual SGS Archive
    fetchDmSgsCouponStack()
      .then(raw => { if (raw?.buckets?.length) setSgsCouponStackData(raw); }).catch(() => { });

    // Chart: Archive Weighted Coupon Trend
    fetchDmSgsWeightedCouponTrend()
      .then(raw => { const list = raw?.data ?? (Array.isArray(raw) ? raw : []); if (list.length) setSgsCouponTrendData(list); }).catch(() => { });

    // Chart: Instrument Family Composition
    fetchDmSgsInstrumentComposition()
      .then(raw => { const list = raw?.data ?? (Array.isArray(raw) ? raw : []); if (list.length) setSgsInstrCompData(list); }).catch(() => { });

    // Table: Annual Archive QA Signals
    fetchDmSgsQaSignals()
      .then(raw => { if (raw?.diagnostics?.length) setSgsQaSignalsData(raw); }).catch(() => { });

    // Chart + Table: State Outstanding Share
    fetchDmStateOutstandingShare()
      .then(raw => {
        const list = Array.isArray(raw) ? raw : (raw?.data || []);
        if (list.length) setSgsStateData(list);
        if (!Array.isArray(raw) && raw?.snapshot_date) {
          setSgsStateMeta({
            snapshot_date: raw.snapshot_date,
            reference_date: raw.reference_date,
            comparison_label: raw.comparison_label,
          });
        }
      }).catch(() => { });

    // KPI: Top-5 State Share
    fetchDmSgsTop5Share()
      .then(result => { if (result) setSgsTop5Data(result); }).catch(() => { });

    // Chart: SDL Maturity Profile (Maturity Wall)
    fetchDmSdlMaturityProfile()
      .then(raw => { const d = parseMaturityProfile(raw); if (d) setSdlProfData(d); }).catch(() => {});

    // ── CORP BONDS TAB ───────────────────────────────────────────────────────
    analyticsAggregate({
      source_id: 5, date_attribute_type_id: 3, aggregation: 'sum',
      granularity: 'month', metric_id: 22,
      dimension_id: [140, 141, 142, 143, 144, 145, 146, 147],
      dimension_type_id: 5, limit: 2000,
    }).then(raw => { const l = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []); if (l.length) setCorpBondTrendData(l); }).catch(() => {});
    Promise.all([
      analyticsAggregate({ source_id: 3, date_attribute_type_id: 3, aggregation: 'sum', granularity: 'month', metric_id: 5, dimension_id: [4,5,6,7,8,9,10], dimension_type_id: 3, limit: 2000 }),
      analyticsAggregate({ source_id: 3, date_attribute_type_id: 3, aggregation: 'sum', granularity: 'month', metric_id: 6, dimension_id: [4,5,6,7,8,9,10], dimension_type_id: 3, limit: 2000 }),
    ]).then(([rawCnt, rawAmt]) => {
      const cntRows = (Array.isArray(rawCnt) ? rawCnt : (rawCnt?.data || rawCnt?.items || [])).filter(r => (r.period ?? '') >= '2015-01');
      const amtRows = (Array.isArray(rawAmt) ? rawAmt : (rawAmt?.data || rawAmt?.items || [])).filter(r => (r.period ?? '') >= '2015-01');
      if (cntRows.length || amtRows.length) {
        const cntMap = Object.fromEntries(cntRows.map(r => [r.period, +(r.value ?? 0)]));
        const amtMap = Object.fromEntries(amtRows.map(r => [r.period, +(r.value ?? 0)]));
        const periods = [...new Set([...cntRows.map(r => r.period), ...amtRows.map(r => r.period)])].sort();
        setCorpBondTradingData({ periods, counts: periods.map(p => cntMap[p] ?? 0), amounts: periods.map(p => amtMap[p] ?? 0) });
      }
    }).catch(() => {});
    Promise.all([
      { id: 140, name: 'Banks',           color: '#6366f1' },
      { id: 141, name: 'Bank/PSU HFCs',   color: '#06b6d4' },
      { id: 142, name: 'Bank/PSU NBFCs',  color: '#22c55e' },
      { id: 143, name: 'PSUs/Statutory',  color: '#10b981' },
      { id: 144, name: 'NBFC',            color: '#8b5cf6' },
      { id: 145, name: 'HFC',             color: '#f97316' },
      { id: 146, name: 'Corporate',       color: '#f59e0b' },
      { id: 147, name: 'Others',          color: '#94a3b8' },
    ].map(d =>
      analyticsAggregate({ source_id: 5, date_attribute_type_id: 3, aggregation: 'sum', granularity: 'month', metric_id: 22, dimension_id: [d.id], dimension_type_id: 5, limit: 2000 })
        .then(raw => {
          const rows = (Array.isArray(raw) ? raw : (raw?.data || raw?.items || [])).sort((a, b) => (a.period ?? '') > (b.period ?? '') ? 1 : -1);
          const latest = rows.at(-1);
          return { name: d.name, color: d.color, value: +(latest?.value ?? 0), period: latest?.period ?? '' };
        })
        .catch(() => ({ name: d.name, color: d.color, value: 0, period: '' }))
    )).then(results => {
      if (results.some(r => r.value > 0)) setCorpBondIssuerData(results);
    }).catch(() => {});
    fetchDmNcdTrend()
      .then(raw => { const l = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []); if (l.length) setNcdData(l); }).catch(() => {});
    fetchDmPrivatePlacementTrend()
      .then(raw => { const l = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []); if (l.length) setPrivatePlacData(l); }).catch(() => {});
    Promise.all([
      analyticsAggregate({ source_id: 5, date_attribute_type_id: 3, aggregation: 'sum', granularity: 'month', metric_id: 22, dimension_id: [140,141,142,143,144,145], dimension_type_id: 5, limit: 2000 }),
      analyticsAggregate({ source_id: 5, date_attribute_type_id: 3, aggregation: 'sum', granularity: 'month', metric_id: 22, dimension_id: [146,147],             dimension_type_id: 5, limit: 2000 }),
    ]).then(([rawFin, rawNon]) => {
      const finRows = Array.isArray(rawFin) ? rawFin : (rawFin?.data || rawFin?.items || []);
      const nonRows = Array.isArray(rawNon) ? rawNon : (rawNon?.data || rawNon?.items || []);
      if (finRows.length || nonRows.length) {
        const finMap = Object.fromEntries(finRows.map(r => [r.period, +(r.value ?? 0)]));
        const nonMap = Object.fromEntries(nonRows.map(r => [r.period, +(r.value ?? 0)]));
        const periods = [...new Set([...finRows.map(r => r.period), ...nonRows.map(r => r.period)])].sort();
        setLegacyIssuerData({ periods, financial: periods.map(p => finMap[p] ?? 0), nonFinancial: periods.map(p => nonMap[p] ?? 0) });
      }
    }).catch(() => {});
    Promise.all(
      [140, 141, 142, 143, 144, 145, 146, 147].map(dimId =>
        analyticsAggregate({ source_id: 5, date_attribute_type_id: 3, aggregation: 'sum', granularity: 'month', metric_id: 22, dimension_id: [dimId], dimension_type_id: 5, limit: 2000 })
          .then(raw => ({ dimId, rows: Array.isArray(raw) ? raw : (raw?.data || raw?.items || []) }))
          .catch(() => ({ dimId, rows: [] }))
      )
    ).then(results => {
      const allPeriods = [...new Set(results.flatMap(r => r.rows.map(row => row.period)))].sort();
      const byDim = {};
      results.forEach(({ dimId, rows }) => {
        const map = Object.fromEntries(rows.map(r => [r.period, +(r.value ?? 0)]));
        byDim[dimId] = allPeriods.map(p => map[p] ?? 0);
      });
      if (allPeriods.length) setCurrentIssuerData({ periods: allPeriods, byDim });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const g = gsecOsKpi?.rawVal ?? 0;
    const s = sgsOsKpi?.rawVal ?? 0;
    const c = corpBondOsKpi?.rawVal ?? 0;
    if (!g && !s && !c) return;
    const total = g + s + c;
    const inLCr = total / 100000;
    const label = inLCr >= 1
      ? `₹ ${inLCr.toFixed(2)} L Cr`
      : `₹ ${(total / 1000).toFixed(2)} K Cr`;
    setTotalDebtKpi({ value: label, sub: 'G-Sec + SGS + Corp Bond' });
  }, [gsecOsKpi, sgsOsKpi, corpBondOsKpi]);

  /* ── Year-range filter helpers (close over fromYear / toYear state) ── */
  const _fy = { from: parseInt(fromYear) || 2000, to: parseInt(toYear) || 2099 };
  const fyMonth = (months, ...arrs) => {
    const keep = months.map(m => { const yy = parseInt((m || '').split(' ')[1]); const yr = isNaN(yy) ? NaN : (yy <= 30 ? 2000 + yy : 1900 + yy); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [months.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };
  const fyFY = (years, ...arrs) => {
    const keep = years.map(y => { const yr = 2000 + parseInt((y || '').slice(2)); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to + 1); });
    return [years.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };
  const fyArr = arr => {
    if (!arr?.length) return arr;
    return arr.filter(r => {
      let yr = NaN;
      if (r.year != null)        yr = +r.year;
      else if (r.period)         yr = parseInt((r.period || '').slice(0, 4));
      else if (r.financial_year) yr = parseInt((r.financial_year || '').replace(/\D.*/, ''));
      else if (r.fy)             yr = parseInt((r.fy || '').replace(/\D.*/, ''));
      return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to);
    });
  };
  const fyPeriods = (periods, ...arrs) => {
    const keep = periods.map(p => { const yr = parseInt((p || '').slice(0, 4)); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [periods.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };

  /* ── Key Sovereign Rates — Repo + 1Y/5Y/10Y Zero Yields ── */
  useChart(ratesRef, () => {
    if (!ratesData) return null;
    const c = cc();
    const [rMonths, rRepo, rZ1, rZ5, rZ10] = fyMonth(ratesData.months, ratesData.repoVals, ratesData.z1Vals ?? [], ratesData.z5Vals ?? [], ratesData.z10Vals ?? []);
    const iv = Math.max(1, Math.floor(rMonths.length / 10));
    const allVals = [...rRepo, ...rZ10].filter(v => v != null);
    const maxV = allVals.length ? Math.max(...allVals) : 8;
    const yStep = 2;
    const yMax  = Math.ceil(maxV / yStep) * yStep;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 44, left: 8, containLabel: true },
      legend: {
        data: ['Repo Rate', '1Y Zero', '5Y Zero', '10Y Zero'],
        bottom: 4, textStyle: { color: c.text, fontSize: 10 }, itemWidth: 12, itemHeight: 8,
      },
      tooltip: {
        ...TT(c),
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(2)}%</b>`).join('<br/>'),
      },
      xAxis: {
        type: 'category', data: rMonths, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: { ...YAX(c, v => v.toFixed(1) + '%'), min: 0, max: yMax, interval: yStep },
      series: [
        line(rRepo,  c.coral, 'Repo Rate', { smooth: false, width: 2 }),
        { ...line(rZ1,  c.teal,  '1Y Zero',  { smooth: true, width: 2, connectNulls: false }),
          symbol: 'circle', symbolSize: 5, showSymbol: true },
        { ...line(rZ5,  c.blue,  '5Y Zero',  { smooth: true, width: 2, connectNulls: false }),
          symbol: 'circle', symbolSize: 5, showSymbol: true },
        { ...line(rZ10, c.amber, '10Y Zero', { smooth: true, width: 2, connectNulls: false }),
          symbol: 'circle', symbolSize: 5, showSymbol: true },
      ],
    };
  });

  /* ── Secondary Debt Trading — SEBI Corp Bond Trades + NSE WDM Value ── */
  useChart(tradRef, () => {
    if (!tradData) return null;
    const c = cc();
    // SEBI is the spine — keeps x-axis starting from Jun 2015
    const [tMonths, tSebi] = fyMonth(tradData.months, tradData.sebiVals);
    const wdmMap = {};
    (wdmData?.months ?? []).forEach((m, i) => { wdmMap[m] = wdmData.wdmVals[i]; });
    const scale = v => v != null ? +(v / 1000).toFixed(0) : null;
    const sebiScaled = tSebi.map(v => scale(v));
    const wdmScaled  = tMonths.map(m => scale(wdmMap[m] ?? null));
    const iv = Math.max(1, Math.floor(tMonths.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 36, right: 16, bottom: 40, left: 8, containLabel: true },
      legend: { data: ['SEBI Corp Bond Trades', 'NSE WDM Value'], bottom: 4, textStyle: { color: c.text, fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
      tooltip: { ...TT(c), formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${s.value}K Cr</b>`).join('<br/>') },
      xAxis: { type: 'category', data: tMonths, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...ALB(c), interval: iv } },
      yAxis: { ...YAX(c, v => v + 'K'), min: 0 },
      series: [
        line(sebiScaled, c.green, 'SEBI Corp Bond Trades', { smooth: false, width: 2.5 }),
        line(wdmScaled,  c.blue,  'NSE WDM Value',         { smooth: true,  width: 2.5, connectNulls: false }),
      ],
    };
  });

  /* ── NSE WDM Security Mix — stacked area per security type ── */
  useChart(wdmRef, () => {
    if (!wdmMixData) return null;
    const { months: wdmRawMonths, seriesData: wdmRawSeries } = wdmMixData;
    if (!wdmRawMonths.length) return null;
    const c = cc();
    const [wMonths, ...wValsArr] = fyMonth(wdmRawMonths, ...wdmRawSeries.map(s => s.vals));
    const wSeriesData = wdmRawSeries.map((s, i) => ({ ...s, vals: wValsArr[i] }));
    const iv = Math.max(1, Math.floor(wMonths.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      legend: {
        data: wSeriesData.map(s => s.name),
        bottom: 4, itemWidth: 12, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 9 },
      },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value > 0).map(s => `${s.marker}${s.seriesName}: <b>₹${s.value}K Cr</b>`).join('<br/>'),
      },
      xAxis: { type: 'category', data: wMonths, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...ALB(c), interval: iv } },
      yAxis: { ...YAX(c, v => v + 'K'), min: 0 },
      series: wSeriesData.map(s => ({
        name: s.name, type: 'line', data: s.vals,
        stack: 'wdm', smooth: true, symbol: 'none',
        lineStyle: { color: s.color, width: 0.5 },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color + 'cc' },
      })),
    };
  });

  /* ── NSE EBP Issuance Mix — stacked area per security type ── */
  useChart(ebpRef, () => {
    if (!ebpMixData) return null;
    const { months: ebpRawMonths, seriesData: ebpRawSeries } = ebpMixData;
    if (!ebpRawMonths.length) return null;
    const c = cc();
    const [eMonths, ...eValsArr] = fyMonth(ebpRawMonths, ...ebpRawSeries.map(s => s.vals));
    const eSeriesData = ebpRawSeries.map((s, i) => ({ ...s, vals: eValsArr[i] }));
    const iv = Math.max(1, Math.floor(eMonths.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      legend: {
        data: eSeriesData.map(s => s.name),
        bottom: 4, itemWidth: 12, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 9 },
      },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value > 0).map(s => `${s.marker}${s.seriesName}: <b>₹${s.value}K Cr</b>`).join('<br/>'),
      },
      xAxis: { type: 'category', data: eMonths, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...ALB(c), interval: iv } },
      yAxis: { ...YAX(c, v => v + 'K'), min: 0 },
      series: eSeriesData.map(s => ({
        name: s.name, type: 'line', data: s.vals,
        stack: 'ebp', smooth: true, symbol: 'none',
        lineStyle: { color: s.color, width: 0.5 },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color + 'cc' },
      })),
    };
  });

  /* ── G-Sec Auction Supply vs Cut-off Yield — bar + line dual axis ── */
  useChart(auctRef, () => {
    if (!gsecAuctData) return null;
    const { years: gaYears, amount: gaAmt, yield: gaYld } = gsecAuctData;
    if (!gaYears.length) return null;
    const c = cc();
    const [years, amount, yld] = fyFY(gaYears, gaAmt, gaYld);
    if (!years.length) return null;
    const maxAmt = Math.max(...amount.filter(v => v != null));
    const aStep  = maxAmt <= 800000 ? 200000 : maxAmt <= 1600000 ? 400000 : 500000;
    const aMax   = Math.ceil(maxAmt / aStep) * aStep;
    const maxYld = Math.max(...yld.filter(v => v != null));
    const yStep  = 2; const yMax = Math.ceil(maxYld / yStep) * yStep;
    const fmtA   = v => v >= 100000 ? `${(v/1000).toFixed(0)}K` : `${Math.round(v/1000)}K`;
    const latest = amount[amount.length - 1];
    const latestYr = years[years.length - 1];
    const latestLCr = latest ? `₹${(latest/1e5).toFixed(1)}L Cr` : '';
    return {
      backgroundColor: 'transparent',
      grid: { top: 20, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s =>
            s.seriesIndex === 0
              ? `${s.marker}Accepted Amount: <b>₹${fmtA(s.value)} Cr</b>`
              : `${s.marker}Weighted Cut-off Yield: <b>${(+s.value).toFixed(2)}%</b>`
          ).join('<br/>'),
      },
      legend: {
        data: ['Accepted Amount', 'Weighted Cut-off Yield'],
        bottom: 4, itemWidth: 14, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
      },
      graphic: latestLCr ? [{ type: 'text', right: 70, top: 2,
        style: { text: `${latestYr}: ${latestLCr}`, fill: '#38bdf8', fontSize: 10, fontWeight: 700 } }] : [],
      xAxis: { type: 'category', data: years, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9 } },
      yAxis: [
        { type: 'value', min: 0, max: aMax, interval: aStep,
          axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtA(v) },
          splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
        { type: 'value', min: 0, max: yMax, interval: yStep,
          axisLabel: { color: c.amber, fontSize: 9, formatter: v => `${v}%` },
          splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'Accepted Amount', type: 'bar', yAxisIndex: 0, data: amount,
          barMaxWidth: 48, itemStyle: { color: '#38bdf8', borderRadius: [3, 3, 0, 0] } },
        { name: 'Weighted Cut-off Yield', type: 'line', yAxisIndex: 1, data: yld,
          smooth: true, symbol: 'circle', symbolSize: 5, connectNulls: false,
          lineStyle: { color: c.amber, width: 2.5 }, itemStyle: { color: c.amber } },
      ],
    };
  });

  /* ── CCIL ZCYC Model Pulse — Beta0 + Beta1 dual line ── */
  useChart(zcycRef, () => {
    if (!zcycPulseData) return null;
    const { days: zcDays, beta0: zcB0, beta1: zcB1 } = zcycPulseData;
    if (!zcDays.length) return null;
    const c = cc();
    const [days, beta0, beta1] = fyMonth(zcDays, zcB0, zcB1);
    const iv = Math.max(1, Math.floor(days.length / 8));
    const allV  = [...beta0, ...beta1.filter(v => v != null)];
    const minV  = allV.length ? Math.min(...allV) : 0;
    const maxV  = allV.length ? Math.max(...allV) : 8;
    const range = maxV - minV || 1;
    const step  = range <= 8 ? 2 : range <= 16 ? 4 : 8;
    const yMin  = Math.floor(minV / step) * step;
    const yMax  = Math.ceil(maxV  / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 12, right: 16, bottom: 40, left: 8, containLabel: true },
      legend: {
        data: ['Beta0', 'Beta1'], bottom: 4,
        itemWidth: 14, itemHeight: 8, textStyle: { color: c.text, fontSize: 10 },
      },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(4)}</b>`).join('<br/>'),
      },
      xAxis: { type: 'category', data: days, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9, interval: iv } },
      yAxis: { type: 'value', min: yMin, max: yMax, interval: step, axisLabel: { color: c.text, fontSize: 9 }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
      series: [
        { name: 'Beta0', type: 'line', data: beta0, smooth: true, symbol: 'none', lineStyle: { color: '#06b6d4', width: 2 }, itemStyle: { color: '#06b6d4' } },
        { name: 'Beta1', type: 'line', data: beta1, smooth: true, symbol: 'none', connectNulls: false, lineStyle: { color: '#ec4899', width: 2 }, itemStyle: { color: '#ec4899' } },
      ],
    };
  });

  /* ── FBIL G-Sec Zero Curve — yield curve snapshot across tenors ── */
  useChart(zeroRef, () => {
    if (!zeroCurveData) return null;
    const { labels, yields } = zeroCurveData;
    if (!labels.length) return null;
    const c = cc();
    const maxY = Math.ceil(Math.max(...yields) / 2) * 2;
    const yStep = 2;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Yield: <b>${(+p[0].value).toFixed(2)}%</b>`,
      },
      xAxis: { type: 'category', data: labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9 } },
      yAxis: { type: 'value', min: 0, max: maxY, interval: yStep, axisLabel: { color: c.text, fontSize: 9, formatter: v => v.toFixed(1) + '%' }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
      series: [{
        type: 'line', data: yields, smooth: true, symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 2.5 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b82f633' }, { offset: 1, color: '#3b82f600' }] } },
      }],
    };
  });

  /* ── G-Secs: Maturity Profile — API ── */
  useChart(gsecProfRef, () => {
    if (!gsecProfData) return null;
    const c = cc();
    const maxVal = Math.max(...gsecProfData.values);
    const useLCr = maxVal >= 100000;
    const divisor = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    const values = gsecProfData.values.map(v => +(v / divisor).toFixed(2));
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 36, left: 16, containLabel: true },
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}: <b>${p[0].value} ${unit}</b>` },
      xAxis: { type: 'category', data: gsecProfData.labels, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c) } },
      yAxis: { ...YAX(c, v => v + ' ' + unit), min: 0 },
      series: [{ type: 'bar', data: values, barMaxWidth: 60, itemStyle: { color: '#4f8ef7', borderRadius: [4, 4, 0, 0] } }],
    };
  });

  /* ── G-Secs: Maturity Ladder ── */
  useChart(gsecLadRef, () => {
    if (!gsecLadderData?.length) return null;
    const c = cc();
    const maxVal = Math.max(...gsecLadderData.map(d => d.value_cr));
    const useLCr = maxVal >= 100000;
    const divisor = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    const vals = gsecLadderData.map(d => +(d.value_cr / divisor).toFixed(2));
    const labels = gsecLadderData.map(d => d.fy);
    const COLOR = '#4f8ef7';
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 36, left: 16, containLabel: true },
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}: <b>${p[0].value} ${unit}</b>` },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c) } },
      yAxis: { ...YAX(c, v => v + ' ' + unit), min: 0 },
      series: [{
        type: 'line', data: vals, smooth: true, symbol: 'none',
        lineStyle: { color: COLOR, width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: COLOR + '55' }, { offset: 1, color: COLOR + '05' }]
          }
        },
      }],
    };
  });

  /* ── G-Secs: STRIPS Maturity Profile — API ── */
  useChart(stripsProfRef, () => {
    if (!stripsProfData) return null;
    const c = cc();
    const purples = ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#4c1d95'];
    const maxVal = Math.max(...stripsProfData.values);
    const useLCr = maxVal >= 100000;
    const divisor = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    const values = stripsProfData.values.map(v => +(v / divisor).toFixed(2));
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 36, left: 16, containLabel: true },
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}: <b>${p[0].value} ${unit}</b>` },
      xAxis: { type: 'category', data: stripsProfData.labels, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c) } },
      yAxis: { ...YAX(c, v => v + ' ' + unit), min: 0 },
      series: [{ type: 'bar', data: values, barMaxWidth: 60, itemStyle: { borderRadius: [4, 4, 0, 0], color: p => purples[p.dataIndex] } }],
    };
  });

  /* ── G-Secs: STRIPS Maturity Ladder ── */
  useChart(stripsLadRef, () => {
    if (!stripsLadderData?.length) return null;
    const c = cc();
    const maxVal = Math.max(...stripsLadderData.map(d => d.value_cr));
    const useLCr = maxVal >= 100000;
    const divisor = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    const vals = stripsLadderData.map(d => +(d.value_cr / divisor).toFixed(2));
    const labels = stripsLadderData.map(d => d.fy);
    const COLOR = '#a78bfa';
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 36, left: 16, containLabel: true },
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}: <b>${p[0].value} ${unit}</b>` },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c) } },
      yAxis: { ...YAX(c, v => v + ' ' + unit), min: 0 },
      series: [{
        type: 'line', data: vals, smooth: true, symbol: 'none',
        lineStyle: { color: COLOR, width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: COLOR + '55' }, { offset: 1, color: COLOR + '05' }]
          }
        },
      }],
    };
  });

  /* ── SGS: Annual Archive line chart (outstanding + Dynamic Top-5 share + YoY growth) ── */
  useChart(sgsArchRef, () => {
    if (!sgsAnnualArchiveData?.length) return null;
    const c = cc();
    const archFiltered = fyArr(sgsAnnualArchiveData);
    const labels = archFiltered.map(r => String(r.year ?? ''));
    const vals = archFiltered.map(r => +(r.total_outstanding_cr ?? 0));
    const top5ShareData = archFiltered.map(r => r.top5_share_percent != null ? +r.top5_share_percent : null);
    const yoy = archFiltered.map(r => r.yoy_growth_percent != null ? +r.yoy_growth_percent : null);
    const maxVal = Math.max(...vals.filter(Boolean));
    const useLCr = maxVal >= 100000;
    const div = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    const scaled = vals.map(v => +(v / div).toFixed(2));
    const hasTop5 = top5ShareData.some(v => v != null);
    const hasYoy = yoy.some(v => v != null);
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 64, bottom: 52, left: 16, containLabel: true },
      legend: {
        data: ['Annual Outstanding', 'Dynamic Top 5 Share', 'YoY Growth'],
        bottom: 8, left: 'center',
        textStyle: { color: c.text, fontSize: 10 }, itemWidth: 16, itemHeight: 10, icon: 'roundRect',
      },
      tooltip: {
        ...TT(c), formatter: p => {
          const os = p.find(s => s.seriesName === 'Annual Outstanding');
          const t5 = p.find(s => s.seriesName === 'Dynamic Top 5 Share');
          const yg = p.find(s => s.seriesName === 'YoY Growth');
          let txt = `<b>${p[0].axisValue}</b><br/>`;
          if (os) txt += `${os.marker}Annual Outstanding: <b>${os.value} ${unit}</b><br/>`;
          if (t5 && t5.value != null) txt += `${t5.marker}Dynamic Top 5 Share: <b>${t5.value}%</b><br/>`;
          if (yg && yg.value != null) txt += `${yg.marker}YoY Growth: <b>${yg.value}%</b>`;
          return txt;
        }
      },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c) } },
      yAxis: [
        { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + (useLCr ? 'L' : 'K') }, splitLine: SPL(c), axisLine: { show: false } },
        { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + '%' }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        {
          name: 'Annual Outstanding', type: 'line', data: scaled, smooth: true,
          symbol: 'circle', symbolSize: 5, yAxisIndex: 0,
          lineStyle: { color: '#06b6d4', width: 2 }, itemStyle: { color: '#06b6d4' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#06b6d433' }, { offset: 1, color: '#06b6d405' }] } }
        },
        {
          name: 'Dynamic Top 5 Share', type: 'line', data: hasTop5 ? top5ShareData : labels.map(() => null),
          smooth: true, symbol: 'circle', symbolSize: 5, yAxisIndex: 1,
          lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' }
        },
        {
          name: 'YoY Growth', type: 'line', data: hasYoy ? yoy : labels.map(() => null),
          smooth: true, symbol: 'circle', symbolSize: 5, yAxisIndex: 1,
          lineStyle: { color: '#22c55e', width: 2 }, itemStyle: { color: '#22c55e' }
        },
      ],
    };
  });

  /* ── SGS: State Debt Accumulation horizontal bar ── */
  useChart(sgsAccumRef, () => {
    if (!sgsStateData?.length) return null;
    const c = cc();
    const sorted = [...sgsStateData].sort((a, b) => b.total_outstanding - a.total_outstanding).slice(0, 15);
    const maxVal = Math.max(...sorted.map(d => d.total_outstanding));
    const useLCr = maxVal >= 100000;
    const div = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    const names = sorted.map(d => d.state).reverse();
    const values = sorted.map(d => +(d.total_outstanding / div).toFixed(2)).reverse();
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 72, bottom: 8, left: 8, containLabel: true },
      tooltip: {
        trigger: 'item', backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p.name}<br/><b>${p.value} ${unit}</b>`
      },
      xAxis: { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + ' ' + unit }, splitLine: SPL(c), axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'category', data: names, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c), fontSize: 9 } },
      series: [{ type: 'bar', data: values, barMaxWidth: 18, itemStyle: { color: '#22c55e', borderRadius: [0, 4, 4, 0] } }],
    };
  });

  /* ── SGS: Printed Coupon Stack — bars (outstanding) + bell curve line (share %) ── */
  useChart(couponStackRef, () => {
    if (!sgsCouponStackData?.buckets?.length) return null;
    const c = cc();
    const buckets = sgsCouponStackData.buckets;
    const labels = buckets.map(b => b.label);
    const vals = buckets.map(b => +(b.outstanding_cr ?? 0));
    const shares = buckets.map(b => +(b.share_percent ?? 0));
    const maxVal = Math.max(...vals);
    const useLCr = maxVal >= 100000;
    const div = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    const scaled = vals.map(v => +(v / div).toFixed(2));
    const maxPct = Math.max(...shares);
    const pctMax = Math.ceil(maxPct / 20) * 20 + 20;
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 60, bottom: 52, left: 16, containLabel: true },
      legend: {
        data: ['Outstanding', 'Share of Parsed Stock'],
        bottom: 8, left: 'center',
        textStyle: { color: c.text, fontSize: 10 }, itemWidth: 16, itemHeight: 10,
        icon: 'roundRect',
      },
      tooltip: {
        ...TT(c),
        formatter: p => {
          const bar  = p.find(s => s.seriesName === 'Outstanding');
          const line = p.find(s => s.seriesName === 'Share of Parsed Stock');
          let txt = `<b>${p[0].axisValue}</b><br/>`;
          if (bar)  txt += `${bar.marker}Outstanding: <b>₹${bar.value} ${unit}</b><br/>`;
          if (line) txt += `${line.marker}Share of Parsed Stock: <b>${line.value}%</b>`;
          return txt;
        },
      },
      xAxis: {
        type: 'category', data: labels, boundaryGap: true,
        axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false },
        axisLabel: { ...ALB(c) },
      },
      yAxis: [
        { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + (useLCr ? 'L' : 'K') }, splitLine: SPL(c), axisLine: { show: false } },
        { type: 'value', min: 0, max: pctMax, axisLabel: { ...ALB(c), formatter: v => v + '%' }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        {
          name: 'Outstanding', type: 'bar', data: scaled, yAxisIndex: 0,
          barMaxWidth: 80,
          itemStyle: { color: '#38bdf8', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Share of Parsed Stock', type: 'line', data: shares, yAxisIndex: 1,
          smooth: true, symbol: 'circle', symbolSize: 6,
          lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' },
        },
      ],
    };
  });

  /* ── SGS: Archive Weighted Coupon Trend — weighted coupon % + parse coverage % ── */
  useChart(couponTrendRef, () => {
    if (!sgsCouponTrendData?.length) return null;
    const c = cc();
    const couponFiltered = fyArr(sgsCouponTrendData);
    const labels = couponFiltered.map(r => String(r.year ?? ''));
    const coupons = couponFiltered.map(r => r.weighted_coupon_percent != null ? +r.weighted_coupon_percent : null);
    const coverage = couponFiltered.map(r => r.coupon_parse_coverage_percent != null ? +r.coupon_parse_coverage_percent : null);
    const maxCoupon = Math.max(...coupons.filter(v => v != null));
    const couponMax = Math.ceil(maxCoupon / 3) * 3 + 3;
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 60, bottom: 52, left: 16, containLabel: true },
      legend: {
        data: ['Weighted Printed Coupon', 'Coupon Parse Coverage'],
        bottom: 8, left: 'center',
        textStyle: { color: c.text, fontSize: 10 }, itemWidth: 16, itemHeight: 10, icon: 'roundRect',
      },
      tooltip: {
        ...TT(c),
        formatter: p => {
          const wc = p.find(s => s.seriesName === 'Weighted Printed Coupon');
          const cv = p.find(s => s.seriesName === 'Coupon Parse Coverage');
          let txt = `<b>${p[0].axisValue}</b><br/>`;
          if (wc && wc.value != null) txt += `${wc.marker}Weighted Printed Coupon: <b>${wc.value}%</b><br/>`;
          if (cv && cv.value != null) txt += `${cv.marker}Coupon Parse Coverage: <b>${cv.value}%</b>`;
          return txt;
        },
      },
      xAxis: {
        type: 'category', data: labels, boundaryGap: false,
        axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false },
        axisLabel: { ...ALB(c) },
      },
      yAxis: [
        {
          type: 'value', min: 0, max: couponMax,
          axisLabel: { ...ALB(c), formatter: v => v + '%' },
          splitLine: SPL(c), axisLine: { show: false },
        },
        {
          type: 'value', min: 0, max: 100,
          axisLabel: { ...ALB(c), formatter: v => v + '%' },
          splitLine: { show: false }, axisLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Weighted Printed Coupon', type: 'line', data: coupons, yAxisIndex: 0,
          smooth: true, symbol: 'circle', symbolSize: 5,
          lineStyle: { color: '#06b6d4', width: 2 }, itemStyle: { color: '#06b6d4' },
        },
        {
          name: 'Coupon Parse Coverage', type: 'line', data: coverage, yAxisIndex: 1,
          smooth: false, symbol: 'circle', symbolSize: 5,
          lineStyle: { color: '#22c55e', width: 2 }, itemStyle: { color: '#22c55e' },
        },
      ],
    };
  });

  /* ── SGS: SDL Maturity Wall (purple bars) ── */
  useChart(sdlMaturRef, () => {
    if (!sdlProfData) return null;
    const c = cc();
    const purples = ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9'];
    const maxVal = Math.max(...sdlProfData.values);
    const useLCr = maxVal >= 100000;
    const div = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 36, left: 16, containLabel: true },
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}: <b>${p[0].value} ${unit}</b>` },
      xAxis: { type: 'category', data: sdlProfData.labels, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c) } },
      yAxis: { ...YAX(c, v => v + ' ' + unit), min: 0 },
      series: [{ type: 'bar', data: sdlProfData.values.map((v, i) => ({ value: +(v / div).toFixed(2), itemStyle: { color: purples[Math.min(i, purples.length - 1)] } })), barMaxWidth: 80, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
    };
  });

  /* ── SGS: SDL Auction Supply and Clearing Yield — green bars + orange yield line ── */
  useChart(sdlAuctRef, () => {
    if (!sdlAuctData) return null;
    const { years: saYears, amount: saAmt, yield: saYld } = sdlAuctData;
    if (!saYears.length) return null;
    const c = cc();
    const [years, amount, yld] = fyFY(saYears, saAmt, saYld);
    if (!years.length) return null;
    const maxAmt  = Math.max(...amount.filter(v => v > 0)) || 1000000;
    const aStep   = maxAmt <= 400000 ? 100000 : maxAmt <= 800000 ? 200000 : maxAmt <= 1600000 ? 400000 : 500000;
    const aMax    = Math.ceil(maxAmt / aStep) * aStep;
    const validYld = yld.filter(v => v != null && v > 0);
    const maxYld  = validYld.length ? Math.max(...validYld) : 12;
    const yStep   = 3; const yMax = Math.ceil(maxYld / yStep) * yStep;
    const fmtA    = v => v >= 100000 ? `${(v / 1000).toFixed(0)}K` : `${Math.round(v / 1000)}K`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 20, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s =>
            s.seriesIndex === 0
              ? `${s.marker}Accepted Amount: <b>₹${fmtA(s.value)} Cr</b>`
              : `${s.marker}Weighted Avg Yield: <b>${(+s.value).toFixed(2)}%</b>`
          ).join('<br/>'),
      },
      legend: {
        data: ['Accepted Amount', 'Weighted Avg Yield'],
        bottom: 4, itemWidth: 14, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
      },
      xAxis: { type: 'category', data: years, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9 } },
      yAxis: [
        { type: 'value', min: 0, max: aMax, interval: aStep,
          axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtA(v) },
          splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
        { type: 'value', min: 0, max: yMax, interval: yStep,
          axisLabel: { color: c.amber, fontSize: 9, formatter: v => `${v}%` },
          splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'Accepted Amount', type: 'bar', yAxisIndex: 0, data: amount,
          barMaxWidth: 48, itemStyle: { color: '#22c55e', borderRadius: [3, 3, 0, 0] } },
        { name: 'Weighted Avg Yield', type: 'line', yAxisIndex: 1, data: yld,
          smooth: true, symbol: 'circle', symbolSize: 5, connectNulls: true,
          lineStyle: { color: c.amber, width: 2.5 }, itemStyle: { color: c.amber } },
      ],
    };
  });
  /* ── SGS: Top SDL Auction Borrowers — horizontal bars, latest FY, top 10 states ── */
  useChart(sdlBorrowRef, () => {
    if (!sdlTopBorrowData?.rows?.length) return null;
    const c = cc();
    const rows   = [...sdlTopBorrowData.rows].sort((a, b) => a.value - b.value);
    const names  = rows.map(r => r.name);
    const vals   = rows.map(r => r.value);
    const maxVal = Math.max(...vals);
    const useLCr = maxVal >= 100000;
    const div    = useLCr ? 100000 : 1000;
    const unit   = useLCr ? 'L Cr' : 'K Cr';
    const scaled = vals.map(v => +(v / div).toFixed(2));
    const scaledMax = maxVal / div;
    const rawStep   = scaledMax / 5;
    const mag       = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const step      = +((Math.ceil(rawStep / mag) * mag).toPrecision(4)) || 1;
    const axMax     = +((Math.ceil(scaledMax / step) * step).toPrecision(6));
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 24, bottom: 28, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].name ?? p[0].axisValue}</b><br/>${p[0].marker}Amount: <b>₹${p[0].value} ${unit}</b>`,
      },
      xAxis: {
        type: 'value', min: 0, max: axMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v + (useLCr ? 'L' : 'K') },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      yAxis: {
        type: 'category', data: names,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 10.5, align: 'right', width: 120, overflow: 'truncate' },
      },
      series: [{
        type: 'bar', data: scaled,
        barCategoryGap: '30%',
        itemStyle: { color: '#06b6d4', borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: c.text, fontSize: 9, formatter: p => `${p.value}${useLCr ? 'L' : 'K'}` },
      }],
    };
  });

  /* ── SGS: State-wise Outstanding — cyan horizontal bars, top 15 ── */
  useChart(sgsStateBarRef, () => {
    if (!sgsStateData?.length) return null;
    const c = cc();
    const sorted = [...sgsStateData].sort((a, b) => b.total_outstanding - a.total_outstanding).slice(0, 15);
    const names = sorted.map(d => d.state).reverse();
    const values = sorted.map(d => Math.round(d.total_outstanding / 1000)).reverse(); // → K Cr
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 80, bottom: 28, left: 8, containLabel: true },
      tooltip: {
        trigger: 'item', backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p.name}<br/><b>₹${p.value}K Cr</b>`
      },
      xAxis: { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + 'K' }, splitLine: SPL(c), axisLine: { show: false }, axisTick: { show: false }, min: 0 },
      yAxis: { type: 'category', data: names, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c), fontSize: 10 } },
      series: [{ type: 'bar', data: values, barMaxWidth: 20, itemStyle: { color: '#22d3ee', borderRadius: [0, 4, 4, 0] } }],
    };
  });

  /* ── SGS: National SGS Maturity Profile — % bars, per-bucket colors ── */
  useChart(sgsMaturPctRef, () => {
    if (!sdlProfData) return null;
    const c = cc();
    const COLORS = ['#7dd3fc', '#22c55e', '#6366f1', '#a78bfa', '#f59e0b'];
    const total = sdlProfData.values.reduce((s, v) => s + v, 0);
    const pcts = sdlProfData.values.map(v => total > 0 ? +(v / total * 100).toFixed(1) : 0);
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 36, left: 16, containLabel: true },
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}: <b>${p[0].value}%</b>` },
      xAxis: { type: 'category', data: sdlProfData.labels, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c) } },
      yAxis: { type: 'value', min: 0, axisLabel: { ...ALB(c), formatter: v => v + '%' }, splitLine: SPL(c), axisLine: { show: false } },
      series: [{ type: 'bar', data: pcts.map((v, i) => ({ value: v, itemStyle: { color: COLORS[i % COLORS.length] } })), barMaxWidth: 100, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
    };
  });

  /* ── SGS: Instrument Family Composition — horizontal bar sorted by outstanding ── */
  useChart(sgsInstrCompRef, () => {
    if (!sgsInstrCompData?.length) return null;
    const c = cc();
    const sorted = [...sgsInstrCompData].sort((a, b) => (a.outstanding_cr ?? 0) - (b.outstanding_cr ?? 0));
    const names = sorted.map(r => r.instrument_family ?? '');
    const vals = sorted.map(r => +(r.outstanding_cr ?? 0));
    const shares = sorted.map(r => +(r.share_percent ?? 0));
    const maxVal = Math.max(...vals);
    const useLCr = maxVal >= 100000;
    const div = useLCr ? 100000 : 1000;
    const unit = useLCr ? 'L Cr' : 'K Cr';
    const scaled = vals.map(v => +(v / div).toFixed(2));
    return {
      backgroundColor: 'transparent',
      grid: { top: 12, right: 16, bottom: 36, left: 16, containLabel: true },
      tooltip: {
        ...TT(c),
        formatter: p => {
          const r = p[0];
          const idx = names.indexOf(r.name ?? r.axisValue);
          const share = idx >= 0 ? shares[idx] : null;
          let txt = `<b>${r.name ?? r.axisValue}</b><br/>`;
          txt += `${r.marker}Outstanding: <b>₹${r.value} ${unit}</b>`;
          if (share != null) txt += `<br/>Share: <b>${share}%</b>`;
          return txt;
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: { ...ALB(c), formatter: v => v + (useLCr ? 'L' : 'K') },
        splitLine: SPL(c), axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: names,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { ...ALB(c), width: 160, overflow: 'truncate' },
      },
      series: [{
        type: 'bar', data: scaled, barMaxWidth: 40,
        itemStyle: { color: '#f97316', borderRadius: [0, 3, 3, 0] },
        label: { show: false },
      }],
    };
  });

  /* ── SGS: Current Maturity Regime — source TBD ── */
  useChart(sgsCurrRegRef, () => null);

  /* ── SGS: Legacy Maturity Regime — source TBD ── */
  useChart(sgsLegacyRegRef, () => null);

  /* ── Corp Bonds: Public Issues of NCDs ── */
  useChart(ncdRef, () => {
    if (!ncdData?.length) return null;
    const c = cc();
    const getPeriod = r => r.financial_year ?? r.fy ?? r.period ?? r.year ?? '';
    const getAmt    = r => +(r.amount_cr ?? r.amount ?? r.value ?? r.raised_cr ?? 0);
    const getCnt    = r => +(r.issue_count ?? r.count ?? r.num_issues ?? r.issues ?? 0);
    const ncdFiltered = fyArr(ncdData);
    const labels  = ncdFiltered.map(getPeriod);
    const amounts = ncdFiltered.map(getAmt);
    const counts  = ncdFiltered.map(getCnt);
    const maxAmt  = Math.max(...amounts.filter(Boolean));
    const div     = maxAmt >= 100000 ? 100000 : 1000;
    const unit    = maxAmt >= 100000 ? 'L Cr' : 'K Cr';
    const scaled  = amounts.map(v => +(v / div).toFixed(2));
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 56, bottom: 52, left: 16, containLabel: true },
      legend: { data: ['Amount Raised', 'Issue Count'], bottom: 8, left: 'center', textStyle: { color: c.text, fontSize: 10 }, itemWidth: 14, itemHeight: 10 },
      tooltip: { ...TT(c), formatter: p => {
        let txt = `<b>${p[0].axisValue}</b><br/>`;
        p.forEach(s => {
          if (s.seriesName === 'Amount Raised') txt += `${s.marker}Amount Raised: <b>${s.value} ${unit}</b><br/>`;
          else txt += `${s.marker}Issue Count: <b>${s.value}</b><br/>`;
        });
        return txt;
      }},
      xAxis: XAX(labels, c),
      yAxis: [
        { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + unit.split(' ')[0] }, splitLine: SPL(c), axisLine: { show: false } },
        { type: 'value', axisLabel: { ...ALB(c) }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'Amount Raised', type: 'bar', data: scaled, yAxisIndex: 0, barMaxWidth: 40, itemStyle: { color: '#3b82f6', borderRadius: [3,3,0,0] } },
        { name: 'Issue Count', type: 'line', data: counts, yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
      ],
    };
  });

  /* ── Corp Bonds: Private Placements ── */
  useChart(privPlacRef, () => {
    if (!privatePlacData?.length) return null;
    const c = cc();
    const getPeriod = r => r.financial_year ?? r.fy ?? r.period ?? r.year ?? '';
    const getAmt    = r => +(r.amount_cr ?? r.amount ?? r.value ?? r.total_amount_cr ?? 0);
    const getCnt    = r => +(r.placement_count ?? r.count ?? r.issue_count ?? r.num_placements ?? 0);
    const privFiltered = fyArr(privatePlacData);
    const labels  = privFiltered.map(getPeriod);
    const amounts = privFiltered.map(getAmt);
    const counts  = privFiltered.map(getCnt);
    const maxAmt  = Math.max(...amounts.filter(Boolean));
    const div     = maxAmt >= 100000 ? 100000 : 1000;
    const unit    = maxAmt >= 100000 ? 'L Cr' : 'K Cr';
    const scaled  = amounts.map(v => +(v / div).toFixed(2));
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 56, bottom: 52, left: 16, containLabel: true },
      legend: { data: ['Amount Raised', 'Issue Count'], bottom: 8, left: 'center', textStyle: { color: c.text, fontSize: 10 }, itemWidth: 14, itemHeight: 10 },
      tooltip: { ...TT(c), formatter: p => {
        let txt = `<b>${p[0].axisValue}</b><br/>`;
        p.forEach(s => {
          if (s.seriesName === 'Amount Raised') txt += `${s.marker}Amount Raised: <b>${s.value} ${unit}</b><br/>`;
          else txt += `${s.marker}Issue Count: <b>${s.value}</b><br/>`;
        });
        return txt;
      }},
      xAxis: XAX(labels, c),
      yAxis: [
        { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + unit.split(' ')[0] }, splitLine: SPL(c), axisLine: { show: false } },
        { type: 'value', axisLabel: { ...ALB(c) }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'Amount Raised', type: 'bar', data: scaled, yAxisIndex: 0, barMaxWidth: 40, itemStyle: { color: '#22c55e', borderRadius: [3,3,0,0] } },
        { name: 'Issue Count', type: 'line', data: counts, yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { color: '#a78bfa', width: 2 }, itemStyle: { color: '#a78bfa' } },
      ],
    };
  });

  /* ── Corp Bonds: Trading Volume (bars) + Trade Count (line) ── */
  useChart(corpBondTradRef, () => {
    if (!corpBondTradingData?.periods?.length) return null;
    const { periods: cbPeriods, counts: cbCounts, amounts: cbAmounts } = corpBondTradingData;
    const c = cc();
    const MN2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fP = p => { const [yr, mo] = (p ?? '').split('-'); return mo ? `${MN2[+mo-1] ?? mo} ${yr.slice(2)}` : (p ?? ''); };
    const [periods, counts, amounts] = fyPeriods(cbPeriods, cbCounts, cbAmounts);
    const labels  = periods.map(fP);
    const maxAmt  = Math.max(...amounts.filter(Boolean));
    const div     = maxAmt >= 100000 ? 100000 : 1000;
    const unit    = maxAmt >= 100000 ? 'L Cr' : 'K Cr';
    const scaled  = amounts.map(v => +(v / div).toFixed(2));
    const maxCnt  = Math.max(...counts.filter(Boolean));
    const cDiv    = maxCnt >= 100000 ? 100000 : maxCnt >= 1000 ? 1000 : 1;
    const cUnit   = maxCnt >= 100000 ? 'L' : maxCnt >= 1000 ? 'K' : '';
    const cScaled = counts.map(v => +(v / cDiv).toFixed(1));
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 56, bottom: 52, left: 16, containLabel: true },
      legend: { data: ['Trade Value', 'Trade Count'], bottom: 8, left: 'center', textStyle: { color: c.text, fontSize: 10 }, itemWidth: 14, itemHeight: 10 },
      tooltip: { ...TT(c), formatter: p => {
        let txt = `<b>${p[0].axisValue}</b><br/>`;
        p.forEach(s => {
          if (s.seriesName === 'Trade Value') txt += `${s.marker}Trade Value: <b>${s.value} ${unit}</b><br/>`;
          else txt += `${s.marker}Trade Count: <b>${s.value}${cUnit}</b><br/>`;
        });
        return txt;
      }},
      xAxis: { type: 'category', data: labels, boundaryGap: true, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c), interval: Math.max(0, Math.floor(labels.length / 10) - 1) } },
      yAxis: [
        { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + unit.split(' ')[0] }, splitLine: SPL(c), axisLine: { show: false } },
        { type: 'value', axisLabel: { ...ALB(c), formatter: v => v + cUnit }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'Trade Value', type: 'bar', data: scaled, yAxisIndex: 0, itemStyle: { color: '#22d3ee', borderRadius: [2,2,0,0] } },
        { name: 'Trade Count', type: 'line', data: cScaled, yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
      ],
    };
  });

  /* ── Corp Bonds: Outstanding Total — single smooth area line ── */
  useChart(corpBondOsRef, () => {
    if (!corpBondTrendData?.length) return null;
    const c = cc();
    const MN2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fP = p => { const [yr, mo] = (p ?? '').split('-'); return mo ? `${MN2[+mo-1]} ${yr.slice(2)}` : (p ?? ''); };

    const sorted = fyArr([...corpBondTrendData].sort((a, b) => (a.period ?? '') > (b.period ?? '') ? 1 : -1));
    const labels = sorted.map(r => fP(r.period ?? ''));
    const vals   = sorted.map(r => +(r.value ?? r.metric_value ?? 0));

    // Scale: values are in Cr; divide by 1000 → show as "K Cr"
    const maxVal = Math.max(...vals.filter(Boolean));
    const div    = maxVal >= 100000 ? 100000 : 1000;
    const unit   = maxVal >= 100000 ? 'L Cr' : 'K Cr';
    const scaled = vals.map(v => +(v / div).toFixed(1));

    const color = '#38bdf8';
    return {
      backgroundColor: 'transparent',
      grid: { top: 20, right: 16, bottom: 36, left: 16, containLabel: true },
      tooltip: {
        ...TT(c),
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Outstanding: <b>${p[0].value} ${unit}</b>`,
      },
      xAxis: {
        type: 'category', data: labels, boundaryGap: false,
        axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false },
        axisLabel: { ...ALB(c), interval: Math.max(0, Math.floor(labels.length / 8) - 1) },
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLabel: { ...ALB(c), formatter: v => v + unit.split(' ')[0] },
        splitLine: SPL(c), axisLine: { show: false },
      },
      series: [{
        name: 'Outstanding',
        type: 'line',
        data: scaled,
        smooth: true,
        symbol: 'none',
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '99' },
              { offset: 1, color: color + '08' },
            ],
          },
        },
      }],
    };
  });

  /* ── Legacy Financial vs Non-Financial — stacked area ── */
  useChart(corpLegacyIssuerRef, () => {
    if (!legacyIssuerData?.periods?.length) return null;
    const { periods: liPeriods, financial: liFin, nonFinancial: liNonFin } = legacyIssuerData;
    const c = cc();
    const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fP = p => { const [yr, mo] = (p ?? '').split('-'); return mo ? `${MN[+mo-1]} ${yr.slice(2)}` : (p ?? ''); };
    const [periods, financial, nonFinancial] = fyPeriods(liPeriods, liFin, liNonFin);
    const labels = periods.map(fP);
    const maxV = Math.max(...[...financial, ...nonFinancial].filter(Boolean));
    const div  = maxV >= 100000 ? 100000 : 1000;
    const unit = maxV >= 100000 ? 'L Cr' : 'K Cr';
    const sc = v => +(v / div).toFixed(1);
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 52, left: 16, containLabel: true },
      legend: {
        data: ['Financial Corporations', 'Non-Financial Corporations'],
        bottom: 8, left: 'center',
        textStyle: { color: c.text, fontSize: 10 }, itemWidth: 14, itemHeight: 10,
      },
      tooltip: {
        ...TT(c), trigger: 'axis',
        formatter: p => {
          let t = `<b>${p[0].axisValue}</b><br/>`;
          const total = p.reduce((s, s2) => s + (+s2.value || 0), 0);
          p.forEach(s => { t += `${s.marker}${s.seriesName}: <b>${s.value} ${unit}</b><br/>`; });
          t += `<hr style="border-color:${c.grid};margin:4px 0"/>Total: <b>${total.toFixed(1)} ${unit}</b>`;
          return t;
        },
      },
      xAxis: {
        type: 'category', data: labels, boundaryGap: false,
        axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false },
        axisLabel: { ...ALB(c), interval: Math.max(0, Math.floor(labels.length / 8) - 1) },
      },
      yAxis: {
        type: 'value', min: 0,
        axisLabel: { ...ALB(c), formatter: v => v + unit.split(' ')[0] },
        splitLine: SPL(c), axisLine: { show: false },
      },
      series: [
        {
          name: 'Financial Corporations', type: 'line', stack: 'total',
          data: financial.map(sc), smooth: true,
          symbol: 'circle', symbolSize: 3,
          lineStyle: { color: '#3b82f6', width: 1.5 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: { color: '#3b82f6cc' },
        },
        {
          name: 'Non-Financial Corporations', type: 'line', stack: 'total',
          data: nonFinancial.map(sc), smooth: true,
          symbol: 'circle', symbolSize: 3,
          lineStyle: { color: '#f59e0b', width: 1.5 },
          itemStyle: { color: '#f59e0b' },
          areaStyle: { color: '#f59e0bcc' },
        },
      ],
    };
  });

  /* ── Current Issuer Categories — 8-series stacked area ── */
  const CURR_DIM_CFG = [
    { id: 140, name: 'Banks',            color: '#2563eb' },
    { id: 141, name: 'Bank/PSU HFCs',    color: '#06b6d4' },
    { id: 142, name: 'Bank/PSU NBFCs',   color: '#10b981' },
    { id: 143, name: 'PSUs/Statutory',   color: '#3b82f6' },
    { id: 144, name: 'NBFC',             color: '#8b5cf6' },
    { id: 145, name: 'HFC',              color: '#ef4444' },
    { id: 146, name: 'Corporate',        color: '#f59e0b' },
    { id: 147, name: 'Others',           color: '#94a3b8' },
  ];
  useChart(corpCurrentIssuerRef, () => {
    if (!currentIssuerData?.periods?.length) return null;
    const { periods: ciRawPeriods, byDim: ciRawByDim } = currentIssuerData;
    const c = cc();
    const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fP = p => { const [yr, mo] = (p ?? '').split('-'); return mo ? `${MN[+mo-1]} ${yr.slice(2)}` : (p ?? ''); };
    const dimArrs = CURR_DIM_CFG.map(d => ciRawByDim[d.id] ?? []);
    const [periods, ...filteredDimArrs] = fyPeriods(ciRawPeriods, ...dimArrs);
    const byDim = Object.fromEntries(CURR_DIM_CFG.map((d, i) => [d.id, filteredDimArrs[i]]));
    const allVals = CURR_DIM_CFG.flatMap(d => byDim[d.id] ?? []);
    const maxV = Math.max(...allVals.filter(Boolean));
    const div  = maxV >= 100000 ? 100000 : 1000;
    const unit = maxV >= 100000 ? 'L Cr' : 'K Cr';
    const sc   = v => +(v / div).toFixed(1);
    const series = CURR_DIM_CFG.map(d => ({
      name: d.name, type: 'line', stack: 'total',
      data: (byDim[d.id] ?? []).map(sc),
      smooth: true, symbol: 'circle', symbolSize: 3,
      lineStyle: { color: d.color, width: 1 },
      itemStyle: { color: d.color },
      areaStyle: { color: d.color + 'cc' },
    }));
    return {
      backgroundColor: 'transparent',
      grid: { top: 28, right: 16, bottom: 70, left: 16, containLabel: true },
      legend: {
        data: CURR_DIM_CFG.map(d => d.name), bottom: 4, left: 'center',
        textStyle: { color: c.text, fontSize: 9 }, itemWidth: 12, itemHeight: 8, type: 'scroll',
      },
      tooltip: {
        ...TT(c), trigger: 'axis',
        formatter: p => {
          let t = `<b>${p[0].axisValue}</b><br/>`;
          const total = p.reduce((s, s2) => s + (+s2.value || 0), 0);
          p.forEach(s => { if (+s.value) t += `${s.marker}${s.seriesName}: <b>${s.value} ${unit}</b><br/>`; });
          t += `<hr style="border-color:${c.grid};margin:4px 0"/>Total: <b>${total.toFixed(1)} ${unit}</b>`;
          return t;
        },
      },
      xAxis: {
        type: 'category', data: periods.map(fP), boundaryGap: false,
        axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false },
        axisLabel: { ...ALB(c), interval: Math.max(0, Math.floor(periods.length / 8) - 1) },
      },
      yAxis: {
        type: 'value', min: 0,
        axisLabel: { ...ALB(c), formatter: v => v + unit.split(' ')[0] },
        splitLine: SPL(c), axisLine: { show: false },
      },
      series,
    };
  });


  /* ── Latest Issuer Composition — horizontal bar sorted by value ── */
  useChart(corpIssuerCompRef, () => {
    if (!corpBondIssuerData?.length) return null;
    const c = cc();
    // ascending sort so largest bar appears at top in horizontal chart
    const sorted = [...corpBondIssuerData].sort((a, b) => a.value - b.value);
    const labels = sorted.map(r => r.name);
    const vals   = sorted.map(r => r.value);
    const maxV   = Math.max(...vals.filter(Boolean));
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 16, bottom: 28, left: 16, containLabel: true },
      tooltip: { ...TT(c), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
        const v = p[0].value;
        const disp = v >= 100000 ? `₹${(v/100000).toFixed(1)}L Cr` : v >= 1000 ? `₹${(v/1000).toFixed(1)}K Cr` : `₹${Math.round(v).toLocaleString('en-IN')} Cr`;
        return `<b>${p[0].axisValue}</b><br/>${p[0].marker}Outstanding: <b>${disp}</b>`;
      }},
      xAxis: {
        type: 'value',
        axisLabel: { ...ALB(c), formatter: v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v },
        splitLine: SPL(c), axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: labels,
        axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false },
        axisLabel: { ...ALB(c), width: 130, overflow: 'truncate' },
      },
      series: [{
        name: 'Outstanding', type: 'bar', data: vals, barMaxWidth: 48, barMinHeight: 4,
        itemStyle: { color: params => sorted[params.dataIndex]?.color ?? '#60a5fa', borderRadius: [0, 4, 4, 0] },
      }],
    };
  });

  /* ── SGB Outstanding by Issue Vintage — bar chart ── */
  useChart(sgbVintageRef, () => {
    if (!sgbVintageData?.length) return null;
    const c = cc();
    const rows = fyArr([...sgbVintageData].sort((a, b) => (a.period ?? '').localeCompare(b.period ?? '')));
    const labels = rows.map(r => r.period ?? '');
    const vals   = rows.map(r => +(r.value ?? r.metric_value ?? 0));
    const fmtG = v => v >= 1e9 ? `${(v/1e9).toFixed(1)}B g` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M g` : `${Math.round(v).toLocaleString()} g`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 32, left: 8, containLabel: true },
      tooltip: { ...TT(c), trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Outstanding: <b>${fmtG(p[0].value)}</b>` },
      xAxis: { type: 'category', data: labels, axisLabel: { ...ALB(c) }, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { ...ALB(c), formatter: v => v >= 1e9 ? `${(v/1e9).toFixed(0)}Bg` : v >= 1e6 ? `${(v/1e6).toFixed(0)}Mg` : `${v}g` }, splitLine: SPL(c), axisLine: { show: false } },
      series: [{
        name: 'Outstanding', type: 'bar', data: vals, barMaxWidth: 56,
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
      }],
    };
  });

  /* ── SGB Redemption Ladder — smooth area line (maturity FY = issue FY + 8) ── */
  useChart(sgbLadderRef, () => {
    if (!sgbVintageData?.length) return null;
    const c = cc();
    const rows = [...sgbVintageData].sort((a, b) => (a.period ?? '').localeCompare(b.period ?? ''));
    // Derive maturity FY: add 8 years to issue FY string "YYYY-YY" → "(YYYY+8)-(YY+8)"
    const shiftFY = fy => {
      const [yr, mo] = fy.split('-');
      const y = +yr + 8;
      const m = +mo + 8;
      return `${y}-${String(m).padStart(2, '0')}`;
    };
    const labels = rows.map(r => shiftFY(r.period ?? ''));
    const vals   = rows.map(r => +(r.value ?? r.metric_value ?? 0));
    const fmtG = v => v >= 1e9 ? `${(v/1e9).toFixed(1)}B g` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M g` : `${Math.round(v).toLocaleString()} g`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 32, left: 8, containLabel: true },
      tooltip: { ...TT(c), trigger: 'axis', axisPointer: { type: 'line' },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Maturing: <b>${fmtG(p[0].value)}</b>` },
      xAxis: { type: 'category', data: labels, axisLabel: { ...ALB(c) }, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { ...ALB(c), formatter: v => v >= 1e9 ? `${(v/1e9).toFixed(0)}Bg` : v >= 1e6 ? `${(v/1e6).toFixed(0)}Mg` : `${v}g` }, splitLine: SPL(c), axisLine: { show: false } },
      series: [{
        name: 'Maturing', type: 'line', data: vals, smooth: true,
        symbol: 'none',
        lineStyle: { color: '#10b981', width: 2.5 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#10b98166' }, { offset: 1, color: '#10b98100' }] } },
      }],
    };
  });

  const periodOpts = ['1Y', '3Y', '5Y', 'All'];
  const fromYears = ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
  const toYears = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

  /* ── SGB tab derived KPIs ── */
  const sgbRows = sgbVintageData ? [...sgbVintageData].sort((a, b) => (a.period ?? '').localeCompare(b.period ?? '')) : [];
  const sgbTotalGrams   = sgbRows.reduce((s, r) => s + +(r.value ?? r.metric_value ?? 0), 0);
  const sgbActiveTranches = sgbRows.filter(r => +(r.value ?? r.metric_value ?? 0) > 0).length;
  const sgbCrUnits      = sgbTotalGrams ? `${(sgbTotalGrams / 1e7).toFixed(0)}Cr` : '—';
  const sgbLargestRow   = sgbRows.length ? sgbRows.reduce((mx, r) => +(r.value ?? 0) > +(mx.value ?? 0) ? r : mx, sgbRows[0]) : null;
  const sgbAvgMaturity  = sgbTotalGrams > 0 ? (() => {
    const curFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const wt = sgbRows.reduce((s, r) => {
      const issueY = +(r.period ?? '0').split('-')[0];
      const matY   = issueY + 8;
      const remaining = Math.max(0, matY - curFY);
      return s + remaining * +(r.value ?? 0);
    }, 0);
    return (wt / sgbTotalGrams).toFixed(1);
  })() : null;
  const sgbSnap = sgbOsKpi?.sub ?? '';

  /* ── SGS tab derived values ── */
  const fmtLCr = v => { const lc = v / 100000; return lc >= 1 ? `₹${lc.toFixed(1)}L Cr` : `₹${(v / 1000).toFixed(1)}K Cr`; };
  const isDark = isDk();
  const sgsTrendVals = sgsTrendData?.map(r => +(r.value ?? r.metric_value ?? 0)) ?? [];
  const sgsArchiveStockKpi = sgsTrendVals.length ? { value: fmtLCr(sgsTrendVals[sgsTrendVals.length - 1]), sub: `RBI State Finances ${new Date().getFullYear()}` } : null;
  const sgsCagrKpi = sgsTrendVals.filter(Boolean).length >= 2 ? (() => {
    const v = sgsTrendVals.filter(Boolean);
    const cagr = (Math.pow(v[v.length - 1] / v[0], 1 / (v.length - 1)) - 1) * 100;
    return { value: `${cagr.toFixed(1)}%`, sub: `${sgsTrendData[0]?.period ?? ''}–${sgsTrendData[sgsTrendData.length - 1]?.period ?? ''}` };
  })() : null;
  const stateSorted = sgsStateData ? [...sgsStateData].sort((a, b) => b.total_outstanding - a.total_outstanding) : [];
  const sgsTop5Share = sgsTop5Data?.share ?? (stateSorted.length ? stateSorted.slice(0, 5).reduce((s, r) => s + (r.share_percent ?? 0), 0).toFixed(1) : null);
  const sgsLargest = stateSorted[0] ?? null;
  const SGS_PAGE_SIZE = 10;
  const sgsTotalPages = Math.max(1, Math.ceil(stateSorted.length / SGS_PAGE_SIZE));
  const sgsTableRows = stateSorted.slice((sgsTablePage - 1) * SGS_PAGE_SIZE, sgsTablePage * SGS_PAGE_SIZE);

  // Regional Debt Blocs (computed from sgsStateData)
  const regionTotals = {};
  (sgsStateData || []).forEach(r => {
    const reg = STATE_REGION[(r.state || '').toUpperCase()] || 'Other';
    regionTotals[reg] = (regionTotals[reg] || 0) + (r.total_outstanding || 0);
  });
  const regionGrand = Object.values(regionTotals).reduce((s, v) => s + v, 0);
  const regions = ['South', 'North', 'West', 'East', 'Central', 'North-East'].map(name => ({
    name, value: regionTotals[name] || 0, color: REGION_COLORS[name],
    share: regionGrand > 0 ? ((regionTotals[name] || 0) / regionGrand * 100).toFixed(1) : '0',
  }));
  const maxRegionVal = Math.max(...regions.map(r => r.value), 1);

  // Top 5 borrowing programs
  const top5Programs = stateSorted.slice(0, 5).map((r, i) => {
    const reg = STATE_REGION[(r.state || '').toUpperCase()] || 'Other';
    return {
      name: r.state, region: reg, color: REGION_COLORS[reg] || '#888',
      share: r.share_percent != null ? r.share_percent.toFixed(1) : ((r.total_outstanding / (sgsStateData?.reduce((s, x) => s + x.total_outstanding, 0) || 1)) * 100).toFixed(1),
      value: fmtLCr(r.total_outstanding), rank: i + 1
    };
  });

  // National Snapshot KPIs
  const sgsNatTotal = stateSorted.reduce((s, r) => s + (r.total_outstanding || 0), 0);
  const sgsAvgBook = stateSorted.length ? fmtLCr(sgsNatTotal / stateSorted.length) : '—';
  const sgsSnapDate = sgsStateMeta?.snapshot_date ?? sgsOsKpi?.sub?.replace('as of ', '') ?? '—';
  const SGS_OS_PAGE_SIZE = 15;
  const sgsOsTotalPages = Math.max(1, Math.ceil(stateSorted.length / SGS_OS_PAGE_SIZE));
  const sgsOsRows = stateSorted.slice((sgsOsPage - 1) * SGS_OS_PAGE_SIZE, sgsOsPage * SGS_OS_PAGE_SIZE);

  // ── Corp Bonds tab derived values ──
  const fmtCount = v => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(v);
  const leadIssuerKpi = (() => {
    if (!corpBondIssuerData?.length) return null;
    const total = corpBondIssuerData.reduce((s, r) => s + r.value, 0);
    const top = [...corpBondIssuerData].sort((a, b) => b.value - a.value)[0];
    const share = total > 0 ? (top.value / total * 100).toFixed(1) : '—';
    return { name: top.name, sub: `${share}% of current total` };
  })();
  const MN_CB = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fPcb = p => { const [yr, mo] = (p ?? '').split('-'); return mo ? `${MN_CB[+mo-1]} ${yr.slice(2)}` : (p ?? ''); };
  const corpTradesKpi = (() => {
    if (!corpBondTradingData?.periods?.length) return null;
    const { periods, amounts } = corpBondTradingData;
    const lastAmt = amounts[amounts.length - 1];
    const div = lastAmt >= 100000 ? 100000 : 1000; const unit = lastAmt >= 100000 ? 'L Cr' : 'K Cr';
    return { value: `₹${(lastAmt / div).toFixed(1)} ${unit}`, sub: fPcb(periods[periods.length - 1] ?? '') };
  })();
  const tradeCountKpi = (() => {
    if (!corpBondTradingData?.periods?.length) return null;
    const lastCnt = corpBondTradingData.counts[corpBondTradingData.counts.length - 1];
    return { value: fmtCount(lastCnt), sub: 'Latest SEBI month' };
  })();
  const ncdKpi = (() => {
    if (!ncdData?.length) return null;
    const last = ncdData[ncdData.length - 1];
    const val = +(last.amount_cr ?? last.amount ?? last.value ?? 0);
    const div = val >= 100000 ? 100000 : 1000; const unit = val >= 100000 ? 'L Cr' : 'K Cr';
    return { value: `₹${(val/div).toFixed(1)} ${unit}`, sub: last.financial_year ?? last.fy ?? last.period ?? '' };
  })();
  const privPlacKpi = (() => {
    if (!privatePlacData?.length) return null;
    const last = privatePlacData[privatePlacData.length - 1];
    const val = +(last.amount_cr ?? last.amount ?? last.value ?? last.total_amount_cr ?? 0);
    const div = val >= 100000 ? 100000 : 1000; const unit = val >= 100000 ? 'L Cr' : 'K Cr';
    return { value: `₹${(val/div).toFixed(1)} ${unit}`, sub: last.financial_year ?? last.fy ?? last.period ?? '' };
  })();

  // ── Issuance Summary — join ncdData + privatePlacData by FY ──
  const issuanceSummary = (() => {
    if (!ncdData?.length && !privatePlacData?.length) return [];
    const getPeriod = r => r.financial_year ?? r.fy ?? r.period ?? '';
    const ncdMap = {};
    (ncdData ?? []).forEach(r => {
      ncdMap[getPeriod(r)] = { amount: +(r.amount_cr ?? r.amount ?? r.value ?? 0), count: +(r.issue_count ?? r.count ?? r.num_issues ?? 0) };
    });
    const ppMap = {};
    (privatePlacData ?? []).forEach(r => {
      ppMap[getPeriod(r)] = { amount: +(r.amount_cr ?? r.amount ?? r.value ?? r.total_amount_cr ?? 0), count: +(r.issue_count ?? r.count ?? r.num_issues ?? 0) };
    });
    const allFys = [...new Set([...Object.keys(ncdMap), ...Object.keys(ppMap)])].sort().filter(fy => fy >= '2014-15');
    return allFys.map(fy => {
      const ncd = ncdMap[fy] ?? { amount: 0, count: 0 };
      const pp  = ppMap[fy] ?? { amount: 0, count: 0 };
      return { fy, ncdCount: ncd.count, ncdAmount: ncd.amount, ppCount: pp.count, ppAmount: pp.amount, total: ncd.amount + pp.amount };
    });
  })();

  // snapshot label for Issuer Composition subtitle
  const issuerCompSnap = (() => {
    if (!corpBondIssuerData?.length) return 'Latest snapshot';
    const p = corpBondIssuerData.find(r => r.period)?.period ?? '';
    if (!p) return 'Latest snapshot';
    const [yr, mo] = p.split('-');
    const MNS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return mo ? `Current regime snapshot · ${MNS[+mo-1]} ${yr}` : `Snapshot · ${p}`;
  })();

  return (
    <div
      className={`page${isActive ? ' on' : ''}`}
      id="page-dm"
      style={{ display: isActive ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      <div className="dm-scroll" style={{ flex: '1 1 0', minHeight: 0, height: 0, overflowY: 'scroll', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Top header bar ── */}
        <div className="dm-topbar">
          <div className="dm-topbar-left">
            <h1 className="dm-title">Debt Markets</h1>
            <span className="dm-sub">Sovereign, state, corporate, and gold-linked debt datasets from the repaired live 'bondbulls' database</span>
          </div>
          <div className="dm-topbar-right">
            {/* <span className="dm-cur-view">Current view: {activeSubtab.label}</span> */}
            {/* <span className="dm-cur-sub">{activeSubtab.sub}</span> */}
          </div>
        </div>

        {/* ── Filter row ── */}
        <div className="dm-filter-row">
          <div className="dm-pill-grp">
            {periodOpts.map(p => (
              <button key={p} className={`dm-pill${period === p ? ' on' : ''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr - 1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr - 3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr - 5)); setToYear(String(yr)); }
                else if (p === 'All') { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <span className="dm-filter-lbl">From</span>
          <select className="dm-sel" value={fromYear} onChange={e => { setFromYear(e.target.value); setPeriod(''); }}>
            {fromYears.map(y => <option key={y}>{y}</option>)}
          </select>
          <span className="dm-filter-lbl">To</span>
          <select className="dm-sel" value={toYear} onChange={e => { setToYear(e.target.value); setPeriod(''); }}>
            {toYears.map(y => <option key={y}>{y}</option>)}
          </select>
          {/* {(period || fromYear !== '2014' || toYear !== String(new Date().getFullYear())) && (
            <span className="dm-badge dm-badge-filter">
              {period === 'All' ? 'All years' : `Filtered: ${fromYear}–${toYear}`}
            </span>
          )} */}
          <div style={{ flex: 1 }} />
          {/* <button className="dm-reset-btn" onClick={() => { setPeriod('All'); setFromYear('2014'); setToYear(String(new Date().getFullYear())); }}>
            × Reset
          </button> */}
        </div>

        {/* ── Sub-tabs ── */}
        <div className="dm-tabs-outer">
          <div className="dm-tabs">
            {SUBTABS.map(t => (
              <button
                key={t.id}
                className={`dm-tab${activeTab === t.id ? ' on' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="dm-tab-label">{t.label}</span>
                <span className="dm-tab-sub">{t.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ══ OVERVIEW TAB ══ */}
        {activeTab === 'overview' && <>
          <div className="dm-kpi-row">
            {[
              { label: 'G-SEC OUTSTANDING', value: gsecOsKpi?.value ?? '—', sub: gsecOsKpi?.sub ?? '', icon: '🏛', color: 'var(--blue)' },
              { label: 'SGS OUTSTANDING', value: sgsOsKpi?.value ?? '—', sub: sgsOsKpi?.sub ?? '', icon: '📋', color: 'var(--teal)' },
              { label: 'CORP BOND OUTSTANDING', value: corpBondOsKpi?.value ?? '—', sub: corpBondOsKpi?.sub ?? '', icon: '🏢', color: 'var(--purple)' },
              { label: 'TOTAL DEBT MARKET', value: totalDebtKpi?.value ?? '—', sub: totalDebtKpi?.sub ?? '', icon: '📈', color: 'var(--green)' },
              { label: '10Y G-SEC ZERO', value: tenYZeroKpi?.value ?? '—', sub: tenYZeroKpi?.sub ?? '', icon: '〰', color: 'var(--amber)' },
              { label: 'SGB OUTSTANDING', value: sgbOsKpi?.value ?? '—', sub: sgbOsKpi?.sub ?? '', icon: '🥇', color: 'var(--orange)' },
            ].map(k => (
              <div key={k.label} className="dm-kpi-card">
                {/* <span className="dm-kpi-accent" style={{ background: k.color }} /> */}
                <div className="dm-kpi-top">
                  <span className="dm-kpi-label">{k.label}</span>
                  <span className="dm-kpi-icon" style={{ color: k.color }}>{k.icon}</span>
                </div>
                {k.value === '—' ? <span className="kpi-skel" /> : <span className="dm-kpi-val">{k.value}</span>}
                <span className="dm-kpi-sub">{k.value === '—' ? '' : k.sub}</span>
              </div>
            ))}
          </div>

          <div className="dm-charts-wrap">
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Key Sovereign Rates</span>
                    <span className="dm-badge dm-badge-range">2014 — 2026</span>
                  </div>
                  <span className="dm-card-sub">Monthly repo rate versus 1Y, 5Y, and 10Y zero yields</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(ratesRef.current, 'Key Sovereign Rates')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={ratesRef} className="dm-chart" />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Secondary Debt Trading</span>
                  </div>
                  <span className="dm-card-sub">Monthly SEBI corporate bond trades</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(tradRef.current, 'Secondary Debt Trading')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={tradRef} className="dm-chart" />
              </div>
            </div>
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">NSE WDM Security Mix</span>
                  </div>
                  <span className="dm-card-sub">Monthly traded value across sovereign and credit buckets</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(wdmRef.current, 'NSE WDM Security Mix')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={wdmRef} className="dm-chart" />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">NSE EBP Issuance Mix</span>
                  </div>
                  <span className="dm-card-sub">Monthly amount raised by canonical security type</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(ebpRef.current, 'NSE EBP Issuance Mix')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={ebpRef} className="dm-chart" />
              </div>
            </div>
          </div>
        </>}

        {/* ══ G-SECS TAB ══ */}
        {activeTab === 'gsecs' && <>
          <div className="dm-kpi-row">
            {[
              { label: 'G-SEC STOCK', value: gsecOsKpi?.value ?? '—', sub: gsecOsKpi?.sub ?? '', icon: '🏛', color: 'var(--blue)' },
              { label: 'G-SEC AVG MATURITY', value: gsecWamKpi?.value ?? '—', sub: gsecWamKpi?.sub ?? '', icon: '〰', color: 'var(--teal)' },
              { label: 'STRIPS STOCK', value: stripsOsKpi?.value ?? '—', sub: stripsOsKpi?.sub ?? '', icon: '📋', color: 'var(--purple)' },
              { label: 'STRIPS AVG MATURITY', value: stripsWamKpi?.value ?? '—', sub: stripsWamKpi?.sub ?? '', icon: '🛡', color: 'var(--orange)' },
              { label: '10Y ZERO', value: tenYZeroKpi?.value ?? '—', sub: tenYZeroKpi?.sub ?? '', icon: '〰', color: 'var(--amber)' },
            ].map(k => (
              <div key={k.label} className="dm-kpi-card">
                {/* <span className="dm-kpi-accent" style={{ background: k.color }} /> */}
                <div className="dm-kpi-top">
                  <span className="dm-kpi-label">{k.label}</span>
                  <span className="dm-kpi-icon" style={{ color: k.color }}>{k.icon}</span>
                </div>
                {k.value === '—' ? <span className="kpi-skel" /> : <span className="dm-kpi-val">{k.value}</span>}
                <span className="dm-kpi-sub">{k.value === '—' ? '' : k.sub}</span>
              </div>
            ))}
          </div>

          <div className="dm-charts-wrap">

            {/* Row 1: Auction (wide) | CCIL ZCYC pulse (narrow) */}
            <div className="dm-chart-row dm-row-6040">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">G-Sec Auction Supply vs Cut-off Yield</span>
                    {/* <span className="dm-badge dm-badge-range">2025: ₹7.6L Cr</span> */}
                  </div>
                  <span className="dm-card-sub">FIMMDA auction history · accepted amount with weighted cut-off yield</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(auctRef.current, 'G-Sec Auction Supply vs Cut-off Yield')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={auctRef} className="dm-chart" />
              </div>

              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">CCIL ZCYC Model Pulse</span>
                  </div>
                  <span className="dm-card-sub">NSS parameter drift · public rolling window only</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(zcycRef.current, 'CCIL ZCYC Model Pulse')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div className="dm-zcyc-kpis">
                  <div className="dm-zcyc-kpi">
                    <span className="dm-zcyc-lbl">LATEST BETA0</span>
                    <span className="dm-zcyc-val">{zcycPulseData?.latestB0 != null ? `${zcycPulseData.latestB0.toFixed(2)}%` : '—'}</span>
                    <span className="dm-zcyc-sub">long-run level</span>
                  </div>
                  <div className="dm-zcyc-kpi">
                    <span className="dm-zcyc-lbl">LATEST BETA1</span>
                    <span className="dm-zcyc-val">{zcycPulseData?.latestB1 != null ? zcycPulseData.latestB1.toFixed(2) : '—'}</span>
                    <span className="dm-zcyc-sub">slope factor</span>
                  </div>
                </div>
                <div ref={zcycRef} className="dm-chart dm-chart-zcyc" />
              </div>
            </div>

            {/* Row 2: FBIL Zero Curve | G-Sec Maturity Profile */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">FBIL G-Sec Zero Curve</span>
                    {zeroCurveData?.snapshotDate && <span className="dm-badge dm-badge-range">{zeroCurveData.snapshotDate}</span>}
                  </div>
                  <span className="dm-card-sub">Latest daily sovereign curve across tenors</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(zeroRef.current, 'FBIL G-Sec Zero Curve')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={zeroRef} className="dm-chart" />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">G-Sec Maturity Profile</span>
                  </div>
                  <span className="dm-card-sub">Current outstanding by residual maturity bucket</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(gsecProfRef.current, 'G-Sec Maturity Profile')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={gsecProfRef} className="dm-chart" />
              </div>
            </div>

            {/* Row 3: G-Sec Maturity Ladder | STRIPS Maturity Profile */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">G-Sec Maturity Ladder</span>
                  </div>
                  <span className="dm-card-sub">Current outstanding grouped by maturity financial year</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(gsecLadRef.current, 'G-Sec Maturity Ladder')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={gsecLadRef} className="dm-chart" />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">STRIPS Maturity Profile</span>
                  </div>
                  <span className="dm-card-sub">Current STRIPS stock by residual maturity bucket</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(stripsProfRef.current, 'STRIPS Maturity Profile')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={stripsProfRef} className="dm-chart" />
              </div>
            </div>

            {/* Row 4: STRIPS Maturity Ladder — full width */}
            <div className="dm-card">
              <div className="dm-card-hdr">
                <div className="dm-card-hdr-left">
                  <span className="dm-card-title">STRIPS Maturity Ladder</span>
                </div>
                <span className="dm-card-sub">Current STRIPS stock grouped by maturity financial year</span>
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(stripsLadRef.current, 'STRIPS Maturity Ladder')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              <div ref={stripsLadRef} className="dm-chart" />
            </div>

            {/* Row 5: Top G-Sec Lines | Top STRIPS Lines */}
            <div className="dm-chart-row">
              {/* Top G-Sec Lines */}
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Top G-Sec Outstanding Lines</span>
                  </div>
                  <span className="dm-card-sub">Source: RBI </span>
                </div>
                <div className="dm-tbl-wrap">
                  <div className="dm-tbl-hdr">
                    <span className="dm-tbl-sect">Largest sovereign lines</span>
                  </div>
                  <table className="dm-tbl">
                    <thead><tr><th>Security (ISIN)</th><th>Maturity</th><th style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>Outstanding (₹ Cr)</th></tr></thead>
                    <tbody>
                      {gsecTopLines?.length
                        ? gsecTopLines.map((r, i) => (
                          <tr key={i}>
                            <td className="dm-tbl-mono">{r.dimension_name ?? '—'}</td>
                            <td>{r.date ?? '—'}</td>
                            <td className="dm-tbl-num">{(+(r.metric_value ?? 0)).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                        : <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--tx3)', padding: '16px', fontSize: '11px' }}>No data available</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Top STRIPS Lines */}
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Top STRIPS Lines</span>
                  </div>
                  <span className="dm-card-sub">Latest STRIPS snapshot: Apr 2026</span>
                </div>
                <div className="dm-tbl-wrap">
                  <div className="dm-tbl-hdr">
                    <span className="dm-tbl-sect">Largest STRIPS lines</span>
                  </div>
                  <table className="dm-tbl">
                    <thead><tr><th>STRIPS (ISIN)</th><th>Maturity</th><th style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>Outstanding (₹ Cr)</th></tr></thead>
                    <tbody>
                      {stripsTopLines?.length
                        ? stripsTopLines.map((r, i) => (
                          <tr key={i}>
                            <td className="dm-tbl-mono">{r.dimension_name ?? '—'}</td>
                            <td>{r.date ?? '—'}</td>
                            <td className="dm-tbl-num">{(+(r.metric_value ?? 0)).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                        : <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--tx3)', padding: '16px', fontSize: '11px' }}>No data available</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </>}

        {/* ══ SGS TAB ══ */}
        {activeTab === 'sgs' && <>
          <div className="dm-kpi-row">
            {[
              { label: 'CURRENT SGS OUTSTANDING', value: sgsOsKpi?.value ?? '—', sub: sgsOsKpi?.sub ?? '', icon: '📋', color: 'var(--teal)' },
              { label: 'ANNUAL ARCHIVE STOCK', value: sgsArchiveStockKpi?.value ?? '—', sub: sgsArchiveStockKpi?.sub ?? '', icon: '🗃', color: 'var(--blue)' },
              { label: 'ARCHIVE CAGR', value: sgsCagrKpi?.value ?? '—', sub: sgsCagrKpi?.sub ?? '', icon: '📈', color: 'var(--green)' },
              { label: 'TOP 5 SHARE', value: sgsTop5Share ? `${sgsTop5Share}%` : '—', sub: 'Borrowing concentration', icon: '🏆', color: 'var(--amber)' },
              { label: 'LARGEST STATE', value: sgsLargest?.state ?? '—', sub: sgsLargest ? fmtLCr(sgsLargest.total_outstanding) : '', icon: '🗺', color: 'var(--purple)' },
            ].map(k => (
              <div key={k.label} className="dm-kpi-card">
                <div className="dm-kpi-top">
                  <span className="dm-kpi-label">{k.label}</span>
                  <span className="dm-kpi-icon" style={{ color: k.color }}>{k.icon}</span>
                </div>
                {k.value === '—' ? <span className="kpi-skel" /> : <span className="dm-kpi-val">{k.value}</span>}
                <span className="dm-kpi-sub">{k.value === '—' ? '' : k.sub}</span>
              </div>
            ))}
          </div>

          <div className="dm-charts-wrap">

            {/* Row 1: Archive chart (wide) + Archive Integrity card */}
            <div className="dm-chart-row dm-row-6535">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">RBI SGS Annual Market Loan Archive</span>
                  </div>
                  <span className="dm-card-sub">Long-run official State Finances archive; annual state totals are source-preserving and separate from the current ISIN-level snapshot</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sgsArchRef.current, 'RBI SGS Annual Market Loan Archive')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={sgsArchRef} className="dm-chart" />
              </div>
              <div className="dm-card dm-integrity-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Archive Integrity</span>
                  </div>
                  <span className="dm-card-sub">What changed in the live warehouse and how to read it</span>
                </div>
                <div className="dm-integrity-body">
                  <div className="dm-integrity-kpi-row">
                    <div className="dm-integrity-kpi">
                      <span className="dm-integrity-lbl">ANNUAL PUBLICATION ROWS</span>
                      <span className="dm-integrity-val">{sgsTrendVals.length > 0 ? `${sgsTrendVals.length} FY` : '—'}</span>
                      <span className="dm-integrity-sub">Financial years in current archive</span>
                    </div>
                  </div>
                  <div className="dm-integrity-kpi-row">
                    <div className="dm-integrity-kpi">
                      <span className="dm-integrity-lbl">SGS OUTSTANDING</span>
                      <span className="dm-integrity-val">{sgsOsKpi?.value ?? '—'}</span>
                      <span className="dm-integrity-sub">{sgsOsKpi?.sub ?? 'ISIN-level snapshot'}</span>
                    </div>
                    <div className="dm-integrity-kpi">
                      <span className="dm-integrity-lbl">STATES TRACKED</span>
                      <span className="dm-integrity-val">{stateSorted.length > 0 ? stateSorted.length : '—'}</span>
                      <span className="dm-integrity-sub">State / UT in ranking</span>
                    </div>
                  </div>
                  <p className="dm-integrity-note">Annual PDFs do not always publish ISINs or issue dates, so this archive is used for historical aggregate stock, maturity-year, and instrument-family analytics. The current ISIN-level book remains the separate RBI Statistics snapshot.</p>
                </div>
              </div>
            </div>

            {/* Row 2: State Accumulation chart + Annual Archive Ranking table */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">State Debt Accumulation</span>
                  </div>
                  <span className="dm-card-sub">Current outstanding by state — latest ISIN snapshot</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sgsAccumRef.current, 'State Debt Accumulation')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={sgsAccumRef} style={{ width: '100%', height: 360 }} />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left" style={{ justifyContent: 'space-between' }}>
                    <span className="dm-card-title">RBI Annual Archive Ranking</span>
                    {/* <button className="dm-contact-btn">⚿ Contact us for access</button> */}
                  </div>
                </div>
                <div className="dm-tbl-wrap">
                  <table className="dm-tbl">
                    <thead><tr>
                      <th>State / UT</th>
                      <th className="dm-tbl-num">Outstanding</th>
                      <th className="dm-tbl-num">Share</th>
                      {/* <th className="dm-tbl-num">Δ Outstanding</th>
                      <th className="dm-tbl-num">Growth</th> */}
                    </tr></thead>
                    <tbody>
                      {sgsTableRows.length
                        ? sgsTableRows.map((r, i) => {
                          const delta = r.historical_delta ?? null;
                          const growth = r.historical_growth_percent ?? null;
                          const dColor = !delta ? 'var(--tx3)' : delta > 0 ? '#22c55e' : '#ef4444';
                          const gColor = !growth ? 'var(--tx3)' : growth > 0 ? '#22c55e' : '#ef4444';
                          return (
                            <tr key={i}>
                              <td>{r.state ?? '—'}</td>
                              <td className="dm-tbl-num">{fmtLCr(r.total_outstanding ?? 0)}</td>
                              <td className="dm-tbl-num">{r.share_percent != null ? `${r.share_percent.toFixed(1)}%` : '—'}</td>
                              {/* <td className="dm-tbl-num" style={{ color: dColor }}>
                                {delta == null || delta === 0 ? '—' : `${delta > 0 ? '+' : '−'}${fmtLCr(Math.abs(delta))}`}
                              </td>
                              <td className="dm-tbl-num" style={{ color: gColor }}>
                                {growth == null ? '—' : `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`}
                              </td> */}
                            </tr>
                          );
                        })
                        : <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--tx3)', padding: '16px', fontSize: '11px' }}>No data available</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
                <div className="dm-pag">
                  <span className="dm-pag-info">↑{Math.min(sgsTablePage * SGS_PAGE_SIZE, stateSorted.length)} of {stateSorted.length}</span>
                  <div className="dm-pag-btns">
                    <button className="dm-pag-btn" disabled={sgsTablePage <= 1} onClick={() => setSgsTablePage(p => p - 1)}>← Prev</button>
                    {Array.from({ length: sgsTotalPages }, (_, i) => (
                      <button key={i} className={`dm-pag-btn${sgsTablePage === i + 1 ? ' on' : ''}`} onClick={() => setSgsTablePage(i + 1)}>{i + 1}</button>
                    ))}
                    <button className="dm-pag-btn" disabled={sgsTablePage >= sgsTotalPages} onClick={() => setSgsTablePage(p => p + 1)}>Next →</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Printed Coupon Stack + Archive Weighted Coupon Trend */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Printed Coupon Stack in the Annual SGS Archive</span>
                  </div>
                  <span className="dm-card-sub">Coupon/rate parsed from security names; this is not a traded market yield</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(couponStackRef.current, 'Printed Coupon Stack in the Annual SGS Archive')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={couponStackRef} className="dm-chart" />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Archive Weighted Coupon Trend</span>
                  </div>
                  <span className="dm-card-sub">Outstanding-weighted printed coupon from parsed annual security rows</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(couponTrendRef.current, 'Archive Weighted Coupon Trend')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={couponTrendRef} className="dm-chart" />
              </div>
            </div>

            {/* Row 4: Maturity-Year Wall (SDL) + Instrument Family (blank) */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Maturity-Year Wall</span>
                  </div>
                  <span className="dm-card-sub">SDL outstanding by residual maturity bucket</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sdlMaturRef.current, 'Maturity-Year Wall')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={sdlMaturRef} className="dm-chart" />
              </div>

              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Instrument Family Composition</span>
                  </div>
                  <span className="dm-card-sub">Parsed from security nomenclature in the latest annual RBI archive</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sgsInstrCompRef.current, 'Instrument Family Composition')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={sgsInstrCompRef} className="dm-chart" />
              </div>
            </div>

            

            {/* Row 6: Top SDL Borrowers — full width */}
            <div className="dm-card">
              <div className="dm-card-hdr">
                <div className="dm-card-hdr-left">
                  <span className="dm-card-title">Top SDL Auction Borrowers</span>
                </div>
                <span className="dm-card-sub">2025 auction-year state ranking</span>
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sdlBorrowRef.current, 'Top SDL Auction Borrowers')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              <div ref={sdlBorrowRef} className="dm-chart" />
            </div>

            {/* Row 7: India SGS Borrowing Map */}
            <div className="dm-card">
              <div className="dm-card-hdr">
                <div className="dm-card-hdr-left">
                  <span className="dm-card-title">India SGS Borrowing Map</span>
                  <span className="dm-badge dm-badge-range" style={{width: '6%'}}>{sgsSnapDate}</span>
                </div>
                <span className="dm-card-sub">Interactive India choropleth of state debt concentration using the latest RBI state snapshot</span>
              </div>

              <div className="dm-sgs-map-wrap">
                {/* ── LEFT: choropleth panel ── */}
                <div className="dm-sgs-map-left">
                  <div className="dm-sgs-choro-hdr">
                    <div className="dm-sgs-choro-meta">
                      <span className="dm-sgs-choro-title">⊙ India SGS Choropleth</span>
                      <span className="dm-sgs-choro-desc">Real India state boundaries with RBI state borrowing overlaid as a choropleth. Use it to read market concentration, not fiscal stress.</span>
                    </div>
                    
                  </div>
                  <div className="dm-sgs-map-info">
                    <span className="dm-sgs-map-date">⊙ Snapshot date {sgsSnapDate}</span>
                    
                  </div>
                  <div className="dm-sgs-map-canvas">
                    <IndiaMap showRankings={false} isDark={isDark} />
                  </div>
                  <div className="dm-sgs-legend-bar-wrap">
                    <div className="dm-sgs-legend-row">
                      <span>LOWER</span>
                      <div className="dm-sgs-legend-gradient" />
                      <span>OUTSTANDING</span>
                      <div className="dm-sgs-legend-gradient-hot" />
                      <span>HIGHER</span>
                    </div>
                    <div className="dm-sgs-legend-notes">
                      <span>{stateSorted.length} states/UTs with RBI borrowing data</span>
                      <span>Dark slate = no current SGS row</span>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: National Snapshot panel ── */}
                <div className="dm-sgs-snap-panel">
                  <div className="dm-sgs-snap-hdr">
                    <span className="dm-sgs-snap-label">NATIONAL SNAPSHOT</span>
                    <button className="dm-sgs-nat-btn">National view</button>
                  </div>
                  <div className="dm-sgs-snap-country">India</div>
                  <div className="dm-sgs-snap-sub">{stateSorted.length} reporting states and UTs in the current RBI snapshot</div>

                  <div className="dm-sgs-snap-kpi-grid">
                    <div className="dm-sgs-snap-kpi">
                      <span className="dm-sgs-snap-klbl">OUTSTANDING</span>
                      <span className="dm-sgs-snap-kval">{sgsOsKpi?.value ?? '—'}</span>
                    </div>
                    <div className="dm-sgs-snap-kpi">
                      <span className="dm-sgs-snap-klbl">STATES / UTS</span>
                      <span className="dm-sgs-snap-kval">{stateSorted.length || '—'}</span>
                    </div>
                    <div className="dm-sgs-snap-kpi">
                      <span className="dm-sgs-snap-klbl">AVG STATE BOOK</span>
                      <span className="dm-sgs-snap-kval">{sgsAvgBook}</span>
                    </div>
                    <div className="dm-sgs-snap-kpi">
                      <span className="dm-sgs-snap-klbl">TOP 5 SHARE</span>
                      <span className="dm-sgs-snap-kval">{sgsTop5Share ? `${sgsTop5Share}%` : '—'}</span>
                    </div>
                  </div>

                  {top5Programs.length > 0 && (
                    <div className="dm-sgs-snap-desc">
                      {top5Programs[0].name} is the single largest state borrowing program at {top5Programs[0].share}% of national SGS stock, while {regions.sort((a, b) => b.value - a.value)[0]?.name} anchors the market with {regions.sort((a, b) => b.value - a.value)[0]?.share}% of aggregate outstanding.
                    </div>
                  )}

                  <div className="dm-sgs-regions">
                    <div className="dm-sgs-regions-title">🏛 Regional Debt Blocs</div>
                    {regions.map(r => (
                      <div key={r.name} className="dm-sgs-region-row">
                        <span className="dm-sgs-region-name">{r.name}</span>
                        <div className="dm-sgs-region-track">
                          <div className="dm-sgs-region-fill" style={{ width: `${(r.value / maxRegionVal * 100).toFixed(1)}%`, background: r.color }} />
                        </div>
                        <span className="dm-sgs-region-val">{fmtLCr(r.value)} · {r.share}%</span>
                      </div>
                    ))}
                  </div>

                  {top5Programs.length > 0 && (
                    <div className="dm-sgs-top-programs">
                      <div className="dm-sgs-regions-title">↗ Top Borrowing Programs</div>
                      {top5Programs.map(p => (
                        <div key={p.name} className="dm-sgs-prog-row">
                          <div className="dm-sgs-prog-left">
                            <span className="dm-sgs-prog-name">{p.name}</span>
                            <span className="dm-sgs-prog-region" style={{ color: p.color }}>{p.region} · {p.share}% of national SGS stock</span>
                          </div>
                          <div className="dm-sgs-prog-right">
                            <span className="dm-sgs-prog-val">{p.value}</span>
                            <span className="dm-sgs-prog-rank">#{p.rank}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="dm-sgs-reading-guide">
                    <div className="dm-sgs-regions-title">⚡ Reading Guide</div>
                    <p>Read this map as a market-structure view of outstanding state borrowing stock, not as a map of fiscal stress or development need.</p>
                    <p>The strongest use case is cross-state concentration: who dominates the SDL universe, which regions anchor the market, and how far each state sits above or below the average borrowing book.</p>
                    <p>The map uses the latest RBI current state snapshot for spatial concentration. Use the annual archive panels below for history, and the maturity panels for term-structure composition.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 8: State-wise SGS Outstanding + National SGS Maturity Profile */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">State-wise SGS Outstanding</span>
                  </div>
                  <span className="dm-card-sub">Top 15 states by current outstanding</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sgsStateBarRef.current, 'State-wise SGS Outstanding')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={sgsStateBarRef} style={{ width: '100%', height: 400 }} />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">National SGS Maturity Profile</span>
                  </div>
                  <span className="dm-card-sub">All States and UTs aggregate — SDL maturity buckets</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sgsMaturPctRef.current, 'National SGS Maturity Profile')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={sgsMaturPctRef} style={{ width: '100%', height: 400 }} />
              </div>
            </div>

            {/* Row 9: Current SGS Maturity Regime + Legacy SGS Maturity Regime */}
            {/* <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Current SGS Maturity Regime</span>
                  </div>
                  <span className="dm-card-sub">National aggregate shares under the 2022+ grouped bucket regime</span>
                </div>
                <div ref={sgsCurrRegRef} className="dm-chart" />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Legacy SGS Maturity Regime</span>
                  </div>
                  <span className="dm-card-sub">National aggregate shares under the pre-2022 bucket regime; not directly comparable to the current grouped buckets</span>
                </div>
                <div ref={sgsLegacyRegRef} className="dm-chart" />
              </div>
            </div> */}

            {/* Row 10: Maturity Regime Coverage + Latest State Maturity Mix */}
            {/* <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Maturity Regime Coverage</span>
                  </div>
                  <span className="dm-card-sub">What is genuinely comparable and what is not</span>
                </div>
                <div className="dm-regime-body">
                  <div className="dm-regime-panels">
                    <div className="dm-regime-panel">
                      <span className="dm-regime-panel-label">CURRENT GROUPED REGIME</span>
                      <span className="dm-regime-panel-num">4</span>
                      <span className="dm-regime-panel-desc">Annual panels from 2022-03-31 through 2025-03-31 using &lt;1Y / 1-5Y / 5-10Y / 10-20Y / 20Y+</span>
                    </div>
                    <div className="dm-regime-panel">
                      <span className="dm-regime-panel-label">LEGACY REGIME</span>
                      <span className="dm-regime-panel-num">5</span>
                      <span className="dm-regime-panel-desc">Annual panels for 2016-03-31, 2019-03-31, 2020-03-31, and 2021-03-31 using 0-1Y / 1-3Y / 3-5Y / 5-7Y / 7Y+</span>
                    </div>
                  </div>
                  <div className="dm-regime-alert">
                    The new maturity-profile table is analytically usable, but only within each bucket regime. The shift from <code className="dm-regime-code">0-1Y / 1-3Y / 3-5Y / 5-7Y / 7Y+</code> to <code className="dm-regime-code">&lt;1Y / 1-5Y / 5-10Y / 10-20Y / 20Y+</code> on 2022-03-31 is a real source-format break, not bad data.
                  </div>
                  <div className="dm-regime-section">
                    <div className="dm-regime-section-title">Remaining caveat</div>
                    <p className="dm-regime-section-text">`2017-03-31` and `2018-03-31` are still absent from the live maturity-profile history. The annual market-loan archive now fills long-run state stock history through `2025-03-31`, while the current ISIN-level RBI Statistics snapshot carries the latest current book.</p>
                  </div>
                  <div className="dm-regime-section">
                    <div className="dm-regime-section-title">Latest national read</div>
                    <p className="dm-regime-section-text">The latest national grouped profile is anchored in the belly of the curve: `5-10Y` is 32.9% of the all-India SDL stock, while the `20Y+` tail is 7.2%.</p>
                  </div>
                </div>
              </div>

              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Latest State Maturity Mix</span>
                  </div>
                  <span className="dm-card-sub">Current grouped regime on Mar 2025</span>
                </div>
                <div className="dm-tbl-wrap">
                  <div className="dm-tbl-hdr">
                    <span className="dm-tbl-sect">State shares by maturity bucket</span>
                    <button className="dm-contact-btn">⚿ Contact us for access</button>
                  </div>
                  <table className="dm-tbl">
                    <thead><tr>
                      <th>State ↕</th>
                      <th>Dominant Bucket ↕</th>
                      <th className="dm-tbl-num">&lt;1Y ↕</th>
                      <th className="dm-tbl-num">1-5Y ↕</th>
                      <th className="dm-tbl-num">5-10Y ↕</th>
                      <th className="dm-tbl-num">10-20Y ↕</th>
                      <th className="dm-tbl-num">20Y+ ↕</th>
                    </tr></thead>
                    <tbody>
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>No data available</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div> */}

            {/* Full-width: All State / UT Outstanding ranking */}
            <div className="dm-card">
              <div className="dm-card-hdr">
                <div className="dm-card-hdr-left">
                  <span className="dm-card-title">All State / UT Outstanding</span>
                </div>
                <span className="dm-card-sub">Latest RBI state snapshot: {sgsSnapDate}</span>
              </div>
              <div className="dm-tbl-wrap">
                <div className="dm-tbl-hdr">
                  <span className="dm-tbl-sect">Full state ranking</span>
                  {/* <button className="dm-contact-btn">⚿ Contact us for access</button> */}
                </div>
                <table className="dm-tbl dm-tbl-os-full">
                  <thead><tr>
                    <th>State / UT ↕</th>
                    <th className="dm-tbl-num">Outstanding ↕</th>
                    <th className="dm-tbl-num">Share</th>
                  </tr></thead>
                  <tbody>
                    {sgsOsRows.length
                      ? sgsOsRows.map((r, i) => {
                        const delta = r.historical_delta ?? null;
                        const growth = r.historical_growth_percent ?? null;
                        const dColor = !delta ? 'var(--tx3)' : delta > 0 ? '#22c55e' : '#ef4444';
                        const gColor = !growth ? 'var(--tx3)' : growth > 0 ? '#22c55e' : '#ef4444';
                        return (
                          <tr key={i}>
                            <td>{r.state ?? '—'}</td>
                            <td className="dm-tbl-num">{fmtLCr(r.total_outstanding ?? 0)}</td>
                            <td className="dm-tbl-num">{r.share_percent != null ? `${r.share_percent.toFixed(1)}%` : '—'}</td>
                            {/* <td className="dm-tbl-num" style={{ color: dColor }}>
                              {delta == null || delta === 0 ? '—' : `${delta > 0 ? '+' : '−'}${fmtLCr(Math.abs(delta))}`}
                            </td>
                            <td className="dm-tbl-num" style={{ color: gColor }}>
                              {growth == null ? '—' : `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`}
                            </td> */}
                          </tr>
                        );
                      })
                      : <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--tx3)', padding: '20px', fontSize: '11px' }}>No data available</td></tr>
                    }
                  </tbody>
                </table>
              </div>
              <div className="dm-pag">
                <span className="dm-pag-info">{(sgsOsPage - 1) * SGS_OS_PAGE_SIZE + 1}-{Math.min(sgsOsPage * SGS_OS_PAGE_SIZE, stateSorted.length)} of {stateSorted.length}</span>
                <div className="dm-pag-btns">
                  <button className="dm-pag-btn" disabled={sgsOsPage <= 1} onClick={() => setSgsOsPage(p => p - 1)}>← Prev</button>
                  {Array.from({ length: sgsOsTotalPages }, (_, i) => (
                    <button key={i} className={`dm-pag-btn${sgsOsPage === i + 1 ? ' on' : ''}`} onClick={() => setSgsOsPage(i + 1)}>{i + 1}</button>
                  ))}
                  <button className="dm-pag-btn" disabled={sgsOsPage >= sgsOsTotalPages} onClick={() => setSgsOsPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            </div>

          </div>
        </>}

        {/* ══════════════════════════════════════════════════════════════
            CORPORATE BONDS TAB
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'corpbonds' && <>
          <div className="dm-charts-wrap">

            {/* KPI strip */}
            <div className="dm-kpi-row">
              <div className="dm-kpi-card">
                <span className="dm-kpi-label">CORP BOND OUTSTANDING</span>
                {corpBondOsKpi
                  ? <><span className="dm-kpi-val">{corpBondOsKpi.value}</span><span className="dm-kpi-sub">{corpBondOsKpi.sub}</span></>
                  : <span className="kpi-skel" />}
              </div>
              <div className="dm-kpi-card">
                <span className="dm-kpi-label">LEAD ISSUER BUCKET</span>
                {leadIssuerKpi
                  ? <><span className="dm-kpi-val" style={{ fontSize: 14 }}>{leadIssuerKpi.name}</span><span className="dm-kpi-sub">{leadIssuerKpi.sub}</span></>
                  : <span className="kpi-skel" />}
              </div>
              <div className="dm-kpi-card">
                <span className="dm-kpi-label">CORP BOND TRADES</span>
                {corpTradesKpi
                  ? <><span className="dm-kpi-val">{corpTradesKpi.value}</span><span className="dm-kpi-sub">{corpTradesKpi.sub}</span></>
                  : <span className="kpi-skel" />}
              </div>
              <div className="dm-kpi-card">
                <span className="dm-kpi-label">TRADE COUNT</span>
                {tradeCountKpi
                  ? <><span className="dm-kpi-val">{tradeCountKpi.value}</span><span className="dm-kpi-sub">{tradeCountKpi.sub}</span></>
                  : <span className="kpi-skel" />}
              </div>
              <div className="dm-kpi-card">
                <span className="dm-kpi-label">NCD PUBLIC ISSUES</span>
                {ncdKpi
                  ? <><span className="dm-kpi-val">{ncdKpi.value}</span><span className="dm-kpi-sub">{ncdKpi.sub}</span></>
                  : <span className="kpi-skel" />}
              </div>
              <div className="dm-kpi-card">
                <span className="dm-kpi-label">PRIVATE PLACEMENTS</span>
                {privPlacKpi
                  ? <><span className="dm-kpi-val">{privPlacKpi.value}</span><span className="dm-kpi-sub">{privPlacKpi.sub}</span></>
                  : <span className="kpi-skel" />}
              </div>
            </div>

            {/* Row 1: Public Issues of NCDs + Private Placements */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Public Issues of NCDs</span>
                  </div>
                  <span className="dm-card-sub">Annual NCD IPO amount and issue count (SEBI)</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(ncdRef.current, 'Public Issues of NCDs')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={ncdRef} style={{ width: '100%', height: 340 }} />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Private Placements</span>
                  </div>
                  <span className="dm-card-sub">Annual private placement amount and issue count</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(privPlacRef.current, 'Private Placements')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={privPlacRef} style={{ width: '100%', height: 340 }} />
              </div>
            </div>

            {/* Row 2: Corp Bond Trading Volume + Corp Bond Outstanding Total */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Corporate Bond Trading Volume</span>
                  </div>
                  <span className="dm-card-sub">Monthly SEBI secondary market trade value and count</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(corpBondTradRef.current, 'Corporate Bond Trading Volume')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={corpBondTradRef} style={{ width: '100%', height: 340 }} />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Corporate Bond Outstanding Total</span>
                  </div>
                  <span className="dm-card-sub">Monthly total outstanding across all issuer categories · SEBI</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(corpBondOsRef.current, 'Corporate Bond Outstanding Total')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={corpBondOsRef} style={{ width: '100%', height: 340 }} />
              </div>
            </div>

            {/* Row 3: Legacy Financial vs Non-Financial + Current Issuer Categories */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Legacy Financial vs Non-Financial</span>
                  </div>
                  <span className="dm-card-sub">Quarterly SEBI issuer split through 2024-03-31 using the preserved legacy regime</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(corpLegacyIssuerRef.current, 'Legacy Financial vs Non-Financial')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={corpLegacyIssuerRef} style={{ width: '100%', height: 340 }} />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Current Issuer Categories</span>
                  </div>
                  <span className="dm-card-sub">Monthly issuer-category mix from 2024-04-01 onward under the post-break regime</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(corpCurrentIssuerRef.current, 'Current Issuer Categories')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={corpCurrentIssuerRef} style={{ width: '100%', height: 340 }} />
              </div>
            </div>

            {/* Row 4: Rating Activity + Current Rating Coverage */}
            {/* <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Rating Activity</span>
                  </div>
                  <span className="dm-card-sub">Monthly rating events derived from NSE EBP disclosures</span>
                </div>
                <div ref={corpRatingActivityRef} style={{ width: '100%', height: 340 }} />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Current Rating Coverage</span>
                  </div>
                  <span className="dm-card-sub">Number of active rating rows by agency</span>
                </div>
                <div ref={corpRatingCoverageRef} style={{ width: '100%', height: 340 }} />
              </div>
            </div> */}

            {/* Row 5: NSE Debt Security Master Status + Security Master Coverage Table */}
            {/* {(() => {
              const NSE_SM_PAGE = 10;
              const smSorted = nseSecMasterData
                ? [...nseSecMasterData].sort((a, b) => (+(b.row_count ?? b.rows ?? b.count ?? 0)) - (+(a.row_count ?? a.rows ?? a.count ?? 0)))
                : [];
              const smTotalPages = Math.max(1, Math.ceil(smSorted.length / NSE_SM_PAGE));
              const smRows = smSorted.slice((nseSecMasterPage - 1) * NSE_SM_PAGE, nseSecMasterPage * NSE_SM_PAGE);
              const STATUS_TAG_COLOR = { Listed: '#10b981', Matured: '#6b7280', Permitted: '#f59e0b' };
              const fmtRows = v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v);
              return (
                <div className="dm-chart-row">
                  <div className="dm-card">
                    <div className="dm-card-hdr">
                      <div className="dm-card-hdr-left">
                        <span className="dm-card-title">NSE Debt Security Master Status</span>
                      </div>
                      <span className="dm-card-sub">Canonical security-master coverage by security type and listing status</span>
                    </div>
                    <div ref={nseSecMasterRef} style={{ width: '100%', height: 420 }} />
                  </div>
                  <div className="dm-card">
                    <div className="dm-card-hdr">
                      <div className="dm-card-hdr-left">
                        <span className="dm-card-title">Security Master Coverage Table</span>
                      </div>
                      <span className="dm-card-sub">Reference-data layer used for listed, permitted, and matured debt instruments</span>
                    </div>
                    <div className="dm-tbl-wrap">
                      <div className="dm-tbl-hdr">
                        <span className="dm-tbl-sect">NSE security master status</span>
                        <button className="dm-contact-btn">⚿ Contact us for access</button>
                      </div>
                      <table className="dm-tbl">
                        <thead><tr>
                          <th>Type ↕</th>
                          <th>Status ↕</th>
                          <th className="dm-tbl-num">Rows ↕</th>
                          <th className="dm-tbl-num">With Maturity ↕</th>
                          <th className="dm-tbl-num">Last Maturity ↕</th>
                        </tr></thead>
                        <tbody>
                          {smRows.length
                            ? smRows.map((r, i) => {
                              const status = r.status ?? '';
                              const tagCol = STATUS_TAG_COLOR[status] ?? 'var(--tx3)';
                              const rows   = +(r.row_count ?? r.rows ?? r.count ?? 0);
                              const wm     = +(r.with_maturity ?? r.maturity_count ?? 0);
                              return (
                                <tr key={i}>
                                  <td style={{ fontWeight: 600 }}>{r.type ?? r.security_type ?? '—'}</td>
                                  <td><span style={{ color: tagCol, fontWeight: 500 }}>{status || '—'}</span></td>
                                  <td className="dm-tbl-num">{fmtRows(rows)}</td>
                                  <td className="dm-tbl-num">{fmtRows(wm)}</td>
                                  <td className="dm-tbl-num">{r.last_maturity ?? r.last_maturity_date ?? '—'}</td>
                                </tr>
                              );
                            })
                            : <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--tx3)', padding: '20px', fontSize: '11px' }}>No data available</td></tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    {smSorted.length > NSE_SM_PAGE && (
                      <div className="dm-pag">
                        <span className="dm-pag-info">{(nseSecMasterPage - 1) * NSE_SM_PAGE + 1}–{Math.min(nseSecMasterPage * NSE_SM_PAGE, smSorted.length)} of {smSorted.length}</span>
                        <div className="dm-pag-btns">
                          <button className="dm-pag-btn" disabled={nseSecMasterPage <= 1} onClick={() => setNseSecMasterPage(p => p - 1)}>← Prev</button>
                          {Array.from({ length: Math.min(smTotalPages, 9) }, (_, i) => (
                            <button key={i} className={`dm-pag-btn${nseSecMasterPage === i + 1 ? ' on' : ''}`} onClick={() => setNseSecMasterPage(i + 1)}>{i + 1}</button>
                          ))}
                          {smTotalPages > 9 && nseSecMasterPage < smTotalPages && <span style={{ color: 'var(--tx3)', fontSize: 11 }}>…</span>}
                          <button className="dm-pag-btn" disabled={nseSecMasterPage >= smTotalPages} onClick={() => setNseSecMasterPage(p => p + 1)}>Next →</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()} */}

            {/* Row 6: Issuance Summary table + Latest Issuer Composition chart */}
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Issuance Summary</span>
                  </div>
                  <span className="dm-card-sub">Financial-year NCD and private-placement breakdown</span>
                </div>
                <div className="dm-tbl-wrap">
                  <div className="dm-tbl-hdr">
                    <span className="dm-tbl-sect">FY summary</span>
                    {/* <button className="dm-contact-btn">⚿ Contact us for access</button> */}
                  </div>
                  <table className="dm-tbl">
                    <thead><tr>
                      <th>FY ↕</th>
                      <th className="dm-tbl-num">NCD Issues ↕</th>
                      <th className="dm-tbl-num">NCD Amount ↕</th>
                      <th className="dm-tbl-num">PP Issues ↕</th>
                      <th className="dm-tbl-num">PP Amount ↕</th>
                      <th className="dm-tbl-num">Total ↕</th>
                    </tr></thead>
                    <tbody>
                      {issuanceSummary.length
                        ? issuanceSummary.map((r, i) => {
                          const fmtAmt = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L Cr` : v >= 1000 ? `₹${(v/1000).toFixed(1)}K Cr` : `₹${v} Cr`;
                          const fmtCnt = v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v || '—');
                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{r.fy}</td>
                              <td className="dm-tbl-num">{fmtCnt(r.ncdCount)}</td>
                              <td className="dm-tbl-num">{r.ncdAmount ? fmtAmt(r.ncdAmount) : '—'}</td>
                              <td className="dm-tbl-num">{fmtCnt(r.ppCount)}</td>
                              <td className="dm-tbl-num">{r.ppAmount ? fmtAmt(r.ppAmount) : '—'}</td>
                              <td className="dm-tbl-num" style={{ fontWeight: 600 }}>{r.total ? fmtAmt(r.total) : '—'}</td>
                            </tr>
                          );
                        })
                        : <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--tx3)', padding: '20px', fontSize: '11px' }}>No data available</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Latest Issuer Composition chart */}
              <div className="dm-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">Latest Issuer Composition</span>
                  </div>
                  <span className="dm-card-sub">{issuerCompSnap}</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(corpIssuerCompRef.current, 'Latest Issuer Composition')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={corpIssuerCompRef} style={{ width: '100%', flex: 1, minHeight: 0 }} />
              </div>
            </div>

          </div>
        </>}

        {/* ══ SGB TAB ══ */}
        {activeTab === 'sgb' && <>
          <div className="dm-kpi-row">
            {[
              { label: 'SGB OUTSTANDING', value: sgbOsKpi?.value ?? '—', sub: sgbSnap, icon: '🥇', color: 'var(--orange)' },
              { label: 'ACTIVE TRANCHES', value: sgbActiveTranches > 0 ? String(sgbActiveTranches) : '—', sub: 'Live SGB lines', icon: '📋', color: 'var(--teal)' },
              { label: 'OUTSTANDING UNITS', value: sgbCrUnits, sub: 'grams outstanding', icon: '⚡', color: 'var(--amber)' },
              { label: 'AVG MATURITY', value: sgbAvgMaturity ? `${sgbAvgMaturity} yr` : '—', sub: 'Weighted by outstanding units', icon: '📈', color: 'var(--green)' },
              { label: 'LARGEST TRANCHE', value: sgbLargestRow?.period ?? '—', sub: sgbLargestRow ? `${((+(sgbLargestRow.value ?? 0)) / 1e6).toFixed(1)} t` : '', icon: '🏆', color: 'var(--purple)' },
              { label: 'LATEST SNAPSHOT', value: sgbSnap ? sgbSnap.replace('as of ', '') : '—', sub: 'RBI refresh date', icon: '📅', color: 'var(--blue)' },
            ].map(k => (
              <div key={k.label} className="dm-kpi-card">
                <div className="dm-kpi-top">
                  <span className="dm-kpi-label">{k.label}</span>
                  <span className="dm-kpi-icon" style={{ color: k.color }}>{k.icon}</span>
                </div>
                {k.value === '—' ? <span className="kpi-skel" /> : <span className="dm-kpi-val">{k.value}</span>}
                <span className="dm-kpi-sub">{k.value === '—' ? '' : k.sub}</span>
              </div>
            ))}
          </div>

          <div className="dm-charts-wrap">
            <div className="dm-chart-row">
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">SGB Outstanding by Issue Vintage</span>
                  </div>
                  <span className="dm-card-sub">Current official outstanding units grouped by issue financial year</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sgbVintageRef.current, 'SGB Outstanding by Issue Vintage')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={sgbVintageRef} className="dm-chart" />
              </div>
              <div className="dm-card">
                <div className="dm-card-hdr">
                  <div className="dm-card-hdr-left">
                    <span className="dm-card-title">SGB Redemption Ladder</span>
                  </div>
                  <span className="dm-card-sub">Current official outstanding units grouped by maturity financial year</span>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(sgbLadderRef.current, 'SGB Redemption Ladder')}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                <div ref={sgbLadderRef} className="dm-chart" />
              </div>
            </div>

            {/* Largest SGB Tranches table */}
            {(() => {
              const SGB_PAGE = 12;
              const total   = sgbTrancheData?.length ?? 0;
              const pages   = Math.max(1, Math.ceil(total / SGB_PAGE));
              const rows    = (sgbTrancheData ?? []).slice((sgbTranchePage - 1) * SGB_PAGE, sgbTranchePage * SGB_PAGE);
              const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const fmtDate = d => {
                if (!d) return '—';
                const dt = new Date(d);
                if (isNaN(dt)) return d;
                return `${MN[dt.getMonth()]} ${dt.getFullYear()}`;
              };
              const fmtT = g => g >= 1e6 ? `${(g/1e6).toFixed(2)} t` : g >= 1000 ? `${(g/1000).toFixed(2)} kg` : `${Math.round(g)} g`;
              const snapLabel = (() => {
                if (sgbSnapshotDate) { const dt = new Date(sgbSnapshotDate); return isNaN(dt) ? sgbSnapshotDate : `${MN[dt.getMonth()]} ${dt.getFullYear()}`; }
                return sgbSnap.replace('as of ', '');
              })();
              return (
                <div className="dm-card" style={{ marginTop: 14 }}>
                  <div className="dm-card-hdr" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <div className="dm-card-hdr-left" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span className="dm-card-title">Largest SGB Tranches</span>
                      <span className="dm-card-sub" style={{ marginTop: 2 }}>Latest RBI snapshot: {snapLabel}</span>
                    </div>
                  </div>
                  <div className="dm-tbl-wrap">
                    <div className="dm-tbl-hdr">
                      <span className="dm-tbl-sect">Current official outstanding units by tranche</span>
                      {/* <button className="dm-contact-btn">⚿ Contact us for access</button> */}
                    </div>
                    <table className="dm-tbl">
                      <thead><tr>
                        <th>Tranche ↕</th>
                        <th>Issue ↕</th>
                        <th className="dm-tbl-num">Issue Price ↕</th>
                        <th className="dm-tbl-num">Outstanding Units ↕</th>
                      </tr></thead>
                      <tbody>
                        {rows.length
                          ? rows.map((r, i) => {
                            const name     = r.dimension_name ?? r.dimension_label ?? r.tranche_name ?? r.name ?? r.label ?? '—';
                            const issueD   = r.issue_date ?? r.start_date ?? r.date ?? '';
                            const price    = r.issue_price ?? r.price ?? r.issue_price_inr ?? null;
                            const grams    = +(r.metric_value ?? r.value ?? r.outstanding_units ?? 0);
                            return (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{name}</td>
                                <td>{fmtDate(issueD)}</td>
                                <td className="dm-tbl-num">{price != null ? `₹${Number(price).toLocaleString('en-IN')}` : '—'}</td>
                                <td className="dm-tbl-num" style={{ fontWeight: 600 }}>{fmtT(grams)}</td>
                              </tr>
                            );
                          })
                          : <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--tx3)', padding: '20px', fontSize: '11px' }}>No data available</td></tr>
                        }
                      </tbody>
                    </table>
                    {total > 0 && (
                      <div className="dm-pag">
                        <span className="dm-pag-info">{(sgbTranchePage - 1) * SGB_PAGE + 1}–{Math.min(sgbTranchePage * SGB_PAGE, total)} of {total}</span>
                        <div className="dm-pag-btns">
                          <button className="dm-pag-btn" disabled={sgbTranchePage === 1} onClick={() => setSgbTranchePage(p => p - 1)}>← Prev</button>
                          {Array.from({ length: Math.min(4, pages) }, (_, i) => i + 1).map(p => (
                            <button key={p} className={`dm-pag-btn${sgbTranchePage === p ? ' on' : ''}`} onClick={() => setSgbTranchePage(p)}>{p}</button>
                          ))}
                          <button className="dm-pag-btn" disabled={sgbTranchePage === pages} onClick={() => setSgbTranchePage(p => p + 1)}>Next →</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </>}

      </div>

      {/* ── Scoped styles ── */}
      <style>{`
        /* ── Scroll wrapper ── */
        .dm-scroll::-webkit-scrollbar { width: 6px; }
        .dm-scroll::-webkit-scrollbar-track { background: transparent; }
        .dm-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,.35); border-radius: 3px; }

        /* ── Top bar ── */
        .dm-topbar {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 16px 20px 10px; gap: 16px; flex-wrap: wrap;
          // border-bottom: 1px solid var(--bdr);
          flex-shrink: 0;
        }
        .dm-topbar-left { display: flex; flex-direction: column; gap: 4px; }
        .dm-title { font-size: 22px; font-weight: 800; color: var(--tx); letter-spacing: -.5px; line-height: 1; }
        .dm-sub   { font-size: 11.5px; color: var(--tx3); max-width: 600px; }
        .dm-topbar-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .dm-cur-view { font-size: 11px; color: var(--tx2); font-weight: 600; }
        .dm-cur-sub  { font-size: 10px; color: var(--tx3); }

        /* ── Filter row ── */
        .dm-filter-row {
          display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;
          padding: 8px 20px; border: 1px solid var(--bdr);
          margin-left: 20px;
          margin-right: 20px;
          margin-top: 20px;
          flex-shrink: 0;
        }
        .dm-filter-lbl { font-size: 11.5px; color: var(--tx3); }
        .dm-pill-grp {
          display: flex;
          //  background: var(--sf2);
           gap: 7px;
          // border: 1px solid var(--bdr2); 
          // border-radius: 8px;
           overflow: hidden;
        }
        .dm-pill {
          padding: 5px 11px; font-size: 11.5px; font-weight: 500;
          color: var(--tx3); background: none; border: none;
          border: 1px solid var(--bdr); cursor: pointer;
          transition: all .12s; font-family: var(--fn); user-select: none;
        }
        .dm-pill:last-child { border-right: none; }
        .dm-pill:hover { color: var(--tx); background: var(--sf3); }
        .dm-pill.on { background: var(--acc); color: #fff; font-weight: 600; }
        [data-theme="dark"] .dm-pill.on { background: var(--sf3); color: var(--tx); }
        .dm-sel {
          padding: 5px 22px 5px 9px; font-size: 11.5px;
          border: 1px solid var(--bdr2); border-radius: 7px;
          background: var(--sf2); color: var(--tx);
          font-family: var(--fn); outline: none; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239a9d92' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 7px center;
        }
        .dm-badge-filter {
          background: rgba(14,116,144,.1); color: var(--teal);
          border: 1px solid rgba(14,116,144,.25); flex-shrink: 0;
        }
        [data-theme="dark"] .dm-badge-filter {
          background: rgba(14,116,144,.15); color: var(--teal);
          border: 1px solid rgba(14,116,144,.35);
        }
        .dm-reset-btn {
          padding: 5px 11px; font-size: 11.5px; font-weight: 500;
          color: var(--tx3); background: var(--sf2);
          border: 1px solid var(--bdr2); border-radius: 7px;
          cursor: pointer; font-family: var(--fn);
          transition: all .12s; white-space: nowrap; flex-shrink: 0;
        }
        .dm-reset-btn:hover { color: var(--tx); background: var(--sf3); }

        /* ── Sub-tabs ── */
        .dm-tabs-outer {
          padding: 10px 20px; 
          // border-bottom: 1px solid var(--bdr); 
          flex-shrink: 0;
        }
        .dm-tabs {
          display: flex; gap: 10px;
          border: 1px solid var(--bdr); border-radius: 12px;
          padding: 12px; background: var(--sf2);
          overflow-x: auto;
        }
        .dm-tabs::-webkit-scrollbar { height: 0; }
        .dm-tab {
          display: flex; flex-direction: column; align-items: flex-start;
          padding: 10px 16px; min-width: 130px;
          border: 1px solid var(--bdr); border-radius: 8px;
          background: var(--sf); cursor: pointer;
          transition: all .12s; font-family: var(--fn);
        }
        .dm-tab:hover { background: var(--sf3); border-color: var(--bdr2); }
        .dm-tab.on { background: var(--acc); border-color: var(--acc); }
        .dm-tab.on .dm-tab-label { color: #fff; }
        .dm-tab.on .dm-tab-sub { color: rgba(255,255,255,.65); }
        [data-theme="dark"] .dm-tab.on { background: var(--sf3); border-color: var(--teal); }
        [data-theme="dark"] .dm-tab.on .dm-tab-label { color: var(--teal); }
        [data-theme="dark"] .dm-tab.on .dm-tab-sub { color: var(--tx3); }
        .dm-tab-label {
          font-size: 12.5px; font-weight: 600; color: var(--tx2); transition: color .12s;
        }
        .dm-tab-sub { font-size: 10px; color: var(--tx3); margin-top: 2px; white-space: nowrap; }

        /* ── KPI cards ── */
        .dm-kpi-row {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px; padding: 14px 20px; flex-shrink: 0;
          // border-bottom: 1px solid var(--bdr);
        }
        .dm-kpi-card {
          background: var(--sf); border: 1px solid var(--bdr);
          border-radius: 12px; padding: 12px 14px 11px;
          box-shadow: var(--shxs); display: flex; flex-direction: column; gap: 3px;
          position: relative; overflow: hidden;
          transition: box-shadow .13s, transform .13s;
        }
        .dm-kpi-card:hover { box-shadow: var(--shmd); transform: translateY(-1px); }
        .dm-kpi-accent {
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px; border-radius: 12px 12px 0 0;
        }
        .dm-kpi-top {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 4px; margin-top: 4px;
        }
        .dm-kpi-label {
          font-size: 9px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .09em; color: var(--tx3);
        }
        .dm-kpi-icon {
          font-size: 15px; line-height: 1; flex-shrink: 0; opacity: .85;
        }
        .dm-kpi-val {
          font-size: 18px; font-weight: 800; font-family: var(--mo);
          color: var(--tx); letter-spacing: -.4px; line-height: 1.2;
        }
        .dm-kpi-sub { font-size: 10px; color: var(--tx3); }

        /* ── Charts area ── */
        .dm-charts-wrap {
          display: flex; flex-direction: column;
          gap: 14px; padding: 14px 20px 40px; flex-shrink: 0;
        }
        .dm-chart-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
        }
        .dm-card {
          background: var(--sf); border: 1px solid var(--bdr);
          border-radius: 14px; overflow: hidden; box-shadow: var(--shxs);
        }
        .dm-card-hdr {
          padding: 12px 16px 10px; 
          // border-bottom: 1px solid var(--bdr);
          display: flex;justify-content: space-between;
          gap: 6px; flex-wrap: wrap; flex-direction: column;
        }
        .dm-card-hdr-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .dm-card-title { font-size: 13px; font-weight: 700; color: var(--tx); white-space: nowrap; flex-shrink: 0; }
        .dm-card-sub {
          font-size: 10.5px; color: var(--tx3);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1;
          display:row;
        }
        .dm-badge {
          display: flex;font-size: 10px; font-family: var(--mo);
          font-weight: 700; padding: 2px 7px; border-radius: 5px;
          letter-spacing: .03em; flex-shrink: 0;
        }
        .dm-badge-range {
          background: var(--teal-s); color: var(--teal);
          border: 1px solid rgba(14,116,144,.2);width: 13%;
        }
        [data-theme="dark"] .dm-badge-range {
          background: rgba(14,116,144,.15); color: var(--teal);
        }
        .dm-chart { width: 100%; height: 280px; display: block; }

        /* ── G-Secs: 60/40 row ── */
        .dm-row-6040 { grid-template-columns: 1.7fr 1fr; }

        /* ── G-Secs: CCIL ZCYC card internals ── */
        .dm-zcyc-kpis {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; padding: 10px 14px;
          border-bottom: 1px solid var(--bdr);
        }
        .dm-zcyc-kpi {
          background: var(--sf2); border: 1px solid var(--bdr);
          border-radius: 10px; padding: 10px 12px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .dm-zcyc-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--tx3); }
        .dm-zcyc-val { font-size: 22px; font-weight: 800; color: var(--tx); font-family: var(--mo); letter-spacing: -.5px; }
        .dm-zcyc-sub { font-size: 10px; color: var(--tx3); }
        .dm-chart-zcyc { height: 180px; }

        /* ── G-Secs: Tables ── */
        .dm-tbl-wrap { overflow-x: auto; }
        .dm-tbl-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px; border-bottom: 1px solid var(--bdr);
        }
        .dm-tbl-sect { font-size: 11px; font-weight: 600; color: var(--tx2); }
        .dm-badge-lock {
          background: var(--sf3); color: var(--tx3);
          border: 1px solid var(--bdr2); font-size: 9.5px; font-weight: 500;
          padding: 2px 7px; border-radius: 5px; white-space: nowrap;
        }
        .dm-tbl {
          width: 100%; border-collapse: collapse; font-size: 11.5px;
        }
        .dm-tbl thead tr { border-bottom: 1px solid var(--bdr); }
        .dm-tbl th {
          padding: 7px 14px; font-size: 10.5px; font-weight: 600;
          color: var(--tx3); text-align: left; white-space: nowrap;
        }
        .dm-tbl td {
          padding: 6px 14px; color: var(--tx2); border-bottom: 1px solid var(--bdr);
          white-space: nowrap;
        }
        .dm-tbl tbody tr:last-child td { border-bottom: none; }
        .dm-tbl tbody tr:hover td { background: var(--sf2); }
        .dm-tbl-num { text-align: right; font-family: var(--mo); font-weight: 600; color: var(--tx); }
        .dm-tbl th.dm-tbl-num { text-align: right; }
        .dm-tbl-mono { font-family: var(--mo); font-size: 10.5px; }

        /* ── SGS: 65/35 layout ── */
        .dm-row-6535 { grid-template-columns: 1.85fr 1fr; }

        /* ── SGS: Archive Integrity card ── */
        .dm-integrity-card { display: flex; flex-direction: column; }
        .dm-integrity-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .dm-integrity-kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .dm-integrity-kpi { background: var(--sf2); border: 1px solid var(--bdr); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
        .dm-integrity-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--tx3); }
        .dm-integrity-val { font-size: 20px; font-weight: 800; color: var(--tx); font-family: var(--mo); letter-spacing: -.4px; }
        .dm-integrity-sub { font-size: 10px; color: var(--tx3); }
        .dm-integrity-note { font-size: 10.5px; color: var(--tx3); line-height: 1.6; border-top: 1px solid var(--bdr); padding-top: 10px; margin: 0; }

        /* ── SGS: Maturity Regime Coverage card ── */
        .dm-regime-body { display: flex; flex-direction: column; gap: 12px; padding: 0 16px 16px; }
        .dm-regime-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .dm-regime-panel {
          display: flex; flex-direction: column; gap: 5px;
          background: var(--sf2); border: 1px solid var(--bdr2); border-radius: 10px;
          padding: 12px 14px;
        }
        .dm-regime-panel-label {
          font-size: 9px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .08em; color: var(--tx3);
        }
        .dm-regime-panel-num {
          font-size: 36px; font-weight: 800; color: var(--tx);
          font-family: var(--mo); letter-spacing: -.5px; line-height: 1;
        }
        .dm-regime-panel-desc { font-size: 10.5px; color: var(--tx3); line-height: 1.5; }
        .dm-regime-alert {
          background: rgba(6,182,212,.07); border: 1px solid rgba(6,182,212,.28);
          border-radius: 8px; padding: 12px 14px;
          font-size: 11px; color: var(--tx2); line-height: 1.6;
        }
        [data-theme="dark"] .dm-regime-alert { background: rgba(6,182,212,.10); }
        .dm-regime-code {
          background: rgba(6,182,212,.12); color: #06b6d4;
          border-radius: 3px; padding: 1px 5px; font-size: 10.5px;
          font-family: var(--mo);
        }
        .dm-regime-section { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--bdr); padding-top: 12px; }
        .dm-regime-section-title { font-size: 12px; font-weight: 700; color: var(--tx2); }
        .dm-regime-section-text { font-size: 10.5px; color: var(--tx3); line-height: 1.6; margin: 0; }

        /* ── SGS: dominant bucket badge ── */
        .dm-mat-dom {
          display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 600;
          background: rgba(163,163,163,.12); color: var(--tx2);
        }
        .dm-mat-dom-1Y  { background: rgba(125,211,252,.15); color: #7dd3fc; }
        .dm-mat-dom-15Y { background: rgba(34,197,94,.15);  color: #22c55e; }
        .dm-mat-dom-510Y{ background: rgba(99,102,241,.15); color: #818cf8; }
        .dm-mat-dom-1020Y{background: rgba(167,139,250,.15);color: #a78bfa; }
        .dm-mat-dom-20Y { background: rgba(245,158,11,.15); color: #f59e0b; }

        /* ── All State / UT Outstanding table ── */
        .dm-tbl-os-full { width: 100%; table-layout: fixed; }
        .dm-tbl-os-full th:first-child,
        .dm-tbl-os-full td:first-child { width: 60%; }
        .dm-tbl-os-full th:nth-child(2),
        .dm-tbl-os-full td:nth-child(2) { width: 25%; }
        .dm-tbl-os-full th:last-child,
        .dm-tbl-os-full td:last-child { width: 15%; color: var(--tx2); font-weight: 600; }

        /* ── SGS: Contact button ── */
        .dm-contact-btn {
          padding: 4px 10px; font-size: 10.5px; font-weight: 500;
          color: var(--tx3); background: var(--sf2);
          border: 1px solid var(--bdr2); border-radius: 6px;
          cursor: pointer; font-family: var(--fn); white-space: nowrap; flex-shrink: 0;
          transition: all .12s;
        }
        .dm-contact-btn:hover { color: var(--tx); background: var(--sf3); }

        /* ── SGS: Ranking table pagination ── */
        .dm-pag {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px; border-top: 1px solid var(--bdr);
          gap: 8px;
        }
        .dm-pag-info { font-size: 10.5px; color: var(--tx3); }
        .dm-pag-btns { display: flex; gap: 4px; align-items: center; }
        .dm-pag-btn {
          padding: 3px 9px; font-size: 10.5px; font-weight: 500;
          color: var(--tx3); background: var(--sf2);
          border: 1px solid var(--bdr2); border-radius: 5px;
          cursor: pointer; font-family: var(--fn); transition: all .12s;
        }
        .dm-pag-btn:hover:not(:disabled) { color: var(--tx); background: var(--sf3); }
        .dm-pag-btn:disabled { opacity: .35; cursor: default; }
        .dm-pag-btn.on { background: var(--acc); color: #fff; border-color: var(--acc); font-weight: 600; }
        [data-theme="dark"] .dm-pag-btn.on { background: var(--sf3); color: var(--teal); border-color: var(--teal); }

        /* ── SGS Borrowing Map ── */
        .dm-sgs-map-wrap {
          display: grid; grid-template-columns: 1.8fr 1fr;
        }
        .dm-sgs-map-left {
          display: flex; flex-direction: column;
          border-right: 1px solid var(--bdr);
        }
        .dm-sgs-choro-hdr {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 12px 16px; gap: 12px; flex-wrap: wrap;
          border-bottom: 1px solid var(--bdr);
        }
        .dm-sgs-choro-meta { display: flex; flex-direction: column; gap: 3px; }
        .dm-sgs-choro-title { font-size: 12px; font-weight: 700; color: var(--tx); }
        .dm-sgs-choro-desc { font-size: 10.5px; color: var(--tx3); max-width: 340px; line-height: 1.4; }
        .dm-sgs-toggles { display: flex; gap: 6px; flex-wrap: wrap; }
        .dm-sgs-tog {
          display: flex; flex-direction: column; align-items: flex-start;
          padding: 6px 12px; border: 1px solid var(--bdr2); border-radius: 20px;
          background: var(--sf2); cursor: pointer; font-family: var(--fn);
          transition: all .12s;
        }
        .dm-sgs-tog span { font-size: 11px; font-weight: 600; color: var(--tx2); }
        .dm-sgs-tog small { font-size: 9px; color: var(--tx3); margin-top: 1px; }
        .dm-sgs-tog.on { background: var(--teal-s); border-color: var(--teal); }
        .dm-sgs-tog.on span { color: var(--teal); }
        .dm-sgs-map-info {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 16px; font-size: 10.5px; color: var(--tx3);
          border-bottom: 1px solid var(--bdr);
        }
        .dm-sgs-map-date { font-weight: 500; color: var(--tx2); }
        .dm-sgs-map-hints { display: flex; gap: 16px; }
        .dm-sgs-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
        .dm-sgs-map-canvas { flex: 1; min-height: 500px; position: relative; }
        .dm-sgs-map-canvas > * { height: 100% !important; }
        .dm-sgs-legend-bar-wrap { padding: 10px 16px; border-top: 1px solid var(--bdr); }
        .dm-sgs-legend-row { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; color: var(--tx3); letter-spacing: .05em; }
        .dm-sgs-legend-gradient { flex: 1; height: 8px; border-radius: 4px; background: linear-gradient(to right, #cce0f0, #3d87be); }
        .dm-sgs-legend-gradient-hot { width: 60px; height: 8px; border-radius: 4px; background: linear-gradient(to right, #3d87be, #e07b39); }
        .dm-sgs-legend-notes { display: flex; justify-content: space-between; font-size: 9.5px; color: var(--tx3); margin-top: 5px; }

        /* ── SGS Snapshot Panel (right) ── */
        .dm-sgs-snap-panel {
          display: flex; flex-direction: column; gap: 0;
          padding: 0; overflow-y: auto; max-height: 720px;
        }
        .dm-sgs-snap-panel::-webkit-scrollbar { width: 4px; }
        .dm-sgs-snap-panel::-webkit-scrollbar-thumb { background: rgba(128,128,128,.3); border-radius: 2px; }
        .dm-sgs-snap-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px 4px; gap: 8px;
        }
        .dm-sgs-snap-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--teal); }
        .dm-sgs-nat-btn {
          padding: 4px 10px; font-size: 10px; font-weight: 600;
          color: var(--teal); background: var(--teal-s);
          border: 1px solid var(--teal); border-radius: 14px;
          cursor: pointer; font-family: var(--fn);
        }
        .dm-sgs-snap-country { font-size: 26px; font-weight: 900; color: var(--tx); letter-spacing: -.5px; padding: 2px 16px 0; }
        .dm-sgs-snap-sub { font-size: 10.5px; color: var(--tx3); padding: 2px 16px 10px; }
        .dm-sgs-snap-kpi-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1px;
          border-top: 1px solid var(--bdr); border-bottom: 1px solid var(--bdr);
          background: var(--bdr); margin: 0 0 12px;
        }
        .dm-sgs-snap-kpi { background: var(--sf); padding: 10px 14px; display: flex; flex-direction: column; gap: 3px; }
        .dm-sgs-snap-klbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--tx3); }
        .dm-sgs-snap-kval { font-size: 18px; font-weight: 800; color: var(--tx); font-family: var(--mo); letter-spacing: -.4px; }
        .dm-sgs-snap-desc { font-size: 10.5px; color: var(--tx2); line-height: 1.5; background: var(--sf2); border: 1px solid var(--bdr); border-radius: 8px; padding: 10px 12px; margin: 0 12px 12px; }
        .dm-sgs-regions { padding: 0 14px 12px; }
        .dm-sgs-top-programs { padding: 0 14px 12px; }
        .dm-sgs-reading-guide { padding: 0 14px 14px; }
        .dm-sgs-regions-title { font-size: 11.5px; font-weight: 700; color: var(--tx2); margin-bottom: 8px; }
        .dm-sgs-region-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .dm-sgs-region-name { font-size: 11px; color: var(--tx2); min-width: 72px; }
        .dm-sgs-region-track { flex: 1; height: 5px; background: var(--sf3); border-radius: 3px; overflow: hidden; }
        .dm-sgs-region-fill { height: 100%; border-radius: 3px; transition: width .4s ease; }
        .dm-sgs-region-val { font-size: 10px; color: var(--tx3); font-family: var(--mo); white-space: nowrap; }
        .dm-sgs-prog-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px; background: var(--sf2); border: 1px solid var(--bdr);
          border-radius: 8px; margin-bottom: 6px;
        }
        .dm-sgs-prog-left { display: flex; flex-direction: column; gap: 2px; }
        .dm-sgs-prog-name { font-size: 12px; font-weight: 700; color: var(--tx); }
        .dm-sgs-prog-region { font-size: 10px; }
        .dm-sgs-prog-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .dm-sgs-prog-val { font-size: 13px; font-weight: 800; color: var(--teal); font-family: var(--mo); }
        .dm-sgs-prog-rank { font-size: 10px; color: var(--tx3); font-family: var(--mo); }
        .dm-sgs-reading-guide p { font-size: 10.5px; color: var(--tx3); line-height: 1.6; margin: 0 0 6px; }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .dm-kpi-row  { grid-template-columns: repeat(3, 1fr); }
          .dm-chart-row, .dm-row-6040, .dm-row-6535 { grid-template-columns: 1fr; }
          .dm-sgs-map-wrap { grid-template-columns: 1fr; }
          .dm-sgs-map-left { border-right: none; border-bottom: 1px solid var(--bdr); }
        }
        @media (max-width: 700px) {
          .dm-kpi-row  { grid-template-columns: repeat(2, 1fr); }
          .dm-charts-wrap { padding: 10px 12px 60px; }
          .dm-chart { height: 220px; }
        }
        @media (max-width: 640px) {
          .dm-tabs-outer { overflow-x: auto; overflow-y: hidden;
                           -webkit-overflow-scrolling: touch; scrollbar-width: none;
                           padding: 8px 10px; }
          .dm-tabs-outer::-webkit-scrollbar { display: none; }
          .dm-tabs { width: max-content !important; position: static !important;
                     height: auto !important; overflow: visible !important;
                     padding: 6px !important; gap: 6px; border-radius: 10px; }
          .dm-tab { min-width: 90px; padding: 8px 10px !important; height: auto !important;
                    line-height: normal !important; }
          .dm-tab-sub { display: none; }
          .dm-tab-label { font-size: 11px; }
          .dm-charts-wrap { padding: 8px 10px 24px; }
          .dm-chart { height: 200px; }
        }
      `}</style>
    </div>
  );
}
