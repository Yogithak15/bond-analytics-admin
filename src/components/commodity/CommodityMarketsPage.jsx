import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchMcxFuturesTurnover,
  fetchIcomdexCompositeOpen,
  fetchIcomdexCompositeClose,
  fetchIcomdexBulldexClose,
  fetchIcomdexEnrgdexClose,
  fetchIcomdexMetldexClose,
  fetchExchangeMarketShare,
  fetchExchangeSnapshot,
} from '../../api/commodityMarketsApi';
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

const GRP_CFG = {
  Bullion:     { color: '#d4a820' },
  Energy:      { color: '#f0a040' },
  Metals:      { color: '#8090a0' },
  Agriculture: { color: '#2d8a4e' },
};
const GRP_ORDER = ['Bullion','Energy','Metals','Agriculture'];

export default function CommodityMarketsPage({ isActive }) {
  useThemeWatcher();
  const [period,   setPeriod]   = useState('All');
  const [fromYear, setFromYear] = useState('2014');
  const [toYear,   setToYear]   = useState('2026');
  const [groups, setGroups] = useState(new Set(GRP_ORDER));

  const [mcxData,       setMcxData]       = useState({ months: [], Bullion: [], Energy: [], Metals: [], Agriculture: [] });
  const [mcxAnnualData, setMcxAnnualData] = useState({ years: [], Bullion: [], Energy: [], Metals: [], Agriculture: [] });
  const [icomdexData, setIcomdexData] = useState({ months: [], values: [] });
  const [icomdexKpi,  setIcomdexKpi]  = useState({ latest: '—', yoy: '—', note: '—', bestName: '—', bestYoy: '—' });
  const [exchangeShareData,    setExchangeShareData]    = useState([]);
  const [exchangeSnapshotData, setExchangeSnapshotData] = useState([]);
  const [loadCount, setLoadCount] = useState(0);
  const TOTAL_LOADS = 2;
  const loading = loadCount < TOTAL_LOADS;

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const fmtP = p => {
      const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const [y, m] = p.split('-');
      return `${M[+m - 1]} ${y.slice(2)}`;
    };
    const DIMS = { Bullion: 34010, Energy: 34012, Metals: 34011, Agriculture: 34009 };
    Promise.all(
      Object.entries(DIMS).map(([name, dim]) =>
        fetchMcxFuturesTurnover(dim).catch(() => []).then(r => ({ name, list: toList(r) }))
      )
    ).then(results => {
      const periodSet = new Set();
      results.forEach(({ list }) => list.forEach(r => periodSet.add(r.period)));
      const periods = [...periodSet].sort();
      const maps = {};
      results.forEach(({ name, list }) => {
        maps[name] = {};
        list.forEach(r => { maps[name][r.period] = +(r.value ?? r.metric_value ?? 0); });
      });
      setMcxData({
        months:      periods.map(fmtP),
        Bullion:     periods.map(p => maps.Bullion[p]     ?? 0),
        Energy:      periods.map(p => maps.Energy[p]      ?? 0),
        Metals:      periods.map(p => maps.Metals[p]      ?? 0),
        Agriculture: periods.map(p => maps.Agriculture[p] ?? 0),
      });

      // Annual grouping: sum monthly values per calendar year
      const yearMap = {};
      results.forEach(({ name, list }) => {
        list.forEach(r => {
          const yr = r.period.split('-')[0];
          if (!yearMap[yr]) yearMap[yr] = { Bullion: 0, Energy: 0, Metals: 0, Agriculture: 0 };
          yearMap[yr][name] = (yearMap[yr][name] || 0) + +(r.value ?? r.metric_value ?? 0);
        });
      });
      const foundYears = Object.keys(yearMap).map(Number);
      const minY = Math.min(...foundYears);
      const maxY = Math.max(...foundYears);
      const allYears = [];
      for (let y = minY; y <= maxY; y++) allYears.push(String(y));
      setMcxAnnualData({
        years:       allYears,
        Bullion:     allYears.map(y => yearMap[y]?.Bullion     || 0),
        Energy:      allYears.map(y => yearMap[y]?.Energy      || 0),
        Metals:      allYears.map(y => yearMap[y]?.Metals      || 0),
        Agriculture: allYears.map(y => yearMap[y]?.Agriculture || 0),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const fmtP = p => {
      if (!p) return '—';
      const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const [y, m] = p.split('-');
      return `${M[+m - 1]} ${y.slice(2)}`;
    };

    const calcYoy = list => {
      if (!list.length) return null;
      const sorted = [...list].sort((a, b) => (a.period > b.period ? 1 : -1));
      const latest  = sorted[sorted.length - 1];
      const curVal  = +(latest.value ?? latest.metric_value ?? 0);
      const [y, m]  = latest.period.split('-');
      const prevPeriod = `${+y - 1}-${m.padStart(2, '0')}`;
      const prevEntry  = sorted.find(r => r.period === prevPeriod);
      if (!prevEntry) return null;
      const prevVal = +(prevEntry.value ?? prevEntry.metric_value ?? 0);
      return prevVal > 0 ? (curVal - prevVal) / prevVal * 100 : null;
    };

    Promise.all([
      fetchIcomdexCompositeOpen().catch(() => []),    // composite open — chart + KPI value
      fetchIcomdexCompositeClose().catch(() => []),   // composite close — composite YoY
      fetchIcomdexBulldexClose().catch(() => []),     // BULLDEX close
      fetchIcomdexEnrgdexClose().catch(() => []),     // ENRGDEX close
      fetchIcomdexMetldexClose().catch(() => []),     // METLDEX close
    ]).then(([openRaw, closeRaw, bullRaw, enrgRaw, metlRaw]) => {
      const openList  = toList(openRaw);
      const closeList = toList(closeRaw);

      if (openList.length) {
        const sorted = [...openList].sort((a, b) => (a.period > b.period ? 1 : -1));
        const months = sorted.map(r => fmtP(r.period));
        const values = sorted.map(r => +(r.value ?? r.metric_value ?? 0));
        setIcomdexData({ months, values });
        const latest = values[values.length - 1];
        setIcomdexKpi(prev => ({
          ...prev,
          latest: Math.round(latest).toLocaleString('en-IN'),
          note:   `as of ${months[months.length - 1]}`,
        }));
      }

      if (closeList.length) {
        const yoy = calcYoy(closeList);
        setIcomdexKpi(prev => ({
          ...prev,
          yoy: yoy != null ? `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%` : '—',
        }));
      }

      // Best sub-index: ranked by highest latest close value
      const SUB = [
        { name: 'MCX BULLDEX', list: toList(bullRaw) },
        { name: 'MCX ENRGDEX', list: toList(enrgRaw) },
        { name: 'MCX METLDEX', list: toList(metlRaw) },
      ];
      const latestVal = list => {
        if (!list.length) return 0;
        const sorted = [...list].sort((a, b) => (a.period > b.period ? 1 : -1));
        return +(sorted[sorted.length - 1].value ?? sorted[sorted.length - 1].metric_value ?? 0);
      };
      const ranked = SUB.map(s => ({ name: s.name, val: latestVal(s.list), yoy: calcYoy(s.list) }))
                        .filter(s => s.val > 0);
      if (ranked.length) {
        const best = ranked.reduce((a, b) => b.val > a.val ? b : a);
        const note = best.yoy != null
          ? `${best.yoy > 0 ? '+' : ''}${best.yoy.toFixed(1)}% YoY`
          : Math.round(best.val).toLocaleString('en-IN');
        setIcomdexKpi(prev => ({ ...prev, bestName: best.name, bestYoy: note }));
      }
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchExchangeMarketShare()
      .then(results => {
        const rows = results.map(({ name, color, raw }) => {
          const list = toList(raw);
          // filter to 2026 periods and sum
          const val2026 = list
            .filter(r => (r.period ?? '').startsWith('2026'))
            .reduce((s, r) => s + +(r.value ?? r.metric_value ?? 0), 0);
          return { name, color, value: val2026 };
        }).filter(r => r.value > 0);
        if (rows.length) setExchangeShareData(rows);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const sum2026 = list => list
      .filter(r => (r.period ?? '').startsWith('2026'))
      .reduce((s, r) => s + +(r.value ?? r.metric_value ?? 0), 0);
    fetchExchangeSnapshot()
      .then(results => {
        // group by exchange name
        const byExchange = {};
        results.forEach(({ name, color, metric, raw }) => {
          if (!byExchange[name]) byExchange[name] = { name, color, turnover: 0, contracts: 0 };
          const val = sum2026(toList(raw));
          if (metric === 'turnover')  byExchange[name].turnover  = val;
          if (metric === 'contracts') byExchange[name].contracts = val;
        });
        const rows = Object.values(byExchange).filter(r => r.turnover > 0 || r.contracts > 0);
        const totalTurnover = rows.reduce((s, r) => s + r.turnover, 0);
        const withShare = rows.map(r => ({
          ...r,
          share: totalTurnover > 0 ? (r.turnover / totalTurnover) * 100 : 0,
        })).sort((a, b) => b.turnover - a.turnover);
        if (withShare.length) setExchangeSnapshotData(withShare);
      }).catch(() => {});
  }, []);

  const rMonthly = useRef(null);
  const rAnnual  = useRef(null);
  const rShare   = useRef(null);
  const rIcomdex = useRef(null);

  function toggleGroup(g) {
    setGroups(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  }

  const fmt = v => Math.round(v / 1000) + 'K';
  const _fy = { from: parseInt(fromYear) || 2000, to: parseInt(toYear) || 2099 };
  const fyMonth = (months, ...arrs) => {
    const keep = months.map(m => { const yy = parseInt((m || '').split(' ')[1]); const yr = isNaN(yy) ? NaN : (yy <= 30 ? 2000 + yy : 1900 + yy); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [months.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };
  const fyYears = (years, ...arrs) => {
    const keep = years.map(y => { const yr = parseInt(y); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [years.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };

  useChart(rMonthly, () => {
    const c = cc();
    const active = GRP_ORDER.filter(g => groups.has(g));
    const [months, Bullion, Energy, Metals, Agriculture] = fyMonth(mcxData.months, mcxData.Bullion, mcxData.Energy, mcxData.Metals, mcxData.Agriculture);
    const fData = { months, Bullion, Energy, Metals, Agriculture };
    const iv = months.length > 0 ? Math.max(0, Math.round(months.length / 12) - 1) : 'auto';
    return {
      backgroundColor: 'transparent',
      grid: { top:38, right:20, bottom:38, left:8, containLabel:true },
      tooltip: {
        ...TT(c),
        formatter: p => p.map(s =>
          `${s.marker}${s.seriesName}: ₹${Math.round(s.value/1000)}K Cr`
        ).join('<br>'),
      },
      legend: { bottom: 4, textStyle: { color: c.text, fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => Math.round(v/1000) + 'K'), min: 0 },
      series: active.map(g => ({
        name: g, type: 'line', data: fData[g] ?? [], stack: 'total',
        smooth: true, symbol: 'none',
        lineStyle: { width: 0 },
        areaStyle: { color: GRP_CFG[g].color, opacity: 0.85 },
        itemStyle: { color: GRP_CFG[g].color },
      })),
    };
  });

  useChart(rAnnual, () => {
    const c = cc();
    const [years, Bullion, Energy, Metals, Agriculture] = fyYears(mcxAnnualData.years, mcxAnnualData.Bullion, mcxAnnualData.Energy, mcxAnnualData.Metals, mcxAnnualData.Agriculture);
    const fAnn = { years, Bullion, Energy, Metals, Agriculture };
    return {
      backgroundColor: 'transparent',
      grid: { top:14, right:20, bottom:38, left:8, containLabel:true },
      tooltip: {
        ...TT(c),
        formatter: p => p.map(s =>
          `${s.marker}${s.seriesName}: ₹${Math.round(s.value/1000)}K Cr`
        ).join('<br>'),
      },
      legend: { bottom: 4, textStyle: { color: c.text, fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
      xAxis: { type:'category', data: fAnn.years,
        axisLine:{lineStyle:{color:c.axis}}, axisTick:{show:false},
        axisLabel:{...ALB(c)} },
      yAxis: { ...YAX(c, v => Math.round(v/1000) + 'K'), min: 0 },
      series: GRP_ORDER.map(g => ({
        name: g, type: 'bar', data: fAnn[g] ?? [], stack: 'ann',
        barMaxWidth: 60, barCategoryGap: '35%',
        itemStyle: { color: GRP_CFG[g].color },
      })),
    };
  });

  /* ── Exchange Market Share 2026 — donut chart ── */
  useChart(rShare, () => {
    if (!exchangeShareData.length) return null;
    const c = cc();
    const total = exchangeShareData.reduce((s, d) => s + d.value, 0);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `${p.marker}<b>${p.name}</b><br/>Share: <b>${p.percent.toFixed(1)}%</b><br/>Turnover: <b>₹${Math.round(p.value / 1000).toLocaleString('en-IN')}K Cr</b>`,
      },
      legend: { show: false },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '52%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: p => `{name|${p.name} ${p.percent.toFixed(0)}%}`,
          rich: { name: { fontSize: 11, fontWeight: 600 } },
          color: c.text, fontSize: 11,
        },
        labelLine: { lineStyle: { color: c.grid } },
        data: exchangeShareData.map(d => ({
          name: d.name, value: d.value,
          itemStyle: { color: d.color },
          label: { color: d.color },
        })),
      }],
    };
  });

  useChart(rIcomdex, () => {
    const c = cc();
    const [months, values] = fyMonth(icomdexData.months, icomdexData.values);
    const iv = months.length > 0 ? Math.max(0, Math.round(months.length / 12) - 1) : 'auto';
    return {
      backgroundColor: 'transparent',
      grid: { top:30, right:20, bottom:14, left:8, containLabel:true },
      tooltip: { ...TT(c), formatter: p => `${p[0].name}<br/>${p[0].marker}${Math.round(p[0].value).toLocaleString('en-IN')}` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v.toLocaleString('en-IN')), min: 0 },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'none',
        lineStyle: { color: '#d4a820', width: 2 },
        areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1,
          colorStops:[{offset:0,color:'rgba(212,168,32,.45)'},{offset:1,color:'rgba(212,168,32,.04)'}] } },
        itemStyle: { color: '#d4a820' },
      }],
    };
  });

  return (
    <div
      id="page-comm"
      style={{display:isActive?'flex':'none',flexDirection:'column',height:'100%',overflow:'hidden'}}
    >
      <div
        className="cm-scroll"
        style={{flex:'1 1 0',minHeight:0,height:0,overflowY:'scroll',
                display:'flex',flexDirection:'column',gap:14,padding:'18px 20px 40px'}}
      >
        {/* Header */}
        <div>
          <div className="cm-title">Commodity Markets</div>
          <div className="cm-sub">MCX, NCDEX, BSE, NSE commodity derivatives — Bullion, Energy, Agriculture &amp; Metals</div>
        </div>

        {/* Filters */}
        <div className="cm-filters">
          <div className="cm-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`cm-btn${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="cm-range">
            <span className="cm-lbl">From</span>
            <select className="cm-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="cm-lbl">To</span>
            <select className="cm-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards — 3 columns */}
        <div className="cm-kpis">
          <div className="cm-kpi">
            <div className="cm-kpi-lbl">MCX ICOMDEX COMPOSITE</div>
            <div className="cm-kpi-idx">{icomdexKpi.latest}</div>
            <div className="cm-kpi-note">{icomdexKpi.note}</div>
          </div>
          <div className="cm-kpi">
            <div className="cm-kpi-lbl">ICOMDEX YOY</div>
            <div className="cm-kpi-num">{icomdexKpi.yoy}</div>
            <div className="cm-kpi-note">Year-on-year return</div>
          </div>
          <div className="cm-kpi">
            <div className="cm-kpi-lbl">BEST SUB-INDEX</div>
            <div className="cm-kpi-str">{icomdexKpi.bestName}</div>
            <div className="cm-kpi-note">{icomdexKpi.bestYoy}</div>
          </div>
        </div>

        {/* Group filter buttons */}
        <div className="cm-groups">
          <span className="cm-grp-lbl">Groups:</span>
          {GRP_ORDER.map(g => (
            <button
              key={g}
              className={`cm-grp-btn${groups.has(g) ? ' on' : ''}`}
              style={groups.has(g) ? { background: GRP_CFG[g].color, borderColor: GRP_CFG[g].color, color:'#fff' }
                                    : { borderColor: GRP_CFG[g].color, color: GRP_CFG[g].color }}
              onClick={() => toggleGroup(g)}
            >{g}</button>
          ))}
        </div>

        {/* MCX Commodity Futures Turnover by Group */}
        <div className="cm-card">
          <div className="cm-card-hd">
            <div className="cm-card-hd-l">
              <span className="cm-card-title">MCX Commodity Futures Turnover by Group</span>
              <span className="cm-badge cm-badge-mcx">MCX</span>
            </div>
           
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rMonthly.current, 'MCX Commodity Futures Turnover by Group')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="cm-card-sub">₹ Thousand Crore · filtered groups</div>
          {loading ? <div className="chart-loader" style={{height:280}} /> : <div ref={rMonthly} style={{height:280}} />}
        </div>

        {/* Annual Turnover | Exchange Share side by side */}
        <div className="cm-row2">
          <div className="cm-card">
            <div className="cm-card-hd">
              <div className="cm-card-hd-l">
                <span className="cm-card-title">Annual MCX Turnover by Commodity</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rAnnual.current, 'Annual MCX Turnover by Commodity')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="cm-card-sub">₹ Thousand Crore</div>
            {loading ? <div className="chart-loader" style={{height:280}} /> : <div ref={rAnnual} style={{height:280}} />}
          </div>
          <div className="cm-card">
            <div className="cm-card-hd">
              <div className="cm-card-hd-l">
                <span className="cm-card-title">Exchange Market Share 2026</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rShare.current, 'Exchange Market Share 2026')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="cm-card-sub">By futures turnover</div>
            <div ref={rShare} style={{height:280}} />
          </div>
        </div>

        {/* Commodity Exchanges — 2026 Snapshot table */}
        <div className="cm-card">
          <div className="cm-card-hd">
            <div className="cm-card-hd-l">
              <span className="cm-card-title">Commodity Exchanges — 2026 Snapshot</span>
            </div>
          </div>
          <div className="cm-card-sub">Total futures activity across all exchanges</div>
          <div className="cm-tbl-wrap">
            <table className="cm-tbl">
              <thead>
                <tr>
                  <th>Exchange</th>
                  <th className="cm-tr">Futures Turnover 2026</th>
                  <th className="cm-tr">Total Contracts</th>
                  <th className="cm-tr">Market Share</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {exchangeSnapshotData.length > 0 ? exchangeSnapshotData.map(row => {
                  const fmtTurnover = v => v >= 1e5 ? `₹${(v/1e5).toFixed(1)}L Cr` : v >= 1000 ? `₹${(v/1000).toFixed(1)}K Cr` : `₹${Math.round(v)} Cr`;
                  const fmtContracts = v => v >= 1e7 ? `${(v/1e7).toFixed(1)}Cr` : v >= 1e5 ? `${(v/1e5).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(Math.round(v));
                  return (
                    <tr key={row.name}>
                      <td style={{fontWeight:700}}>{row.name}</td>
                      <td className="cm-tr" style={{color: row.color, fontWeight:600}}>{fmtTurnover(row.turnover)}</td>
                      <td className="cm-tr" style={{color:'var(--tx2)'}}>{fmtContracts(row.contracts)}</td>
                      <td className="cm-tr" style={{fontWeight:600}}>{row.share.toFixed(1)}%</td>
                      <td style={{width:120, paddingLeft:8}}>
                        <div style={{background:'var(--bdr)',borderRadius:3,height:6,width:'100%'}}>
                          <div style={{background:row.color,borderRadius:3,height:6,width:`${Math.min(row.share,100)}%`}} />
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} style={{textAlign:'center',color:'var(--tx3)',padding:'20px'}}>No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MCX iCOMDEX Composite Index */}
        <div className="cm-card">
          <div className="cm-card-hd">
            <div className="cm-card-hd-l">
              <span className="cm-card-title">MCX iCOMDEX Composite Index</span>
              <span className="cm-badge cm-badge-idx">ICOMDEX</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rIcomdex.current, 'MCX iCOMDEX Composite Index')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="cm-card-sub">India's benchmark commodity index</div>
          {loading ? <div className="chart-loader" style={{height:260}} /> : <div ref={rIcomdex} style={{height:260}} />}
        </div>

      </div>

      <style>{`
        .cm-scroll::-webkit-scrollbar{width:6px}
        .cm-scroll::-webkit-scrollbar-track{background:transparent}
        .cm-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        .cm-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .cm-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}

        .cm-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .cm-btn-group{display:flex;gap:4px}
        .cm-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .cm-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .cm-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .cm-range{display:flex;align-items:center;gap:6px}
        .cm-lbl{font-size:11px;color:var(--tx3,#888)}
        .cm-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        .cm-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .cm-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:14px 16px}
        .cm-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;line-height:1.3}
        .cm-kpi-num{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.5px;line-height:1}
        .cm-kpi-idx{font-size:24px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.4px;line-height:1}
        .cm-kpi-str{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px;line-height:1.1}
        .cm-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px;line-height:1.4}

        .cm-groups{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .cm-grp-lbl{font-size:11px;color:var(--tx3,#888);margin-right:4px}
        .cm-grp-btn{padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;
          border:1.5px solid;background:transparent;transition:all .15s}

        .cm-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .cm-card-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
        .cm-card-hd-l{display:flex;align-items:center;gap:8px}
        .cm-card-hd-r{display:flex;align-items:center;gap:6px}
        .cm-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .cm-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:14px}
        .cm-badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px}
        .cm-badge-mcx{background:rgba(74,144,217,.15);color:#7ab8f5;border:1px solid rgba(74,144,217,.3)}
        .cm-badge-idx{background:rgba(212,168,32,.15);color:#d4a820;border:1px solid rgba(212,168,32,.35)}
        .cm-icon{width:14px;height:14px;color:var(--tx3,#888);opacity:.5;cursor:pointer;flex-shrink:0}
        .cm-icon:hover{opacity:1}

        .cm-row2{display:grid;grid-template-columns:2fr 1fr;gap:14px}

        .cm-tbl-wrap{overflow-x:auto;margin-top:4px}
        .cm-tbl{width:100%;border-collapse:collapse;font-size:12px}
        .cm-tbl th{padding:8px 12px;border-bottom:1px solid var(--bdr2,rgba(255,255,255,.12));
          color:var(--tx3,#888);font-weight:600;font-size:11px;text-align:left}
        .cm-tbl td{padding:12px 12px;border-bottom:1px solid var(--bdr,rgba(255,255,255,.05));
          color:var(--tx2,#ddd)}
        .cm-tbl tr:last-child td{border-bottom:none}
        .cm-tbl tr:hover td{background:var(--sf2,rgba(255,255,255,.03))}
        .cm-tr{text-align:right}
        .cm-tv{color:#4a90d9;font-weight:600}
        .cm-exch-name{font-weight:600;color:var(--tx2,#e0e0e0)}
        .cm-bar-track{height:8px;background:var(--sf2,rgba(255,255,255,.06));border-radius:4px;
          min-width:120px;overflow:hidden}
        .cm-bar-fill{height:100%;border-radius:4px;min-width:3px;transition:width .3s}
      `}</style>
    </div>
  );
}
