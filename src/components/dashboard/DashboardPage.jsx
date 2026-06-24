import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  fetchDashMarketComposition,
  fetchDashNcdTrend,
  fetchDashPrivatePlacementTrend,
  fetchDashCorpBondTradingTrend,
  fetchDashCorpBondOsByIssuer,
  fetchDashGsecMaturityProfile,
  fetchDashStripsMaturityProfile,
  fetchDashSdlMaturityProfile,
  fetchDashStateOutstandingShare,
  fetchDashNcdIpoAnnual,
  fetchDashPrivatePlacementAnnual,
  fetchDashCorpOsCard,
  fetchDashCorpOsLegacy,
  fetchDashCorpOsQuarterly,
  fetchDashCorpTradesQuarterly,
  fetchDashSdlTrend,
  fetchDashStripsTrend,
  fetchDashGsecTrend,
  fetchDashSgbTrend,
  fetchDashRbiPolicyRate,
} from '../../api/dashboardApi';

// Format crores → "52.9L" / "5.3K"
const fmtL = (cr) => {
  if (!cr && cr !== 0) return '—';
  if (cr >= 100000) return (cr / 100000).toFixed(1) + 'L';
  if (cr >= 1000)   return (cr / 1000).toFixed(1) + 'K';
  return String(Math.round(cr));
};

const NoData = () => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'6px',color:'var(--tx3)'}}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01"/><path d="M9 14s1 1.5 3 1.5 3-1.5 3-1.5" style={{stroke:'currentColor',strokeDasharray:'2 2'}}/></svg>
    <span style={{fontSize:'11px',fontWeight:500,letterSpacing:'.02em'}}>Data not available</span>
  </div>
);

const SGS = () => {
  const [tip, setTip] = useState(null);
  const onEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top) });
  };
  return (
    <>
      <span style={{cursor:'default'}} onMouseEnter={onEnter} onMouseLeave={() => setTip(null)}>SGS</span>
      {tip && ReactDOM.createPortal(
        <div style={{position:'fixed',left:tip.x,top:tip.y - 6,transform:'translateX(-50%) translateY(-100%)',background:'#1a1c18',color:'#f0f1ed',fontSize:'10.5px',fontWeight:500,whiteSpace:'nowrap',padding:'5px 10px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.12)',pointerEvents:'none',zIndex:99999,fontFamily:'system-ui,sans-serif',lineHeight:'1.4'}}>
          State Government Securities (SGS)
          <span style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',width:0,height:0,borderLeft:'5px solid transparent',borderRight:'5px solid transparent',borderTop:'5px solid #1a1c18'}} />
        </div>,
        document.body
      )}
    </>
  );
};

const SGB = () => {
  const [tip, setTip] = useState(null);
  const onEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top) });
  };
  return (
    <>
      <span style={{cursor:'default'}} onMouseEnter={onEnter} onMouseLeave={() => setTip(null)}>SGB</span>
      {tip && ReactDOM.createPortal(
        <div style={{position:'fixed',left:tip.x,top:tip.y - 6,transform:'translateX(-50%) translateY(-100%)',background:'#1a1c18',color:'#f0f1ed',fontSize:'10.5px',fontWeight:500,whiteSpace:'nowrap',padding:'5px 10px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.12)',pointerEvents:'none',zIndex:99999,fontFamily:'system-ui,sans-serif',lineHeight:'1.4'}}>
          Sovereign Gold Bond
          <span style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',width:0,height:0,borderLeft:'5px solid transparent',borderRight:'5px solid transparent',borderTop:'5px solid #1a1c18'}} />
        </div>,
        document.body
      )}
    </>
  );
};

