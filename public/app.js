/* ═══════════════════════════════════════════
   OVERVIEW + SDL + CORP CHARTS
═══════════════════════════════════════════ */
function initOverviewCharts() {
  if(typeof Chart==='undefined') return;
  const dk=tc_();
  const gc=dk?'rgba(255,255,255,.05)':'rgba(26,28,24,.04)';
  const tc=dk?'#686868':'#9a9d92';
  const base={responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{backgroundColor:dk?'#0d0d0d':'#1a1c18',borderColor:dk?'rgba(255,255,255,.12)':'rgba(26,28,24,.12)',borderWidth:1,titleColor:'#888',bodyColor:dk?'#e8e8e8':'#1a1c18',bodyFont:{family:"'JetBrains Mono',monospace",size:11},padding:9,cornerRadius:9}},
    scales:{x:{grid:{color:gc,lineWidth:.5},ticks:{color:tc,font:{size:10},maxRotation:0},border:{display:false}},y:{grid:{color:gc,lineWidth:.5},ticks:{color:tc,font:{family:"'JetBrains Mono',monospace",size:10}},border:{display:false}}}
  };
  const legOpts={display:true,position:'top',align:'end',labels:{color:tc,font:{size:10},boxWidth:10,boxHeight:10,padding:10}};
  const y1Opts=(cb)=>({position:'right',grid:{drawOnChartArea:false},ticks:{color:tc,font:{family:"'JetBrains Mono',monospace",size:10},callback:cb},border:{display:false}});
  const FY=['18-19','19-20','20-21','21-22','22-23','23-24','24-25','25-26'];

  const init=(id,cfg)=>{
    const el=document.getElementById(id); if(!el) return;
    try{ if(charts[id]) charts[id].destroy(); charts[id]=new Chart(el,cfg); }
    catch(e){ console.warn('chart err:',id,e.message); }
  };

  // Market Composition donut
  init('c-ov-comp',{type:'doughnut',data:{labels:['G-Secs','SDLs','Corp Bonds'],datasets:[{data:[120.4,69.3,58.0],backgroundColor:['#e07b39','#0e7490','#2d8a4e'],borderColor:dk?'#141414':'#fafafa',borderWidth:3,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false},tooltip:{backgroundColor:dk?'#0d0d0d':'#1a1c18',bodyColor:dk?'#e8e8e8':'#1a1c18',bodyFont:{family:"'JetBrains Mono',monospace",size:11},padding:9,cornerRadius:9}}}});

  // NCD vs PP
  init('c-ov-ncd-pp',{type:'bar',data:{labels:FY,datasets:[{type:'bar',label:'NCD Issues',data:[14200,9800,4200,5600,6000,8400,6800,8272],backgroundColor:'rgba(45,138,78,.7)',borderColor:'transparent',borderRadius:4,borderSkipped:false,yAxisID:'y'},{type:'line',label:'PP Issues (K)',data:[1.1,1.25,1.2,1.45,1.6,1.9,1.8,730],borderColor:'#2557a7',borderWidth:2.5,pointRadius:3.5,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:.4,yAxisID:'y1'}]},options:{...base,plugins:{...base.plugins,legend:legOpts},scales:{...base.scales,y:{...base.scales.y,ticks:{...base.scales.y.ticks,callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v}},y1:y1Opts(v=>v>=1000?(v/1000).toFixed(1)+'K':v)}}});

  // Corp Outstanding
  const QT=['Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'];
  init('c-ov-corp-os',{type:'bar',data:{labels:QT,datasets:[{type:'bar',label:'Outstanding (₹K Cr)',data:[4800,4900,4600,4800,5000,4700,4800,4900,4600,4700,4800,5000],backgroundColor:'rgba(45,138,78,.75)',borderColor:'transparent',borderRadius:3,borderSkipped:false,yAxisID:'y'},{type:'line',label:'Trades (M)',data:[.35,.38,.40,.42,.44,.41,.43,.47,.45,.46,.48,.50],borderColor:'#2557a7',borderWidth:2,pointRadius:2.5,pointBackgroundColor:'#2557a7',fill:false,tension:.4,yAxisID:'y1'}]},options:{...base,plugins:{...base.plugins,legend:legOpts},scales:{...base.scales,y:{...base.scales.y,ticks:{...base.scales.y.ticks,callback:v=>v+'K'}},y1:y1Opts(v=>v.toFixed(2)+'M')}}});

  // SDL states overview
  const st=['TN','MH','UP','WB','KA','AP','RJ','TG','GJ','MP'];
  const sv=[778,674,579,569,501,476,460,417,325,317];
  const tot=sv.reduce((a,b)=>a+b,0);
  init('c-ov-sdl-states',{type:'bar',data:{labels:st,datasets:[{type:'bar',label:'Outstanding (₹K Cr)',data:sv,backgroundColor:sv.map((_,i)=>`rgba(45,138,78,${0.45+i*0.045})`),borderColor:'transparent',borderRadius:4,borderSkipped:false,yAxisID:'y'},{type:'line',label:'Share %',data:sv.map(v=>+((v/tot)*100).toFixed(1)),borderColor:'#2557a7',borderWidth:2,pointRadius:3.5,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:.3,yAxisID:'y1'}]},options:{...base,plugins:{...base.plugins,legend:legOpts},scales:{...base.scales,y:{...base.scales.y,ticks:{...base.scales.y.ticks,callback:v=>v+'K'}},y1:y1Opts(v=>v+'%')}}});

  // SDL trend
  init('c-sdl-trend',{type:'bar',data:{labels:FY,datasets:[{type:'bar',label:'SDL O/S (₹L Cr)',data:[32,38,44,51,55,60,65,69.3],backgroundColor:'rgba(45,138,78,.75)',borderColor:'transparent',borderRadius:4,borderSkipped:false,yAxisID:'y'},{type:'line',label:'YoY Growth %',data:[null,18.8,15.8,15.9,7.8,9.1,8.3,6.6],borderColor:'#2557a7',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:.4,yAxisID:'y1'}]},options:{...base,plugins:{...base.plugins,legend:legOpts},scales:{...base.scales,y:{...base.scales.y,ticks:{...base.scales.y.ticks,callback:v=>v+'L'}},y1:y1Opts(v=>v+'%')}}});

  // SDL states detail
  init('c-sdl-states',{type:'bar',data:{labels:['Tamil Nadu','Maharashtra','Uttar Pradesh','West Bengal','Karnataka','Andhra Pradesh','Rajasthan','Telangana','Gujarat','Madhya Pradesh'],datasets:[{type:'bar',label:'Outstanding (₹K Cr)',data:[778,674,579,569,501,476,460,417,325,317],backgroundColor:'rgba(45,138,78,.75)',borderColor:'transparent',borderRadius:4,borderSkipped:false,yAxisID:'y'},{type:'line',label:'Share %',data:[11.2,9.7,8.3,8.2,7.2,6.9,6.6,6.0,4.7,4.6],borderColor:'#2557a7',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:.3,yAxisID:'y1'}]},options:{...base,plugins:{...base.plugins,legend:legOpts},scales:{...base.scales,x:{...base.scales.x,ticks:{color:tc,font:{size:9},maxRotation:30}},y:{...base.scales.y,ticks:{...base.scales.y.ticks,callback:v=>v+'K'}},y1:y1Opts(v=>v+'%')}}});

  // Corp trade
  init('c-trade',{type:'bar',data:{labels:FY,datasets:[{type:'bar',label:'Volume (₹L Cr)',data:[6.4,9.8,11.5,12.2,11.8,12.4,11.9,23.8],backgroundColor:(ctx)=>ctx.dataIndex===7?'rgba(45,138,78,.90)':'rgba(45,138,78,.65)',borderColor:'transparent',borderRadius:4,borderSkipped:false,yAxisID:'y'},{type:'line',label:'Trades (M)',data:[.4,.7,.9,1.0,1.1,1.2,1.4,1.8],borderColor:'#2557a7',borderWidth:2.5,pointRadius:3.5,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:.5,yAxisID:'y1'}]},options:{...base,plugins:{...base.plugins,legend:legOpts},scales:{...base.scales,y:{...base.scales.y,ticks:{...base.scales.y.ticks,callback:v=>v+'L'}},y1:y1Opts(v=>v+'M')}}});

  // Issuer donut
  init('c-issuer',{type:'doughnut',data:{labels:['PSU / Govt','Private Corp','Banks / FIs'],datasets:[{data:[60,26,14],backgroundColor:['#c47a1e','#2557a7','#2d8a4e'],borderColor:dk?'#141414':'#fafafa',borderWidth:3,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:true,position:'bottom',labels:{color:dk?'#686868':'#9a9d92',font:{size:10},boxWidth:10,boxHeight:10,padding:10}},tooltip:{backgroundColor:dk?'#0d0d0d':'#1a1c18',bodyColor:dk?'#e8e8e8':'#1a1c18',bodyFont:{family:"'JetBrains Mono',monospace",size:11},padding:9,cornerRadius:9}}}});
}


/* ═══════════════════════════════════════════
   DATASET DATA — loaded from API
═══════════════════════════════════════════ */

const BASE_URL = "https://bondanalytics-api.bondbulls.in";

// Live dataset array — populated by loadDataSources()
let DATASETS = [];

// Track whether initial load has happened
let _datasetsLoaded = false;
let _datasetsLoading = false;

