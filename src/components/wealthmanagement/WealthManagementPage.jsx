import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchPmTotalAum,
  fetchPmDiscretionaryAum,
  fetchPmClientCount,
  fetchPmsTotalAumTrend,
  fetchPmsTotalClientsTrend,
  fetchPmsSvcMix,
  fetchPmsAssetClassAum,
  fetchVcSectorAlloc,
  fetchCustAucTrend,
} from '../../api/wealthManagementApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';

/* ── Chart helpers ── */
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

const LK = svg => (
  <svg className="wm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default function WealthManagementPage({ isActive }) {
  useThemeWatcher();
  const [period,   setPeriod]   = useState('All');
  const [fromYear, setFromYear] = useState('2014');
  const [toYear,   setToYear]   = useState('2026');

  const [wmKpi, setWmKpi] = useState({
    totalAum: { value: '—', note: '— · including EPFO/PF' },
    discrAum: { value: '—', note: '— · non-EPFO managed accounts' },
    clients:  { value: '—', note: '— · active PM clients' },
  });
  const [pmTrendData,   setPmTrendData]   = useState({ months: [], total: [], discr: [] });
  const [pmsCrossData,  setPmsCrossData]  = useState({ months: [], aum: [], clients: [] });
  const [svcMixData,      setSvcMixData]      = useState([]);
  const [assetClassData,  setAssetClassData]  = useState([]);
  const [vcSectorData,    setVcSectorData]    = useState([]);
  const [custAucData,     setCustAucData]     = useState({ months: [], fpi: [], fdi: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const last = raw => { const l = toList(raw); return l.length ? l[l.length - 1] : null; };
    const val  = r => r ? +(r.value ?? r.metric_value ?? 0) : 0;
    const fmtP = p => {
      if (!p) return '—';
      const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const [y, m] = p.split('-');
      return `${M[+m - 1]} ${y.slice(2)}`;
    };

    Promise.all([
      fetchPmTotalAum().catch(() => []),
      fetchPmDiscretionaryAum().catch(() => []),
      fetchPmClientCount().catch(() => []),
    ]).then(([totalRaw, discrRaw, cliRaw]) => {
      const totalList = toList(totalRaw);
      const discrList = toList(discrRaw);
      const totalR = totalList.length ? totalList[totalList.length - 1] : null;
      const discrR = discrList.length ? discrList[discrList.length - 1] : null;
      const cliR   = last(cliRaw);

      const fmtAum = v => `₹${(v / 1e5).toFixed(2)} L Cr`;
      const fmtCli = v => Math.round(v).toLocaleString('en-IN');

      setWmKpi({
        totalAum: {
          value: totalR ? fmtAum(val(totalR)) : '—',
          note:  `Period ${fmtP(totalR?.period)} · including EPFO/PF`,
        },
        discrAum: {
          value: discrR ? fmtAum(val(discrR)) : '—',
          note:  `Period ${fmtP(discrR?.period)} · non-EPFO managed accounts`,
        },
        clients: {
          value: cliR ? fmtCli(val(cliR)) : '—',
          note:  `Period ${fmtP(cliR?.period)} · active PM clients`,
        },
      });

      // Build trend series for chart
      const discrMap = {}, totalMap = {};
      discrList.forEach(r => { discrMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      totalList.forEach(r => { totalMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      const periods = [...new Set([...Object.keys(discrMap), ...Object.keys(totalMap)])].sort();
      if (periods.length) {
        setPmTrendData({
          months: periods.map(p => fmtP(p)),
          discr:  periods.map(p => discrMap[p] != null ? +((discrMap[p]) / 1e5).toFixed(2) : null),
          total:  periods.map(p => totalMap[p] != null ? +((totalMap[p]) / 1e5).toFixed(2) : null),
        });
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const fmtP = p => {
      if (!p) return '';
      const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const [y, m] = p.split('-');
      return `${M[+m - 1]} ${y.slice(2)}`;
    };
    Promise.all([
      fetchPmsTotalAumTrend().catch(() => []),
      fetchPmsTotalClientsTrend().catch(() => []),
    ]).then(([aumRaw, cliRaw]) => {
      const aumList = toList(aumRaw);
      const cliList = Array.isArray(cliRaw) ? cliRaw : (cliRaw?.data || cliRaw?.items || cliRaw || []);
      const aumMap = {}, cliMap = {};
      aumList.forEach(r => { aumMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      cliList.forEach(r => { cliMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      const periods = [...new Set([...Object.keys(aumMap), ...Object.keys(cliMap)])].sort();
      if (periods.length) {
        setPmsCrossData({
          months:  periods.map(p => fmtP(p)),
          aum:     periods.map(p => aumMap[p]  != null ? +((aumMap[p])  / 1e5).toFixed(2) : null),
          clients: periods.map(p => cliMap[p]  != null ? cliMap[p] : null),
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchPmsSvcMix()
      .then(results => {
        const rows = results.map(({ name, color, raw }) => {
          const list = toList(raw);
          const latest = list.length ? list[list.length - 1] : null;
          return { name, color, value: latest ? +(latest.value ?? latest.metric_value ?? 0) : 0, period: latest?.period ?? '' };
        }).filter(r => r.value > 0);
        if (rows.length) setSvcMixData(rows);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchPmsAssetClassAum()
      .then(results => {
        const rows = results.map(({ name, color, raw }) => {
          const list = toList(raw);
          const latest = list.length ? list[list.length - 1] : null;
          const val = latest ? +(latest.value ?? latest.metric_value ?? 0) : 0;
          return { name, color, value: val };
        });
        const sorted = rows.filter(r => r.value >= 0).sort((a, b) => b.value - a.value);
        if (sorted.length) setAssetClassData(sorted);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const TARGET = '2025-12';
    fetchVcSectorAlloc()
      .then(results => {
        const rows = results.map(({ name, raw }) => {
          const list = toList(raw);
          // prefer the TARGET period; fall back to latest available
          const row = list.find(r => r.period === TARGET) ?? (list.length ? list[list.length - 1] : null);
          return { name, value: row ? +(row.value ?? row.metric_value ?? 0) : 0 };
        }).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
        if (rows.length) setVcSectorData(rows);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const fmtP = p => { const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const [y,m]=p.split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    fetchCustAucTrend()
      .then(([fpiRaw, fdiRaw]) => {
        const fpiList = toList(fpiRaw);
        const fdiList = toList(fdiRaw);
        const fdiMap = {};
        fdiList.forEach(r => { fdiMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        if (!fpiList.length) return;
        setCustAucData({
          months: fpiList.map(r => fmtP(r.period)),
          fpi:    fpiList.map(r => +(r.value ?? r.metric_value ?? 0)),
          fdi:    fpiList.map(r => fdiMap[r.period] ?? null),
        });
      }).catch(() => {});
  }, []);

  const _fy = { from: parseInt(fromYear) || 2000, to: parseInt(toYear) || 2099 };
  const fyMonth = (months, ...arrs) => {
    const keep = months.map(m => { const yy = parseInt((m || '').split(' ')[1]); const yr = isNaN(yy) ? NaN : (yy <= 30 ? 2000 + yy : 1900 + yy); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [months.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };

  const rPmTrend  = useRef(null);
  const rPmsSumm  = useRef(null);
  const rSvcMix   = useRef(null);
  const rCliTrend = useRef(null);
  const rAssetCls = useRef(null);
  const rVcSect   = useRef(null);
  const rCustAuc  = useRef(null);

  /* ── Portfolio Manager AUM Trend — Grand Total vs Discretionary ── */
  useChart(rPmTrend, () => {
    const [months, total, discr] = fyMonth(pmTrendData.months, pmTrendData.total, pmTrendData.discr);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const allVals = [...total, ...discr].filter(v => v != null);
    const maxV = allVals.length ? Math.max(...allVals) : 60;
    const yStep = maxV <= 20 ? 5 : maxV <= 40 ? 10 : maxV <= 60 ? 15 : 20;
    const yMax  = Math.ceil(maxV / yStep) * yStep;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>₹${s.value}L Cr</b>`).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: ['Grand Total AUM', 'Discretionary AUM'],
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
        { name: 'Grand Total AUM', type: 'line', data: total, smooth: true,
          symbol: 'circle', symbolSize: 4, connectNulls: false,
          lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' } },
        { name: 'Discretionary AUM', type: 'line', data: discr, smooth: true,
          symbol: 'circle', symbolSize: 4, connectNulls: false,
          lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' } },
      ],
    };
  });
  /* ── PMS Summary Cross-Check — dual y-axis: AUM (left) + Clients (right) ── */
  useChart(rPmsSumm, () => {
    const [months, aum, clients] = fyMonth(pmsCrossData.months, pmsCrossData.aum, pmsCrossData.clients);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxAum = Math.max(...aum.filter(v => v != null));
    const maxCli = Math.max(...clients.filter(v => v != null));
    const aumStep = maxAum <= 30 ? 15 : maxAum <= 60 ? 15 : 20;
    const aumMax  = Math.ceil(maxAum / aumStep) * aumStep;
    const fmtCli  = v => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(Math.round(v));
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s => s.value != null).map(s =>
          s.seriesName === 'Total AUM'
            ? `${s.marker}Total AUM: <b>₹${s.value}L Cr</b>`
            : `${s.marker}Total Clients: <b>${fmtCli(s.value)}</b>`
        ).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: ['Total AUM', 'Total Clients'],
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: [
        {
          type: 'value', name: '', min: 0, max: aumMax, interval: aumStep,
          axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L` },
          splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
          axisLine: { show: false },
        },
        {
          type: 'value', name: '', min: 0,
          axisLabel: { color: '#f97316', fontSize: 9, formatter: v => fmtCli(v) },
          splitLine: { show: false },
          axisLine: { show: false },
        },
      ],
      series: [
        { name: 'Total AUM', type: 'line', yAxisIndex: 0, data: aum,
          smooth: true, symbol: 'circle', symbolSize: 4, connectNulls: false,
          lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' } },
        { name: 'Total Clients', type: 'line', yAxisIndex: 1, data: clients,
          smooth: true, symbol: 'circle', symbolSize: 4, connectNulls: false,
          lineStyle: { color: '#f97316', width: 2 }, itemStyle: { color: '#f97316' } },
      ],
    };
  });
  /* ── PMS Service Mix — horizontal bar chart (Discretionary / Non-discr / Advisory) ── */
  useChart(rSvcMix, () => {
    if (!svcMixData.length) return null;
    const c = cc();
    const sorted = [...svcMixData].sort((a, b) => a.value - b.value); // ascending → largest at top
    const labels = sorted.map(d => d.name);
    const vals   = sorted.map(d => +(d.value / 1e5).toFixed(2));     // crore → L Cr
    const latestPeriod = svcMixData[0]?.period ?? '';
    const fmtP  = p => { const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const [y,m]=p.split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    const maxV  = Math.max(...vals);
    const step  = maxV <= 12 ? 3 : maxV <= 27 ? 9 : maxV <= 40 ? 10 : 18;
    const xMax  = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 16, bottom: 32, left: 16, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}AUM: <b>₹${p[0].value}L Cr</b>`,
      },
      xAxis: {
        type: 'value', min: 0, max: xMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: labels,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 10 },
      },
      graphic: latestPeriod ? [{
        type: 'text', left: 8, top: 4,
        style: { text: `Latest summary period ${fmtP(latestPeriod)}`, fill: c.text, fontSize: 10 },
      }] : [],
      series: [{
        type: 'bar', data: vals.map((v, i) => ({ value: v, itemStyle: { color: sorted[i].color, borderRadius: [0, 3, 3, 0] } })),
        barMaxWidth: 40,
      }],
    };
  });
  /* ── Client Count Trend — total PM clients over time (sum of 4 dims) ── */
  useChart(rCliTrend, () => {
    const [months, clients] = fyMonth(pmsCrossData.months, pmsCrossData.clients);
    if (!months.length || !clients.some(v => v != null)) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxV = Math.max(...clients.filter(v => v != null));
    const step = maxV <= 110000 ? 55000 : maxV <= 220000 ? 55000 : 100000;
    const yMax = Math.ceil(maxV / step) * step;
    const fmtN = v => v >= 100000 ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN');
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Clients: <b>${fmtN(p[0].value)}</b>`,
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtN(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        name: 'Total Clients', type: 'line', data: clients,
        smooth: true, symbol: 'none', connectNulls: false,
        lineStyle: { color: '#8b5cf6', width: 2 },
        itemStyle: { color: '#8b5cf6' },
      }],
    };
  });

  /* ── AUM by Asset Class (Latest) — horizontal bar, sorted desc ── */
  useChart(rAssetCls, () => {
    if (!assetClassData.length) return null;
    const c = cc();
    const sorted = [...assetClassData].sort((a, b) => a.value - b.value); // ascending → largest at top
    const labels = sorted.map(d => d.name);
    const vals   = sorted.map(d => +(d.value / 1e5).toFixed(2));          // crore → L Cr
    const maxV   = Math.max(...vals);
    const step   = maxV <= 10 ? 2 : maxV <= 20 ? 4 : maxV <= 32 ? 8 : 10;
    const xMax   = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 16, bottom: 32, left: 16, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}AUM: <b>₹${p[0].value}L Cr</b>`,
      },
      xAxis: {
        type: 'value', min: 0, max: xMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: labels,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, width: 150, overflow: 'truncate' },
      },
      series: [{
        type: 'bar', data: vals.map((v, i) => ({
          value: v,
          itemStyle: { color: sorted[i].color, borderRadius: [0, 3, 3, 0] },
        })),
        barMaxWidth: 28,
      }],
    };
  });
  /* ── Foreign VC Sectoral Allocation — horizontal bar chart ── */
  useChart(rVcSect, () => {
    if (!vcSectorData.length) return null;
    const c = cc();
    const COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#f97316','#8b5cf6','#06b6d4'];
    const sorted = [...vcSectorData].sort((a, b) => a.value - b.value); // ascending → largest at top
    const labels = sorted.map(d => d.name);
    const vals   = sorted.map(d => d.value);
    const maxV   = Math.max(...vals);
    const step   = Math.pow(10, Math.floor(Math.log10(maxV))) / 2;
    const xMax   = Math.ceil(maxV / step) * step;
    const fmtV   = v => v >= 1e9 ? `₹${(v/1e9).toFixed(1)}B` : v >= 1e7 ? `₹${(v/1e7).toFixed(0)}Cr` : v >= 1e5 ? `₹${(v/1e5).toFixed(1)}L` : `₹${Math.round(v).toLocaleString('en-IN')}`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 64, bottom: 28, left: 16, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Investment: <b>${fmtV(p[0].value)}</b>`,
      },
      xAxis: {
        type: 'value', min: 0, max: xMax,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtV(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: labels,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, width: 140, overflow: 'truncate' },
      },
      series: [{
        type: 'bar', data: vals.map((v, i) => ({
          value: v,
          itemStyle: { color: COLORS[i % COLORS.length], borderRadius: [0, 3, 3, 0] },
        })),
        barMaxWidth: 24,
        label: { show: true, position: 'right', formatter: p => fmtV(p.value), color: c.text, fontSize: 9 },
      }],
    };
  });
  /* ── Custodian AUC — FPI vs FDI dual line chart (values in ₹ L Cr) ── */
  useChart(rCustAuc, () => {
    const [months, fpi, fdi] = fyMonth(custAucData.months, custAucData.fpi, custAucData.fdi);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    // convert Crore → Lakh Crore for plotting
    const fpiL  = fpi.map(v => v != null ? +(v / 1e5).toFixed(2) : null);
    const fdiL  = fdi.map(v => v != null ? +(v / 1e5).toFixed(2) : null);
    const allV  = [...fpiL, ...fdiL].filter(v => v != null);
    const maxV  = Math.max(...allV);
    const step  = maxV <= 30 ? 10 : maxV <= 60 ? 25 : maxV <= 100 ? 25 : 50;
    const yMax  = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>₹${s.value}L Cr</b>`).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: ['FPI AUC', 'FDI AUC'],
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [
        { name: 'FPI AUC', type: 'line', data: fpiL, smooth: true, symbol: 'none', connectNulls: false,
          lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' } },
        { name: 'FDI AUC', type: 'line', data: fdiL, smooth: true, symbol: 'none', connectNulls: false,
          lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' } },
      ],
    };
  });

  return (
    <div
      id="page-wm"
      style={{display:isActive?'flex':'none',flexDirection:'column',height:'100%',overflow:'hidden'}}
    >
      <div
        className="wm-scroll"
        style={{flex:'1 1 0',minHeight:0,height:0,overflowY:'scroll',
                display:'flex',flexDirection:'column',gap:14,padding:'18px 20px 40px'}}
      >
        {/* Header */}
        <div>
          <div className="wm-title">Wealth Management — Portfolio Managers</div>
          <div className="wm-sub">SEBI-registered portfolio managers: AUM, client count, and asset class breakdown</div>
        </div>

        {/* Filters */}
        <div className="wm-filters">
          <div className="wm-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`wm-btn${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="wm-range">
            <span className="wm-lbl">From</span>
            <select className="wm-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="wm-lbl">To</span>
            <select className="wm-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards — 3 columns */}
        <div className="wm-kpis">
          <div className="wm-kpi">
            <div className="wm-kpi-lbl">TOTAL PM AUM (GRAND TOTAL)</div>
            <div className="wm-kpi-val">{wmKpi.totalAum.value}</div>
            <div className="wm-kpi-note">{wmKpi.totalAum.note}</div>
          </div>
          <div className="wm-kpi">
            <div className="wm-kpi-lbl">DISCRETIONARY AUM</div>
            <div className="wm-kpi-val">{wmKpi.discrAum.value}</div>
            <div className="wm-kpi-note">{wmKpi.discrAum.note}</div>
          </div>
          <div className="wm-kpi">
            <div className="wm-kpi-lbl">NUMBER OF CLIENTS</div>
            <div className="wm-kpi-num">{wmKpi.clients.value}</div>
            <div className="wm-kpi-note">{wmKpi.clients.note}</div>
          </div>
        </div>

        {/* Portfolio Manager AUM Trend */}
        <div className="wm-card">
          <div className="wm-card-hd">
            <div className="wm-card-hd-l">
              <span className="wm-card-title">Portfolio Manager AUM Trend</span>
              <span className="wm-badge wm-badge-pm">PM/AUM</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rPmTrend.current, 'Portfolio Manager AUM Trend')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="wm-card-sub">₹ Lakh Crore · discretionary vs grand total (inc. EPFO/PF)</div>
          {loading ? <div className="chart-loader" style={{height: 260}} /> : <div ref={rPmTrend} style={{height:260}} />}
        </div>

        {/* PMS Summary Cross-Check | PMS Service Mix */}
        <div className="wm-row2">
          <div className="wm-card">
            <div className="wm-card-hd">
              <div className="wm-card-hd-l">
                <span className="wm-card-title">PMS Summary Cross-Check</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rPmsSumm.current, 'PMS Summary Cross-Check')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="wm-card-sub">Curated portfolio_manager_summary table · total AUM and client count</div>
            {loading ? <div className="chart-loader" style={{height: 260}} /> : <div ref={rPmsSumm} style={{height:260}} />}
          </div>
          <div className="wm-card">
            <div className="wm-card-hd">
              <div className="wm-card-hd-l">
                <span className="wm-card-title">PMS Service Mix</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rSvcMix.current, 'PMS Service Mix')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="wm-card-sub">Latest summary period Jan 26</div>
            {loading ? <div className="chart-loader" style={{height: 260}} /> : <div ref={rSvcMix} style={{height:260}} />}
          </div>
        </div>

        {/* Client Count Trend | AUM by Asset Class */}
        <div className="wm-row2">
          <div className="wm-card">
            <div className="wm-card-hd">
              <div className="wm-card-hd-l">
                <span className="wm-card-title">Client Count Trend</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rCliTrend.current, 'Client Count Trend')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="wm-card-sub">Number of PM clients over time</div>
            {loading ? <div className="chart-loader" style={{height: 300}} /> : <div ref={rCliTrend} style={{height:300}} />}
          </div>
          <div className="wm-card">
            <div className="wm-card-hd">
              <div className="wm-card-hd-l">
                <span className="wm-card-title">AUM by Asset Class (Latest)</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rAssetCls.current, 'AUM by Asset Class (Latest)')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="wm-card-sub">₹ Lakh Crore · portfolio composition</div>
            {loading ? <div className="chart-loader" style={{height: 380}} /> : <div ref={rAssetCls} style={{height:380}} />}
          </div>
        </div>

        {/* Foreign VC — Sectoral Allocation */}
        <div className="wm-card">
          <div className="wm-card-hd">
            <div className="wm-card-hd-l">
              <span className="wm-card-title">Foreign VC — Sectoral Allocation</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rVcSect.current, 'Foreign VC — Sectoral Allocation')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="wm-card-sub">Latest month investment breakdown</div>
          {loading ? <div className="chart-loader" style={{height: 240}} /> : <div ref={rVcSect} style={{height:240}} />}
        </div>

        {/* Custodian AUC — FPI vs FDI */}
        <div className="wm-card">
          <div className="wm-card-hd">
            <div className="wm-card-hd-l">
              <span className="wm-card-title">Custodian AUC — FPI vs FDI</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rCustAuc.current, 'Custodian AUC — FPI vs FDI')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="wm-card-sub">₹ Lakh Crore</div>
          {loading ? <div className="chart-loader" style={{height: 260}} /> : <div ref={rCustAuc} style={{height:260}} />}
        </div>

      </div>

      <style>{`
        .wm-scroll::-webkit-scrollbar{width:6px}
        .wm-scroll::-webkit-scrollbar-track{background:transparent}
        .wm-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        .wm-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .wm-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}

        .wm-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .wm-btn-group{display:flex;gap:4px}
        .wm-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .wm-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .wm-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .wm-range{display:flex;align-items:center;gap:6px}
        .wm-lbl{font-size:11px;color:var(--tx3,#888)}
        .wm-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        .wm-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .wm-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:14px 16px}
        .wm-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;line-height:1.3}
        .wm-kpi-val{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.4px;line-height:1.1}
        .wm-kpi-num{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.5px;line-height:1}
        .wm-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px;line-height:1.4}

        .wm-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .wm-card-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
        .wm-card-hd-l{display:flex;align-items:center;gap:8px}
        .wm-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .wm-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:14px}
        .wm-badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px;
          background:rgba(14,116,144,.2);color:#22d3ee;border:1px solid rgba(14,116,144,.35)}
        .wm-badge-pm{background:rgba(74,144,217,.15);color:#7ab8f5;border-color:rgba(74,144,217,.3)}
        .wm-icon{width:14px;height:14px;color:var(--tx3,#888);opacity:.6;cursor:pointer;flex-shrink:0}
        .wm-icon:hover{opacity:1}

        .wm-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      `}</style>
    </div>
  );
}