export default function DashboardPage({ isActive }) {
  const [mktComp, setMktComp] = useState(null);

  // Fetch market composition on mount
  useEffect(() => {
    fetchDashMarketComposition('2025-26')
      .then(setMktComp)
      .catch(err => console.error('Market composition:', err));
  }, []);

  // Derived segment values — memoised so useEffect deps don't change on every render
  const segments  = useMemo(() => mktComp?.segments || [],                                    [mktComp]);
  const gsec      = useMemo(() => segments.find(s => s.instrument === 'G-Secs')    || {}, [segments]);
  const sdl       = useMemo(() => segments.find(s => s.instrument === 'SDLs')       || {}, [segments]);
  const corp      = useMemo(() => segments.find(s => s.instrument === 'Corp Bonds') || {}, [segments]);
  const grandTotal = mktComp?.grand_total_cr ?? null;

  // ── NCD IPO + Private Placements ────────────────────────────────────────────
  const [ncdData, setNcdData] = useState([]);
  const [ppData,  setPpData]  = useState([]);

  useEffect(() => {
    fetchDashNcdIpoAnnual()
      .then(rows => setNcdData(rows || []))
      .catch(err => console.error('NCD IPO fetch:', err));
    fetchDashPrivatePlacementAnnual()
      .then(rows => setPpData(rows || []))
      .catch(err => console.error('Private Placement fetch:', err));
  }, []);

  // Draw NCD vs PP chart once both datasets are loaded
  useEffect(() => {
    if (!ncdData.length || !ppData.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-ov-ncd-pp');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      // Build period-keyed maps and find last 8 common periods
      const ncdMap = Object.fromEntries(ncdData.map(r => [r.period, r.value]));
      const ppMap  = Object.fromEntries(ppData.map(r => [r.period, r.value]));

      // All NCD periods sorted
      const allPeriods = ncdData.map(r => r.period).sort();
      const periods    = allPeriods;

      const ncdVals = periods.map(p => Math.round(ncdMap[p] ?? 0));
      const ppVals  = periods.map(p => +(((ppMap[p] ?? 0) / 1000).toFixed(1)));  // ₹K Cr

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels: periods,
          datasets: [
            {
              label: 'NCD IPO (₹ Cr)',
              data: ncdVals,
              backgroundColor: 'rgba(0,68,123,.75)',
              borderColor: 'transparent',
              borderRadius: 4,
              borderSkipped: false,
              yAxisID: 'y',
            },
            {
              label: 'Pvt. Placement (₹K Cr)',
              data: ppVals,
              type: 'line',
              borderColor: '#2d8a4e',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#2d8a4e',
              pointBorderColor: '#fff',
              pointBorderWidth: 1.5,
              tension: 0.35,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) =>
                  ctx.datasetIndex === 0
                    ? ` NCD IPO: ₹${ctx.parsed.y.toLocaleString('en-IN')} Cr`
                    : ` Pvt. Placement: ₹${ctx.parsed.y}K Cr`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 10 }, maxRotation: 45 },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
              },
              border: { display: false },
              title: { display: true, text: '₹ Cr (NCD)', color: '#00447b', font: { size: 9 } },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'K',
              },
              border: { display: false },
              title: { display: true, text: '₹K Cr (PP)', color: '#2d8a4e', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 500);
    return () => clearTimeout(t);
  }, [ncdData, ppData]);

  // ── Corp Bonds Outstanding + Trades ─────────────────────────────────────────
  const [corpOsData,    setCorpOsData]    = useState([]);
  const [corpOsData2,   setCorpOsData2]   = useState([]);
  const [corpTradeData, setCorpTradeData] = useState([]);

  // Latest month value for Corp Bond Outstanding KPI card (source 5, metric 22, monthly)
  const [corpOsCardData, setCorpOsCardData] = useState([]);
  const corpOsLatestRow = corpOsCardData.length
    ? corpOsCardData.reduce((a, b) => (a.period > b.period ? a : b))
    : null;
  const corpOsLatest = corpOsLatestRow?.value ?? null;
  const corpOsLatestPeriod = corpOsLatestRow?.period ?? null;

  // Recomputed totals using latest-month Corp Bond data (falls back to FY comp value while loading)
  const corpForTotal     = corpOsLatest != null ? corpOsLatest : (corp.value_cr ?? null);
  const grandTotalLatest = (gsec.value_cr != null && sdl.value_cr != null && corpForTotal != null)
    ? +(gsec.value_cr) + +(sdl.value_cr) + +corpForTotal
    : (grandTotal ?? null);
  const gsecShareLatest  = grandTotalLatest ? (+(gsec.value_cr || 0) / grandTotalLatest) * 100 : null;
  const sdlShareLatest   = grandTotalLatest ? (+(sdl.value_cr  || 0) / grandTotalLatest) * 100 : null;
  const corpShareLatest  = grandTotalLatest ? (+(corpForTotal  || 0) / grandTotalLatest) * 100 : null;

  // Push pie data into the overview IndiaMap portal (rendered in App.jsx)
  useEffect(() => {
    if (gsec.value_cr == null) return;
    window._setOvPieData?.([
      { value: +(gsec.value_cr  || 0), color: '#2d8a4e', name: 'G-Secs' },
      { value: +(sdl.value_cr   || 0), color: '#0e7490', name: 'SGS'    },
      { value: +(corpForTotal   || 0), color: '#e07b39', name: 'Corp'   },
    ]);
  }, [gsec.value_cr, sdl.value_cr, corpForTotal]);

  useEffect(() => {
    fetchDashCorpOsCard()
      .then(rows => setCorpOsCardData(rows || []))
      .catch(err => console.error('Corp OS card fetch:', err));
    fetchDashCorpOsLegacy()
      .then(rows => setCorpOsData(rows || []))
      .catch(err => console.error('Corp OS fetch:', err));
    fetchDashCorpOsQuarterly()
      .then(rows => setCorpOsData2(rows || []))
      .catch(err => console.error('Corp OS2 fetch:', err));
    fetchDashCorpTradesQuarterly()
      .then(rows => setCorpTradeData(rows || []))
      .catch(err => console.error('Corp Trades fetch:', err));
  }, []);

  useEffect(() => {
    if (!corpTradeData.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-ov-corp-os');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const osMap1   = Object.fromEntries(corpOsData.map(r => [r.period, r.value]));
      const osMap2   = Object.fromEntries(corpOsData2.map(r => [r.period, r.value]));
      const tradeMap = Object.fromEntries(corpTradeData.map(r => [r.period, r.value]));

      // Union of all periods from both OS sources + trades, starting from 2020-Q2
      const allPeriods = new Set([
        ...corpOsData.map(r => r.period),
        ...corpOsData2.map(r => r.period),
        ...corpTradeData.map(r => r.period),
      ]);
      const periods = [...allPeriods].filter(p => p >= '2020-Q2').sort();

      // Source 5 (osMap2) has priority; fall back to source 4 (osMap1) if source 5 missing
      const osVals    = periods.map(p => {
        const raw = osMap2[p] != null ? +osMap2[p] : (osMap1[p] != null ? +osMap1[p] : null);
        return raw != null ? +((raw / 100000).toFixed(2)) : null;
      });
      const tradeVals = periods.map(p => tradeMap[p] != null ? +(( tradeMap[p] / 1000).toFixed(1))  : null);

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels: periods,
          datasets: [
            {
              label: 'Corp Bonds Outstanding (₹L Cr)',
              data: osVals,
              backgroundColor: 'rgba(0,68,123,.75)',
              borderColor: 'transparent',
              borderRadius: 4,
              borderSkipped: false,
              yAxisID: 'y',
            },
            {
              label: 'Trade Amount (₹K Cr)',
              data: tradeVals,
              type: 'line',
              borderColor: '#2d8a4e',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#2d8a4e',
              pointBorderColor: '#fff',
              pointBorderWidth: 1.5,
              tension: 0.35,
              spanGaps: true,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) =>
                  ctx.datasetIndex === 0
                    ? ` Outstanding: ₹${ctx.parsed.y}L Cr`
                    : ` Trades: ₹${ctx.parsed.y}K Cr`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 9 }, maxRotation: 45 },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'L',
              },
              border: { display: false },
              title: { display: true, text: '₹L Cr (Outstanding)', color: '#00447b', font: { size: 9 } },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'K',
              },
              border: { display: false },
              title: { display: true, text: '₹K Cr (Trades)', color: '#2d8a4e', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 500);
    return () => clearTimeout(t);
  }, [corpOsData, corpOsData2, corpTradeData]);

  // ── SDL Outstanding Yearly Trend ─────────────────────────────────────────────
  const [sdlTrendData, setSdlTrendData] = useState([]);

  useEffect(() => {
    fetchDashSdlTrend()
      .then(rows => setSdlTrendData(rows || []))
      .catch(err => console.error('SDL trend fetch:', err));
  }, []);

  useEffect(() => {
    if (!sdlTrendData.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-sdl-trend');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const sorted = [...sdlTrendData].sort((a, b) => a.period > b.period ? 1 : -1);
      const labels = sorted.map(r => r.period);
      const vals   = sorted.map(r => Math.round(r.value));

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '₹ Cr',
            data: vals,
            backgroundColor: 'rgba(0,68,123,.75)',
            borderColor: 'transparent',
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => ` Outstanding: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')} Cr`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 10 }, maxRotation: 45 },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v >= 100000 ? (v / 100000).toFixed(0) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
              },
              border: { display: false },
              title: { display: true, text: '₹ Cr', color: '#00447b', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [sdlTrendData]);

  // ── NCD Public Issues Yearly Trend ───────────────────────────────────────────
  const [ncdTrendData, setNcdTrendData] = useState(null);

  useEffect(() => {
    fetchDashNcdTrend()
      .then(setNcdTrendData)
      .catch(err => console.error('NCD trend fetch:', err));
  }, []);

  useEffect(() => {
    if (!ncdTrendData?.data?.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-ncd');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const rows   = ncdTrendData.data;
      const labels = rows.map(r => r.period);
      const amounts = rows.map(r => Math.round(r.amount_cr));
      const counts  = rows.map(r => r.issue_count);

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Amount (₹ Cr)',
              data: amounts,
              backgroundColor: 'rgba(0,68,123,.75)',
              borderColor: 'transparent',
              borderRadius: 4,
              borderSkipped: false,
              yAxisID: 'y',
            },
            {
              label: 'Issue Count',
              data: counts,
              type: 'line',
              borderColor: '#2d8a4e',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#2d8a4e',
              pointBorderColor: '#fff',
              pointBorderWidth: 1.5,
              tension: 0.35,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) =>
                  ctx.datasetIndex === 0
                    ? ` Amount: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')} Cr`
                    : ` Issues: ${ctx.parsed.y}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 10 }, maxRotation: 45 },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
              },
              border: { display: false },
              title: { display: true, text: '₹ Cr', color: '#00447b', font: { size: 9 } },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
              },
              border: { display: false },
              title: { display: true, text: 'Issue Count', color: '#2d8a4e', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [ncdTrendData]);

  // ── Private Placement Yearly Trend ───────────────────────────────────────────
  const [ppTrendData, setPpTrendData] = useState(null);

  useEffect(() => {
    fetchDashPrivatePlacementTrend()
      .then(setPpTrendData)
      .catch(err => console.error('PP trend fetch:', err));
  }, []);

  useEffect(() => {
    if (!ppTrendData?.data?.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-pp');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const rows    = ppTrendData.data;
      const labels  = rows.map(r => r.period);
      const amounts = rows.map(r => Math.round(r.amount_cr));
      const counts  = rows.map(r => r.issue_count);

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Amount (₹ Cr)',
              data: amounts,
              backgroundColor: 'rgba(0,68,123,.75)',
              borderColor: 'transparent',
              borderRadius: 4,
              borderSkipped: false,
              yAxisID: 'y',
            },
            {
              label: 'Issue Count',
              data: counts,
              type: 'line',
              borderColor: '#2d8a4e',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#2d8a4e',
              pointBorderColor: '#fff',
              pointBorderWidth: 1.5,
              tension: 0.35,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) =>
                  ctx.datasetIndex === 0
                    ? ` Amount: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')} Cr`
                    : ` Issues: ${ctx.parsed.y}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 10 }, maxRotation: 45 },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v >= 100000 ? (v / 100000).toFixed(0) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
              },
              border: { display: false },
              title: { display: true, text: '₹ Cr', color: '#00447b', font: { size: 9 } },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
              },
              border: { display: false },
              title: { display: true, text: 'Issue Count', color: '#2d8a4e', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [ppTrendData]);

  // ── Corp Bond Trading Volume ─────────────────────────────────────────────────
  const [tradingTrend, setTradingTrend] = useState(null);

  useEffect(() => {
    fetchDashCorpBondTradingTrend()
      .then(setTradingTrend)
      .catch(err => console.error('Corp bond trading trend fetch:', err));
  }, []);

  useEffect(() => {
    if (!tradingTrend?.data?.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-trade');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const rows    = tradingTrend.data;
      const labels  = rows.map(r => r.period);
      const amounts = rows.map(r => +(r.amount_cr / 100000).toFixed(2)); // ₹L Cr
      const counts  = rows.map(r => r.trade_count);

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Volume (₹L Cr)',
              data: amounts,
              backgroundColor: 'rgba(0,68,123,.75)',
              borderColor: 'transparent',
              borderRadius: 4,
              borderSkipped: false,
              yAxisID: 'y',
            },
            {
              label: 'Trade Count',
              data: counts,
              type: 'line',
              borderColor: '#2d8a4e',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#2d8a4e',
              pointBorderColor: '#fff',
              pointBorderWidth: 1.5,
              tension: 0.35,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) =>
                  ctx.datasetIndex === 0
                    ? ` Volume: ₹${ctx.parsed.y}L Cr`
                    : ` Trades: ${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 10 }, maxRotation: 45 },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'L',
              },
              border: { display: false },
              title: { display: true, text: '₹ L Cr', color: '#00447b', font: { size: 9 } },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
              },
              border: { display: false },
              title: { display: true, text: 'Trade Count', color: '#2d8a4e', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [tradingTrend]);

  // ── Corp Bond Outstanding by Issuer ──────────────────────────────────────────
  const [issuerData, setIssuerData] = useState(null);

  useEffect(() => {
    fetchDashCorpBondOsByIssuer()
      .then(setIssuerData)
      .catch(err => console.error('Issuer outstanding fetch:', err));
  }, []);

  useEffect(() => {
    if (!issuerData?.breakdown?.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-issuer');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const breakdown = [...issuerData.breakdown].sort((a, b) => b.value_cr - a.value_cr);
      const labels    = breakdown.map(d => d.dimension_name);
      const values    = breakdown.map(d => +(d.value_cr / 100000).toFixed(2)); // ₹L Cr
      const shares    = breakdown.map(d => d.share_percent);

      const colors = [
        'rgba(0,68,123,.90)',
        'rgba(0,68,123,.78)',
        'rgba(0,68,123,.66)',
        'rgba(0,68,123,.56)',
        'rgba(0,68,123,.46)',
        'rgba(0,68,123,.38)',
        'rgba(0,68,123,.30)',
        'rgba(0,68,123,.24)',
      ];

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '₹L Cr',
            data: values,
            backgroundColor: colors.slice(0, breakdown.length),
            borderColor: 'transparent',
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const i = ctx.dataIndex;
                  return [
                    ` ₹${ctx.parsed.x}L Cr`,
                    ` Share: ${shares[i]}%`,
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'L',
              },
              border: { display: false },
              title: { display: true, text: '₹ L Cr', color: '#9a9d92', font: { size: 9 } },
            },
            y: {
              grid: { display: false },
              ticks: { color: tc, font: { size: 10 } },
              border: { display: false },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [issuerData]);

  // ── SDL State Outstanding (Top 10 chart + detailed table) ────────────────────
  const [sdlStateRows, setSdlStateRows] = useState([]);

  useEffect(() => {
    const SDL_NAME_MAP = {
      'JAMMU AND KASHMIR UT': 'Jammu & Kashmir',
      'JAMMU AND KASHMIR':    'Jammu & Kashmir',
      'JAMMU & KASHMIR':      'Jammu & Kashmir',
      'HIMACHAL':             'Himachal Pradesh',
      'HIMACHAL PRADESH':     'Himachal Pradesh',
      'NCT OF DELHI':         'Delhi',
      'DELHI':                'Delhi',
      'TAMILNADU':            'Tamil Nadu',
      'TAMIL NADU':           'Tamil Nadu',
      'ODISHA':               'Odisha',
      'ORISSA':               'Odisha',
    };
    const normStateName = (s) => {
      if (!s) return s;
      const up = s.trim().toUpperCase();
      return SDL_NAME_MAP[up] || s.trim().split(' ').map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    fetchDashStateOutstandingShare()
      .then(raw => {
        const arr = Array.isArray(raw) ? raw : (raw.data || raw.states || []);
        const merged = {};
        arr.forEach(row => {
          const name = normStateName(row.state);
          if (merged[name]) {
            merged[name].total_outstanding += row.total_outstanding;
            merged[name].share_percent    += row.share_percent;
          } else {
            merged[name] = { ...row, state: name };
          }
        });
        const sorted = Object.values(merged).sort((a, b) => b.total_outstanding - a.total_outstanding);
        setSdlStateRows(sorted);
      })
      .catch(err => console.error('SDL state rows fetch:', err));
  }, []);

  useEffect(() => {
    if (!sdlStateRows.length) return;
    const C = window['Chart'];
    if (!C) return;

    const drawSdlChart = (canvasId) => {
      const el = document.getElementById(canvasId);
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const top10  = sdlStateRows.slice(0, 10);
      const labels = top10.map(d => d.state.split(' ').map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' '));
      const values = top10.map(d => +(d.total_outstanding / 1000).toFixed(1)); // ₹K Cr
      const shares = top10.map(d => +d.share_percent.toFixed(2));

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '₹K Cr',
              data: values,
              backgroundColor: values.map((_, i) => `rgba(0,68,123,${(0.55 + i * 0.04).toFixed(2)})`),
              borderColor: 'transparent',
              borderRadius: 4,
              borderSkipped: false,
              yAxisID: 'y',
            },
            {
              label: 'Share %',
              data: shares,
              type: 'line',
              borderColor: '#2d8a4e',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#2d8a4e',
              pointBorderColor: '#fff',
              pointBorderWidth: 1.5,
              tension: 0.35,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) =>
                  ctx.datasetIndex === 0
                    ? ` ₹${ctx.parsed.y}K Cr`
                    : ` Share: ${ctx.parsed.y}%`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 10 }, maxRotation: 45 },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'K',
              },
              border: { display: false },
              title: { display: true, text: '₹K Cr', color: '#00447b', font: { size: 9 } },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + '%',
              },
              border: { display: false },
              title: { display: true, text: 'Share %', color: '#2d8a4e', font: { size: 9 } },
            },
          },
        },
      });
    };

    const draw = () => {
      drawSdlChart('c-sdl-states');
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [sdlStateRows]);

  // ── G-Sec Maturity Profile ───────────────────────────────────────────────────
  const [gsecMaturity, setGsecMaturity] = useState(null);

  useEffect(() => {
    fetchDashGsecMaturityProfile()
      .then(setGsecMaturity)
      .catch(err => console.error('G-Sec maturity fetch:', err));
  }, []);

  useEffect(() => {
    if (!gsecMaturity?.buckets?.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-gsec-maturity');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const buckets = gsecMaturity.buckets;
      const labels  = buckets.map(b => b.label);
      const values  = buckets.map(b => +(b.value_cr / 100000).toFixed(2)); // ₹L Cr
      const counts  = buckets.map(b => b.bond_count);

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '₹L Cr',
            data: values,
            backgroundColor: [
              'rgba(0,68,123,.55)',
              'rgba(0,68,123,.65)',
              'rgba(0,68,123,.80)',
              'rgba(0,68,123,.70)',
              'rgba(0,68,123,.90)',
            ],
            borderColor: 'transparent',
            borderRadius: 5,
            borderSkipped: false,
          }],
        },
        plugins: [{
          id: 'barTopLabels',
          afterDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            chart.getDatasetMeta(0).data.forEach((bar, i) => {
              const val = values[i];
              if (val == null) return;
              const lbl = val >= 1 ? val.toFixed(1) + 'L Cr' : (val * 100).toFixed(0) + 'K Cr';
              ctx.fillStyle = '#9a9d92';
              ctx.font = "bold 9px 'JetBrains Mono',monospace";
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(lbl, bar.x, bar.y - 3);
            });
            ctx.restore();
          },
        }],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 20 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const cr = buckets[ctx.dataIndex].value_cr;
                  const cnt = counts[ctx.dataIndex];
                  return [
                    ` Outstanding: ₹${Number(cr.toFixed(0)).toLocaleString('en-IN')} Cr`,
                    ` Bonds: ${cnt}`,
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 11 } },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'L',
              },
              border: { display: false },
              title: { display: true, text: '₹ L Cr', color: '#00447b', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [gsecMaturity]);

  // ── STRIPS Maturity Profile ──────────────────────────────────────────────────
  const [stripsMaturity, setStripsMaturity] = useState(null);

  useEffect(() => {
    fetchDashStripsMaturityProfile()
      .then(setStripsMaturity)
      .catch(err => console.error('STRIPS maturity fetch:', err));
  }, []);

  useEffect(() => {
    if (!stripsMaturity?.buckets?.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-strips-maturity');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const buckets = stripsMaturity.buckets;
      const labels  = buckets.map(b => b.label);
      const values  = buckets.map(b => +(b.value_cr / 1e12).toFixed(2)); // ₹L Cr (API returns face value in ₹)
      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '₹L Cr',
            data: values,
            backgroundColor: [
              'rgba(0,68,123,.55)',
              'rgba(0,68,123,.65)',
              'rgba(0,68,123,.80)',
              'rgba(0,68,123,.70)',
              'rgba(0,68,123,.90)',
            ],
            borderColor: 'transparent',
            borderRadius: 5,
            borderSkipped: false,
          }],
        },
        plugins: [{
          id: 'stripsBarTopLabels',
          afterDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            chart.getDatasetMeta(0).data.forEach((bar, i) => {
              const val = values[i];
              if (val == null) return;
              const lbl = val >= 1 ? val.toFixed(1) + 'L Cr' : (val * 100).toFixed(0) + 'K Cr';
              ctx.fillStyle = '#9a9d92';
              ctx.font = "bold 9px 'JetBrains Mono',monospace";
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(lbl, bar.x, bar.y - 3);
            });
            ctx.restore();
          },
        }],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 20 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const cr = +(buckets[ctx.dataIndex].value_cr / 1e7).toFixed(0);
                  const cnt = buckets[ctx.dataIndex].bond_count;
                  return [
                    ` Outstanding: ₹${Number(cr).toLocaleString('en-IN')} Cr`,
                    ...(cnt != null ? [` Bonds: ${cnt}`] : []),
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 11 } },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'L',
              },
              border: { display: false },
              title: { display: true, text: '₹ L Cr', color: '#00447b', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 400);
    return () => clearTimeout(t);
  }, [stripsMaturity]);

  // ── SDL Maturity Profile ─────────────────────────────────────────────────────
  const [sdlMaturity, setSdlMaturity] = useState(null);

  useEffect(() => {
    fetchDashSdlMaturityProfile()
      .then(setSdlMaturity)
      .catch(err => console.error('SDL maturity fetch:', err));
  }, []);

  useEffect(() => {
    if (!sdlMaturity?.buckets?.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-sdl-maturity');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const buckets = sdlMaturity.buckets;
      const labels  = buckets.map(b => b.label);
      const values  = buckets.map(b => +(b.value_cr / 100000).toFixed(2)); // ₹L Cr
      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '₹L Cr',
            data: values,
            backgroundColor: [
              'rgba(14,116,144,.45)',
              'rgba(14,116,144,.58)',
              'rgba(14,116,144,.72)',
              'rgba(14,116,144,.62)',
              'rgba(14,116,144,.85)',
            ],
            borderColor: 'transparent',
            borderRadius: 5,
            borderSkipped: false,
          }],
        },
        plugins: [{
          id: 'sdlBarTopLabels',
          afterDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            chart.getDatasetMeta(0).data.forEach((bar, i) => {
              const val = values[i];
              if (val == null) return;
              const lbl = val >= 1 ? val.toFixed(1) + 'L Cr' : (val * 100).toFixed(0) + 'K Cr';
              ctx.fillStyle = '#9a9d92';
              ctx.font = "bold 9px 'JetBrains Mono',monospace";
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(lbl, bar.x, bar.y - 3);
            });
            ctx.restore();
          },
        }],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 20 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const cr  = buckets[ctx.dataIndex].value_cr;
                  const cnt = buckets[ctx.dataIndex].bond_count;
                  return [
                    ` Outstanding: ₹${Number(cr.toFixed(0)).toLocaleString('en-IN')} Cr`,
                    ...(cnt != null ? [` Bonds: ${cnt}`] : []),
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 11 } },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v + 'L',
              },
              border: { display: false },
              title: { display: true, text: '₹ L Cr', color: '#0e7490', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 400);
    return () => clearTimeout(t);
  }, [sdlMaturity]);

  // ── STRIPS Outstanding Trend ─────────────────────────────────────────────────
  const [stripsData, setStripsData] = useState([]);

  useEffect(() => {
    fetchDashStripsTrend()
      .then(rows => setStripsData(rows || []))
      .catch(err => console.error('STRIPS fetch:', err));
  }, []);

  useEffect(() => {
    if (!stripsData.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-strips');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const sorted  = [...stripsData].sort((a, b) => a.period > b.period ? 1 : -1);
      const labels  = sorted.map(r => r.period);
      const values  = sorted.map(r => +(r.value / 1e12).toFixed(2)); // ₹L Cr (API returns face value in ₹)

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'STRIPS Outstanding',
            data: values,
            backgroundColor: 'rgba(0,68,123,.75)',
            borderColor: 'transparent',
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => ` ${ctx.parsed.y.toFixed(2)} L Cr`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 9 }, maxRotation: 45, minRotation: 45, autoSkip: false },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v.toFixed(2) + 'L',
              },
              border: { display: false },
              title: { display: true, text: '₹ L Cr', color: '#00447b', font: { size: 9 } },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [stripsData]);

  // ── G-Sec Outstanding Trend ──────────────────────────────────────────────────
  const [gsecTrendData, setGsecTrendData] = useState([]);

  useEffect(() => {
    fetchDashGsecTrend()
      .then(rows => setGsecTrendData(rows || []))
      .catch(err => console.error('G-Sec trend fetch:', err));
  }, []);

  useEffect(() => {
    if (!gsecTrendData.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-gsec-trend');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const sorted = [...gsecTrendData].sort((a, b) => a.period > b.period ? 1 : -1);
      const labels = sorted.map(r => r.period);
      const values = sorted.map(r => Math.round(r.value));

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'G-Sec Outstanding',
            data: values,
            backgroundColor: 'rgba(0,68,123,.75)',
            borderColor: 'transparent',
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => ` ${Number(ctx.parsed.y).toLocaleString('en-IN')} Cr`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 9 }, maxRotation: 45, minRotation: 45, autoSkip: false },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
              },
              border: { display: false },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [gsecTrendData]);

  // ── SGB Outstanding Trend ─────────────────────────────────────────────────────
  const [sgbTrendData, setSgbTrendData] = useState([]);

  useEffect(() => {
    fetchDashSgbTrend()
      .then(setSgbTrendData)
      .catch(err => console.error('SGB trend fetch:', err));
  }, []);

  useEffect(() => {
    if (!sgbTrendData.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-sgb-trend');
      if (!el) return;
      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      const sorted = [...sgbTrendData]
        .sort((a, b) => a.period > b.period ? 1 : -1)
        .filter(r => r.value > 0);
      const labels = sorted.map(r => r.period);
      const values = sorted.map(r => +(r.value / 100000).toFixed(2)); // ₹L Cr

      const gc = 'rgba(26,28,24,.05)';
      const tc = '#9a9d92';

      new C(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'SGB Outstanding',
            data: values,
            backgroundColor: 'rgba(0,68,123,.75)',
            borderColor: 'transparent',
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        plugins: [{
          id: 'barTopLabels',
          afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            chart.getDatasetMeta(0).data.forEach((bar, i) => {
              const val = values[i];
              const lbl = val >= 1 ? val.toFixed(1) + 'L Cr' : (val * 100).toFixed(0) + 'K Cr';
              ctx.save();
              ctx.fillStyle = '#9a9d92';
              ctx.font = "bold 9px 'JetBrains Mono',monospace";
              ctx.textAlign = 'center';
              ctx.fillText(lbl, bar.x, bar.y - 3);
              ctx.restore();
            });
          },
        }],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 20 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1c18',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => ` ${ctx.parsed.y.toFixed(2)} L Cr`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 10 }, maxRotation: 45 },
              border: { display: false },
            },
            y: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: {
                color: tc,
                font: { family: "'JetBrains Mono',monospace", size: 10 },
                callback: v => v >= 1 ? v.toFixed(1) + 'L' : (v * 100).toFixed(0) + 'K',
              },
              border: { display: false },
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [sgbTrendData]);

  // Derived SDL state KPIs (sdlStateRows is sorted descending by total_outstanding)
  const sdlTotal       = sdlStateRows.reduce((s, r) => s + r.total_outstanding, 0);
  const sdlTop5Share   = sdlStateRows.slice(0, 5).reduce((s, r) => s + r.share_percent, 0);
  const sdlTop15Share  = sdlStateRows.slice(0, 15).reduce((s, r) => s + r.share_percent, 0);
  const sdlTopState    = sdlStateRows[0]?.state
    ? sdlStateRows[0].state.split(' ').map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : '—';

  // Derived STRIPS stats
  const stripsSorted  = [...stripsData].sort((a, b) => a.period > b.period ? 1 : -1);
  const stripsLatest  = stripsSorted.at(-1)?.value ?? null;
  const stripsEarliest = stripsSorted[0]?.value ?? null;
  const stripsGrowth  = stripsLatest && stripsEarliest && stripsEarliest > 0
    ? (stripsLatest / stripsEarliest).toFixed(1)
    : null;


  // ── RBI Policy Rates ─────────────────────────────────────────────────────────
  const [rbiRates, setRbiRates] = useState({});

  useEffect(() => {
    const METRICS = [
      { key: 'repo_rate',    id: 46 },
      { key: 'sdf_rate',     id: 47 },
      { key: 'msf_rate',     id: 48 },
      { key: 'bank_rate',    id: 49 },
      { key: 'reverse_repo', id: 50 },
      { key: 'crr',          id: 51 },
      { key: 'slr',          id: 52 },
    ];
    Promise.all(
      METRICS.map(m =>
        fetchDashRbiPolicyRate(m.id)
          .then(rows => {
            const arr = Array.isArray(rows) ? rows : [];
            const latest = arr.length ? arr[arr.length - 1] : null;
            return { key: m.key, value: latest?.value ?? null, period: latest?.period ?? null };
          })
          .catch(() => ({ key: m.key, value: null, period: null }))
      )
    ).then(results => {
      const rates = {};
      results.forEach(r => { rates[r.key] = { value: r.value, period: r.period }; });
      setRbiRates(rates);
    });
  }, []);

  return (
    <div className={`page${isActive ? ' on' : ''}`} id="page-dash">
      <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>

        {/* RBI Policy Rates Band — animated ticker */}
        {Object.keys(rbiRates).length > 0 && (
          <div style={{display:'flex',alignItems:'center',background:'#000',flexShrink:0,overflow:'hidden'}}>
            {/* Pinned label */}
            <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',borderRight:'1px solid rgba(255,255,255,.15)',flexShrink:0,zIndex:1}}>
              <div style={{background:'#c0392b',color:'#fff',fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'3px',letterSpacing:'.05em'}}>RBI</div>
              <span style={{fontSize:'10px',color:'rgba(255,255,255,.5)',fontWeight:600,whiteSpace:'nowrap'}}>Policy Rates</span>
            </div>
            {/* Scrolling ticker — items duplicated for seamless loop */}
            <div style={{flex:1,overflow:'hidden',position:'relative'}}>
              <div style={{display:'flex',width:'max-content',animation:'rbi-ticker 22s linear infinite'}}>
                {[
                  { label: 'Repo Rate',    key: 'repo_rate' },
                  { label: 'SDF',          key: 'sdf_rate' },
                  { label: 'MSF',          key: 'msf_rate' },
                  { label: 'Bank Rate',    key: 'bank_rate' },
                  { label: 'Rev Repo',     key: 'reverse_repo' },
                  { label: 'CRR',          key: 'crr' },
                  { label: 'SLR',          key: 'slr' },
                  ...(rbiRates.repo_rate?.period ? [{ label: 'As of', key: '__period__' }] : []),
                  { label: 'Repo Rate',    key: 'repo_rate' },
                  { label: 'SDF',          key: 'sdf_rate' },
                  { label: 'MSF',          key: 'msf_rate' },
                  { label: 'Bank Rate',    key: 'bank_rate' },
                  { label: 'Rev Repo',     key: 'reverse_repo' },
                  { label: 'CRR',          key: 'crr' },
                  { label: 'SLR',          key: 'slr' },
                  ...(rbiRates.repo_rate?.period ? [{ label: 'As of', key: '__period__' }] : []),
                ].map((item, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 18px',borderRight:'1px solid rgba(255,255,255,.08)',whiteSpace:'nowrap'}}>
                    <span style={{fontSize:'10px',fontWeight:600,color:'rgba(255,255,255,.4)',letterSpacing:'.04em'}}>{item.label}</span>
                    <span style={{fontSize:'12px',fontWeight:700,fontFamily:'var(--mo)',color: item.key === '__period__' ? 'rgba(255,255,255,.3)' : rbiRates[item.key]?.value != null ? '#fff' : 'rgba(255,255,255,.3)'}}>
                      {item.key === '__period__' ? rbiRates.repo_rate.period : rbiRates[item.key]?.value != null ? `${rbiRates[item.key].value}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard section tabs */}
        <div className="dm-tabs">
          {/* {ncdTrendData?.latest?.period && ( */}
            {/* <div style={{display:'flex',alignItems:'center',padding:'0 14px 0 4px',borderRight:'1px solid var(--bdr)',marginRight:'4px',gap:'4px',flexShrink:0}}>
              <span style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--tx4)'}}>Latest FY</span>
              <span style={{fontSize:'12px',fontWeight:700,fontFamily:'var(--mo)',color:'var(--tx)'}}>
                {ncdTrendData.latest.period.replace('-', '–')}
              </span>
            </div> */}
          {/* )} */}
          <div className="dm-tab on" id="dmt-overview" onClick={(e) => window.dashTab('overview',e.currentTarget)}>Overview</div>
          <div className="dm-tab" id="dmt-gsec" onClick={(e) => window.dashTab('gsec',e.currentTarget)}>G-Secs</div>
          <div className="dm-tab" id="dmt-issuance" onClick={(e) => window.dashTab('issuance',e.currentTarget)}><SGS /></div>
          <div className="dm-tab" id="dmt-secondary" onClick={(e) => window.dashTab('secondary',e.currentTarget)}>
            <span className="dm-tab-full">Corporate Bonds</span>
            <span className="dm-tab-short">Corp Bonds</span>
          </div>
          <div className="dm-tab" id="dmt-sgb" onClick={(e) => window.dashTab('sgb',e.currentTarget)}><SGB /></div>
          {/* <div className="dm-tab" id="dmt-sources" onClick={() => window.dashTab('sources',this)}>Data Sources</div> */}
          <div className="dm-tabs-right">
            <div className="dm-live-badge"><span className="dm-live-dot"></span>Live</div>
            {/* <span className="dm-date">FY 2025&#x2013;26 · 24 Mar 2026</span> */}
          </div>
        </div>

        {/* scrollable content */}
        <div className="scroll dm-content" id="dm-content">

          {/* ── OVERVIEW TAB ── */}
          <div className="dm-pane on" id="dmp-overview">

            {/* ── KPI tiles with icons ── */}
            <div className="ov-kpi-row">
              {/* G-Sec */}
              <div className="ov-kpi-card">
                <div className="ov-kpi-icon" style={{background:'#e6f4ec',color:'#2d8a4e'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2L2 7h20L12 2z"/></svg>
                </div>
                <div className="ov-kpi-body">
                  <div className="ov-kpi-lbl">G-SEC OUTSTANDING</div>
                  <div className="ov-kpi-val">{fmtL(gsec.value_cr)}<span className="ov-kpi-u">Cr</span></div>
                  {/* <div className="ov-kpi-share" style={{color:'#2d8a4e'}}>{gsec.share_percent != null ? (+gsec.share_percent).toFixed(1) : '—'}% <span className="ov-kpi-of">of Total Market</span></div> */}
                </div>
              </div>
              {/* SGS */}
              <div className="ov-kpi-card">
                <div className="ov-kpi-icon" style={{background:'#e0f2f7',color:'#0e7490'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div className="ov-kpi-body">
                  <div className="ov-kpi-lbl">SGS OUTSTANDING</div>
                  <div className="ov-kpi-val">{fmtL(sdl.value_cr)}<span className="ov-kpi-u">Cr</span></div>
                  {/* <div className="ov-kpi-share" style={{color:'#0e7490'}}>{sdl.share_percent != null ? (+sdl.share_percent).toFixed(1) : '—'}% <span className="ov-kpi-of">of Total Market</span></div> */}
                </div>
              </div>
              {/* Corp */}
              <div className="ov-kpi-card">
                <div className="ov-kpi-icon" style={{background:'#fef3e2',color:'#c47a1e'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                </div>
                <div className="ov-kpi-body">
                  <div className="ov-kpi-lbl">CORPORATE BOND OUTSTANDING</div>
                  <div className="ov-kpi-val">{fmtL(corpOsLatest)}<span className="ov-kpi-u">Cr</span></div>
                  <div className="ov-kpi-share" style={{color:'var(--tx3)'}}>{corpOsLatestPeriod ? <><span style={{fontWeight:500}}>Latest · </span>{corpOsLatestPeriod}</> : 'Latest Month · SEBI'}</div>
                </div>
              </div>
              {/* Total */}
              <div className="ov-kpi-card">
                <div className="ov-kpi-icon" style={{background:'#e8f0fb',color:'#2557a7'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div className="ov-kpi-body">
                  <div className="ov-kpi-lbl">TOTAL DEBT MARKET</div>
                  <div className="ov-kpi-val">{fmtL(grandTotalLatest)}<span className="ov-kpi-u">Cr</span></div>
                  <div className="ov-kpi-share" style={{color:'var(--tx3)'}}>G-Sec + <SGS /> + Corp</div>
                </div>
              </div>
            </div>

            {/* ── India Bond Market — full plain map with centred composition overlay ── */}
            <div className="ibm-card">
              <div className="ibm-card-heading">India Bond Market</div>
              <div className="ibm-body">
                <div className="ibm-map-wrap ibm-map-full">
                  <div id="sdl-body-mount" style={{flex:1,minHeight:0,display:'grid',gridTemplateColumns:'1fr',gridTemplateRows:'1fr'}}></div>
                </div>
              </div>

            </div>

          </div>
          {/* /overview */}

          {/* ── SDL DEEP DIVE TAB ── */}
          <div className="dm-pane" id="dmp-issuance">
            <div className="dm-section-lbl"><div className="dm-sl-bar" style={{background:'#0e7490'}}></div><span>State Government Securities (<SGS />) &#x2014; Deep Dive</span></div>

            <div className="dm-kpi-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
              <div className="dm-kpi dm-kpi-3"><div className="dm-kpi-l">Total <SGS /> Outstanding</div><div className="dm-kpi-v">{sdlTotal ? fmtL(sdlTotal) : '—'}<span className="dm-kpi-u">Cr</span></div><div className="dm-kpi-s">{sdlStateRows.length} States/UTs &middot; RBI</div></div>
              <div className="dm-kpi dm-kpi-5"><div className="dm-kpi-l">Top 5 States/UTs Share</div><div className="dm-kpi-v">{sdlStateRows.length ? sdlTop5Share.toFixed(1) : '—'}<span className="dm-kpi-u">%</span></div><div className="dm-kpi-s">{sdlTopState} leads</div></div>
              <div className="dm-kpi dm-kpi-6"><div className="dm-kpi-l">Top 15 States/UTs Share</div><div className="dm-kpi-v">{sdlStateRows.length >= 15 ? sdlTop15Share.toFixed(1) : '—'}<span className="dm-kpi-u">%</span></div><div className="dm-kpi-s">High concentration</div></div>
            </div>

            {/* ── India Map + State Rankings ── */}
            <div className="card" style={{overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>State/UT-wise <SGS /> Outstanding</div>
                  <div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>State/UT <SGS /> Outstanding &middot; RBI</div>
                </div>
              </div>
              <div className="sdl-body" id="sdl-sgs-mount" style={{minHeight:'580px'}}></div>
            </div>

            {/* ── SDL Maturity Profile + empty ── */}
            <div className="g2">
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}><SGS /> Maturity Profile</div>
                    <div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>Outstanding &#x20B9;L Cr by residual maturity bucket &middot; RBI</div>
                  </div>
                </div>
                <div className="cp" style={{height:'220px'}}>{sdlMaturity?.buckets?.length > 0 ? <canvas id="c-sdl-maturity"></canvas> : <NoData />}</div>
              </div>
              <div className="card"></div>
            </div>
            {sdlStateRows.length > 0 && (() => {
              const maxVal   = sdlStateRows[0]?.total_outstanding || 1;
              const grandTot = sdlStateRows.reduce((s,r) => s + r.total_outstanding, 0);
              const halfLen  = Math.ceil(sdlStateRows.length / 2);

              const renderRow = (row, i) => (
                <div key={row.state}
                  style={{display:'grid',gridTemplateColumns:'22px 1fr 50px 34px',alignItems:'center',gap:'0 6px',padding:'5px 10px',borderBottom:'1px solid var(--bdr2)',transition:'background .08s',cursor:'default'}}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sf3)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {/* rank badge */}
                  <div style={{width:'20px',height:'20px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(37,87,167,.1)',border:'1px solid rgba(37,87,167,.25)',flexShrink:0}}>
                    <span style={{fontSize:'8px',fontFamily:'var(--mo)',fontWeight:800,color:'#2557a7'}}>{i+1}</span>
                  </div>
                  {/* state name */}
                  <span style={{fontSize:'11px',fontWeight:500,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{row.state}</span>
                  {/* value */}
                  <span style={{fontSize:'11px',fontFamily:'var(--mo)',fontWeight:700,color:'var(--tx)',textAlign:'right',whiteSpace:'nowrap'}}>{fmtL(row.total_outstanding)}</span>
                  {/* share % */}
                  <span style={{fontSize:'10px',fontFamily:'var(--mo)',fontWeight:600,color:'var(--tx3)',textAlign:'right',whiteSpace:'nowrap'}}>{row.share_percent.toFixed(1)}%</span>
                </div>
              );

              const colHdr = (
                <div style={{display:'grid',gridTemplateColumns:'22px 1fr 50px 34px',alignItems:'center',gap:'0 6px',padding:'5px 10px',background:'var(--sf2)',borderBottom:'1px solid var(--bdr)'}}>
                  <span style={{fontSize:'8px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx4)'}}>#</span>
                  <span style={{fontSize:'8px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx4)'}}>State/UT</span>
                  <span style={{fontSize:'8px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx4)',textAlign:'right'}}>Outst.</span>
                  <span style={{fontSize:'8px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx4)',textAlign:'right'}}>Shr%</span>
                </div>
              );

              const top3Share = sdlStateRows.slice(0,3).reduce((s,r)=>s+r.share_percent,0).toFixed(1);
              return (
                <div className="card" style={{overflow:'hidden'}}>
                  {/* ── Header ── */}
                  <div style={{padding:'10px 16px 8px',borderBottom:'1px solid var(--bdr)'}}>
                    {/* Row 1: title + total */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>State/UT-wise <SGS /> Outstanding</div>
                        <div style={{fontSize:'10px',color:'var(--tx3)',marginTop:'2px'}}>Source: RBI &middot; {sdlStateRows.length} states/UTs &middot; values in L/K Cr</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',flexShrink:0}}>
                        <span style={{fontSize:'9px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--tx4)'}}>Total Outstanding</span>
                        <span style={{fontSize:'14px',fontFamily:'var(--mo)',fontWeight:800,color:'var(--tx)',lineHeight:1.2}}>&#x20B9;{(grandTot/100000).toFixed(1)}<span style={{fontSize:'10px',fontWeight:600,color:'var(--tx3)',marginLeft:'2px'}}>L Cr</span></span>
                      </div>
                    </div>
                    {/* Row 2: top 3 state pills + top-3 share */}
                    <div className="sdl-top3-row" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'8px',paddingTop:'6px',borderTop:'1px solid var(--bdr2)'}}>
                      <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'4px 8px',minWidth:0,flex:1}}>
                        {[0,1,2].map(i => sdlStateRows[i] && (
                          <span key={i} style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
                            <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#2557a7',display:'inline-block',flexShrink:0}}/>
                            <span style={{fontSize:'9.5px',fontWeight:600,color:'var(--tx3)'}}>{sdlStateRows[i].state}</span>
                            <span style={{fontSize:'9.5px',fontFamily:'var(--mo)',fontWeight:700,color:'var(--tx2)'}}>{sdlStateRows[i].share_percent.toFixed(1)}%</span>
                          </span>
                        ))}
                      </div>
                      <span style={{fontSize:'10.5px',fontFamily:'var(--mo)',fontWeight:800,color:'var(--green)',flexShrink:0,marginLeft:'8px'}}>Top 3: {top3Share}%</span>
                    </div>
                  </div>

                  {/* ── 2-column compact grid ── */}
                  <div className="sdl-all-states-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
                    <div style={{borderRight:'1px solid var(--bdr)'}}>
                      {colHdr}
                      {sdlStateRows.slice(0, halfLen).map((row, i) => renderRow(row, i))}
                    </div>
                    <div>
                      {colHdr}
                      {sdlStateRows.slice(halfLen).map((row, i) => renderRow(row, i + halfLen))}
                    </div>
                  </div>

                  {/* ── Grand Total ── */}
                  <div style={{display:'grid',gridTemplateColumns:'22px 1fr 50px 34px',alignItems:'center',gap:'0 6px',padding:'6px 10px',borderTop:'2px solid var(--bdr)',background:'var(--sf2)'}}>
                    <div/>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* /sdl tab */}

          {/* ── CORP BONDS DEEP DIVE TAB ── */}
          <div className="dm-pane" id="dmp-secondary">
            <div className="dm-section-lbl"><div className="dm-sl-bar" style={{background:'var(--green)'}}></div><span>Corporate Bonds &#x2014; Deep Dive</span></div>
            <div className="dm-kpi-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
              <div className="dm-kpi dm-kpi-4"><div className="dm-kpi-l">Corp Bond Trading Volume</div><div className="dm-kpi-v">{tradingTrend?.latest ? fmtL(tradingTrend.latest.amount_cr) : '—'}<span className="dm-kpi-u">Cr</span></div><div className="dm-kpi-s">{tradingTrend?.latest ? `${(tradingTrend.latest.trade_count / 1000000).toFixed(2)}M trades · SEBI` : 'Latest FY · SEBI'}</div></div>
              <div className="dm-kpi dm-kpi-5"><div className="dm-kpi-l">Public Issues of NCDs (FY26 YTD)</div><div className="dm-kpi-v">{ncdTrendData?.latest ? `₹${Number((ncdTrendData.latest.amount_cr/1000).toFixed(0))}K` : '—'}<span className="dm-kpi-u">Cr</span></div><div className="dm-kpi-s">{ncdTrendData?.latest ? `${ncdTrendData.latest.issue_count.toLocaleString('en-IN')} issues` : '—'}</div></div>
              <div className="dm-kpi dm-kpi-6"><div className="dm-kpi-l">Private Placements (FY26)</div><div className="dm-kpi-v">{ppTrendData?.latest ? `₹${Number((ppTrendData.latest.amount_cr/100000).toFixed(1))}L` : '—'}<span className="dm-kpi-u">Cr</span></div><div className="dm-kpi-s">{ppTrendData?.latest ? `${ppTrendData.latest.issue_count.toLocaleString('en-IN')} issues` : '—'}</div></div>
            </div>
            <div className="g2">
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>Public Issues of NCDs &#x2014; (FY26 YTD)</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>Amount &#x20B9;Cr (bar) + Issue Count (line) &middot; SEBI</div></div><div className="dm-pill">Latest FY2025-26 : {ncdTrendData?.latest ? `${ncdTrendData.latest.issue_count} issues · ₹${Number(ncdTrendData.latest.amount_cr.toFixed(0)).toLocaleString('en-IN')} Cr` : '—'}</div></div>
                <div className="cp" style={{height:'220px'}}>{ncdTrendData?.data?.length > 0 ? <canvas id="c-ncd"></canvas> : <NoData />}</div>
              </div>
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>Private Placements &#x2014; Yearly Trend</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>Amount &#x20B9;Cr (bar) + Issue Count (line) &middot; SEBI</div></div><div className="dm-pill">{ppTrendData?.latest ? `${ppTrendData.latest.issue_count.toLocaleString('en-IN')} issues · ₹${Number((ppTrendData.latest.amount_cr / 100000).toFixed(1))}L Cr` : '—'}</div></div>
                <div className="cp" style={{height:'220px'}}>{ppTrendData?.data?.length > 0 ? <canvas id="c-pp"></canvas> : <NoData />}</div>
              </div>
            </div>
            <div className="g2">
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>Corp Bond Trading Volume</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>Volume &#x20B9;L Cr (bar) + Trade Count (line) &middot; SEBI</div></div>{tradingTrend?.latest && <div className="dm-pill">{(tradingTrend.latest.trade_count / 1000000).toFixed(2)}M trades · &#x20B9;{(tradingTrend.latest.amount_cr / 100000).toFixed(1)}L Cr</div>}</div>
                <div className="cp" style={{height:'220px'}}>{tradingTrend?.data?.length > 0 ? <canvas id="c-trade"></canvas> : <NoData />}</div>
              </div>
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>Outstanding by Issuer Type</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>All dimensions &middot; &#x20B9;L Cr &middot; SEBI</div></div>{issuerData?.financial_year && <div className="dm-pill">FY {issuerData.financial_year}</div>}</div>
                <div className="cp" style={{height:'220px'}}>{issuerData?.breakdown?.length > 0 ? <canvas id="c-issuer"></canvas> : <NoData />}</div>
              </div>
            </div>
            <div className="card">
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)'}}><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>Issuance Summary</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>FY-wise NCD + Private Placement breakdown</div></div>
              <div className="tw"><table><thead><tr><th>FY</th><th className="R">NCD Issues</th><th className="R">NCD Amount (&#x20B9; Cr)</th><th className="R">PP Issues</th><th className="R">PP Amount (&#x20B9; Cr)</th><th className="R">Total (&#x20B9; Cr)</th></tr></thead>
              <tbody>
                {(() => {
                  const ncdMap = Object.fromEntries((ncdTrendData?.data || []).map(r => [r.period, r]));
                  const ppMap  = Object.fromEntries((ppTrendData?.data  || []).map(r => [r.period, r]));
                  const allPeriods = [...new Set([
                    ...(ncdTrendData?.data || []).map(r => r.period),
                    ...(ppTrendData?.data  || []).map(r => r.period),
                  ])].sort();
                  const latestPeriod = allPeriods.at(-1);
                  return allPeriods.map(period => {
                    const ncd = ncdMap[period];
                    const pp  = ppMap[period];
                    const ncdAmt  = ncd?.amount_cr  ?? 0;
                    const ppAmt   = pp?.amount_cr   ?? 0;
                    const total   = ncdAmt + ppAmt;
                    const isLatest = period === latestPeriod;
                    return (
                      <tr key={period} style={isLatest ? {background:'var(--sf2)'} : {}}>
                        <td className="mo nm" style={isLatest ? {color:'var(--green)'} : {}}>{period.replace('-', '–')}</td>
                        <td className="R mo">{ncd ? ncd.issue_count.toLocaleString('en-IN') : '—'}</td>
                        <td className="R mo">{ncd ? Math.round(ncdAmt).toLocaleString('en-IN') : '—'}</td>
                        <td className="R mo">{pp  ? pp.issue_count.toLocaleString('en-IN')  : '—'}</td>
                        <td className="R mo">{pp  ? Math.round(ppAmt).toLocaleString('en-IN')  : '—'}</td>
                        <td className="R mo up">{total ? Math.round(total).toLocaleString('en-IN') : '—'}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody></table></div>
            </div>
          </div>
          {/* /corp bonds tab */}

          {/* ── SGB TAB ── */}
          <div className="dm-pane" id="dmp-sgb">
            <div className="dm-section-lbl"><div className="dm-sl-bar" style={{background:'#b7791f'}}></div><span>Sovereign Gold Bond (<SGB />)</span></div>
            <div className="g2">
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}><SGB /> Outstanding &#x2014; Yearly Trend</div>
                    <div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>&#x20B9;L Cr &middot; Financial Year &middot; RBI</div>
                  </div>
                </div>
                <div className="cp" style={{height:'260px'}}>{sgbTrendData.length > 0 ? <canvas id="c-sgb-trend"></canvas> : <NoData />}</div>
              </div>
              <div className="card"></div>
            </div>
          </div>
          {/* /sgb tab */}

          {/* ── G-SECS TAB ── */}
          <div className="dm-pane" id="dmp-gsec">
            <div className="dm-section-lbl"><div className="dm-sl-bar" style={{background:'#e07b39'}}></div><span>Government Securities (G-Secs)</span></div>

            {/* Row 1: G-Sec Maturity Profile + STRIPS Maturity Profile */}
            <div className="g2" style={{marginBottom:'12px'}}>
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)'}}><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>G-Sec Maturity Profile</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>By residual maturity bucket &middot; RBI</div></div>
                <div className="cp" style={{height:'220px'}}>{gsecMaturity?.buckets?.length > 0 ? <canvas id="c-gsec-maturity"></canvas> : <NoData />}</div>
                <div style={{borderTop:'1px solid var(--bdr)',padding:'10px 14px',textAlign:'center'}}>
                  <div style={{fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)',marginBottom:'3px'}}>Avg Maturity</div>
                  <div style={{fontSize:'15px',fontWeight:700,fontFamily:'var(--mo)',color:'var(--tx)'}}>{gsecMaturity?.stats?.avg_maturity_years != null ? `${gsecMaturity.stats.avg_maturity_years} yr` : '—'}</div>
                </div>
              </div>
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)'}}><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>STRIPS Maturity Profile</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>By residual maturity bucket &middot; RBI</div></div>
                <div className="cp" style={{height:'220px'}}>{stripsMaturity?.buckets?.length > 0 ? <canvas id="c-strips-maturity"></canvas> : <NoData />}</div>
                <div style={{borderTop:'1px solid var(--bdr)',padding:'10px 14px',textAlign:'center'}}>
                  <div style={{fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)',marginBottom:'3px'}}>Avg Maturity</div>
                  <div style={{fontSize:'15px',fontWeight:700,fontFamily:'var(--mo)',color:'var(--tx)'}}>{stripsMaturity?.stats?.avg_maturity_years != null ? `${stripsMaturity.stats.avg_maturity_years} yr` : '—'}</div>
                </div>
              </div>
            </div>

            {/* Row 2: G-Sec Outstanding Trend + STRIPS Outstanding Trend */}
            <div className="g2">
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)'}}><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>G-Sec Outstanding Trend</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>RBI · Financial Year</div></div>
                <div className="cp" style={{height:'220px'}}>{gsecTrendData.length > 0 ? <canvas id="c-gsec-trend"></canvas> : <NoData />}</div>
                <div style={{padding:'10px 14px',textAlign:'center',borderTop:'1px solid var(--bdr)'}}>
                  <div style={{fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)',marginBottom:'3px'}}>Latest</div>
                  <div style={{fontSize:'15px',fontWeight:700,fontFamily:'var(--mo)',color:'var(--tx)'}}>
                    {gsecTrendData.length > 0 ? fmtL([...gsecTrendData].sort((a,b) => a.period > b.period ? 1 : -1).at(-1)?.value) : '—'} Cr
                  </div>
                </div>
              </div>
              <div className="card">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--bdr)'}}><div style={{fontSize:'13px',fontWeight:600,color:'var(--tx)'}}>STRIPS Outstanding Trend</div><div style={{fontSize:'11px',color:'var(--tx3)',marginTop:'2px'}}>RBI · Financial Year</div></div>
                <div className="cp" style={{height:'220px'}}>{stripsData.length > 0 ? <canvas id="c-strips"></canvas> : <NoData />}</div>
                <div style={{padding:'10px 14px',textAlign:'center',borderTop:'1px solid var(--bdr)'}}>
                  <div style={{fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)',marginBottom:'3px'}}>Latest</div>
                  <div style={{fontSize:'15px',fontWeight:700,fontFamily:'var(--mo)',color:'var(--tx)'}}>{stripsLatest != null ? fmtL(stripsLatest / 1e7) : '—'} Cr</div>
                </div>
              </div>
            </div>
          </div>
          {/* /gsec */}

        </div>
        {/* /dm-content */}
      </div>
    </div>
  );
}
