import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchMfAumTrend,
  fetchMfGrossMobTotal,
  fetchMfGrossMobPublic,
  fetchMfGrossMobPrivate,
  fetchMfNetInflowTotal,
  fetchMfEquityAum,
  fetchMfDebtAum,
  fetchMfMetricById,
  fetchMfEquityFlows,
  fetchMfHybridFlows,
  fetchMfIndexFlows,
  fetchMfEtfExGoldFlows,
  fetchMfGoldEtfFlows,
  fetchMfAumByCategory,
  fetchMfTop10SchemeAum,
  fetchMfAumComposition,
  fetchMfLegacyArchive,
  fetchMfNetInflowsByScheme,
  fetchMfSipContribution,
  NET_INFLOW_DIMS,
} from '../../api/mutualFundsApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';

/* Chart helpers */
const isDk = () => document.documentElement.getAttribute('data-theme') === 'dark';
function cc() {
  const d = isDk();
  return {
    text:  d ? '#ffffff' : '#1a1a1a',
    text2: d ? '#f0f0f0' : '#1a1c18',
    grid:  d ? 'rgba(255,255,255,.13)' : 'rgba(26,28,24,.15)',
    axis:  d ? 'rgba(255,255,255,.10)' : 'rgba(26,28,24,.10)',
    bg:    d ? '#08111f' : '#f7f8f3',
  };
}
const GRID = (l,r,t,b) => ({top:t,right:r,bottom:b,left:l,containLabel:false});
const ALB  = c => ({color:c.text,fontSize:10});
const SPL  = c => ({lineStyle:{color:c.grid,type:'dashed'}});
const XAX  = (data,c,iv) => ({
  type:'category',data,
  axisLine:{lineStyle:{color:c.axis}},axisTick:{show:false},
  axisLabel:{...ALB(c),interval:iv??'auto'},
});
const YAX  = (c,fmt) => ({
  type:'value',
  axisLabel:{...ALB(c),formatter:fmt},
  splitLine:SPL(c),axisLine:{show:false},
});
const TT = c => ({
  trigger:'axis',backgroundColor:c.bg,borderColor:c.grid,
  textStyle:{color:c.text2,fontSize:11},
  axisPointer:{lineStyle:{color:c.grid}},
});

function fmtP(p) {
  if (!p) return '';
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m] = p.split('-');
  return `${M[+m - 1]} ${y.slice(2)}`;
}
function fmtCr(v) {
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L Cr`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}K Cr`;
  return `₹${Math.round(v).toLocaleString()} Cr`;
}

