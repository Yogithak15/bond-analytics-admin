import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import indiaGeoJSON from '../india-states-2019.json';
import { getStateOutstandingShare } from '../api/bond_api';

// ── GeoJSON uses properties.ST_NM (36 states/UTs incl. Ladakh & J&K separate)
// NAME_MAP: ALL-CAPS API names → exact GeoJSON ST_NM values
const NAME_MAP = {
  // Delhi
  'NCT OF DELHI':                    'Delhi',
  'NCT OF DELHI (UT)':               'Delhi',
  'DELHI':                           'Delhi',

  // J&K and Ladakh (post-2019 bifurcation)
  'JAMMU AND KASHMIR':               'Jammu & Kashmir',
  'JAMMU AND KASHMIR UT':            'Jammu & Kashmir',
  'JAMMU & KASHMIR':                 'Jammu & Kashmir',
  'J&K':                             'Jammu & Kashmir',
  'LADAKH':                          'Ladakh',
  'LADAKH (UT)':                     'Ladakh',

  // Puducherry — GeoJSON has "Puducherry"
  'PUDUCHERRY':                      'Puducherry',
  'PONDICHERRY':                     'Puducherry',

  // Andaman — GeoJSON has "Andaman & Nicobar"
  'ANDAMAN AND NICOBAR':             'Andaman & Nicobar',
  'ANDAMAN AND NICOBAR ISLANDS':     'Andaman & Nicobar',
  'ANDAMAN & NICOBAR':               'Andaman & Nicobar',
  'ANDAMAN & NICOBAR ISLANDS':       'Andaman & Nicobar',

  // Dadra + Daman merged UT
  'DADRA AND NAGAR HAVELI':          'Dadra and Nagar Haveli and Daman and Diu',
  'DAMAN AND DIU':                   'Dadra and Nagar Haveli and Daman and Diu',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'Dadra and Nagar Haveli and Daman and Diu',

  // Himachal duplicates
  'HIMACHAL':                        'Himachal Pradesh',
  'HIMACHAL PRADESH':                'Himachal Pradesh',

  // Tamil Nadu
  'TAMILNADU':                       'Tamil Nadu',
  'TAMIL NADU':                      'Tamil Nadu',

  // Odisha variants
  'ODISHA':                          'Odisha',
  'ORISSA':                          'Odisha',

  // Uttarakhand variants
  'UTTARAKHAND':                     'Uttarakhand',
  'UTTARANCHAL':                     'Uttarakhand',

  // Other states (direct match, kept for safety)
  'ARUNACHAL PRADESH':               'Arunachal Pradesh',
  'ASSAM':                           'Assam',
  'BIHAR':                           'Bihar',
  'CHANDIGARH':                      'Chandigarh',
  'CHHATTISGARH':                    'Chhattisgarh',
  'GOA':                             'Goa',
  'GUJARAT':                         'Gujarat',
  'HARYANA':                         'Haryana',
  'JHARKHAND':                       'Jharkhand',
  'KARNATAKA':                       'Karnataka',
  'KERALA':                          'Kerala',
  'LAKSHADWEEP':                     'Lakshadweep',
  'MADHYA PRADESH':                  'Madhya Pradesh',
  'MAHARASHTRA':                     'Maharashtra',
  'MANIPUR':                         'Manipur',
  'MEGHALAYA':                       'Meghalaya',
  'MIZORAM':                         'Mizoram',
  'NAGALAND':                        'Nagaland',
  'PUNJAB':                          'Punjab',
  'RAJASTHAN':                       'Rajasthan',
  'SIKKIM':                          'Sikkim',
  'TELANGANA':                       'Telangana',
  'TRIPURA':                         'Tripura',
  'UTTAR PRADESH':                   'Uttar Pradesh',
  'WEST BENGAL':                     'West Bengal',
  'ANDHRA PRADESH':                  'Andhra Pradesh',
};

