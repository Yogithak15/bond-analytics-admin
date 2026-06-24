import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDataSources, getDataSourceMetrics, getDataSourceDimensionTypes, getAllDimensions, getDataSourceUrls, analyticsAggregate } from '../../api/bond_api';

// ── helpers ────────────────────────────────────────────────────────────────
function extractPeriodFromS3Url(url) {
  if (!url) return null;
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\/(\d{4}[^/]*)\//);
    return m ? m[1] : null;
  } catch {}
  return null;
}

// ── shape mapper — uses actual API field names from /data-sources/ response ─
function mapSource(raw) {
  // source_name: "RBI", "NSE EBP", etc.
  const shortName = (raw.source_name || '').toLowerCase();
  let srcKey = 'other';
  if (shortName.includes('nse'))       srcKey = 'nse';
  else if (shortName.includes('rbi'))  srcKey = 'rbi';
  else if (shortName.includes('sebi')) srcKey = 'sebi';
  else if (shortName.includes('ccil')) srcKey = 'ccil';
  else if (shortName.includes('fbil')) srcKey = 'fbil';
  else if (shortName.includes('bse'))  srcKey = 'bse';

  // update_interval: "daily" | "weekly" | "monthly" | "quarterly"
  const rawFreq = (raw.update_interval || raw.frequency || '').toLowerCase();
  let freq = 'weekly';
  if (rawFreq.includes('daily'))        freq = 'daily';
  else if (rawFreq.includes('month'))   freq = 'monthly';
  else if (rawFreq.includes('quarter')) freq = 'quarterly';
  else if (rawFreq.includes('week'))    freq = 'weekly';

  // updated_at is the timestamp field in this API
  let updated = raw.updated_at || raw.last_updated || '';
  if (updated) {
    try {
      const d = new Date(updated);
      if (!isNaN(d))
        updated = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {}
  }

  // data_source_id is the numeric PK; fall back to source_id or id if the field name differs
  const rawId = raw.data_source_id ?? raw.source_id ?? raw.id;
  return {
    sourceId: rawId || undefined,
    id:       raw.dataset_code   || String(rawId || ''),
    title:    raw.dataset_name   || raw.name || raw.title || 'Untitled Dataset',
    src:      srcKey,
    srcLabel: raw.source_name    || srcKey.toUpperCase(),
    freq,
    // metrics/dims start at 0; enriched by parallel API calls after initial load
    metrics:  0,
    dims:     0,
    updated,
    createdAt: raw.created_at || '',
    status:   raw.is_active === false ? 'inactive' : 'active',
    desc:     raw.description || '',
    cat:      raw.category || raw.cat || '',
    url:      raw.source_url || raw.url || '',
  };
}

// ── CSS class helpers ──────────────────────────────────────────────────────
const srcTagClass = src =>
  ({ nse: 'tag-nse', rbi: 'tag-rbi', sebi: 'tag-sebi', ccil: 'tag-ccil', fbil: 'tag-fbil' }[src] || 'tag-nse');
const freqClass = f =>
  ({ daily: 'freq-d', weekly: 'freq-w', monthly: 'freq-m' }[f] || 'freq-w');
const spClass = s => (s === 'active' ? 'sp-live' : 'sp-stale');

// ── Fetch source URLs then open the modal ─────────────────────────────────
async function openSourceUrlsModal(sourceId, title) {
  // Show modal immediately with a loading state
  const bodyEl = document.getElementById('modal-body');
  const dsEl   = document.getElementById('modal-ds');
  const modalEl = document.getElementById('modal-ov');
  if (!modalEl) return;
  if (dsEl)   dsEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = '<div style="padding:24px;text-align:center;font-size:12px;color:var(--tx3)">Loading…</div>';
  modalEl.classList.add('on');

  try {
    const urls = await getDataSourceUrls(sourceId);
    const list = (Array.isArray(urls) ? urls : []).filter(item => item.s3_url);
    if (bodyEl) {
      if (list.length === 0) {
        bodyEl.innerHTML = '<div style="padding:24px;text-align:center;font-size:12px;color:var(--tx3)">No source URLs found.</div>';
      } else {
        bodyEl.innerHTML = list.map((item, i) => {
          const href  = item.s3_url;
          const period = extractPeriodFromS3Url(item.s3_url) || item.name || item.label || `File ${i + 1}`;
          const note  = item.note ? item.note.replace(/"/g, '&quot;') : '';
          const safeHref = href.replace(/'/g, '%27');
          return `
            <div class="src-item"${note ? ` title="${note}"` : ''}>
              <div class="src-ico"><svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
              <div style="flex:1;min-width:0"><div class="src-name">${period}</div>${note ? `<div class="src-note">${note}</div>` : ''}</div>
              <button class="btn-src" onclick="window.open('${safeHref}','_blank')">Download <svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><line x1="21" y1="3" x2="14" y2="10"/></svg></button>
            </div>`;
        }).join('');
      }
    }
  } catch {
    if (bodyEl) bodyEl.innerHTML = '<div style="padding:24px;text-align:center;font-size:12px;color:var(--tx3)">Failed to load URLs.</div>';
  }
}

// ── Row components defined at module level (never inside a render) ─────────
function ListRow({ d }) {
  return (
    <div className="ds-row" onClick={() => window.openDetail?.(d.sourceId)}>
      <div className="ds-cell">
        <div className="ds-name-wrap" title={d.title}>
          <div className="ds-name">{d.title}</div>
          <div className="ds-slug">{d.id}</div>
        </div>
      </div>
      <div className="ds-cell"><span className={`src-tag ${srcTagClass(d.src)}`}>{d.srcLabel}</span></div>
      <div className="ds-cell"><span className={`freq ${freqClass(d.freq)}`}>{d.freq}</span></div>
      <div className="ds-cell" style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>{d.metrics}</div>
      <div className="ds-cell" style={{ fontFamily: 'var(--mo)', color: 'var(--tx2)' }}>{d.dims.toLocaleString()}</div>
      <div className="ds-cell" style={{ fontSize: 11.5, color: 'var(--tx3)' }}>{d.updated}</div>
      <div className="ds-cell"><span className={`sp ${spClass(d.status)}`}>{d.status === 'active' ? 'Active' : 'Inactive'}</span></div>
      <div className="row-act" onClick={e => e.stopPropagation()}>
        <div className="row-ico-btn" onClick={() => window.openDetail?.(d.sourceId)} title="Explore">
          <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
        </div>
        <div className="row-ico-btn" onClick={() => openSourceUrlsModal(d.sourceId, d.title)} title="Source URLs">
          <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
        </div>
      </div>
    </div>
  );
}

function CardItem({ d }) {
  return (
    <div
      style={{
        background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 12,
        padding: '12px 14px', cursor: 'pointer', transition: 'all .13s', boxShadow: 'var(--shxs)',
      }}
      onClick={() => window.openDetail?.(d.sourceId)}
      onMouseOver={e => { e.currentTarget.style.boxShadow = 'var(--shmd)'; e.currentTarget.style.borderColor = 'var(--bdr2)'; }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = 'var(--shxs)'; e.currentTarget.style.borderColor = 'var(--bdr)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
          <div style={{ fontFamily: 'var(--mo)', fontSize: 9.5, color: 'var(--tx3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.id}</div>
        </div>
        <span className={`src-tag ${srcTagClass(d.src)}`} style={{ flexShrink: 0 }}>{d.srcLabel}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`freq ${freqClass(d.freq)}`}>{d.freq}</span>
          <span className={`sp ${spClass(d.status)}`}>{d.status === 'active' ? 'Active' : 'Inactive'}</span>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--tx3)' }}>
          <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>{d.metrics}</span> metrics ·{' '}
          <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>{d.dims.toLocaleString()}</span> dims
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (page <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', totalPages);
  } else if (page >= totalPages - 3) {
    pages.push(1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, '…', page - 1, page, page + 1, '…', totalPages);
  }
  return (
    <div className="cat-pg">
      <span className="cat-pg-info">{start}–{end} of {total} datasets</span>
      <div className="cat-pg-btns">
        <button className="pg-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="pg-ellipsis">…</span>
            : <button key={p} className={`pg-btn${p === page ? ' on' : ''}`} onClick={() => onPage(p)}>{p}</button>
        )}
        <button className="pg-btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}>›</button>
      </div>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────
function CatalogSkeleton() {
  return (
    <div style={{ border: '1px solid var(--bdr)', borderRadius: '0 0 10px 10px', overflow: 'hidden', background: 'var(--sf)' }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className="skel-row" style={{ animationDelay: `${i * 0.06}s`, opacity: 1 - i * 0.045 }}>
          {[...Array(8)].map((__, j) => <span key={j} className="skel-cell" style={{ animationDelay: `${(i + j) * 0.07}s` }} />)}
        </div>
      ))}
    </div>
  );
}

export default function CatalogPage({ isActive }) {
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
        analyticsAggregate({ source_id: 11, date_attribute_type_id: 9, metric_id: m.id, granularity: 'month', aggregation: 'sum', limit: 100 })
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

  const [datasets, setDatasets]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [enriching, setEnriching]       = useState(false);
  const [error, setError]               = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [srcFilter, setSrcFilter]       = useState('all');
  const [freqFilter, setFreqFilter]     = useState('all');
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState('created');
  const [view, setView]                 = useState('list');
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 12;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Phase 1 — fetch all data sources (paginated)
      const PAGE = 50;
      let skip = 0;
      const all = [];
      while (true) {
        const page = await getDataSources(skip, PAGE);
        const rows = Array.isArray(page) ? page : (page.items || page.data || []);
        if (!rows.length) break;
        all.push(...rows);
        if (rows.length < PAGE) break;
        skip += PAGE;
      }
      const mapped = all.map(mapSource).filter(d => d.sourceId !== 11);
      setDatasets(mapped);
      window.DATASETS = mapped;
      setLoading(false);

      // Phase 2 — enrich each row with metric count + total dimension count in parallel
      setEnriching(true);
      const enriched = await Promise.all(
        mapped.map(async (d) => {
          try {
            const [metricsRes, dimTypes] = await Promise.all([
              getDataSourceMetrics(d.sourceId),
              getDataSourceDimensionTypes(d.sourceId),
            ]);

            // Sum all dimensions across every dimension type for this source
            let totalDims = 0;
            if (Array.isArray(dimTypes) && dimTypes.length > 0) {
              const dimCounts = await Promise.all(
                dimTypes.map(dt => getAllDimensions(dt.dimension_type_id || dt.id))
              );
              totalDims = dimCounts.reduce((sum, dims) => sum + (Array.isArray(dims) ? dims.length : 0), 0);
            }

            return {
              ...d,
              metrics: Array.isArray(metricsRes) ? metricsRes.length : 0,
              dims:    totalDims,
            };
          } catch {
            return d;
          }
        })
      );
      setDatasets(enriched);
      window.DATASETS = enriched;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    } finally {
      setEnriching(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── derived data ──────────────────────────────────────────────────────
  const sourceCounts = useMemo(() => {
    const c = {};
    datasets.forEach(d => { c[d.src] = (c[d.src] || 0) + 1; });
    return c;
  }, [datasets]);

  const uniqueSources = useMemo(() => {
    const m = {};
    datasets.forEach(d => { m[d.src] = d.srcLabel; });
    return m;
  }, [datasets]);

  const freqCounts = useMemo(() => {
    const c = { daily: 0, weekly: 0, monthly: 0 };
    datasets.forEach(d => { if (c[d.freq] !== undefined) c[d.freq]++; });
    return c;
  }, [datasets]);

  const summary = useMemo(() => ({
    total:   datasets.length,
    active:  datasets.filter(d => d.status === 'active').length,
    metrics: datasets.reduce((s, d) => s + (d.metrics || 0), 0),
    dims:    datasets.reduce((s, d) => s + (d.dims    || 0), 0),
  }), [datasets]);

  const filtered = useMemo(() => {
    let ds = [...datasets];
    if (srcFilter    !== 'all') ds = ds.filter(d => d.src    === srcFilter);
    if (statusFilter !== 'all') ds = ds.filter(d => d.status === statusFilter);
    if (freqFilter   !== 'all') ds = ds.filter(d => d.freq   === freqFilter);
    const q = search.toLowerCase().trim();
    if (q) ds = ds.filter(d =>
      d.title.toLowerCase().includes(q)    ||
      d.id.toLowerCase().includes(q)       ||
      d.srcLabel.toLowerCase().includes(q) ||
      d.cat.toLowerCase().includes(q)
    );
    const sortMap = {
      name:    (a, b) => a.title.localeCompare(b.title),
      src: (a, b) => {
        const grp = { rbi: 0, nse: 1, sebi: 2 };
        const ga = grp[a.src] ?? 99, gb = grp[b.src] ?? 99;
        if (ga !== gb) return ga - gb;
        // within RBI: sourceId 8 first
        if (a.src === 'rbi') {
          if (Number(a.sourceId) === 8) return -1;
          if (Number(b.sourceId) === 8) return 1;
        }
        return a.title.localeCompare(b.title);
      },
      freq:    (a, b) => a.freq.localeCompare(b.freq),
      metrics: (a, b) => b.metrics - a.metrics,
      dims:    (a, b) => b.dims - a.dims,
      updated:  (a, b) => b.updated.localeCompare(a.updated),
      created:  (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    if (sortMap[sort]) ds.sort(sortMap[sort]);
    return ds;
  }, [datasets, srcFilter, statusFilter, freqFilter, search, sort]);

  // reset to page 1 whenever filters/search/sort change
  useEffect(() => { setPage(1); }, [search, srcFilter, statusFilter, freqFilter, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── main render ───────────────────────────────────────────────────────
  const RBI_ITEMS = [
    { label: 'Repo Rate',    key: 'repo_rate' },
    { label: 'SDF',          key: 'sdf_rate' },
    { label: 'MSF',          key: 'msf_rate' },
    { label: 'Bank Rate',    key: 'bank_rate' },
    { label: 'Rev Repo',     key: 'reverse_repo' },
    { label: 'CRR',          key: 'crr' },
    { label: 'SLR',          key: 'slr' },
    ...(rbiRates.repo_rate?.period ? [{ label: 'As of', key: '__period__' }] : []),
  ];

  return (
    <div className={`page${isActive ? ' on' : ''}`} id="page-catalog">

      {/* RBI Policy Rates ticker — same as dashboard */}
      {/* {Object.keys(rbiRates).length > 0 && (
        <div style={{display:'flex',alignItems:'center',background:'#000',flexShrink:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',borderRight:'1px solid rgba(255,255,255,.15)',flexShrink:0,zIndex:1}}>
            <div style={{background:'#c0392b',color:'#fff',fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'3px',letterSpacing:'.05em'}}>RBI</div>
            <span style={{fontSize:'10px',color:'rgba(255,255,255,.5)',fontWeight:600,whiteSpace:'nowrap'}}>Policy Rates</span>
          </div>
          <div style={{flex:1,overflow:'hidden',position:'relative'}}>
            <div style={{display:'flex',width:'max-content',animation:'rbi-ticker 22s linear infinite'}}>
              {[...RBI_ITEMS, ...RBI_ITEMS].map((item, i) => (
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
      )} */}

      <div className="cat-shell">

        {/* MAIN CATALOG AREA */}
        <div className="cat-main">
          {/* Mobile filter trigger */}
          <div className="fbar-mobile-btn" style={{ display: 'none', padding: '10px 10px 4px', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} onClick={() => window.togglePanel?.('filters')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
            </button>
          </div>

          {/* Summary + Toolbar in one row */}
          <div className="cat-toolbar">
            <div className="cat-search">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                placeholder="Search datasets…"
                id="cat-q"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="sum-kpi" style={{ marginLeft: 16, paddingLeft: 16, borderLeft: '1px solid var(--bdr)', borderRight: 'none' }}><div className="sum-kpi-v">{loading ? '—' : summary.total}</div><div className="sum-kpi-l">Datasets</div></div>
            <div className="sum-kpi"><div className="sum-kpi-v">{loading ? '—' : summary.active}</div><div className="sum-kpi-l">Active</div></div>
            <div className="sum-kpi"><div className="sum-kpi-v" style={enriching ? { opacity: 0.5 } : {}}>{loading ? '—' : summary.metrics}</div><div className="sum-kpi-l">Metrics</div></div>
            <div className="sum-kpi" style={{ borderRight: 'none' }}><div className="sum-kpi-v" style={enriching ? { opacity: 0.5 } : {}}>{loading ? '—' : summary.dims.toLocaleString()}</div><div className="sum-kpi-l">Dimensions</div></div>
            {/* <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--tx3)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              Sort:
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 11.5, color: 'var(--tx2)', fontFamily: 'var(--fn)', cursor: 'pointer' }}
              >
                <option value="created">Newest First</option>
                <option value="name">Name A–Z</option>
                <option value="src">Source</option>
                <option value="updated">Last Updated</option>
                <option value="metrics">Metrics ↓</option>
                <option value="dims">Dimensions ↓</option>
              </select>
            </div> */}
            <div className="view-toggle">
              <div className={`vt-btn${view === 'list' ? ' on' : ''}`} onClick={() => setView('list')} title="List view">
                <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              </div>
              <div className={`vt-btn${view === 'card' ? ' on' : ''}`} onClick={() => setView('card')} title="Card view">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
              </div>
            </div>
          </div>

          {/* List / Card content */}
          <div className="cat-list" id="cat-list-wrap">
            {/* Header always rendered outside scroll — never moves */}
            {!loading && !error && view === 'list' && (
              <div className="list-head">
                <div className="lh-cell" onClick={() => setSort('name')}>Dataset <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg></div>
                <div className="lh-cell" onClick={() => setSort('src')}>Source</div>
                <div className="lh-cell" onClick={() => setSort('freq')}>Frequency</div>
                <div className="lh-cell" onClick={() => setSort('metrics')}>Metrics <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg></div>
                <div className="lh-cell" onClick={() => setSort('dims')}>Dimensions <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg></div>
                <div className="lh-cell" onClick={() => setSort('updated')}>Last Updated <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg></div>
                <div className="lh-cell">Status</div>
                <div className="lh-cell">Actions</div>
              </div>
            )}
            {/* Only rows + pagination scroll */}
            <div className="cat-rows-scroll">
              {error ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 8 }}>Failed to load datasets</div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 16 }}>{error}</div>
                  <button className="btn" style={{ fontSize: 12 }} onClick={loadData}>Retry</button>
                </div>
              ) : loading ? (
                <CatalogSkeleton />
              ) : view === 'list' ? (
                <>
                  <div id="cat-rows">
                    {filtered.length === 0 ? (
                      <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--tx3)' }}>No datasets match your filters.</div>
                    ) : (
                      paginated.map(d => <ListRow key={d.id} d={d} />)
                    )}
                  </div>
                  <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
                </>
              ) : (
                <div id="cat-rows">
                  {filtered.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--tx3)' }}>No datasets match your filters.</div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, padding: '14px 18px' }}>
                        {paginated.map(d => <CardItem key={d.id} d={d} />)}
                      </div>
                      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