/**
 * Map a raw API data-source object to the local DATASETS shape.
 * API fields observed: id, name, description, source_name, source_short_name,
 * frequency, is_active, last_updated, category, metric_count, dimension_count,
 * date_attribute_count, source_url_count
 * All fields are optional — sensible defaults applied where missing.
 */
function mapApiSource(raw) {
  // Derive a stable src key from source_short_name (e.g. "NSE EBP" → "nse")
  const shortName = (raw.source_short_name || raw.source_name || '').toLowerCase();
  let srcKey = 'other';
  if (shortName.includes('nse'))  srcKey = 'nse';
  else if (shortName.includes('rbi'))  srcKey = 'rbi';
  else if (shortName.includes('sebi')) srcKey = 'sebi';
  else if (shortName.includes('ccil')) srcKey = 'ccil';
  else if (shortName.includes('fbil')) srcKey = 'fbil';
  else if (shortName.includes('bse'))  srcKey = 'bse';

  // Normalise frequency to one of the three known values
  const rawFreq = (raw.frequency || '').toLowerCase();
  let freq = 'weekly';
  if (rawFreq.includes('daily'))        freq = 'daily';
  else if (rawFreq.includes('month'))   freq = 'monthly';
  else if (rawFreq.includes('quarter')) freq = 'quarterly';
  else if (rawFreq.includes('week'))    freq = 'weekly';

  // Format last_updated date nicely if it's an ISO string
  let updated = raw.last_updated || raw.updated_at || '';
  if (updated) {
    try {
      const d = new Date(updated);
      if (!isNaN(d)) {
        updated = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
      }
    } catch(_) {}
  }

  return {
    id:         raw.id            || raw.slug || String(raw.id || ''),
    title:      raw.name          || raw.title || 'Untitled Dataset',
    src:        srcKey,
    srcLabel:   raw.source_short_name || raw.source_name || srcKey.toUpperCase(),
    freq,
    metrics:    raw.metric_count       != null ? raw.metric_count       : (raw.metrics       || 0),
    dims:       raw.dimension_count    != null ? raw.dimension_count    : (raw.dims          || 0),
    dateAttrs:  raw.date_attribute_count != null ? raw.date_attribute_count : (raw.dateAttrs || 0),
    srcURLs:    raw.source_url_count   != null ? raw.source_url_count   : (raw.srcURLs       || 0),
    updated,
    status:     raw.is_active === false ? 'inactive' : 'active',
    desc:       raw.description  || '',
    url:        raw.source_url   || raw.url || '',
    cat:        raw.category     || raw.cat || '',
  };
}

/**
 * Fetch all data sources from the API (auto-paginate if needed).
 * Renders a loading skeleton in the catalog list while fetching,
 * then populates DATASETS, re-renders filters + summary, and calls renderCatalog().
 */
