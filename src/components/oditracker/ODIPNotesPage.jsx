import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchOdiInclDerivatives,
  fetchOdiExclDerivatives,
  fetchOdiPctOfAuc,
  fetchOdiSourceFpiAuc,
} from '../../api/odiTrackerApi';
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

export default function ODIPNotesPage({ isActive }) {
  useThemeWatcher();
  const [period,   setPeriod]   = useState('All');
  const [fromYear, setFromYear] = useState('2014');
  const [toYear,   setToYear]   = useState('2026');

  const [odiTrendData, setOdiTrendData] = useState({ months: [], inclDeriv: [], exclDeriv: [] });
  const [odiPctData,    setOdiPctData]    = useState({ months: [], values: [] });
  const [odiVsAucData,  setOdiVsAucData]  = useState({ months: [], odiNotional: [], fpiAuc: [] });

  const [odiKpi, setOdiKpi] = useState({
    odiTotal:    { value: '—', note: '—' },
    odiPct:      { value: '—', note: 'Regulatory threshold: 10%' },
    fpiAuc:      { value: '—', note: 'Total FPI AUC' },
    peakPct:     { value: '—', note: 'All-time peak ratio' },
    declineFromPeak: { value: '—', note: 'Structural decline' },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);

    const fmtP = p => {
      if (!p) return '—';
      const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const [y, m] = p.split('-');
      return `${M[+m - 1]} ${y.slice(2)}`;
    };
    const fmtLCr = v => `₹${(v / 1e5).toFixed(2)} L Cr`;

    Promise.all([
      fetchOdiInclDerivatives().catch(() => []),
      fetchOdiExclDerivatives().catch(() => []),
      fetchOdiPctOfAuc().catch(() => []),
      fetchOdiSourceFpiAuc().catch(() => []),
    ]).then(([odiRaw, exclRaw, pctRaw, aucRaw]) => {
      const odiList  = toList(odiRaw);
      const exclList = toList(exclRaw);
      const pctList  = toList(pctRaw);
      const aucList  = toList(aucRaw);

      // Trend chart: align 138 (incl.) and 139 (excl.) by period
      const base = odiList.length >= exclList.length ? odiList : exclList;
      const exclMap = {};
      exclList.forEach(r => { exclMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      setOdiTrendData({
        months:    base.map(r => fmtP(r.period)),
        inclDeriv: base.map(r => +(r.value ?? r.metric_value ?? 0)),
        exclDeriv: base.map(r => exclMap[r.period] ?? null),
      });

      setOdiPctData({
        months: pctList.map(r => fmtP(r.period)),
        values: pctList.map(r => +(r.value ?? r.metric_value ?? 0)),
      });

      const aucBase = aucList.length >= odiList.length ? aucList : odiList;
      const odiMap  = {};
      odiList.forEach(r => { odiMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      const aucMap  = {};
      aucList.forEach(r => { aucMap[r.period]  = +(r.value ?? r.metric_value ?? 0); });
      setOdiVsAucData({
        months:      aucBase.map(r => fmtP(r.period)),
        odiNotional: aucBase.map(r => odiMap[r.period] ?? null),
        fpiAuc:      aucBase.map(r => aucMap[r.period] ?? null),
      });

      const lastVal = list => list.length ? +(list[list.length-1].value ?? list[list.length-1].metric_value ?? 0) : 0;
      const lastPeriod = list => list.length ? list[list.length-1].period : '';
      const maxVal = list => list.reduce((mx, r) => { const v = +(r.value ?? r.metric_value ?? 0); return v > mx ? v : mx; }, 0);

      const odiCurrent = lastVal(odiList);
      const odiPeak    = maxVal(odiList);
      const declinePct = odiPeak > 0 ? Math.round((odiPeak - odiCurrent) / odiPeak * 100) : null;
      const peakPctVal = maxVal(pctList);
      const latestPeriod = fmtP(lastPeriod(odiList));

      setOdiKpi({
        odiTotal:        { value: fmtLCr(odiCurrent), note: `as of ${latestPeriod}` },
        odiPct:          { value: `${(+lastVal(pctList)).toFixed(2)}%`, note: 'Regulatory threshold: 10%' },
        fpiAuc:          { value: fmtLCr(lastVal(aucList)), note: `as of ${fmtP(lastPeriod(aucList))}` },
        peakPct:         { value: `${peakPctVal.toFixed(1)}%`, note: 'All-time peak ratio' },
        declineFromPeak: { value: declinePct != null ? `${declinePct}%` : '—', note: 'Structural decline from ODI peak' },
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const _fy = { from: parseInt(fromYear) || 2000, to: parseInt(toYear) || 2099 };
  const fyMonth = (months, ...arrs) => {
    const keep = months.map(m => { const yy = parseInt((m || '').split(' ')[1]); const yr = isNaN(yy) ? NaN : (yy <= 30 ? 2000 + yy : 1900 + yy); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [months.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };

  const rOdiTrend = useRef(null);
  const rOdiPct   = useRef(null);
  const rOdiVsAuc = useRef(null);

  const mkLine = (name, data, color) => ({
    name, type: 'line', data, smooth: true,
    lineStyle: { color, width: 2 }, itemStyle: { color }, symbol: 'none',
  });

  useChart(rOdiTrend, () => {
    const c = cc();
    const [months, inclDeriv, exclDeriv] = fyMonth(odiTrendData.months, odiTrendData.inclDeriv, odiTrendData.exclDeriv);
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
      xAxis: XAX(months, c, 11),
      yAxis: { ...YAX(c, v => '₹' + Math.round(v/1000) + 'K Cr'), min: 0 },
      series: [
        {
          ...mkLine('ODI Excl. Derivatives', exclDeriv, '#4a90d9'),
          areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1,
            colorStops:[{ offset:0, color:'rgba(74,144,217,0.28)' },{ offset:1, color:'rgba(74,144,217,0.02)' }] } },
        },
        {
          ...mkLine('ODI Incl. Derivatives', inclDeriv, '#26c99a'),
          areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1,
            colorStops:[{ offset:0, color:'rgba(38,201,154,0.28)' },{ offset:1, color:'rgba(38,201,154,0.02)' }] } },
        },
      ],
    };
  });

  useChart(rOdiPct, () => {
    const c = cc();
    const [months, values] = fyMonth(odiPctData.months, odiPctData.values);
    return {
      backgroundColor: 'transparent',
      grid: { top:14, right:100, bottom:14, left:8, containLabel:true },
      tooltip: {
        ...TT(c),
        formatter: p => `${p[0].name}<br/>${p[0].marker}${(+p[0].value).toFixed(2)}%`,
      },
      xAxis: XAX(months, c, 11),
      yAxis: { ...YAX(c, v => v.toFixed(1) + '%'), min: 0 },
      series: [{
        name: 'ODI % of FPI AUC',
        type: 'line', data: values, smooth: true,
        lineStyle: { color: '#f0a040', width: 2 },
        itemStyle: { color: '#f0a040' },
        symbol: 'none',
        areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1,
          colorStops:[{ offset:0, color:'rgba(240,160,64,0.32)' },{ offset:1, color:'rgba(240,160,64,0.02)' }] } },
        markLine: {
          symbol: 'none',
          lineStyle: { color: '#e05060', type: 'dashed', width: 1.5 },
          label: {
            formatter: '10% Threshold', position: 'end',
            color: '#e05060', fontSize: 10,
          },
          data: [{ yAxis: 10 }],
        },
      }],
    };
  });

  useChart(rOdiVsAuc, () => {
    const c = cc();
    const [months, odiNotional, fpiAuc] = fyMonth(odiVsAucData.months, odiVsAucData.odiNotional, odiVsAucData.fpiAuc);
    const fmt = v => '₹' + Math.round(v / 1000) + 'K';
    return {
      backgroundColor: 'transparent',
      grid: { top:14, right:8, bottom:38, left:8, containLabel:true },
      tooltip: {
        ...TT(c),
        formatter: p => p.map(s =>
          `${s.marker}${s.seriesName}: ₹${Math.round(s.value / 1000)}K Cr`
        ).join('<br>'),
      },
      legend: { bottom: 4, textStyle: { color: c.text, fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
      xAxis: XAX(months, c, 11),
      yAxis: [
        { ...YAX(c, fmt), min: 0 },
        { type: 'value', axisLabel: { ...ALB(c), formatter: fmt },
          splitLine: { show: false }, axisLine: { show: false }, min: 0 },
      ],
      series: [
        { ...mkLine('ODI Notional', odiNotional, '#f0a040'), yAxisIndex: 0 },
        { ...mkLine('FPI AUC',      fpiAuc,      '#4a90d9'), yAxisIndex: 1 },
      ],
    };
  });

  return (
    <div
      id="page-odi"
      style={{display:isActive?'flex':'none',flexDirection:'column',height:'100%',overflow:'hidden'}}
    >
      <div
        className="odi-scroll"
        style={{flex:'1 1 0',minHeight:0,height:0,overflowY:'scroll',
                display:'flex',flexDirection:'column',gap:14,padding:'18px 20px 40px'}}
      >
        {/* Header */}
        <div>
          <div className="odi-title">ODI & P-Notes Tracker</div>
          <div className="odi-sub">Offshore Derivative Instruments (P-Notes) — foreign investor exposure via derivatives</div>
        </div>

        {/* Filters */}
        <div className="odi-filters">
          <div className="odi-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`odi-btn${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="odi-range">
            <span className="odi-lbl">From</span>
            <select className="odi-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="odi-lbl">To</span>
            <select className="odi-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* 5 KPI cards */}
        <div className="odi-kpis">
          <div className="odi-kpi">
            <div className="odi-kpi-lbl">LATEST ODI TOTAL</div>
            <div className="odi-kpi-val">{odiKpi.odiTotal.value}</div>
            <div className="odi-kpi-note">{odiKpi.odiTotal.note}</div>
          </div>
          <div className="odi-kpi">
            <div className="odi-kpi-lbl">ODI AS % OF FPI AUC</div>
            <div className="odi-kpi-pct">{odiKpi.odiPct.value}</div>
            <div className="odi-kpi-note">{odiKpi.odiPct.note}</div>
          </div>
          <div className="odi-kpi">
            <div className="odi-kpi-lbl">FPI AUC</div>
            <div className="odi-kpi-val">{odiKpi.fpiAuc.value}</div>
            <div className="odi-kpi-note">{odiKpi.fpiAuc.note}</div>
          </div>
          <div className="odi-kpi">
            <div className="odi-kpi-lbl">PEAK ODI/AUC %</div>
            <div className="odi-kpi-pct">{odiKpi.peakPct.value}</div>
            <div className="odi-kpi-note">{odiKpi.peakPct.note}</div>
          </div>
          <div className="odi-kpi">
            <div className="odi-kpi-lbl">ODI DECLINE FROM PEAK</div>
            <div className="odi-kpi-num">{odiKpi.declineFromPeak.value}</div>
            <div className="odi-kpi-note">{odiKpi.declineFromPeak.note}</div>
          </div>
        </div>

        {/* ODI / P-Notes: Ex-Derivatives vs Derivatives */}
        <div className="odi-card">
          <div className="odi-card-hd">
            <div className="odi-card-hd-l">
              <span className="odi-card-title">ODI / P-Notes: Ex-Derivatives vs Derivatives</span>
              <span className="odi-badge odi-badge-trend">ODI Trend</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rOdiTrend.current, 'ODI / P-Notes: Ex-Derivatives vs Derivatives')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="odi-card-sub">₹ Thousand Crore · ODI outstanding</div>
          {loading ? <div className="chart-loader" style={{height:260}} /> : <div ref={rOdiTrend} style={{height:260}} />}
        </div>

        {/* ODI as % of FPI AUC */}
        <div className="odi-card">
          <div className="odi-card-hd">
            <div className="odi-card-hd-l">
              <span className="odi-card-title">ODI as % of FPI AUC</span>
              <span className="odi-badge odi-badge-reg">Regulatory</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rOdiPct.current, 'ODI as % of FPI AUC')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="odi-card-sub">% · SEBI monitors this metric — 10% regulatory threshold</div>
          {loading ? <div className="chart-loader" style={{height:240}} /> : <div ref={rOdiPct} style={{height:240}} />}
        </div>

        {/* ODI Notional vs FPI AUC */}
        <div className="odi-card">
          <div className="odi-card-hd">
            <div className="odi-card-hd-l">
              <span className="odi-card-title">ODI Notional vs FPI AUC</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rOdiVsAuc.current, 'ODI Notional vs FPI AUC')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="odi-card-sub">₹ K Cr — ODI shrinking relative to growing AUC</div>
          {loading ? <div className="chart-loader" style={{height:260}} /> : <div ref={rOdiVsAuc} style={{height:260}} />}
        </div>

        {/* Data note */}
        <div className="odi-data-note">
          Data note: This series reports total ODI outstanding, ODI excluding derivatives, FPI AUC, and ODI as a share of FPI AUC; it does not provide an ODI equity-vs-debt split.
        </div>

      </div>

      <style>{`
        .odi-scroll::-webkit-scrollbar{width:6px}
        .odi-scroll::-webkit-scrollbar-track{background:transparent}
        .odi-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        .odi-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .odi-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}

        .odi-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .odi-btn-group{display:flex;gap:4px}
        .odi-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .odi-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .odi-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .odi-range{display:flex;align-items:center;gap:6px}
        .odi-lbl{font-size:11px;color:var(--tx3,#888)}
        .odi-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        .odi-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
        .odi-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:14px 16px}
        .odi-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;line-height:1.3}
        .odi-kpi-val{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.4px;line-height:1.1}
        .odi-kpi-pct{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.5px;line-height:1}
        .odi-kpi-num{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.5px;line-height:1}
        .odi-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px;line-height:1.4}

        .odi-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .odi-card-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
        .odi-card-hd-l{display:flex;align-items:center;gap:8px}
        .odi-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .odi-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:14px}
        .odi-badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px}
        .odi-badge-trend{background:rgba(74,144,217,.15);color:#7ab8f5;border:1px solid rgba(74,144,217,.3)}
        .odi-badge-reg{background:rgba(224,80,96,.15);color:#f08090;border:1px solid rgba(224,80,96,.3)}
        .odi-icon{width:14px;height:14px;color:var(--tx3,#888);opacity:.6;cursor:pointer;flex-shrink:0}
        .odi-icon:hover{opacity:1}

        .odi-data-note{font-size:10px;color:var(--tx4,#666);line-height:1.6;
          background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:12px 16px}
      `}</style>
    </div>
  );
}
