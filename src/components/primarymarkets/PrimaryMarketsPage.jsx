import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchQipMonthlyAmount,
  fetchQipMonthlyCount,
  fetchCorpDebtPrivatePlacement,
  fetchPreferentialAllotments,
  fetchSastOffers,
  fetchOfsFinancial,
  fetchOfsNonFinancial,
} from '../../api/primaryMarketsApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';

/* ── Chart helpers ── */
const isDk = () => document.documentElement.getAttribute('data-theme') === 'dark';
function cc() {
  const d = isDk();
  return {
    text:  d ? '#ffffff' : '#1a1a1a', text2: d ? '#f0f0f0' : '#1a1c18',
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

export default function PrimaryMarketsPage({ isActive }) {
  useThemeWatcher();
  const [period,     setPeriod]     = useState('All');
  const [fromYear,   setFromYear]   = useState('2014');
  const [toYear,     setToYear]     = useState('2026');
  const [instrument, setInstrument] = useState('QIP');

  const fmtP = p => {
    if (!p) return '';
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y, m] = p.split('-');
    return `${M[+m - 1]} ${y.slice(2)}`;
  };
  const fmtAmt = v => v >= 1e5 ? `₹${(v/1e5).toFixed(1)}L Cr` : v >= 1e3 ? `₹${(v/1e3).toFixed(0)}K Cr` : `₹${Math.round(v)} Cr`;

  const [qipMonthlyData, setQipMonthlyData] = useState({ months: [], values: [] });
  const [qipAnnualData,  setQipAnnualData]  = useState({ years: [], values: [] });
  const [qipCountData,    setQipCountData]    = useState({ years: [], values: [] });
  const [qipCountMonthly, setQipCountMonthly] = useState({});
  const [privData,        setPrivData]        = useState({ years: [], debt: [], pref: [] });
  const [sastData,        setSastData]        = useState({ months: [], values: [] });
  const [ofsData,         setOfsData]         = useState({ months: [], values: [] });
  const [loadCount, setLoadCount] = useState(0);
  const TOTAL_LOADS = 5;
  const loading = loadCount < TOTAL_LOADS;

  const [qipKpi, setQipKpi] = useState({
    totalQip:    { value: '—', note: '2014 – 2026' },
    recordMonth: { value: '—', note: '— raised' },
    fy2025:      { value: '—', note: 'FY 2024-25 total' },
    covidBoom:   { value: '—', note: '— corporates raised amid FPI selling' },
  });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchQipMonthlyAmount().catch(() => []).then(raw => {
      const list = toList(raw);
      if (!list.length) return;

      // 1. Total all-time sum
      const total = list.reduce((s, r) => s + +(r.value ?? r.metric_value ?? 0), 0);

      // 2. Record month (MAX single month)
      let recVal = 0, recPeriod = '';
      list.forEach(r => {
        const v = +(r.value ?? r.metric_value ?? 0);
        if (v > recVal) { recVal = v; recPeriod = r.period; }
      });

      // 3. FY 2024-25 (Apr 2024 – Mar 2025)
      const fy2025Total = list
        .filter(r => r.period >= '2024-04' && r.period <= '2025-03')
        .reduce((s, r) => s + +(r.value ?? r.metric_value ?? 0), 0);

      // 4. COVID boom — group by calendar year, find first year where amount > prev year × 2
      const byYear = {};
      list.forEach(r => {
        const yr = r.period.split('-')[0];
        byYear[yr] = (byYear[yr] || 0) + +(r.value ?? r.metric_value ?? 0);
      });
      const yrs = Object.keys(byYear).sort();
      let boomYear = '', boomAmt = 0;
      for (let i = 1; i < yrs.length; i++) {
        const curr = byYear[yrs[i]], prev = byYear[yrs[i - 1]];
        if (prev > 0 && curr > prev * 2 && !boomYear) { boomYear = yrs[i]; boomAmt = curr; }
      }

      // Monthly chart data
      setQipMonthlyData({
        months: list.map(r => fmtP(r.period)),
        values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
      });

      // Annual chart data — group by calendar year (reuse byYear from above)
      const sortedYears = Object.keys(byYear).sort();
      setQipAnnualData({
        years:  sortedYears,
        values: sortedYears.map(y => +byYear[y].toFixed(0)),
      });

      const firstP = list[0]?.period, lastP = list[list.length - 1]?.period;
      setQipKpi({
        totalQip:    { value: fmtAmt(total), note: `${fmtP(firstP)} – ${fmtP(lastP)}` },
        recordMonth: { value: fmtP(recPeriod), note: `${fmtAmt(recVal)} raised` },
        fy2025:      { value: fy2025Total > 0 ? fmtAmt(fy2025Total) : '—', note: 'FY 2024-25 total' },
        covidBoom:   {
          value: boomYear || '—',
          note: boomYear ? `${fmtAmt(boomAmt)} — corporates raised amid FPI selling` : '—',
        },
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchQipMonthlyCount().catch(() => []).then(raw => {
      const list = toList(raw);
      if (!list.length) return;
      const byYear = {};
      list.forEach(r => {
        const yr = r.period.split('-')[0];
        byYear[yr] = (byYear[yr] || 0) + +(r.value ?? r.metric_value ?? 0);
      });
      const years = Object.keys(byYear).sort();
      setQipCountData({ years, values: years.map(y => +byYear[y].toFixed(0)) });
      // Store monthly count keyed by formatted period for top-10 join
      const monthMap = {};
      list.forEach(r => { monthMap[fmtP(r.period)] = +(r.value ?? r.metric_value ?? 0); });
      setQipCountMonthly(monthMap);
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);

    Promise.all([
      fetchCorpDebtPrivatePlacement().catch(() => []),
      fetchPreferentialAllotments().catch(() => []),
    ]).then(([debtRaw, prefRaw]) => {
      const toMap = raw => {
        const m = {};
        toList(raw).forEach(r => {
          const yr = r.period.split('-')[0];
          m[yr] = (m[yr] || 0) + +(r.value ?? r.metric_value ?? 0);
        });
        return m;
      };
      const debtMap = toMap(debtRaw);
      const prefMap = toMap(prefRaw);
      const allYears = [...new Set([...Object.keys(debtMap), ...Object.keys(prefMap)])].sort();
      setPrivData({
        years: allYears,
        debt:  allYears.map(y => debtMap[y] ?? 0),
        pref:  allYears.map(y => prefMap[y] ?? 0),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchSastOffers().catch(() => []).then(raw => {
      const list = toList(raw);
      if (!list.length) return;
      setSastData({
        months: list.map(r => fmtP(r.period)),
        values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    // OFS Pipeline: sum financial (175) + non-financial (177) amount by month
    Promise.all([
      fetchOfsFinancial().catch(() => []),
      fetchOfsNonFinancial().catch(() => []),
    ]).then(([finRaw, nonFinRaw]) => {
      const finList    = toList(finRaw);
      const nonFinList = toList(nonFinRaw);
      const map = {};
      finList.forEach(r    => { map[r.period] = (map[r.period] || 0) + +(r.value ?? r.metric_value ?? 0); });
      nonFinList.forEach(r => { map[r.period] = (map[r.period] || 0) + +(r.value ?? r.metric_value ?? 0); });
      const periods = Object.keys(map).sort();
      if (!periods.length) { setLoadCount(c => c + 1); return; }
      setOfsData({
        months: periods.map(fmtP),
        values: periods.map(p => +(map[p] / 1000).toFixed(2)), // crore → thousand crore
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const top10Rows = (() => {
    const { months, values } = qipMonthlyData;
    if (!months.length) return [];
    const entries = months.map((m, i) => ({ month: m, val: values[i] }));
    entries.sort((a, b) => b.val - a.val);
    const top = entries.slice(0, 10);
    const maxVal = top[0]?.val ?? 1;
    return top.map((r, i) => {
      const issues = qipCountMonthly[r.month] ?? null;
      const avg = issues ? r.val / issues : null;
      return {
        rank:   i + 1,
        month:  r.month,
        raised: fmtAmt(r.val),
        issues: issues != null ? issues : '—',
        avg:    avg != null ? fmtAmt(avg) : '—',
        pct:    Math.round(r.val / maxVal * 100),
      };
    });
  })();

  const _fy = { from: parseInt(fromYear) || 2000, to: parseInt(toYear) || 2099 };
  const fyMonth = (months, ...arrs) => {
    const keep = months.map(m => { const yy = parseInt((m || '').split(' ')[1]); const yr = isNaN(yy) ? NaN : (yy <= 30 ? 2000 + yy : 1900 + yy); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [months.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };
  const fyYears = (years, ...arrs) => {
    const keep = years.map(y => { const yr = parseInt(y); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [years.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };

  const rMonthly = useRef(null);
  const rAnnQip  = useRef(null);
  const rQipCnt  = useRef(null);
  const rPriv    = useRef(null);
  const rSast    = useRef(null);
  const rOfsPipe = useRef(null);
  const rOfsAnn  = useRef(null);

  /* Chart 1 — Monthly QIP Fundraising */
  useChart(rMonthly, () => {
    const c = cc();
    const [months, values] = fyMonth(qipMonthlyData.months, qipMonthlyData.values);
    const iv = Math.floor(months.length / 10) || 1;
    return {
      backgroundColor:'transparent',
      grid: GRID(52, 20, 28, 36),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>${fmtAmt(p[0].value)}</b>` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v >= 1000 ? (v/1000).toFixed(0)+'K' : String(v)), min: 0 },
      series: [{
        type:'bar', data: values, barMaxWidth: 6,
        itemStyle:{ color: '#7c4fd4' },
      }],
    };
  });

  /* Chart 2a — Annual QIP Activity */
  useChart(rAnnQip, () => {
    const c = cc();
    const [years, values] = fyYears(qipAnnualData.years, qipAnnualData.values);
    return {
      backgroundColor:'transparent',
      grid: GRID(52, 16, 28, 32),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>${fmtAmt(p[0].value)}</b>` },
      xAxis: XAX(years, c, 0),
      yAxis: { ...YAX(c, v => v === 0 ? '0K' : (v/1000).toFixed(0)+'K'), min: 0 },
      series: [{
        type:'bar', data: values, barMaxWidth: 18,
        itemStyle:{ color: {
          type:'linear', x:0, y:0, x2:0, y2:1,
          colorStops:[{offset:0,color:'#9b59f0'},{offset:1,color:'#6d3fc0'}],
        }},
      }],
    };
  });

  /* Chart 2b — QIP Issue Count */
  useChart(rQipCnt, () => {
    const c = cc();
    const [years, values] = fyYears(qipCountData.years, qipCountData.values);
    return {
      backgroundColor:'transparent',
      grid: GRID(36, 16, 28, 32),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>${p[0].value} issues</b>` },
      xAxis: XAX(years, c, 0),
      yAxis: { ...YAX(c, v => String(v)), min: 0 },
      series: [{
        type:'bar', data: values, barMaxWidth: 18,
        itemStyle:{ color: {
          type:'linear', x:0, y:0, x2:0, y2:1,
          colorStops:[{offset:0,color:'#22d3ee'},{offset:1,color:'#0e7490'}],
        }},
      }],
    };
  });

  /* Chart 3 — Private Placement */
  useChart(rPriv, () => {
    const c = cc();
    const [years, debt, pref] = fyYears(privData.years, privData.debt, privData.pref);
    const fmtV = v => v >= 1e5 ? (v/1e5).toFixed(1)+'L' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : String(Math.round(v));
    return {
      backgroundColor:'transparent',
      grid: GRID(52, 24, 28, 42),
      tooltip: { ...TT(c), trigger: 'axis',
        formatter: p => `${p[0].axisValue}<br/>` + p.map(s => `${s.marker}${s.seriesName}: <b>₹${fmtV(+s.value)} Cr</b>`).join('<br/>') },
      legend:{bottom:4,textStyle:{color:c.text,fontSize:9},itemWidth:10,itemHeight:8},
      xAxis: XAX(years, c, 0),
      yAxis: { ...YAX(c, v => v === 0 ? '0' : fmtV(v)), min: 0 },
      series: [
        { name:'Corporate Debt',         type:'bar', data: debt, barMaxWidth: 16, itemStyle:{ color:'#4a90d9' } },
        { name:'Preferential Allotment', type:'bar', data: pref, barMaxWidth: 16, itemStyle:{ color:'#e07b39' } },
      ],
    };
  });

  /* Chart 4 — Takeover SAST Offers */
  useChart(rSast, () => {
    const c = cc();
    const [months, values] = fyMonth(sastData.months, sastData.values);
    const iv = Math.floor(months.length / 10) || 1;
    return {
      backgroundColor:'transparent',
      grid: GRID(36, 20, 28, 36),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>${p[0].value}</b> offers` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => String(v)), min: 0 },
      series: [{
        name:'# Offers', type:'bar', data: values, barMaxWidth: 14,
        itemStyle:{ color: {
          type:'linear', x:0, y:0, x2:0, y2:1,
          colorStops:[{offset:0,color:'#22d3ee'},{offset:1,color:'#0e7490'}],
        }},
      }],
    };
  });

  /* Chart 5a — OFS Pipeline */
  useChart(rOfsPipe, () => {
    const c = cc();
    const [months, values] = fyMonth(ofsData.months, ofsData.values);
    if (!months.length) return null;
    const iv = Math.floor(months.length / 10) || 1;
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 16, 28, 36),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>₹${(+p[0].value).toFixed(1)}K Cr</b>` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v === 0 ? '0' : v + 'K'), min: 0 },
      series: [{
        type: 'bar', data: values, barMaxWidth: 18,
        itemStyle: { color: '#22d3ee' },
      }],
    };
  });

  /* Chart 5b — OFS Annual Run-rate */
  useChart(rOfsAnn, () => {
    const c = cc();
    const [months, values] = fyMonth(ofsData.months, ofsData.values);
    if (!months.length) return null;
    const byYear = {};
    months.forEach((m, i) => {
      const yr = m.split(' ')[1] ? '20' + m.split(' ')[1] : m;
      byYear[yr] = (byYear[yr] || 0) + values[i];
    });
    const years = Object.keys(byYear).sort();
    const annVals = years.map(y => +byYear[y].toFixed(2));
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 16, 28, 32),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>₹${(+p[0].value).toFixed(1)}K Cr</b>` },
      xAxis: XAX(years, c, 0),
      yAxis: { ...YAX(c, v => v === 0 ? '0' : v + 'K'), min: 0 },
      series: [{
        type: 'bar', data: annVals, barMaxWidth: 24,
        itemStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1, colorStops:[{offset:0,color:'#22d3ee'},{offset:1,color:'#0e7490'}] } },
      }],
    };
  });

  return (
    <div
      id="page-prim"
      style={{display:isActive?'flex':'none',flexDirection:'column',height:'100%',overflow:'hidden'}}
    >
      <div
        className="pm-scroll"
        style={{flex:'1 1 0',minHeight:0,height:0,overflowY:'scroll',
                display:'flex',flexDirection:'column',gap:14,padding:'18px 20px 40px'}}
      >
        {/* Header */}
        <div>
          <div className="pm-title">Primary Markets</div>
          <div className="pm-sub">QIP &amp; IPO fundraising — how Indian corporates raise institutional capital</div>
        </div>

        {/* Filters */}
        <div className="pm-filters">
          <div className="pm-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`pm-btn${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="pm-range">
            <span className="pm-lbl">From</span>
            <select className="pm-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="pm-lbl">To</span>
            <select className="pm-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards — 5 columns */}
        <div className="pm-kpis">
          <div className="pm-kpi">
            <div className="pm-kpi-lbl">TOTAL QIP RAISED</div>
            <div className="pm-kpi-val">{qipKpi.totalQip.value}</div>
            <div className="pm-kpi-note">{qipKpi.totalQip.note}</div>
          </div>
          <div className="pm-kpi">
            <div className="pm-kpi-lbl">RECORD QIP MONTH</div>
            <div className="pm-kpi-val pm-kpi-val-lg">{qipKpi.recordMonth.value}</div>
            <div className="pm-kpi-note">{qipKpi.recordMonth.note}</div>
          </div>
          <div className="pm-kpi">
            <div className="pm-kpi-lbl">FY 2025 QIP TOTAL</div>
            <div className="pm-kpi-val">{qipKpi.fy2025.value}</div>
            <div className="pm-kpi-note">{qipKpi.fy2025.note}</div>
          </div>
          <div className="pm-kpi">
            <div className="pm-kpi-lbl">COVID QIP BOOM</div>
            <div className="pm-kpi-val pm-kpi-val-lg">{qipKpi.covidBoom.value}</div>
            <div className="pm-kpi-note">{qipKpi.covidBoom.note}</div>
          </div>
          <div className="pm-kpi">
            <div className="pm-kpi-lbl">LATEST OFS</div>
            <div className="pm-kpi-val">
              {ofsData.values.length
                ? `₹${ofsData.values[ofsData.values.length - 1].toFixed(1)}K Cr`
                : '—'}
            </div>
            <div className="pm-kpi-note">
              {ofsData.months.length
                ? `OFS amount · ${ofsData.months[ofsData.months.length - 1]}`
                : 'Latest OFS amount'}
            </div>
          </div>
        </div>

        {/* Instrument filter */}
        {/* <div className="pm-instrument">
          <span className="pm-instr-lbl">Instrument:</span>
          {['QIP','IPO','ALL'].map(ins => (
            <button key={ins} className={`pm-instr-btn${instrument===ins?' on':''}`}
              onClick={() => setInstrument(ins)}>{ins}</button>
          ))}
        </div> */}

        {/* Chart 1: Monthly QIP Fundraising */}
        <div className="pm-card">
          <div className="pm-card-hd">
            <div className="pm-card-hd-left">
              <span className="pm-card-title">Monthly QIP Fundraising</span>
              <span className="pm-badge pm-badge-teal">119 months</span>
            </div>
            
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rMonthly.current, 'Monthly QIP Fundraising')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="pm-card-sub">₹ Thousand Crore · institutional capital raising</div>
          {loading ? <div className="chart-loader" style={{height: 250}} /> : <div ref={rMonthly} style={{height:250}} />}
        </div>

        {/* Charts 2: Annual QIP + Issue Count side by side */}
        <div className="pm-row2">
          <div className="pm-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div className="pm-card-title">Annual QIP Activity</div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rAnnQip.current, 'Annual QIP Activity')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="pm-card-sub">₹ Thousand Crore · counter-cyclical to FPI flows</div>
            {loading ? <div className="chart-loader" style={{height: 240}} /> : <div ref={rAnnQip} style={{height:240}} />}
          </div>
          <div className="pm-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div className="pm-card-title">Number of QIP Issues Per Year</div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rQipCnt.current, 'Number of QIP Issues Per Year')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="pm-card-sub">Count of placements — 2023 saw record 143 issues</div>
            {loading ? <div className="chart-loader" style={{height: 240}} /> : <div ref={rQipCnt} style={{height:240}} />}
          </div>
        </div>

        {/* Top 10 Table */}
        <div className="pm-card">
          <div className="pm-card-hd">
            <div className="pm-card-hd-left">
              <span className="pm-card-title">Top 10 Largest QIP Months</span>
            </div>
            
          </div>
          <div className="pm-card-sub">Biggest single-month institutional capital raises</div>
          <table className="pm-table">
            <thead>
              <tr>
                <th className="pm-th pm-th-num">#</th>
                <th className="pm-th">Month</th>
                <th className="pm-th pm-th-r">Raised</th>
                <th className="pm-th pm-th-r">Issues</th>
                <th className="pm-th pm-th-r">Avg per QIP</th>
                <th className="pm-th">Scale</th>
              </tr>
            </thead>
            <tbody>
              {top10Rows.length === 0
                ? <tr><td colSpan={6} className="pm-td" style={{textAlign:'center',color:'var(--tx3,#888)'}}>Loading…</td></tr>
                : top10Rows.map(row => (
                <tr key={row.rank} className="pm-tr">
                  <td className="pm-td pm-td-num">{row.rank}</td>
                  <td className="pm-td pm-td-month">{row.month}</td>
                  <td className="pm-td pm-td-r pm-td-raised">{row.raised}</td>
                  <td className="pm-td pm-td-r">{row.issues}</td>
                  <td className="pm-td pm-td-r pm-td-avg">{row.avg}</td>
                  <td className="pm-td pm-td-scale">
                    <div className="pm-scale-bar" style={{width:`${row.pct}%`}} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart 3: Private Placement */}
        <div className="pm-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div className="pm-card-title">Private Placement Activity</div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rPriv.current, 'Private Placement Activity')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="pm-card-sub">₹ Thousand Crore — corporate debt vs preferential allotments</div>
          {loading ? <div className="chart-loader" style={{height: 260}} /> : <div ref={rPriv} style={{height:260}} />}
        </div>

        {/* Chart 4: Takeover SAST Offers */}
        <div className="pm-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div className="pm-card-title">Takeover Regulation Offers</div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rSast.current, 'Takeover Regulation Offers')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="pm-card-sub">SEBI SAST — number and value of offers</div>
          {loading ? <div className="chart-loader" style={{height: 220}} /> : <div ref={rSast} style={{height:220}} />}
        </div>

        {/* Charts 5: OFS Pipeline + OFS Annual Run-rate */}
        <div className="pm-row2">
          <div className="pm-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div className="pm-card-title">Offer for Sale Pipeline</div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rOfsPipe.current, 'Offer for Sale Pipeline')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="pm-card-sub">₹ Thousand Crore · secondary share-sale route from the dedicated OFS table</div>
            {loading ? <div className="chart-loader" style={{height: 220}} /> : <div ref={rOfsPipe} style={{height:220}} />}
          </div>
          <div className="pm-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div className="pm-card-title">OFS Annual Run-rate</div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rOfsAnn.current, 'OFS Annual Run-rate')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="pm-card-sub">Amount and offer count by calendar year</div>
            {loading ? <div className="chart-loader" style={{height: 220}} /> : <div ref={rOfsAnn} style={{height:220}} />}
          </div>
        </div>

      </div>

      <style>{`
        .pm-scroll::-webkit-scrollbar{width:6px}
        .pm-scroll::-webkit-scrollbar-track{background:transparent}
        .pm-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        .pm-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .pm-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}

        .pm-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .pm-btn-group{display:flex;gap:4px}
        .pm-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .pm-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .pm-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .pm-range{display:flex;align-items:center;gap:6px}
        .pm-lbl{font-size:11px;color:var(--tx3,#888)}
        .pm-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        .pm-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
        .pm-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:14px 16px}
        .pm-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px}
        .pm-kpi-val{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);
          letter-spacing:-.5px;line-height:1.1}
        .pm-kpi-val-lg{font-size:20px}
        .pm-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px;line-height:1.4}

        .pm-instrument{display:flex;align-items:center;gap:8px}
        .pm-instr-lbl{font-size:11px;color:var(--tx3,#888)}
        .pm-instr-btn{padding:3px 12px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .pm-instr-btn.on{background:#0e7490;border-color:#0e7490;color:#fff}
        .pm-instr-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}

        .pm-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .pm-card-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
        .pm-card-hd-left{display:flex;align-items:center;gap:8px}
        .pm-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .pm-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:10px}

        .pm-badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px}
        .pm-badge-teal{background:rgba(14,116,144,.2);color:#22d3ee;border:1px solid rgba(14,116,144,.35)}

        .pm-icon{width:14px;height:14px;color:var(--tx3,#888);opacity:.6;cursor:pointer;flex-shrink:0}
        .pm-icon:hover{opacity:1}

        .pm-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

        /* Table */
        .pm-table{width:100%;border-collapse:collapse;font-size:12px}
        .pm-th{padding:8px 12px;text-align:left;font-size:10px;font-weight:600;
          color:var(--tx3,#888);letter-spacing:.4px;text-transform:uppercase;
          border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .pm-th-num{width:40px}
        .pm-th-r{text-align:right}
        .pm-tr:hover{background:var(--sf2,rgba(255,255,255,.03))}
        .pm-td{padding:9px 12px;border-bottom:1px solid var(--bdr,rgba(255,255,255,.04));
          color:var(--tx2,#ccc);vertical-align:middle}
        .pm-td-num{color:var(--tx3,#888);font-size:11px}
        .pm-td-month{font-weight:600}
        .pm-td-r{text-align:right}
        .pm-td-raised{color:#9b59f0;font-weight:600}
        .pm-td-avg{color:#9b59f0}
        .pm-td-scale{width:160px;padding-right:16px}
        .pm-scale-bar{
          height:6px;border-radius:3px;
          background:linear-gradient(90deg,#9b59f0,#c770f0);
          max-width:100%;
        }
      `}</style>
    </div>
  );
}