// Case-insensitive normalise: API name → GeoJSON ST_NM
const normName = (n) => {
  if (!n) return '';
  const up = n.trim().toUpperCase();
  return NAME_MAP[up] || NAME_MAP[n.trim()] || n.trim();
};

// ── colours ──────────────────────────────────────────────────────────────────
const NO_DATA_COLOR = '#e8ebe4';

// ── formatters ───────────────────────────────────────────────────────────────
const fmtK = (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(v);
const fmtL = (v) =>
  v >= 100000 ? '₹' + (v / 100000).toFixed(1) + 'L Cr'
  : v >= 1000  ? '₹' + (v / 1000).toFixed(1) + 'K Cr'
  : '₹' + v + ' Cr';

// ── short labels for bar chart ────────────────────────────────────────────────
const SHORT = {
  'Tamil Nadu': 'TN', 'Maharashtra': 'MH', 'Uttar Pradesh': 'UP',
  'West Bengal': 'WB', 'Karnataka': 'KA', 'Andhra Pradesh': 'AP',
  'Rajasthan': 'RJ', 'Telangana': 'TG', 'Gujarat': 'GJ',
  'Madhya Pradesh': 'MP', 'Haryana': 'HR', 'Punjab': 'PB',
  'Kerala': 'KL', 'Bihar': 'BR', 'Assam': 'AS',
  'Odisha': 'OD', 'Jharkhand': 'JH', 'Chhattisgarh': 'CG',
  'Uttarakhand': 'UK', 'Himachal Pradesh': 'HP', 'Delhi': 'DL',
  'Jammu & Kashmir': 'J&K', 'Ladakh': 'LA', 'Puducherry': 'PY',
};
const shorten = (n) => SHORT[n] || n.slice(0, 5);

// Preprocess GeoJSON: add `name` property from ST_NM so ECharts can find it
// (ECharts defaults to looking for properties.name; our GeoJSON only has ST_NM)
const indiaGeoNormalized = {
  ...indiaGeoJSON,
  features: indiaGeoJSON.features.map(f => ({
    ...f,
    properties: { ...f.properties, name: f.properties.ST_NM },
  })),
};
echarts.registerMap('india-sdl', indiaGeoNormalized);

// ── Chart.js plugin: draw value labels on bars ────────────────────────────────
const VALUE_LABEL_PLUGIN = {
  id: 'sdlValueLabels',
  afterDatasetsDraw(chart) {
    try {
      const barMeta = chart.getDatasetMeta(0);
      if (!barMeta?.data) return;
      const ds = chart.data.datasets[0];
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = "bold 9.5px 'JetBrains Mono',monospace";
      ctx.fillStyle = '#9a9d92';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      barMeta.data.forEach((bar, i) => {
        if (!bar || bar.x == null || bar.y == null) return;
        const v = ds.data[i];
        if (v == null) return;
        const lbl = v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v);
        ctx.fillText(lbl, bar.x + 5, bar.y);
      });
      ctx.restore();
    } catch (_) { /* silently ignore */ }
  },
};