export default function MutualFundsPage({ isActive }) {
  useThemeWatcher();
  const [period,   setPeriod]   = useState('All');
  const [fromYear, setFromYear] = useState('2014');
  const [toYear,   setToYear]   = useState('2026');

  const [aumTrendData,     setAumTrendData]     = useState({ months: [], values: [] });
  const [grossMobData,     setGrossMobData]     = useState({ months: [], pub: [], pvt: [] });
  const [equityFlowData,   setEquityFlowData]   = useState({ months: [], values: [] });
  const [hybridFlowData,   setHybridFlowData]   = useState({ months: [], values: [] });
  const [indexFlowData,    setIndexFlowData]    = useState({ months: [], values: [] });
  const [etfExGoldData,    setEtfExGoldData]    = useState({ months: [], values: [] });
  const [goldEtfData,      setGoldEtfData]      = useState({ months: [], values: [] });
  const [aumCategoryData,  setAumCategoryData]  = useState([]);
  const [top10SchemeData,  setTop10SchemeData]  = useState([]);
  const [aumCompData,      setAumCompData]      = useState({ months: [], equity: [], debt: [], hybrid: [] });
  const [legacyArchiveData,    setLegacyArchiveData]    = useState([]);
  const [netInflowSchemeData,  setNetInflowSchemeData]  = useState([]);
  const [sipData,              setSipData]              = useState({ months: [], values: [] });
  const [latestTable,          setLatestTable]          = useState([]);
  const [loadCount, setLoadCount] = useState(0);
  const TOTAL_LOADS = 14;
  const loading = loadCount < TOTAL_LOADS;

  const [mfKpi, setMfKpi] = useState({
    aum:       { value: '—', note: '—' },
    grossMob:  { value: '—', note: 'Total inflows into MFs' },
    netFlow:   { value: '—', note: 'Latest month net flows' },
    equityAum: { value: '—', note: 'Equity-type schemes' },
    debtAum:   { value: '—', note: 'Debt-type schemes' },
  });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);

    Promise.all([
      fetchMfAumTrend().catch(() => []),
      fetchMfGrossMobTotal().catch(() => []),
      fetchMfNetInflowTotal().catch(() => []),
      fetchMfEquityAum().catch(() => []),
      fetchMfDebtAum().catch(() => []),
    ]).then(([aumRaw, grossRaw, netRaw, equityRaw, debtRaw]) => {
      const last = raw => {
        const l = toList(raw);
        return l.length ? l[l.length - 1] : null;
      };
      const val = r => r ? +(r.value ?? r.metric_value ?? 0) : 0;

      // Full AUM series for trend chart (crore → L Cr)
      const aumList = toList(aumRaw);
      setAumTrendData({
        months: aumList.map(r => fmtP(r.period)),
        values: aumList.map(r => +((+(r.value ?? r.metric_value ?? 0)) / 1e5).toFixed(2)),
      });

      const aumR    = last(aumRaw);
      const grossR  = last(grossRaw);
      const netR    = last(netRaw);
      const equityR = last(equityRaw);
      const debtR   = last(debtRaw);

      setMfKpi({
        aum:       { value: fmtCr(val(aumR)),    note: aumR    ? `as of ${fmtP(aumR.period)}`    : '—' },
        grossMob:  { value: fmtCr(val(grossR)),  note: grossR  ? `as of ${fmtP(grossR.period)}`  : 'Total inflows into MFs' },
        netFlow:   { value: fmtCr(val(netR)),    note: netR    ? `as of ${fmtP(netR.period)}`    : 'Latest month net flows' },
        equityAum: { value: fmtCr(val(equityR)), note: equityR ? `as of ${fmtP(equityR.period)}` : 'Equity-type schemes' },
        debtAum:   { value: fmtCr(val(debtR)),   note: debtR   ? `as of ${fmtP(debtR.period)}`   : 'Debt-type schemes' },
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);

    Promise.all([
      fetchMfGrossMobPublic().catch(() => []),
      fetchMfGrossMobPrivate().catch(() => []),
    ]).then(([pubRaw, pvtRaw]) => {
      const pubList = toList(pubRaw);
      const pvtList = toList(pvtRaw);
      const base = pubList.length >= pvtList.length ? pubList : pvtList;
      const pubMap = {}, pvtMap = {};
      pubList.forEach(r => { pubMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      pvtList.forEach(r => { pvtMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      setGrossMobData({
        months: base.map(r => fmtP(r.period)),
        pub:    base.map(r => pubMap[r.period] ?? 0),
        pvt:    base.map(r => pvtMap[r.period] ?? 0),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const DIMS = [
      { label: 'Assets at End of Period',             id: 33960 },
      { label: 'Gross Mobilisation - Public Sector',  id: 33952 },
      { label: 'Gross Mobilisation - Private Sector', id: 33951 },
      { label: 'Gross Mobilisation - Total',          id: 33953 },
      { label: 'Net Inflow/Outflow - Public Sector',  id: 33958 },
      { label: 'Net Inflow/Outflow - Private Sector', id: 33957 },
      { label: 'Net Inflow/Outflow - Total',          id: 33959 },
      { label: 'Redemption/Repurchase - Public Sector',  id: 33955 },
      { label: 'Redemption/Repurchase - Private Sector', id: 33954 },
      { label: 'Redemption/Repurchase - Total',          id: 33956 },
    ];

    Promise.all(DIMS.map(d => fetchMfMetricById(d.id).catch(() => []))).then(results => {
      const rows = DIMS.map((d, i) => {
        const list = toList(results[i]);
        const last = list.length ? list[list.length - 1] : null;
        const v = last ? +(last.value ?? last.metric_value ?? 0) : null;
        const display = v != null
          ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '—';
        return [d.label, display];
      });
      setLatestTable(rows);
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfEquityFlows()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) { setLoadCount(c => c + 1); return; }
        setEquityFlowData({
          months: list.map(r => fmtP(r.period)),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfHybridFlows()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) { setLoadCount(c => c + 1); return; }
        setHybridFlowData({
          months: list.map(r => fmtP(r.period)),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfIndexFlows()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) { setLoadCount(c => c + 1); return; }
        setIndexFlowData({
          months: list.map(r => fmtP(r.period)),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfEtfExGoldFlows()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) { setLoadCount(c => c + 1); return; }
        setEtfExGoldData({
          months: list.map(r => fmtP(r.period)),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfGoldEtfFlows()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) { setLoadCount(c => c + 1); return; }
        setGoldEtfData({
          months: list.map(r => fmtP(r.period)),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfAumByCategory()
      .then(results => {
        const segments = results.map(({ name, color, raw }) => {
          const list = toList(raw);
          const latest = list.length ? list[list.length - 1] : null;
          const val = latest ? +(latest.value ?? latest.metric_value ?? 0) : 0;
          return { name, color, value: val };
        }).filter(d => d.value > 0);
        if (segments.length) setAumCategoryData(segments);
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfTop10SchemeAum()
      .then(results => {
        const rows = results.map(({ name, raw }) => {
          const list = toList(raw);
          const latest = list.length ? list[list.length - 1] : null;
          const val = latest ? +(latest.value ?? latest.metric_value ?? 0) : 0;
          return { name, value: val };
        }).filter(d => d.value > 0)
          .sort((a, b) => b.value - a.value);
        if (rows.length) setTop10SchemeData(rows);
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfAumComposition()
      .then(([eqRaw, dbRaw, hyRaw]) => {
        const eqList = toList(eqRaw);
        const dbList = toList(dbRaw);
        const hyList = toList(hyRaw);
        const base = eqList.length >= dbList.length ? eqList : dbList;
        const dbMap = {}, hyMap = {};
        dbList.forEach(r => { dbMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        hyList.forEach(r => { hyMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        if (!base.length) { setLoadCount(c => c + 1); return; }
        setAumCompData({
          months: base.map(r => fmtP(r.period)),
          equity: base.map(r => +((+(r.value ?? r.metric_value ?? 0)) / 1e5).toFixed(2)),
          debt:   base.map(r => +((dbMap[r.period] ?? 0) / 1e5).toFixed(2)),
          hybrid: base.map(r => +((hyMap[r.period] ?? 0) / 1e5).toFixed(2)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const ALLOWED_FY = ['2024-25', '2025-26'];
    fetchMfLegacyArchive()
      .then(results => {
        const rows = [];
        results.forEach(({ name, raw }) => {
          const list = toList(raw);
          list.forEach(r => {
            const period = r.period ?? '';
            if (!ALLOWED_FY.includes(period)) return;
            const val = +(r.value ?? r.metric_value ?? 0);
            if (val > 0) rows.push({ label: name, period, value: val });
          });
        });
        // Group by period (asc), within each period keep dim order
        const periodOrder = [...new Set(rows.map(r => r.period))].sort();
        const dimOrder = ['Interval', 'Open-ended', 'Close-ended', 'Total'];
        const sorted = [];
        periodOrder.forEach(p => {
          const group = rows.filter(r => r.period === p);
          dimOrder.forEach(d => {
            const item = group.find(r => r.label === d);
            if (item) sorted.push({ ...item, displayLabel: `${item.label}  ${item.period}` });
          });
        });
        if (sorted.length) setLegacyArchiveData(sorted);
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfNetInflowsByScheme()
      .then(results => {
        // Each result is { id, name, raw } — take latest row's value for each scheme
        const rows = results.map(({ name, raw }) => {
          const list = toList(raw);
          const latest = list.length ? list[list.length - 1] : null;
          const val = latest ? +(latest.value ?? latest.metric_value ?? 0) : 0;
          return { name, value: val };
        }).filter(r => r.value > 0)
          .sort((a, b) => b.value - a.value);
        if (rows.length) setNetInflowSchemeData(rows);
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMfSipContribution()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) { setLoadCount(c => c + 1); return; }
        setSipData({
          months: list.map(r => fmtP(r.period)),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const _fy = { from: parseInt(fromYear) || 2000, to: parseInt(toYear) || 2099 };
  const fyMonth = (months, ...arrs) => {
    const keep = months.map(m => { const yy = parseInt((m || '').split(' ')[1]); const yr = isNaN(yy) ? NaN : (yy <= 30 ? 2000 + yy : 1900 + yy); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [months.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };

  const rSip      = useRef(null);
  const rEquity   = useRef(null);
  const rHybrid   = useRef(null);
  const rIndex    = useRef(null);
  const rEtfEx    = useRef(null);
  const rGold     = useRef(null);
  const rAumTrend  = useRef(null);
  const rDonut     = useRef(null);
  const rTop10     = useRef(null);
  const rAumComp   = useRef(null);
  const rLegacy    = useRef(null);
  const rGrossMob  = useRef(null);
  const rNetInflow = useRef(null);

  /* ── SIP Contribution — monthly bar chart ── */
  useChart(rSip, () => {
    const [months, values] = fyMonth(sipData.months, sipData.values);
    if (!months.length) return null;
    const c = cc();
    const maxV = Math.max(...values);
    const step = maxV <= 10000 ? 5000 : maxV <= 20000 ? 5000 : 10000;
    const yMax = Math.ceil(maxV / step) * step;
    const iv   = Math.max(1, Math.floor(months.length / 10));
    const latest = values[values.length - 1];
    return {
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 28, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/>${p[0].marker}SIP: <b>₹${Math.round(+p[0].value).toLocaleString('en-IN')} Cr</b>`,
      },
      xAxis: {
        type: 'category', data: months,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      graphic: latest ? [{
        type: 'text', right: 8, top: 8,
        style: { text: `₹${Math.round(latest).toLocaleString('en-IN')} Cr`, fill: '#10b981', fontSize: 10, fontWeight: 700 },
      }] : [],
      series: [{
        type: 'bar', data: values, barMaxWidth: 8,
        itemStyle: { color: '#10b981', borderRadius: [2, 2, 0, 0] },
      }],
    };
  });

  /* ── Equity Funds — Monthly Net Flows bar chart ── */
  useChart(rEquity, () => {
    const [months, values] = fyMonth(equityFlowData.months, equityFlowData.values);
    if (!months.length) return null;
    const c = cc();
    const maxAbs = Math.max(1, ...values.map(Math.abs));
    // Round to nearest 100K so yBound always falls exactly on a tick → no extra boundary line
    const step   = maxAbs > 100000 ? 100000 : maxAbs > 20000 ? 50000 : 10000;
    const yBound = Math.ceil(maxAbs * 1.15 / step) * step;
    const yStep  = yBound / Math.round(yBound / step);   // ticks that exactly divide yBound
    const iv = Math.max(1, Math.floor(months.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 28, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/>${p[0].marker}<b>₹${Math.abs(+p[0].value).toLocaleString('en-IN')} Cr</b> ${+p[0].value >= 0 ? 'inflow' : 'outflow'}`,
      },
      xAxis: {
        type: 'category', data: months,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: -yBound, max: yBound, interval: yStep,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v >= 1000 || v <= -1000 ? `${(v/1000).toFixed(0)}K` : v },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar', data: values, barMaxWidth: 6,
        itemStyle: {
          color: params => params.value >= 0 ? '#10b981' : '#ef4444',
          borderRadius: params => params.value >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2],
        },
      }],
    };
  });
  /* ── Hybrid Funds — Monthly Net Flows bar chart ── */
  useChart(rHybrid, () => {
    const [months, values] = fyMonth(hybridFlowData.months, hybridFlowData.values);
    if (!months.length) return null;
    const c = cc();
    const maxAbs = Math.max(1, ...values.map(Math.abs));
    const step   = maxAbs > 100000 ? 100000 : maxAbs > 20000 ? 50000 : 10000;
    const yBound = Math.ceil(maxAbs * 1.15 / step) * step;
    const yStep  = yBound / Math.round(yBound / step);
    const iv = Math.max(1, Math.floor(months.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 28, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/>${p[0].marker}<b>₹${Math.abs(+p[0].value).toLocaleString('en-IN')} Cr</b> ${+p[0].value >= 0 ? 'inflow' : 'outflow'}`,
      },
      xAxis: {
        type: 'category', data: months,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: -yBound, max: yBound, interval: yStep,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v >= 1000 || v <= -1000 ? `${(v/1000).toFixed(0)}K` : v },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar', data: values, barMaxWidth: 6,
        itemStyle: {
          color: params => params.value >= 0 ? '#10b981' : '#ef4444',
          borderRadius: params => params.value >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2],
        },
      }],
    };
  });
  /* ── Index Funds — Monthly Net Flows bar chart ── */
  useChart(rIndex, () => {
    const [months, values] = fyMonth(indexFlowData.months, indexFlowData.values);
    if (!months.length) return null;
    const c = cc();
    const maxAbs = Math.max(1, ...values.map(Math.abs));
    const step   = maxAbs > 100000 ? 100000 : maxAbs > 20000 ? 50000 : 10000;
    const yBound = Math.ceil(maxAbs * 1.15 / step) * step;
    const yStep  = yBound / Math.round(yBound / step);
    const iv = Math.max(1, Math.floor(months.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 28, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/>${p[0].marker}<b>₹${Math.abs(+p[0].value).toLocaleString('en-IN')} Cr</b> ${+p[0].value >= 0 ? 'inflow' : 'outflow'}`,
      },
      xAxis: {
        type: 'category', data: months,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: -yBound, max: yBound, interval: yStep,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v >= 1000 || v <= -1000 ? `${(v/1000).toFixed(0)}K` : v },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar', data: values, barMaxWidth: 6,
        itemStyle: {
          color: params => params.value >= 0 ? '#10b981' : '#ef4444',
          borderRadius: params => params.value >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2],
        },
      }],
    };
  });
  /* ── ETFs ex-Gold — Monthly Net Flows bar chart ── */
  useChart(rEtfEx, () => {
    const [months, values] = fyMonth(etfExGoldData.months, etfExGoldData.values);
    if (!months.length) return null;
    const c = cc();
    const maxAbs = Math.max(1, ...values.map(Math.abs));
    const step   = maxAbs > 100000 ? 100000 : maxAbs > 20000 ? 50000 : 10000;
    const yBound = Math.ceil(maxAbs * 1.15 / step) * step;
    const yStep  = yBound / Math.round(yBound / step);
    const iv = Math.max(1, Math.floor(months.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 28, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/>${p[0].marker}<b>₹${Math.abs(+p[0].value).toLocaleString('en-IN')} Cr</b> ${+p[0].value >= 0 ? 'inflow' : 'outflow'}`,
      },
      xAxis: {
        type: 'category', data: months,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: -yBound, max: yBound, interval: yStep,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v >= 1000 || v <= -1000 ? `${(v/1000).toFixed(0)}K` : v },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar', data: values, barMaxWidth: 6,
        itemStyle: {
          color: params => params.value >= 0 ? '#10b981' : '#ef4444',
          borderRadius: params => params.value >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2],
        },
      }],
    };
  });
  /* ── Gold ETF — Monthly Net Flows bar chart ── */
  useChart(rGold, () => {
    const [months, values] = fyMonth(goldEtfData.months, goldEtfData.values);
    if (!months.length) return null;
    const c = cc();
    const maxAbs = Math.max(1, ...values.map(Math.abs));
    const step   = maxAbs > 100000 ? 100000 : maxAbs > 20000 ? 50000 : 10000;
    const yBound = Math.ceil(maxAbs * 1.15 / step) * step;
    const yStep  = yBound / Math.round(yBound / step);
    const iv = Math.max(1, Math.floor(months.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 28, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/>${p[0].marker}<b>₹${Math.abs(+p[0].value).toLocaleString('en-IN')} Cr</b> ${+p[0].value >= 0 ? 'inflow' : 'outflow'}`,
      },
      xAxis: {
        type: 'category', data: months,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: -yBound, max: yBound, interval: yStep,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v >= 1000 || v <= -1000 ? `${(v/1000).toFixed(0)}K` : v },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar', data: values, barMaxWidth: 6,
        itemStyle: {
          color: params => params.value >= 0 ? '#f59e0b' : '#ef4444',
          borderRadius: params => params.value >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2],
        },
      }],
    };
  });

  useChart(rAumTrend, () => {
    const c = cc();
    const [months, values] = fyMonth(aumTrendData.months, aumTrendData.values);
    const iv = Math.floor(months.length / 10) || 1;
    return {
      backgroundColor: 'transparent',
      grid: GRID(52, 20, 30, 14),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/>${p[0].marker}AUM ₹${p[0].value}L Cr` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => '₹' + v + 'L'), min: 0 },
      series: [{
        type: 'line', data: values, smooth: true,
        lineStyle: { color: '#4a90d9', width: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(74,144,217,.3)' }, { offset: 1, color: 'rgba(74,144,217,.02)' }] } },
        symbol: 'none',
      }],
    };
  });

  /* ── AUM by Scheme Category — donut chart ── */
  useChart(rDonut, () => {
    if (!aumCategoryData.length) return null;
    const c = cc();
    const fmtLCr = v => {
      const lCr = v / 1e5;
      return lCr >= 1 ? `₹${lCr.toFixed(0)}L` : `₹${(v / 1000).toFixed(0)}K`;
    };
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p.marker}<b>${p.name}</b><br/>AUM: <b>${fmtLCr(p.value)} Cr</b><br/>Share: <b>${p.percent.toFixed(1)}%</b>`,
      },
      legend: { show: false },
      series: [{
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '52%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: p => `{name|${p.name}} {val|${fmtLCr(p.value)}}`,
          rich: {
            name: { fontSize: 11, color: p => p.color },
            val:  { fontSize: 11, fontWeight: 700 },
          },
          color: c.text,
          fontSize: 11,
        },
        labelLine: { lineStyle: { color: c.grid } },
        data: aumCategoryData.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.color },
          label: { color: d.color },
        })),
      }],
    };
  });

  /* ── Top 10 Scheme Types by AUM — horizontal bar chart ── */
  useChart(rTop10, () => {
    if (!top10SchemeData.length) return null;
    const c = cc();
    // ascending so largest bar is at top
    const sorted = [...top10SchemeData].sort((a, b) => a.value - b.value);
    const labels = sorted.map(d => d.name);
    const vals   = sorted.map(d => d.value);
    const fmtAum = v => {
      const lCr = v / 1e5;
      return lCr >= 1 ? `₹${lCr.toFixed(0)}L` : `₹${(v / 1000).toFixed(0)}K`;
    };
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 48, bottom: 28, left: 16, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}AUM: <b>${fmtAum(p[0].value)} Cr</b>`,
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtAum(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: labels,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, width: 140, overflow: 'truncate' },
      },
      series: [{
        type: 'bar', data: vals, barMaxWidth: 20,
        itemStyle: { color: '#3b82f6', borderRadius: [0, 3, 3, 0] },
        label: {
          show: true, position: 'right',
          formatter: p => fmtAum(p.value),
          color: c.text, fontSize: 9,
        },
      }],
    };
  });

  /* ── MF AUM Composition — stacked area (Equity / Debt / Hybrid) ── */
  useChart(rAumComp, () => {
    const [months, equity, debt, hybrid] = fyMonth(aumCompData.months, aumCompData.equity, aumCompData.debt, aumCompData.hybrid);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 8));
    // compute max stacked value to set clean y-axis
    const maxStack = Math.max(...equity.map((e, i) => e + (debt[i] ?? 0) + (hybrid[i] ?? 0)));
    const yStep = maxStack <= 12 ? 3 : maxStack <= 24 ? 6 : 12;
    const yMax  = Math.ceil(maxStack / yStep) * yStep;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => {
          const header = `<b>${p[0].axisValue}</b><br/>`;
          // show each series' individual (non-stacked) value
          const lines = p.map(s => `${s.marker}${s.seriesName}:&nbsp;<b>₹${(+s.value).toFixed(2)}L Cr</b>`);
          return header + lines.join('<br/>');
        },
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: ['Equity', 'Debt', 'Hybrid'],
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: yStep,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [
        { name: 'Equity', type: 'line', data: equity, smooth: true, symbol: 'circle', symbolSize: 4,
          stack: 'aum',
          lineStyle: { color: '#3b82f6', width: 1.5 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: { color: '#3b82f6cc' } },
        { name: 'Debt', type: 'line', data: debt, smooth: true, symbol: 'circle', symbolSize: 4,
          stack: 'aum',
          lineStyle: { color: '#10b981', width: 1.5 },
          itemStyle: { color: '#10b981' },
          areaStyle: { color: '#10b981cc' } },
        { name: 'Hybrid', type: 'line', data: hybrid, smooth: true, symbol: 'circle', symbolSize: 4,
          stack: 'aum',
          lineStyle: { color: '#f97316', width: 1.5 },
          itemStyle: { color: '#f97316' },
          areaStyle: { color: '#f97316cc' } },
      ],
    };
  });

  /* ── Legacy MF Summary Archive — horizontal bar chart ── */
  useChart(rLegacy, () => {
    if (!legacyArchiveData.length) return null;
    const c = cc();
    // ascending so largest bar at top
    const sorted = [...legacyArchiveData].sort((a, b) => a.value - b.value);
    const labels = sorted.map(d => d.displayLabel);
    const vals   = sorted.map(d => +(d.value / 1e5).toFixed(2));
    const fmtV   = v => `₹${v.toFixed(2)} L Cr`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 80, bottom: 28, left: 16, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue.replace('\n', ' · ')}</b><br/>${p[0].marker}AUM: <b>${fmtV(p[0].value)}</b>`,
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L Cr` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: labels,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, width: 120, overflow: 'truncate' },
      },
      series: [{
        type: 'bar', data: vals, barMaxWidth: 20,
        itemStyle: { color: '#a855f7', borderRadius: [0, 3, 3, 0] },
        label: {
          show: true, position: 'right',
          formatter: p => fmtV(p.value),
          color: c.text, fontSize: 9,
        },
      }],
    };
  });

  useChart(rGrossMob, () => {
    const c = cc();
    const [months, pub, pvt] = fyMonth(grossMobData.months, grossMobData.pub, grossMobData.pvt);
    const iv = Math.floor(months.length / 10) || 1;
    const fmtV = v => v >= 1e5 ? (v/1e5).toFixed(1)+'L' : v >= 1e3 ? Math.round(v/1000)+'K' : String(Math.round(v));
    return {
      backgroundColor: 'transparent',
      grid: GRID(62, 20, 38, 14),
      tooltip: { ...TT(c), trigger: 'axis',
        formatter: p => `${p[0].axisValue}<br/>` + p.map(s => `${s.marker}${s.seriesName}: <b>₹${fmtV(+s.value)} Cr</b>`).join('<br/>') },
      legend: { bottom: 4, textStyle: { color: c.text, fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => '₹' + fmtV(v)), min: 0 },
      series: [
        { name: 'Public Sector',  type: 'bar', data: pub, stack: 'gm',
          barMaxWidth: 8, itemStyle: { color: '#2d8a4e' } },
        { name: 'Private Sector', type: 'bar', data: pvt, stack: 'gm',
          barMaxWidth: 8, itemStyle: { color: '#4a90d9' } },
      ],
    };
  });

  /* ── Net Inflows by Scheme Type — horizontal bar (positive only, sorted desc) ── */
  useChart(rNetInflow, () => {
    if (!netInflowSchemeData.length) return null;
    const c = cc();
    // ascending so largest bar at top in horizontal chart
    const sorted = [...netInflowSchemeData].sort((a, b) => a.value - b.value);
    const labels = sorted.map(d => d.name);
    const vals   = sorted.map(d => d.value);
    const fmtV   = v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(Math.round(v));
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 60, bottom: 28, left: 16, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Net Inflow: <b>₹${Math.round(p[0].value).toLocaleString('en-IN')} Cr</b>`,
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `${fmtV(v)}` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: labels,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, width: 160, overflow: 'truncate' },
      },
      series: [{
        type: 'bar', data: vals, barMaxWidth: 18,
        itemStyle: { color: '#10b981', borderRadius: [0, 3, 3, 0] },
        label: {
          show: true, position: 'right',
          formatter: p => `₹${fmtV(p.value)}`,
          color: c.text, fontSize: 9,
        },
      }],
    };
  });

  const latestVal = (data) => {
    if (!data.values.length) return null;
    const v = data.values[data.values.length - 1];
    return `₹${Math.abs(v).toLocaleString('en-IN')} Cr`;
  };

  const CHARTS = [
    { ref:rSip,    title:'SIP contribution',  src:'Industry.sip_monthly',              val: latestVal(sipData) },
    { ref:rEquity, title:'Equity funds',       src:'Growth/Equity Oriented Schemes',    val: latestVal(equityFlowData) },
    { ref:rHybrid, title:'Hybrid funds',       src:'Hybrid Schemes',                    val: latestVal(hybridFlowData) },
    { ref:rIndex,  title:'Index funds',        src:'Index Funds',                       val: latestVal(indexFlowData) },
    { ref:rEtfEx,  title:'ETFs ex-gold',       src:'Other ETFs',                        val: latestVal(etfExGoldData) },
    { ref:rGold,   title:'Gold ETF',           src:'GOLD ETF',                          val: latestVal(goldEtfData) },
  ];

  return (
    <div
      id="page-mf"
      style={{display:isActive?'flex':'none',flexDirection:'column',height:'100%',overflow:'hidden'}}
    >
      <div
        className="mf-scroll"
        style={{flex:'1 1 0',minHeight:0,height:0,overflowY:'scroll',
                display:'flex',flexDirection:'column',gap:14,padding:'18px 20px 40px'}}
      >
        {/* Header */}
        <div>
          <div className="mf-title">Mutual Funds</div>
          <div className="mf-sub">AUM trends, gross mobilisation, and net flows in India's mutual fund industry</div>
        </div>

        {/* Filters */}
        <div className="mf-filters">
          <div className="mf-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`mf-btn${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="mf-range">
            <span className="mf-lbl">From</span>
            <select className="mf-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="mf-lbl">To</span>
            <select className="mf-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards — 6 columns */}
        <div className="mf-kpis">
          <div className="mf-kpi">
            <div className="mf-kpi-lbl">LATEST MF AUM</div>
            <div className="mf-kpi-val">{mfKpi.aum.value}</div>
            <div className="mf-kpi-note">{mfKpi.aum.note}</div>
          </div>
          <div className="mf-kpi">
            <div className="mf-kpi-lbl">LATEST GROSS MOBILISATION</div>
            <div className="mf-kpi-val">{mfKpi.grossMob.value}</div>
            <div className="mf-kpi-note">{mfKpi.grossMob.note}</div>
          </div>
          <div className="mf-kpi">
            <div className="mf-kpi-lbl">NET INFLOW / OUTFLOW</div>
            <div className="mf-kpi-val">{mfKpi.netFlow.value}</div>
            <div className="mf-kpi-note">{mfKpi.netFlow.note}</div>
          </div>
          <div className="mf-kpi">
            <div className="mf-kpi-lbl"># SCHEME TYPES</div>
            <div className="mf-kpi-num">55</div>
            <div className="mf-kpi-note">Active scheme categories</div>
          </div>
          <div className="mf-kpi">
            <div className="mf-kpi-lbl">EQUITY SCHEME AUM</div>
            <div className="mf-kpi-val">{mfKpi.equityAum.value}</div>
            <div className="mf-kpi-note">{mfKpi.equityAum.note}</div>
          </div>
          <div className="mf-kpi">
            <div className="mf-kpi-lbl">DEBT SCHEME AUM</div>
            <div className="mf-kpi-val">{mfKpi.debtAum.value}</div>
            <div className="mf-kpi-note">{mfKpi.debtAum.note}</div>
          </div>
        </div>

        {/* Monthly Fund Flows — 3×2 grid */}
        <div className="mf-card">
          <div className="mf-card-hd">
            <div className="mf-card-hd-l">
              <span className="mf-card-title">Monthly Fund Flows Show the Category Cycles</span>
              <span className="mf-badge">AMFI</span>
            </div>
           
          </div>
          <div className="mf-card-sub">AMFI monthly category flows from CY20 onward · each panel is scaled independently</div>

          <div className="mf-3x2">
            {CHARTS.map(ch => (
              <div key={ch.title} className="mf-mini">
                <div className="mf-mini-hd">
                  <div>
                    <div className="mf-mini-title">{ch.title}</div>
                    <div className="mf-mini-src">{ch.src}</div>
                  </div>
                  <div className="mf-mini-val">{ch.val ?? '—'}</div>
                  <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(ch.ref.current, ch.title)}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                </div>
                {loading ? <div className="chart-loader" style={{height: 185}} /> : <div ref={ch.ref} style={{height:185}} />}
              </div>
            ))}
          </div>

          <div className="mf-footnote">
            SIP contribution uses reviewed AMFI SIP facts from the mutual-funds warehouse. Category flows use AMFI monthly
            industry categories; equity sums subcategories under Growth/Equity Oriented Schemes because the recent aggregate
            row is not reliable for flow analytics.
          </div>
        </div>

        {/* AUM Trend — full width */}
        <div className="mf-card">
          <div className="mf-card-hd">
            <div className="mf-card-hd-l">
              <span className="mf-card-title">Mutual Fund AUM Trend</span>
              <span className="mf-badge">AMFI</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rAumTrend.current, 'Mutual Fund AUM Trend')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mf-card-sub">Industry AUM (₹ Lakh Crore) · Apr 2015 to Jan 2026</div>
          {loading ? <div className="chart-loader" style={{height: 220}} /> : <div ref={rAumTrend} style={{height:220}} />}
        </div>

        {/* Donut + Top 10 side by side */}
        <div className="mf-row-side">
          <div className="mf-card">
            <div className="mf-card-hd">
              <div className="mf-card-hd-l">
                <span className="mf-card-title">AUM by Scheme Category</span>
                <span className="mf-badge">AMFI</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rDonut.current, 'AUM by Scheme Category')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="mf-card-sub">Latest month</div>
            {loading ? <div className="chart-loader" style={{height: 280}} /> : <div ref={rDonut} style={{height:280}} />}
          </div>

          <div className="mf-card">
            <div className="mf-card-hd">
              <div className="mf-card-hd-l">
                <span className="mf-card-title">Top 10 Scheme Types by AUM</span>
                <span className="mf-badge">AMFI</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rTop10.current, 'Top 10 Scheme Types by AUM')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="mf-card-sub">₹ Crore</div>
            {loading ? <div className="chart-loader" style={{height: 280}} /> : <div ref={rTop10} style={{height:280}} />}
          </div>
        </div>

        {/* MF AUM Composition */}
        <div className="mf-card">
          <div className="mf-card-hd">
            <div className="mf-card-hd-l">
              <span className="mf-card-title">MF AUM Composition</span>
              <span className="mf-badge">AMFI</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rAumComp.current, 'MF AUM Composition')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mf-card-sub">₹ Lakh Crore — equity vs debt vs hybrid</div>
          {loading ? <div className="chart-loader" style={{height: 240}} /> : <div ref={rAumComp} style={{height:240}} />}
        </div>

        {/* Legacy MF Summary Archive */}
        <div className="mf-card">
          <div className="mf-card-hd">
            <div className="mf-card-hd-l">
              <span className="mf-card-title">Legacy MF Summary Archive</span>
              <span className="mf-badge">SEBI</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rLegacy.current, 'Legacy MF Summary Archive')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mf-card-sub">Older SEBI summary table coverage · retained separately because categories are source-era shaped</div>
          {loading ? <div className="chart-loader" style={{height: 280}} /> : <div ref={rLegacy} style={{height:280}} />}
        </div>

        {/* Gross Mobilisation */}
        <div className="mf-card">
          <div className="mf-card-hd">
            <div className="mf-card-hd-l">
              <span className="mf-card-title">Gross Mobilisation — Public vs Private Sector</span>
              <span className="mf-badge">AMFI</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rGrossMob.current, 'Gross Mobilisation — Public vs Private Sector')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mf-card-sub">₹ Thousand Crore · gross inflows by sector</div>
          {loading ? <div className="chart-loader" style={{height: 240}} /> : <div ref={rGrossMob} style={{height:240}} />}
        </div>

        {/* Net Inflows by Scheme Type */}
        <div className="mf-card">
          <div className="mf-card-hd">
            <div className="mf-card-hd-l">
              <span className="mf-card-title">Net Inflows by Scheme Type</span>
              <span className="mf-badge">AMFI</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rNetInflow.current, 'Net Inflows by Scheme Type')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mf-card-sub">₹ Crore · latest period breakdown</div>
          {loading ? <div className="chart-loader" style={{height: 320}} /> : <div ref={rNetInflow} style={{height:320}} />}
        </div>

        {/* Latest Month — All Metrics */}
        <div className="mf-card">
          <div className="mf-card-hd">
            <div className="mf-card-hd-l">
              <span className="mf-card-title">Latest Month — All Metrics</span>
              <span className="mf-badge">AMFI</span>
            </div>
          </div>
          <div className="mf-card-sub">Breakdown of all available MF data for latest period</div>
          <div className="mf-table-wrap">
            <table className="mf-table">
              <thead>
                <tr><th>Metric</th><th className="mf-tr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>Value (₹ Cr)</th></tr>
              </thead>
              <tbody>
                {latestTable.length ? latestTable.map(([m, v]) => (<tr key={m}><td>{m}</td><td className="mf-tr">{v}</td></tr>)) : <tr><td colSpan={2} style={{textAlign:'center',color:'var(--tx3)',padding:'20px'}}>No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style>{`
        .mf-scroll::-webkit-scrollbar{width:6px}
        .mf-scroll::-webkit-scrollbar-track{background:transparent}
        .mf-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        .mf-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .mf-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}

        .mf-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .mf-btn-group{display:flex;gap:4px}
        .mf-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .mf-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .mf-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .mf-range{display:flex;align-items:center;gap:6px}
        .mf-lbl{font-size:11px;color:var(--tx3,#888)}
        .mf-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        .mf-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
        .mf-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:14px 16px}
        .mf-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;line-height:1.3}
        .mf-kpi-val{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.4px;line-height:1.1}
        .mf-kpi-num{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.5px;line-height:1}
        .mf-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px;line-height:1.4}

        .mf-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .mf-card-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
        .mf-card-hd-l{display:flex;align-items:center;gap:8px}
        .mf-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .mf-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:14px}
        .mf-badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px;
          background:rgba(14,116,144,.2);color:#22d3ee;border:1px solid rgba(14,116,144,.35)}
        .mf-icon{width:14px;height:14px;color:var(--tx3,#888);opacity:.6;cursor:pointer;flex-shrink:0}
        .mf-icon:hover{opacity:1}

        .mf-3x2{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .mf-mini{background:var(--sf2,rgba(255,255,255,.025));border:1px solid var(--bdr,rgba(255,255,255,.05));
          border-radius:6px;padding:12px 12px 6px}
        .mf-mini-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px}
        .mf-mini-title{font-size:12px;font-weight:600;color:var(--tx2,#ddd)}
        .mf-mini-src{font-size:10px;color:#22c99a;margin-top:2px}
        .mf-mini-val{font-size:11px;font-weight:600;color:var(--tx2,#ddd);white-space:nowrap;margin-top:1px}
        .mf-mini-val.neg{color:#e05060}

        .mf-footnote{font-size:10px;color:var(--tx4,#666);margin-top:12px;line-height:1.6;
          border-top:1px solid var(--bdr,rgba(255,255,255,.05));padding-top:10px}

        .mf-row-side{display:grid;grid-template-columns:2fr 3fr;gap:14px}

        .mf-table-wrap{overflow-x:auto;margin-top:8px}
        .mf-table{width:100%;border-collapse:collapse;font-size:12px}
        .mf-table th{padding:8px 12px;border-bottom:1px solid var(--bdr2,rgba(255,255,255,.12));
          color:var(--tx3,#888);font-weight:600;font-size:11px;text-align:left}
        .mf-table td{padding:10px 12px;border-bottom:1px solid var(--bdr,rgba(255,255,255,.05));
          color:var(--tx2,#ddd)}
        .mf-table tr:last-child td{border-bottom:none}
        .mf-table tr:hover td{background:var(--sf2,rgba(255,255,255,.03))}
        .mf-tr{text-align:right;font-variant-numeric:tabular-nums;font-family:monospace}
      `}</style>
    </div>
  );
}