async function loadDataSources() {
  if (_datasetsLoading) return;
  _datasetsLoading = true;

  // Show loading skeleton in the list
  const wrap = document.getElementById('cat-rows');
  if (wrap) {
    wrap.innerHTML = `
      <div style="padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:14px">
        <div style="display:flex;flex-direction:column;gap:10px;width:100%">
          ${[...Array(5)].map(()=>`
            <div style="height:48px;background:var(--sf2);border-radius:8px;animation:catSkel 1.4s ease-in-out infinite;opacity:.7"></div>
          `).join('')}
        </div>
        <div style="font-size:12px;color:var(--tx3);margin-top:4px">Loading datasets…</div>
      </div>`;
  }

  // Inject skeleton keyframe once
  if (!document.getElementById('_skel_style')) {
    const s = document.createElement('style');
    s.id = '_skel_style';
    s.textContent = `@keyframes catSkel{0%,100%{opacity:.45}50%{opacity:.85}}`;
    document.head.appendChild(s);
  }

  try {
    // Paginate until exhausted
    const PAGE = 50;
    let skip = 0;
    const all = [];

    while (true) {
      const res = await fetch(`${BASE_URL}/data-sources/?skip=${skip}&limit=${PAGE}`, {
        headers: { accept: 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = await res.json();
      const rows = Array.isArray(page) ? page : (page.items || page.data || []);
      if (!rows.length) break;
      all.push(...rows);
      if (rows.length < PAGE) break;
      skip += PAGE;
    }

    DATASETS = all.map(mapApiSource);
    _datasetsLoaded = true;

  } catch (err) {
    console.error('loadDataSources error:', err);
    // Show error state in list
    if (wrap) {
      wrap.innerHTML = `
        <div style="padding:40px 20px;text-align:center">
          <div style="font-size:13px;color:var(--tx2);margin-bottom:8px">Failed to load datasets</div>
          <div style="font-size:11px;color:var(--tx3);margin-bottom:16px">${err.message}</div>
          <button class="btn" onclick="loadDataSources()" style="font-size:12px">Retry</button>
        </div>`;
    }
    _datasetsLoading = false;
    return;
  }

  _datasetsLoading = false;

  // Rebuild sidebar source filters from live data
  rebuildSourceFilters();

  // Update summary KPI strip
  updateCatalogSummary();

  // Render the list
  renderCatalog();
}

/**
 * Rebuild the sidebar "Source" filter pills dynamically from DATASETS.
 * Also syncs the mobile filters panel.
 */
function rebuildSourceFilters() {
  const container    = document.getElementById('cat-src-filters');
  const mobContainer = document.getElementById('mob-src-filters');

  // Count per source key
  const counts = {};
  DATASETS.forEach(d => { counts[d.src] = (counts[d.src] || 0) + 1; });

  const total = DATASETS.length;
  const srcLabels = {};
  DATASETS.forEach(d => { srcLabels[d.src] = d.srcLabel; });

  // Sort sources by count descending
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const allRow = (extraOnClick='') =>
    `<div class="src-row on" id="src-all" onclick="setSrc('all',this)${extraOnClick}">
       <span class="src-label">All Sources</span>
       <span class="src-count">${total}</span>
     </div>`;

  const srcRows = (extraOnClick='') => sorted.map(([key, cnt]) =>
    `<div class="src-row" id="src-${key}" onclick="setSrc('${key}',this)${extraOnClick}">
       <span class="src-label">${srcLabels[key] || key.toUpperCase()}</span>
       <span class="src-count">${cnt}</span>
     </div>`
  ).join('');

  if (container) container.innerHTML = allRow() + srcRows();

  // Mobile panel — mirror same list, but clicking also syncs desktop sidebar
  if (mobContainer) {
    mobContainer.innerHTML =
      `<div class="src-row on" onclick="setSrc('all',this);document.getElementById('src-all')?.classList.add('on')">
         <span class="src-label">All Sources</span>
         <span class="src-count">${total}</span>
       </div>` +
      sorted.map(([key, cnt]) =>
        `<div class="src-row" onclick="setSrc('${key}',this);document.querySelectorAll('#cat-src-filters .src-row').forEach(r=>r.classList.remove('on'));document.getElementById('src-${key}')?.classList.add('on')">
           <span class="src-label">${srcLabels[key] || key.toUpperCase()}</span>
           <span class="src-count">${cnt}</span>
         </div>`
      ).join('');
  }
}

/**
 * Update the summary KPI strip and frequency filter counts from live DATASETS.
 */
function updateCatalogSummary() {
  const active   = DATASETS.filter(d => d.status === 'active').length;
  const total    = DATASETS.length;
  const metrics  = DATASETS.reduce((s, d) => s + (d.metrics || 0), 0);
  const dims     = DATASETS.reduce((s, d) => s + (d.dims    || 0), 0);

  setEl('sum-kpi-total',   String(total));
  setEl('sum-kpi-active',  String(active));
  setEl('sum-kpi-metrics', metrics >= 1000 ? (metrics/1000).toFixed(1)+'K' : String(metrics));
  setEl('sum-kpi-dims',    dims >= 1000000 ? (dims/1000000).toFixed(2)+'M' : dims >= 1000 ? (dims/1000).toFixed(1)+'K' : String(dims));

  // Frequency counts
  const freqCounts = { daily: 0, weekly: 0, monthly: 0, quarterly: 0 };
  DATASETS.forEach(d => { if (freqCounts[d.freq] !== undefined) freqCounts[d.freq]++; });

  setEl('freq-count-all',       String(total));
  setEl('freq-count-daily',     String(freqCounts.daily));
  setEl('freq-count-weekly',    String(freqCounts.weekly));
  setEl('freq-count-monthly',   String(freqCounts.monthly));
  setEl('freq-count-quarterly', String(freqCounts.quarterly));

  setEl('mob-freq-count-all',     String(total));
  setEl('mob-freq-count-daily',   String(freqCounts.daily));
  setEl('mob-freq-count-weekly',  String(freqCounts.weekly));
  setEl('mob-freq-count-monthly', String(freqCounts.monthly));
}

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const charts = {};
let expChartType = 'line';
let catSrcFilter  = 'all';
let catStatusFilter = 'all';
let catFreqFilter = 'all';
let catSortKey    = 'name';
let currentView   = 'list';
let currentDsId   = null;

/* ═══════════════════════════════════════════
   ROUTING
═══════════════════════════════════════════ */
const PAGES = ['overview','mp','dm','fpi','deriv','prim','mf','wm','odi','comm','im','macro','insights','dash','catalog','detail','ref'];

function navigate(name) {
  window._setActivePage?.(name);
  PAGES.forEach(p=>{const el=document.getElementById('page-'+p);if(el){el.classList.remove('on');el.style.display='none';}});
  document.querySelectorAll('.sb-item').forEach(n=>n.classList.remove('on'));
  const el=document.getElementById('page-'+name); if(el){el.classList.add('on');el.style.display='flex';}
  const ni=document.getElementById('sni-'+name); if(ni) ni.classList.add('on');
  location.hash = name === 'dash' ? 'dashboard' : name;
  const initMap={
    overview:()=>{},
    mp:      ()=>{},
    dm:      ()=>{},
    fpi:     ()=>{},
    deriv:   ()=>{},
    prim:    ()=>{},
    mf:      ()=>{},
    wm:      ()=>{},
    odi:     ()=>{},
    comm:    ()=>{},
    im:      ()=>{},
    macro:   ()=>{},
    insights:()=>{},
    dash:    ()=>{ initDashCharts('overview'); setTimeout(initOverviewCharts,120); },
    catalog: ()=>{ if (!_datasetsLoaded && !_datasetsLoading) loadDataSources(); else renderCatalog(); },
    ref:     ()=>{},
    detail:  ()=>{}
  };
  const fn=initMap[name]; if(fn) setTimeout(fn,60);
}

/* ── Dashboard tab switching ── */
const DM_TAB_CHARTS = {
  overview:  [],
  issuance:  [],
  secondary: [],
  gsec: ['gsec-type'],
  sources:   []
};

function dashTab(name, el) {
  document.querySelectorAll('.dm-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.dm-pane').forEach(p=>{p.classList.remove('on');p.style.display='none'});
  if(el) el.classList.add('on');
  const pane = document.getElementById('dmp-'+name);
  if(pane){ pane.classList.add('on'); pane.style.display='flex'; }
  setTimeout(()=>{
    initDashCharts(name);
    if(['overview','issuance','secondary'].includes(name)) setTimeout(initOverviewCharts,120);
    // Resize React-managed charts so hover/tooltips work after pane becomes visible
    if(name==='gsec'){
      ['c-gsec-maturity','c-strips'].forEach(id=>{
        const canvas = document.getElementById(id);
        if(!canvas) return;
        const ch = (typeof Chart!=='undefined' && Chart.getChart) ? Chart.getChart(canvas) : null;
        if(ch) ch.resize();
      });
    }
  }, 60);
}

function initDashCharts(tab) {
  const keys = DM_TAB_CHARTS[tab]||[];
  keys.forEach(k=>{
    if(DM_CDEFS[k]) {
      const ctx=document.getElementById('c-'+k); if(!ctx) return;
      // Destroy any chart on this canvas — including React-managed ones
      try { const ex = (typeof Chart!=='undefined' && Chart.getChart) ? Chart.getChart(ctx) : null; if(ex) ex.destroy(); } catch(e){}
      if(charts['dm-'+k]){ try{ charts['dm-'+k].destroy(); }catch(e){} }
      try{ charts['dm-'+k]=new Chart(ctx, DM_CDEFS[k]()); }catch(e){ console.warn('chart init err:',k,e.message); }
    } else {
      initChart(k);
    }
  });
  if(tab==='overview'){ initMap(); setTimeout(initOverviewCharts,100); }
  else if(['issuance','secondary'].includes(tab)) setTimeout(initOverviewCharts,100);
}

/* ── ECharts India Choropleth Map ── */
let _mapChart = null;

function initMap() {
  const container = document.getElementById('india-echarts-map');
  if(!container || typeof echarts === 'undefined' || !window.INDIA_GEOJSON) return;

  // Destroy previous instance if re-initialising (e.g. theme switch)
  if(_mapChart) { _mapChart.dispose(); _mapChart = null; }

  echarts.registerMap('india', window.INDIA_GEOJSON);

  _mapChart = echarts.init(container, null, { renderer: 'canvas' });

  // SDL data
  const baseData = {
    'Tamil Nadu':     778044,
    'Maharashtra':    673759,
    'Uttar Pradesh':  578630,
    'West Bengal':    569107,
    'Karnataka':      500630,
    'Andhra Pradesh': 476009,
    'Rajasthan':      459682,
    'Telangana':      417087,
    'Gujarat':        325325,
    'Madhya Pradesh': 316744,
    'Haryana':        313539,
    'Punjab':         294511,
    'Kerala':         286534,
    'Bihar':          281851,
    'Assam':          123793
  };

  // All 28 states + 8 UTs — forced render
  const ALL_REGIONS = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
    'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
    'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
    'Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
    'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
    'Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ];

  const finalData = ALL_REGIONS.map(name => ({
    name,
    value: baseData[name] || 0
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value }) =>
        `${name}<br/>₹ ${value?.toLocaleString() || 0} Cr`
    },
    series: [{
      name: 'SGS Outstanding',
      type: 'map',
      map: 'india',
      roam: false,
      nameMap: {
        'Jammu & Kashmir':        'Jammu and Kashmir',
        'Jammu and Kashmir (UT)': 'Jammu and Kashmir',
        'Ladakh (UT)':            'Ladakh',
        'Orissa':                 'Odisha',
        'Uttaranchal':            'Uttarakhand',
        'NCT of Delhi':           'Delhi',
        'Andaman & Nicobar':      'Andaman and Nicobar Islands',
        'Daman & Diu':            'Dadra and Nagar Haveli and Daman and Diu'
      },
      layoutCenter: ['50%', '58%'],
      layoutSize: '85%',
      zoom: 1,
      aspectScale: 1,
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
      itemStyle: {
        areaColor: '#00447b',
        borderColor: '#ffffff',
        borderWidth: 1
      },
      emphasis: {
        itemStyle: { areaColor: '#00335c' }
      },
      data: finalData
    }]
  };

  _mapChart.setOption(option);

  // Resize on window resize
  window.addEventListener('resize', () => { if(_mapChart) _mapChart.resize(); });
}

/* ═══════════════════════════════════════════
   CATALOG: FILTER + RENDER
═══════════════════════════════════════════ */
function setSrc(src, el) {
  catSrcFilter = src;
  document.querySelectorAll('.src-row[id^="src-"], #mob-src-filters .src-row').forEach(r=>r.classList.remove('on'));
  if(el) el.classList.add('on');
  renderCatalog();
}
function setStatus(st, el) {
  catStatusFilter = st;
  document.querySelectorAll('.seg-opt').forEach(o=>o.classList.remove('on'));
  if(el) el.classList.add('on');
  renderCatalog();
}
function setFreq(freq, el) {
  catFreqFilter = freq;
  document.querySelectorAll('.src-row[id^="freq-"], #mob-freq-container .src-row').forEach(r=>r.classList.remove('on'));
  if(el) el.classList.add('on');
  renderCatalog();
}
function resetFilters() {
  catSrcFilter='all'; catStatusFilter='all'; catFreqFilter='all';
  const qi=document.getElementById('cat-q'); if(qi) qi.value='';
  document.querySelectorAll('.src-row[id^="src-"], #mob-src-filters .src-row').forEach(r=>r.classList.remove('on'));
  document.getElementById('src-all')?.classList.add('on');
  document.querySelector('#mob-src-filters .src-row')?.classList.add('on');
  document.querySelectorAll('.seg-opt').forEach(o=>o.classList.remove('on'));
  document.getElementById('st-all')?.classList.add('on');
  document.getElementById('st-all-mob')?.classList.add('on');
  document.querySelectorAll('.src-row[id^="freq-"], #mob-freq-container .src-row').forEach(r=>r.classList.remove('on'));
  document.getElementById('freq-all')?.classList.add('on');
  document.querySelector('#mob-freq-container .src-row')?.classList.add('on');
  renderCatalog();
}
function filterCat() { renderCatalog(); }
function catSort(key) { catSortKey=key; renderCatalog(); }
function setView(v) {
  currentView=v;
  document.getElementById('vt-list').classList.toggle('on',v==='list');
  document.getElementById('vt-card').classList.toggle('on',v==='card');
  renderCatalog();
}
function toggleChip(el) { el.classList.toggle('on'); renderCatalog(); }

function getFilteredDatasets() {
  const q=(document.getElementById('cat-q')?.value||'').toLowerCase().trim();
  const sortEl=document.getElementById('cat-sort');
  const sort=sortEl?sortEl.value:catSortKey;
  let ds=[...DATASETS];
  if(catSrcFilter!=='all') ds=ds.filter(d=>d.src===catSrcFilter);
  if(catStatusFilter!=='all') ds=ds.filter(d=>d.status===catStatusFilter);
  if(catFreqFilter!=='all') ds=ds.filter(d=>d.freq===catFreqFilter);
  if(q) ds=ds.filter(d=>d.title.toLowerCase().includes(q)||d.id.toLowerCase().includes(q)||d.srcLabel.toLowerCase().includes(q)||d.cat.toLowerCase().includes(q));
  const sortMap={name:(a,b)=>a.title.localeCompare(b.title),src:(a,b)=>a.src.localeCompare(b.src),freq:(a,b)=>a.freq.localeCompare(b.freq),metrics:(a,b)=>b.metrics-a.metrics,dims:(a,b)=>b.dims-a.dims,updated:(a,b)=>b.updated.localeCompare(a.updated)};
  if(sortMap[sort]) ds.sort(sortMap[sort]);
  return ds;
}

function srcTagClass(src){ return {nse:'tag-nse',rbi:'tag-rbi',sebi:'tag-sebi',ccil:'tag-ccil',fbil:'tag-fbil'}[src]||'tag-nse'; }
function freqClass(f){ return {daily:'freq-d',weekly:'freq-w',monthly:'freq-m'}[f]||'freq-w'; }
function spClass(s){ return s==='active'?'sp-live':'sp-stale'; }

function renderCatalog() {
  const ds=getFilteredDatasets();
  const cntEl=document.getElementById('cat-count');
  if(cntEl) cntEl.innerHTML=`<strong>${ds.length}</strong> dataset${ds.length!==1?'s':''}`;
  const wrap=document.getElementById('cat-rows'); if(!wrap) return;

  if(currentView==='list') {
    wrap.innerHTML = ds.map(d=>`
      <div class="ds-row${currentDsId===d.id?' selected':''}" onclick="openDetail('${d.id}')">
        <div class="ds-cell">
          <div class="ds-name-wrap">
            <div class="ds-name">${d.title}</div>
            <div class="ds-slug">${d.id}</div>
          </div>
        </div>
        <div class="ds-cell"><span class="src-tag ${srcTagClass(d.src)}">${d.srcLabel}</span></div>
        <div class="ds-cell"><span class="freq ${freqClass(d.freq)}">${d.freq}</span></div>
        <div class="ds-cell" style="font-family:var(--mo);font-weight:600;color:var(--tx)">${d.metrics}</div>
        <div class="ds-cell" style="font-family:var(--mo);color:var(--tx2)">${d.dims.toLocaleString()}</div>
        <div class="ds-cell" style="font-size:11.5px;color:var(--tx3)">${d.updated}</div>
        <div class="ds-cell"><span class="sp ${spClass(d.status)}">${d.status==='active'?'Active':'Inactive'}</span></div>
        <div class="row-act" onclick="event.stopPropagation()">
          <div class="row-ico-btn" onclick="openDetail('${d.id}')" title="Explore">
            <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div class="row-ico-btn" onclick="openModal('${d.title}','${d.url}')" title="Source URLs">
            <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          </div>
        </div>
      </div>`).join('');
  } else {
    // card view (compact 2-col grid, still dense)
    wrap.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 18px">` +
      ds.map(d=>`
        <div style="background:var(--sf);border:1px solid var(--bdr);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all .13s;box-shadow:var(--shxs)" onclick="openDetail('${d.id}')" onmouseover="this.style.boxShadow='var(--shmd)';this.style.borderColor='var(--bdr2)'" onmouseout="this.style.boxShadow='var(--shxs)';this.style.borderColor='var(--bdr)'">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">
            <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.title}</div><div style="font-family:var(--mo);font-size:9.5px;color:var(--tx3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.id}</div></div>
            <span class="src-tag ${srcTagClass(d.src)}" style="flex-shrink:0">${d.srcLabel}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
            <div style="display:flex;gap:6px;align-items:center"><span class="freq ${freqClass(d.freq)}">${d.freq}</span><span class="sp ${spClass(d.status)}">${d.status==='active'?'Active':'Inactive'}</span></div>
            <div style="font-size:10.5px;color:var(--tx3)"><span style="font-family:var(--mo);font-weight:600;color:var(--tx)">${d.metrics}</span> metrics · <span style="font-family:var(--mo);font-weight:600;color:var(--tx)">${d.dims.toLocaleString()}</span> dims</div>
          </div>
        </div>`).join('') + `</div>`;
  }
}

/* ═══════════════════════════════════════════
   DATASET DETAIL
═══════════════════════════════════════════ */
/* ── null-safe DOM setter — prevents "Cannot set properties of null" ── */
function setEl(id, val, prop='textContent') {
  const el = document.getElementById(id);
  if(el) el[prop] = val;
}

function openDetail(dsId) {
  currentDsId = dsId;
  const d = DATASETS.find(x=>String(x.id)===String(dsId)); if(!d) return;

  // breadcrumb + header
  setEl('det-bc',    d.title);
  setEl('det-slug',  d.id);
  setEl('det-title', d.title);
  setEl('det-desc',  d.desc);

  // tags
  setEl('det-tags',
    `<span class="src-tag ${srcTagClass(d.src)}">${d.srcLabel}</span>` +
    `<span class="freq ${freqClass(d.freq)}">${d.freq}</span>` +
    `<span class="sp ${spClass(d.status)}">${d.status==='active'?'Active':'Inactive'}</span>`,
    'innerHTML');

  // stat boxes
  setEl('det-meta-src',     d.srcLabel);
  setEl('det-meta-freq',    d.freq.charAt(0).toUpperCase()+d.freq.slice(1));
  setEl('det-meta-cat',     d.cat);
  setEl('det-meta-metrics', String(d.metrics));
  setEl('det-meta-dims',    d.dims.toLocaleString());
  setEl('det-meta-updated', d.updated);

  // source URL button
  const srcBtn = document.getElementById('det-src-btn');
  if(srcBtn) srcBtn.onclick = ()=>openModal(d.title, d.url);

  // schema strip (hidden alias, kept for compat)
  setEl('det-schema-inline', '', 'innerHTML');

  // full metadata card
  setEl('meta-id',           d.id);
  setEl('meta-src',          d.srcLabel);
  setEl('meta-cat',          d.cat);
  setEl('meta-dims',         d.dims.toLocaleString());
  setEl('meta-metrics',      String(d.metrics));
  setEl('meta-dateattrs',    String(d.dateAttrs));
  setEl('meta-freq',         d.freq.charAt(0).toUpperCase()+d.freq.slice(1)+' refresh');
  setEl('det-meta-updated2', d.updated);

  // explore dataset selector
  setEl('exp-ds', `<option>${d.title}</option>`, 'innerHTML');
  setEl('exp-tbl-ds', d.title);

  // navigate and build chart
  navigate('detail');
  setTimeout(()=>buildExpChart(), 80);
}

/* openDetTab kept for backwards-compat but tabs are removed — no-op */
function openDetTab(name, el) {
  if(name==='explore') setTimeout(()=>rebuildExpChart(),80);
}

/* ═══════════════════════════════════════════
   EXPLORE / CHART
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   EXPLORE — LIVE FILTER ENGINE
═══════════════════════════════════════════ */
let expCT = 'line';

// Master dataset for explore (simulated; would be real API data)
const EXP_DATA = {
  base_issue_size: {
    unit:'INR_CR',
    YEARLY:   {labels:['2019','2020','2021','2022','2023','2024','2025','2026'], data:[112400,98600,124500,168200,192800,184562,203215,69447]},
    QUARTERLY:{labels:['Q1 24','Q2 24','Q3 24','Q4 24','Q1 25','Q2 25','Q3 25','Q4 25','Q1 26'], data:[42000,48500,52000,42062,58400,62000,54815,28000,69447]},
    MONTHLY:  {labels:['Oct','Nov','Dec','Jan','Feb','Mar'], data:[18200,22400,20800,24100,26500,18847]},
  },
  ytm: {
    unit:'%',
    YEARLY:   {labels:['2019','2020','2021','2022','2023','2024','2025','2026'], data:[7.82,6.95,6.72,7.18,7.38,7.24,7.15,7.48]},
    QUARTERLY:{labels:['Q1 24','Q2 24','Q3 24','Q4 24','Q1 25','Q2 25','Q3 25','Q4 25','Q1 26'], data:[7.30,7.22,7.28,7.24,7.18,7.12,7.10,7.15,7.48]},
    MONTHLY:  {labels:['Oct','Nov','Dec','Jan','Feb','Mar'], data:[7.12,7.18,7.15,7.22,7.34,7.48]},
  },
  volume_cr: {
    unit:'₹ Cr',
    YEARLY:   {labels:['2019','2020','2021','2022','2023','2024','2025','2026'], data:[480000,520000,610000,720000,840000,920000,1100000,280000]},
    QUARTERLY:{labels:['Q1 24','Q2 24','Q3 24','Q4 24','Q1 25','Q2 25','Q3 25','Q4 25','Q1 26'], data:[210000,240000,225000,245000,268000,285000,276000,271000,280000]},
    MONTHLY:  {labels:['Oct','Nov','Dec','Jan','Feb','Mar'], data:[88000,92000,91000,96000,102000,82000]},
  },
  trade_count: {
    unit:'Trades',
    YEARLY:   {labels:['2019','2020','2021','2022','2023','2024','2025','2026'], data:[380000,420000,510000,680000,980000,1240000,1800000,480000]},
    QUARTERLY:{labels:['Q1 24','Q2 24','Q3 24','Q4 24','Q1 25','Q2 25','Q3 25','Q4 25','Q1 26'], data:[280000,320000,310000,330000,420000,480000,460000,440000,480000]},
    MONTHLY:  {labels:['Oct','Nov','Dec','Jan','Feb','Mar'], data:[145000,162000,153000,172000,188000,120000]},
  },
  clean_price: {
    unit:'₹',
    YEARLY:   {labels:['2019','2020','2021','2022','2023','2024','2025','2026'], data:[102.4,105.8,106.2,98.4,96.8,97.2,98.6,99.8]},
    QUARTERLY:{labels:['Q1 24','Q2 24','Q3 24','Q4 24','Q1 25','Q2 25','Q3 25','Q4 25','Q1 26'], data:[97.8,97.2,96.8,97.2,97.6,98.2,98.8,98.6,99.8]},
    MONTHLY:  {labels:['Oct','Nov','Dec','Jan','Feb','Mar'], data:[98.4,98.8,99.2,99.4,99.6,99.8]},
  }
};

// Active filter state
let activeFilters = []; // [{dim, op, val, label}]

// Filter presets
const FILTER_PRESETS = {
  aaa:       [{dim:'rating',    op:'=',  val:'AAA',  label:'Rating = AAA'}],
  highyield: [{dim:'ytm',       op:'≥',  val:'8.5',  label:'YTM ≥ 8.5%'}, {dim:'tenure', op:'≤', val:'3', label:'Tenure ≤ 3Y'}],
  gsec:      [{dim:'source',    op:'=',  val:'RBI',  label:'Source = RBI'}, {dim:'year', op:'≥', val:'2025', label:'Year ≥ 2025'}],
};

// Filter dimension options that affect data
const FILTER_DIM_EFFECTS = {
  year:        (data, op, val) => filterNumeric(data, op, parseFloat(val)),
  ytm:         (data, op, val) => filterByScale(data, op, parseFloat(val), 0.92, 1.08),
  tenure:      (data, op, val) => filterByScale(data, op, parseFloat(val), 0.85, 1.15),
  periodicity: ()              => null, // handled by period selector
  rating:      (data, op, val) => val==='AAA' ? data.map(v=>v*0.72) : val==='AA+' ? data.map(v=>v*0.18) : data,
  source:      (data, op, val) => val==='RBI' ? data.map(v=>v*0.42) : val==='SEBI' ? data.map(v=>v*0.51) : data.map(v=>v*0.07),
  metric:      ()              => null,
};

function filterNumeric(data, op, val) {
  // Simulates filtering: scale data based on year range
  return data.map((v,i) => {
    const yr = 2019 + i;
    if(op==='≥' && yr < val) return 0;
    if(op==='≤' && yr > val) return 0;
    if(op==='=' && yr !== val) return 0;
    return v;
  });
}
function filterByScale(data, op, val, lo, hi) {
  // Scale all values by a factor simulating the filter
  const factor = op==='≥' ? lo : op==='≤' ? hi : 1.0;
  return data.map(v => Math.round(v * factor));
}

function applyFiltersToData(rawData) {
  if(!activeFilters.length) return rawData;
  let d = [...rawData];
  activeFilters.forEach(f => {
    const fn = FILTER_DIM_EFFECTS[f.dim];
    if(fn) {
      const result = fn(d, f.op, f.val);
      if(result) d = result;
    }
  });
  return d;
}

function renderFilterChips() {
  const container = document.getElementById('det-active-chips');
  const clearBtn  = document.getElementById('btn-clear-filters');
  const summary   = document.getElementById('exp-filter-summary');
  if(!container) return;

  if(!activeFilters.length) {
    container.innerHTML = '<span style="font-size:11px;color:var(--tx3);font-style:italic">No filters applied — showing all data</span>';
    if(clearBtn) clearBtn.style.display = 'none';
    if(summary)  { summary.style.display='none'; }
    return;
  }

  container.innerHTML = activeFilters.map((f,i) =>
    `<span class="det-chip-active">
       ${f.label}
       <span class="det-chip-x" onclick="removeFilter(${i})" title="Remove filter">✕</span>
     </span>`
  ).join('');

  if(clearBtn) clearBtn.style.display = 'inline-flex';
  if(summary) {
    summary.style.display = 'block';
    summary.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px;margin-right:4px"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
      Filtered by: <strong>${activeFilters.map(f=>f.label).join(' · ')}</strong> — data scaled accordingly`;
  }
}

function addFilter() {
  const dim = document.getElementById('flt-dim').value;
  const op  = document.getElementById('flt-op').value;
  const val = document.getElementById('flt-val').value.trim();
  if(!val) return;

  const dimLabels = {metric:'Metric',periodicity:'Periodicity',source:'Source',rating:'Rating',year:'Year',ytm:'YTM',tenure:'Tenure'};
  const label = `${dimLabels[dim]||dim} ${op} ${val}`;

  // Don't add duplicate
  if(activeFilters.some(f=>f.dim===dim && f.op===op && f.val===val)) return;

  activeFilters.push({dim, op, val, label});
  document.getElementById('flt-val').value = '';
  renderFilterChips();
  buildExpChart();
  // Hide the form after adding
  document.getElementById('det-filter-form').style.display = 'none';
}

function removeFilter(idx) {
  activeFilters.splice(idx, 1);
  renderFilterChips();
  buildExpChart();
}

function clearAllFilters() {
  activeFilters = [];
  renderFilterChips();
  buildExpChart();
}

function toggleFilterPanel() {
  const form = document.getElementById('det-filter-form');
  if(!form) return;
  const isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'grid';
  // show as block actually
  if(!isOpen) form.style.display = 'block';
}

function applyPreset(name) {
  const preset = FILTER_PRESETS[name];
  if(!preset) return;
  // Replace current filters with preset
  activeFilters = preset.map(f=>({...f}));
  renderFilterChips();
  buildExpChart();
  // Close form if open
  const form = document.getElementById('det-filter-form');
  if(form) form.style.display = 'none';
}

function updateFilterOps() {
  const dim = document.getElementById('flt-dim')?.value;
  const opSel = document.getElementById('flt-op');
  if(!opSel) return;
  const numeric = ['year','ytm','tenure'].includes(dim);
  opSel.innerHTML = numeric
    ? '<option value="≥">≥</option><option value="≤">≤</option><option value="=">=</option>'
    : '<option value="=">=</option><option value="contains">contains</option>';
}

function setQuickRange(range) {
  const now = new Date();
  const to = now.toISOString().slice(0,10);
  let from;
  if(range==='1y') from = new Date(now.getFullYear()-1, now.getMonth(), now.getDate()).toISOString().slice(0,10);
  else if(range==='2y') from = new Date(now.getFullYear()-2, now.getMonth(), now.getDate()).toISOString().slice(0,10);
  else if(range==='3y') from = new Date(now.getFullYear()-3, now.getMonth(), now.getDate()).toISOString().slice(0,10);
  else from = '2000-01-01';
  const f = document.getElementById('exp-from'); if(f) f.value = from;
  const t = document.getElementById('exp-to');   if(t) t.value = to;
  buildExpChart();
}

function setExpCT(type, el) {
  document.querySelectorAll('.ct-b').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  expCT = type;
  buildExpChart();
}
function rebuildExpChart(){ buildExpChart(); }

function buildExpChart() {
  const ctx = document.getElementById('c-explore'); if(!ctx) return;
  if(charts.explore){ charts.explore.destroy(); delete charts.explore; }

  const metric  = document.getElementById('exp-metric')?.value  || 'base_issue_size';
  const agg     = document.getElementById('exp-agg')?.value     || 'SUM';
  const period  = document.getElementById('exp-period')?.value  || 'YEARLY';

  const mData   = EXP_DATA[metric] || EXP_DATA.base_issue_size;
  const pData   = mData[period]    || mData.YEARLY;
  const rawData = pData.data;
  const labels  = pData.labels;
  const unit    = mData.unit;

  // Apply active filters
  const filteredData = applyFiltersToData(rawData);

  // Update KPI strip
  const nonZero = filteredData.filter(v=>v>0);
  const total   = nonZero.reduce((a,b)=>a+b,0);
  const peak    = nonZero.length ? Math.max(...nonZero) : 0;
  const avg     = nonZero.length ? total / nonZero.length : 0;
  const peakLbl = nonZero.length ? labels[filteredData.indexOf(peak)] : '—';

  function fmt(v) {
    if(unit==='%') return v.toFixed(2)+'%';
    if(v>=1e6) return (v/1e6).toFixed(2)+'M';
    if(v>=1e3) return (v/1e3).toFixed(1)+'K';
    return v.toLocaleString('en-IN');
  }

  const setKpi = (id, val, sub) => {
    const el = document.getElementById(id); if(el) el.textContent = val;
    const se = document.getElementById(id+'-sub'); if(se) se.textContent = sub;
  };
  const latestIdx  = filteredData.map((v,i)=>({v,i})).filter(x=>x.v>0).pop();
  const latestVal  = latestIdx ? latestIdx.v : 0;
  const latestLbl  = latestIdx ? labels[latestIdx.i] : '—';

  setKpi('kpi-total', fmt(total),      unit + ' · ' + period);
  setKpi('kpi-peak',  fmt(peak),       'in ' + peakLbl);
  setKpi('kpi-avg',   fmt(avg),        'per ' + period.toLowerCase());
  setKpi('kpi-pts',   fmt(latestVal),  latestLbl);

  // Update chart title / sub / total
  const titleEl = document.getElementById('exp-chart-title');
  if(titleEl) titleEl.textContent = 'Chart';
  const subEl = document.getElementById('exp-chart-sub');
  if(subEl) subEl.textContent = `${agg}(${metric}) · ${labels[0]} → ${labels[labels.length-1]} · Periodicity: ${period}${activeFilters.length ? ' · '+activeFilters.length+' filter'+(activeFilters.length>1?'s':'') : ''}`;
  const totalEl = document.getElementById('exp-chart-total');
  if(totalEl) totalEl.textContent = `Total: ${fmt(total)} ${unit}`;

  // Update results table
  const tbody = document.getElementById('exp-tbl-body');
  const dsName = document.getElementById('exp-tbl-ds')?.textContent || '—';
  if(tbody) {
    tbody.innerHTML = labels.map((lbl,i) =>
      filteredData[i] > 0
        ? `<tr><td class="hh">${i+1}</td><td><strong>${lbl}</strong></td><td class="nb R">${fmt(filteredData[i])}</td><td class="mt">${metric}</td><td class="mt">${period}</td><td class="mt">${i===0 ? `<span id="exp-tbl-ds">${dsName}</span>` : dsName}</td></tr>`
        : `<tr style="opacity:.4"><td class="hh">${i+1}</td><td><strong>${lbl}</strong></td><td class="nb R" style="color:var(--tx3)">filtered</td><td class="mt">${metric}</td><td class="mt">${period}</td><td class="mt">${dsName}</td></tr>`
    ).join('');
    const visCount = filteredData.filter(v=>v>0).length;
    const cntEl = document.getElementById('res-count'); if(cntEl) cntEl.textContent = visCount+' rows';
    const footEl = document.getElementById('res-foot-label'); if(footEl) footEl.textContent = `1–${visCount} of ${labels.length}`;
  }

  // Build chart
  const dark = tc_();
  const gc = dark?'rgba(255,255,255,.05)':'rgba(26,28,24,.04)';
  const tc = dark?'#686868':'#9a9d92';
  const cm = {
    line: {b:'#2557a7', bg:'rgba(37,87,167,.07)'},
    area: {b:'#2557a7', bg:'rgba(37,87,167,.14)'},
    bar:  {b:'rgba(37,87,167,.8)', bg:'rgba(37,87,167,.8)'},
    pie:  {b:'#fff', bg:['#2557a7','#2d8a4e','#c47a1e','#c0392b','#6d3fc0','#0e7490','#8b4513']}
  };
  const c = cm[expCT] || cm.line;

  const ds = expCT==='pie'
    ? [{data:filteredData, backgroundColor:c.bg, borderColor:c.b, borderWidth:2, hoverOffset:8}]
    : [{
        label: metric,
        data:  filteredData,
        borderColor:      c.b,
        backgroundColor:  c.bg,
        borderWidth:      expCT==='bar' ? 0 : 2.5,
        fill:             expCT==='area',
        tension:          .42,
        borderRadius:     expCT==='bar' ? 5 : 0,
        borderSkipped:    false,
        pointRadius:      expCT==='line' ? 4 : 0,
        pointBackgroundColor: c.b,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        // Dim filtered-out bars
        segment: expCT==='bar' ? { backgroundColor: ctx2 => filteredData[ctx2.dataIndex]===0 ? 'rgba(150,150,150,.15)' : c.b } : undefined,
      }];

  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: expCT==='pie', labels:{color:dark?'#909090':'#5a5d54',font:{size:11},boxWidth:12,boxHeight:12,padding:14} },
      tooltip: {
        backgroundColor: dark?'#0d0d0d':'#1a1c18',
        borderColor: dark?'rgba(255,255,255,.12)':'rgba(26,28,24,.15)',
        borderWidth: 1, titleColor:'#888888',
        bodyColor: dark?'#e8e8e8':'#1a1c18',
        bodyFont: {family:"'JetBrains Mono',monospace", size:11},
        padding:10, cornerRadius:9,
        callbacks: {
          label: ctx2 => {
            const v = ctx2.parsed?.y ?? ctx2.parsed;
            return filteredData[ctx2.dataIndex]===0 ? ' filtered out' : ` ${fmt(v)} ${unit}`;
          }
        }
      }
    }
  };
  if(expCT!=='pie') opts.scales = {
    x:{grid:{color:gc,lineWidth:.5},ticks:{color:tc,font:{size:11}},border:{display:false}},
    y:{grid:{color:gc,lineWidth:.5},ticks:{color:tc,font:{family:"'JetBrains Mono',monospace",size:10.5},callback:v=>unit==='%'?v+'%':v>=1000?(v/1000).toFixed(0)+'K':v},border:{display:false}}
  };

  charts.explore = new Chart(ctx, {type: expCT==='area'?'line':expCT, data:{labels,datasets:ds}, options:opts});
}

/* ═══════════════════════════════════════════
   REFERENCE
═══════════════════════════════════════════ */
function showRef(name, el) {
  document.querySelectorAll('.ref-sub').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ref-ni').forEach(n=>n.classList.remove('on'));
  const pg=document.getElementById('refp-'+name); if(pg) pg.classList.add('on');
  if(el) el.classList.add('on');
  if(name==='curves') setTimeout(()=>initChart('refyc'),80);
}

/* ═══════════════════════════════════════════
   THEME
═══════════════════════════════════════════ */
function setTheme(t) {
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('topt-light').classList.toggle('on',t==='light');
  document.getElementById('topt-dark').classList.toggle('on',t==='dark');
  Object.keys(charts).forEach(k=>{if(charts[k]){charts[k].destroy();delete charts[k]}});
  const cur=PAGES.find(p=>document.getElementById('page-'+p)?.classList.contains('on'));
  if(cur){
    const m={
      dash:()=>{ const activeTab=document.querySelector('.dm-tab.on')?.id?.replace('dmt-','')||'overview'; initDashCharts(activeTab); setTimeout(initOverviewCharts,200); },
      ref:()=>initChart('refyc'),
      detail:()=>buildExpChart(),
      catalog:()=>{}
    };
    const fn=m[cur];if(fn)setTimeout(fn,40);
  }
}

/* ═══════════════════════════════════════════
   PANELS
═══════════════════════════════════════════ */
function togglePanel(name) {
  const panel=document.getElementById('panel-'+name);
  const btn=document.getElementById('btn-'+name);
  const backdrop=document.getElementById('panel-backdrop');
  const isOpen=panel.classList.contains('on');
  document.querySelectorAll('.slide-panel').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tb-btn').forEach(b=>b.classList.remove('lit'));
  if(backdrop) backdrop.classList.remove('on');
  if(!isOpen){
    panel.classList.add('on');
    if(btn) btn.classList.add('lit');
    if(backdrop) backdrop.classList.add('on');
    if(name==='compare') setTimeout(()=>initChart('cmp-panel'),80);
  }
}
function closePanel(name){document.getElementById('panel-'+name)?.classList.remove('on');document.getElementById('btn-'+name)?.classList.remove('lit')}

/* ═══════════════════════════════════════════
   MODAL
═══════════════════════════════════════════ */
function openModal(dsName, url) {
  setEl('modal-ds', dsName);
  const urls = url.split('||');
  setEl('modal-body', urls.map((u,i)=>`
    <div class="src-item">
      <div class="src-ico"><svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg></div>
      <div style="flex:1;min-width:0"><div class="src-name">Source ${i+1}</div><div class="src-url">${u.trim()}</div></div>
      <button class="btn-src" onclick="window.open('${u.trim()}','_blank')">Open <svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><line x1="21" y1="3" x2="14" y2="10"/></svg></button>
    </div>`).join(''), 'innerHTML');
  const modal = document.getElementById('modal-ov');
  if(modal) modal.classList.add('on');
  const backdrop=document.getElementById('panel-backdrop');
  if(backdrop) backdrop.classList.remove('on');
}
function closeModal(){document.getElementById('modal-ov').classList.remove('on')}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();document.querySelectorAll('.slide-panel').forEach(p=>p.classList.remove('on'));document.querySelectorAll('.tb-btn').forEach(b=>b.classList.remove('lit'));const bd=document.getElementById('panel-backdrop');if(bd)bd.classList.remove('on');}});

/* ═══════════════════════════════════════════
   GLOBAL SEARCH
═══════════════════════════════════════════ */
function handleGS(v) {
  if(!v.trim()) return;
  const inp=document.getElementById('cat-q'); if(inp) inp.value=v;
  navigate('catalog'); renderCatalog();
}

/* ═══════════════════════════════════════════
   DOT GRID
═══════════════════════════════════════════ */
function buildDots(){
  const g=document.getElementById('dot-grid');if(!g)return;g.innerHTML='';
  [1,1,1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0].forEach(v=>{
    const d=document.createElement('div');d.className='dot-cell '+(v===1?'dot-hit':v===0?'dot-miss':'dot-none');g.appendChild(d);
  });
}

/* ═══════════════════════════════════════════
   CHARTS
═══════════════════════════════════════════ */
function tc_(){return document.documentElement.getAttribute('data-theme')==='dark'}
function baseCO(){
  const dk=tc_();const gc=dk?'rgba(255,255,255,.05)':'rgba(26,28,24,.04)';const tc=dk?'#686868':'#9a9d92';
  return{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#0a0a0a',borderColor:dk?'rgba(255,255,255,.12)':'rgba(26,28,24,.12)',borderWidth:1,titleColor:'#888888',bodyColor:dk?'#e8e8e8':'#1a1c18',bodyFont:{family:"'JetBrains Mono',monospace",size:11},padding:9,cornerRadius:9}},scales:{x:{grid:{color:gc,lineWidth:.5},ticks:{color:tc,font:{size:10},maxRotation:0},border:{display:false}},y:{grid:{color:gc,lineWidth:.5},ticks:{color:tc,font:{family:"'JetBrains Mono',monospace",size:10}},border:{display:false}}}};
}

const CDEFS={
  'cmp-panel': {
    id:'c-cmp',
    type:'line',
    data:{labels:['1Y','2Y','3Y','5Y','7Y','10Y','15Y','20Y','30Y'],datasets:[
      {label:'G-Sec',data:[7.05,7.12,7.18,7.28,7.32,7.24,7.38,7.44,7.48],borderColor:'#2557a7',borderWidth:2,pointRadius:3,pointBackgroundColor:'#2557a7',fill:false,tension:.4},
      {label:'SDL Spread',data:[7.25,7.32,7.38,7.50,7.55,7.48,7.62,7.68,7.75],borderColor:'#2d8a4e',borderWidth:2,pointRadius:3,pointBackgroundColor:'#2d8a4e',fill:false,tension:.4}
    ]},
    opts:()=>({responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',align:'end',labels:{color:tc_()?'#686868':'#9a9d92',font:{size:10},boxWidth:10,padding:8}}},scales:{x:{grid:{color:tc_()?'rgba(255,255,255,.05)':'rgba(26,28,24,.04)'},ticks:{color:tc_()?'#686868':'#9a9d92',font:{size:10}},border:{display:false}},y:{grid:{color:tc_()?'rgba(255,255,255,.05)':'rgba(26,28,24,.04)'},ticks:{color:tc_()?'#686868':'#9a9d92',font:{family:"'JetBrains Mono',monospace",size:10},callback:v=>v+'%'},border:{display:false}}}})
  },
  refyc:{id:'c-refyc',type:'line',data:{labels:['3M','6M','1Y','2Y','3Y','5Y','7Y','10Y','15Y','30Y'],datasets:[{label:'Today',data:[6.90,6.98,7.05,7.12,7.18,7.28,7.32,7.24,7.38,7.48],borderColor:'#2d8a4e',borderWidth:2.5,pointRadius:3,pointBackgroundColor:'#2d8a4e',fill:false,tension:.4},{label:'1M ago',data:[6.80,6.88,6.95,7.02,7.08,7.20,7.26,7.22,7.34,7.44],borderColor:'#2557a7',borderWidth:1.5,pointRadius:0,fill:false,tension:.4,borderDash:[5,3]},{label:'1Y ago',data:[6.60,6.70,6.80,6.92,7.00,7.12,7.18,7.10,7.22,7.38],borderColor:'rgba(154,157,146,.45)',borderWidth:1.5,pointRadius:0,fill:false,tension:.4,borderDash:[2,3]}]},opts:()=>({...baseCO(),plugins:{...baseCO().plugins,legend:{display:true,labels:{color:tc_()?'#909090':'#5a5d54',font:{size:10},boxWidth:16,boxHeight:2}}}})},
};

/* ═══════════════════════════════════════════
   INDIA DEBT MARKET CHART DEFINITIONS
═══════════════════════════════════════════ */
const FY_SHORT = ['18-19','19-20','20-21','21-22','22-23','23-24','24-25','25-26'];

function dmOpts(extra={}) {
  const dk=tc_();
  const gc=dk?'rgba(255,255,255,.05)':'rgba(26,28,24,.04)';
  const tc=dk?'#686868':'#9a9d92';
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{backgroundColor:dk?'#0d0d0d':'#1a1c18',borderColor:dk?'rgba(255,255,255,.12)':'rgba(26,28,24,.12)',borderWidth:1,titleColor:'#888888',bodyColor:dk?'#e8e8e8':'#1a1c18',bodyFont:{family:"'JetBrains Mono',monospace",size:11},padding:9,cornerRadius:9}
    },
    scales:{
      x:{grid:{color:gc,lineWidth:.5},ticks:{color:tc,font:{size:10},maxRotation:0},border:{display:false}},
      y:{grid:{color:gc,lineWidth:.5},ticks:{color:tc,font:{family:"'JetBrains Mono',monospace",size:10}},border:{display:false}}
    },
    ...extra
  };
}

function dmLegendOpts() {
  return { display:true,position:'top',align:'end',labels:{color:tc_()?'#909090':'#5a5d54',font:{size:10},boxWidth:10,boxHeight:10,padding:10} };
}

const DM_CDEFS = {
  ncd: () => ({
    type:'bar',
    data:{
      labels:FY_SHORT,
      datasets:[
        {type:'bar',label:'₹ Cr (Amount)',data:[13500,6200,2400,3800,3700,10800,3400,4000],backgroundColor:'rgba(45,138,78,.7)',borderColor:'transparent',borderRadius:4,borderSkipped:false,yAxisID:'y'},
        {type:'line',label:'Issue Count',data:[14200,9800,4200,5600,6000,8400,6800,8272],borderColor:'#2557a7',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:.4,yAxisID:'y1'}
      ]
    },
    options:{...dmOpts(),plugins:{...dmOpts().plugins,legend:dmLegendOpts()},scales:{...dmOpts().scales,y:{...dmOpts().scales.y,ticks:{...dmOpts().scales.y.ticks,callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{color:tc_()?'#686868':'#9a9d92',font:{family:"'JetBrains Mono',monospace",size:10},callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v},border:{display:false}}}}
  }),
  pp: () => ({
    type:'line',
    data:{
      labels:FY_SHORT,
      datasets:[
        {label:'₹ Amount (Cr)',data:[1450,1620,1400,1580,1520,1980,1750,2000],borderColor:'#2d8a4e',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#2d8a4e',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:{target:'origin',above:'rgba(45,138,78,.06)'},tension:.4,yAxisID:'y'},
        {label:'Issue Count (K)',data:[1100,1250,1200,1450,1600,1900,1800,2000],borderColor:'#2557a7',borderWidth:2,pointRadius:4,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:{target:'origin',above:'rgba(37,87,167,.05)'},tension:.4,yAxisID:'y1'}
      ]
    },
    options:{...dmOpts(),plugins:{...dmOpts().plugins,legend:dmLegendOpts()},scales:{...dmOpts().scales,y:{...dmOpts().scales.y,ticks:{...dmOpts().scales.y.ticks,callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{color:tc_()?'#686868':'#9a9d92',font:{family:"'JetBrains Mono',monospace",size:10},callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v},border:{display:false}}}}
  }),
  trade: () => ({
    type:'bar',
    data:{
      labels:FY_SHORT,
      datasets:[
        {type:'bar',label:'Volume (₹L Cr)',data:[6.4,9.8,11.5,12.2,11.8,12.4,11.9,23.8],backgroundColor:(ctx)=>ctx.dataIndex===7?'rgba(45,138,78,.90)':'rgba(45,138,78,.65)',borderColor:'transparent',borderRadius:4,borderSkipped:false,yAxisID:'y'},
        {type:'line',label:'Trades (M)',data:[0.4,0.7,0.9,1.0,1.1,1.2,1.4,1.8],borderColor:'#2557a7',borderWidth:2.5,pointRadius:0,fill:false,tension:.5,yAxisID:'y1'}
      ]
    },
    options:{...dmOpts(),plugins:{...dmOpts().plugins,legend:dmLegendOpts()},scales:{...dmOpts().scales,y:{...dmOpts().scales.y,ticks:{...dmOpts().scales.y.ticks,callback:v=>v+'L'}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{color:tc_()?'#686868':'#9a9d92',font:{family:"'JetBrains Mono',monospace",size:10},callback:v=>v+'M'},border:{display:false}}}}
  }),
  outstanding: () => ({
    type:'line',
    data:{
      labels:['Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
      datasets:[{label:'Outstanding (K Cr)',data:[4.8,4.9,4.6,4.8,5.0,4.7,4.8,4.9,4.6,4.7,4.8,5.0],borderColor:'#2557a7',borderWidth:2.5,pointRadius:3,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:{target:'origin',above:'rgba(37,87,167,.07)'},tension:.4}]
    },
    options:{...dmOpts(),scales:{...dmOpts().scales,y:{...dmOpts().scales.y,ticks:{...dmOpts().scales.y.ticks,callback:v=>v+'K'}}}}
  }),
  issuer: () => ({
    type:'doughnut',
    data:{
      labels:['PSU / Govt','Private Corp','Banks / FIs'],
      datasets:[{data:[60,26,14],backgroundColor:['#c47a1e','#2557a7','#2d8a4e'],borderColor:tc_()?'#141414':'#fafafa',borderWidth:3,hoverOffset:6}]
    },
    options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false},tooltip:{backgroundColor:tc_()?'#0d0d0d':'#1a1c18',bodyColor:tc_()?'#e8e8e8':'#1a1c18',bodyFont:{family:"'JetBrains Mono',monospace",size:11},padding:9,cornerRadius:9,callbacks:{label:ctx=>` ${ctx.label}: ${ctx.parsed}%`}}}}
  }),
  'gsec-type': () => ({
    type:'doughnut',
    data:{
      labels:['Fixed Rate G-Sec'],
      datasets:[{data:[100],backgroundColor:['#e07b39'],borderColor:tc_()?'#141414':'#fafafa',borderWidth:3,hoverOffset:6}]
    },
    options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:true,position:'bottom',labels:{color:tc_()?'#686868':'#9a9d92',font:{size:10},boxWidth:10,boxHeight:10,padding:10}},tooltip:{backgroundColor:tc_()?'#0d0d0d':'#1a1c18',bodyColor:tc_()?'#e8e8e8':'#1a1c18',bodyFont:{family:"'JetBrains Mono',monospace",size:11},padding:9,cornerRadius:9}}}
  }),
  'gsec-maturity': () => ({
    type:'bar',
    data:{
      labels:['<1Y','1–5Y','5–10Y','10–20Y','>20Y'],
      datasets:[{label:'Outstanding (K Cr)',data:[2800,8400,12600,16800,11400],backgroundColor:['rgba(30,58,95,.45)','rgba(30,58,95,.55)','rgba(30,58,95,.7)','rgba(30,58,95,.85)','rgba(30,58,95,.95)'],borderColor:'transparent',borderRadius:4,borderSkipped:false}]
    },
    options:{...dmOpts({indexAxis:'y'}),scales:{...dmOpts({indexAxis:'y'}).scales,x:{...dmOpts({indexAxis:'y'}).scales.x,ticks:{...dmOpts({indexAxis:'y'}).scales.x.ticks,callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v}}}}
  }),
  strips: () => ({
    type:'line',
    data:{
      labels:['Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
      datasets:[{label:'STRIPS Outstanding',data:[1200,1480,1620,1900,2100,2280,2450,2600,2700,2800,2880,2950],borderColor:'#2557a7',borderWidth:2.5,pointRadius:3,pointBackgroundColor:'#2557a7',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:{target:'origin',above:'rgba(37,87,167,.07)'},tension:.4}]
    },
    options:{...dmOpts(),scales:{...dmOpts().scales,y:{...dmOpts().scales.y,ticks:{...dmOpts().scales.y.ticks,callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v}}}}
  }),
  'sdl-states': () => ({
    type:'bar',
    data:{
      labels:['Maharashtra','Uttar Pradesh','Rajasthan','Tamil Nadu','Andhra Pradesh','Karnataka','West Bengal','Gujarat','Madhya Pradesh','Punjab'],
      datasets:[{label:'₹ Crore',data:[182400,154200,112800,98400,87600,76200,68400,62100,54800,48200],backgroundColor:'rgba(109,63,192,.65)',borderColor:'transparent',borderRadius:4,borderSkipped:false}]
    },
    options:{...dmOpts({indexAxis:'y'}),scales:{...dmOpts({indexAxis:'y'}).scales,x:{...dmOpts({indexAxis:'y'}).scales.x,ticks:{...dmOpts({indexAxis:'y'}).scales.x.ticks,callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v}},y:{...dmOpts({indexAxis:'y'}).scales.y,ticks:{color:tc_()?'#909090':'#464940',font:{size:10.5}}}}}
  }),
};;

function initChart(key){
  const d=CDEFS[key];if(!d)return;
  const ctx=document.getElementById(d.id);if(!ctx)return;
  if(charts[key]){charts[key].destroy()}
  charts[key]=new Chart(ctx,{type:d.type,data:d.data,options:d.opts()});
}

/* ═══════════════════════════════════════════
   SDL YEAR SELECTOR
═══════════════════════════════════════════ */
const SDL_YEAR_DATA = {
  '2021': { total:'₹48.2L Cr', top:['Tamil Nadu','Maharashtra','Uttar Pradesh'], data:{'Tamil Nadu':548000,'Maharashtra':473000,'Uttar Pradesh':408000,'West Bengal':401000,'Karnataka':352000,'Andhra Pradesh':335000,'Rajasthan':323000,'Telangana':293000,'Gujarat':229000,'Madhya Pradesh':223000,'Haryana':220000,'Punjab':207000,'Kerala':201000,'Bihar':198000,'Assam':87000} },
  '2022': { total:'₹54.1L Cr', top:['Tamil Nadu','Maharashtra','Uttar Pradesh'], data:{'Tamil Nadu':616000,'Maharashtra':531000,'Uttar Pradesh':457000,'West Bengal':449000,'Karnataka':395000,'Andhra Pradesh':376000,'Rajasthan':362000,'Telangana':329000,'Gujarat':257000,'Madhya Pradesh':250000,'Haryana':247000,'Punjab':232000,'Kerala':226000,'Bihar':222000,'Assam':97000} },
  '2023': { total:'₹60.8L Cr', top:['Tamil Nadu','Maharashtra','Uttar Pradesh'], data:{'Tamil Nadu':692000,'Maharashtra':596000,'Uttar Pradesh':513000,'West Bengal':504000,'Karnataka':443000,'Andhra Pradesh':422000,'Rajasthan':407000,'Telangana':369000,'Gujarat':288000,'Madhya Pradesh':280000,'Haryana':277000,'Punjab':261000,'Kerala':254000,'Bihar':249000,'Assam':109000} },
  '2024': { total:'₹65.2L Cr', top:['Tamil Nadu','Maharashtra','Uttar Pradesh'], data:{'Tamil Nadu':735000,'Maharashtra':634000,'Uttar Pradesh':546000,'West Bengal':537000,'Karnataka':471000,'Andhra Pradesh':449000,'Rajasthan':433000,'Telangana':393000,'Gujarat':307000,'Madhya Pradesh':298000,'Haryana':295000,'Punjab':278000,'Kerala':271000,'Bihar':265000,'Assam':116000} },
  '2025': { total:'₹69.3L Cr', top:['Tamil Nadu','Maharashtra','Uttar Pradesh'], data:{'Tamil Nadu':778044,'Maharashtra':673759,'Uttar Pradesh':578630,'West Bengal':569107,'Karnataka':500630,'Andhra Pradesh':476009,'Rajasthan':459682,'Telangana':417087,'Gujarat':325325,'Madhya Pradesh':316744,'Haryana':313539,'Punjab':294511,'Kerala':286534,'Bihar':281851,'Assam':123793} },
  '2026': { total:'₹72.8L Cr', top:['Tamil Nadu','Maharashtra','Uttar Pradesh'], data:{'Tamil Nadu':818000,'Maharashtra':708000,'Uttar Pradesh':608000,'West Bengal':598000,'Karnataka':526000,'Andhra Pradesh':500000,'Rajasthan':483000,'Telangana':438000,'Gujarat':342000,'Madhya Pradesh':333000,'Haryana':329000,'Punjab':309000,'Kerala':301000,'Bihar':296000,'Assam':130000} }
};

function sdlSetYear(yr, el) {
  // update pill active state
  document.querySelectorAll('.sdl-yr').forEach(p => p.classList.remove('on'));
  if(el) el.classList.add('on');

  const d = SDL_YEAR_DATA[yr]; if(!d) return;

  // update header total
  const tv = document.getElementById('sdl-total-v'); if(tv) tv.textContent = d.total;
  const gv = document.getElementById('sdl-grand-v'); if(gv) gv.textContent = d.total.replace('L Cr',' L Cr');

  // update floating top state
  const states = Object.keys(d.data);
  const topState = states[0];
  const topVal = d.data[topState];
  const ts = document.getElementById('sdl-top-state'); if(ts) ts.textContent = topState;
  const tv2 = document.getElementById('sdl-top-val'); if(tv2) tv2.textContent = '₹' + topVal.toLocaleString('en-IN') + ' Cr';

  // update map
  if(window._mapChart && window.INDIA_GEOJSON) {
    const ALL_REGIONS = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];
    const finalData = ALL_REGIONS.map(name => ({ name, value: d.data[name] || 0 }));
    window._mapChart.setOption({ series: [{ data: finalData }] });
  }

  // update podium
  const sorted = Object.entries(d.data).sort((a,b)=>b[1]-a[1]);
  const fmt = v => v.toLocaleString('en-IN');
  const setEl = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  setEl('sdl-p1-name', sorted[0]?.[0] || ''); setEl('sdl-p1-val', fmt(sorted[0]?.[1] || 0));
  setEl('sdl-p2-name', sorted[1]?.[0] || ''); setEl('sdl-p2-val', fmt(sorted[1]?.[1] || 0));
  setEl('sdl-p3-name', sorted[2]?.[0] || ''); setEl('sdl-p3-val', fmt(sorted[2]?.[1] || 0));

  // update rest rows
  const rest = document.getElementById('sdl-rest-rows'); if(!rest) return;
  const total = Object.values(d.data).reduce((a,b)=>a+b,0);
  rest.innerHTML = sorted.slice(3).map((s,i) => {
    const pct = ((s[1]/total)*100).toFixed(1);
    const barW = ((s[1]/sorted[0][1])*100).toFixed(1);
    return `<div class="sdl-rest-row"><span class="sdl-rr-n"><em>${i+4}</em>${s[0]}</span><div class="sdl-rr-track"><div class="sdl-rr-fill" style="width:${barW}%"></div></div><span class="sdl-rr-v">${fmt(s[1])}</span><span class="sdl-rr-p">${pct}%</span></div>`;
  }).join('');
}

/* ═══════════════════════════════════════════
   INDIA GEOJSON LOADER
══════════════════════════════════════════════ */
(function loadIndiaGeoJSON() {
  // Public India GeoJSON with states (from datameet/maps-of-india, served via jsDelivr)
  const GEOJSON_URL = 'https://cdn.jsdelivr.net/npm/india-map-geojson@1.0.0/india.geojson';

  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(geo => {
      window.INDIA_GEOJSON = geo;
      // If the overview tab is already rendered, init the map now
      if (document.getElementById('india-echarts-map')) {
        initMap();
      }
    })
    .catch(() => {
      // Fallback: try alternate CDN
      return fetch('https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson')
        .then(r => r.json())
        .then(geo => {
          window.INDIA_GEOJSON = geo;
          if (document.getElementById('india-echarts-map')) initMap();
        });
    });
})();

/* ═══════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
// Navigation on load is handled by App.jsx immediately after this script loads.