// ── component ─────────────────────────────────────────────────────────────────
export default function IndiaMap({ isDark, showRankings = true, plainMap = false, pieData = [] }) {
  const wrapRef  = useRef(null);
  const chartRef = useRef(null);

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── fetch API ───────────────────────────────────────────────────────────────
  useEffect(() => {
    getStateOutstandingShare()
      .then(raw => {
        const arr = Array.isArray(raw) ? raw : (raw.data || raw.states || raw.items || []);

        // Merge entries that normalise to the same GeoJSON state name
        const merged = {};
        arr.forEach(item => {
          const name  = normName(item.state || item.state_name || item.name || '');
          const value = Number(item.total_outstanding ?? item.outstanding_amount ?? item.amount ?? item.value ?? 0);
          const share = Number(item.share_percent ?? item.share_percentage ?? item.share ?? 0);
          if (!name || value <= 0) return;
          if (merged[name]) {
            merged[name].value += value;
            merged[name].share += share;
          } else {
            merged[name] = { name, value, share };
          }
        });

        const mapped = Object.values(merged).sort((a, b) => b.value - a.value);
        setRows(mapped);
        window['sdlStateData'] = mapped;

        // Update the header total pill in DashboardPage
        const grandTotal = mapped.reduce((s, d) => s + d.value, 0);
        const fmt = grandTotal >= 100000
          ? '₹' + (grandTotal / 100000).toFixed(1) + 'L Cr'
          : '₹' + grandTotal.toLocaleString('en-IN') + ' Cr';
        const pill = document.getElementById('sdl-total-v');
        if (pill) pill.textContent = fmt;
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── derived ─────────────────────────────────────────────────────────────────
  const total  = rows.reduce((s, d) => s + d.value, 0);
  const maxVal = rows[0]?.value || 1;
  const top5Pct = rows.length >= 5
    ? ((rows.slice(0, 5).reduce((s, d) => s + d.value, 0) / total) * 100).toFixed(1)
    : '—';

  // ── populate overview left-panel stat elements ───────────────────────────────
  useEffect(() => {
    if (!rows.length || showRankings) return;
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('sdl-ov-top-state',     rows[0]?.name ?? '—');
    set('sdl-ov-top-state-val', rows[0] ? fmtL(rows[0].value) : '—');
    set('sdl-ov-states-count',  String(rows.length));
    set('sdl-ov-top5-pct',      rows.length >= 5 ? top5Pct + '%' : '—');
  }, [rows, showRankings, top5Pct]);

  // ── ECharts option ──────────────────────────────────────────────────────────
  const buildOption = useCallback(() => {
    // All 36 state names — use the normalized GeoJSON (same ST_NM values, now also as `name`)
    const geoNames = indiaGeoNormalized.features.map(f => f.properties['name']).filter(Boolean);
    const byName   = Object.fromEntries(rows.map(d => [d.name, d]));

    // Top state (rank #1 by outstanding value)
    const topStateName = rows[0]?.name ?? null;

    // Build data array: value=null for no-data states (visualMap outOfRange handles them)
    // The top state gets an explicit itemStyle override so it always stands out.
    const mapData = geoNames.map(name => {
      const d = byName[name];
      if (name === topStateName) {
        return {
          name,
          value: d ? d.value : null,
          itemStyle: {
            areaColor:   '#e07b39',
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false },
        };
      }
      return { name, value: d ? d.value : null };
    });

    const dark = isDark;

    // Plain map (overview): single solid silhouette + optional donut pie series
    if (plainMap) {
      const PLAIN_FILL = dark ? '#2a3a50' : '#bdd4eb';
      const cW = wrapRef.current?.clientWidth  || 800;
      const cH = wrapRef.current?.clientHeight || 500;
      const minDim = Math.min(cW, cH);

      // Slightly larger fill so India takes up more of the card
      const fillW = (cW * 0.96) / (0.75 * minDim);
      const fillH = (cH * 0.94) / (0.95 * minDim);
      const layoutSizeNum = Math.min(fillW, fillH);
      const layoutSize = `${Math.round(layoutSizeNum * 100)}%`;

      const bboxWidthPx = 0.75 * layoutSizeNum * minDim;
      const mainlandCX  = Math.max(0.38, Math.min(0.54, 0.50 - 0.16 * (bboxWidthPx / cW)));

      // Larger pie
      const outerR = Math.min(80, Math.round(minDim * 0.18));
      const innerR = Math.round(outerR * 0.60);

      const mapSeries = {
        name: 'India', type: 'map', map: 'india-sdl',
        roam: false,
        layoutCenter: ['50%', '53%'],
        layoutSize,
        aspectScale: 1, animation: false,
        label: { show: false },
        emphasis: { disabled: true }, select: { disabled: true },
        itemStyle: { areaColor: PLAIN_FILL, borderColor: PLAIN_FILL, borderWidth: 0 },
        data: [],
      };

      const series  = [mapSeries];
      const graphic = [];

      if (pieData.length > 0) {
        // Pie: no ECharts labels — we draw them manually via graphic so they
        // are always clamped inside the India silhouette
        series.push({
          type: 'pie',
          center: [`${Math.round(mainlandCX * 100)}%`, '50%'],
          radius: [innerR, outerR],
          data: pieData.map(d => ({ value: d.value, name: d.name, itemStyle: { color: d.color } })),
          label:     { show: false },
          labelLine: { show: false },
          emphasis:  { scale: false, disabled: true },
          silent: true,
          z: 5,
          animationDuration: 600,
        });

        // Place name + % just outside each donut arc but inside India's body
        const pieCX   = mainlandCX * cW;
        const pieCY   = cH * 0.5;
        const labelR  = outerR + Math.max(14, Math.round(minDim * 0.04));
        const ttl     = pieData.reduce((s, d) => s + (d.value || 0), 0);
        const nmSize  = Math.max(8, Math.min(11, Math.round(minDim * 0.026)));
        const pctSize = Math.max(9, Math.min(12, Math.round(minDim * 0.030)));
        const gap     = nmSize * 0.9;

        let cum = 0;
        pieData.forEach(d => {
          const startDeg = (cum / ttl) * 360 - 90;
          cum += d.value || 0;
          const endDeg  = (cum / ttl) * 360 - 90;
          if (endDeg - startDeg < 20) return;
          const midRad = ((startDeg + endDeg) / 2) * (Math.PI / 180);
          const lx = Math.round(pieCX + labelR * Math.cos(midRad));
          const ly = Math.round(pieCY + labelR * Math.sin(midRad));
          const pct = ((d.value / ttl) * 100).toFixed(1) + '%';

          graphic.push({
            type: 'text', x: lx, y: ly - gap, z: 10,
            style: {
              text: d.name,
              textAlign: 'center', textVerticalAlign: 'middle',
              fill: dark ? '#e8f4ff' : '#1a2a3a',
              fontSize: nmSize, fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace",
            },
          });
          graphic.push({
            type: 'text', x: lx, y: ly + gap * 0.4, z: 10,
            style: {
              text: pct,
              textAlign: 'center', textVerticalAlign: 'middle',
              fill: d.color,
              fontSize: pctSize, fontWeight: 800,
              fontFamily: "'JetBrains Mono',monospace",
            },
          });
        });
      }

      return { backgroundColor: 'transparent', tooltip: { show: false }, graphic, series };
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: '#1a1c18',
        borderColor: 'rgba(255,255,255,.1)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#f0f1ed', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 },
        formatter: (params) => {
          const { name, value } = params;
          if (value != null && value > 0) {
            const d = byName[name];
            const pct = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
            const apiShare = d?.share > 0 ? d.share.toFixed(2) : pct;
            return `<div style="font-weight:700;font-size:13px;margin-bottom:4px">${name}</div>`
              + `<div style="color:#8ecba6">₹ ${Number(value).toLocaleString('en-IN')} Cr</div>`
              + `<div style="color:#aaa;font-size:10px;margin-top:2px">Share: ${apiShare}% of total SGS</div>`;
          }
          return `<div style="font-weight:700;font-size:13px">${name}</div>`
            + `<div style="color:#686868;font-size:11px;margin-top:3px">No data available</div>`;
        },
      },
      // visualMap drives choropleth — continuous green ramp, grey for no-data
      visualMap: {
        type: 'continuous',
        min: 0,
        max: maxVal,
        inRange: { color: ['#cce0f0', '#80b4d8', '#3d87be', '#00447b', '#002a4e'] },
        outOfRange: { color: [NO_DATA_COLOR] },
        show: false,
      },
      series: [{
        name: 'SDL Outstanding',
        type: 'map',
        map: 'india-sdl',
        roam: false,
        layoutCenter: ['50%', '52%'],
        layoutSize: showRankings ? '102%' : '96%',
        aspectScale: 1,
        animation: false,
        label: { show: false },
        emphasis: {
          disabled: false,
          label: {
            show: true,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono',monospace",
            formatter: (p) => p.name,
          },
          itemStyle: { areaColor: '#e07b39', borderColor: '#fff', borderWidth: 1.5 },
        },
        select: { disabled: true },
        itemStyle: {
          borderColor: dark ? '#3a4a40' : '#fff',
          borderWidth: 0.7,
          areaColor: NO_DATA_COLOR,
        },
        data: mapData,
      }],
    };
  }, [rows, isDark, maxVal, total, showRankings, plainMap, pieData]);

  // ── init / update ECharts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current || rows.length === 0) return;
    let ro = null;

    const init = (w, h) => {
      if (chartRef.current) { chartRef.current.dispose(); chartRef.current = null; }
      chartRef.current = echarts.init(wrapRef.current, null, { renderer: 'canvas', width: w, height: h });
      chartRef.current.setOption(buildOption());
    };

    ro = new ResizeObserver(entries => {
      // requestAnimationFrame prevents "ResizeObserver loop completed" browser warning
      window.requestAnimationFrame(() => {
        for (const e of entries) {
          const { width, height } = e.contentRect;
          if (width > 0 && height > 0) {
            if (!chartRef.current) init(width, height);
            else {
              chartRef.current.resize({ width, height });
              // Plain map: recompute layoutSize so India always fills the new width
              if (plainMap) chartRef.current.setOption(buildOption(), { notMerge: true });
            }
          }
        }
      });
    });
    ro.observe(wrapRef.current);

    // Init immediately if container already has dimensions
    const w = wrapRef.current.clientWidth;
    const h = wrapRef.current.clientHeight || 320;
    if (w > 0) init(w, h);

    return () => {
      ro?.disconnect();
      if (chartRef.current) { chartRef.current.dispose(); chartRef.current = null; }
    };
  }, [rows, buildOption]);

  // ── redraw c-ov-sdl-states bar chart with API data ───────────────────────────
  useEffect(() => {
    if (!rows.length) return;
    const C = window['Chart'];
    if (!C) return;

    const draw = () => {
      const el = document.getElementById('c-ov-sdl-states');
      if (!el) return;

      const top10  = rows.slice(0, 10);
      const labels = top10.map(d => shorten(d.name));
      const values = top10.map(d => Math.round(d.value / 1000)); // ₹K Cr
      const shares = top10.map(d =>
        d.share > 0 ? +d.share.toFixed(1) : +((d.value / total) * 100).toFixed(1)
      );

      const dk = isDark;
      const gc = dk ? 'rgba(255,255,255,.05)' : 'rgba(26,28,24,.04)';
      const tc = dk ? '#686868' : '#9a9d92';

      const existing = C.getChart ? C.getChart(el) : null;
      if (existing) existing.destroy();

      new C(el, {
        plugins: [VALUE_LABEL_PLUGIN],
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '₹K Cr',
              data: values,
              backgroundColor: 'rgba(0,68,123,.7)',
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
              pointBorderColor: dk ? '#08111f' : '#fff',
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
              backgroundColor: dk ? '#0d0d0d' : '#1a1c18',
              borderColor: dk ? 'rgba(255,255,255,.12)' : 'rgba(26,28,24,.12)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: dk ? '#e8e8e8' : '#f0f1ed',
              bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
              padding: 10,
              cornerRadius: 9,
              callbacks: {
                title: (items) => top10[items[0].dataIndex]?.name || '',
                label: (ctx) =>
                  ctx.datasetIndex === 0
                    ? ` ₹${fmtK(ctx.parsed.y * 1000)} Cr outstanding`
                    : ` ${ctx.parsed.y}% of total SDL`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gc, lineWidth: 0.5 },
              ticks: { color: tc, font: { size: 10 } },
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
            },
          },
        },
      });
    };

    const t = setTimeout(draw, 800);
    return () => clearTimeout(t);
  }, [rows, isDark, total]);

  // ── render ───────────────────────────────────────────────────────────────────

  // Plain map (overview): single flat div — no nested height:100% chains that
  // can break on mobile where ancestors have height:auto.
  if (plainMap) {
    const outlineColor = isDark ? 'rgba(90,138,176,0.9)' : 'rgba(74,120,180,0.85)';
    return (
      <div
        ref={wrapRef}
        style={{
          width: '100%', height: '100%', minHeight: 0, display: 'block',
          filter: `drop-shadow(1px 0 0 ${outlineColor}) drop-shadow(-1px 0 0 ${outlineColor}) drop-shadow(0 1px 0 ${outlineColor}) drop-shadow(0 -1px 0 ${outlineColor})`,
        }}
      />
    );
  }

  // Loading / error: render inside both columns so the grid doesn't collapse
  if (loading || error || rows.length === 0) {
    return (
      <>
        <div className="sdl-map-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...(!showRankings && { gridColumn: '1/-1', borderRight: 'none', height: '100%' }) }}>
          <span style={{ color: 'var(--tx3)', fontSize: 12 }}>
            {loading ? 'Loading state/UT data…' : error ? `Error: ${error}` : 'No data'}
          </span>
        </div>
        {showRankings && <div className="sdl-lb" />}
      </>
    );
  }

  return (
    <>
      {/* ── LEFT COLUMN: map + legend ── */}
      <div className="sdl-map-col" style={showRankings ? {} : { gridColumn: '1/-1', borderRight: 'none', alignItems: 'center', height: '100%', padding: 0 }}>
        {/* ECharts canvas */}
        <div style={{ position: 'relative', flexShrink: 0, width: '100%', height: showRankings ? 'auto' : '100%', maxWidth: showRankings ? 'none' : 'none' }}>
          <div ref={wrapRef} style={{ width: '100%', height: showRankings ? '500px' : '100%' }} />

          {/* Floating stats — only in rankings mode; overview uses the left panel */}
          {showRankings && <>
            <div className="sdl-map-floats">
              <div className="sdl-float">
                <div className="sdl-float-l">Highest Outstanding</div>
                <div className="sdl-float-v">{rows[0]?.name}</div>
                <div className="sdl-float-s">{fmtL(rows[0]?.value)}</div>
              </div>
              <div className="sdl-float">
                <div className="sdl-float-l">States/UTs</div>
                <div className="sdl-float-v">{rows.length}</div>
                <div className="sdl-float-s">Reporting</div>
              </div>
            </div>
            <div className="sdl-map-floats-bottom">
              <div className="sdl-float">
                <div className="sdl-float-l">Top 5 Share</div>
                <div className="sdl-float-v">{top5Pct}%</div>
                <div className="sdl-float-s">Concentration</div>
              </div>
            </div>
          </>}
        </div>


      </div>

      {/* ── RIGHT COLUMN: rankings 1–15 ── */}
      {showRankings && <div className="sdl-lb">
        <div className="sdl-rest">
          {rows.slice(0, 15).map(({ name, value, share }, i) => {
            const rank = i + 1;
            const pct  = share > 0 ? share.toFixed(1) : ((value / total) * 100).toFixed(1);
            const barW = ((value / maxVal) * 100).toFixed(1);
            return (
              <div className="sdl-rest-row" key={name}>
                <span className="sdl-rr-n">
                  <em>{rank}</em>
                  {name}
                </span>
                <div className="sdl-rr-track">
                  <div className="sdl-rr-fill" style={{ width: `${barW}%` }}>
                    <span className="sdl-rr-bar-lbl">{Number(value).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <span className="sdl-rr-v">{Number(value).toLocaleString('en-IN')}</span>
                <span className="sdl-rr-p">{pct}%</span>
              </div>
            );
          })}
        </div>

      </div>}
    </>
  );
}
